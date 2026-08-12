import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Простое файловое хранилище chat-id подписчиков на уведомления о ивентах.
 * Без БД — достаточно для рассылки анонсов.
 */
export class SubscriberStore {
  private ids = new Set<number>();

  constructor(private readonly file: string) {
    this.load();
  }

  private load(): void {
    if (!existsSync(this.file)) return;
    try {
      const data = JSON.parse(readFileSync(this.file, "utf-8"));
      if (Array.isArray(data)) {
        for (const x of data) if (typeof x === "number") this.ids.add(x);
      }
    } catch (err) {
      console.error("[subs] failed to load:", err);
    }
  }

  /** Пишем во временный файл и переименовываем: краш при записи не оставит битый JSON. */
  private save(): void {
    const tmp = `${this.file}.tmp`;
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      writeFileSync(tmp, JSON.stringify([...this.ids]));
      renameSync(tmp, this.file);
    } catch (err) {
      console.error("[subs] failed to save:", err);
    }
  }

  add(id: number): boolean {
    const isNew = !this.ids.has(id);
    if (isNew) {
      this.ids.add(id);
      this.save();
    }
    return isNew;
  }

  remove(id: number): boolean {
    const existed = this.ids.delete(id);
    if (existed) this.save();
    return existed;
  }

  has(id: number): boolean {
    return this.ids.has(id);
  }

  all(): number[] {
    return [...this.ids];
  }

  get size(): number {
    return this.ids.size;
  }
}
