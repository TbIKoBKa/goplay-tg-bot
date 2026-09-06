import type { Database } from "bun:sqlite";

/** Ключ статистики в сырое значение, как его отдал сервер. */
export type RawValues = Record<string, string>;

export type Snapshot = { values: RawValues; takenAt: number };

/**
 * Снимок сырых цифр на начало недели.
 *
 * Дайджест это разница между сегодняшним и снимком, поэтому хранить надо
 * именно сырьё: из «34 823» и «2 д 3 ч» разницу не посчитать.
 */
export class SnapshotsRepo {
  constructor(private readonly db: Database) {}

  get(uuid: string, server: string): Snapshot | null {
    const row = this.db
      .query("SELECT values_json, taken_at FROM stat_snapshot WHERE uuid = ? AND server = ?")
      .get(uuid, server) as { values_json: string; taken_at: number } | null;
    if (!row) return null;

    try {
      return { values: JSON.parse(row.values_json) as RawValues, takenAt: row.taken_at };
    } catch {
      return null;
    }
  }

  put(uuid: string, server: string, values: RawValues): void {
    this.db
      .prepare(
        `INSERT INTO stat_snapshot (uuid, server, values_json, taken_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (uuid, server) DO UPDATE SET
           values_json = excluded.values_json,
           taken_at = excluded.taken_at`,
      )
      .run(uuid, server, JSON.stringify(values), Date.now());
  }

  /** После вайпа сезона старый снимок врёт: цифры обнулились, разница уйдёт в минус. */
  forgetServer(server: string): number {
    return this.db.prepare("DELETE FROM stat_snapshot WHERE server = ?").run(server).changes;
  }
}
