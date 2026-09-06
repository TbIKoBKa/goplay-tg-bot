import type { Bot } from "grammy";
import type { PrefsRepo } from "../db/repos/prefs";
import type { PushLogRepo } from "../db/repos/push-log";
import { TELEGRAM_MAX_MESSAGE } from "../bot/format";
import { deliver } from "./send";
import { findTopic } from "./topics";

/** Общий потолок отправки. Telegram душит рассылку примерно после 30 в секунду. */
const GLOBAL_INTERVAL_MS = 40;
/** Минимальная пауза между сообщениями в один чат. */
const CHAT_MIN_INTERVAL_MS = 1100;
/** Сколько ждём перед отправкой, чтобы успеть склеить соседние события. */
const COALESCE_MS = 1500;
/** Если чат получил больше BURST_LIMIT сообщений за это окно, склеиваем агрессивнее. */
const BURST_WINDOW_MS = 60_000;
const BURST_LIMIT = 3;
const BURST_COALESCE_MS = 30_000;

const SEPARATOR = "\n\n";

/** Дальше этой паузы чат для темпа отправки неинтересен: его состояние протухло. */
const IDLE_CHAT_TTL_MS = 60 * 60_000;
/** Уборку затеваем, только когда карта успела разрастись. */
const IDLE_CLEANUP_AFTER_CHATS = 500;

export type PushInput = {
  chatId: number;
  text: string;
  /**
   * Ключ дедупликации. С ним одно и то же событие не уйдёт дважды даже после
   * перезапуска бота. Без него сообщение отправляется как есть.
   */
  dedupeKey?: string;
};

type Buffered = { texts: string[]; keys: string[]; timer: ReturnType<typeof setTimeout> | null };
type Outgoing = { chatId: number; text: string; keys: string[]; attempts: number };

/**
 * Единственная исходящая очередь бота.
 *
 * Всё, что уходит игрокам, проходит здесь: и рассылка по теме, и личные пуши.
 * Одна очередь нужна, чтобы общий темп отправки считался честно - иначе две
 * независимые рассылки вместе легко упираются в лимиты Telegram.
 */
export class PushQueue {
  private buffers = new Map<number, Buffered>();
  private recent = new Map<number, number[]>();
  private lastSentAt = new Map<number, number>();
  private outbox: Outgoing[] = [];
  private drainTimer: ReturnType<typeof setTimeout> | null = null;
  private pausedUntil = 0;
  private running = false;

  constructor(
    private readonly bot: Bot,
    private readonly prefs: PrefsRepo,
    private readonly pushLog: PushLogRepo,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleDrain(0);
  }

  stop(): void {
    this.running = false;
    if (this.drainTimer) clearTimeout(this.drainTimer);
    this.drainTimer = null;
    for (const buf of this.buffers.values()) {
      if (buf.timer) clearTimeout(buf.timer);
    }
    this.buffers.clear();
  }

  get pending(): number {
    let buffered = 0;
    for (const buf of this.buffers.values()) buffered += buf.texts.length;
    return this.outbox.length + buffered;
  }

  /**
   * Ставит сообщение в очередь. Возвращает false, если событие с таким ключом
   * этому чату уже отправляли.
   */
  enqueue(msg: PushInput): boolean {
    if (msg.dedupeKey && !this.pushLog.claim(msg.chatId, msg.dedupeKey)) return false;

    const buf = this.buffers.get(msg.chatId) ?? { texts: [], keys: [], timer: null };
    buf.texts.push(msg.text);
    if (msg.dedupeKey) buf.keys.push(msg.dedupeKey);
    this.buffers.set(msg.chatId, buf);

    if (!buf.timer) {
      buf.timer = setTimeout(() => this.flush(msg.chatId), this.coalesceDelay(msg.chatId));
    }
    return true;
  }

  /** Рассылает текст всем, у кого включена тема. Возвращает число адресатов. */
  broadcast(topicId: string, text: string, dedupeKey?: string): number {
    const chats = this.recipientsOf(topicId);
    let queued = 0;
    for (const chatId of chats) {
      const ok = this.enqueue({
        chatId,
        text,
        ...(dedupeKey ? { dedupeKey } : {}),
      });
      if (ok) queued++;
    }
    return queued;
  }

  /**
   * Кому реально уходит тема.
   *
   * Читаем только явные строки подписок. Умолчания из реестра тем материализует
   * PrefsRepo.ensureDefaults при первом контакте чата с ботом, поэтому здесь
   * гадать про defaultOn не нужно: у знакомого чата строка уже есть.
   */
  private recipientsOf(topicId: string): number[] {
    const topic = findTopic(topicId);
    if (!topic) {
      console.warn(`[push] неизвестная тема ${topicId}, рассылка пропущена`);
      return [];
    }
    return this.prefs.subscribersOf(topicId);
  }

  /** В бурю склеиваем плотнее: лучше одно письмо через полминуты, чем десять подряд. */
  private coalesceDelay(chatId: number): number {
    const now = Date.now();
    const fresh = (this.recent.get(chatId) ?? []).filter((t) => now - t < BURST_WINDOW_MS);
    this.recent.set(chatId, fresh);
    return fresh.length >= BURST_LIMIT ? BURST_COALESCE_MS : COALESCE_MS;
  }

