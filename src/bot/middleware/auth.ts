import { Composer, type Context } from "grammy";
import type { Config } from "../../config";

export type Role = "admin" | "mod";

export type AuthMiddleware = {
  require(role: Role): Composer<Context>;
};

function isBotCommand(ctx: Context): boolean {
  const text = ctx.message?.text;
  if (!text) return false;

  const entities = ctx.message?.entities;
  if (!entities) return false;

  return entities.some((e) => e.type === "bot_command" && e.offset === 0);
}

export function createAuthMiddleware(
  access: Config["access"],
): AuthMiddleware {
  const adminSet = new Set(access.admins);
  const modSet = new Set(access.moderators);

  function getRole(userId: number): Role | null {
    if (adminSet.has(userId)) return "admin";
    if (modSet.has(userId)) return "mod";
    return null;
  }

  return {
    require(role: Role): Composer<Context> {
      const mw = new Composer<Context>();
      mw.use(async (ctx, next) => {
        if (!isBotCommand(ctx)) {
          return next();
        }

        const userId = ctx.from?.id;
        if (!userId) {
          await ctx.reply("\u274c \u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f.");
          return;
        }

        const userRole = getRole(userId);
        if (!userRole) {
          await ctx.reply("\u274c \u0423 \u0432\u0430\u0441 \u043d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043a \u043a\u043e\u043c\u0430\u043d\u0434\u0430\u043c \u0431\u043e\u0442\u0430.");
          return;
        }

        if (role === "admin" && userRole !== "admin") {
          await ctx.reply("\u274c \u042d\u0442\u0430 \u043a\u043e\u043c\u0430\u043d\u0434\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0442\u043e\u043b\u044c\u043a\u043e \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430\u043c.");
          return;
        }

        await next();
      });
      return mw;
    },
  };
}
