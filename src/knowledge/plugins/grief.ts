import type { PluginInfo } from "./types.js";

export const GRIEF_PLUGINS: PluginInfo[] = [
  {
    name: "LuckPerms",
    description: "Управление правами и группами игроков",
    commands: [
      "/lp user <ник> permission set <право> true — выдать право игроку",
      "/lp user <ник> permission unset <право> — забрать право",
      "/lp user <ник> parent set <группа> — установить группу",
      "/lp user <ник> parent add <группа> — добавить группу",
      "/lp user <ник> info — информация об игроке",
      "/lp group <группа> listmembers — список участников группы",
      "/lp editor — веб-редактор прав",
    ],
  },
  {
    name: "LiteBans",
    description: "Система банов, мутов, киков и предупреждений",
    commands: [
      "/ban <ник> [причина] — перманентный бан",
      "/tempban <ник> <время> [причина] — временный бан (1d, 1h, 30m)",
      "/unban <ник> — разбан",
      "/mute <ник> [причина] — перманентный мут",
      "/tempmute <ник> <время> [причина] — временный мут",
      "/unmute <ник> — размут",
      "/kick <ник> [причина] — кик с сервера",
      "/warn <ник> [причина] — предупреждение",
      "/history <ник> — история наказаний",
      "/banlist — список банов",
      "/mutelist — список мутов",
    ],
  },
  {
    name: "CMI",
    description: "Основной плагин утилит — телепорт, геймод, инвентарь, время, погода, хилл",
    commands: [
      "/cmi tp <ник> <ник2> — телепорт игрока к другому",
      "/cmi tphere <ник> — телепорт игрока к себе",
      "/cmi fly <ник> — вкл/выкл полёт",
      "/cmi god <ник> — вкл/выкл бессмертие",
      "/cmi heal <ник> — вылечить",
      "/cmi feed <ник> — накормить",
      "/cmi gamemode <режим> <ник> — сменить геймод (survival/creative/adventure/spectator)",
      "/cmi invsee <ник> — просмотр инвентаря",
      "/cmi enderchest <ник> — просмотр эндер-сундука",
      "/cmi vanish — стать невидимым",
      "/cmi time set <время> — установить время",
      "/cmi weather <погода> — установить погоду",
      "/cmi spawn — телепорт на спавн",
      "/cmi setspawn — установить спавн",
      "/cmi warp <имя> — телепорт на варп",
      "/cmi setwarp <имя> — создать варп",
      "/cmi delwarp <имя> — удалить варп",
      "/cmi msg <ник> <сообщение> — личное сообщение",
      "/cmi broadcast <сообщение> — объявление",
    ],
  },
  {
    name: "CMILib",
    description: "Библиотека для CMI. Нет команд для стаффа",
    commands: [],
  },
  {
    name: "WorldGuard",
    description: "Защита регионов — создание, флаги, участники",
    commands: [
      "/rg define <имя> — создать регион (после выделения WorldEdit)",
      "/rg remove <имя> — удалить регион",
      "/rg addmember <регион> <ник> — добавить участника",
      "/rg removemember <регион> <ник> — удалить участника",
      "/rg addowner <регион> <ник> — добавить владельца",
      "/rg info <регион> — информация о регионе",
      "/rg list — список регионов",
      "/rg flag <регион> <флаг> <значение> — установить флаг (pvp, mob-spawning, build и др.)",
      "/rg tp <регион> — телепорт в регион",
    ],
  },
  {
    name: "WorldEdit",
    description: "Редактирование мира — выделение, заполнение, копирование блоков",
    commands: [
      "//wand — получить инструмент выделения",
      "//pos1 — установить первую точку",
      "//pos2 — установить вторую точку",
      "//set <блок> — заполнить выделение",
      "//replace <блок1> <блок2> — заменить блоки",
      "//copy — копировать",
      "//paste — вставить",
      "//undo — отменить",
      "//redo — повторить",
      "//drain <радиус> — убрать воду",
    ],
  },
  {
    name: "PlugManX",
    description: "Управление плагинами на лету — включение, отключение, перезагрузка",
    commands: [
      "/plugman list — список плагинов",
      "/plugman info <плагин> — информация о плагине",
      "/plugman reload <плагин> — перезагрузить плагин",
      "/plugman enable <плагин> — включить плагин",
      "/plugman disable <плагин> — выключить плагин",
      "/plugman restart <плагин> — перезапустить плагин",
    ],
  },
  {
    name: "GrimAC",
    description: "Античит — обнаружение читов (fly, speed, killaura и др.)",
    commands: [
      "/grim alerts — вкл/выкл оповещения о читерах",
      "/grim verbose — подробные оповещения",
      "/grim profile <ник> — профиль подозрительного игрока",
      "/grim reload — перезагрузка",
    ],
  },
  {
    name: "EpicReports",
    description: "Система жалоб — игроки жалуются, модераторы обрабатывают",
    commands: [
      "/report <ник> <причина> — пожаловаться на игрока",
      "/reports — просмотр жалоб (для модераторов)",
      "/reports clear — очистить обработанные жалобы",
    ],
  },
  {
    name: "CrazyCrates",
    description: "Система кейсов — создание, выдача ключей, настройка наград",
    commands: [
      "/crazycrates give physical <ник> <кейс> <кол-во> — выдать физический ключ",
      "/crazycrates give virtual <ник> <кейс> <кол-во> — выдать виртуальный ключ",
      "/crazycrates set <кейс> — установить местоположение кейса",
      "/crazycrates remove <кейс> — удалить местоположение",
      "/crazycrates list — список кейсов",
      "/crazycrates reload — перезагрузка",
    ],
  },
  {
    name: "UltimateClans",
    description: "Система кланов — создание, управление, войны",
    commands: [
      "/clan create <название> — создать клан",
      "/clan disband — расформировать клан",
      "/clan invite <ник> — пригласить в клан",
      "/clan kick <ник> — выгнать из клана",
      "/clan info [клан] — информация о клане",
      "/clan admin reload — перезагрузка (админ)",
    ],
  },
  {
    name: "DiscordSRV",
    description: "Связь Minecraft и Discord — синхронизация чата, привязка аккаунтов",
    commands: [
      "/discord link — привязать аккаунт Discord",
      "/discord linked <ник> — проверить привязку игрока",
      "/discord reload — перезагрузка",
    ],
  },
  {
    name: "CombatLogX",
    description: "Защита от выхода в бою — наказание за дисконнект во время PvP",
    commands: [
      "/combatlogx toggle — вкл/выкл для себя (если есть право)",
      "/ct reload — перезагрузка",
    ],
  },
  {
    name: "ACubelets",
    description: "Система кубелетов (лутбоксов) — анимированные награды",
    commands: [
      "/acubelets give <ник> <тип> <кол-во> — выдать кубелет",
      "/acubelets reload — перезагрузка",
    ],
  },
  {
    name: "ajLeaderboards",
    description: "Голографические таблицы лидеров (топ игроков по статистикам)",
    commands: [
      "/ajlb create <имя> <тип> — создать таблицу лидеров",
      "/ajlb delete <имя> — удалить таблицу",
      "/ajlb list — список таблиц",
      "/ajlb reload — перезагрузка",
    ],
  },
  {
    name: "AntiRedstoneClock",
    description: "Защита от редстоун-часов — предотвращает лаг от быстрых редстоун-механизмов",
    commands: [
      "/arc reload — перезагрузка",
    ],
  },
  {
    name: "BAirDrop",
    description: "Система аирдропов — случайные сбросы лута с неба",
    commands: [
      "/bairdrop start — запустить аирдроп",
      "/bairdrop stop — остановить аирдроп",
      "/bairdrop reload — перезагрузка",
    ],
  },
  {
    name: "BetterTalismans",
    description: "Система талисманов — предметы с пассивными бонусами",
    commands: [
      "/talisman give <ник> <талисман> — выдать талисман",
      "/talisman list — список талисманов",
      "/talisman reload — перезагрузка",
    ],
  },
  {
    name: "BlueSlimeCore",
    description: "Библиотека для плагинов серии Blue. Нет команд для стаффа",
    commands: [],
  },
  {
    name: "Chunky",
    description: "Предгенерация чанков — генерирует мир заранее для снижения лагов",
    commands: [
      "/chunky start — начать предгенерацию",
      "/chunky pause — приостановить",
      "/chunky continue — продолжить",
      "/chunky cancel — отменить",
      "/chunky radius <радиус> — установить радиус",
      "/chunky center <x> <z> — установить центр",
      "/chunky world <мир> — выбрать мир",
      "/chunky progress — прогресс генерации",
    ],
  },
  {
    name: "CooldownsX",
    description: "Кулдауны на команды и действия — ограничение частоты использования",
    commands: [
      "/cooldownsx reload — перезагрузка",
    ],
  },
  {
    name: "CommandTimer",
    description: "Автоматическое выполнение команд по расписанию (cron-задачи)",
    commands: [
      "/commandtimer list — список таймеров",
      "/commandtimer reload — перезагрузка",
    ],
  },
  {
    name: "DecentHolograms",
    description: "Голограммы — парящий текст, анимации, кликабельные голограммы",
    commands: [
      "/dh create <имя> <текст> — создать голограмму",
      "/dh delete <имя> — удалить",
      "/dh list — список голограмм",
      "/dh edit <имя> — редактировать",
      "/dh addline <имя> <текст> — добавить строку",
      "/dh setline <имя> <номер> <текст> — изменить строку",
      "/dh movehere <имя> — переместить к себе",
      "/dh reload — перезагрузка",
    ],
  },
  {
    name: "DeluxeMenus",
    description: "Создание кастомных GUI-меню с командами и условиями",
    commands: [
      "/dm open <меню> [ник] — открыть меню игроку",
      "/dm list — список меню",
      "/dm reload — перезагрузка",
    ],
  },
  {
    name: "DeathMessages",
    description: "Кастомные сообщения о смерти — форматирование и настройка",
    commands: [
      "/deathmessages reload — перезагрузка",
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
    name: "HideStream",
    description: "Скрытие сообщений входа/выхода игроков",
    commands: [
      "/hidestream reload — перезагрузка",
    ],
  },
  {
    name: "IllegalStack",
    description: "Защита от нелегальных стаков предметов и дюпов",
    commands: [
      "/illegalstack reload — перезагрузка",
    ],
  },
  {
    name: "InsaneAnnouncer",
    description: "Автоматические объявления в чате по расписанию",
    commands: [
      "/insaneannouncer reload — перезагрузка",
    ],
  },
  {
    name: "IPWhitelist",
    description: "Ограничение доступа по IP-адресу",
    commands: [
      "/ipwl add <ник> — добавить игрока в IP-вайтлист",
      "/ipwl remove <ник> — удалить из IP-вайтлиста",
      "/ipwl list — список разрешённых",
      "/ipwl reload — перезагрузка",
    ],
  },
  {
    name: "IRandomTeleport",
    description: "Случайный телепорт — телепортирует игрока в случайное место на карте",
    commands: [
      "/irtp — случайный телепорт",
      "/irtp <ник> — телепортировать игрока",
      "/irtp reload — перезагрузка",
    ],
  },
  {
    name: "LagFixer",
    description: "Оптимизация производительности — уменьшение лагов, контроль сущностей и тиков",
    commands: [
      "/lagfixer reload — перезагрузка",
      "/lagfixer status — статус оптимизаций",
    ],
  },
  {
    name: "MessageAnnouncer",
    description: "Объявления в ActionBar, Title, BossBar по расписанию",
    commands: [
      "/messageannouncer reload — перезагрузка",
    ],
  },
  {
    name: "Multiverse-Core",
    description: "Управление мирами — создание, удаление, телепорт между мирами",
    commands: [
      "/mv list — список миров",
      "/mv create <имя> <тип> — создать мир (normal/nether/end)",
      "/mv delete <имя> — удалить мир",
      "/mv tp <ник> <мир> — телепорт в мир",
      "/mv import <имя> <тип> — импортировать существующий мир",
      "/mv setspawn — установить спавн мира",
      "/mv info <мир> — информация о мире",
      "/mv reload — перезагрузка",
    ],
  },
  {
    name: "MyCommand",
    description: "Создание кастомных команд с алиасами и скриптами",
    commands: [
      "/mycommand reload — перезагрузка",
    ],
  },
  {
    name: "mcWorkman",
    description: "Система работ/профессий для игроков",
    commands: [
      "/workman reload — перезагрузка",
    ],
  },
  {
    name: "Pl-Hide-Free",
    description: "Скрытие списка плагинов от команды /plugins для обычных игроков",
    commands: [],
  },
  {
    name: "PlayerPoints",
    description: "Система очков/валюты — используется для магазинов и наград",
    commands: [
      "/points give <ник> <кол-во> — выдать очки",
      "/points take <ник> <кол-во> — забрать очки",
      "/points set <ник> <кол-во> — установить очки",
      "/points look <ник> — посмотреть баланс",
      "/points reset <ник> — сбросить очки",
      "/points reload — перезагрузка",
    ],
  },
  {
    name: "PrimeAlchemist",
    description: "Кастомная алхимия — расширенная система зельеварения",
    commands: [
      "/primealchemist reload — перезагрузка",
    ],
  },
  {
    name: "PrimeSeller",
    description: "Система продажи предметов — автоматическая продажа из инвентаря",
    commands: [
      "/primeseller reload — перезагрузка",
    ],
  },
  {
    name: "QurBeaconEvent",
    description: "Ивент-система с маяками — специальные события на сервере",
    commands: [
      "/qurbeacon start — запустить ивент",
      "/qurbeacon stop — остановить ивент",
      "/qurbeacon reload — перезагрузка",
    ],
  },
  {
    name: "RoseGarden",
    description: "Библиотека для плагинов серии Rose. Нет команд для стаффа",
    commands: [],
  },
  {
    name: "SkinsRestorer",
    description: "Управление скинами игроков",
    commands: [
      "/sr set <ник> <скин> — установить скин",
      "/sr clear <ник> — сбросить скин",
      "/sr reload — перезагрузка",
    ],
  },
  {
    name: "TAB",
    description: "Настройка TAB-листа (список игроков) — префиксы, суффиксы, сортировка, хедер/футер",
    commands: [
      "/tab reload — перезагрузка",
      "/tab announce <текст> — объявление в TAB",
      "/tab scoreboard toggle — вкл/выкл скорборд",
      "/tab bossbar toggle — вкл/выкл боссбар",
    ],
  },
  {
    name: "UltimateServerProtector",
    description: "Защита сервера — блокировка опасных команд, защита от OP-абьюза",
    commands: [
      "/usp reload — перезагрузка",
    ],
  },
  {
    name: "utilm",
    description: "Утилиты для разработки. Библиотека, нет команд для стаффа",
    commands: [],
  },
  {
    name: "Vault",
    description: "API экономики и прав — используется другими плагинами. Библиотека, нет команд для стаффа",
    commands: [],
  },
  {
    name: "VentureChat",
    description: "Система чата — каналы, форматирование, фильтры, личные сообщения",
    commands: [
      "/venturechat reload — перезагрузка",
      "/channel <канал> — переключить канал чата",
      "/chatreload — перезагрузка чата",
    ],
  },
  {
    name: "ViaVersion",
    description: "Поддержка нескольких версий клиента на одном сервере",
    commands: [
      "/viaversion — информация о плагине",
      "/viaversion list — список игроков и их версий",
      "/viaversion reload — перезагрузка",
    ],
  },
  {
    name: "VoidSpawn",
    description: "Телепорт при падении в войд — возвращает на спавн вместо смерти",
    commands: [
      "/voidspawn reload — перезагрузка",
      "/voidspawn set <мир> — установить точку респавна для мира",
    ],
  },
  {
    name: "WorldBorder",
    description: "Управление границей мира — размер, центр, анимация",
    commands: [
      "/worldborder set <размер> [время] — установить размер границы",
      "/worldborder center <x> <z> — установить центр",
      "/worldborder add <блоки> [время] — увеличить границу",
      "/worldborder get — текущий размер",
    ],
  },
  {
    name: "zAuctionHouseV3",
    description: "Аукцион — игроки выставляют предметы на продажу",
    commands: [
      "/ah — открыть аукцион",
      "/ah sell <цена> — выставить предмет на продажу",
      "/ah expired — просроченные лоты",
      "/ah reload — перезагрузка",
    ],
  },
  {
    name: "PlaceholderAPI",
    description: "API плейсхолдеров — переменные вроде %player_name%. Библиотека",
    commands: [
      "/papi list — список расширений",
      "/papi info <расширение> — информация",
      "/papi parse <ник> <текст> — проверить плейсхолдер",
      "/papi reload — перезагрузка",
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
