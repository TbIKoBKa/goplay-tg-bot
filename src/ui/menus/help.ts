import { InlineKeyboard, backRow } from "../keyboard";
import type { MenuRequest, MenuView } from "../types";

export function helpMenu(req: MenuRequest): MenuView {
  const { links } = req.deps.config;

  const text = [
    "❓ <b>Помощь</b>",
    "",
    "Бот показывает, что происходит на сервере, и присылает уведомления о событиях.",
    "",
    "<b>Команды</b>",
    "/start - главное меню",
    "/help - эта справка",
    "",
    "<b>Куда писать</b>",
    `Вопрос по игре или жалоба: ${links.support}`,
    `Discord: ${links.discord}`,
    `Новости: ${links.telegram}`,
  ].join("\n");

  return { text, keyboard: backRow(new InlineKeyboard()) };
}
