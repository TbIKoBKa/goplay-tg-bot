import type { Bot } from "grammy";
import type { SubscriberStore } from "./subscribers";
import { truncate } from "./format";

/** Telegram душит массовые рассылки примерно после 30 сообщений в секунду. */
const SEND_INTERVAL_MS = 50;
const MAX_RETRY_AFTER_MS = 60_000;

export type BroadcastResult = { sent: number; failed: number; removed: number };

type TelegramError = { error_code?: number; description?: string; parameters?: { retry_after?: number } };

function asTelegramError(err: unknown): TelegramError {
  const e = err as { error_code?: number; description?: string; parameters?: { retry_after?: number } };
  return {
    ...(e?.error_code !== undefined ? { error_code: e.error_code } : {}),
    ...(e?.description !== undefined ? { description: e.description } : {}),
    ...(e?.parameters !== undefined ? { parameters: e.parameters } : {}),
  };
}

function isHtmlParseError(err: TelegramError): boolean {
  return err.error_code === 400 && (err.description?.includes("can't parse entities") ?? false);
}

/** Подписчик недоступен навсегда: заблокировал бота или удалил аккаунт. */
function isGone(err: TelegramError): boolean {
  return err.error_code === 403 || err.description?.includes("chat not found") === true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Рассылает текст всем подписчикам с троттлингом и обработкой 429.
 * Подписчиков, заблокировавших бота, удаляет из хранилища.
 * Если HTML в тексте битый — переключается на plain text для всей рассылки.
 */
export async function broadcast(
  bot: Bot,
  store: SubscriberStore,
  text: string,
): Promise<BroadcastResult> {
  const body = truncate(text);
  const result: BroadcastResult = { sent: 0, failed: 0, removed: 0 };
  let useHtml = true;

  for (const id of store.all()) {
    // Один ретрай на подписчика: он нужен только против 429.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await bot.api.sendMessage(id, body, {
          ...(useHtml ? { parse_mode: "HTML" as const } : {}),
          link_preview_options: { is_disabled: true },
        });
        result.sent++;
        break;
      } catch (err) {
        const tg = asTelegramError(err);

        if (isGone(tg)) {
          store.remove(id);
          result.removed++;
          break;
        }

        if (isHtmlParseError(tg) && useHtml) {
          console.warn("[notify] broken HTML in payload, switching to plain text");
          useHtml = false;
          continue;
        }

        const retryAfter = tg.parameters?.retry_after;
        if (tg.error_code === 429 && retryAfter && attempt === 0) {
          await sleep(Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS));
          continue;
        }

        result.failed++;
        console.error(`[notify] send to ${id} failed:`, tg.description ?? err);
        break;
      }
    }

    await sleep(SEND_INTERVAL_MS);
  }

  return result;
}
