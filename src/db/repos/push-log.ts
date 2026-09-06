import type { Database } from "bun:sqlite";

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Журнал отправленных пушей: не даёт прислать одно и то же дважды.
 *
 * Нужен именно на диске, а не в памяти: после редеплоя бот заново пройдёт по
 * ежедневным задачам, и без журнала игрок получит второе "привилегия истекает".
 */
export class PushLogRepo {
  constructor(private readonly db: Database) {}

  /**
   * Помечает событие отправленным. Возвращает false, если оно уже было -
   * тогда слать не надо. Проверка и запись в одном шаге, чтобы две задачи
   * не проскочили одновременно.
   */
  claim(chatId: number, dedupeKey: string): boolean {
    const res = this.db
      .prepare(
        "INSERT OR IGNORE INTO push_log (telegram_id, dedupe_key, sent_at) VALUES (?, ?, ?)",
      )
      .run(chatId, dedupeKey, Date.now());
    return res.changes > 0;
  }

  /** Откат отметки: отправка не удалась, дадим следующему запуску шанс. */
  release(chatId: number, dedupeKey: string): void {
    this.db
      .prepare("DELETE FROM push_log WHERE telegram_id = ? AND dedupe_key = ?")
      .run(chatId, dedupeKey);
  }

  prune(ttlMs = DEFAULT_TTL_MS): number {
    const res = this.db
      .prepare("DELETE FROM push_log WHERE sent_at < ?")
      .run(Date.now() - ttlMs);
    return res.changes;
  }
}
