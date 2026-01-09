import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "tibia_user",
    password: process.env.DB_PASSWORD || "tibia_password",
    database: process.env.DB_NAME || "tibia_trade",
  },
  verbose: true,
  strict: true,
});
