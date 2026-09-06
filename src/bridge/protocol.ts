import { z } from "zod";

export const BridgeAuthSchema = z.object({
  type: z.literal("auth"),
  secret: z.string(),
  role: z.enum(["bridge", "api"]).default("bridge"),
});

/** Консольная команда. Этим кадром пользуется сайт, когда выдаёт донат. */
export const BridgeRequestSchema = z.object({
  type: z.literal("request"),
  id: z.string(),
  server: z.string(),
  command: z.string(),
});

export const BridgeResponseSchema = z.object({
  type: z.literal("response"),
  id: z.string(),
  success: z.boolean(),
  message: z.string(),
});

/** Запрос данных у плагина. В отличие от команды, ответ приходит асинхронно. */
export const BridgeQuerySchema = z.object({
  type: z.literal("query"),
  id: z.string(),
  server: z.string(),
  topic: z.string(),
  params: z.record(z.string(), z.unknown()).default({}),
});

export const BridgeQueryResultSchema = z.object({
  type: z.literal("queryResult"),
  id: z.string(),
  success: z.boolean(),
  payload: z.record(z.string(), z.unknown()).default({}),
  error: z.string().default(""),
});

/** Событие с сервера. Никто его не запрашивал, плагин прислал сам. */
export const BridgeEventSchema = z.object({
  type: z.literal("event"),
  server: z.string(),
  topic: z.string(),
  payload: z.record(z.string(), z.unknown()).default({}),
  ts: z.number().optional(),
});

export type BridgeAuth = z.infer<typeof BridgeAuthSchema>;
export type BridgeRequest = z.infer<typeof BridgeRequestSchema>;
export type BridgeResponse = z.infer<typeof BridgeResponseSchema>;
export type BridgeQuery = z.infer<typeof BridgeQuerySchema>;
export type BridgeQueryResult = z.infer<typeof BridgeQueryResultSchema>;
export type BridgeEvent = z.infer<typeof BridgeEventSchema>;

/**
 * Кадр знакомого типа, но с неизвестным именем.
 *
 * Нужен, чтобы отличать "плагин новее бота" от "прилетел мусор". Первое
 * нормально и молча игнорируется, второе стоит увидеть в логе.
 */
export type BridgeUnknown = { type: "unknown"; name: string };

export type BridgeMessage =
  | BridgeAuth
  | BridgeRequest
  | BridgeResponse
  | BridgeQuery
  | BridgeQueryResult
  | BridgeEvent
  | BridgeUnknown;

export function parseBridgeMessage(raw: string): BridgeMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  const type = (data as { type?: unknown })?.type;
  if (typeof type !== "string") return null;

  try {
    switch (type) {
      case "auth":
        return BridgeAuthSchema.parse(data);
      case "request":
        return BridgeRequestSchema.parse(data);
      case "response":
        return BridgeResponseSchema.parse(data);
      case "query":
        return BridgeQuerySchema.parse(data);
      case "queryResult":
        return BridgeQueryResultSchema.parse(data);
      case "event":
        return BridgeEventSchema.parse(data);
      default:
        return { type: "unknown", name: type };
    }
  } catch {
    return null;
  }
}
