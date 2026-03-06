import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseArgs, validateServer, invalidServer, missingArgs, executeOnServer } from "./utils";

export function serverCommands(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.use(auth.require("mod")).command("list", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 1) return missingArgs(grammyCtx, "/list <сервер>");

    const [server] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    await executeOnServer(grammyCtx, ctx, server!, "list");
  });

  composer.use(auth.require("mod")).command("say", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 2) return missingArgs(grammyCtx, "/say <сервер> <сообщение>");

    const [server, ...messageParts] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    const message = messageParts.join(" ");
    await executeOnServer(grammyCtx, ctx, server!, `say ${message}`);
  });

  composer.use(auth.require("admin")).command("reload", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 1) return missingArgs(grammyCtx, "/reload <сервер> [плагин]");

    const [server, plugin] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    const cmd = plugin ? `plugman reload ${plugin}` : "plugman reload all";
    await executeOnServer(grammyCtx, ctx, server!, cmd);
  });

  composer.use(auth.require("admin")).command("maintenance", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 1) return missingArgs(grammyCtx, "/maintenance <on|off>");

    const [action] = args;
    if (action !== "on" && action !== "off") {
      await grammyCtx.reply("\u274c Используйте: /maintenance on или /maintenance off");
      return;
    }

    await executeOnServer(grammyCtx, ctx, "velocity", `maintenance ${action}`);
  });

  composer.use(auth.require("admin")).command("send", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 2) return missingArgs(grammyCtx, "/send <ник> <сервер>");

    const [nick, server] = args;
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    await executeOnServer(grammyCtx, ctx, "velocity", `send ${nick} ${server}`);
  });

  return composer;
}
