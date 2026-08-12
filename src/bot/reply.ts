import type { Context } from "grammy";
import { truncate } from "./format";

type ReplyExtra = Parameters<Context["reply"]>[1];

/**
 * Ответ на исходное сообщение. Использует reply_parameters (reply_to_message_id
 * помечен deprecated) с allow_sending_without_reply — иначе отправка падает,
 * если исходное сообщение уже удалили.
 */
export function replyTo(
  ctx: Context,
  text: string,
  extra?: ReplyExtra,
): Promise<unknown> {
  const messageId = ctx.message?.message_id;
  return ctx.reply(truncate(text), {
    ...extra,
    ...(messageId
      ? { reply_parameters: { message_id: messageId, allow_sending_without_reply: true } }
      : {}),
  });
}
