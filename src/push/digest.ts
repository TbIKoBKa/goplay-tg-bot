import { escapeHtml } from "../bot/format";
import { fetchStats, labelsOf, rawValues } from "../stats/service";
import { findTopic } from "./topics";
import type { StatCacheRepo } from "../db/repos/stat-cache";
import type { SnapshotsRepo, RawValues } from "../db/repos/snapshots";
import type { BridgeServer } from "../bridge/server";
import type { LinksRepo } from "../db/repos/links";
import type { PrefsRepo } from "../db/repos/prefs";
import type { PushQueue } from "../push/queue";

export const DIGEST_TOPIC = "digest.weekly";

/** Ключи, разница по которым игроку неинтересна: это состояние, а не достижение. */
const SKIP_KEYS = new Set(["claims:tier", "claims:state", "claims:shield", "rank:name", "rank:expires"]);

/** Сколько строк показываем: длинный список никто не читает. */
const MAX_ROWS = 8;

export type DigestDeps = {
  bridge: BridgeServer;
  links: LinksRepo;
  prefs: PrefsRepo;
  push: PushQueue;
  statCache: StatCacheRepo;
  snapshots: SnapshotsRepo;
  servers: readonly { id: string; title: string }[];
};

type Change = { label: string; delta: number; key: string };

/**
 * Недельный дайджест «твоя неделя».
 *
 * Считает разницу между сегодняшними цифрами и снимком недельной давности.
 * Первый запуск ничего не шлёт: сравнивать не с чем, он только запоминает
 * отправную точку.
 */
export async function weeklyDigestJob(deps: DigestDeps): Promise<number> {
  const topic = findTopic(DIGEST_TOPIC);
  if (!topic) return 0;

  const week = weekKey();
  let sent = 0;

  // Сервер, не ответивший первому же игроку, пропускаем до конца прохода.
  // Иначе на сотне привязанных мы просто отстоим сотню таймаутов подряд.
  const dead = new Set<string>();

  for (const link of deps.links.all()) {
    const enabled = deps.prefs.choiceOf(link.telegramId, DIGEST_TOPIC) ?? topic.defaultOn;
    if (!enabled) continue;

    const blocks: string[] = [];

    for (const server of deps.servers) {
      if (dead.has(server.id)) continue;

      const view = await fetchStats(deps.bridge, deps.statCache, server.id, link.uuid, "owner");
      if (view.kind === "error") {
        dead.add(server.id);
        console.warn(`[digest] ${server.id} не отвечает, пропускаю его в этом проходе`);
        continue;
      }
      if (view.kind !== "fresh") continue;

      const current = rawValues(view.cards);
      if (Object.keys(current).length === 0) continue;

      const previous = deps.snapshots.get(link.uuid, server.id);
      deps.snapshots.put(link.uuid, server.id, current);

      // Первая неделя у этого игрока: запомнили точку отсчёта и молчим.
      if (!previous) continue;

      const changes = diff(previous.values, current, labelsOf(view.cards));
      if (changes.length === 0) continue;

      blocks.push(
        [`<b>${escapeHtml(server.title)}</b>`, ...changes.map(formatChange)].join("\n"),
      );
    }

    if (blocks.length === 0) continue;

    const text = ["📅 <b>Твоя неделя</b>", "", ...blocks].join("\n\n");
    if (deps.push.enqueue({ chatId: link.telegramId, text, dedupeKey: `digest:${week}` })) {
      sent++;
    }
  }

  return sent;
}

/** Что выросло за неделю. Убывшее не показываем: это либо трата, либо вайп. */
function diff(before: RawValues, after: RawValues, labels: Record<string, string>): Change[] {
  const changes: Change[] = [];

  for (const [key, raw] of Object.entries(after)) {
    if (SKIP_KEYS.has(key)) continue;

    const now = Number(raw);
    const then = Number(before[key] ?? "");
    if (!Number.isFinite(now) || !Number.isFinite(then)) continue;

    const delta = now - then;
    if (delta <= 0) continue;

    const label = labels[key];
    if (!label) continue;

    changes.push({ label, delta, key });
  }

  return changes.sort((a, b) => b.delta - a.delta).slice(0, MAX_ROWS);
}

function formatChange(change: Change): string {
  // Время игры приходит в миллисекундах, показывать их числом бессмысленно.
  const value = change.key.endsWith("playtime")
    ? hours(change.delta)
    : `+${new Intl.NumberFormat("ru-RU").format(Math.round(change.delta))}`;
  return `${escapeHtml(change.label)}: <b>${value}</b>`;
}

function hours(millis: number): string {
  const total = Math.round(millis / 3_600_000);
  return total > 0 ? `+${total} ч` : "+меньше часа";
}

/** Год и номер недели: ключ дедупликации, чтобы дайджест не ушёл дважды. */
function weekKey(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const days = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return `${now.getUTCFullYear()}-W${Math.ceil((days + start.getUTCDay() + 1) / 7)}`;
}
