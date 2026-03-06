import type { PluginInfo } from "./types.js";

export const ANARCHY_PLUGINS: PluginInfo[] = [
  // === Права, баны, утилиты (общие с Grief) ===
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
    description: "Основной плагин утилит — телепорт, геймод, инвентарь, время, погода",
    commands: [
      "/cmi tp <ник> <ник2> — телепорт игрока к другому",
      "/cmi tphere <ник> — телепорт игрока к себе",
      "/cmi fly <ник> — вкл/выкл полёт",
      "/cmi god <ник> — вкл/выкл бессмертие",
      "/cmi heal <ник> — вылечить",
      "/cmi feed <ник> — накормить",
      "/cmi gamemode <режим> <ник> — сменить геймод",
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
      "/rg define <имя> — создать регион",
      "/rg remove <имя> — удалить регион",
      "/rg addmember <регион> <ник> — добавить участника",
      "/rg removemember <регион> <ник> — удалить участника",
      "/rg addowner <регион> <ник> — добавить владельца",
      "/rg info <регион> — информация о регионе",
      "/rg list — список регионов",
      "/rg flag <регион> <флаг> <значение> — установить флаг",
      "/rg tp <регион> — телепорт в регион",
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
    name: "PlugManX",
    description: "Управление плагинами на лету",
    commands: [
      "/plugman list — список плагинов",
      "/plugman info <плагин> — информация о плагине",
      "/plugman reload <плагин> — перезагрузить плагин",
      "/plugman enable <плагин> — включить плагин",
      "/plugman disable <плагин> — выключить плагин",
    ],
  },
  {
    name: "GrimAC",
    description: "Античит — обнаружение читов",
    commands: [
      "/grim alerts — вкл/выкл оповещения",
      "/grim verbose — подробные оповещения",
      "/grim profile <ник> — профиль игрока",
      "/grim reload — перезагрузка",
    ],
  },
  {
    name: "CoreProtect",
    description: "Логирование действий — блоки, контейнеры, чат, взаимодействия",
    commands: [
      "/co inspect — режим инспекции (клик по блоку)",
      "/co rollback u:<ник> t:<время> r:<радиус> — откат действий",
      "/co restore u:<ник> t:<время> r:<радиус> — восстановление",
      "/co lookup u:<ник> t:<время> — поиск действий",
      "/co purge t:<время> — очистить старые данные",
      "/co status — статус базы данных",
    ],
  },
  {
    name: "MythicMobs",
    description: "Кастомные мобы — создание, спавн, настройка поведения",
    commands: [
      "/mm mobs list — список мобов",
      "/mm mobs spawn <моб> [уровень] [кол-во] — заспавнить моба",
      "/mm items list — список кастомных предметов",
      "/mm items give <ник> <предмет> [кол-во] — выдать предмет",
      "/mm reload — перезагрузка",
    ],
  },

  // === Плагины общие с Grief ===
  {
    name: "CrazyCrates",
    description: "Система кейсов — создание, выдача ключей, настройка наград",
    commands: [
      "/crazycrates give physical <ник> <кейс> <кол-во> — выдать физический ключ",
      "/crazycrates give virtual <ник> <кейс> <кол-во> — выдать виртуальный ключ",
      "/crazycrates set <кейс> — установить местоположение кейса",
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
      "/discord linked <ник> — проверить привязку",
      "/discord reload — перезагрузка",
    ],
  },
  {
    name: "CombatLogX",
    description: "Защита от выхода в бою",
    commands: [
      "/combatlogx toggle — вкл/выкл для себя",
      "/ct reload — перезагрузка",
    ],
  },
  {
    name: "EpicReports",
    description: "Система жалоб",
    commands: [
      "/report <ник> <причина> — пожаловаться на игрока",
      "/reports — просмотр жалоб (для модераторов)",
    ],
  },
  {
    name: "ACubelets",
    description: "Система кубелетов (лутбоксов)",
    commands: [
      "/acubelets give <ник> <тип> <кол-во> — выдать кубелет",
      "/acubelets reload — перезагрузка",
    ],
  },
  {
    name: "ajLeaderboards",
    description: "Голографические таблицы лидеров",
    commands: [
      "/ajlb create <имя> <тип> — создать таблицу лидеров",
      "/ajlb delete <имя> — удалить",
      "/ajlb list — список таблиц",
      "/ajlb reload — перезагрузка",
    ],
  },
  {
    name: "AntiRedstoneClock",
    description: "Защита от редстоун-часов",
    commands: [
      "/arc reload — перезагрузка",
    ],
  },
  {
    name: "BAirDrop",
    description: "Система аирдропов — случайные сбросы лута",
    commands: [
      "/bairdrop start — запустить аирдроп",
      "/bairdrop stop — остановить",
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
    name: "Chunky",
    description: "Предгенерация чанков",
    commands: [
      "/chunky start — начать предгенерацию",
      "/chunky pause — приостановить",
      "/chunky continue — продолжить",
      "/chunky cancel — отменить",
      "/chunky radius <радиус> — установить радиус",
      "/chunky world <мир> — выбрать мир",
    ],
  },
  {
    name: "CooldownsX",
    description: "Кулдауны на команды и действия",
    commands: [
      "/cooldownsx reload — перезагрузка",
    ],
  },
  {
    name: "CommandTimer",
    description: "Автоматическое выполнение команд по расписанию",
    commands: [
      "/commandtimer list — список таймеров",
      "/commandtimer reload — перезагрузка",
    ],
  },
  {
    name: "DecentHolograms",
    description: "Голограммы — парящий текст, анимации",
    commands: [
      "/dh create <имя> <текст> — создать голограмму",
      "/dh delete <имя> — удалить",
      "/dh list — список голограмм",
      "/dh movehere <имя> — переместить к себе",
      "/dh reload — перезагрузка",
    ],
  },
  {
    name: "DeluxeMenus",
    description: "Кастомные GUI-меню",
    commands: [
      "/dm open <меню> [ник] — открыть меню",
      "/dm list — список меню",
      "/dm reload — перезагрузка",
    ],
  },
  {
    name: "DeathMessages",
    description: "Кастомные сообщения о смерти",
    commands: [
      "/deathmessages reload — перезагрузка",
    ],
  },
  {
    name: "GoPlayGosha",
    description: "AI-ассистент Гоша — NPC-бот в чате, отвечает на вопросы игроков",
    commands: [
      "/gosha reload — перезагрузка",
      "/gosha status — статус бота",
      "/gosha say <сообщение> — отправить от имени Гоши",
      "/gosha spawn — создать NPC",
      "/gosha remove — удалить NPC",
      "/gosha debug — режим отладки",
    ],
  },
  {
    name: "HideStream",
    description: "Скрытие сообщений входа/выхода",
    commands: [
      "/hidestream reload — перезагрузка",
    ],
  },
  {
    name: "IllegalStack",
    description: "Защита от нелегальных стаков предметов",
    commands: [
      "/illegalstack reload — перезагрузка",
    ],
  },
  {
    name: "InsaneAnnouncer",
    description: "Автоматические объявления в чате",
    commands: [
      "/insaneannouncer reload — перезагрузка",
    ],
  },
  {
    name: "IPWhitelist",
    description: "Ограничение доступа по IP-адресу",
    commands: [
      "/ipwl add <ник> — добавить в IP-вайтлист",
      "/ipwl remove <ник> — удалить из IP-вайтлиста",
      "/ipwl list — список разрешённых",
      "/ipwl reload — перезагрузка",
    ],
  },
  {
    name: "IRandomTeleport",
    description: "Случайный телепорт",
    commands: [
      "/irtp — случайный телепорт",
      "/irtp <ник> — телепортировать игрока",
      "/irtp reload — перезагрузка",
    ],
  },
  {
    name: "LagFixer",
    description: "Оптимизация производительности",
    commands: [
      "/lagfixer reload — перезагрузка",
      "/lagfixer status — статус оптимизаций",
    ],
  },
  {
    name: "MessageAnnouncer",
    description: "Объявления в ActionBar, Title, BossBar",
    commands: [
      "/messageannouncer reload — перезагрузка",
    ],
  },
  {
    name: "Multiverse-Core",
    description: "Управление мирами",
    commands: [
      "/mv list — список миров",
      "/mv create <имя> <тип> — создать мир",
      "/mv delete <имя> — удалить мир",
      "/mv tp <ник> <мир> — телепорт в мир",
      "/mv reload — перезагрузка",
    ],
  },
  {
    name: "MyCommand",
    description: "Создание кастомных команд",
    commands: [
      "/mycommand reload — перезагрузка",
    ],
  },
  {
    name: "mcWorkman",
    description: "Система работ/профессий",
    commands: [
      "/workman reload — перезагрузка",
    ],
  },
  {
    name: "Pl-Hide-Free",
    description: "Скрытие списка плагинов от обычных игроков",
    commands: [],
  },
  {
    name: "PlayerPoints",
    description: "Система очков/валюты",
    commands: [
      "/points give <ник> <кол-во> — выдать очки",
      "/points take <ник> <кол-во> — забрать очки",
      "/points set <ник> <кол-во> — установить",
      "/points look <ник> — посмотреть баланс",
      "/points reload — перезагрузка",
    ],
  },
  {
    name: "PrimeAlchemist",
    description: "Кастомная алхимия",
    commands: [
      "/primealchemist reload — перезагрузка",
    ],
  },
  {
    name: "PrimeSeller",
    description: "Автоматическая продажа предметов",
    commands: [
      "/primeseller reload — перезагрузка",
    ],
  },
  {
    name: "QurBeaconEvent",
    description: "Ивент-система с маяками",
    commands: [
      "/qurbeacon start — запустить ивент",
      "/qurbeacon stop — остановить",
      "/qurbeacon reload — перезагрузка",
    ],
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
    description: "Настройка TAB-листа — префиксы, суффиксы, сортировка",
    commands: [
      "/tab reload — перезагрузка",
      "/tab announce <текст> — объявление в TAB",
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
    name: "VentureChat",
    description: "Система чата — каналы, форматирование, фильтры",
    commands: [
      "/venturechat reload — перезагрузка",
      "/channel <канал> — переключить канал",
    ],
  },
  {
    name: "ViaVersion",
    description: "Поддержка нескольких версий клиента",
    commands: [
      "/viaversion list — список игроков и их версий",
      "/viaversion reload — перезагрузка",
    ],
  },
  {
    name: "VoidSpawn",
    description: "Телепорт при падении в войд",
    commands: [
      "/voidspawn reload — перезагрузка",
      "/voidspawn set <мир> — установить точку респавна",
    ],
  },
  {
    name: "WorldBorder",
    description: "Управление границей мира",
    commands: [
      "/worldborder set <размер> [время] — установить размер",
      "/worldborder center <x> <z> — установить центр",
    ],
  },
  {
    name: "zAuctionHouseV3",
    description: "Аукцион — игроки выставляют предметы на продажу",
    commands: [
      "/ah — открыть аукцион",
      "/ah sell <цена> — выставить предмет",
      "/ah reload — перезагрузка",
    ],
  },

  // === Плагины уникальные для Anarchy ===
  {
    name: "AdvancedEnchantments",
    description: "Кастомные зачарования — расширенная система энчантов с уникальными эффектами",
    commands: [
      "/ae give <ник> <энчант> <уровень> — выдать кастомный энчант",
      "/ae list — список всех кастомных энчантов",
      "/ae giveitem <ник> <предмет> — выдать предмет с энчантами",
      "/ae givebook <ник> <энчант> <уровень> <шанс> — выдать книгу энчанта",
      "/ae reload — перезагрузка",
    ],
  },
  {
    name: "AkyloffCheck",
    description: "Система проверки игроков — вызов на проверку на читы",
    commands: [
      "/check <ник> — вызвать игрока на проверку",
      "/check accept — принять проверку",
      "/check deny — отказаться от проверки",
      "/check timer <ник> — таймер проверки",
    ],
  },
  {
    name: "AntiWorldDownloader",
    description: "Защита от скачивания карты мира через мод World Downloader",
    commands: [],
  },
  {
    name: "BanBottleExp",
    description: "Запрет бутылок опыта — предотвращает дюп через бутылки",
    commands: [],
  },
  {
    name: "BanTotem",
    description: "Запрет или ограничение тотемов бессмертия",
    commands: [],
  },
  {
    name: "BLib",
    description: "Библиотека для плагинов серии B. Нет команд для стаффа",
    commands: [],
  },
  {
    name: "BSpawner",
    description: "Управление спавнерами — добыча, установка, настройка спавнеров мобов",
    commands: [
      "/bspawner give <ник> <моб> [кол-во] — выдать спавнер",
      "/bspawner reload — перезагрузка",
    ],
  },
  {
    name: "CFShards",
    description: "Система осколков/валюты — дополнительная игровая валюта",
    commands: [
      "/cfshards give <ник> <кол-во> — выдать осколки",
      "/cfshards take <ник> <кол-во> — забрать осколки",
      "/cfshards set <ник> <кол-во> — установить количество",
      "/cfshards reload — перезагрузка",
    ],
  },
  {
    name: "ClearLag",
    description: "Очистка лагающих сущностей — автоматическое удаление дропа и мобов",
    commands: [
      "/lagg clear — очистить дроп на земле",
      "/lagg killmobs — убить мобов",
      "/lagg area <радиус> — очистить область",
      "/lagg gc — запустить сборку мусора",
      "/lagg check — проверить количество сущностей",
      "/lagg reload — перезагрузка",
    ],
  },
  {
    name: "CraftEnhance",
    description: "Кастомные рецепты крафта — добавление новых рецептов",
    commands: [
      "/craftenhance — открыть меню рецептов",
      "/craftenhance reload — перезагрузка",
    ],
  },
  {
    name: "CrazyEnvoys",
    description: "Система энвоев — случайные сундуки с лутом появляются на карте",
    commands: [
      "/envoy start — запустить энвой",
      "/envoy stop — остановить энвой",
      "/envoy time — время до следующего энвоя",
      "/envoy reload — перезагрузка",
    ],
  },
  {
    name: "EpicGuard",
    description: "Защита от бот-атак — фильтрация подключений, rate limiting",
    commands: [
      "/epicguard reload — перезагрузка",
      "/epicguard status — статус защиты",
      "/epicguard whitelist add <IP> — добавить IP в белый список",
      "/epicguard blacklist add <IP> — добавить IP в чёрный список",
    ],
  },
  {
    name: "GravesX",
    description: "Могилы — при смерти создаётся могила с предметами игрока",
    commands: [
      "/graves list [ник] — список могил игрока",
      "/graves teleport <id> — телепорт к могиле",
      "/graves reload — перезагрузка",
    ],
  },
  {
    name: "HeadsPlus",
    description: "Головы мобов и игроков — дроп голов при убийстве",
    commands: [
      "/headsplus reload — перезагрузка",
      "/hp head <ник> — получить голову игрока",
    ],
  },
  {
    name: "ItemEdit",
    description: "Редактирование предметов — изменение названия, лора, энчантов предмета в руке",
    commands: [
      "/itemedit name <текст> — переименовать предмет",
      "/itemedit lore add <текст> — добавить строку лора",
      "/itemedit lore remove <номер> — удалить строку лора",
      "/itemedit enchant <энчант> <уровень> — добавить зачарование",
      "/itemedit flag <флаг> — установить флаг предмета",
    ],
  },
  {
    name: "ItemTag",
    description: "Теги предметов — добавление кастомных тегов к предметам",
    commands: [
      "/itemtag reload — перезагрузка",
    ],
  },
  {
    name: "KOTH",
    description: "King of the Hill — ивент захвата точки, PvP-соревнование",
    commands: [
      "/koth start <арена> — запустить KOTH",
      "/koth stop — остановить KOTH",
      "/koth create <имя> — создать арену KOTH",
      "/koth delete <имя> — удалить арену",
      "/koth list — список арен",
      "/koth reload — перезагрузка",
    ],
  },
  {
    name: "LPX",
    description: "Расширение LuckPerms — дополнительные функции прав и контекстов",
    commands: [
      "/lpx reload — перезагрузка",
    ],
  },
  {
    name: "MineResetLite",
    description: "Система шахт — автоматический ресет шахт по таймеру",
    commands: [
      "/mrl create <имя> — создать шахту (после выделения WorldEdit)",
      "/mrl delete <имя> — удалить шахту",
      "/mrl reset <имя> — ресетнуть шахту вручную",
      "/mrl list — список шахт",
      "/mrl set <имя> <блок> <процент> — установить состав шахты",
      "/mrl reload — перезагрузка",
    ],
  },
  {
    name: "MoneyFromMobs",
    description: "Деньги за убийство мобов — автоматическое начисление валюты",
    commands: [
      "/mfm reload — перезагрузка",
    ],
  },
  {
    name: "NightSeller",
    description: "Ночной продавец — NPC для продажи предметов ночью",
    commands: [
      "/nightseller reload — перезагрузка",
    ],
  },
  {
    name: "nkSalary",
    description: "Система зарплат — автоматическое начисление денег за онлайн",
    commands: [
      "/nksalary reload — перезагрузка",
    ],
  },
  {
    name: "ProtectionStones",
    description: "Защитные камни — игроки ставят блок для создания защищённой территории",
    commands: [
      "/ps admin list — список всех защитных регионов",
      "/ps admin cleanup — очистить заброшенные регионы",
      "/ps admin flag <регион> <флаг> <значение> — установить флаг",
      "/ps reload — перезагрузка",
    ],
  },
  {
    name: "PSAddon",
    description: "Дополнение для ProtectionStones — расширенные функции защиты",
    commands: [],
  },
  {
    name: "Quests",
    description: "Система квестов — задания для игроков с наградами",
    commands: [
      "/quests admin reload — перезагрузка",
      "/quests admin give <ник> <квест> — выдать квест",
      "/quests admin reset <ник> — сбросить прогресс квестов",
      "/quests editor — редактор квестов",
    ],
  },
  {
    name: "Salaires",
    description: "Система зарплат (альтернативная) — начисление за активность",
    commands: [
      "/salaires reload — перезагрузка",
    ],
  },
  {
    name: "spark",
    description: "Профайлер производительности — анализ TPS, лагов, потребления ресурсов",
    commands: [
      "/spark profiler start — начать профилирование",
      "/spark profiler stop — остановить и получить отчёт",
      "/spark tps — текущий TPS",
      "/spark health — здоровье сервера (CPU, RAM, TPS)",
      "/spark gc — статистика сборщика мусора",
      "/spark tickmonitor — мониторинг тиков",
    ],
  },

  // === Библиотеки ===
  {
    name: "BlueSlimeCore",
    description: "Библиотека для плагинов серии Blue. Нет команд для стаффа",
    commands: [],
  },
  {
    name: "RoseGarden",
    description: "Библиотека для плагинов серии Rose. Нет команд для стаффа",
    commands: [],
  },
  {
    name: "WolfyUtilities",
    description: "Библиотека утилит для плагинов. Нет команд для стаффа",
    commands: [],
  },
  {
    name: "utilm",
    description: "Утилиты для разработки. Библиотека, нет команд для стаффа",
    commands: [],
  },
  {
    name: "Vault",
    description: "API экономики и прав. Библиотека, нет команд для стаффа",
    commands: [],
  },
  {
    name: "PlaceholderAPI",
    description: "API плейсхолдеров. Библиотека",
    commands: [
      "/papi list — список расширений",
      "/papi parse <ник> <текст> — проверить плейсхолдер",
      "/papi reload — перезагрузка",
    ],
  },
  {
    name: "ProtocolLib",
    description: "Библиотека для работы с пакетами протокола. Нет команд для стаффа",
    commands: [],
  },
  {
    name: "NBTAPI",
    description: "Библиотека для работы с NBT-данными. Нет команд для стаффа",
    commands: [],
  },
  {
    name: "PluginMetrics",
    description: "Метрики плагинов. Библиотека, нет команд для стаффа",
    commands: [],
  },
  {
    name: "bStats",
    description: "Сбор анонимной статистики. Библиотека, нет команд для стаффа",
    commands: [],
  },
  {
    name: "Updater",
    description: "Автоматическое обновление плагинов. Нет команд для стаффа",
    commands: [],
  },
];
