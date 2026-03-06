import type { Context } from "grammy";
import type { BotContext } from "../index";

const VALID_SERVERS = new Set(["grief", "anarchy", "lobby", "builder", "velocity", "all"]);

export function validateServer(server: string): server is string {
  return VALID_SERVERS.has(server);
}

export function parseArgs(text: string | undefined): string[] {
  return text?.trim().split(/\s+/).filter(Boolean) ?? [];
}

function replyOpts(ctx: Context) {
  const mid = ctx.message?.message_id;
  return mid ? { reply_to_message_id: mid } : {};
}

export async function executeOnServer(
  grammyCtx: Context,
  botCtx: BotContext,
  server: string,
  command: string,
): Promise<void> {
  if (server === "all") {
    const servers = botCtx.config.servers.filter((s) => s !== "velocity");
    const results = await Promise.all(
      servers.map(async (s) => {
        const res = await botCtx.bridge.execute(s, command);
        return `${s}: ${res.success ? "OK" : res.message}`;
      }),
    );
    await grammyCtx.reply(results.join("\n"), replyOpts(grammyCtx));
    return;
  }

  const res = await botCtx.bridge.execute(server, command);
  const icon = res.success ? "\u2705" : "\u274c";
  const text = `${icon} [${server}] ${res.message || (res.success ? "Команда выполнена" : "Ошибка")}`;
  await grammyCtx.reply(text, replyOpts(grammyCtx));
}

export async function missingArgs(grammyCtx: Context, usage: string): Promise<void> {
  await grammyCtx.reply(`Использование: ${usage}`, replyOpts(grammyCtx));
}

export async function invalidServer(grammyCtx: Context): Promise<void> {
  await grammyCtx.reply(
    "\u274c Неверный сервер. Доступные: grief, anarchy, lobby, builder, velocity, all",
    replyOpts(grammyCtx),
  );
}
