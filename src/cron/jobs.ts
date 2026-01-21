import { parse } from "date-fns";
import { enUS } from "date-fns/locale";
import { eq, ilike } from "drizzle-orm";
import cron from "node-cron";
import { db } from "../db/index.js";
import { characters, coinTransactions } from "../db/schema.js";
import { scrapeCoinsHistory } from "../modules/coins-history/coins-history.service.js";

/**
 * Cron job que executa a cada 30 segundos
 */
export function startCronJobs() {
  // Executa a cada 30 segundos
  cron.schedule("*/30 * * * * *", async () => {
    const transactions = await db
      .select()
      .from(coinTransactions)
      .where(eq(coinTransactions.processed, false));

    if (transactions.length === 0) {
      console.log("⏰ Nenhuma transação pendente para processar no momento.");
      return;
    }

    const credentials: any = {};

    for (const transaction of transactions) {
      const sent_to = transaction.sentTo;

      if (!credentials[sent_to]) {
        const character = await db
          .select()
          .from(characters)
          .where(ilike(characters.name, sent_to))
          .limit(1);

        if (character.length > 0) {
          credentials[sent_to] = {
            email: character[0].email,
            password: character[0].password,
          };
        } else {
          console.log(
            `⚠️ Personagem ${sent_to} não encontrado. Pulando transação ID ${transaction.id}.`,
          );
          continue;
        }
      }

      const result = await scrapeCoinsHistory(
        credentials[sent_to].email,
        credentials[sent_to].password,
      );

      const coinHistory = result.entries
        .filter((f) => f.description.includes("gifted to"))
        .map((ch) => {
          const [sent_by, sent_to] = ch.description
            .toLowerCase()
            .split("gifted to");

          const dateWithoutTz = ch.date.replace(/\s+(CET|CEST)$/, "");
          const date = parse(
            dateWithoutTz,
            "MMM dd yyyy, HH:mm:ss",
            new Date(),
            {
              locale: enUS,
            },
          );

          return {
            timestamp: date.getTime(),
            sent_by: sent_by.trim(),
            sent_to: sent_to.trim(),
            amount_tibia_coins: Math.abs(ch.balance),
          };
        })
        .find((f) => {
          if (
            f.sent_by === transaction.sentBy.toLowerCase().trim() &&
            f.sent_to === transaction.sentTo.toLowerCase().trim() &&
            f.amount_tibia_coins === transaction.amountTibiaCoins &&
            f.timestamp >= transaction.timestamp
          ) {
            return true;
          }
          return false;
        });

      if (!coinHistory) {
        console.log(
          `❌ Nenhum histórico de coins encontrado para a transação ID ${transaction.id}.`,
        );
        continue;
      }

      // ENVIAR PARA O WEBHOOK DA API PRINCIPAL AVISANDO QUE A TRANSAÇÃO FOI REALIZADA COM SUCESSO.
      if (!transaction.webhookUrl) {
        console.log(
          `⚠️ Transação ID ${transaction.id} não possui webhookUrl definido. Pulando notificação.`,
        );
        continue;
      }

      const response = await fetch(transaction.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_transaction: transaction.idTransaction,
          status: "success",
        }),
      });

      // AGUARDAR CONFIRMAÇÃO DA API PRINCIPAL.
      if (!response.ok) {
        console.log(
          `❌ Falha ao notificar a API principal para a transação ID ${transaction.id}. Status: ${response.status}`,
        );
        continue;
      }

      // ATUALIZAR O STATUS DA TRANSAÇÃO PARA PROCESSADA.
      await db
        .update(coinTransactions)
        .set({ processed: true })
        .where(eq(coinTransactions.id, transaction.id));

      // precisa enviar o id_transaction para a API principal
    }
  });

  console.log("✅ Cron jobs iniciados com sucesso!");
}
