import type { Context, NextFunction } from "grammy";
import type { BotContext } from "./index";
import { buildSystemPrompt } from "../knowledge/prompt";

const systemPrompt = buildSystemPrompt();

async function sendWithFallback(
  ctx: Context,
  text: string,
  messageId: number,
): Promise<void> {
  const replyOpts = { reply_to_message_id: messageId } as const;
  try {
    await ctx.reply(text, { ...replyOpts, parse_mode: "Markdown" });
  } catch {
    await ctx.reply(text, replyOpts);
  }
}

export function createMentionHandler(ctx: BotContext) {
  return async (grammyCtx: Context, next: NextFunction) => {
    const message = grammyCtx.message;
    if (!message?.text) return next();

    const botInfo = grammyCtx.me;
    const botUsername = botInfo.username;

    const isMentioned =
      message.entities?.some(
        (e) =>
          e.type === "mention" &&
          message.text!
            .slice(e.offset, e.offset + e.length)
            .toLowerCase() === `@${botUsername.toLowerCase()}`,
      ) ?? false;

    const isReply =
      message.reply_to_message?.from?.id === botInfo.id;

    if (!isMentioned && !isReply) return next();

    let userText = message.text;
    if (isMentioned) {
      userText = userText.replace(new RegExp(`@${botUsername}`, "gi"), "").trim();
    }

    if (!userText) {
      await grammyCtx.reply("\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043e\u043f\u0440\u043e\u0441 \u043f\u043e\u0441\u043b\u0435 \u0443\u043f\u043e\u043c\u0438\u043d\u0430\u043d\u0438\u044f \u0431\u043e\u0442\u0430.", {
        reply_to_message_id: message.message_id,
      });
      return;
    }

    await grammyCtx.replyWithChatAction("typing");

    const answer = await ctx.llm.chat(systemPrompt, userText);

    await sendWithFallback(grammyCtx, answer, message.message_id);
  };
}
