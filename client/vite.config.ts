import path from "path";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: path.resolve(__dirname, ".."),
  plugins: [tailwindcss(), sveltekit()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../server/src/shared"),
    },
  },
  server: {
    port: 6100,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
