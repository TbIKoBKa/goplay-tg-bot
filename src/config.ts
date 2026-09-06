import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const ServerSchema = z.object({
  /** Имя сервера так, как он зарегистрирован в velocity.toml. */
  id: z.string().min(1),
  title: z.string().min(1),
  hint: z.string().default(""),
});

const ConfigSchema = z.object({
  servers: z.array(ServerSchema).min(1),
  /**
   * Где стоит GoPlayTelegram. Бот не знает, на каком режиме игрок набрал /tg,
   * поэтому код привязки предъявляется всем сразу. Список отдельный от servers:
   * лобби игроку в меню не показываем, а команду там набрать можно.
   */
  link_servers: z.array(z.string().min(1)).min(1),
  links: z.object({
    ip: z.string().min(1),
    site: z.string().min(1),
    discord: z.string().min(1),
    telegram: z.string().min(1),
    support: z.string().min(1),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
export type ServerConfig = z.infer<typeof ServerSchema>;

const EnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN обязателен"),
  BRIDGE_SECRET: z.string().min(1, "BRIDGE_SECRET обязателен"),
  BRIDGE_WS_PORT: z.coerce.number().int().positive().default(8765),
  /** Railway подставляет свой порт сюда и он важнее BRIDGE_WS_PORT. */
  PORT: z.coerce.number().int().positive().optional(),
  /** Рассылка анонсов: POST /notify на публичный порт моста. Без секрета выключена. */
  NOTIFY_SECRET: z.string().optional(),
  DATABASE_FILE: z.string().default("goplay.db"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadConfig(): Config {
  const configPath = resolve(import.meta.dir, "..", "config.yaml");
  const raw = readFileSync(configPath, "utf-8");
  return ConfigSchema.parse(parseYaml(raw));
}

export function loadEnv(): Env {
  return EnvSchema.parse(process.env);
}
