import type { InlineKeyboard } from "grammy";
import type { PrefsRepo } from "../db/repos/prefs";
import type { LinksRepo } from "../db/repos/links";
import type { PlayersRepo } from "../db/repos/players";
import type { RefsRepo } from "../db/repos/refs";
import type { StatCacheRepo } from "../db/repos/stat-cache";
import type { BridgeServer } from "../bridge/server";
import type { Config } from "../config";

/** Имя бота узнаём у Telegram при старте, поэтому оно приезжает изменяемой ссылкой. */
export type BotUsername = { value: string };

export type UiDeps = {
  botUsername: BotUsername;
  prefs: PrefsRepo;
  links: LinksRepo;
  players: PlayersRepo;
  refs: RefsRepo;
  statCache: StatCacheRepo;
  bridge: BridgeServer;
  config: Config;
};

export type MenuRequest = {
  chatId: number;
  action: string;
  arg: string;
  deps: UiDeps;
};

export type MenuView = {
  text: string;
  keyboard: InlineKeyboard;
  /** Всплывающая подсказка на нажатие кнопки. */
  toast?: string;
};

export type MenuHandler = (req: MenuRequest) => Promise<MenuView> | MenuView;
