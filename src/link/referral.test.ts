import { describe, expect, test } from "bun:test";
import { openDb } from "../db";
import { RefsRepo } from "../db/repos/refs";
import { applyPendingReferral, bindReferral } from "./referral";
import { referrerFromStartPayload } from "../ui/menus/promo";
import type { BridgeServer, QueryOutcome } from "../bridge/server";

function fakeBridge(answers: Record<string, QueryOutcome>): BridgeServer {
  return {
    query: async (server: string) => answers[server] ?? { ok: false, error: "недоступен" },
  } as unknown as BridgeServer;
}

const OK: QueryOutcome = { ok: true, payload: { accepted: true } };

describe("referrerFromStartPayload", () => {
  test("достаёт ник из ссылки-приглашения", () => {
    expect(referrerFromStartPayload("R-Steve")).toBe("Steve");
  });

  test("не путает с ссылкой привязки", () => {
    expect(referrerFromStartPayload("L-token")).toBeNull();
  });

  test("отбрасывает ник с недопустимыми символами", () => {
    expect(referrerFromStartPayload("R-.Bedrock")).toBeNull();
    expect(referrerFromStartPayload("R-")).toBeNull();
  });
});

describe("bindReferral", () => {
  test("уходит ровно на один сервер", async () => {
    const asked: string[] = [];
    const bridge = {
      query: async (server: string) => {
        asked.push(server);
        return OK;
      },
    } as unknown as BridgeServer;

    expect(await bindReferral(bridge, "grief", "u-1", "Steve")).toBe(true);
    // Рассылка всем режимам оплатила бы один приход друга трижды.
    expect(asked).toEqual(["grief"]);
  });

  test("молчание сервера это неудача", async () => {
    expect(await bindReferral(fakeBridge({}), "grief", "u-1", "Steve")).toBe(false);
  });
});

describe("applyPendingReferral", () => {
  test("забирает отложенное приглашение и отдаёт серверу", async () => {
    const db = openDb(":memory:");
    const refs = new RefsRepo(db);
    refs.remember(555, "Steve");

    const applied = await applyPendingReferral(
      fakeBridge({ grief: OK }),
      refs,
      555,
      "u-1",
      "Alex",
      "grief",
    );

    expect(applied).toBe("Steve");
    // Второй раз применять нечего: запись забрали.
    expect(refs.take(555)).toBeNull();
    db.close();
  });

  test("недоступные серверы не съедают приглашение", async () => {
    const db = openDb(":memory:");
    const refs = new RefsRepo(db);
    refs.remember(555, "Steve");

    // Прокси лежал в момент привязки.
    expect(
      await applyPendingReferral(fakeBridge({}), refs, 555, "u-1", "Alex", "grief"),
    ).toBeNull();
    // Запись должна остаться и сработать со следующей попытки.
    expect(refs.peek(555)?.referrer).toBe("Steve");

    expect(
      await applyPendingReferral(fakeBridge({ grief: OK }), refs, 555, "u-1", "Alex", "grief"),
    ).toBe("Steve");
    expect(refs.peek(555)).toBeNull();
    db.close();
  });

  test("себя пригласить нельзя, и запись при этом убирается", async () => {
    const db = openDb(":memory:");
    const refs = new RefsRepo(db);
    refs.remember(555, "Steve");

    const applied = await applyPendingReferral(
      fakeBridge({ grief: OK }),
      refs,
      555,
      "u-1",
      "steve",
      "grief",
    );

    expect(applied).toBeNull();
    // Держать заведомо мёртвую запись незачем: она никогда не сработает.
    expect(refs.peek(555)).toBeNull();
    db.close();
  });

  test("без отложенного приглашения ничего не происходит", async () => {
    const db = openDb(":memory:");
    const applied = await applyPendingReferral(
      fakeBridge({ grief: OK }),
      new RefsRepo(db),
      555,
      "u-1",
      "Alex",
      "grief",
    );
    expect(applied).toBeNull();
    db.close();
  });

  test("первая ссылка выигрывает у второй", () => {
    const db = openDb(":memory:");
    const refs = new RefsRepo(db);

    refs.remember(555, "Steve");
    refs.remember(555, "Notch");

    expect(refs.take(555)?.referrer).toBe("Steve");
    db.close();
  });
});
