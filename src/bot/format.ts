/** Лимит Telegram на длину текстового сообщения. */
export const TELEGRAM_MAX_MESSAGE = 4096;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Убирает цветовые коды Minecraft из вывода консоли: §a, &a, а также
 * HEX-форматы §x§7§C§F§C§0§0 и &x&7&C&F&C&0&0.
 */
export function stripMinecraftColors(s: string): string {
  return s
    .replace(/[§&]x(?:[§&][0-9a-fA-F]){6}/g, "")
    .replace(/[§&][0-9a-fk-orA-FK-OR]/g, "");
}

/** Обрезает текст до лимита, добавляя многоточие. */
export function truncate(s: string, max = TELEGRAM_MAX_MESSAGE): string {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}
