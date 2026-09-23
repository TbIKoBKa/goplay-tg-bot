import { describe, expect, test } from "bun:test";
import { renderEvent } from "./render";
import { topicOfEvent } from "./topics";

describe("renderEvent", () => {
  test("чистит цветовые коды и экранирует разметку", () => {
    const out = renderEvent("airdrop", { text: "&aАмбар <b>тут</b>" });
    expect(out?.text).toContain("Амбар");
    expect(out?.text).not.toContain("&a");
    expect(out?.text).toContain("&lt;b&gt;");
  });

  test("личное сообщение о рейде несёт точные координаты", () => {
    const out = renderEvent("claims.raid", {
      owner: "u-1",
      claim: "c-1",
      percent: 80,
      attacker: "Steve",
      x: 100,
      y: 64,
      z: -200,
    });
    expect(out?.text).toContain("Steve");
    expect(out?.text).toContain("80%");
    expect(out?.dedupeKey).toContain("raid:c-1");
  });

  test("порог щита попадает в ключ дедупликации", () => {
    const out = renderEvent("claims.shield", {
      claim: "c-1",
      threshold: 25,
      percent: 23,
      x: 1,
      y: 2,
      z: 3,
    });
    expect(out?.text).toContain("25%");
    expect(out?.text).toContain("<code>1 2 3</code>");
    expect(out?.dedupeKey).toContain("shield:c-1:25");
  });

  test("координаты не показываются, если сервер их не прислал", () => {
    const out = renderEvent("claims.shield", { claim: "c-1", threshold: 10, percent: 5 });
    expect(out?.text).not.toContain("Координаты");
  });

  test("рисует события скупщика, караванов и лаки-блоков", () => {
    for (const topic of [
      "seller.event",
      "seller.convoy",
      "seller.robbery",
      "lucky.spawn",
      "lucky.jackpot",
    ]) {
      const out = renderEvent(topic, { text: "&aтекст из игры" });
      expect(out, topic).not.toBeNull();
      expect(out?.text).toContain("текст из игры");
      expect(out?.text).not.toContain("&a");
    }
  });

  test("незнакомое событие не рисуется", () => {
    expect(renderEvent("что-то новое", {})).toBeNull();
  });
});

describe("topicOfEvent", () => {
  test("три события данжа это один тумблер", () => {
    expect(topicOfEvent("dungeon.boss")?.id).toBe("dungeon");
    expect(topicOfEvent("dungeon.drop")?.id).toBe("dungeon");
  });

  test("новости рынка тоже сведены в одну тему", () => {
    expect(topicOfEvent("market.flash")?.id).toBe("market");
    expect(topicOfEvent("market.night")?.id).toBe("market");
  });

  test("личные события помечены как личные", () => {
    expect(topicOfEvent("claims.raid")?.scope).toBe("personal");
    expect(topicOfEvent("claims.breach")?.scope).toBe("global");
  });

  test("караван и его ограбление это один тумблер", () => {
    expect(topicOfEvent("seller.convoy")?.id).toBe("convoy");
    expect(topicOfEvent("seller.robbery")?.id).toBe("convoy");
  });

  test("цены скупщика отделены от караванов", () => {
    // Цены интересны торговцам, караван это добыча: аудитории разные.
    expect(topicOfEvent("seller.event")?.id).toBe("seller");
  });

  test("оба события лаки-блоков ведут в одну тему", () => {
    expect(topicOfEvent("lucky.spawn")?.id).toBe("lucky");
    expect(topicOfEvent("lucky.jackpot")?.id).toBe("lucky");
  });

  test("неизвестное событие не находит темы", () => {
    expect(topicOfEvent("nope")).toBeUndefined();
  });
});
