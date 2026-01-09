import amqplib from "amqplib";

const QUEUE_NAME = "check-tibia-coins";
const RABBITMQ_URL = "amqp://tibia_user:tibia_password@localhost:5672/";

interface CheckTibiaCoinsPayload {
  send_name: string;
  received_name: string;
  tc_amount: string;
}

async function publishTestMessage() {
  console.log("🐰 Conectando ao RabbitMQ...");

  const connection = await amqplib.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });

  const testPayload: CheckTibiaCoinsPayload = {
    send_name: "Player Sender",
    received_name: "Player Receiver",
    tc_amount: "250",
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
