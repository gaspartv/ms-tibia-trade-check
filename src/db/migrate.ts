import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { env } from "../config/env.js";

async function runMigrations() {
  const pool = new Pool({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
  });

  const db = drizzle(pool);

  console.log("🔄 Executando migrations...");

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Migrations executadas com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao executar migrations:", error);
    process.exit(1);
  }

  await pool.end();
  process.exit(0);
}

runMigrations();
