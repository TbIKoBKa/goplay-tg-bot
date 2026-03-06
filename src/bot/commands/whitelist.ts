import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseArgs, validateServer, invalidServer, missingArgs, executeOnServer } from "./utils";

const VALID_ACTIONS = new Set(["on", "off", "add", "remove", "list"]);

export function whitelistCommand(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.use(auth.require("admin")).command("whitelist", async (grammyCtx) => {
    const args = parseArgs(grammyCtx.match as string);
    if (args.length < 2) return missingArgs(grammyCtx, "/whitelist <on|off|add|remove|list> <сервер> [ник]");

    const [action, server, nick] = args;
    if (!VALID_ACTIONS.has(action!)) {
      await grammyCtx.reply("\u274c Действие: on, off, add, remove, list");
      return;
    }
    if (!validateServer(server!)) return invalidServer(grammyCtx);

    if ((action === "add" || action === "remove") && !nick) {
      return missingArgs(grammyCtx, `/whitelist ${action} <сервер> <ник>`);
    }

    const cmd = nick ? `whitelist ${action} ${nick}` : `whitelist ${action}`;
    await executeOnServer(grammyCtx, ctx, server!, cmd);
  });

  return composer;
}
