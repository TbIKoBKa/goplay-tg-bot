import { Bot } from "grammy";
import { publicCommands } from "./commands/public";
import { linkInput } from "./commands/link";
import { lookupInput } from "./commands/lookup";
import { createMenuRouter } from "../ui/router";
import type { UiDeps } from "../ui/types";

export function createBot(token: string, deps: UiDeps): Bot {
  const bot = new Bot(token);

  // Команды первыми: обработчик текста ниже не должен принимать /start за ник.
  bot.use(publicCommands(deps));
  bot.use(createMenuRouter(deps));
  // Код привязки раньше поиска по нику: он длиннее любого ника и распознаётся
  // однозначно, а вот в режиме поиска его приняли бы за неудачный ник.
  bot.use(linkInput(deps));
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
