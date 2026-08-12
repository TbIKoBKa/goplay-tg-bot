import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SubscriberStore } from "./subscribers";

const dirs: string[] = [];

function tempFile(name = "subscribers.json"): string {
  const dir = mkdtempSync(join(tmpdir(), "goplay-subs-"));
  dirs.push(dir);
  return join(dir, name);
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("SubscriberStore", () => {
  test("add/remove возвращают, было ли изменение", () => {
    const store = new SubscriberStore(tempFile());
    expect(store.add(1)).toBe(true);
    expect(store.add(1)).toBe(false);
    expect(store.remove(1)).toBe(true);
    expect(store.remove(1)).toBe(false);
  });

  test("состояние переживает перезапуск", () => {
    const file = tempFile();
    const first = new SubscriberStore(file);
    first.add(10);
    first.add(20);

    const second = new SubscriberStore(file);
    expect(second.all().sort()).toEqual([10, 20]);
    expect(second.size).toBe(2);
    expect(second.has(10)).toBe(true);
  });

  test("создаёт недостающую директорию", () => {
    const file = join(tempFile(), "nested", "subs.json");
    const store = new SubscriberStore(file);
    store.add(5);
    expect(existsSync(file)).toBe(true);
  });

  test("битый файл не роняет бот", () => {
    const file = tempFile();
    writeFileSync(file, "{ это не json");
    const store = new SubscriberStore(file);
    expect(store.size).toBe(0);
    expect(store.add(1)).toBe(true);
  });

  test("игнорирует нечисловые записи", () => {
    const file = tempFile();
    writeFileSync(file, JSON.stringify([1, "два", null, 3]));
    expect(new SubscriberStore(file).all().sort()).toEqual([1, 3]);
  });
});
