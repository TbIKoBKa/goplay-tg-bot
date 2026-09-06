import { describe, expect, test } from "bun:test";
import { openDb } from "../db";
import { StatCacheRepo } from "../db/repos/stat-cache";
import { PlayersRepo } from "../db/repos/players";
import { fetchStats, resolveNick } from "./service";
import type { BridgeServer, QueryOutcome } from "../bridge/server";

type Answers = Record<string, Record<string, QueryOutcome>>;

/** Мост, отвечающий по паре «сервер + тема». */
function fakeBridge(answers: Answers): BridgeServer {
  return {
    query: async (server: string, topic: string) =>
      answers[server]?.[topic] ?? { ok: false, error: "Сервер сейчас недоступен" },
  } as unknown as BridgeServer;
}

const CARDS = {
  cards: [{ title: "Квесты", rows: [{ label: "Стрик", value: "7" }] }],
};

describe("fetchStats", () => {
  test("живой ответ сохраняется в кеш", async () => {
    const db = openDb(":memory:");
    const cache = new StatCacheRepo(db);
    const bridge = fakeBridge({ grief: { stats: { ok: true, payload: CARDS } } });

    const view = await fetchStats(bridge, cache, "grief", "u-1", "owner");
    expect(view.kind).toBe("fresh");
    expect(cache.get("u-1", "grief", "owner")).not.toBeNull();
    db.close();
  });

  test("упавший сервер отдаёт сохранённый снимок", async () => {
    const db = openDb(":memory:");
    const cache = new StatCacheRepo(db);
    cache.put("u-1", "grief", "owner", CARDS);

    const view = await fetchStats(fakeBridge({}), cache, "grief", "u-1", "owner");
    expect(view.kind).toBe("stale");
    if (view.kind === "stale") expect(view.cards[0]?.title).toBe("Квесты");
    db.close();
  });

  test("без кеша упавший сервер даёт честную ошибку", async () => {
    const db = openDb(":memory:");
    const view = await fetchStats(fakeBridge({}), new StatCacheRepo(db), "grief", "u-1", "owner");
    expect(view.kind).toBe("error");
    db.close();
  });

  test("снимок владельца не подменяет публичный", async () => {
    const db = openDb(":memory:");
    const cache = new StatCacheRepo(db);
    cache.put("u-1", "grief", "owner", CARDS);

    // Публичный запрос не должен подобрать чужой снимок с закрытыми строками.
    const view = await fetchStats(fakeBridge({}), cache, "grief", "u-1", "public");
    expect(view.kind).toBe("error");
    db.close();
  });

  test("пустой набор карточек это не ошибка", async () => {
    const db = openDb(":memory:");
    const bridge = fakeBridge({ grief: { stats: { ok: true, payload: { cards: [] } } } });

    const view = await fetchStats(bridge, new StatCacheRepo(db), "grief", "u-1", "public");
    expect(view.kind).toBe("empty");
    db.close();
  });
});

describe("resolveNick", () => {
  test("своя память отвечает без похода на серверы", async () => {
    const db = openDb(":memory:");
    const players = new PlayersRepo(db);
    players.remember("u-1", "Steve");

    const found = await resolveNick(fakeBridge({}), players, ["grief"], "steve");
    expect(found).toEqual({ uuid: "u-1", nick: "Steve", server: null });
    db.close();
  });

  test("берёт первый сервер, который знает ник, и запоминает ответ", async () => {
    const db = openDb(":memory:");
    const players = new PlayersRepo(db);
    const bridge = fakeBridge({
      grief: { resolve: { ok: true, payload: { found: false } } },
      vanilla: { resolve: { ok: true, payload: { found: true, uuid: "u-2", nick: "Alex" } } },
    });

    const found = await resolveNick(bridge, players, ["grief", "vanilla"], "alex");
    expect(found).toEqual({ uuid: "u-2", nick: "Alex", server: "vanilla" });
    expect(players.byNick("ALEX")).toEqual({ uuid: "u-2", nick: "Alex" });
    db.close();
  });

  test("не ждёт лежащий режим, если ник уже нашёлся", async () => {
    const db = openDb(":memory:");
    const bridge = {
      query: async (server: string) => {
        // Гриф молчит до таймаута, ваниль отвечает сразу.
        if (server === "grief") {
          await new Promise((r) => setTimeout(r, 300));
          return { ok: false, error: "Сервер не ответил вовремя" };
        }
        return { ok: true, payload: { found: true, uuid: "u-2", nick: "Alex" } };
      },
    } as unknown as BridgeServer;

    const started = Date.now();
    const found = await resolveNick(bridge, new PlayersRepo(db), ["grief", "vanilla"], "alex");

    expect(found?.nick).toBe("Alex");
    expect(Date.now() - started).toBeLessThan(200);
    db.close();
  });

  test("никто не знает ник", async () => {
    const db = openDb(":memory:");
    const bridge = fakeBridge({ grief: { resolve: { ok: true, payload: { found: false } } } });

    expect(await resolveNick(bridge, new PlayersRepo(db), ["grief"], "nobody")).toBeNull();
    db.close();
  });
});
