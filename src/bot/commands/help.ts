import { Composer, type Context } from "grammy";
import type { AuthMiddleware } from "../middleware/auth";

const PUBLIC_HELP = `ℹ️ <b>GoPlay Bot</b>

🔔 /subscribe — подписаться на уведомления о ивентах (айрдропы, сезоны Battle Pass)
🔕 /unsubscribe — отключить уведомления
🔗 /link &lt;код&gt; — привязать игровой аккаунт (код получи в игре командой <b>/link</b> или на сайте)

<b>AI-ассистент</b>
Напиши вопрос о сервере прямо сюда, в личку. В общем чате — тегни бота или ответь на его сообщение.

🌐 Сайт: go-play.gg
💬 Discord: discord.gg/hnwGEFEXzN`;

const STAFF_HELP = `ℹ️ <b>GoPlay Bot — команды стаффа</b>

<b>Баны / муты / кики</b> (модератор+)
/ban &lt;ник&gt; &lt;сервер&gt; [причина]
/unban &lt;ник&gt; &lt;сервер&gt;
/tempban &lt;ник&gt; &lt;сервер&gt; &lt;время&gt; [причина]
/mute &lt;ник&gt; &lt;сервер&gt; [время] [причина]
/tempmute &lt;ник&gt; &lt;сервер&gt; &lt;время&gt; [причина]
/unmute &lt;ник&gt; &lt;сервер&gt;
/kick &lt;ник&gt; &lt;сервер&gt; [причина]

<b>Сервер</b>
/list &lt;сервер&gt; — онлайн (модератор+)
/say &lt;сервер&gt; &lt;сообщение&gt; — сообщение в чат (модератор+)
/send &lt;ник&gt; &lt;сервер&gt; — переместить игрока (админ)
/reload &lt;сервер&gt; [плагин] — перезагрузка (админ)
/maintenance &lt;on|off&gt; — режим тех. работ (админ)
/whitelist &lt;on|off|add|remove|list&gt; &lt;сервер&gt; [ник] — вайтлист (админ)

<b>Игроки</b> (админ)
/op &lt;ник&gt; &lt;сервер&gt;
/deop &lt;ник&gt; &lt;сервер&gt;
/gm &lt;ник&gt; &lt;режим&gt; &lt;сервер&gt;
/tp &lt;ник&gt; &lt;x&gt; &lt;y&gt; &lt;z&gt; &lt;сервер&gt;

<b>Время</b>: 30m, 2h, 7d, 1w. <b>Сервер</b> <code>all</code> — все игровые сразу.

<b>AI-ассистент</b>
Тегните бота, ответьте на его сообщение или просто напишите в личку.`;

export function helpCommand(auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer<Context>();

  composer.command("help", async (ctx) => {
    const isStaff = auth.roleOf(ctx.from?.id) !== null;
    await ctx.reply(isStaff ? STAFF_HELP : PUBLIC_HELP, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  });

  return composer;
}
