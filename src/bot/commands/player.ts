import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseCommand } from "./args";
import { executeOnServer } from "./utils";

const GAMEMODES = ["survival", "creative", "adventure", "spectator", "s", "c", "a", "sp", "0", "1", "2", "3"] as const;

export function playerCommands(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.command("op", auth.require("admin"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/op <ник> <сервер>",
      [{ kind: "nick" }, { kind: "server" }],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", server = ""] = parsed;

    await executeOnServer(g, ctx, server, `op ${nick}`);
  });

  composer.command("deop", auth.require("admin"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/deop <ник> <сервер>",
      [{ kind: "nick" }, { kind: "server" }],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", server = ""] = parsed;

    await executeOnServer(g, ctx, server, `deop ${nick}`);
  });

  composer.command("tp", auth.require("admin"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/tp <ник> <x> <y> <z> <сервер>",
      [
        { kind: "nick" },
        { kind: "number" },
        { kind: "number" },
        { kind: "number" },
        { kind: "server" },
      ],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", x = "", y = "", z = "", server = ""] = parsed;

    await executeOnServer(g, ctx, server, `tp ${nick} ${x} ${y} ${z}`);
  });

  composer.command("gm", auth.require("admin"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/gm <ник> <режим> <сервер>",
      [
        { kind: "nick" },
        { kind: "word", oneOf: GAMEMODES },
        { kind: "server" },
      ],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", mode = "", server = ""] = parsed;

    await executeOnServer(g, ctx, server, `gamemode ${mode} ${nick}`);
  });

  return composer;
}
