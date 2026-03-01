import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const envDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const env = loadEnv(mode, envDir, "VITE_");
  const apiTarget = env.VITE_API_URL || "http://localhost:3000";

  return {
    envDir,
    plugins: [tailwindcss(), sveltekit()],
    server: {
      port: 6100,
      proxy: {
        "/api": apiTarget,
      },
    },
  };
});
