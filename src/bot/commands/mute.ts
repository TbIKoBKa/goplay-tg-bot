import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseCommand } from "./args";
import { executeOnServer } from "./utils";

function muteCommand(server: string, nick: string, duration: string, reason: string): string {
  if (server === "velocity") {
    return duration
      ? `libertybans mute ${nick} ${duration} ${reason}`
      : `libertybans mute ${nick} ${reason}`;
  }
  return duration
    ? `litebans:tempmute ${nick} ${duration} ${reason}`
    : `litebans:mute ${nick} ${reason}`;
}

export function muteCommands(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.command("mute", auth.require("mod"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/mute <ник> <сервер> [время] [причина]",
      [
        { kind: "nick" },
        { kind: "server" },
        // Необязательное: слово, не похожее на 30m/2h/7d, уходит в причину.
        { kind: "duration", optional: true },
        { kind: "rest", fallback: "Muted via Telegram" },
      ],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", server = "", duration = "", reason = ""] = parsed;

    await executeOnServer(g, ctx, server, muteCommand(server, nick, duration, reason));
  });

  composer.command("tempmute", auth.require("mod"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/tempmute <ник> <сервер> <время> [причина]",
      [
        { kind: "nick" },
        { kind: "server" },
        { kind: "duration" },
        { kind: "rest", fallback: "Tempmuted via Telegram" },
      ],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", server = "", duration = "", reason = ""] = parsed;

    await executeOnServer(g, ctx, server, muteCommand(server, nick, duration, reason));
  });

  composer.command("unmute", auth.require("mod"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/unmute <ник> <сервер>",
      [{ kind: "nick" }, { kind: "server" }],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", server = ""] = parsed;

    const cmd = server === "velocity"
      ? `libertybans unmute ${nick}`
      : `litebans:unmute ${nick}`;

    await executeOnServer(g, ctx, server, cmd);
  });

  return composer;
}
