import { Composer, type Context } from "grammy";
import { fetchStats, resolveNick } from "../../stats/service";
import { lookupResultKeyboard } from "../../ui/menus/lookup";
import { renderStats } from "../../ui/menus/stats";
import { rememberLookup, take } from "../../ui/session";
import { escapeHtml } from "../format";
import { RateLimiter } from "../rate-limit";
import type { UiDeps } from "../../ui/types";

/** Ник в Minecraft: буквы, цифры и подчёркивание. Bedrock добавляет точку. */
const NICK_RE = /^[A-Za-z0-9_.]{1,32}$/;

/** Поиск ходит на все серверы разом, поэтому его стоит придержать. */
const LOOKUP_LIMIT = new RateLimiter(10, 60_000);

/**
 * Ввод ника для публичного просмотра статистики.
 *
 * Ловит текст только тогда, когда меню попросило его ждать. Иначе бот отвечал
 * бы на каждое случайное сообщение в чате.
 */
export function lookupInput(deps: UiDeps): Composer<Context> {
  const composer = new Composer();

  composer.on("message:text", async (ctx, next) => {
    const chatId = ctx.chat?.id;
    if (chatId === undefined) return next();
    if (take(chatId) !== "lookup") return next();

    const nick = ctx.message.text.trim();
    if (!NICK_RE.test(nick)) {
      await ctx.reply("Это не похоже на ник. Попробуй ещё раз через меню.");
      return;
    }

    const userId = ctx.from?.id ?? chatId;
    if (!LOOKUP_LIMIT.try(String(userId))) {
      await ctx.reply("Слишком часто. Подожди минуту.");
      return;
    }

    const found = await resolveNick(deps.bridge, deps.players, deps.config.link_servers, nick);
    if (!found) {
      await ctx.reply(
        `Игрок <b>${escapeHtml(nick)}</b> не найден. Возможно, он ни разу не заходил.`,
        { parse_mode: "HTML" },
      );
      return;
    }

    rememberLookup(chatId, found.uuid, found.nick);

    // Открываем на том режиме, который знает этот ник: показывать карточку
    // грифа тому, кто играет только на столбах, значит показать пустоту.
    // Лобби в списке режимов нет, поэтому подходит не всякий ответ.
    const server =
      deps.config.servers.find((s) => s.id === found.server) ?? deps.config.servers[0];
    if (!server) return;

    const view = await fetchStats(
      deps.bridge,
      deps.statCache,
      server.id,
      found.uuid,
      "public",
    );

    await ctx.reply(renderStats(server.title, found.nick, view), {
      parse_mode: "HTML",
      reply_markup: lookupResultKeyboard(deps.config.servers, server.id),
      link_preview_options: { is_disabled: true },
    });
  });

  return composer;
}
