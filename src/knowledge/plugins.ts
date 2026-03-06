export type { PluginInfo, ServerPlugins } from "./plugins/types.js";
import type { ServerPlugins } from "./plugins/types.js";

import { VELOCITY_PLUGINS } from "./plugins/velocity.js";
import { LOBBY_PLUGINS } from "./plugins/lobby.js";
import { GRIEF_PLUGINS } from "./plugins/grief.js";
import { ANARCHY_PLUGINS } from "./plugins/anarchy.js";
import { BUILDER_PLUGINS } from "./plugins/builder.js";

export const SERVER_PLUGINS: ServerPlugins[] = [
  {
    server: "velocity",
    displayName: "Velocity (прокси)",
    plugins: VELOCITY_PLUGINS,
  },
  {
    server: "lobby",
    displayName: "Лобби",
    plugins: LOBBY_PLUGINS,
  },
  {
    server: "grief",
    displayName: "Гриф",
    plugins: GRIEF_PLUGINS,
  },
  {
    server: "anarchy",
    displayName: "Анархия",
    plugins: ANARCHY_PLUGINS,
  },
  {
    server: "builder",
    displayName: "Билдер",
    plugins: BUILDER_PLUGINS,
  },
];
