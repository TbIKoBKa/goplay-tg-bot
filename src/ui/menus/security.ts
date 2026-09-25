import { InlineKeyboard, backRow, cb } from "../keyboard";
import { escapeHtml } from "../../bot/format";
import { TRUST_DAYS } from "../../auth/login-guard";
import type { MenuRequest, MenuView } from "../types";

/**
 * Подтверждение входа: включить, выключить, забыть доверенные IP.
 *
 * Настройка принадлежит игровому аккаунту, поэтому без привязки её нет.
 * Персоналу подтверждение включает сервер, и выключить его отсюда нельзя:
 * бот не знает, кто персонал, это решает право на прокси.
 */
export function securityMenu(req: MenuRequest): MenuView {
  const { links, loginGuard } = req.deps;
  const link = links.byTelegramId(req.chatId);

  if (!link) {
    const text = [
      "🔐 <b>Подтверждение входа</b>",
      "",
      "Сначала привяжи аккаунт: зайди на любой режим и набери <code>/tg</code>.",
    ].join("\n");
    return { text, keyboard: backRow(new InlineKeyboard(), "profile") };
  }

  const repo = loginGuard.repo;
  let toast: string | undefined;

  if (req.action === "t") {
    const enabled = !repo.isEnabled(link.uuid);
    repo.setEnabled(link.uuid, enabled);
    toast = enabled ? "Подтверждение входа включено" : "Подтверждение входа выключено";
  } else if (req.action === "forget") {
    const removed = repo.forgetAll(link.uuid);
    toast = removed > 0 ? `Забыто IP: ${removed}` : "Доверенных IP нет";
  }

  const enabled = repo.isEnabled(link.uuid);
  const trusted = repo.trustedCount(link.uuid);

  const text = [
    "🔐 <b>Подтверждение входа</b>",
    "",
    `Аккаунт: <b>${escapeHtml(link.nick)}</b>`,
    `Сейчас: <b>${enabled ? "включено" : "выключено"}</b>`,
    `Доверенных IP: ${trusted}`,
    "",
    "Когда включено, после ввода пароля в игре с нового IP сюда придёт сообщение",
    "с кнопками «Подтвердить» и «Это не я». Без подтверждения на сервер не пустит,",
    "даже если пароль знает кто-то ещё.",
    "",
    `Подтверждённый IP запоминается на ${TRUST_DAYS} дней.`,
    "Если бот временно недоступен, вход пропускается без подтверждения.",
  ].join("\n");

  const keyboard = new InlineKeyboard()
    .text(enabled ? "✅ Включено" : "❌ Выключено", cb("sec", "t"))
    .row()
    .text("Забыть доверенные IP", cb("sec", "forget"));

  return { text, keyboard: backRow(keyboard, "profile"), ...(toast ? { toast } : {}) };
}
