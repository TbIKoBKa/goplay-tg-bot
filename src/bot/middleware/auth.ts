import { Composer, type Context } from "grammy";
import type { Config } from "../../config";

export type Role = "admin" | "mod";

export type AuthMiddleware = {
  require(role: Role): Composer<Context>;
};

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
        const userId = ctx.from?.id;
        if (!userId) {
          await ctx.reply("\u274c Не удалось определить пользователя.");
          return;
        }

        const userRole = getRole(userId);
        if (!userRole) {
          await ctx.reply("\u274c У вас нет доступа к командам бота.");
          return;
        }

        if (role === "admin" && userRole !== "admin") {
          await ctx.reply("\u274c Эта команда доступна только администраторам.");
          return;
        }

        await next();
      });
      return mw;
    },
  };
}
