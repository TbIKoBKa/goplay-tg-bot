import { InlineKeyboard, backRow, cb } from "../keyboard";
import { expect, lastLookup } from "../session";
import { fetchStats } from "../../stats/service";
import { renderStats } from "./stats";
import type { MenuRequest, MenuView } from "../types";

/**
 * Поиск игрока по нику.
 *
 * Ник не влезает в callback_data и ломал бы разбор двоеточиями, поэтому меню
 * только переводит чат в режим ожидания текста, а сам поиск делает обработчик
 * сообщений.
 */
export async function lookupMenu(req: MenuRequest): Promise<MenuView> {
  if (req.action === "again") {
    return againOnServer(req);
  }

  expect(req.chatId, "lookup");

  const text = [
    "🔎 <b>Найти игрока</b>",
    "",
    "Отправь ник следующим сообщением.",
    "",
    "Видны публичные цифры: победы, убийства, квесты, рейды.",
    "Баланс, щит и координаты базы остаются только у владельца.",
  ].join("\n");

  return { text, keyboard: backRow(new InlineKeyboard()) };
}

/** Тот же игрок, другой режим. Кого смотрели, помним в памяти диалога. */
async function againOnServer(req: MenuRequest): Promise<MenuView> {
  const target = lastLookup(req.chatId);
  const server = req.deps.config.servers.find((s) => s.id === req.arg);

  if (!target || !server) {
    expect(req.chatId, "lookup");
    return {
      text: "🔎 <b>Найти игрока</b>\n\nПоиск устарел. Отправь ник ещё раз.",
      keyboard: backRow(new InlineKeyboard()),
    };
  }

  const view = await fetchStats(
    req.deps.bridge,
    req.deps.statCache,
    server.id,
    target.uuid,
    "public",
  );

  return {
    text: renderStats(server.title, target.nick, view),
    keyboard: lookupResultKeyboard(req.deps.config.servers, server.id),
  };
}

/** Кнопки под найденной карточкой: посмотреть тот же ник на другом режиме. */
export function lookupResultKeyboard(
  servers: readonly { id: string; title: string }[],
  current: string,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  let first = true;
  for (const server of servers) {
    if (server.id === current) continue;
    if (!first) keyboard.row();
    keyboard.text(server.title, cb("lookup", "again", server.id));
    first = false;
  }
  return backRow(keyboard);
}
