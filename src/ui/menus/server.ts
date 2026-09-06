import { InlineKeyboard, backRow, cb } from "../keyboard";
import type { MenuRequest, MenuView } from "../types";

/** Ответ прокси на `list`: "Online: 3 - Steve, Alex, Notch". */
const ONLINE_RE = /Online:\s*(\d+)/i;

type ServerOnline = { title: string; hint: string; online: number | null };

/**
 * Онлайн держим несколько секунд.
 *
 * Раздел открывают и обновляют часто, а каждое открытие это запрос к прокси на
 * каждый режим. За пять секунд цифра всё равно не успевает измениться настолько,
 * чтобы игрок заметил.
 */
const ONLINE_TTL_MS = 5000;
let cache: { at: number; rows: ServerOnline[] } | null = null;

/**
 * Раздел "Сервер": адреса, ссылки и живой онлайн по режимам.
 *
 * Онлайн спрашиваем у прокси командой `list`. Она отвечает из списка
 * подключённых игроков самого Velocity, поэтому работает и для режимов,
 * где плагин моста ещё не стоит.
 */
export async function serverMenu(req: MenuRequest): Promise<MenuView> {
  const { config, bridge } = req.deps;

  const now = Date.now();
  let results: ServerOnline[];

  if (cache && now - cache.at < ONLINE_TTL_MS) {
    results = cache.rows;
  } else {
    results = await Promise.all(
      config.servers.map(async (server): Promise<ServerOnline> => {
        const res = await bridge.execute(server.id, "list");
        const match = res.success ? ONLINE_RE.exec(res.message) : null;
        return {
          title: server.title,
          hint: server.hint,
          online: match?.[1] !== undefined ? Number(match[1]) : null,
        };
      }),
    );
    cache = { at: Date.now(), rows: results };
  }

  const total = results.reduce((sum, r) => sum + (r.online ?? 0), 0);
  const anyKnown = results.some((r) => r.online !== null);

  const lines = [
    "🌐 <b>Сервер</b>",
    "",
    `Адрес: <code>${config.links.ip}</code>`,
    "Клиент: 1.21 и выше, Java и Bedrock",
    "",
  ];

  if (anyKnown) {
    lines.push(`<b>Сейчас онлайн: ${total}</b>`);
    for (const r of results) {
      const value = r.online === null ? "нет связи" : String(r.online);
      lines.push(`• ${r.title}: ${value}`);
    }
  } else {
    lines.push("Онлайн сейчас не узнать: нет связи с прокси. Попробуй чуть позже.");
  }

  lines.push(
    "",
    `Сайт: ${config.links.site}`,
    `Discord: ${config.links.discord}`,
    `Канал: ${config.links.telegram}`,
  );

  const keyboard = new InlineKeyboard().text("🔄 Обновить", cb("server", "refresh"));

  return {
    text: lines.join("\n"),
    keyboard: backRow(keyboard),
    // Онлайн мог не измениться, и без подсказки нажатие выглядит как поломка.
    ...(req.action === "refresh" ? { toast: "Обновлено" } : {}),
  };
}
