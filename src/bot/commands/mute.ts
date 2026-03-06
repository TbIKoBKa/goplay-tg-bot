import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseArgs, validateServer, invalidServer, missingArgs, executeOnServer } from "./utils";

export function muteCommands(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.use(auth.require("mod")).command("mute", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 2) return missingArgs(grammyCtx, "/mute <ник> <сервер> [время] [причина]");

    const [nick, server, ...rest] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    const hasTime = rest.length > 0 && /^\d+[smhdw]$/i.test(rest[0]!);
    const duration = hasTime ? rest.shift() : undefined;
    const reason = rest.length > 0 ? rest.join(" ") : "Muted via Telegram";

    let cmd: string;
    if (server === "velocity") {
      cmd = duration
        ? `libertybans mute ${nick} ${duration} ${reason}`
        : `libertybans mute ${nick} ${reason}`;
    } else {
      cmd = duration
        ? `litebans:tempmute ${nick} ${duration} ${reason}`
        : `litebans:mute ${nick} ${reason}`;
    }

    await executeOnServer(grammyCtx, ctx, server!, cmd);
  });

  composer.use(auth.require("mod")).command("unmute", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 2) return missingArgs(grammyCtx, "/unmute <ник> <сервер>");

    const [nick, server] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    const cmd = server === "velocity"
      ? `libertybans unmute ${nick}`
      : `litebans:unmute ${nick}`;

    await executeOnServer(grammyCtx, ctx, server!, cmd);
  });

  return composer;
}
