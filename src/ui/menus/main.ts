import { InlineKeyboard, cb } from "../keyboard";
import { escapeHtml } from "../../bot/format";
import type { MenuRequest, MenuView } from "../types";

export function mainMenu(req: MenuRequest): MenuView {
  const { links } = req.deps;
  const { links: urls } = req.deps.config;
  const link = links.byTelegramId(req.chatId);

  const text = [
    "🎮 <b>GoPlay</b>",
    "",
    `Адрес сервера: <code>${urls.ip}</code>`,
    "Клиент: 1.21 и выше, Java и Bedrock",
    "",
    link
      ? `Аккаунт: <b>${escapeHtml(link.nick)}</b>`
      : "Аккаунт не привязан. Набери <code>/tg</code> в игре, чтобы уведомления стали личными.",
  ].join("\n");

  const keyboard = new InlineKeyboard()
    .text("📊 Статистика", cb("stats"))
    .text("🔎 Найти игрока", cb("lookup"))
    .row()
    .text("🏆 Топы", cb("top"))
    .text("👤 Профиль", cb("profile"))
    .row()
    .text("🔔 Уведомления", cb("notif"))
    .text("🎁 Друзья", cb("promo"))
    .row()
    .text("🌐 Сервер", cb("server"))
    .text("❓ Помощь", cb("help"));

  return { text, keyboard };
}
