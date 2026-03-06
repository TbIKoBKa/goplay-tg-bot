import type { PluginInfo } from "./types.js";

export const LOBBY_PLUGINS: PluginInfo[] = [
  {
    name: "LuckPerms",
    description: "Управление правами и группами игроков",
    commands: [
      "/lp user <ник> permission set <право> true — выдать право",
      "/lp user <ник> permission unset <право> — забрать право",
      "/lp user <ник> parent set <группа> — установить группу",
      "/lp user <ник> parent add <группа> — добавить группу",
      "/lp user <ник> info — информация об игроке",
      "/lp group <группа> listmembers — список участников группы",
      "/lp editor — веб-редактор прав",
    ],
  },
  {
    name: "DeluxeHub",
    description: "Управление лобби — полёт, двойной прыжок, скорборд, защита от урона, блокировка действий",
    commands: [
      "/deluxehub reload — перезагрузка конфигурации",
    ],
  },
  {
    name: "Citizens",
    description: "Создание и управление NPC (неигровыми персонажами) для навигации и декора",
    commands: [
      "/npc create <имя> — создать NPC",
      "/npc remove — удалить выбранного NPC",
      "/npc list — список всех NPC",
      "/npc select <id> — выбрать NPC по ID",
      "/npc tp <id> — телепорт к NPC",
      "/npc skin <имя_скина> — установить скин NPC",
      "/npc lookclose — NPC смотрит на ближайшего игрока",
      "/npc name <имя> — переименовать NPC",
    ],
  },
  {
    name: "CommandNPC",
    description: "Привязка команд к NPC — при клике на NPC выполняется команда",
    commands: [
      "/cnpc add <команда> — добавить команду к выбранному NPC",
      "/cnpc remove <номер> — удалить команду",
      "/cnpc list — список команд NPC",
      "/cnpc clear — очистить все команды NPC",
    ],
  },
  {
    name: "HolographicDisplays",
    description: "Создание и управление голограммами (парящий текст в мире)",
    commands: [
      "/hd create <имя> <текст> — создать голограмму",
      "/hd delete <имя> — удалить голограмму",
      "/hd list — список всех голограмм",
      "/hd edit <имя> — редактировать голограмму",
      "/hd addline <имя> <текст> — добавить строку",
      "/hd removeline <имя> <номер> — удалить строку",
      "/hd setline <имя> <номер> <текст> — изменить строку",
      "/hd movehere <имя> — переместить голограмму к себе",
      "/hd reload — перезагрузка",
    ],
  },
  {
    name: "AdvancedHunt",
    description: "Система поиска сокровищ (подарков) в лобби — игроки ищут спрятанные предметы",
    commands: [
      "/hunt reload — перезагрузка",
      "/hunt create <имя> — создать точку сокровища",
      "/hunt delete <имя> — удалить точку",
      "/hunt list — список точек",
    ],
  },
  {
    name: "CraftHeads",
    description: "Декоративные головы — база данных кастомных голов для декора",
    commands: [
      "/heads — открыть меню голов",
      "/heads search <запрос> — поиск головы",
    ],
  },
  {
    name: "EpicGuard",
    description: "Защита от бот-атак — фильтрация подключений, географические ограничения, rate limiting",
    commands: [
      "/epicguard reload — перезагрузка",
      "/epicguard status — статус защиты",
      "/epicguard whitelist add <IP> — добавить IP в белый список",
      "/epicguard blacklist add <IP> — добавить IP в чёрный список",
    ],
  },
  {
    name: "GoPlayGosha",
    description: "AI-ассистент Гоша — NPC-бот в чате, отвечает на вопросы игроков о сервере",
    commands: [
      "/gosha reload — перезагрузка конфигурации",
      "/gosha status — статус бота и LLM-провайдеров",
      "/gosha say <сообщение> — отправить сообщение от имени Гоши",
      "/gosha spawn — создать NPC Гоши",
      "/gosha remove — удалить NPC Гоши",
      "/gosha debug — вкл/выкл режим отладки",
    ],
  },
  {
    name: "IPWhitelist",
    description: "Ограничение доступа по IP-адресу — только разрешённые IP могут подключиться",
    commands: [
      "/ipwl add <ник> — добавить игрока в IP-вайтлист",
      "/ipwl remove <ник> — удалить из IP-вайтлиста",
      "/ipwl list — список разрешённых",
      "/ipwl reload — перезагрузка",
    ],
  },
  {
    name: "VentureChat",
    description: "Система чата — каналы (local, global), форматирование, фильтры, личные сообщения",
    commands: [
      "/venturechat reload — перезагрузка",
      "/channel <канал> — переключить канал чата",
      "/chatreload — перезагрузка чата",
    ],
  },
  {
    name: "SkinsRestorer",
    description: "Управление скинами игроков на сервере",
    commands: [
      "/sr set <ник> <скин> — установить скин",
      "/sr clear <ник> — сбросить скин",
      "/sr reload — перезагрузка",
    ],
  },
  {
    name: "Vault",
    description: "API экономики и прав — используется другими плагинами. Библиотека, нет команд для стаффа",
    commands: [],
  },
  {
    name: "PlaceholderAPI",
    description: "API плейсхолдеров — позволяет плагинам использовать переменные вроде %player_name%. Библиотека",
    commands: [
      "/papi list — список зарегистрированных расширений",
      "/papi info <расширение> — информация о расширении",
      "/papi parse <ник> <текст> — проверить плейсхолдер",
      "/papi reload — перезагрузка",
    ],
  },
  {
    name: "ViaVersion",
    description: "Поддержка нескольких версий клиента (1.18-1.21) на одном сервере",
    commands: [
      "/viaversion — информация о плагине",
      "/viaversion list — список игроков и их версий клиента",
      "/viaversion reload — перезагрузка",
    ],
  },
  {
    name: "WorldEdit",
    description: "Редактирование мира — выделение, заполнение, копирование блоков",
    commands: [
      "//wand — получить инструмент выделения",
      "//set <блок> — заполнить выделение",
      "//replace <блок1> <блок2> — заменить блоки",
      "//copy — копировать",
      "//paste — вставить",
      "//undo — отменить",
      "//redo — повторить",
    ],
  },
  {
    name: "ProtocolLib",
    description: "Библиотека для работы с пакетами протокола Minecraft. Нет команд для стаффа",
    commands: [],
  },
  {
    name: "NBTAPI",
    description: "Библиотека для работы с NBT-данными предметов. Нет команд для стаффа",
    commands: [],
  },
  {
    name: "bStats",
    description: "Сбор анонимной статистики. Библиотека, нет команд для стаффа",
    commands: [],
  },
];
