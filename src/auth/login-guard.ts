import { InlineKeyboard } from "grammy";
import { randomBytes } from "node:crypto";
import { escapeHtml } from "../bot/format";
import type { LinksRepo } from "../db/repos/links";
import type { LoginGuardRepo } from "../db/repos/login-guard";

/** Запрос прокси: LimboAuth принял пароль, пускать ли дальше. */
export type LoginCheck = {
  id: string;
  uuid: string;
  nick: string;
  ip: string;
  /** Подтверждение обязательно (персонал): без привязки и без бота не пускать. */
  required: boolean;
};

/**
 * Решение для прокси. Коды причин отказа прокси превращает в текст кика:
 * rejected, timeout, not_linked, busy, rate_limited, undeliverable.
 */
export type LoginReply = { decision: "allow" | "deny" | "pending"; reason?: string };

/** Отправка сообщения с кнопками и его правка. В тестах подменяется. */
export interface ConfirmSender {
  ask(chatId: number, text: string, keyboard: InlineKeyboard): Promise<number>;
  edit(chatId: number, messageId: number, text: string): Promise<void>;
}

export const TRUST_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const CONFIRM_TIMEOUT_MS = 60_000;
/** Больше запросов подтверждения за окно не шлём: иначе знающий пароль заспамит чат владельца. */
const MAX_PROMPTS = 5;
const PROMPT_WINDOW_MS = 10 * 60_000;

type Pending = {
  key: string;
  check: LoginCheck;
  chatId: number;
  messageId?: number;
  timer: ReturnType<typeof setTimeout>;
  reply: (r: LoginReply) => void;
};

type Deps = {
  links: LinksRepo;
  repo: LoginGuardRepo;
  sender?: ConfirmSender;
  timeoutMs?: number;
  now?: () => number;
};

/**
 * Подтверждение входа кнопкой в Telegram.
 *
 * Ожидающие подтверждения живут в памяти: после рестарта бота прокси сам
 * отпустит или отклонит вход по своему таймауту, хранить тут нечего.
 */
export class LoginGuard {
  private readonly pending = new Map<string, Pending>();
  private readonly byUuid = new Map<string, string>();
  private readonly prompts = new Map<string, number[]>();

  constructor(private readonly deps: Deps) {}

  get repo(): LoginGuardRepo {
    return this.deps.repo;
  }

  setSender(sender: ConfirmSender): void {
    this.deps.sender = sender;
  }

  private now(): number {
    return this.deps.now ? this.deps.now() : Date.now();
  }

  async handle(check: LoginCheck, reply: (r: LoginReply) => void): Promise<void> {
    const { links, repo } = this.deps;

    if (!check.required && !repo.isEnabled(check.uuid)) {
      reply({ decision: "allow" });
      return;
    }

    const link = links.byUuid(check.uuid);
    if (!link) {
      // Обычный игрок включил подтверждение, а потом отвязал Telegram: подтверждать некуда,
      // значит, он сам от него отказался. Персоналу без привязки вход закрыт.
      reply(check.required ? { decision: "deny", reason: "not_linked" } : { decision: "allow" });
      return;
    }

    if (repo.isTrusted(check.uuid, check.ip, this.now())) {
      reply({ decision: "allow" });
      return;
    }

    if (this.byUuid.has(check.uuid)) {
      reply({ decision: "deny", reason: "busy" });
      return;
    }

    if (!this.takePrompt(check.uuid)) {
      reply({ decision: "deny", reason: "rate_limited" });
      return;
    }

    const sender = this.deps.sender;
    if (!sender) {
      reply(check.required ? { decision: "deny", reason: "undeliverable" } : { decision: "allow" });
      return;
    }

    const key = randomBytes(9).toString("base64url");
    const timer = setTimeout(() => void this.expire(key), this.deps.timeoutMs ?? CONFIRM_TIMEOUT_MS);
    const entry: Pending = { key, check, chatId: link.telegramId, timer, reply };
    this.pending.set(key, entry);
    this.byUuid.set(check.uuid, key);

    const keyboard = new InlineKeyboard()
      .text("✅ Подтвердить", `v1:auth:ok:${key}`)
      .text("⛔ Это не я", `v1:auth:no:${key}`);

    // «Ждём» уходит сразу, до отправки в Telegram: прокси даёт боту на первый ответ
    // всего несколько секунд, а медленный Telegram не должен считаться упавшим ботом.
    reply({ decision: "pending" });

    try {
      entry.messageId = await sender.ask(link.telegramId, askText(check), keyboard);
    } catch (err) {
      // Бот заблокирован или чат удалён: подтвердить нельзя. Для игрока это как недоступный бот.
      console.error(`[login] не смог отправить подтверждение ${check.nick}:`, err);
      if (!this.pending.has(key)) return;
      this.drop(key);
      reply(check.required ? { decision: "deny", reason: "undeliverable" } : { decision: "allow" });
    }
  }

