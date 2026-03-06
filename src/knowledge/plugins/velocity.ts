import type { PluginInfo } from "./types.js";

export const VELOCITY_PLUGINS: PluginInfo[] = [
  {
    name: "libertybans",
    description: "Сетевые баны, муты, кики — действуют на всех серверах сразу через прокси",
    commands: [
      "/libertybans ban <ник> [причина] — сетевой перманентный бан",
      "/libertybans ban <ник> <время> [причина] — сетевой временный бан",
      "/libertybans unban <ник> — сетевой разбан",
      "/libertybans mute <ник> [причина] — сетевой перманентный мут",
      "/libertybans mute <ник> <время> [причина] — сетевой временный мут",
      "/libertybans unmute <ник> — сетевой размут",
      "/libertybans kick <ник> [причина] — сетевой кик",
      "/libertybans warn <ник> [причина] — предупреждение",
      "/libertybans history <ник> — история наказаний игрока",
      "/libertybans blame <ник> — кто наказал игрока",
      "/libertybans banlist — список активных банов",
      "/libertybans mutelist — список активных мутов",
      "/libertybans reload — перезагрузка конфигурации",
    ],
  },
  {
    name: "maintenance",
    description: "Режим обслуживания — блокирует вход обычных игроков на сервер",
    commands: [
      "/maintenance on — включить режим обслуживания",
      "/maintenance off — выключить режим обслуживания",
      "/maintenance toggle — переключить",
      "/maintenance add <ник> — добавить игрока в whitelist обслуживания",
      "/maintenance remove <ник> — удалить из whitelist обслуживания",
      "/maintenance list — список игроков в whitelist обслуживания",
      "/maintenance setmotd <текст> — установить MOTD на время обслуживания",
      "/maintenance reload — перезагрузка",
    ],
  },
  {
    name: "limboauth",
    description: "Система авторизации игроков (регистрация, логин, 2FA)",
    commands: [
      "/limboauth reload — перезагрузка конфигурации",
      "/limboauth unregister <ник> — удалить регистрацию игрока",
      "/limboauth changepassword <ник> <новый_пароль> — сменить пароль игроку",
      "/limboauth forcelogin <ник> — принудительный логин",
    ],
  },
  {
    name: "limboapi",
    description: "API для создания Limbo-серверов (виртуальные серверы для авторизации). Библиотека для limboauth и limbofilter",
    commands: [],
  },
  {
    name: "limbofilter",
    description: "Фильтрация ботов — проверяет игроков при входе (captcha, проверка клиента)",
    commands: [
      "/limbofilter reload — перезагрузка",
      "/limbofilter stats — статистика фильтрации",
    ],
  },
  {
    name: "sayanvanish",
    description: "Ванишь для стаффа — полная невидимость для игроков",
    commands: [
      "/vanish — стать невидимым / видимым",
      "/vanish <ник> — переключить ванишь другому игроку",
      "/vanish list — список игроков в ванише",
    ],
  },
  {
    name: "minimotd-velocity",
    description: "Настройка MOTD (сообщение в списке серверов), иконки, фейковый онлайн",
    commands: [
      "/minimotd reload — перезагрузка MOTD",
    ],
  },
  {
    name: "skinsrestorer",
    description: "Управление скинами игроков (работает на всей сети через прокси)",
    commands: [
      "/sr set <ник> <скин> — установить скин игроку",
      "/sr clear <ник> — сбросить скин",
      "/sr url <ник> <url> — установить скин по URL",
      "/sr status — статус плагина",
      "/sr reload — перезагрузка",
    ],
  },
  {
    name: "slashhub",
    description: "Команда /hub для быстрого возврата в лобби",
    commands: [
      "/hub — вернуться в лобби",
      "/lobby — алиас для /hub",
    ],
  },
  {
    name: "bStats",
    description: "Сбор анонимной статистики использования плагинов. Библиотека, нет команд для стаффа",
    commands: [],
  },
];
