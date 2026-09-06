import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb } from "./index";
import { LinksRepo } from "./repos/links";
import { PrefsRepo } from "./repos/prefs";
import { PushLogRepo } from "./repos/push-log";

/** База в памяти: схема та же, а файлов после теста не остаётся. */
function memoryDb() {
  return openDb(":memory:");
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "goplay-db-"));
});

afterEach(() => {
  // Windows иногда ещё держит файлы WAL в момент уборки. Для теста это не важно,
  // временный каталог всё равно подчистит система.
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* пусто */
  }
});

describe("миграции", () => {
  test("создают схему и не применяются повторно", () => {
    const dbFile = join(dir, "goplay.db");

    const first = openDb(dbFile);
    const version = (first.query("PRAGMA user_version").get() as { user_version: number })
      .user_version;
    expect(version).toBeGreaterThan(0);
    first.close();

    // Второе открытие не должно падать на CREATE TABLE.
    const second = openDb(dbFile);
    const again = (second.query("PRAGMA user_version").get() as { user_version: number })
      .user_version;
    expect(again).toBe(version);
    second.close();
  });
});

describe("подписки", () => {
  test("умолчания не затирают выбор игрока", () => {
    const db = memoryDb();
    const prefs = new PrefsRepo(db);

    prefs.set(1, "announce", false);
    prefs.ensureDefaults(1, [{ id: "announce", defaultOn: true }]);

    expect(prefs.isEnabled(1, "announce")).toBe(false);
    db.close();
  });

  test("умолчания проставляются новому чату", () => {
    const db = memoryDb();
    const prefs = new PrefsRepo(db);

    prefs.ensureDefaults(2, [
      { id: "announce", defaultOn: true },
      { id: "raids", defaultOn: false },
    ]);

    expect(prefs.isEnabled(2, "announce")).toBe(true);
    expect(prefs.isEnabled(2, "raids")).toBe(false);
    expect(prefs.subscribersOf("announce")).toEqual([2]);
    db.close();
  });

  test("переключение опирается на умолчание, пока выбора не было", () => {
    const db = memoryDb();
    const prefs = new PrefsRepo(db);

    expect(prefs.choiceOf(3, "announce")).toBeNull();
    expect(prefs.toggle(3, "announce", true)).toBe(false);
    expect(prefs.toggle(3, "announce", true)).toBe(true);
    db.close();
  });

  test("новая тема доезжает до уже известных чатов", () => {
    const db = memoryDb();
    const prefs = new PrefsRepo(db);

    // Два чата успели познакомиться с ботом до появления темы raids.
    prefs.ensureDefaults(1, [{ id: "announce", defaultOn: true }]);
    prefs.ensureDefaults(2, [{ id: "announce", defaultOn: true }]);
    prefs.set(2, "announce", false);

    const added = prefs.backfillDefaults([
      { id: "announce", defaultOn: true },
      { id: "raids", defaultOn: true },
    ]);

    expect(added).toBe(2);
    expect(prefs.subscribersOf("raids").sort()).toEqual([1, 2]);
    // Выбор по старой теме дозаполнение не трогает.
    expect(prefs.isEnabled(2, "announce")).toBe(false);
    db.close();
  });

  test("дозаполнение не выдумывает чатов на пустой базе", () => {
    const db = memoryDb();
    const prefs = new PrefsRepo(db);

    expect(prefs.backfillDefaults([{ id: "announce", defaultOn: true }])).toBe(0);
    db.close();
  });

  test("forget убирает чат из всех тем", () => {
    const db = memoryDb();
    const prefs = new PrefsRepo(db);

    prefs.set(4, "announce", true);
    prefs.set(4, "raids", true);
    prefs.forget(4);

    expect(prefs.choicesOf(4).size).toBe(0);
    db.close();
  });
});

describe("привязки", () => {
  test("один игровой аккаунт живёт ровно в одном чате", () => {
    const db = memoryDb();
    const links = new LinksRepo(db);

    links.link(100, "uuid-1", "Steve");
    // Тот же аккаунт привязали с другого телефона: старая связь должна уйти.
    links.link(200, "uuid-1", "Steve");

    expect(links.byTelegramId(100)).toBeNull();
    expect(links.byTelegramId(200)?.nick).toBe("Steve");
    expect(links.count()).toBe(1);
    db.close();
  });

  test("один чат живёт ровно с одним аккаунтом", () => {
    const db = memoryDb();
    const links = new LinksRepo(db);

    links.link(100, "uuid-1", "Steve");
    links.link(100, "uuid-2", "Alex");

    expect(links.byTelegramId(100)?.uuid).toBe("uuid-2");
    expect(links.byUuid("uuid-1")).toBeNull();
    expect(links.count()).toBe(1);
    db.close();
  });

  test("смена ника не рвёт привязку", () => {
    const db = memoryDb();
    const links = new LinksRepo(db);

    links.link(100, "uuid-1", "Steve");
    links.renameNick("uuid-1", "Steve2");

    expect(links.byTelegramId(100)?.nick).toBe("Steve2");
    db.close();
  });

  test("отвязка сообщает, было ли что отвязывать", () => {
    const db = memoryDb();
    const links = new LinksRepo(db);

    links.link(100, "uuid-1", "Steve");
    expect(links.unlink(100)).toBe(true);
    expect(links.unlink(100)).toBe(false);
    db.close();
  });
});

describe("журнал пушей", () => {
  test("не отдаёт один ключ дважды", () => {
    const db = memoryDb();
    const log = new PushLogRepo(db);

    expect(log.claim(1, "rank:2026-09-06")).toBe(true);
    expect(log.claim(1, "rank:2026-09-06")).toBe(false);
    // Другому чату тот же ключ можно.
    expect(log.claim(2, "rank:2026-09-06")).toBe(true);
    db.close();
  });

  test("release возвращает право на повтор", () => {
    const db = memoryDb();
    const log = new PushLogRepo(db);

    log.claim(1, "raid:42");
    log.release(1, "raid:42");
    expect(log.claim(1, "raid:42")).toBe(true);
    db.close();
  });

  test("prune выбрасывает старое и оставляет свежее", () => {
    const db = memoryDb();
    const log = new PushLogRepo(db);

    log.claim(1, "старый");
    db.run("UPDATE push_log SET sent_at = 0 WHERE dedupe_key = 'старый'");
    log.claim(1, "свежий");

    expect(log.prune(1000)).toBe(1);
    expect(log.claim(1, "свежий")).toBe(false);
    db.close();
  });
});
