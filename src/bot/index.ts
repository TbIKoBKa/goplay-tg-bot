import { Bot, Composer } from "grammy";
import type { Config } from "../config";
import type { LLMManager } from "../llm/manager";
import type { BridgeServer } from "../bridge/server";
import { createAuthMiddleware } from "./middleware/auth";
import { createMentionHandler } from "./mention-handler";
import { banCommands } from "./commands/ban";
import { kickCommand } from "./commands/kick";
import { muteCommands } from "./commands/mute";
import { serverCommands } from "./commands/server";
import { playerCommands } from "./commands/player";
import { whitelistCommand } from "./commands/whitelist";
import { helpCommand } from "./commands/help";

export type BotContext = {
  config: Config;
  llm: LLMManager;
  bridge: BridgeServer;
};

export function createBot(
  token: string,
  config: Config,
  llm: LLMManager,
  bridge: BridgeServer,
): Bot {
  const bot = new Bot(token);
  const ctx: BotContext = { config, llm, bridge };

  const commands = new Composer();
  const auth = createAuthMiddleware(config.access);

  commands.use(helpCommand());
  commands.use(banCommands(ctx, auth));
  commands.use(kickCommand(ctx, auth));
  commands.use(muteCommands(ctx, auth));
  commands.use(serverCommands(ctx, auth));
  commands.use(playerCommands(ctx, auth));
  commands.use(whitelistCommand(ctx, auth));

  bot.use(commands);
  bot.on("message:text", createMentionHandler(ctx));

  bot.catch((err) => {
    console.error("[bot] error:", err.message);
  });

  return bot;
}
