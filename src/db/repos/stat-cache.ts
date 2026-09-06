import type { Database } from "bun:sqlite";

/** Владелец видит больше, поэтому его снимок хранится отдельно от публичного. */
export type Scope = "owner" | "public";

export type CachedStats = {
  payload: unknown;
  fetchedAt: number;
};

/**
 * Последний удачный ответ сервера.
 *
 * Нужен ровно для одного случая: сервер лёг, а игрок открыл статистику.
 * Показать вчерашние цифры с подписью «данные на 14:20» честнее, чем пустой
 * экран с ошибкой.
 */
export class StatCacheRepo {
  constructor(private readonly db: Database) {}

  get(uuid: string, server: string, scope: Scope): CachedStats | null {
    const row = this.db
      .query("SELECT payload_json, fetched_at FROM stat_cache WHERE uuid = ? AND server = ? AND scope = ?")
      .get(uuid, server, scope) as { payload_json: string; fetched_at: number } | null;
    if (!row) return null;

    try {
      return { payload: JSON.parse(row.payload_json), fetchedAt: row.fetched_at };
    } catch {
      return null;
    }
  }

  put(uuid: string, server: string, scope: Scope, payload: unknown): void {
    this.db
      .prepare(
        `INSERT INTO stat_cache (uuid, server, scope, payload_json, fetched_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (uuid, server, scope) DO UPDATE SET
           payload_json = excluded.payload_json,
           fetched_at = excluded.fetched_at`,
      )
      .run(uuid, server, scope, JSON.stringify(payload), Date.now());
  }

  /** Чистка после вайпа сезона: старые цифры больше не про этот сезон. */
  forgetServer(server: string): number {
    return this.db.prepare("DELETE FROM stat_cache WHERE server = ?").run(server).changes;
  }
}
