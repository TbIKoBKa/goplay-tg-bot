import { Bot } from "grammy";
import { publicCommands } from "./commands/public";
import { lookupInput } from "./commands/lookup";
import { createMenuRouter } from "../ui/router";
import type { UiDeps } from "../ui/types";

export function createBot(token: string, deps: UiDeps): Bot {
  const bot = new Bot(token);

  // Команды первыми: обработчик текста ниже не должен принимать /start за ник.
  bot.use(publicCommands(deps));
  bot.use(createMenuRouter(deps));
  bot.use(lookupInput(deps));

  bot.catch((err) => {
    const cause = err.error;
    console.error(
      `[bot] ошибка на апдейте ${err.ctx.update.update_id}:`,
      cause instanceof Error ? (cause.stack ?? cause.message) : cause,
    );
  });

  return bot;
}
