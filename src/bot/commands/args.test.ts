import { describe, expect, test } from "bun:test";
import type { Context } from "grammy";
import { parseCommand, type ArgDef } from "./args";

const SERVERS = new Set(["grief", "anarchy", "velocity", "all"]);

/** Минимальная заглушка контекста: parseCommand читает только match и отвечает через reply. */
function fakeCtx(match: string) {
  const replies: string[] = [];
  const ctx = {
    match,
    message: { message_id: 1 },
    reply: async (text: string) => {
      replies.push(text);
      return undefined;
    },
  } as unknown as Context;
  return { ctx, replies };
}

async function run(match: string, defs: readonly ArgDef[]) {
  const { ctx, replies } = fakeCtx(match);
  const parsed = await parseCommand(ctx, "usage", defs, SERVERS);
  return { parsed, reply: replies[0] };
}

describe("parseCommand", () => {
  test("разбирает ник, сервер и причину", async () => {
    const { parsed } = await run("Steve grief читерил в PvP", [
      { kind: "nick" },
      { kind: "server" },
      { kind: "rest", fallback: "по умолчанию" },
    ]);
    expect(parsed).toEqual(["Steve", "grief", "читерил в PvP"]);
  });

  test("подставляет fallback для пустого rest", async () => {
    const { parsed } = await run("Steve grief", [
      { kind: "nick" },
      { kind: "server" },
      { kind: "rest", fallback: "по умолчанию" },
    ]);
    expect(parsed).toEqual(["Steve", "grief", "по умолчанию"]);
  });

  test("не хватает аргументов — показывает использование", async () => {
    const { parsed, reply } = await run("Steve", [{ kind: "nick" }, { kind: "server" }]);
    expect(parsed).toBeNull();
    expect(reply).toContain("Использование");
  });

  test("отклоняет неизвестный сервер и перечисляет доступные", async () => {
    const { parsed, reply } = await run("Steve lobby", [{ kind: "nick" }, { kind: "server" }]);
    expect(parsed).toBeNull();
    expect(reply).toContain("grief");
  });

  test("сервер нормализуется в нижний регистр", async () => {
    const { parsed } = await run("Steve GRIEF", [{ kind: "nick" }, { kind: "server" }]);
    expect(parsed).toEqual(["Steve", "grief"]);
  });

  test("отклоняет ник с посторонними символами", async () => {
    const { parsed, reply } = await run("Steve;stop grief", [
      { kind: "nick" },
      { kind: "server" },
    ]);
    expect(parsed).toBeNull();
    expect(reply).toContain("ник");
  });

  test("отклоняет слишком длинный ник", async () => {
    const { parsed } = await run("SteveSteveSteveSteve grief", [
      { kind: "nick" },
      { kind: "server" },
    ]);
    expect(parsed).toBeNull();
  });

  test("пропускает Bedrock-ник с точкой", async () => {
    const { parsed } = await run(".Steve grief", [{ kind: "nick" }, { kind: "server" }]);
    expect(parsed).toEqual([".Steve", "grief"]);
  });

  const muteDefs: readonly ArgDef[] = [
    { kind: "nick" },
    { kind: "server" },
    { kind: "duration", optional: true },
    { kind: "rest", fallback: "Muted via Telegram" },
  ];

  test("необязательное время распознаётся", async () => {
    const { parsed } = await run("Steve grief 30m мат в чате", muteDefs);
    expect(parsed).toEqual(["Steve", "grief", "30m", "мат в чате"]);
  });

  test("слово, не похожее на время, уходит в причину", async () => {
    const { parsed } = await run("Steve grief мат в чате", muteDefs);
    expect(parsed).toEqual(["Steve", "grief", "", "мат в чате"]);
  });

  test("обязательное время без значения — ошибка", async () => {
    const { parsed, reply } = await run("Steve grief навсегда", [
      { kind: "nick" },
      { kind: "server" },
      { kind: "duration" },
    ]);
    expect(parsed).toBeNull();
    expect(reply).toContain("время");
  });

  test("oneOf ограничивает значения и нормализует регистр", async () => {
    expect((await run("ON", [{ kind: "word", oneOf: ["on", "off"] }])).parsed).toEqual(["on"]);
    const bad = await run("maybe", [{ kind: "word", oneOf: ["on", "off"] }]);
    expect(bad.parsed).toBeNull();
    expect(bad.reply).toContain("on, off");
  });

  test("координаты должны быть числами", async () => {
    const defs: readonly ArgDef[] = [
      { kind: "nick" },
      { kind: "number" },
      { kind: "number" },
      { kind: "number" },
      { kind: "server" },
    ];
    expect((await run("Steve 10 64 -20 grief", defs)).parsed).toEqual([
      "Steve", "10", "64", "-20", "grief",
    ]);
    expect((await run("Steve ~ ~10 ~-5 grief", defs)).parsed).toEqual([
      "Steve", "~", "~10", "~-5", "grief",
    ]);
    expect((await run("Steve x 64 -20 grief", defs)).parsed).toBeNull();
  });

  test("пустой ввод даёт подсказку", async () => {
    const { parsed, reply } = await run("", [{ kind: "server" }]);
    expect(parsed).toBeNull();
    expect(reply).toContain("Использование");
  });
});
