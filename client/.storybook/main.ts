import type { StorybookConfig } from "@storybook/sveltekit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|ts|svelte)"],
  addons: [],
  framework: {
    name: "@storybook/sveltekit",
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  viteFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        $lib: path.resolve(__dirname, "../src/lib"),
        "@components": path.resolve(__dirname, "../src/components"),
      };
    }

    // Disable the problematic Svelte docgen plugin for Svelte 5 compatibility
    if (config.plugins) {
      config.plugins = config.plugins.filter(
        (plugin: any) => plugin?.name !== "storybook:svelte-docgen-plugin",
      );
    }

    return config;
  },
};

export default config;
