import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseCommand } from "./args";
import { executeOnServer } from "./utils";

export function kickCommand(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.command("kick", auth.require("mod"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/kick <ник> <сервер> [причина]",
      [
        { kind: "nick" },
        { kind: "server" },
        { kind: "rest", fallback: "Kicked via Telegram" },
      ],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", server = "", reason = ""] = parsed;

    const cmd = server === "velocity"
      ? `libertybans kick ${nick} ${reason}`
      : `kick ${nick} ${reason}`;

    await executeOnServer(g, ctx, server, cmd);
  });

  return composer;
}
