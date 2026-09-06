import { z } from "zod";
import { InlineKeyboard, backRow, cb } from "../keyboard";
import { escapeHtml } from "../../bot/format";
import type { MenuRequest, MenuView } from "../types";

const BoardsSchema = z.object({
  boards: z.array(z.object({ id: z.string(), title: z.string() })).default([]),
});

const TopSchema = z.object({
  title: z.string().default(""),
  rows: z
    .array(z.object({ place: z.number(), nick: z.string(), value: z.string() }))
    .default([]),
});

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Таблицы лидеров.
 *
 * Аргумент это «сервер:таблица». Оба идентификатора короткие, в лимит
 * callback_data влезают с запасом, а ник туда не попадает вовсе.
 */
export async function leaderboardMenu(req: MenuRequest): Promise<MenuView> {
  const { config, bridge } = req.deps;
  const [serverId, boardId] = req.arg.split(":");

  const server = config.servers.find((s) => s.id === serverId);
  if (!server) return pickServer(req);

  if (!boardId) {
    const outcome = await bridge.query(server.id, "top", {});
    if (!outcome.ok) {
      return {
        text: `🏆 <b>Топы</b>\n\n${escapeHtml(server.title)} не отвечает. Попробуй позже.`,
        keyboard: backRow(new InlineKeyboard(), "top"),
      };
    }

    const parsed = BoardsSchema.safeParse(outcome.payload);
    const boards = parsed.success ? parsed.data.boards : [];

    if (boards.length === 0) {
      return {
        text: `🏆 <b>Топы</b>\n\nНа режиме ${escapeHtml(server.title)} таблиц пока нет.`,
        keyboard: backRow(new InlineKeyboard(), "top"),
      };
    }

    const keyboard = new InlineKeyboard();
    let first = true;
    for (const board of boards) {
      if (!first) keyboard.row();
      keyboard.text(board.title, cb("top", "open", `${server.id}:${board.id}`));
      first = false;
    }

    return {
      text: `🏆 <b>Топы · ${escapeHtml(server.title)}</b>\n\nВыбери таблицу.`,
      keyboard: backRow(keyboard, "top"),
    };
  }

  const outcome = await bridge.query(server.id, "top", { board: boardId, limit: 10 });
  if (!outcome.ok) {
    return {
      text: `🏆 <b>Топы</b>\n\nНе получилось: ${escapeHtml(outcome.error)}.`,
      keyboard: backRow(new InlineKeyboard(), "top"),
    };
  }

  const parsed = TopSchema.safeParse(outcome.payload);
  const data = parsed.success ? parsed.data : { title: "", rows: [] };

  const lines = [`🏆 <b>${escapeHtml(data.title)}</b> · ${escapeHtml(server.title)}`, ""];
  if (data.rows.length === 0) {
    lines.push("Пока пусто. Займи первое место.");
  } else {
    for (const row of data.rows) {
      const medal = MEDALS[row.place - 1] ?? `${row.place}.`;
      lines.push(`${medal} ${escapeHtml(row.nick)} · ${escapeHtml(row.value)}`);
    }
  }

  const keyboard = new InlineKeyboard()
    .text("‹ Другие таблицы", cb("top", "open", server.id))
    .row()
    .text("🔄 Обновить", cb("top", "refresh", `${server.id}:${boardId}`));

  return {
    text: lines.join("\n"),
    keyboard: backRow(keyboard, "top"),
    // Таблица могла не измениться, и без подсказки нажатие выглядит как поломка.
    ...(req.action === "refresh" ? { toast: "Обновлено" } : {}),
  };
}

function pickServer(req: MenuRequest): MenuView {
  const keyboard = new InlineKeyboard();
  let first = true;
  for (const server of req.deps.config.servers) {
    if (!first) keyboard.row();
    keyboard.text(server.title, cb("top", "open", server.id));
    first = false;
  }

  return {
    text: "🏆 <b>Топы</b>\n\nВыбери режим.",
    keyboard: backRow(keyboard),
  };
}
