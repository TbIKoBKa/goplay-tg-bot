/**
 * Скользящее окно: не больше `limit` попыток за `windowMs` на ключ.
 * Хранится в памяти — этого достаточно, бот однопроцессный.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /**
   * Регистрирует попытку. Возвращает true, если она разрешена,
   * и false, если лимит исчерпан (попытка при этом НЕ засчитывается).
   */
  try(key: string): boolean {
    const now = Date.now();
    this.sweep(now);

    const fresh = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (fresh.length >= this.limit) {
      this.hits.set(key, fresh);
      return false;
    }
    fresh.push(now);
    this.hits.set(key, fresh);
    return true;
  }

  /** Сколько миллисекунд ждать до следующей разрешённой попытки. */
  retryAfterMs(key: string): number {
    const now = Date.now();
    const fresh = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (fresh.length < this.limit) return 0;
    const oldest = fresh[0]!;
    return Math.max(0, this.windowMs - (now - oldest));
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  /** Периодически выбрасывает протухшие ключи, чтобы карта не росла вечно. */
  private sweep(now: number): void {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key);
    }
  }
}
