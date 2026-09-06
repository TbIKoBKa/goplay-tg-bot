import { InlineKeyboard } from "grammy";

/**
 * Версия схемы callback_data. Поднимать при несовместимом изменении формата:
 * у игроков в чатах остаются старые сообщения с кнопками, и роутер должен
 * уметь отличить их от нынешних.
 */
export const CB_VERSION = "v1";

/** Telegram режет callback_data на 64 байтах. */
const CB_MAX_BYTES = 64;

export type CallbackTarget = { menu: string; action: string; arg: string };

/**
 * Собирает callback_data вида v1:меню:действие:аргумент.
 *
 * Ник и прочий пользовательский ввод сюда класть нельзя: он не влезает
 * в лимит и ломает разбор двоеточиями. Для этого есть состояние диалога.
 */
export function cb(menu: string, action = "open", arg = ""): string {
  const data = `${CB_VERSION}:${menu}:${action}:${arg}`;
  const size = Buffer.byteLength(data, "utf8");
  if (size > CB_MAX_BYTES) {
    throw new Error(`callback_data ${size} байт, лимит ${CB_MAX_BYTES}: ${data}`);
  }
  return data;
}

export function parseCb(data: string): CallbackTarget | null {
  const parts = data.split(":");
  if (parts.length < 3) return null;
  const [version, menu, action, ...rest] = parts;
  if (version !== CB_VERSION) return null;
  if (!menu || !action) return null;
  return { menu, action, arg: rest.join(":") };
}

/**
 * Кнопка возврата отдельной строкой. Одна на все меню, чтобы игрок не искал выход.
 *
 * Смотрим именно на последний ряд, а не на длину: у свежей InlineKeyboard уже
 * есть один пустой ряд, и лишний row() оставил бы дырку над кнопками.
 */
export function backRow(keyboard: InlineKeyboard, menu = "main"): InlineKeyboard {
  const rows = keyboard.inline_keyboard;
  const last = rows[rows.length - 1];
  if (last && last.length > 0) keyboard.row();
  return keyboard.text("‹ Назад", cb(menu));
}

export { InlineKeyboard };
