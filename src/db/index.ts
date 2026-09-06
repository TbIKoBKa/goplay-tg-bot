import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { migrate } from "./migrations";

/** База в памяти: используется в тестах, каталог для неё создавать не надо. */
const IN_MEMORY = ":memory:";

/**
 * Открывает базу бота и доводит её до актуальной схемы.
 *
 * WAL нужен, потому что писать в базу будут одновременно обработчик кнопок
 * и фоновая очередь пушей. busy_timeout спасает от мгновенного SQLITE_BUSY,
 * когда эти двое пересеклись на одной странице.
 */
export function openDb(file: string): Database {
  if (file !== IN_MEMORY) {
    const dir = dirname(file);
    // Проверка перед mkdir не лишняя: на Windows recursive-вариант всё равно
    // спотыкается о существующий каталог "." и роняет запуск.
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  const db = new Database(file, { create: true });
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA busy_timeout = 5000");
  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA synchronous = NORMAL");

  migrate(db);
  return db;
}

export type { Database };
