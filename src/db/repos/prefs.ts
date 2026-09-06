import type { Database } from "bun:sqlite";

/**
 * Подписки на темы уведомлений.
 *
 * Строки нет - тема выключена. Явное значение 0 тоже выключено, но означает
 * "игрок сам выключил", а не "ещё не решил". Разница важна для тем, которые
 * мы включаем по умолчанию: их нельзя навязывать тому, кто уже отписался.
 */
export class PrefsRepo {
  constructor(private readonly db: Database) {}

  isEnabled(chatId: number, topic: string): boolean {
    const row = this.db
      .query("SELECT enabled FROM subscriptions WHERE telegram_id = ? AND topic = ?")
      .get(chatId, topic) as { enabled: number } | null;
    return row?.enabled === 1;
  }

  /** Явный выбор игрока по теме: true, false или null, если он ещё не решал. */
  choiceOf(chatId: number, topic: string): boolean | null {
    const row = this.db
      .query("SELECT enabled FROM subscriptions WHERE telegram_id = ? AND topic = ?")
      .get(chatId, topic) as { enabled: number } | null;
    if (!row) return null;
    return row.enabled === 1;
  }

  set(chatId: number, topic: string, enabled: boolean): void {
    this.db
      .prepare(
        `INSERT INTO subscriptions (telegram_id, topic, enabled) VALUES (?, ?, ?)
         ON CONFLICT (telegram_id, topic) DO UPDATE SET enabled = excluded.enabled`,
      )
      .run(chatId, topic, enabled ? 1 : 0);
  }

  toggle(chatId: number, topic: string, fallback: boolean): boolean {
    const current = this.choiceOf(chatId, topic) ?? fallback;
    const next = !current;
    this.set(chatId, topic, next);
    return next;
  }

  /** Все явные выборы чата: тема -> включена. */
  choicesOf(chatId: number): Map<string, boolean> {
    const rows = this.db
      .query("SELECT topic, enabled FROM subscriptions WHERE telegram_id = ?")
      .all(chatId) as { topic: string; enabled: number }[];
    return new Map(rows.map((r) => [r.topic, r.enabled === 1]));
  }

  /** Кому слать эту тему. */
  subscribersOf(topic: string): number[] {
    const rows = this.db
      .query("SELECT telegram_id FROM subscriptions WHERE topic = ? AND enabled = 1")
      .all(topic) as { telegram_id: number }[];
    return rows.map((r) => r.telegram_id);
  }

  countOf(topic: string): number {
    const row = this.db
      .query("SELECT COUNT(*) AS n FROM subscriptions WHERE topic = ? AND enabled = 1")
      .get(topic) as { n: number } | null;
    return row?.n ?? 0;
  }

  /**
   * Проставляет чату умолчания по темам, которые он ещё не видел.
   *
   * Вызывается при первом контакте с ботом. Уже сделанный выбор не трогает,
   * поэтому отписавшегося не подпишут обратно новой версией бота.
   */
  ensureDefaults(chatId: number, topics: readonly { id: string; defaultOn: boolean }[]): void {
    const insert = this.db.prepare(
      "INSERT OR IGNORE INTO subscriptions (telegram_id, topic, enabled) VALUES (?, ?, ?)",
    );
    const run = this.db.transaction(() => {
      for (const topic of topics) insert.run(chatId, topic.id, topic.defaultOn ? 1 : 0);
    });
    run();
  }

  /**
   * Доставляет умолчания всем чатам, которые бот уже знает.
   *
   * Без этого новая тема с включением по умолчанию не дошла бы ни до кого из
   * старых подписчиков: рассылка смотрит на явные строки, а строки для новой
   * темы у них нет, и появилась бы она только после следующего /start.
   * Уже сделанный выбор не трогается.
   */
  backfillDefaults(topics: readonly { id: string; defaultOn: boolean }[]): number {
    const insert = this.db.prepare(
      `INSERT OR IGNORE INTO subscriptions (telegram_id, topic, enabled)
       SELECT DISTINCT telegram_id, ?, ? FROM subscriptions`,
    );

    let added = 0;
    const run = this.db.transaction(() => {
      for (const topic of topics) added += insert.run(topic.id, topic.defaultOn ? 1 : 0).changes;
    });
    run();
    return added;
  }

  /** Чат заблокировал бота: чистим все его подписки разом. */
  forget(chatId: number): void {
    this.db.prepare("DELETE FROM subscriptions WHERE telegram_id = ?").run(chatId);
  }
}
