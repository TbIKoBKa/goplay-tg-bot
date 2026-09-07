import { Composer, type Context } from "grammy";
import { handleRedeem } from "./public";
import type { UiDeps } from "../../ui/types";

/**
 * Алфавит и длина кода привязки повторяют LinkTokens в плагине.
 *
 * Совпадение обязано быть точным: по нему мы отличаем код от обычного
 * сообщения. Ник в Minecraft не длиннее 16 символов, поэтому 24 символа
 * из этого алфавита ни с чем не спутать.
 */
const TOKEN_RE = /^[abcdefghjkmnpqrstuvwxyz23456789]{24}$/i;

/** Ссылку из игры часто копируют целиком, а не жмут на неё. */
const DEEP_LINK_RE = /(?:\?|&)start=L-([A-Za-z0-9_-]{1,64})/;

/**
 * Привязка аккаунта кодом, отправленным сообщением.
 *
 * Нужна ровно потому, что кликабельная ссылка работает не у всех: на Bedrock
 * через Geyser открытие ссылок ведёт себя по-разному от клиента к клиенту,
 * а кто-то просто копирует код руками. Плагин в игре так и пишет, поэтому бот
 * обязан такие сообщения понимать.
 */
export function linkInput(deps: UiDeps): Composer<Context> {
  const composer = new Composer();

  composer.on("message:text", async (ctx, next) => {
    const chatId = ctx.chat?.id;
    if (chatId === undefined) return next();

    const token = extractToken(ctx.message.text);
    if (!token) return next();

    await handleRedeem(ctx, deps, chatId, token);
  });

  return composer;
}

/** Достаёт код из сообщения: голым, с префиксом или внутри скопированной ссылки. */
export function extractToken(text: string): string | null {
  const raw = text.trim();

  const fromLink = DEEP_LINK_RE.exec(raw);
  if (fromLink?.[1]) return fromLink[1];

  // Префикс L- игрок мог захватить вместе с кодом из ссылки.
  const bare = raw.replace(/^L-/i, "");
  return TOKEN_RE.test(bare) ? bare.toLowerCase() : null;
}
