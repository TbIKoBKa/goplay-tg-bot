import { describe, expect, test } from "bun:test";
import { RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  test("пропускает до лимита и блокирует дальше", () => {
    const rl = new RateLimiter(2, 60_000);
    expect(rl.try("a")).toBe(true);
    expect(rl.try("a")).toBe(true);
    expect(rl.try("a")).toBe(false);
  });

  test("ключи независимы", () => {
    const rl = new RateLimiter(1, 60_000);
    expect(rl.try("a")).toBe(true);
    expect(rl.try("b")).toBe(true);
    expect(rl.try("a")).toBe(false);
  });

  test("окно освобождается со временем", async () => {
    const rl = new RateLimiter(1, 200);
    expect(rl.try("a")).toBe(true);
    expect(rl.try("a")).toBe(false);
    await Bun.sleep(250);
    expect(rl.try("a")).toBe(true);
  });

  test("reset снимает лимит", () => {
    const rl = new RateLimiter(1, 60_000);
    rl.try("a");
    expect(rl.try("a")).toBe(false);
    rl.reset("a");
    expect(rl.try("a")).toBe(true);
  });

  test("retryAfterMs равен нулю, пока лимит не исчерпан", () => {
    const rl = new RateLimiter(2, 60_000);
    rl.try("a");
    expect(rl.retryAfterMs("a")).toBe(0);
    rl.try("a");
    expect(rl.retryAfterMs("a")).toBeGreaterThan(0);
  });

  test("заблокированная попытка не продлевает окно", async () => {
    const rl = new RateLimiter(1, 400);
    expect(rl.try("a")).toBe(true);
    await Bun.sleep(50);
    expect(rl.try("a")).toBe(false);
    // Отсчёт идёт от первой попытки (t≈0), а не от отклонённой (t≈50).
    await Bun.sleep(450);
    expect(rl.try("a")).toBe(true);
  });
});
