import { loadConfig, loadEnv } from "./config";
import { createBot } from "./bot";
import { LLMManager } from "./llm/manager";
import { BridgeServer } from "./bridge/server";

const env = loadEnv();
const config = loadConfig();

const llm = new LLMManager(config.llm, env);
const wsPort = env.PORT ?? env.BRIDGE_WS_PORT;
const bridge = new BridgeServer(wsPort, env.BRIDGE_SECRET);
const bot = createBot(env.TELEGRAM_BOT_TOKEN, config, llm, bridge);

bridge.start();

async function startBot(): Promise<void> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      await bot.start({
        onStart: (info) => console.log(`[bot] @${info.username} started`),
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

startBot();

const shutdown = () => {
  console.log("[shutdown] stopping...");
  bot.stop();
  bridge.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
