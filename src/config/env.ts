import "dotenv/config";
import * as z from "zod";

const envSchema = z.object({
  PORT: z.string().transform((val) => Number(val)),
  FLARESOLVERR_URL: z.url(),

  DATABASE_HOST: z.string(),
  DATABASE_PORT: z.coerce.number(),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string(),

  RABBITMQ_HOST: z.string(),
  RABBITMQ_PORT: z.coerce.number(),
  RABBITMQ_USER: z.string(),
  RABBITMQ_PASSWORD: z.string(),
  RABBITMQ_VHOST: z.string().default("/"),
});

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
  console.error(
    "❌ Invalid environment variables",
    JSON.stringify(_env.error.format(), null, 2)
  );

  process.exit(1);
}

const env = _env.data;

export { env };
