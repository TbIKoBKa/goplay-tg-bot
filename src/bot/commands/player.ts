import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseArgs, validateServer, invalidServer, missingArgs, executeOnServer } from "./utils";

export function playerCommands(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.use(auth.require("admin")).command("op", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 2) return missingArgs(grammyCtx, "/op <ник> <сервер>");

    const [nick, server] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    await executeOnServer(grammyCtx, ctx, server!, `op ${nick}`);
  });

  composer.use(auth.require("admin")).command("deop", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 2) return missingArgs(grammyCtx, "/deop <ник> <сервер>");

    const [nick, server] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    await executeOnServer(grammyCtx, ctx, server!, `deop ${nick}`);
  });

  composer.use(auth.require("admin")).command("tp", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 5) return missingArgs(grammyCtx, "/tp <ник> <x> <y> <z> <сервер>");

    const [nick, x, y, z, server] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    await executeOnServer(grammyCtx, ctx, server!, `tp ${nick} ${x} ${y} ${z}`);
  });

  composer.use(auth.require("admin")).command("gm", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 3) return missingArgs(grammyCtx, "/gm <ник> <режим> <сервер>");

    const [nick, mode, server] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    await executeOnServer(grammyCtx, ctx, server!, `gamemode ${mode} ${nick}`);
  });

  return composer;
}
