import type { Bot } from "grammy";
import { truncate } from "../bot/format";

export type DeliveryResult =
  /** Дошло. */
  | { kind: "sent" }
  /** Чат недоступен навсегда: бот заблокирован или чат удалён. */
  | { kind: "gone" }
  /** Битая HTML-разметка. Тот же текст можно попробовать отправить как plain. */
  | { kind: "html-broken" }
  /** Telegram просит подождать. */
  | { kind: "flood"; retryAfterMs: number }
  | { kind: "failed"; reason: string };

type TelegramError = {
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
};

const MAX_RETRY_AFTER_MS = 60_000;

function asTelegramError(err: unknown): TelegramError {
  const e = err as TelegramError;
  return {
    ...(e?.error_code !== undefined ? { error_code: e.error_code } : {}),
    ...(e?.description !== undefined ? { description: e.description } : {}),
    ...(e?.parameters !== undefined ? { parameters: e.parameters } : {}),
  };
}

/**
 * Одна попытка отправки. Ретраями и паузами занимается очередь,
 * здесь только классификация ответа Telegram.
 */
export async function deliver(
  bot: Bot,
  chatId: number,
  text: string,
  useHtml: boolean,
): Promise<DeliveryResult> {
  try {
    await bot.api.sendMessage(chatId, truncate(text), {
      ...(useHtml ? { parse_mode: "HTML" as const } : {}),
      link_preview_options: { is_disabled: true },
    });
    return { kind: "sent" };
  } catch (err) {
    const tg = asTelegramError(err);

    if (tg.error_code === 403 || tg.description?.includes("chat not found")) {
      return { kind: "gone" };
    }
    if (useHtml && tg.error_code === 400 && tg.description?.includes("can't parse entities")) {
      return { kind: "html-broken" };
    }
    if (tg.error_code === 429) {
      const seconds = tg.parameters?.retry_after ?? 5;
      return { kind: "flood", retryAfterMs: Math.min(seconds * 1000, MAX_RETRY_AFTER_MS) };
    }
    return { kind: "failed", reason: tg.description ?? String(err) };
  }
}