  /** Нажатие кнопки. Возвращает текст всплывашки для нажавшего. */
  async resolve(chatId: number, key: string, ok: boolean): Promise<string> {
    const entry = this.pending.get(key);
    if (!entry) return "Запрос уже не действует";
    if (entry.chatId !== chatId) return "Это не твой запрос";

    this.drop(key);
    const { check } = entry;

    if (ok) {
      this.deps.repo.trust(check.uuid, check.ip, this.now() + TRUST_DAYS * DAY_MS);
      entry.reply({ decision: "allow" });
      await this.edit(entry, confirmedText(check));
      return "Вход подтверждён";
    }

    entry.reply({ decision: "deny", reason: "rejected" });
    await this.edit(entry, rejectedText(check));
    return "Вход отклонён";
  }

  private async expire(key: string): Promise<void> {
    const entry = this.pending.get(key);
    if (!entry) return;
    this.drop(key);
    entry.reply({ decision: "deny", reason: "timeout" });
    await this.edit(entry, expiredText(entry.check));
  }

  private drop(key: string): void {
    const entry = this.pending.get(key);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(key);
    if (this.byUuid.get(entry.check.uuid) === key) this.byUuid.delete(entry.check.uuid);
  }

  private async edit(entry: Pending, text: string): Promise<void> {
    if (entry.messageId === undefined || !this.deps.sender) return;
    try {
      await this.deps.sender.edit(entry.chatId, entry.messageId, text);
    } catch (err) {
      console.error("[login] не смог обновить сообщение подтверждения:", err);
    }
  }

  /** Скользящее окно запросов на аккаунт. true - можно слать ещё один. */
  private takePrompt(uuid: string): boolean {
    const now = this.now();
    const recent = (this.prompts.get(uuid) ?? []).filter((t) => now - t < PROMPT_WINDOW_MS);
    if (recent.length >= MAX_PROMPTS) {
      this.prompts.set(uuid, recent);
      return false;
    }
    recent.push(now);
    this.prompts.set(uuid, recent);
    return true;
  }

  /** Сколько сейчас ждут подтверждения. Для тестов и отладки. */
  get pendingCount(): number {
    return this.pending.size;
  }
}

function header(check: LoginCheck): string[] {
  return [`Аккаунт: <b>${escapeHtml(check.nick)}</b>`, `IP: <code>${escapeHtml(check.ip)}</code>`];
}

function askText(check: LoginCheck): string {
  return [
    "🔐 <b>Вход на GoPlay</b>",
    "",
    ...header(check),
    "",
    "Если это ты, нажми «Подтвердить».",
    "Если нет, нажми «Это не я» и смени пароль в игре: <code>/changepassword</code>.",
    "",
    "Запрос действует 60 секунд.",
  ].join("\n");
}

function confirmedText(check: LoginCheck): string {
  return [
    "✅ <b>Вход подтверждён</b>",
    "",
    ...header(check),
    "",
    `С этого IP ${TRUST_DAYS} дней подтверждать не нужно.`,
  ].join("\n");
}

function rejectedText(check: LoginCheck): string {
  return [
    "⛔ <b>Вход отклонён</b>",
    "",
    ...header(check),
    "",
    "Если это был не ты, смени пароль в игре: <code>/changepassword</code>.",
  ].join("\n");
}

function expiredText(check: LoginCheck): string {
  return ["⌛ <b>Запрос на вход истёк</b>", "", ...header(check), "", "Вход не выполнен."].join("\n");
}