  private flush(chatId: number): void {
    const buf = this.buffers.get(chatId);
    this.buffers.delete(chatId);
    if (!buf || buf.texts.length === 0) return;
    if (buf.timer) clearTimeout(buf.timer);

    for (const chunk of chunkTexts(buf.texts)) {
      this.outbox.push({ chatId, text: chunk, keys: buf.keys, attempts: 0 });
    }
    this.scheduleDrain(0);
  }

  private scheduleDrain(delayMs: number): void {
    if (!this.running || this.drainTimer) return;
    this.drainTimer = setTimeout(() => {
      this.drainTimer = null;
      void this.drainOnce();
    }, delayMs);
  }

  private async drainOnce(): Promise<void> {
    if (!this.running) return;

    const now = Date.now();
    if (now < this.pausedUntil) {
      this.scheduleDrain(this.pausedUntil - now);
      return;
    }
    if (this.outbox.length === 0) {
      this.scheduleDrain(GLOBAL_INTERVAL_MS);
      return;
    }

    // Ищем первое сообщение, чей чат уже отдохнул положенную паузу.
    const index = this.outbox.findIndex(
      (m) => now - (this.lastSentAt.get(m.chatId) ?? 0) >= CHAT_MIN_INTERVAL_MS,
    );
    if (index === -1) {
      this.scheduleDrain(CHAT_MIN_INTERVAL_MS / 4);
      return;
    }

    const [msg] = this.outbox.splice(index, 1);
    if (!msg) {
      this.scheduleDrain(GLOBAL_INTERVAL_MS);
      return;
    }

    await this.send(msg);
    this.scheduleDrain(GLOBAL_INTERVAL_MS);
  }

  private async send(msg: Outgoing): Promise<void> {
    let result = await deliver(this.bot, msg.chatId, msg.text, true);
    if (result.kind === "html-broken") {
      console.warn(`[push] битый HTML для чата ${msg.chatId}, шлю без разметки`);
      result = await deliver(this.bot, msg.chatId, msg.text, false);
    }

    switch (result.kind) {
      case "sent": {
        const now = Date.now();
        this.lastSentAt.set(msg.chatId, now);
        const seen = (this.recent.get(msg.chatId) ?? []).filter((t) => now - t < BURST_WINDOW_MS);
        seen.push(now);
        this.recent.set(msg.chatId, seen);
        this.forgetIdleChats(now);
        return;
      }
      case "gone": {
        this.prefs.forget(msg.chatId);
        this.lastSentAt.delete(msg.chatId);
        this.recent.delete(msg.chatId);
        console.log(`[push] чат ${msg.chatId} недоступен, подписки удалены`);
        return;
      }
      case "flood": {
        this.pausedUntil = Date.now() + result.retryAfterMs;
        if (msg.attempts < 2) {
          this.outbox.unshift({ ...msg, attempts: msg.attempts + 1 });
        } else {
          this.giveUp(msg, `429 после ${msg.attempts} попыток`);
        }
        return;
      }
      case "failed":
        this.giveUp(msg, result.reason);
        return;
      default:
        // Сюда попадает только повторный "html-broken", а его быть не может:
        // второй заход идёт без разметки. Если попали, значит поменялся deliver.
        this.giveUp(msg, "разметка не принята даже без HTML");
    }
  }

  /**
   * Выбрасывает чаты, которым давно не писали.
   *
   * Обе карты нужны только для темпа отправки, но растут они по числу чатов,
   * которым бот когда-либо что-то слал. За год это все игроки сервера, и в
   * долгоживущем процессе такая карта заметна.
   */
  private forgetIdleChats(now: number): void {
    if (this.lastSentAt.size < IDLE_CLEANUP_AFTER_CHATS) return;

    for (const [chatId, at] of this.lastSentAt) {
      if (now - at > IDLE_CHAT_TTL_MS) {
        this.lastSentAt.delete(chatId);
        this.recent.delete(chatId);
      }
    }
  }

  /**
   * Отправка не удалась. Снимаем отметки дедупликации, чтобы следующий проход
   * задачи имел право попробовать снова - иначе игрок не узнает о событии вовсе.
   */
  private giveUp(msg: Outgoing, reason: string): void {
    for (const key of msg.keys) this.pushLog.release(msg.chatId, key);
    console.error(`[push] не доставил в чат ${msg.chatId}: ${reason}`);
  }
}

/** Режет склеенную пачку на сообщения, влезающие в лимит Telegram. */
function chunkTexts(texts: string[]): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const text of texts) {
    if (!current) {
      current = text;
      continue;
    }
    if (current.length + SEPARATOR.length + text.length > TELEGRAM_MAX_MESSAGE) {
      chunks.push(current);
      current = text;
      continue;
    }
    current += SEPARATOR + text;
  }

  if (current) chunks.push(current);
  return chunks;
}
