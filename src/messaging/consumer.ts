import { ConsumeMessage } from "amqplib";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { coinTransactions } from "../db/schema.js";
import { getChannel } from "./rabbitmq.js";

const QUEUE_NAME = "check-tibia-coins";

export interface CheckTibiaCoinsPayload {
  sent_to: string;
  sent_by: string;
  amount_tibia_coins: number;
  timestamp: number;
  id_transaction: string;
}

export type MessageHandler = (
  message: CheckTibiaCoinsPayload,
  rawMessage: ConsumeMessage
) => Promise<void>;

export async function startCheckTibiaCoinsConsumer(
  handler: MessageHandler
): Promise<void> {
  const channel = await getChannel();

  await channel.prefetch(1);

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

        const coinTransaction = await db
          .select()
          .from(coinTransactions)
          .where(eq(coinTransactions.idTransaction, data.id_transaction))
          .limit(1);

        console.log("🔍 Verificando transação:", coinTransaction);

        if (coinTransaction.length > 0) {
          if (coinTransaction[0].processed) {
            console.log(
              `⚠️ Transação com id_transaction ${data.id_transaction} já processada. Ignorando mensagem.`
            );
            channel.ack(msg);
            return;
          }

          if (coinTransaction[0].processed === false) {
            console.log(
              `⚠️ Transação com id_transaction ${data.id_transaction} já existe mas não foi processada. Processando novamente.`
            );
            channel.ack(msg);
            return;
          }
        }

        const coinTransactionCreated = await db
          .insert(coinTransactions)
          .values({
            sentTo: data.sent_to,
            sentBy: data.sent_by,
            amountTibiaCoins: data.amount_tibia_coins,
            timestamp: data.timestamp,
            idTransaction: data.id_transaction,
            processed: false,
          })
          .returning();

        console.log(
          `🆕 Nova transação de coins registrada:`,
          coinTransactionCreated[0]
        );

        channel.ack(msg);
        console.log(`✅ Mensagem processada e confirmada`);
      } catch (error) {
        console.error(`❌ Erro ao processar mensagem:`, error);

        channel.nack(msg, false, true);
        console.log(`🔄 Mensagem reendireitada`);
      }
    },
    { noAck: false }
  );
}
