import { describe, expect, test } from "bun:test";
import { openDb } from "../db";
import { LinksRepo } from "../db/repos/links";
import { PrefsRepo } from "../db/repos/prefs";
import { StatCacheRepo } from "../db/repos/stat-cache";
import { SnapshotsRepo } from "../db/repos/snapshots";
import { weeklyDigestJob, type DigestDeps } from "./digest";
import type { PushQueue } from "./queue";
import type { BridgeServer } from "../bridge/server";

const SERVERS = [{ id: "grief", title: "Гриф" }];

/** Карточки с сырыми значениями: именно по ним считается разница за неделю. */
function cards(money: string, kills: string) {
  return {
    cards: [
      {
        title: "Кошелёк",
        rows: [{ key: "cmi:balance", label: "Монеты", value: money, raw: money }],
      },
      {
        title: "Приваты",
        rows: [{ key: "claims:raids_won", label: "Пробил чужих", value: kills, raw: kills }],
      },
    ],
  };
}

function setup(payload: unknown) {
  const db = openDb(":memory:");
  const links = new LinksRepo(db);
  const prefs = new PrefsRepo(db);
  links.link(555, "u-1", "Steve");

  const sent: { chatId: number; text: string }[] = [];
  const push = {
    enqueue: (msg: { chatId: number; text: string }) => {
      sent.push(msg);
      return true;
    },
  } as unknown as PushQueue;

  const bridge = {
    query: async () => ({ ok: true, payload }),
  } as unknown as BridgeServer;

  const deps: DigestDeps = {
    bridge,
    links,
    prefs,
    push,
    statCache: new StatCacheRepo(db),
    snapshots: new SnapshotsRepo(db),
    servers: SERVERS,
  };

  return { db, deps, sent };
}

describe("weeklyDigestJob", () => {
  test("первый запуск только запоминает точку отсчёта", async () => {
    const { db, deps, sent } = setup(cards("1000", "2"));

    expect(await weeklyDigestJob(deps)).toBe(0);
    expect(sent).toHaveLength(0);
    expect(deps.snapshots.get("u-1", "grief")?.values["cmi:balance"]).toBe("1000");
    db.close();
  });

  test("второй запуск показывает прирост", async () => {
    const { db, deps, sent } = setup(cards("1000", "2"));
    await weeklyDigestJob(deps);

    // Неделя прошла, цифры выросли.
    deps.bridge.query = (async () => ({ ok: true, payload: cards("3500", "5") })) as never;
    expect(await weeklyDigestJob(deps)).toBe(1);

    expect(sent[0]?.text).toContain("Твоя неделя");
    expect(sent[0]?.text).toContain("Монеты");
    // Разряды отбиваются неразрывным пробелом, поэтому сверяем по шаблону.
    expect(sent[0]?.text).toMatch(/\+2\s500/);
    expect(sent[0]?.text).toContain("+3");
    db.close();
  });

  test("без изменений сообщение не уходит", async () => {
    const { db, deps, sent } = setup(cards("1000", "2"));
    await weeklyDigestJob(deps);

    expect(await weeklyDigestJob(deps)).toBe(0);
    expect(sent).toHaveLength(0);
    db.close();
  });

  test("упавшие значения не показываем: это трата, а не достижение", async () => {
    const { db, deps, sent } = setup(cards("5000", "2"));
    await weeklyDigestJob(deps);

    deps.bridge.query = (async () => ({ ok: true, payload: cards("1000", "2") })) as never;
    expect(await weeklyDigestJob(deps)).toBe(0);
    expect(sent).toHaveLength(0);
    db.close();
  });

  test("упавший сервер пропускается, а не отстаивается на каждом игроке", async () => {
    const { db, deps } = setup(cards("1000", "2"));
    deps.links.link(556, "u-2", "Alex");
    deps.links.link(557, "u-3", "Notch");

    let calls = 0;
    deps.bridge.query = (async () => {
      calls++;
      return { ok: false, error: "Сервер не ответил вовремя" };
    }) as never;

    expect(await weeklyDigestJob(deps)).toBe(0);
    // Один запрос на весь проход, а не по одному на каждого из трёх игроков.
    expect(calls).toBe(1);
    db.close();
  });

  test("выключенная тема молчит", async () => {
    const { db, deps, sent } = setup(cards("1000", "2"));
    deps.prefs.set(555, "digest.weekly", false);

    await weeklyDigestJob(deps);
    deps.bridge.query = (async () => ({ ok: true, payload: cards("9000", "9") })) as never;
    await weeklyDigestJob(deps);

    expect(sent).toHaveLength(0);
    db.close();
  });
});
