import { escapeHtml, stripMinecraftColors } from "../bot/format";

export type EventPayload = Record<string, unknown>;

export type Rendered = {
  text: string;
  /** Ключ дедупликации: одно и то же событие не уйдёт дважды. */
  dedupeKey?: string;
};

const str = (payload: EventPayload, key: string): string => {
  const value = payload[key];
  return typeof value === "string" ? value : "";
};

const num = (payload: EventPayload, key: string): number | null => {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

/** Текст из игры приходит с цветовыми кодами и может содержать угловые скобки. */
const clean = (raw: string): string => escapeHtml(stripMinecraftColors(raw).trim());

/**
 * Событие сервера в сообщение.
 *
 * Возвращает null, если события такого вида мы не показываем: сервер имеет
 * право прислать больше, чем бот умеет рисовать.
 */
export function renderEvent(topic: string, payload: EventPayload): Rendered | null {
  switch (topic) {
    case "airdrop":
      return { text: `🪂 <b>Айрдроп</b>\n${clean(str(payload, "text"))}` };

    case "market.flash":
      return { text: `⚡ <b>Флеш-распродажа на рынке</b>\n${clean(str(payload, "text"))}` };

    case "market.night":
      return { text: `🌙 <b>Чёрный рынок открыт</b>\n${clean(str(payload, "text"))}` };

    case "dungeon.boss":
      return { text: `☠ <b>Владыка Города пробудился</b>\n${clean(str(payload, "text"))}` };

    case "dungeon.kill":
      return { text: `🏆 <b>Владыка Города повержен</b>\n${clean(str(payload, "text"))}` };

    case "dungeon.drop":
      return { text: `💎 <b>Редкая добыча из данжа</b>\n${clean(str(payload, "text"))}` };

    case "afk.record":
      return { text: `⏱ <b>Новый рекорд паркура</b>\n${clean(str(payload, "text"))}` };

    case "claims.breach":
      return { text: `💥 <b>База пробита</b>\n${clean(str(payload, "text"))}` };

    case "stolby.gathering":
      return { text: `🗼 <b>Столбы собирают раунд</b>\n${clean(str(payload, "text"))}` };

    case "claims.raid":
      return renderRaid(payload);

    case "claims.shield":
      return renderShield(payload);

    case "claims.breached":
      return renderBreached(payload);

    default:
      return null;
  }
}

function renderRaid(payload: EventPayload): Rendered {
  const attacker = clean(str(payload, "attacker"));
  const who = attacker ? `Бьёт <b>${attacker}</b>.` : "Кто именно, не видно.";

  return {
    text: [
      "⚔️ <b>Твою базу рейдят</b>",
      who,
      `Щит: ${payload["percent"] ?? "?"}%`,
      "",
      "Зайди и защищай, пока щит держит.",
    ].join("\n"),
    // Одно сообщение на осаду: трекер на сервере и так молчит пять минут,
    // но после его перезапуска ключ спасает от повтора.
    dedupeKey: `raid:${str(payload, "claim")}:${bucket(5)}`,
  };
}

function renderShield(payload: EventPayload): Rendered {
  const threshold = num(payload, "threshold") ?? 0;
  const percent = num(payload, "percent") ?? threshold;
  const icon = threshold <= 10 ? "🔴" : threshold <= 25 ? "🟠" : "🟡";

  return {
    text: [
      `${icon} <b>Щит просел ниже ${threshold}%</b>`,
      `Сейчас: ${percent}%`,
      coords(payload),
      "",
      threshold <= 10
        ? "Ещё немного, и базу вскроют. Заходи или заправляй щит."
        : "Пора зайти и разобраться.",
    ]
      .filter(Boolean)
      .join("\n"),
    dedupeKey: `shield:${str(payload, "claim")}:${threshold}:${bucket(60)}`,
  };
}

function renderBreached(payload: EventPayload): Rendered {
  const endsAt = num(payload, "endsAt");
  const minutes = endsAt ? Math.max(0, Math.round((endsAt - Date.now()) / 60_000)) : 15;

  return {
    text: [
      "💥 <b>Твою базу пробили</b>",
      `Окно открыто ещё примерно ${minutes} мин.`,
      coords(payload),
      "",
      "Успеешь добежать, пока всё не вынесли?",
    ]
      .filter(Boolean)
      .join("\n"),
    dedupeKey: `breached:${str(payload, "claim")}:${endsAt ?? bucket(15)}`,
  };
}

/**
 * Координаты в личном сообщении точные.
 *
 * Публичный анонс о пробое зашумляет их на сотню блоков, чтобы у владельца был
 * шанс добежать первым. Владельцу шуметь незачем, это его база.
 */
function coords(payload: EventPayload): string {
  const x = num(payload, "x");
  const y = num(payload, "y");
  const z = num(payload, "z");
  if (x === null || y === null || z === null) return "";
  return `Координаты: <code>${x} ${y} ${z}</code>`;
}

/** Номер окна времени в минутах: грубая защита от повторов после перезапуска. */
function bucket(minutes: number): number {
  return Math.floor(Date.now() / (minutes * 60_000));
}
