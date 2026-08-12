import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseCommand } from "./args";
import { executeOnServer } from "./utils";
import { replyTo } from "../reply";

const ACTIONS = ["on", "off", "add", "remove", "list"] as const;
const USAGE = "/whitelist <on|off|add|remove|list> <сервер> [ник]";

export function whitelistCommand(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.command("whitelist", auth.require("admin"), async (g) => {
    const parsed = await parseCommand(
      g,
      USAGE,
      [
        { kind: "word", oneOf: ACTIONS },
        { kind: "server" },
        { kind: "nick", optional: true },
      ],
      ctx.servers,
    );
    if (!parsed) return;
    const [action = "", server = "", nick = ""] = parsed;

    if ((action === "add" || action === "remove") && !nick) {
      await replyTo(g, `Использование: /whitelist ${action} <сервер> <ник>`);
      return;
    }

    await executeOnServer(g, ctx, server, nick ? `whitelist ${action} ${nick}` : `whitelist ${action}`);
  });

  return composer;
}
