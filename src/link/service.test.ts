import { describe, expect, test } from "bun:test";
import { tokenFromStartPayload, redeemToken } from "./service";
import type { BridgeServer, QueryOutcome } from "../bridge/server";

describe("tokenFromStartPayload", () => {
  test("достаёт токен из ссылки привязки", () => {
    expect(tokenFromStartPayload("L-abc123")).toBe("abc123");
  });

  test("игнорирует чужие полезные нагрузки", () => {
    expect(tokenFromStartPayload("R-referral")).toBeNull();
    expect(tokenFromStartPayload("")).toBeNull();
    expect(tokenFromStartPayload(undefined)).toBeNull();
  });

  test("не принимает пустой и слишком длинный токен", () => {
    expect(tokenFromStartPayload("L-")).toBeNull();
    expect(tokenFromStartPayload(`L-${"x".repeat(65)}`)).toBeNull();
  });
});

/** Мост, отвечающий заранее заданным набором ответов по имени сервера. */
function fakeBridge(answers: Record<string, QueryOutcome>): BridgeServer {
  return {
    query: async (server: string) =>
      answers[server] ?? { ok: false, error: "Сервер сейчас недоступен" },
  } as unknown as BridgeServer;
}

describe("redeemToken", () => {
  test("берёт ответ того сервера, где код нашёлся", async () => {
    const bridge = fakeBridge({
      grief: { ok: false, error: "Код неверный или уже просрочен" },
      vanilla: { ok: true, payload: { uuid: "u-1", nick: "Steve" } },
    });

    const result = await redeemToken(bridge, ["grief", "vanilla"], "abc");
    expect(result).toEqual({ ok: true, uuid: "u-1", nick: "Steve", server: "vanilla" });
  });

  test("отказ сервера означает неверный код", async () => {
    const bridge = fakeBridge({
      grief: { ok: false, error: "Код неверный или уже просрочен" },
    });

    const result = await redeemToken(bridge, ["grief"], "abc");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("Код неверный");
  });

  test("молчание всех серверов это не неверный код, а обрыв связи", async () => {
    const bridge = fakeBridge({
      grief: { ok: false, error: "Сервер не ответил вовремя" },
      vanilla: { ok: false, error: "Нет связи с прокси" },
    });

    const result = await redeemToken(bridge, ["grief", "vanilla"], "abc");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("недоступен");
  });

  test("ответ без ника или uuid не считается успехом", async () => {
    const bridge = fakeBridge({
      grief: { ok: true, payload: { uuid: "u-1" } },
    });

    const result = await redeemToken(bridge, ["grief"], "abc");
    expect(result.ok).toBe(false);
  });
});
