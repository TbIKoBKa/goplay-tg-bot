/**
 * Короткая память диалога: чего мы ждём от игрока текстом.
 *
 * Только в памяти и только на несколько минут. Переживать перезапуск тут
 * нечему: незаконченный ввод ника после рестарта бота никому не нужен, а
 * лишняя таблица в базе жила бы вечно.
 */

export type Pending = { kind: "lookup"; until: number };

const TTL_MS = 5 * 60_000;

const sessions = new Map<number, Pending>();

export function expect(chatId: number, kind: Pending["kind"]): void {
  sessions.set(chatId, { kind, until: Date.now() + TTL_MS });
}

/** Забирает ожидание: второй раз тот же ввод не сработает. */
export function take(chatId: number): Pending["kind"] | null {
  const pending = sessions.get(chatId);
  if (!pending) return null;

  sessions.delete(chatId);
  return pending.until > Date.now() ? pending.kind : null;
}

export function forget(chatId: number): void {
  sessions.delete(chatId);
}

/**
 * Кого игрок смотрел последним.
 *
 * Нужно кнопкам «тот же ник на другом режиме»: ник в callback_data не влезает,
 * а гонять игрока по кругу через повторный ввод это издевательство.
 */
export type LastLookup = { uuid: string; nick: string; until: number };

const lookups = new Map<number, LastLookup>();

export function rememberLookup(chatId: number, uuid: string, nick: string): void {
  lookups.set(chatId, { uuid, nick, until: Date.now() + TTL_MS });
}

export function lastLookup(chatId: number): { uuid: string; nick: string } | null {
  const found = lookups.get(chatId);
  if (!found) return null;
  if (found.until <= Date.now()) {
    lookups.delete(chatId);
    return null;
  }
  return { uuid: found.uuid, nick: found.nick };
}

/** Выбрасывает протухшие ожидания, чтобы карты не росли весь аптайм. */
export function sweep(): number {
  const now = Date.now();
  let removed = 0;
  for (const [chatId, pending] of sessions) {
    if (pending.until <= now) {
      sessions.delete(chatId);
      removed++;
    }
  }
  for (const [chatId, lookup] of lookups) {
    if (lookup.until <= now) {
      lookups.delete(chatId);
      removed++;
    }
  }
  return removed;
}
