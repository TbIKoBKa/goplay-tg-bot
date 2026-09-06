/**
 * Реестр тем уведомлений.
 *
 * Тема попадает сюда только тогда, когда у неё есть источник событий.
 * Тумблер, который ничего не включает, хуже отсутствующего тумблера:
 * игрок его нажмёт, ничего не придёт, и он решит, что бот сломан.
 */

export type TopicScope =
  /** Событие сервера, одинаковое для всех. Привязка аккаунта не нужна. */
  | "global"
  /** Событие про конкретного игрока. Без привязки не работает. */
  | "personal";

export type Topic = {
  id: string;
  title: string;
  hint: string;
  group: string;
  scope: TopicScope;
  /** Включать ли тему тем, кто ещё ничего про неё не решал. */
  defaultOn: boolean;
};

/** Сюда уходит рассылка из POST /notify. Старые подписчики переехали в неё же. */
export const ANNOUNCE_TOPIC = "announce";

export const TOPICS: readonly Topic[] = [
  {
    id: ANNOUNCE_TOPIC,
    title: "Новости и ивенты",
    hint: "анонсы обновлений, ивентов и сезонов",
    group: "Общие",
    scope: "global",
    defaultOn: true,
  },
  {
    id: "airdrop",
    title: "Айрдропы",
    hint: "дроп с лутом появился на грифе",
    group: "Общие",
    scope: "global",
    defaultOn: true,
  },
  {
    id: "dungeon",
    title: "Данж",
    hint: "Владыка проснулся, повержен, редкая добыча",
    group: "Общие",
    scope: "global",
    defaultOn: false,
  },
  {
    id: "market",
    title: "Рынок",
    hint: "флеш-распродажи и ночной чёрный рынок",
    group: "Общие",
    scope: "global",
    defaultOn: false,
  },
  {
    id: "records",
    title: "Рекорды",
    hint: "новый рекорд паркура на сервере",
    group: "Общие",
    scope: "global",
    defaultOn: false,
  },
  {
    id: "claims.breach",
    title: "Чужие базы пробиты",
    hint: "кому-то вскрыли приват, окно открыто 15 минут",
    group: "Общие",
    scope: "global",
    defaultOn: false,
  },
  {
    id: "stolby.gathering",
    title: "Сбор на Столбах",
    hint: "раунд собирается, не хватает игроков",
    group: "Общие",
    scope: "global",
    defaultOn: false,
  },

  {
    id: "claims.raid",
    title: "Мою базу рейдят",
    hint: "по щиту начали бить",
    group: "Личные",
    scope: "personal",
    defaultOn: true,
  },
  {
    id: "claims.shield",
    title: "Щит просел",
    hint: "ниже 50, 25 и 10 процентов",
    group: "Личные",
    scope: "personal",
    defaultOn: true,
  },
  {
    id: "claims.breached",
    title: "Мою базу пробили",
    hint: "щит на нуле, база открыта",
    group: "Личные",
    scope: "personal",
    defaultOn: true,
  },
  {
    id: "quests.streak",
    title: "Стрик квестов",
    hint: "напоминание вечером, если стрик сгорает",
    group: "Личные",
    scope: "personal",
    defaultOn: true,
  },
  {
    id: "digest.weekly",
    title: "Итоги недели",
    hint: "что выросло за семь дней, по понедельникам",
    group: "Личные",
    scope: "personal",
    defaultOn: true,
  },
  {
    id: "rank.expiry",
    title: "Привилегия истекает",
    hint: "за три дня и за день до конца",
    group: "Личные",
    scope: "personal",
    defaultOn: true,
  },
];

const BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

/**
 * Тема события с сервера в тему подписки.
 *
 * Сервер различает больше событий, чем игроку нужно тумблеров: три события
 * данжа это один переключатель, две новости рынка тоже один.
 */
const EVENT_TO_TOPIC: Record<string, string> = {
  airdrop: "airdrop",
  "dungeon.boss": "dungeon",
  "dungeon.kill": "dungeon",
  "dungeon.drop": "dungeon",
  "market.flash": "market",
  "market.night": "market",
  "afk.record": "records",
  "claims.breach": "claims.breach",
  "stolby.gathering": "stolby.gathering",
  "claims.raid": "claims.raid",
  "claims.shield": "claims.shield",
  "claims.breached": "claims.breached",
};

export function findTopic(id: string): Topic | undefined {
  return BY_ID.get(id);
}

export function topicOfEvent(eventTopic: string): Topic | undefined {
  const id = EVENT_TO_TOPIC[eventTopic];
  return id ? BY_ID.get(id) : undefined;
}

/** Темы, сгруппированные для меню, в порядке объявления. */
export function topicGroups(): { group: string; topics: Topic[] }[] {
  const groups: { group: string; topics: Topic[] }[] = [];
  for (const topic of TOPICS) {
    const last = groups.find((g) => g.group === topic.group);
    if (last) last.topics.push(topic);
    else groups.push({ group: topic.group, topics: [topic] });
  }
  return groups;
}
