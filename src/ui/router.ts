import { Composer, type Context } from "grammy";
import { parseCb } from "./keyboard";
import { mainMenu } from "./menus/main";
import { notificationsMenu } from "./menus/notifications";
import { profileMenu } from "./menus/profile";
import { statsMenu } from "./menus/stats";
import { lookupMenu } from "./menus/lookup";
import { leaderboardMenu } from "./menus/leaderboard";
import { promoMenu } from "./menus/promo";
import { serverMenu } from "./menus/server";
import { helpMenu } from "./menus/help";
import { RateLimiter } from "../bot/rate-limit";
import type { MenuHandler, MenuRequest, MenuView, UiDeps } from "./types";

const MENUS: Record<string, MenuHandler> = {
  main: mainMenu,
  profile: profileMenu,
  stats: statsMenu,
  lookup: lookupMenu,
  top: leaderboardMenu,
  promo: promoMenu,
  notif: notificationsMenu,
  server: serverMenu,
  help: helpMenu,
};

/** Защита от залипшего пальца: кнопки жмут быстрее, чем прокси успевает отвечать. */
const CLICKS = new RateLimiter(20, 10_000);

export async function buildMenu(name: string, req: MenuRequest): Promise<MenuView> {
  const handler = MENUS[name] ?? mainMenu;
  return handler(req);
}

/** Первый показ меню: отдельным сообщением, не правкой чужого. */
export async function sendMenu(
  ctx: Context,
  deps: UiDeps,
  name = "main",
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  const view = await buildMenu(name, { chatId, action: "open", arg: "", deps });
  await ctx.reply(view.text, {
    parse_mode: "HTML",
    reply_markup: view.keyboard,
    link_preview_options: { is_disabled: true },
  });
}

export function createMenuRouter(deps: UiDeps): Composer<Context> {
  const composer = new Composer();

  composer.on("callback_query:data", async (ctx) => {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;

    if (chatId === undefined || userId === undefined) {
      await ctx.answerCallbackQuery();
      return;
    }

    if (!CLICKS.try(String(userId))) {
      await ctx.answerCallbackQuery({ text: "Слишком часто. Подожди пару секунд." });
      return;
    }

    const target = parseCb(ctx.callbackQuery.data);

    // Кнопка из старого сообщения: схема сменилась после деплоя. Не ругаемся,
    // а перерисовываем это же сообщение в актуальное главное меню.
    const request: MenuRequest = {
      chatId,
      action: target?.action ?? "open",
      arg: target?.arg ?? "",
      deps,
    };

    let view: MenuView;
    try {
      view = await buildMenu(target?.menu ?? "main", request);
    } catch (err) {
      console.error("[ui] меню упало:", err);
      await ctx.answerCallbackQuery({ text: "Что-то сломалось. Попробуй ещё раз." });
      return;
    }

    try {
      await ctx.editMessageText(view.text, {
        parse_mode: "HTML",
        reply_markup: view.keyboard,
        link_preview_options: { is_disabled: true },
      });
    } catch (err) {
      // Нажали ту же кнопку дважды: текст не изменился, Telegram считает это ошибкой.
      const description = (err as { description?: string })?.description ?? "";
      if (!description.includes("message is not modified")) {
        console.error("[ui] не смог обновить сообщение:", description || err);
      }
    }

    await ctx.answerCallbackQuery(
      target ? (view.toast ? { text: view.toast } : {}) : { text: "Меню обновилось" },
    );
  });

  return composer;
}
