import type { Context, MiddlewareFn } from "grammy";
import type { Config } from "../../config";
import { replyTo } from "../reply";

export type Role = "admin" | "mod";

export type AuthMiddleware = {
  /**
   * Гейт по роли. ВАЖНО: подключать ПОСЛЕ фильтра команды —
   * `composer.command("ban", auth.require("mod"), handler)`, а не
   * `composer.use(auth.require("mod")).command(...)`. Во втором случае
   * middleware стоит перед фильтром и отвечает «нет доступа» на любую
   * незнакомую команду, включая адресованные другим ботам в общем чате.
   */
  require(role: Role): MiddlewareFn<Context>;
  roleOf(userId: number | undefined): Role | null;
};

export function createAuthMiddleware(access: Config["access"]): AuthMiddleware {
  const adminSet = new Set(access.admins);
  const modSet = new Set(access.moderators);

  function roleOf(userId: number | undefined): Role | null {
    if (userId === undefined) return null;
    if (adminSet.has(userId)) return "admin";
    if (modSet.has(userId)) return "mod";
    return null;
  }

  return {
    roleOf,
    require(role: Role): MiddlewareFn<Context> {
      return async (ctx, next) => {
        const userRole = roleOf(ctx.from?.id);
        if (!userRole) {
          await replyTo(ctx, "❌ У вас нет доступа к командам бота.");
          return;
        }
        if (role === "admin" && userRole !== "admin") {
          await replyTo(ctx, "❌ Эта команда доступна только администраторам.");
          return;
        }
        await next();
      };
    },
  };
}
