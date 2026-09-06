import type { Database } from "bun:sqlite";

export type Player = { uuid: string; nick: string };

type Row = { uuid: string; nick: string };

/**
 * Кеш «ник в UUID».
 *
 * Вычислить UUID из ника нельзя: сеть в offline-режиме, но LimboAuth пускает
 * премиум-игроков с настоящим UUID от Mojang. Поэтому ник разрешает сервер,
 * а мы просто запоминаем ответ, чтобы не спрашивать по кругу.
 */
export class PlayersRepo {
  constructor(private readonly db: Database) {}

  byNick(nick: string): Player | null {
    const row = this.db
      .query("SELECT uuid, nick FROM players WHERE nick_lower = ?")
      .get(nick.toLowerCase()) as Row | null;
    return row ?? null;
  }

  /** Режим, на котором игрока видели последним. Нужен адресным действиям. */
  lastServerOf(uuid: string): string | null {
    const row = this.db
      .query("SELECT last_seen_server FROM players WHERE uuid = ?")
      .get(uuid) as { last_seen_server: string | null } | null;
    return row?.last_seen_server ?? null;
  }

  remember(uuid: string, nick: string, server?: string): void {
    this.db
      .prepare(
        `INSERT INTO players (uuid, nick, nick_lower, last_seen_server, last_seen_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (uuid) DO UPDATE SET
           nick = excluded.nick,
           nick_lower = excluded.nick_lower,
           last_seen_server = COALESCE(excluded.last_seen_server, players.last_seen_server),
           last_seen_at = excluded.last_seen_at`,
      )
      .run(uuid, nick, nick.toLowerCase(), server ?? null, Date.now());
  }
}
