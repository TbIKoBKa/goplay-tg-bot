export type PluginInfo = {
  name: string;
  description: string;
  commands: string[];
};

export type ServerPlugins = {
  server: string;
  displayName: string;
  plugins: PluginInfo[];
};
