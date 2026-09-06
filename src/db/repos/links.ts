import type { Database } from "bun:sqlite";

export type Link = {
  telegramId: number;
  uuid: string;
  nick: string;
  linkedAt: number;
};

type Row = { telegram_id: number; uuid: string; nick: string; linked_at: number };

const toLink = (row: Row): Link => ({
  telegramId: row.telegram_id,
  uuid: row.uuid,
  nick: row.nick,
  linkedAt: row.linked_at,
});

/**
 * Связь Telegram с игровым аккаунтом.
 *
 * Живёт у бота, а не на серверах: серверов несколько, а привязка одна на всю
 * сеть. UUID стабилен по сети (LimboAuth сохраняет его при первом входе),
 * поэтому ключуемся на него, а ник просто держим для показа: ники меняются.
 */
export class LinksRepo {
  constructor(private readonly db: Database) {}

  byTelegramId(telegramId: number): Link | null {
    const row = this.db
      .query("SELECT * FROM links WHERE telegram_id = ?")
      .get(telegramId) as Row | null;
    return row ? toLink(row) : null;
  }

  byUuid(uuid: string): Link | null {
    const row = this.db.query("SELECT * FROM links WHERE uuid = ?").get(uuid) as Row | null;
    return row ? toLink(row) : null;
  }

  /**
   * Привязывает аккаунт к чату.
   *
   * Оба направления перезаписываются: один игровой аккаунт может быть привязан
   * ровно к одному Telegram и наоборот. Иначе после смены телефона у аккаунта
   * оказалось бы два владельца, и личные пуши ушли бы обоим.
   */
  link(telegramId: number, uuid: string, nick: string): void {
    const now = Date.now();
    const apply = this.db.transaction(() => {
      this.db.prepare("DELETE FROM links WHERE uuid = ?").run(uuid);
      this.db
        .prepare(
          `INSERT INTO links (telegram_id, uuid, nick, nick_lower, linked_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (telegram_id) DO UPDATE SET
             uuid = excluded.uuid,
             nick = excluded.nick,
             nick_lower = excluded.nick_lower,
             linked_at = excluded.linked_at`,
        )
        .run(telegramId, uuid, nick, nick.toLowerCase(), now);
    });
    apply();
  }

  unlink(telegramId: number): boolean {
    const res = this.db.prepare("DELETE FROM links WHERE telegram_id = ?").run(telegramId);
    return res.changes > 0;
  }

  /** Ник мог смениться: обновляем при каждом удобном случае. */
  renameNick(uuid: string, nick: string): void {
    this.db
      .prepare("UPDATE links SET nick = ?, nick_lower = ? WHERE uuid = ?")
      .run(nick, nick.toLowerCase(), uuid);
  }

  /** Все привязанные. Нужен ежедневным задачам: они обходят только этот список. */
  all(): Link[] {
    const rows = this.db.query("SELECT * FROM links").all() as Row[];
    return rows.map(toLink);
  }

  count(): number {
    const row = this.db.query("SELECT COUNT(*) AS n FROM links").get() as { n: number } | null;
    return row?.n ?? 0;
  }
}
