import type { Context } from "grammy";
import type { BotContext } from "../index";
import { stripMinecraftColors, truncate } from "../format";
import { replyTo } from "../reply";

/** Приводит ответ консоли к виду, пригодному для чата Telegram. */
function cleanOutput(message: string): string {
  return stripMinecraftColors(message).trim();
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
        const icon = res.success ? "✅" : "❌";
        const body = cleanOutput(res.message) || (res.success ? "Команда выполнена" : "Ошибка");
        return `${icon} [${s}] ${body}`;
      }),
    );
    await replyTo(grammyCtx, truncate(results.join("\n\n")));
    return;
  }

  const res = await botCtx.bridge.execute(server, command);
  const icon = res.success ? "✅" : "❌";
  const body = cleanOutput(res.message) || (res.success ? "Команда выполнена" : "Ошибка");
  await replyTo(grammyCtx, truncate(`${icon} [${server}] ${body}`));
}
