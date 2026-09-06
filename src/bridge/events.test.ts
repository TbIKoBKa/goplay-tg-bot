import { describe, expect, test } from "bun:test";
import { openDb } from "../db";
import { LinksRepo } from "../db/repos/links";
import { PrefsRepo } from "../db/repos/prefs";
import { handleBridgeEvent } from "./events";
import { TOPICS } from "../push/topics";
import type { PushQueue } from "../push/queue";
import type { BridgeEvent } from "./protocol";

type Sent = { chatId: number; text: string; dedupeKey?: string };

/** Очередь-заглушка: запоминает, что и кому пытались отправить. */
function fakeQueue(): { queue: PushQueue; sent: Sent[]; broadcasts: string[] } {
  const sent: Sent[] = [];
  const broadcasts: string[] = [];
  const queue = {
    enqueue: (msg: Sent) => {
      sent.push(msg);
      return true;
    },
    broadcast: (topic: string) => {
      broadcasts.push(topic);
      return 1;
    },
  } as unknown as PushQueue;
  return { queue, sent, broadcasts };
}

function event(topic: string, payload: Record<string, unknown>): BridgeEvent {
  return { type: "event", server: "grief", topic, payload };
}

describe("handleBridgeEvent", () => {
  test("общее событие уходит в рассылку по теме", () => {
    const db = openDb(":memory:");
    const { queue, broadcasts } = fakeQueue();

    handleBridgeEvent(
      { push: queue, links: new LinksRepo(db), prefs: new PrefsRepo(db) },
      event("market.flash", { text: "Скидки" }),
    );

    expect(broadcasts).toEqual(["market"]);
    db.close();
  });

  test("личное событие доходит до владельца привата", () => {
    const db = openDb(":memory:");
    const links = new LinksRepo(db);
    const prefs = new PrefsRepo(db);
    links.link(555, "u-1", "Steve");
    prefs.ensureDefaults(555, TOPICS);

    const { queue, sent } = fakeQueue();
    handleBridgeEvent(
      { push: queue, links, prefs },
      event("claims.raid", { owner: "u-1", claim: "c-1", percent: 70 }),
    );

    expect(sent).toHaveLength(1);
    expect(sent[0]?.chatId).toBe(555);
    db.close();
  });

  test("непривязанный владелец не получает ничего", () => {
    const db = openDb(":memory:");
    const { queue, sent, broadcasts } = fakeQueue();

    handleBridgeEvent(
      { push: queue, links: new LinksRepo(db), prefs: new PrefsRepo(db) },
      event("claims.raid", { owner: "u-нет", claim: "c-1" }),
    );

    expect(sent).toHaveLength(0);
    expect(broadcasts).toHaveLength(0);
    db.close();
  });

  test("выключенная тема молчит даже для личного события", () => {
    const db = openDb(":memory:");
    const links = new LinksRepo(db);
    const prefs = new PrefsRepo(db);
    links.link(555, "u-1", "Steve");
    prefs.set(555, "claims.raid", false);

    const { queue, sent } = fakeQueue();
    handleBridgeEvent(
      { push: queue, links, prefs },
      event("claims.raid", { owner: "u-1", claim: "c-1" }),
    );

    expect(sent).toHaveLength(0);
    db.close();
  });

  test("событие без известной темы игнорируется", () => {
    const db = openDb(":memory:");
    const { queue, sent, broadcasts } = fakeQueue();

    handleBridgeEvent(
      { push: queue, links: new LinksRepo(db), prefs: new PrefsRepo(db) },
      event("совсем новое", {}),
    );

    expect(sent).toHaveLength(0);
    expect(broadcasts).toHaveLength(0);
    db.close();
  });
});
