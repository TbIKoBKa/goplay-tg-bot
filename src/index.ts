import { loadConfig, loadEnv } from "./config";
import { createBot } from "./bot";
import { LLMManager } from "./llm/manager";
import { BridgeServer } from "./bridge/server";
import { SubscriberStore } from "./bot/subscribers";
import { broadcast } from "./bot/notifier";
import { setupCommands } from "./bot/setup-commands";

const env = loadEnv();
const config = loadConfig();

const llm = new LLMManager(config.llm, env);
const wsPort = env.PORT ?? env.BRIDGE_WS_PORT;
const bridge = new BridgeServer(wsPort, env.BRIDGE_SECRET);
const subscribers = new SubscriberStore(env.SUBSCRIBERS_FILE);
const bot = createBot(env.TELEGRAM_BOT_TOKEN, config, llm, bridge, subscribers, {
  apiUrl: env.WEBSITE_API_URL,
  apiToken: env.WEBSITE_API_TOKEN,
});

// Рассылка уведомлений о ивентах: включается только если задан NOTIFY_SECRET.
if (env.NOTIFY_SECRET) {
  bridge.onNotify(env.NOTIFY_SECRET, async (text) => {
    const { sent, failed, removed } = await broadcast(bot, subscribers, text);
    console.log(
      `[notify] broadcast done: sent=${sent} failed=${failed} removed=${removed} left=${subscribers.size}`,
    );
  });
  console.log("[notify] POST /notify enabled on bridge port");
}

bridge.start();

async function startBot(): Promise<void> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      await bot.start({
        onStart: async (info) => {
          console.log(`[bot] @${info.username} started`);
          await setupCommands(bot, config.access);
        },
        drop_pending_updates: true,
      });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("409") && attempt < 5) {
        console.log(`[bot] conflict 409, retry ${attempt}/5 in ${attempt * 3}s...`);
        await Bun.sleep(attempt * 3000);
        continue;
      }
      console.error(`[bot] failed to start: ${msg}`);
      throw err;
    }
  }
}

startBot().catch((err) => {
  console.error("[bot] fatal:", err);
  bridge.stop();
  process.exit(1);
});

let shuttingDown = false;
const shutdown = async (): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[shutdown] stopping...");
  try {
    // Даёт grammY дообработать текущие апдейты, иначе команда теряется на полпути.
    await bot.stop();
  } catch (err) {
    console.error("[shutdown] bot.stop failed:", err);
  }
  bridge.stop();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
