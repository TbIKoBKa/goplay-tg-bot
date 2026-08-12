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

// Служебный разделитель для плейсхолдеров: в тексте Telegram не встречается
// и не затрагивается escapeHtml.
const MARK = String.fromCharCode(0);
const MARK_RE = new RegExp(MARK, "g");
const STASH_RE = new RegExp(`${MARK}(\\d+)${MARK}`, "g");

/**
 * Переводит базовый Markdown от LLM в HTML для Telegram.
 * Всё, что не распознано как разметка, экранируется — поэтому результат
 * безопасно слать с parse_mode: "HTML".
 *
 * Поддерживается: ```блоки кода```, `код`, **жирный**, *курсив*, _курсив_, ~~зачёркнутый~~.
 */
export function markdownToHtml(md: string): string {
  // Код прячем за плейсхолдеры, чтобы внутри него не сработала остальная разметка.
  const code: string[] = [];
  const stash = (html: string): string => `${MARK}${code.push(html) - 1}${MARK}`;

  let out = md.replace(MARK_RE, "");

  out = out.replace(/```(?:[a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g, (_m, body: string) =>
    stash(`<pre><code>${escapeHtml(body.replace(/\n$/, ""))}</code></pre>`),
  );
  out = out.replace(/`([^`\n]+)`/g, (_m, body: string) =>
    stash(`<code>${escapeHtml(body)}</code>`),
  );

  out = escapeHtml(out);

  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
  out = out.replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, "<i>$1</i>");
  out = out.replace(/(?<![_\w])_([^_\n]+)_(?![_\w])/g, "<i>$1</i>");
  out = out.replace(/~~([^~\n]+)~~/g, "<s>$1</s>");

  return out.replace(STASH_RE, (_m, i: string) => code[Number(i)] ?? "");
}
