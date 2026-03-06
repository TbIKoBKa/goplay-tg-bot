import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseArgs, validateServer, invalidServer, missingArgs, executeOnServer } from "./utils";

export function kickCommand(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.use(auth.require("mod")).command("kick", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 2) return missingArgs(grammyCtx, "/kick <ник> <сервер> [причина]");

    const [nick, server, ...reasonParts] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    const reason = reasonParts.length > 0 ? reasonParts.join(" ") : "Kicked via Telegram";
    const cmd = server === "velocity"
      ? `libertybans kick ${nick} ${reason}`
      : `kick ${nick} ${reason}`;

    await executeOnServer(grammyCtx, ctx, server!, cmd);
  });

  return composer;
}
