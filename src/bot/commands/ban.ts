import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseArgs, validateServer, invalidServer, missingArgs, executeOnServer } from "./utils";

export function banCommands(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.use(auth.require("mod")).command("ban", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 2) return missingArgs(grammyCtx, "/ban <ник> <сервер> [причина]");

    const [nick, server, ...reasonParts] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    const reason = reasonParts.length > 0 ? reasonParts.join(" ") : "Banned via Telegram";
    const cmd = server === "velocity"
      ? `libertybans ban ${nick} ${reason}`
      : `litebans:ban ${nick} ${reason}`;

    await executeOnServer(grammyCtx, ctx, server!, cmd);
  });

  composer.use(auth.require("mod")).command("unban", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 2) return missingArgs(grammyCtx, "/unban <ник> <сервер>");

    const [nick, server] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    const cmd = server === "velocity"
      ? `libertybans unban ${nick}`
      : `litebans:unban ${nick}`;

    await executeOnServer(grammyCtx, ctx, server!, cmd);
  });

  composer.use(auth.require("mod")).command("tempban", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 3) return missingArgs(grammyCtx, "/tempban <ник> <сервер> <время> [причина]");

    const [nick, server, duration, ...reasonParts] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    const reason = reasonParts.length > 0 ? reasonParts.join(" ") : "Tempbanned via Telegram";
    const cmd = server === "velocity"
      ? `libertybans ban ${nick} ${duration} ${reason}`
      : `litebans:tempban ${nick} ${duration} ${reason}`;

    await executeOnServer(grammyCtx, ctx, server!, cmd);
  });

  return composer;
}
