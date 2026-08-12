import type { Bot } from "grammy";
import type { Config } from "../config";

type Cmd = { command: string; description: string };

// Команды, видимые ВСЕМ игрокам в меню бота.
const PUBLIC_COMMANDS: Cmd[] = [
  { command: "start", description: "О боте и подписка" },
  { command: "link", description: "Привязать игровой аккаунт" },
  { command: "subscribe", description: "Подписаться на ивенты" },
  { command: "unsubscribe", description: "Отписаться от ивентов" },
  { command: "help", description: "Помощь" },
];

const MOD_COMMANDS: Cmd[] = [
  { command: "list", description: "Игроки онлайн" },
  { command: "say", description: "Сообщение на сервер" },
  { command: "ban", description: "Забанить" },
  { command: "unban", description: "Разбанить" },
  { command: "tempban", description: "Временный бан" },
  { command: "kick", description: "Кикнуть" },
  { command: "mute", description: "Замутить" },
  { command: "tempmute", description: "Временный мут" },
  { command: "unmute", description: "Размутить" },
];

const ADMIN_COMMANDS: Cmd[] = [
  { command: "send", description: "Перекинуть игрока на сервер" },
  { command: "op", description: "Выдать OP" },
  { command: "deop", description: "Забрать OP" },
  { command: "gm", description: "Сменить режим игры" },
  { command: "tp", description: "Телепорт" },
  { command: "whitelist", description: "Управление вайтлистом" },
  { command: "reload", description: "Перезагрузить плагины" },
  { command: "maintenance", description: "Режим тех. работ" },
];

/**
 * Прячет админ/мод команды из меню обычных игроков через command scopes:
 *  - всем приватным чатам — только PUBLIC_COMMANDS;
 *  - в личках админов/модераторов — полный набор.
 * Вызывать после старта бота (например, в onStart).
 */
export async function setupCommands(
  bot: Bot,
  access: Config["access"],
): Promise<void> {
  try {
    await bot.api.setMyCommands(PUBLIC_COMMANDS, {
      scope: { type: "all_private_chats" },
    });

    const modMenu = [...PUBLIC_COMMANDS, ...MOD_COMMANDS];
    const adminMenu = [...PUBLIC_COMMANDS, ...MOD_COMMANDS, ...ADMIN_COMMANDS];

    for (const id of access.moderators) {
      try {
        await bot.api.setMyCommands(modMenu, { scope: { type: "chat", chat_id: id } });
      } catch (err) {
        console.error(`[cmds] mod scope ${id} failed:`, err);
      }
    }
    for (const id of access.admins) {
      try {
        await bot.api.setMyCommands(adminMenu, { scope: { type: "chat", chat_id: id } });
      } catch (err) {
        console.error(`[cmds] admin scope ${id} failed:`, err);
      }
    }
    console.log("[cmds] command scopes set");
  } catch (err) {
    console.error("[cmds] setup failed:", err);
  }
}
