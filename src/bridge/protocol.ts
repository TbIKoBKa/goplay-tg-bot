import { z } from "zod";

export const BridgeAuthSchema = z.object({
  type: z.literal("auth"),
  secret: z.string(),
  role: z.enum(["bridge", "api"]).default("bridge"),
});

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

export type BridgeAuth = z.infer<typeof BridgeAuthSchema>;
export type BridgeRequest = z.infer<typeof BridgeRequestSchema>;
export type BridgeResponse = z.infer<typeof BridgeResponseSchema>;

export type BridgeMessage = BridgeAuth | BridgeRequest | BridgeResponse;

export function parseBridgeMessage(raw: string): BridgeMessage | null {
  try {
    const data = JSON.parse(raw);
    const type = data?.type;
    if (type === "auth") return BridgeAuthSchema.parse(data);
    if (type === "request") return BridgeRequestSchema.parse(data);
    if (type === "response") return BridgeResponseSchema.parse(data);
    return null;
  } catch {
    return null;
  }
}
