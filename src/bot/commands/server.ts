import { Composer, type Context } from "grammy";
import type { BotContext } from "../index";
import type { AuthMiddleware } from "../middleware/auth";
import { parseCommand } from "./args";
import { executeOnServer } from "./utils";
import { replyTo } from "../reply";

export function serverCommands(ctx: BotContext, auth: AuthMiddleware): Composer<Context> {
  const composer = new Composer();

  composer.command("list", auth.require("mod"), async (g) => {
    const parsed = await parseCommand(g, "/list <сервер>", [{ kind: "server" }], ctx.servers);
    if (!parsed) return;
    const [server = ""] = parsed;

    await executeOnServer(g, ctx, server, "list");
  });

  composer.command("say", auth.require("mod"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/say <сервер> <сообщение>",
      [{ kind: "server" }, { kind: "rest" }],
      ctx.servers,
    );
    if (!parsed) return;
    const [server = "", message = ""] = parsed;

    await executeOnServer(g, ctx, server, `say ${message}`);
  });

  composer.command("reload", auth.require("admin"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/reload <сервер> [плагин]",
      [{ kind: "server" }, { kind: "word", optional: true }],
      ctx.servers,
    );
    if (!parsed) return;
    const [server = "", plugin = ""] = parsed;

    await executeOnServer(g, ctx, server, plugin ? `plugman reload ${plugin}` : "plugman reload all");
  });

  composer.command("maintenance", auth.require("admin"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/maintenance <on|off>",
      [{ kind: "word", oneOf: ["on", "off"] }],
      ctx.servers,
    );
    if (!parsed) return;
    const [action = ""] = parsed;

    await executeOnServer(g, ctx, "velocity", `maintenance ${action}`);
  });

  composer.command("send", auth.require("admin"), async (g) => {
    const parsed = await parseCommand(
      g,
      "/send <ник> <сервер>",
      [{ kind: "nick" }, { kind: "server" }],
      ctx.servers,
    );
    if (!parsed) return;
    const [nick = "", server = ""] = parsed;

    // Команду выполняет сам прокси, поэтому цель не может быть прокси или "all".
    if (server === "velocity" || server === "all") {
      await replyTo(g, "❌ Укажите конкретный игровой сервер, а не velocity/all.");
      return;
    }

    await executeOnServer(g, ctx, "velocity", `send ${nick} ${server}`);
  });

  return composer;
}
