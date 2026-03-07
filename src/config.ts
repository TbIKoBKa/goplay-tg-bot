import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const LLMProviderConfigSchema = z.object({
  model: z.string(),
});

const ConfigSchema = z.object({
  servers: z.array(z.string()).min(1),
  llm: z.object({
    priority: z.array(z.string()).min(1),
    max_tokens: z.number().int().positive().default(1024),
    providers: z.record(z.string(), LLMProviderConfigSchema),
  }),
  access: z.object({
    admins: z.array(z.number()),
    moderators: z.array(z.number()),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

const EnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  GROQ_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  BRIDGE_SECRET: z.string().min(1, "BRIDGE_SECRET is required"),
  BRIDGE_WS_PORT: z.coerce.number().int().positive().default(8765),
  PORT: z.coerce.number().int().positive().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadConfig(): Config {
  const configPath = resolve(import.meta.dir, "..", "config.yaml");
  const raw = readFileSync(configPath, "utf-8");
  const parsed = parseYaml(raw);
  return ConfigSchema.parse(parsed);
}

export function loadEnv(): Env {
  return EnvSchema.parse(process.env);
}
