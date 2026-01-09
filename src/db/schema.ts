import {
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Tabela de personagens/usuários
export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
});

// Tabela de logs de requisições
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),

  method: varchar("method", { length: 10 }).notNull(),
  url: text("url").notNull(),
  statusCode: integer("status_code").notNull(),
  durationMs: integer("duration_ms").notNull(),

  ip: varchar("ip", { length: 45 }),
  userAgent: text("user_agent"),
  userId: varchar("user_id", { length: 255 }),

  request: json("request").notNull(),
  response: json("response"),

  error: text("error"),
});
