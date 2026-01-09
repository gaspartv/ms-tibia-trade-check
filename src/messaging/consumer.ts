import { ConsumeMessage } from "amqplib";
import { getChannel } from "./rabbitmq.js";

const QUEUE_NAME = "check-tibia-coins";

export interface CheckTibiaCoinsPayload {
  send_name: string;
  received_name: string;
  tc_amount: string;
}

export type MessageHandler = (
  message: CheckTibiaCoinsPayload,
  rawMessage: ConsumeMessage
) => Promise<void>;

export async function startCheckTibiaCoinsConsumer(
  handler: MessageHandler
): Promise<void> {
  const channel = await getChannel();

  // Configura prefetch para processar uma mensagem por vez
  await channel.prefetch(1);

  // Garante que a fila existe
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  console.log(`🎧 Consumer registrado na fila: ${QUEUE_NAME}`);

  channel.consume(
    QUEUE_NAME,
    async (msg) => {
      if (msg === null) {
        console.log("⚠️ Consumer cancelado pelo servidor");
        return;
      }

      try {
        const content = msg.content.toString();
        const data = JSON.parse(content) as CheckTibiaCoinsPayload;

        console.log(`📨 Mensagem recebida:`, data);

        await handler(data, msg);

        channel.ack(msg);
        console.log(`✅ Mensagem processada e confirmada`);
      } catch (error) {
        console.error(`❌ Erro ao processar mensagem:`, error);

        channel.nack(msg, false, true);
        console.log(`🔄 Mensagem reenfileirada`);
      }
    },
    { noAck: false }
  );
}
