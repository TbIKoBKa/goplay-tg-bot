import type { Database } from "bun:sqlite";

/**
 * Настройка «подтверждать вход в Telegram» и доверенные IP.
 *
 * Ключ на UUID, как у привязки: настройка принадлежит игровому аккаунту. Если
 * игрок перепривяжет аккаунт к другому Telegram, она останется, а подтверждать
 * будет уже новый чат.
 */
export class LoginGuardRepo {
  constructor(private readonly db: Database) {}

  isEnabled(uuid: string): boolean {
    const row = this.db
      .query("SELECT enabled FROM login_guard WHERE uuid = ?")
      .get(uuid) as { enabled: number } | null;
    return row?.enabled === 1;
  }

  setEnabled(uuid: string, enabled: boolean): void {
    this.db
      .prepare(
        `INSERT INTO login_guard (uuid, enabled, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (uuid) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
      )
      .run(uuid, enabled ? 1 : 0, Date.now());
  }

  isTrusted(uuid: string, ip: string, now = Date.now()): boolean {
    const row = this.db
      .query("SELECT until FROM trusted_ips WHERE uuid = ? AND ip = ?")
      .get(uuid, ip) as { until: number } | null;
    return row !== null && row.until > now;
  }

  trust(uuid: string, ip: string, until: number): void {
    this.db
      .prepare(
        `INSERT INTO trusted_ips (uuid, ip, until) VALUES (?, ?, ?)
         ON CONFLICT (uuid, ip) DO UPDATE SET until = excluded.until`,
      )
      .run(uuid, ip, until);
  }

  trustedCount(uuid: string, now = Date.now()): number {
    const row = this.db
      .query("SELECT COUNT(*) AS n FROM trusted_ips WHERE uuid = ? AND until > ?")
      .get(uuid, now) as { n: number } | null;
    return row?.n ?? 0;
  }

  /** Забыть все доверенные IP аккаунта: следующий вход с любого IP снова спросит. */
  forgetAll(uuid: string): number {
    return this.db.prepare("DELETE FROM trusted_ips WHERE uuid = ?").run(uuid).changes;
  }

  /** Протухшие записи. Зовётся из ежесуточной уборки. */
  prune(now = Date.now()): number {
    return this.db.prepare("DELETE FROM trusted_ips WHERE until <= ?").run(now).changes;
  }
}
