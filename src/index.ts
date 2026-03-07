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
bot.start({
  onStart: (info) => console.log(`[bot] @${info.username} started`),
});

const shutdown = () => {
  console.log("[shutdown] stopping...");
  bot.stop();
  bridge.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
