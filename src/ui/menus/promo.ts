import { InlineKeyboard, backRow, cb } from "../keyboard";
import { escapeHtml } from "../../bot/format";
import type { MenuRequest, MenuView } from "../types";

/** Telegram пропускает в ?start= только буквы, цифры, дефис и подчёркивание. */
const START_SAFE = /^[A-Za-z0-9_-]{1,60}$/;

/**
 * Друзья и промокоды.
 *
 * Приглашение засчитывает GoPlayPromo своей командой, со всеми его проверками
 * на самоприглашение, повтор и один IP. Бот только доносит намерение: вторая
 * копия этих правил однажды разойдётся с первой, и через неё утекут награды.
 */
export function promoMenu(req: MenuRequest): MenuView {
  const { links, config, botUsername } = req.deps;
  const link = links.byTelegramId(req.chatId);

  const lines = ["🎁 <b>Друзья и промокоды</b>", ""];
  const keyboard = new InlineKeyboard();

  if (!link) {
    lines.push(
      "Привяжи аккаунт, и здесь появится твоя ссылка-приглашение.",
      "Зайди на любой режим и набери <code>/tg</code>.",
    );
  } else {
    lines.push("<b>Позвать друга</b>");

    if (botUsername.value && START_SAFE.test(link.nick)) {
      lines.push(
        "Отправь ему эту ссылку:",
        `<code>https://t.me/${botUsername.value}?start=R-${escapeHtml(link.nick)}</code>`,
        "",
        "Он откроет бота, привяжет аккаунт и просто пойдёт играть.",
        "Приглашение засчитается само, когда он освоится на сервере.",
        "Награду получите оба, в игре.",
      );
    } else {
      // Ник с точкой у игроков Bedrock в ссылку не влезает: Telegram такой
      // символ в ?start= не пропускает.
      lines.push(
        `Пусть зайдёт на <code>${config.links.ip}</code> и напишет в игре <code>/ref ${escapeHtml(link.nick)}</code>.`,
        "Награду получите оба.",
      );
    }

    keyboard.text("📊 Сколько я позвал", cb("stats")).row();
  }

  lines.push(
    "",
    "<b>Промокоды</b>",
    `Коды публикуются в канале ${config.links.telegram}.`,
    "Активируются в игре командой <code>/promo код</code>.",
  );

  return { text: lines.join("\n"), keyboard: backRow(keyboard) };
}

/** Приветствие для того, кто пришёл по ссылке-приглашению. */
export function invitedText(referrer: string, ip: string): string {
  return [
    `👋 Тебя позвал <b>${escapeHtml(referrer)}</b>.`,
    "",
    `Заходи на <code>${ip}</code>, версия 1.21 и выше, Java и Bedrock.`,
    "В игре набери <code>/tg</code> и вернись сюда по ссылке.",
    "Приглашение засчитается само, награду получите оба.",
  ].join("\n");
}

/** Достаёт ник пригласившего из полезной нагрузки /start. */
export function referrerFromStartPayload(payload: string | undefined): string | null {
  const raw = payload?.trim() ?? "";
  if (!raw.startsWith("R-")) return null;
  const nick = raw.slice(2).trim();
  return START_SAFE.test(nick) ? nick : null;
}
