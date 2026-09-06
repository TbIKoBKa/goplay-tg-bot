import { loadConfig, loadEnv } from "./config";
import { createBot } from "./bot";
import { setupCommands } from "./bot/setup-commands";
import { BridgeServer } from "./bridge/server";
import { openDb } from "./db";
import { LinksRepo } from "./db/repos/links";
import { PlayersRepo } from "./db/repos/players";
import { RefsRepo } from "./db/repos/refs";
import { SnapshotsRepo } from "./db/repos/snapshots";
import { PrefsRepo } from "./db/repos/prefs";
import { PushLogRepo } from "./db/repos/push-log";
import { StatCacheRepo } from "./db/repos/stat-cache";
import { PushQueue } from "./push/queue";
import { handleBridgeEvent } from "./bridge/events";
import { Scheduler } from "./scheduler";
import { ANNOUNCE_TOPIC, TOPICS } from "./push/topics";
import { sweep as sweepSessions } from "./ui/session";
import type { BotUsername, UiDeps } from "./ui/types";

const env = loadEnv();
const config = loadConfig();

const db = openDb(env.DATABASE_FILE);

const prefs = new PrefsRepo(db);
// Темы, добавленные после прошлого запуска, доезжают до уже известных чатов.
const backfilled = prefs.backfillDefaults(TOPICS);
if (backfilled > 0) console.log(`[db] проставил умолчания по новым темам: ${backfilled}`);

const links = new LinksRepo(db);
const players = new PlayersRepo(db);
const refs = new RefsRepo(db);
const snapshots = new SnapshotsRepo(db);
const statCache = new StatCacheRepo(db);
const pushLog = new PushLogRepo(db);

const wsPort = env.PORT ?? env.BRIDGE_WS_PORT;
const bridge = new BridgeServer(wsPort, env.BRIDGE_SECRET);

const botUsername: BotUsername = { value: "" };
const deps: UiDeps = { botUsername, prefs, links, players, refs, statCache, bridge, config };
const bot = createBot(env.TELEGRAM_BOT_TOKEN, deps);

const push = new PushQueue(bot, prefs, pushLog);
push.start();

// События, которые плагины шлют сами: рейды, айрдропы, рекорды.
bridge.onEvent((event) => handleBridgeEvent({ push, links, prefs }, event));

// Ежедневные напоминания. Спрашиваем только те серверы, где стоит плагин.
const scheduler = new Scheduler(
  { bridge, links, prefs, push, servers: config.link_servers },
  { bridge, links, prefs, push, statCache, snapshots, servers: config.servers },
  new Map(config.servers.map((s) => [s.id, s.title])),
);
scheduler.start();

// Рассылка анонсов. Источник (сайт или расписание) шлёт POST /notify.
if (env.NOTIFY_SECRET) {
  bridge.onNotify(env.NOTIFY_SECRET, async (text) => {
    const queued = push.broadcast(ANNOUNCE_TOPIC, text);
    console.log(`[notify] анонс поставлен в очередь для ${queued} чатов`);
  });
  console.log("[notify] POST /notify включён");
}

bridge.start();

// Раз в сутки чистим журнал пушей, иначе он растёт вечно.
const pruneTimer = setInterval(
  () => {
    const removed = pushLog.prune() + refs.prune();
    if (removed > 0) console.log(`[db] выбросил ${removed} старых записей`);
  },
  24 * 60 * 60 * 1000,
);

// Незаконченные диалоги живут в памяти и сами по себе не исчезают.
const sessionTimer = setInterval(() => sweepSessions(), 10 * 60 * 1000);

async function startBot(): Promise<void> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      await bot.start({
        onStart: async (info) => {
          botUsername.value = info.username;
          console.log(`[bot] @${info.username} запущен`);
          await setupCommands(bot);
        },
        drop_pending_updates: true,
      });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 409 значит, что предыдущий инстанс ещё не отпустил long polling.
      if (msg.includes("409") && attempt < 5) {
        console.log(`[bot] конфликт 409, попытка ${attempt}/5 через ${attempt * 3} с`);
        await Bun.sleep(attempt * 3000);
        continue;
      }
      console.error(`[bot] не смог запуститься: ${msg}`);
      throw err;
    }
  }
}

startBot().catch((err) => {
  console.error("[bot] фатальная ошибка:", err);
  scheduler.stop();
  push.stop();
  bridge.stop();
  process.exit(1);
});

let shuttingDown = false;
const shutdown = async (): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[shutdown] останавливаюсь");
  clearInterval(pruneTimer);
  clearInterval(sessionTimer);
  scheduler.stop();
  try {
    // Даём grammY дообработать текущие апдейты, иначе нажатие теряется на полпути.
    await bot.stop();
  } catch (err) {
    console.error("[shutdown] bot.stop упал:", err);
  }
  push.stop();
  bridge.stop();
  db.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
