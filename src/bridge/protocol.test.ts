import { describe, expect, test } from "bun:test";
import { parseBridgeMessage } from "./protocol";

describe("parseBridgeMessage", () => {
  test("разбирает консольную команду, которой пользуется сайт", () => {
    const msg = parseBridgeMessage(
      JSON.stringify({ type: "request", id: "1", server: "grief", command: "list" }),
    );
    expect(msg).toEqual({ type: "request", id: "1", server: "grief", command: "list" });
  });

  test("роль по умолчанию у auth это bridge", () => {
    const msg = parseBridgeMessage(JSON.stringify({ type: "auth", secret: "s" }));
    expect(msg).toMatchObject({ type: "auth", role: "bridge" });
  });

  test("разбирает ответ на запрос данных", () => {
    const msg = parseBridgeMessage(
      JSON.stringify({ type: "queryResult", id: "7", success: true, payload: { nick: "Steve" } }),
    );
    expect(msg).toMatchObject({ type: "queryResult", success: true, payload: { nick: "Steve" } });
  });

  test("подставляет пустые значения в необязательные поля queryResult", () => {
    const msg = parseBridgeMessage(JSON.stringify({ type: "queryResult", id: "8", success: false }));
    expect(msg).toMatchObject({ payload: {}, error: "" });
  });

  test("разбирает событие с сервера", () => {
    const msg = parseBridgeMessage(
      JSON.stringify({ type: "event", server: "grief", topic: "claims.breach", payload: {} }),
    );
    expect(msg).toMatchObject({ type: "event", server: "grief", topic: "claims.breach" });
  });

  test("незнакомый тип не ошибка: плагин может быть новее бота", () => {
    expect(parseBridgeMessage(JSON.stringify({ type: "somethingNew" }))).toEqual({
      type: "unknown",
      name: "somethingNew",
    });
  });

  test("битый JSON и кадр без типа отбрасываются", () => {
    expect(parseBridgeMessage("{не json")).toBeNull();
    expect(parseBridgeMessage(JSON.stringify({ id: "1" }))).toBeNull();
  });

  test("кадр знакомого типа с неверными полями отбрасывается", () => {
    expect(parseBridgeMessage(JSON.stringify({ type: "request", id: 5 }))).toBeNull();
  });
});
