import amqplib from "amqplib";
import { env } from "../src/config/env.js";

const QUEUE_NAME = "check-tibia-coins";

function getRabbitMQUrl(): string {
  return `amqp://${env.RABBITMQ_USER}:${env.RABBITMQ_PASSWORD}@${env.RABBITMQ_HOST}:${env.RABBITMQ_PORT}${env.RABBITMQ_VHOST}`;
}

interface CheckTibiaCoinsPayload {
  sent_to: string;
  sent_by: string;
  amount_tibia_coins: number;
  timestamp: number;
  id_transaction: string;
}

async function publishTestMessage() {
  console.log("🐰 Conectando ao RabbitMQ...");

  const connection = await amqplib.connect(getRabbitMQUrl());
  const channel = await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });

  const testPayload: CheckTibiaCoinsPayload = {
    sent_to: "raphaelita",
    sent_by: "raphaelitta",
    amount_tibia_coins: 250,
    timestamp: 1580666943000,
    id_transaction: "test-transaction-id-123",
  };

  const message = Buffer.from(JSON.stringify(testPayload));

  channel.sendToQueue(QUEUE_NAME, message, { persistent: true });

  console.log("📤 Mensagem de teste publicada:");
  console.log(JSON.stringify(testPayload, null, 2));

  // Aguarda um pouco para garantir que a mensagem foi enviada
  await new Promise((resolve) => setTimeout(resolve, 500));

  await channel.close();
  await connection.close();

  console.log("✅ Teste concluído!");
}

publishTestMessage().catch((error) => {
  console.error("❌ Erro:", error);
  process.exit(1);
});
