import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/openfin_test";

const pool = new Pool({ connectionString: DATABASE_URL });

export async function setup() {
  console.log("Running global test setup...");
  console.log("Connecting to:", DATABASE_URL);

  try {
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.query("CREATE SCHEMA public");

    const db = drizzle(pool);
    const migrationsFolder = path.resolve(__dirname, "../../../migrations");
    await migrate(db, { migrationsFolder });

    console.log("Global test setup complete");
  } catch (error) {
    console.error("Global setup failed:", error);
    throw error;
  }
}

export async function teardown() {
  await pool.end();
}
