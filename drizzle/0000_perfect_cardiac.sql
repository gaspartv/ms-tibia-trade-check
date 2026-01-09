CREATE TABLE "characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	CONSTRAINT "characters_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"method" varchar(10) NOT NULL,
	"url" text NOT NULL,
	"status_code" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"ip" varchar(45),
	"user_agent" text,
	"user_id" varchar(255),
	"request" json NOT NULL,
	"response" json,
	"error" text
);
