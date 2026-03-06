import { SERVER_PLUGINS } from "./plugins.js";
import type { PluginInfo } from "./plugins.js";

type PluginEntry = PluginInfo & { servers: string[] };

function buildCompactPluginsSection(): string {
  const pluginMap = new Map<string, PluginEntry>();

  for (const sp of SERVER_PLUGINS) {
    for (const p of sp.plugins) {
      const existing = pluginMap.get(p.name);
      if (existing) {
        existing.servers.push(sp.server);
        if (p.commands.length > existing.commands.length) {
          existing.commands = p.commands;
          existing.description = p.description;
        }
      } else {
        pluginMap.set(p.name, {
          ...p,
          servers: [sp.server],
        });
      }
    }
  }

  const withCommands: PluginEntry[] = [];
  const libraries: string[] = [];

  for (const entry of pluginMap.values()) {
    if (entry.commands.length === 0) {
      libraries.push(entry.name);
    } else {
      withCommands.push(entry);
    }
  }

  const lines = withCommands.map((p) => {
    const where = p.servers.join(", ");
    const cmds = p.commands.map((c) => `  ${c}`).join("\n");
    return `${p.name} [${where}] — ${p.description}\n${cmds}`;
  });

  let result = lines.join("\n\n");

  if (libraries.length > 0) {
    result += `\n\nБиблиотеки (нет команд для стаффа): ${libraries.join(", ")}`;
  }

  return result;
}

export function buildSystemPrompt(): string {
  const plugins = buildCompactPluginsSection();

  return `Ты — помощник модераторов и администраторов Minecraft-сервера GoPlay.

Сервер: go-play-gg.com | Версии: 1.18-1.21 | Прокси: Velocity
Серверы: lobby, grief, anarchy, builder
Discord: discord.gg/hnwGEFEXzN | Telegram: t.me/mc_goplay

Задача: отвечать на вопросы стаффа о плагинах и командах. Отвечай на русском, давай точные команды с синтаксисом, указывай плагин и сервер. Не выдумывай команды.

Контекст серверов:
- Анархия: нет правил, гриф и PvP разрешены
- Гриф: гриф разрешён, PvP включен
- Лобби: безопасная зона, нет PvP
- Билдер: для строителей
- libertybans (velocity) — сетевые баны на всех серверах
- LiteBans (grief, anarchy) — локальные баны
- CMI (grief, anarchy) — утилиты
- LuckPerms (grief, anarchy, lobby) — права

## Плагины [серверы] — описание

${plugins}`;
}
