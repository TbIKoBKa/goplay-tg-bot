import { Composer, type Context } from "grammy";
import type { UiDeps } from "../../ui/types";

/** Кнопки «Подтвердить» и «Это не я» из сообщения о входе. */
const CONFIRM_CB = /^v1:auth:(ok|no):([A-Za-z0-9_-]{6,32})$/;

/**
 * Ответы на запрос подтверждения входа.
 *
 * Стоит раньше роутера меню: у роутера нет меню «auth», и он перерисовал бы
 * сообщение о входе в главное меню вместо того, чтобы ответить прокси.
 */
export function loginConfirm(deps: UiDeps): Composer<Context> {
  const composer = new Composer();

  composer.callbackQuery(CONFIRM_CB, async (ctx) => {
    const chatId = ctx.chat?.id;
    const [, action, key] = ctx.match;
    if (chatId === undefined || !key) {
      await ctx.answerCallbackQuery();
      return;
    }
    const toast = await deps.loginGuard.resolve(chatId, key, action === "ok");
    await ctx.answerCallbackQuery({ text: toast });
  });

  return composer;
}
