import { InlineKeyboard, backRow, cb } from "../keyboard";
import { escapeHtml, stripMinecraftColors } from "../../bot/format";
import { fetchStats, type StatCard, type StatsView } from "../../stats/service";
import type { MenuRequest, MenuView } from "../types";

/**
 * Статистика по режимам.
 *
 * Без аргумента показывает выбор режима, с аргументом карточки. Аргумент это
 * id сервера, он короткий и в лимит callback_data влезает с запасом.
 */
export async function statsMenu(req: MenuRequest): Promise<MenuView> {
  const { config, links } = req.deps;
  const link = links.byTelegramId(req.chatId);

  if (!link) {
    return {
      text: [
        "📊 <b>Статистика</b>",
        "",
        "Сначала привяжи аккаунт: зайди на любой режим и набери <code>/tg</code>.",
        "",
        "Чужую статистику можно посмотреть и без привязки, через поиск по нику.",
      ].join("\n"),
      keyboard: backRow(new InlineKeyboard().text("🔎 Найти игрока", cb("lookup"))),
    };
  }

  const server = config.servers.find((s) => s.id === req.arg);
  if (!server) {
    const keyboard = new InlineKeyboard();
    let first = true;
    for (const item of config.servers) {
      if (!first) keyboard.row();
      keyboard.text(item.title, cb("stats", "open", item.id));
      first = false;
    }

    return {
      text: [
        "📊 <b>Статистика</b>",
        "",
        `Аккаунт: <b>${escapeHtml(link.nick)}</b>`,
        "",
        "Выбери режим.",
      ].join("\n"),
      keyboard: backRow(keyboard),
    };
  }

  const view = await fetchStats(req.deps.bridge, req.deps.statCache, server.id, link.uuid, "owner");

  return {
    text: renderStats(server.title, link.nick, view),
    keyboard: backRow(
      new InlineKeyboard().text("🔄 Обновить", cb("stats", "refresh", server.id)),
      "stats",
    ),
    ...(req.action === "refresh" ? { toast: "Обновлено" } : {}),
  };
}

/** Общая отрисовка карточек: её же использует публичный просмотр по нику. */
export function renderStats(serverTitle: string, nick: string, view: StatsView): string {
  const head = `📊 <b>${escapeHtml(serverTitle)}</b> · ${escapeHtml(nick)}`;

  switch (view.kind) {
    case "empty":
      return [head, "", "На этом режиме статистики пока нет. Загляни в игру."].join("\n");

    case "error":
      return [head, "", `Не получилось: ${escapeHtml(view.reason)}.`, "Попробуй позже."].join("\n");

    case "stale": {
      const at = new Date(view.fetchedAt).toLocaleString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
      return [head, `<i>Сервер не отвечает, данные на ${at}</i>`, "", cardsToText(view.cards)].join(
        "\n",
      );
    }

    default:
      return [head, "", cardsToText(view.cards)].join("\n");
  }
}

function cardsToText(cards: StatCard[]): string {
  return cards
    .map((card) => {
      const rows = card.rows
        .map((row) => `${escapeHtml(row.label)}: <b>${escapeHtml(clean(row.value))}</b>`)
        .join("\n");
      return `<b>${escapeHtml(card.title)}</b>\n${rows}`;
    })
    .join("\n\n");
}

/** Значения приходят из игры: в них встречаются цветовые коды Minecraft. */
function clean(value: string): string {
  return stripMinecraftColors(value).trim();
}
