import type { Database } from "bun:sqlite";

/**
 * Миграции нумерованные, версия живёт в PRAGMA user_version.
 * Каждая функция применяется ровно один раз и в транзакции.
 * Менять уже выпущенную миграцию нельзя, только добавлять новую в конец.
 */
type Migration = (db: Database) => void;

const MIGRATIONS: Migration[] = [
  // 1. Схема бота целиком.
  (db) => {
    // Связь Telegram с игровым аккаунтом. Ключ на UUID уникален: один игровой
    // аккаунт живёт ровно в одном чате, иначе личные пуши ушли бы двоим.
    db.run(`
      CREATE TABLE links (
        telegram_id INTEGER PRIMARY KEY,
        uuid        TEXT NOT NULL,
        nick        TEXT NOT NULL,
        nick_lower  TEXT NOT NULL,
        linked_at   INTEGER NOT NULL
      )
    `);
    db.run("CREATE UNIQUE INDEX idx_links_uuid ON links(uuid)");

    db.run(`
      CREATE TABLE subscriptions (
        telegram_id INTEGER NOT NULL,
        topic       TEXT NOT NULL,
        enabled     INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (telegram_id, topic)
      )
    `);
    db.run("CREATE INDEX idx_subs_topic ON subscriptions(topic, enabled)");

    // Защита от повторной отправки одного и того же события: переживает
    // перезапуск бота, поэтому напоминание не придёт дважды после редеплоя.
    db.run(`
      CREATE TABLE push_log (
        telegram_id INTEGER NOT NULL,
        dedupe_key  TEXT NOT NULL,
        sent_at     INTEGER NOT NULL,
        PRIMARY KEY (telegram_id, dedupe_key)
      )
    `);
    db.run("CREATE INDEX idx_push_log_sent ON push_log(sent_at)");

    // Кеш «ник в UUID»: вычислить одно из другого нельзя, отвечает сервер.
    db.run(`
      CREATE TABLE players (
        uuid             TEXT PRIMARY KEY,
        nick             TEXT NOT NULL,
        nick_lower       TEXT NOT NULL,
        last_seen_server TEXT,
        last_seen_at     INTEGER
      )
    `);
    db.run("CREATE INDEX idx_players_nick ON players(nick_lower)");

    // Последний удачный ответ сервера. Владелец и посторонний видят разный
    // набор строк, поэтому scope входит в ключ: иначе чужой запрос вытащил бы
    // из кеша баланс и щит.
    db.run(`
      CREATE TABLE stat_cache (
        uuid         TEXT NOT NULL,
        server       TEXT NOT NULL,
        scope        TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        fetched_at   INTEGER NOT NULL,
        PRIMARY KEY (uuid, server, scope)
      )
    `);

    // Кто позвал человека в бота. Ждёт привязки аккаунта: до неё мы не знаем
    // игрового UUID и передать намерение серверу нечем.
    db.run(`
      CREATE TABLE pending_refs (
        telegram_id INTEGER PRIMARY KEY,
        referrer    TEXT NOT NULL,
        created_at  INTEGER NOT NULL
      )
    `);

    // Снимок сырых значений на начало недели. Дайджест это разница между
    // сегодняшними цифрами и снимком, поэтому хранить надо именно сырьё:
    // из «34 823» и «2 д 3 ч» разницу не посчитать.
    db.run(`
      CREATE TABLE stat_snapshot (
        uuid        TEXT NOT NULL,
        server      TEXT NOT NULL,
        values_json TEXT NOT NULL,
        taken_at    INTEGER NOT NULL,
        PRIMARY KEY (uuid, server)
      )
    `);
  },
];

export function migrate(db: Database): void {
  const row = db.query("PRAGMA user_version").get() as { user_version: number } | null;
  const current = row?.user_version ?? 0;

  for (let i = current; i < MIGRATIONS.length; i++) {
    const step = MIGRATIONS[i];
    if (!step) continue;
    const version = i + 1;
    const apply = db.transaction(() => {
      step(db);
      // user_version не принимает параметры, поэтому подставляем числом.
      // Значение берётся из индекса массива, снаружи в него ничего не попадает.
      db.run(`PRAGMA user_version = ${version}`);
    });
    apply();
    console.log(`[db] применил миграцию ${version}`);
  }
}
