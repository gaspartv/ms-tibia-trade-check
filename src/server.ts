import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { startCronJobs } from "./cron/index.js";
import { startCheckTibiaCoinsConsumer } from "./messaging/index.js";

const server = buildApp();

const start = async () => {
  try {
    // Inicia o consumer do RabbitMQ
    await startCheckTibiaCoinsConsumer(async (message, rawMessage) => {
      console.log(`📨 Mensagem recebida:`, message);
    });
    console.log("🐰 RabbitMQ consumer iniciado com sucesso!");

    // Inicia os cron jobs
    startCronJobs();

    await server.listen({ port: env.PORT });
    console.log(`Server running on port ${env.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
