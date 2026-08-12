import { describe, expect, test } from "bun:test";
import { escapeHtml, markdownToHtml, stripMinecraftColors, truncate } from "./format";

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

describe("markdownToHtml", () => {
  test("переводит базовую разметку", () => {
    expect(markdownToHtml("**жирный** и *курсив*")).toBe("<b>жирный</b> и <i>курсив</i>");
    expect(markdownToHtml("~~нет~~")).toBe("<s>нет</s>");
  });

  test("экранирует HTML вне разметки", () => {
    expect(markdownToHtml("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
  });

  test("не применяет разметку внутри кода", () => {
    expect(markdownToHtml("`**не жирный**`")).toBe("<code>**не жирный**</code>");
  });

  test("экранирует содержимое блока кода", () => {
    expect(markdownToHtml("```yml\nkey: <v> & x\n```")).toBe(
      "<pre><code>key: &lt;v&gt; &amp; x</code></pre>",
    );
  });

  test("не ломается на подчёркиваниях внутри слов", () => {
    expect(markdownToHtml("goplay_promo_reward")).toBe("goplay_promo_reward");
  });

  test("цифры в тексте не подменяются плейсхолдерами кода", () => {
    expect(markdownToHtml("у меня `x` и 0 яблок")).toBe("у меня <code>x</code> и 0 яблок");
  });
});
