import { describe, expect, test } from "bun:test";
import { extractToken } from "./link";

const TOKEN = "abcdefghjkmnpqrstuvwxyz2";

describe("extractToken", () => {
  test("принимает голый код из чата", () => {
    expect(extractToken(TOKEN)).toBe(TOKEN);
    expect(TOKEN.length).toBe(24);
  });

  test("не спотыкается о пробелы и регистр", () => {
    expect(extractToken(`  ${TOKEN.toUpperCase()}  `)).toBe(TOKEN);
  });

  test("принимает код вместе с префиксом из ссылки", () => {
    expect(extractToken(`L-${TOKEN}`)).toBe(TOKEN);
  });

  test("вытаскивает код из скопированной ссылки целиком", () => {
    expect(extractToken(`https://t.me/goplay_bot?start=L-${TOKEN}`)).toBe(TOKEN);
  });

  test("обычное сообщение кодом не считается", () => {
    expect(extractToken("привет")).toBeNull();
    expect(extractToken("TbIKo8Ka")).toBeNull();
    // Ник в Minecraft не длиннее 16 символов, до кода не дотягивает.
    expect(extractToken("a".repeat(16))).toBeNull();
  });

  test("похожая на код строка с чужими символами отбрасывается", () => {
    // i, l, o, 0 и 1 из алфавита исключены, чтобы код не путали при переписывании.
    expect(extractToken("abcdefghijklmnopqrstuvwx")).toBeNull();
    expect(extractToken("abcdefghjkmnpqrstuvwxy!")).toBeNull();
  });
});
