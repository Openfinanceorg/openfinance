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
      STRIPE_SECRET_KEY: "sk_test_fake",
      STRIPE_WEBHOOK_SECRET: "whsec_test_fake",
    },
    globalSetup: "./src/tests/test-setup.ts",
    pool: "forks",
    maxWorkers: 1,
  },
});
