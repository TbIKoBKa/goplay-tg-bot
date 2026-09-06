import type { BridgeEvent } from "./protocol";
import type { LinksRepo } from "../db/repos/links";
import type { PrefsRepo } from "../db/repos/prefs";
import type { PushQueue } from "../push/queue";
import { renderEvent } from "../push/render";
import { topicOfEvent } from "../push/topics";

export type EventDeps = {
  push: PushQueue;
  links: LinksRepo;
  prefs: PrefsRepo;
};

/**
 * Разбирает события, которые плагины шлют сами.
 *
 * Общие уходят всем, у кого включена тема. Личные адресуются владельцу: в кадре
 * есть его UUID, и без привязки такое событие просто некуда доставить.
 */
export function handleBridgeEvent(deps: EventDeps, event: BridgeEvent): void {
  const topic = topicOfEvent(event.topic);
  if (!topic) return;

  const rendered = renderEvent(event.topic, event.payload);
  if (!rendered) return;

  if (topic.scope === "global") {
    const queued = deps.push.broadcast(topic.id, rendered.text, rendered.dedupeKey);
    console.log(`[event] ${event.topic} с ${event.server}: в очереди ${queued} чатов`);
    return;
  }

  const owner = event.payload["owner"];
  if (typeof owner !== "string" || !owner) return;

  const link = deps.links.byUuid(owner);
  if (!link) return;

  // Личная тема тоже выключаемая: игрок вправе не хотеть знать о рейдах ночью.
  const enabled = deps.prefs.choiceOf(link.telegramId, topic.id) ?? topic.defaultOn;
  if (!enabled) return;

  const sent = deps.push.enqueue({
    chatId: link.telegramId,
    text: rendered.text,
    ...(rendered.dedupeKey ? { dedupeKey: rendered.dedupeKey } : {}),
  });

  if (sent) console.log(`[event] ${event.topic} отправлен игроку ${link.nick}`);
}
