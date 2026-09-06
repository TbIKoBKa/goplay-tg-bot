import { describe, expect, test } from "bun:test";
import { escapeHtml, stripMinecraftColors, truncate } from "./format";

describe("escapeHtml", () => {
  test("экранирует спецсимволы", () => {
    expect(escapeHtml("<b>a & b</b>")).toBe("&lt;b&gt;a &amp; b&lt;/b&gt;");
  });
});

describe("stripMinecraftColors", () => {
  test("убирает § и & коды", () => {
    expect(stripMinecraftColors("§aИгроки: §f§lSteve")).toBe("Игроки: Steve");
    expect(stripMinecraftColors("&cОшибка")).toBe("Ошибка");
  });

  test("убирает HEX-формат", () => {
    expect(stripMinecraftColors("&x&7&C&F&C&0&0GoPlay")).toBe("GoPlay");
    expect(stripMinecraftColors("§x§7§C§F§C§0§0GoPlay")).toBe("GoPlay");
  });

  test("не трогает обычный текст с амперсандом", () => {
    expect(stripMinecraftColors("Steve & Alex")).toBe("Steve & Alex");
  });
});

describe("truncate", () => {
  test("не трогает короткое", () => {
    expect(truncate("abc", 10)).toBe("abc");
  });

  test("обрезает длинное", () => {
    expect(truncate("abcdefgh", 5)).toBe("abcd…");
    expect(truncate("abcdefgh", 5).length).toBe(5);
  });
});
