import type { BridgeServer } from "../bridge/server";
import type { RefsRepo } from "../db/repos/refs";

/**
 * Отдаёт серверу намерение засчитать приглашение.
 *
 * Сервер ровно один, и это принципиально. GoPlayPromo стоит на грифе, ваниле и
 * столбах, у каждого своя база и свои награды, поэтому рассылка приглашения
 * всем режимам оплатила бы один приход друга трижды.
 *
 * Само приглашение засчитывает команда {@code /ref}, когда приглашённый
 * наиграет положенное. Дублировать её проверки на самоприглашение, повтор и
 * один IP значит завести вторую копию правил, которая однажды разойдётся с первой.
 */
export async function bindReferral(
  bridge: BridgeServer,
  server: string,
  uuid: string,
  referrer: string,
): Promise<boolean> {
  const outcome = await bridge.query(server, "ref.bind", { uuid, referrer });
  return outcome.ok;
}

/**
 * Досылает отложенное приглашение.
 *
 * Запись снимается только когда сервер её принял: иначе минутная недоступность
 * прокси навсегда съедала бы чужое приглашение.
 */
export async function applyPendingReferral(
  bridge: BridgeServer,
  refs: RefsRepo,
  telegramId: number,
  uuid: string,
  nick: string,
  server: string,
): Promise<string | null> {
  const pending = refs.peek(telegramId);
  if (!pending) return null;

  // Пригласить самого себя нельзя, и до сервера такое доносить незачем.
  if (pending.referrer.toLowerCase() === nick.toLowerCase()) {
    refs.forget(telegramId);
    return null;
  }

  if (!(await bindReferral(bridge, server, uuid, pending.referrer))) return null;

  refs.forget(telegramId);
  return pending.referrer;
}
