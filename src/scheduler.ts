import { questStreakJob, rankExpiryJob, type JobDeps } from "./push/jobs";
import { weeklyDigestJob, type DigestDeps } from "./push/digest";

/** Во сколько по московскому времени напоминать про стрик. */
const STREAK_HOUR = 20;
/** Во сколько проверять сроки привилегий. */
const EXPIRY_HOUR = 12;
/** Когда подводить итоги недели. Понедельник, чтобы неделя была уже закрыта. */
const DIGEST_HOUR = 13;
const DIGEST_WEEKDAY = 1;

/** Часовой пояс сервера и игроков. Считать по UTC значит будить людей ночью. */
const TIMEZONE = "Europe/Moscow";

/** weekday в формате Date.getDay(): 0 воскресенье, 1 понедельник. */
type Job = { name: string; hour: number; weekday?: number; run: () => Promise<number> };

/**
 * Ежедневные задачи.
 *
 * Проверяем раз в минуту и запускаем задачу, когда наступил её час. Такой
 * способ переживает перезапуск бота в любой момент суток и не требует хранить
 * расписание: от повторного запуска в тот же час защищает журнал пушей,
 * ключи в нём содержат дату.
 */
export class Scheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRun = new Map<string, string>();
  private readonly jobs: Job[];

  constructor(deps: JobDeps, digestDeps: DigestDeps, serverTitles: Map<string, string>) {
    this.jobs = [
      { name: "quest-streak", hour: STREAK_HOUR, run: () => questStreakJob(deps) },
      { name: "rank-expiry", hour: EXPIRY_HOUR, run: () => rankExpiryJob(deps, serverTitles) },
      {
        name: "weekly-digest",
        hour: DIGEST_HOUR,
        weekday: DIGEST_WEEKDAY,
        run: () => weeklyDigestJob(digestDeps),
      },
    ];
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), 60_000);
    console.log("[scheduler] запущен");
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Запустить задачу руками, минуя расписание. Нужно для проверки на месте. */
  async runNow(name: string): Promise<number> {
    const job = this.jobs.find((j) => j.name === name);
    if (!job) throw new Error(`Нет задачи ${name}`);
    return job.run();
  }

  private async tick(): Promise<void> {
    const now = localParts();

    for (const job of this.jobs) {
      if (now.hour !== job.hour) continue;
      if (job.weekday !== undefined && now.weekday !== job.weekday) continue;
      if (this.lastRun.get(job.name) === now.date) continue;

      this.lastRun.set(job.name, now.date);
      try {
        const sent = await job.run();
        console.log(`[scheduler] ${job.name}: отправлено ${sent}`);
      } catch (err) {
        console.error(`[scheduler] ${job.name} упала:`, err);
      }
    }
  }
}

function localParts(): { date: string; hour: number; weekday: number } {
  // hourCycle: "h23" задан явно. С одним лишь hour12: false часть сборок ICU
  // отдаёт полночь как "24", и задача, назначенная на 0 часов, не запускается
  // никогда.
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  // День недели считаем по той же дате, что и всё остальное: иначе в полночь
  // по Москве задача уехала бы на сутки в сторону.
  const local = new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00Z`);

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    weekday: local.getUTCDay(),
  };
}
