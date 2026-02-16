import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, "src/lib"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  test: {
    env: {
      DATABASE_URL:
        "postgresql://postgres:postgres@localhost:5433/openfin_test",
    },
    globalSetup: "./src/tests/test-setup.ts",
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
