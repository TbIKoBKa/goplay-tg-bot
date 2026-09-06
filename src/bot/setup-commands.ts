import type { Bot } from "grammy";

/**
 * Список команд в меню Telegram. Он один на всех: админских команд у бота
 * больше нет, для них есть панель Pterodactyl.
 */
const COMMANDS = [
  { command: "start", description: "Главное меню" },
  { command: "menu", description: "Главное меню" },
  { command: "help", description: "Помощь и контакты" },
];

export async function setupCommands(bot: Bot): Promise<void> {
  try {
    await bot.api.setMyCommands(COMMANDS, { scope: { type: "all_private_chats" } });
    console.log("[cmds] список команд обновлён");
  } catch (err) {
    console.error("[cmds] не смог обновить список команд:", err);
  }
}
