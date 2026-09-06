import { z } from "zod";
import type { BridgeServer } from "../bridge/server";
import type { LinksRepo } from "../db/repos/links";
import type { PrefsRepo } from "../db/repos/prefs";
import type { PushQueue } from "../push/queue";
import { findTopic } from "./topics";
import { escapeHtml } from "../bot/format";

const ScanSchema = z.object({
  found: z.array(z.record(z.string(), z.unknown())).default([]),
});

export type JobDeps = {
  bridge: BridgeServer;
  links: LinksRepo;
  prefs: PrefsRepo;
  push: PushQueue;
  /** Где спрашивать. Обычно тот сервер, где живёт механика. */
  servers: readonly string[];
};

/**
 * Обход привязанных игроков на сервере.
 *
 * Список UUID шлём сами: сервер не знает, у кого есть Telegram, а обходить
 * всю базу в тысячу человек ради полусотни привязанных незачем.
 */
async function scan(
  deps: JobDeps,
  server: string,
  kind: string,
): Promise<Record<string, unknown>[]> {
  const links = deps.links.all();
  if (links.length === 0) return [];

  const outcome = await deps.bridge.query(
    server,
    "scan",
    { kind, uuids: links.map((l) => l.uuid) },
    30_000,
  );
  if (!outcome.ok) {
    console.warn(`[job] ${kind} на ${server}: ${outcome.error}`);
    return [];
  }

  const parsed = ScanSchema.safeParse(outcome.payload);
  return parsed.success ? parsed.data.found : [];
}

/** Отправляет тему владельцу UUID, если он её не выключал. */
function push(
  deps: JobDeps,
  uuid: string,
  topicId: string,
  text: string,
  dedupeKey: string,
): boolean {
  const link = deps.links.byUuid(uuid);
  const topic = findTopic(topicId);
  if (!link || !topic) return false;

  const enabled = deps.prefs.choiceOf(link.telegramId, topicId) ?? topic.defaultOn;
  if (!enabled) return false;

  return deps.push.enqueue({ chatId: link.telegramId, text, dedupeKey });
}

/** Сегодняшняя дата в ключе дедупликации: одно напоминание в сутки. */
const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Вечернее напоминание про стрик квестов.
 *
 * Самый сильный крючок возврата: игрок вложился в серию и не хочет её терять.
 */
export async function questStreakJob(deps: JobDeps): Promise<number> {
  let sent = 0;

  for (const server of deps.servers) {
    for (const row of await scan(deps, server, "quest-streak")) {
      const uuid = typeof row["uuid"] === "string" ? row["uuid"] : "";
      const streak = typeof row["streak"] === "number" ? row["streak"] : 0;
      if (!uuid || streak <= 0) continue;

      const text = [
        "🔥 <b>Стрик сгорит сегодня</b>",
        `Серия: ${streak} ${plural(streak, "день", "дня", "дней")} подряд.`,
        "",
        "Закрой дейлики до полуночи, и она продолжится.",
      ].join("\n");

      if (push(deps, uuid, "quests.streak", text, `streak:${server}:${today()}`)) sent++;
    }
  }

  return sent;
}

/**
 * Напоминание про истекающую привилегию.
 *
 * Ранги на серверах независимые, поэтому сервер указывается в тексте: без него
 * игрок не поймёт, где именно у него кончается доступ.
 */
export async function rankExpiryJob(
  deps: JobDeps,
  titles: Map<string, string>,
): Promise<number> {
  let sent = 0;

  for (const server of deps.servers) {
    for (const row of await scan(deps, server, "rank-expiry")) {
      const uuid = typeof row["uuid"] === "string" ? row["uuid"] : "";
      const rank = typeof row["rank"] === "string" ? row["rank"] : "";
      const days = typeof row["days"] === "number" ? row["days"] : 0;
      if (!uuid || !rank) continue;

      const where = titles.get(server) ?? server;
      const when =
        days <= 0
          ? "истекает сегодня"
          : `истекает через ${days} ${plural(days, "день", "дня", "дней")}`;

      const text = [
        "👑 <b>Привилегия заканчивается</b>",
        `<b>${escapeHtml(rank)}</b> на режиме ${escapeHtml(where)} ${when}.`,
        "",
        "Продлить можно на go-play.gg.",
      ].join("\n");

      if (push(deps, uuid, "rank.expiry", text, `rank:${server}:${rank}:${today()}`)) sent++;
    }
  }

  return sent;
}

/** Русское склонение по числу: 1 день, 2 дня, 5 дней. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
