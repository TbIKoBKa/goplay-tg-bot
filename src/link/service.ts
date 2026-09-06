import type { BridgeServer } from "../bridge/server";

/** Префикс токена в deep-link. Отделяет привязку от других ссылок вида ?start=… */
export const LINK_PREFIX = "L-";

export type RedeemResult =
  /** server это режим, где игрок набрал /tg: он там сейчас и играет. */
  | { ok: true; uuid: string; nick: string; server: string }
  | { ok: false; reason: string };

/** Достаёт токен из полезной нагрузки /start. Возвращает null, если это не привязка. */
export function tokenFromStartPayload(payload: string | undefined): string | null {
  const raw = payload?.trim() ?? "";
  if (!raw.startsWith(LINK_PREFIX)) return null;
  const token = raw.slice(LINK_PREFIX.length).trim();
  return token.length > 0 && token.length <= 64 ? token : null;
}

/**
 * Гасит код привязки.
 *
 * Спрашиваем все серверы разом: бот не знает, где игрок набрал команду, а
 * держать эту привязку где-то отдельно значит завести ещё одно состояние,
 * которое рассыплется при рестарте. Код одноразовый, поэтому лишние запросы
 * просто вернут отказ.
 */
export async function redeemToken(
  bridge: BridgeServer,
  servers: readonly string[],
  token: string,
): Promise<RedeemResult> {
  const answers = await Promise.all(
    servers.map(async (server) => ({
      server,
      outcome: await bridge.query(server, "link.redeem", { token }),
    })),
  );

  for (const { server, outcome } of answers) {
    if (!outcome.ok) continue;
    const uuid = outcome.payload["uuid"];
    const nick = outcome.payload["nick"];
    if (typeof uuid === "string" && typeof nick === "string" && uuid && nick) {
      return { ok: true, uuid, nick, server };
    }
  }

  // Ни один сервер не отозвался вовсе: это не "код неверный", а "связи нет".
  const reachable = answers.some((a) => (a.outcome.ok ? true : !isUnreachable(a.outcome.error)));
  return {
    ok: false,
    reason: reachable
      ? "Код неверный или уже просрочен. Набери /tg в игре ещё раз."
      : "Сервер сейчас недоступен. Попробуй через пару минут.",
  };
}

function isUnreachable(error: string | undefined): boolean {
  if (!error) return false;
  return (
    error.includes("недоступен") ||
    error.includes("Нет связи") ||
    error.includes("не ответил") ||
    error.includes("Не смог передать")
  );
}
