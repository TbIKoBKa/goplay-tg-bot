import type { Context } from "grammy";
import { replyTo } from "../reply";

/** Ники Minecraft: обычные + Bedrock через Floodgate (префикс с точкой). */
export const NICK_RE = /^[A-Za-z0-9_.]{1,16}$/;
/** Длительность наказания: 30m, 2h, 7d, 1w. */
export const DURATION_RE = /^\d+[smhdw]$/i;
/** Координата: целая или дробная, со знаком, а также относительная (~10). */
export const NUMBER_RE = /^~?-?\d+(\.\d+)?$|^~$/;

export type ArgKind = "nick" | "server" | "duration" | "number" | "word" | "rest";

export type ArgDef = {
  kind: ArgKind;
  /** Необязательный аргумент: если значение не подходит по типу — пропускается, не съедая слово. */
  optional?: boolean;
  /** Значение, подставляемое вместо пропущенного необязательного аргумента. */
  fallback?: string;
  /** Ограничение допустимых значений для kind: "word" (например on|off). */
  oneOf?: readonly string[];
};

export function parseArgs(text: string | undefined): string[] {
  return text?.trim().split(/\s+/).filter(Boolean) ?? [];
}

function matches(def: ArgDef, value: string, servers: ReadonlySet<string>): boolean {
  switch (def.kind) {
    case "nick":
      return NICK_RE.test(value);
    case "server":
      return servers.has(value.toLowerCase());
    case "duration":
      return DURATION_RE.test(value);
    case "number":
      return NUMBER_RE.test(value);
    case "word":
      return def.oneOf ? def.oneOf.includes(value.toLowerCase()) : value.length > 0;
    case "rest":
      return value.length > 0;
  }
}

function invalidMessage(def: ArgDef, servers: ReadonlySet<string>): string {
  switch (def.kind) {
    case "nick":
      return "❌ Неверный ник. Допустимы латиница, цифры, _ и . (до 16 символов).";
    case "server":
      return `❌ Неверный сервер. Доступные: ${[...servers].join(", ")}`;
    case "duration":
      return "❌ Неверное время. Формат: 30m, 2h, 7d, 1w.";
    case "number":
      return "❌ Координаты должны быть числами (можно относительные: ~, ~10).";
    case "word":
      return def.oneOf ? `❌ Допустимые значения: ${def.oneOf.join(", ")}` : "❌ Неверное значение.";
    case "rest":
      return "❌ Пустое значение.";
  }
}

/**
 * Разбирает и валидирует аргументы команды по декларативной схеме.
 * При ошибке сам отвечает пользователю и возвращает null.
 *
 * Значения возвращаются позиционно, в порядке `defs`; пропущенные необязательные —
 * как `fallback` или пустая строка.
 */
export async function parseCommand(
  ctx: Context,
  usage: string,
  defs: readonly ArgDef[],
  servers: ReadonlySet<string>,
): Promise<string[] | null> {
  const args = parseArgs(ctx.match as string | undefined);
  const values: string[] = [];
  let i = 0;

  for (const def of defs) {
    if (def.kind === "rest") {
      const rest = args.slice(i).join(" ");
      i = args.length;
      if (rest) {
        values.push(rest);
      } else if (def.optional || def.fallback !== undefined) {
        values.push(def.fallback ?? "");
      } else {
        await replyTo(ctx, `Использование: ${usage}`);
        return null;
      }
      continue;
    }

    const value = args[i];

    if (value === undefined) {
      if (def.optional || def.fallback !== undefined) {
        values.push(def.fallback ?? "");
        continue;
      }
      await replyTo(ctx, `Использование: ${usage}`);
      return null;
    }

    if (!matches(def, value, servers)) {
      // Необязательный аргумент просто пропускаем — слово достанется следующему.
      if (def.optional) {
        values.push(def.fallback ?? "");
        continue;
      }
      await replyTo(ctx, invalidMessage(def, servers));
      return null;
    }

    values.push(def.kind === "server" || def.kind === "word" ? value.toLowerCase() : value);
    i++;
  }

  return values;
}
