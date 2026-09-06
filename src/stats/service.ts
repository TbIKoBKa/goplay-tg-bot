import { z } from "zod";
import type { BridgeServer } from "../bridge/server";
import type { StatCacheRepo, Scope } from "../db/repos/stat-cache";
import type { PlayersRepo } from "../db/repos/players";

const RowSchema = z.object({
  label: z.string(),
  value: z.string(),
  /** Ключ каталога и сырое значение нужны недельному дайджесту. */
  key: z.string().default(""),
  raw: z.string().default(""),
});

const CardSchema = z.object({
  title: z.string(),
  rows: z.array(RowSchema),
});

const StatsPayloadSchema = z.object({
  cards: z.array(CardSchema).default([]),
});

export type StatCard = z.infer<typeof CardSchema>;
export type StatRow = z.infer<typeof RowSchema>;

/** Сырые значения из карточек: ключ каталога в строку, как её отдал сервер. */
export function rawValues(cards: StatCard[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const card of cards) {
    for (const row of card.rows) {
      if (row.key && row.raw) values[row.key] = row.raw;
    }
  }
  return values;
}

/** Подписи к ключам: дайджесту надо назвать то, что изменилось. */
export function labelsOf(cards: StatCard[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const card of cards) {
    for (const row of card.rows) {
      if (row.key) labels[row.key] = row.label;
    }
  }
  return labels;
}

export type StatsView =
  | { kind: "fresh"; cards: StatCard[] }
  /** Сервер не ответил, показываем последний удачный снимок. */
  | { kind: "stale"; cards: StatCard[]; fetchedAt: number }
  | { kind: "empty" }
  | { kind: "error"; reason: string };

/**
 * Статистика игрока на одном сервере.
 *
 * Удачный ответ сохраняется, поэтому упавший гриф не оставляет игрока с пустым
 * экраном: он увидит вчерашние цифры и честную подпись, когда они сняты.
 */
export async function fetchStats(
  bridge: BridgeServer,
  cache: StatCacheRepo,
  server: string,
  uuid: string,
  scope: Scope,
): Promise<StatsView> {
  const outcome = await bridge.query(server, "stats", { uuid, owner: scope === "owner" });

  if (outcome.ok) {
    const parsed = StatsPayloadSchema.safeParse(outcome.payload);
    if (!parsed.success) return { kind: "error", reason: "Сервер ответил непонятным" };

    cache.put(uuid, server, scope, parsed.data);
    return parsed.data.cards.length === 0
      ? { kind: "empty" }
      : { kind: "fresh", cards: parsed.data.cards };
  }

  const cached = cache.get(uuid, server, scope);
  if (cached) {
    const parsed = StatsPayloadSchema.safeParse(cached.payload);
    if (parsed.success && parsed.data.cards.length > 0) {
      return { kind: "stale", cards: parsed.data.cards, fetchedAt: cached.fetchedAt };
    }
  }

  return { kind: "error", reason: outcome.error };
}

const ResolveSchema = z.object({
  found: z.boolean(),
  uuid: z.string().optional(),
  nick: z.string().optional(),
});

export type ResolvedPlayer = {
  uuid: string;
  nick: string;
  /** Режим, который знает этот ник. Там же осмысленно показывать карточку. */
  server: string | null;
};

/**
 * Ник в UUID.
 *
 * Сначала своя память, потом спрашиваем серверы. Порядок важен: у сервера ник
 * ищется в usercache, и на режиме, где игрок ни разу не был, его просто нет.
 *
 * Отвечаем первому нашедшему, не дожидаясь остальных: за поиском стоит живой
 * человек со спиннером, а один лежащий режим держал бы его все восемь секунд
 * таймаута.
 */
export function resolveNick(
  bridge: BridgeServer,
  players: PlayersRepo,
  servers: readonly string[],
  nick: string,
): Promise<ResolvedPlayer | null> {
  const known = players.byNick(nick);
  if (known) {
    return Promise.resolve({ ...known, server: players.lastServerOf(known.uuid) });
  }

  return new Promise((resolve) => {
    let pending = servers.length;
    let done = false;

    if (pending === 0) {
      resolve(null);
      return;
    }

    for (const server of servers) {
      void bridge
        .query(server, "resolve", { nick })
        .then((outcome) => {
          if (done) return;

          const parsed = outcome.ok ? ResolveSchema.safeParse(outcome.payload) : null;
          const data = parsed?.success ? parsed.data : null;

          if (data?.found && data.uuid && data.nick) {
            done = true;
            players.remember(data.uuid, data.nick, server);
            resolve({ uuid: data.uuid, nick: data.nick, server });
            return;
          }

          if (--pending === 0) resolve(null);
        })
        .catch(() => {
          if (!done && --pending === 0) resolve(null);
        });
    }
  });
}
