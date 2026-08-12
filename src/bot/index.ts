import { Bot, Composer } from "grammy";
import type { Config } from "../config";
import type { LLMManager } from "../llm/manager";
import type { BridgeServer } from "../bridge/server";
import type { SubscriberStore } from "./subscribers";
import { createAuthMiddleware } from "./middleware/auth";
import { createMentionHandler } from "./mention-handler";
import { publicCommands } from "./commands/public";
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
  /** Допустимые значения аргумента <сервер>: из config.servers плюс "all". */
  servers: ReadonlySet<string>;
};

export type WebConfig = { apiUrl?: string | undefined; apiToken?: string | undefined };

export function createBot(
  token: string,
  config: Config,
  llm: LLMManager,
  bridge: BridgeServer,
  subscribers: SubscriberStore,
  web: WebConfig,
): Bot {
  const bot = new Bot(token);
  const ctx: BotContext = {
    config,
    llm,
    bridge,
    servers: new Set([...config.servers.map((s) => s.toLowerCase()), "all"]),
  };

  const commands = new Composer();
  const auth = createAuthMiddleware(config.access);

  // Публичные команды — ПЕРВЫМИ, чтобы админские композеры не перехватывали
  // /start, /link, /subscribe у обычных игроков.
  commands.use(publicCommands(subscribers, web));

  commands.use(helpCommand(auth));
  commands.use(banCommands(ctx, auth));
  commands.use(kickCommand(ctx, auth));
  commands.use(muteCommands(ctx, auth));
  commands.use(serverCommands(ctx, auth));
  commands.use(playerCommands(ctx, auth));
  commands.use(whitelistCommand(ctx, auth));

  bot.use(commands);
  bot.on("message:text", createMentionHandler(ctx));

  bot.catch((err) => {
    const cause = err.error;
    console.error(
      `[bot] error on update ${err.ctx.update.update_id}:`,
      cause instanceof Error ? (cause.stack ?? cause.message) : cause,
    );
  });

  return bot;
}
