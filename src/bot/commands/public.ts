import { Composer, type Context } from "grammy";
import type { SubscriberStore } from "../subscribers";
import { escapeHtml } from "../format";
import { RateLimiter } from "../rate-limit";

// Код привязки одноразовый и короткий — без лимита его можно перебрать.
const LINK_LIMIT = new RateLimiter(5, 10 * 60_000);
const LINK_TIMEOUT_MS = 10_000;

const START_TEXT = [
  "👋 Привет! Это бот <b>GoPlay</b> — твой помощник по серверу.",
  "",
  "🔔 <b>/subscribe</b> — подписаться на уведомления о ивентах (айрдропы, сезоны Battle Pass).",
  "🔕 <b>/unsubscribe</b> — отключить уведомления.",
  "🔗 <b>/link &lt;код&gt;</b> — привязать игровой аккаунт (код получи в игре командой <b>/link</b> или на сайте).",
  "",
  "💬 Вопрос о сервере? Просто напиши его сюда — отвечу.",
  "",
  "🌐 Сайт: go-play.gg",
  "💬 Discord: discord.gg/hnwGEFEXzN",
].join("\n");

/**
 * Команды для ОБЫЧНЫХ игроков (без авторизации).
 * Регистрировать ПЕРВЫМ — до admin/mod композеров, чтобы их auth-middleware
 * не перехватывал /start, /link, /subscribe у не-админов.
 */
export function publicCommands(
  subs: SubscriberStore,
  web: { apiUrl?: string | undefined; apiToken?: string | undefined },
): Composer<Context> {
  const composer = new Composer();

  composer.command("start", async (g) => {
    await g.reply(START_TEXT, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  });

  composer.command("subscribe", async (g) => {
    const id = g.chat?.id;
    if (!id) return;
    const added = subs.add(id);
    await g.reply(
      added
        ? "🔔 Готово! Будешь получать уведомления о ивентах GoPlay."
        : "Ты уже подписан на уведомления.",
    );
  });

  composer.command("unsubscribe", async (g) => {
    const id = g.chat?.id;
    if (!id) return;
    const removed = subs.remove(id);
    await g.reply(
      removed ? "🔕 Уведомления отключены." : "Ты и так не был подписан.",
    );
  });

  composer.command("link", async (g) => {
    const code = (g.match as string | undefined)?.trim();
    if (!code) {
      await g.reply(
        "Использование: <b>/link &lt;код&gt;</b>\nКод получи в игре командой <b>/link</b> или на сайте go-play.gg.",
        { parse_mode: "HTML" },
      );
      return;
    }
    if (!web.apiUrl) {
      await g.reply("⚠️ Привязка аккаунта временно недоступна. Попробуй позже.");
      return;
    }

    const userId = g.from?.id;
    if (userId === undefined) return;
    if (!LINK_LIMIT.try(String(userId))) {
      const minutes = Math.ceil(LINK_LIMIT.retryAfterMs(String(userId)) / 60_000);
      await g.reply(`⏱ Слишком много попыток. Попробуй через ${minutes} мин.`);
      return;
    }

    try {
      const res = await fetch(`${web.apiUrl.replace(/\/+$/, "")}/telegram/link`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(web.apiToken ? { authorization: `Bearer ${web.apiToken}` } : {}),
        },
        body: JSON.stringify({
          code,
          telegramId: userId,
          telegramUsername: g.from?.username ?? null,
        }),
        signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
      });
      if (res.ok) {
        // Успех — лимит попыток сбрасываем, он нужен только против перебора.
        LINK_LIMIT.reset(String(userId));
        const data = (await res.json().catch(() => ({}))) as { player?: string };
        const who = data?.player ? `<b>${escapeHtml(data.player)}</b> ` : "";
        await g.reply(`✅ Аккаунт ${who}привязан! Теперь уведомления станут персональными.`, {
          parse_mode: "HTML",
        });
      } else if (res.status === 400 || res.status === 404) {
        await g.reply("❌ Неверный или просроченный код. Получи новый в игре: /link");
      } else {
        await g.reply("❌ Не удалось привязать аккаунт. Попробуй позже.");
      }
    } catch (err) {
      console.error("[link] request failed:", err);
      await g.reply("❌ Сервис привязки недоступен. Попробуй позже.");
    }
  });

  return composer;
}
