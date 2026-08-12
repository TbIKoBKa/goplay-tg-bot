import type { Context, NextFunction } from "grammy";
import type { BotContext } from "./index";
import { buildSystemPrompt } from "../knowledge/prompt";
import { markdownToHtml, truncate } from "./format";
import { RateLimiter } from "./rate-limit";
import { replyTo } from "./reply";

const systemPrompt = buildSystemPrompt();

/** Каждый вызов — запрос к LLM, поэтому ограничиваем частоту и длину. */
const ASK_LIMIT = new RateLimiter(3, 60_000);
const MAX_QUESTION_LENGTH = 1000;

/** Чтобы один пользователь не запускал несколько параллельных запросов. */
const inFlight = new Set<number>();

async function sendAnswer(ctx: Context, text: string): Promise<void> {
  const trimmed = truncate(text);
  try {
    await replyTo(ctx, markdownToHtml(trimmed), {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error("[ai] HTML reply failed, falling back to plain text:", err);
    await replyTo(ctx, trimmed);
  }
}

export function createMentionHandler(ctx: BotContext) {
  return async (grammyCtx: Context, next: NextFunction) => {
    const message = grammyCtx.message;
    if (!message?.text) return next();

    // Команда, не подошедшая ни одному обработчику, — это опечатка, а не вопрос к AI.
    const startsWithCommand = message.entities?.some(
      (e) => e.type === "bot_command" && e.offset === 0,
    );
    if (startsWithCommand) return next();

    const botInfo = grammyCtx.me;
    const botUsername = botInfo.username;

    const isMentioned =
      message.entities?.some(
        (e) =>
          e.type === "mention" &&
          message
            .text!.slice(e.offset, e.offset + e.length)
            .toLowerCase() === `@${botUsername.toLowerCase()}`,
      ) ?? false;

    const isReply = message.reply_to_message?.from?.id === botInfo.id;
    // В личке отвечаем на любой текст: обращаться там больше не к кому.
    const isPrivate = grammyCtx.chat?.type === "private";

    if (!isMentioned && !isReply && !isPrivate) return next();

    let userText = message.text;
    if (isMentioned) {
      userText = userText.replace(new RegExp(`@${botUsername}`, "gi"), "").trim();
    }

    if (!userText) {
      await replyTo(grammyCtx, "Задайте вопрос после упоминания бота.");
      return;
    }

    const userId = grammyCtx.from?.id;
    if (userId === undefined) return;

    if (inFlight.has(userId)) {
      await replyTo(grammyCtx, "⏳ Ещё думаю над прошлым вопросом, подожди секунду.");
      return;
    }
    if (!ASK_LIMIT.try(String(userId))) {
      const seconds = Math.ceil(ASK_LIMIT.retryAfterMs(String(userId)) / 1000);
      await replyTo(grammyCtx, `⏱ Слишком часто. Попробуй через ${seconds} с.`);
      return;
    }

    inFlight.add(userId);
    try {
      await grammyCtx.replyWithChatAction("typing");
      const answer = await ctx.llm.chat(systemPrompt, userText.slice(0, MAX_QUESTION_LENGTH));
      await sendAnswer(grammyCtx, answer);
    } finally {
      inFlight.delete(userId);
    }
  };
}
