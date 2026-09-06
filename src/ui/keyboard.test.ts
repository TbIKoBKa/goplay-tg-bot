import { describe, expect, test } from "bun:test";
import { InlineKeyboard, backRow, cb, parseCb } from "./keyboard";

describe("cb", () => {
  test("собирает и разбирает обратно", () => {
    expect(parseCb(cb("notif", "t", "announce"))).toEqual({
      menu: "notif",
      action: "t",
      arg: "announce",
    });
  });

  test("действие по умолчанию open", () => {
    expect(parseCb(cb("main"))).toEqual({ menu: "main", action: "open", arg: "" });
  });

  test("падает, если не влезает в лимит Telegram", () => {
    expect(() => cb("menu", "action", "x".repeat(64))).toThrow(/лимит 64/);
  });
});

describe("parseCb", () => {
  test("не принимает чужую версию схемы", () => {
    expect(parseCb("v0:main:open:")).toBeNull();
  });

  test("не принимает мусор", () => {
    expect(parseCb("main")).toBeNull();
    expect(parseCb("")).toBeNull();
  });

  test("не теряет двоеточия внутри аргумента", () => {
    expect(parseCb("v1:stats:open:grief:pvp")?.arg).toBe("grief:pvp");
  });
});

describe("backRow", () => {
  test("не оставляет пустых рядов на чистой клавиатуре", () => {
    const rows = backRow(new InlineKeyboard()).inline_keyboard;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(1);
  });

  test("уводит кнопку на отдельный ряд, если кнопки уже есть", () => {
    const rows = backRow(new InlineKeyboard().text("a", cb("main"))).inline_keyboard;
    expect(rows).toHaveLength(2);
    expect(rows[1]?.[0]?.text).toBe("‹ Назад");
  });
});
