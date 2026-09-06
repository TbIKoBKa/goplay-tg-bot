import { Composer, type Context } from "grammy";
import { TOPICS } from "../../push/topics";
import { sendMenu } from "../../ui/router";
import { redeemToken, tokenFromStartPayload } from "../../link/service";
import { applyPendingReferral } from "../../link/referral";
import { invitedText, referrerFromStartPayload } from "../../ui/menus/promo";
import { escapeHtml } from "../format";
import { RateLimiter } from "../rate-limit";
import type { UiDeps } from "../../ui/types";

/**
 * Код привязки одноразовый и короткий: без лимита его можно перебирать.
 * Пять попыток за десять минут хватает живому человеку с головой.
 */
const REDEEM_LIMIT = new RateLimiter(5, 10 * 60_000);

/**
 * Команды бота. Их намеренно мало: всё остальное живёт в кнопочном меню,
 * потому что список слэш-команд на телефоне читают единицы.
 */
export function publicCommands(deps: UiDeps): Composer<Context> {
  const composer = new Composer();

  composer.command("start", async (ctx) => {
    const chatId = ctx.chat?.id;
    if (chatId === undefined) return;

    // Первый контакт: проставляем умолчания по темам, иначе рассылать некому.
    deps.prefs.ensureDefaults(chatId, TOPICS);

    const payload = ctx.match as string | undefined;

    const token = tokenFromStartPayload(payload);
    if (token) {
      await handleRedeem(ctx, deps, chatId, token);
      return;
    }

    // Пришёл по ссылке-приглашению: запомним, кто позвал. Отдать это серверу
    // получится только после привязки, до неё игрового UUID у нас нет.
    const referrer = referrerFromStartPayload(payload);
    if (referrer) {
      deps.refs.remember(chatId, referrer);
      await ctx.reply(invitedText(referrer, deps.config.links.ip), { parse_mode: "HTML" });
    }

    // Повторная попытка для тех, у кого приглашение зависло: серверы могли быть
    // недоступны в момент привязки, и запись осталась ждать своего часа.
    await retryPendingReferral(ctx, deps, chatId);

    await sendMenu(ctx, deps, "main");
  });

  composer.command("menu", async (ctx) => {
    await sendMenu(ctx, deps, "main");
  });

  composer.command("help", async (ctx) => {
    await sendMenu(ctx, deps, "help");
  });


  return composer;
}

async function handleRedeem(
  ctx: Context,
  deps: UiDeps,
  chatId: number,
  token: string,
): Promise<void> {
  const userId = ctx.from?.id ?? chatId;

  if (!REDEEM_LIMIT.try(String(userId))) {
    const minutes = Math.ceil(REDEEM_LIMIT.retryAfterMs(String(userId)) / 60_000);
    await ctx.reply(`Слишком много попыток. Попробуй через ${minutes} мин.`);
    return;
  }

  const result = await redeemToken(deps.bridge, deps.config.link_servers, token);

  if (!result.ok) {
    await ctx.reply(result.reason);
    return;
  }

  // Код верный, перебором тут больше не пахнет.
  REDEEM_LIMIT.reset(String(userId));
  deps.links.link(chatId, result.uuid, result.nick);
  // Пара «ник — UUID» и режим, на котором игрок брал код: туда пойдёт
  // приглашение, и туда же поиск по нику больше не полезет спрашивать.
  deps.players.remember(result.uuid, result.nick, result.server);

  await ctx.reply(
    `✅ Готово. Аккаунт <b>${escapeHtml(result.nick)}</b> привязан к этому чату.`,
    { parse_mode: "HTML" },
  );

  await retryPendingReferral(ctx, deps, chatId, result.server);
  await sendMenu(ctx, deps, "main");
}

/**
 * Досылает отложенное приглашение.
 *
 * Молчит, если посылать нечего или серверы не ответили: запись останется
 * до следующего захода в бота, и попытка повторится сама.
 */
async function retryPendingReferral(
  ctx: Context,
  deps: UiDeps,
  chatId: number,
  server?: string,
): Promise<void> {
  const link = deps.links.byTelegramId(chatId);
  if (!link) return;

  // Приглашение уходит ровно на один режим: тот, где игрок берёт код и играет.
  // Иначе один приход друга оплатился бы на каждом сервере отдельно.
  const target =
    server ?? deps.players.lastServerOf(link.uuid) ?? deps.config.link_servers[0];
  if (!target) return;

  const referrer = await applyPendingReferral(
    deps.bridge,
    deps.refs,
    chatId,
    link.uuid,
    link.nick,
    target,
  );
  if (!referrer) return;

  await ctx.reply(
    [
      `🎁 Приглашение от <b>${escapeHtml(referrer)}</b> принято.`,
      "Оно засчитается автоматически, когда ты наиграешь минимум на сервере.",
      "Награду получите оба, в игре.",
    ].join("\n"),
    { parse_mode: "HTML" },
  );
}
