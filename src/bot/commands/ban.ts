import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseCommand } from "./args";
import { executeOnServer } from "./utils";

export function banCommands(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.command("ban", auth.require("mod"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/ban <ник> <сервер> [причина]",
      [
        { kind: "nick" },
        { kind: "server" },
        { kind: "rest", fallback: "Banned via Telegram" },
      ],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", server = "", reason = ""] = parsed;

    const cmd = server === "velocity"
      ? `libertybans ban ${nick} ${reason}`
      : `litebans:ban ${nick} ${reason}`;

    await executeOnServer(g, ctx, server, cmd);
  });

  composer.command("unban", auth.require("mod"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/unban <ник> <сервер>",
      [{ kind: "nick" }, { kind: "server" }],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", server = ""] = parsed;

    const cmd = server === "velocity"
      ? `libertybans unban ${nick}`
      : `litebans:unban ${nick}`;

    await executeOnServer(g, ctx, server, cmd);
  });

  composer.command("tempban", auth.require("mod"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/tempban <ник> <сервер> <время> [причина]",
      [
        { kind: "nick" },
        { kind: "server" },
        { kind: "duration" },
        { kind: "rest", fallback: "Tempbanned via Telegram" },
      ],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", server = "", duration = "", reason = ""] = parsed;

    const cmd = server === "velocity"
      ? `libertybans ban ${nick} ${duration} ${reason}`
      : `litebans:tempban ${nick} ${duration} ${reason}`;

    await executeOnServer(g, ctx, server, cmd);
  });

  return composer;
}
