import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
