import type { Database } from "bun:sqlite";

export type PendingRef = { referrer: string; createdAt: number };

/** Дольше держать смысла нет: приглашение засчитывается, пока игрок новичок. */
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Кто позвал человека в бота.
 *
 * Запись живёт от перехода по ссылке до привязки аккаунта: до неё игрового
 * UUID мы не знаем и передать намерение серверу нечем. На диске, а не в памяти,
 * потому что между этими двумя событиями бот вполне может быть перезапущен.
 */
export class RefsRepo {
  constructor(private readonly db: Database) {}

  /**
   * Запоминает пригласившего.
   *
   * Первая ссылка выигрывает: иначе последний, кто прислал линк, забирал бы
   * чужое приглашение у того, кто человека действительно привёл.
   */
  remember(telegramId: number, referrer: string): void {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO pending_refs (telegram_id, referrer, created_at) VALUES (?, ?, ?)",
      )
      .run(telegramId, referrer, Date.now());
  }

  /** Смотрит, не забирая: пока приглашение не доехало до сервера, оно наше. */
  peek(telegramId: number): PendingRef | null {
    const row = this.db
      .query("SELECT referrer, created_at FROM pending_refs WHERE telegram_id = ?")
      .get(telegramId) as { referrer: string; created_at: number } | null;

    if (!row) return null;
    if (Date.now() - row.created_at > TTL_MS) {
      this.forget(telegramId);
      return null;
    }
    return { referrer: row.referrer, createdAt: row.created_at };
  }

  take(telegramId: number): PendingRef | null {
    const pending = this.peek(telegramId);
    this.forget(telegramId);
    return pending;
  }

  forget(telegramId: number): void {
    this.db.prepare("DELETE FROM pending_refs WHERE telegram_id = ?").run(telegramId);
  }

  prune(): number {
    return this.db
      .prepare("DELETE FROM pending_refs WHERE created_at < ?")
      .run(Date.now() - TTL_MS).changes;
  }
}
