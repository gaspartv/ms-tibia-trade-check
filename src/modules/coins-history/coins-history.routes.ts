import { parse } from "date-fns";
import { enUS } from "date-fns/locale";
import { ilike } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/index.js";
import { characters } from "../../db/schema.js";
import {
  scrapeCoinsHistory,
  scrapeCoinsHistoryWithSession,
} from "./coins-history.service.js";
import {
  CoinsHistoryBody,
  CoinsHistoryCheckBody,
} from "./coins-history.types.js";

export async function coinsHistoryRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CoinsHistoryBody }>(
    "/coins-history",
    async (
      request: FastifyRequest<{ Body: CoinsHistoryBody }>,
      reply: FastifyReply
    ) => {
      const { email, password, sessionId } = request.body;

      if (sessionId) {
        fastify.log.info(
          "Usando sessão existente para scrape de Coins History..."
        );
        const result = await scrapeCoinsHistoryWithSession(sessionId);
        return result;
      }

      if (!email || !password) {
        reply.code(400);
        return {
          success: false,
          error:
            "Email e password são obrigatórios (ou sessionId para usar sessão existente)",
        };
      }

      fastify.log.info("Iniciando scrape de Tibia Coins History...");
      const result = await scrapeCoinsHistory(email, password);

      return result;
    }
  );

  fastify.post(
    "/coins-history/check",
    async (
      request: FastifyRequest<{ Body: CoinsHistoryCheckBody }>,
      reply: FastifyReply
    ) => {
      let { sent_to, sent_by, amount_tibia_coins, timestamp } = request.body;

      sent_to = sent_to.toLowerCase().trim();
      sent_by = sent_by.toLowerCase().trim();
      amount_tibia_coins = Math.abs(amount_tibia_coins);
      timestamp = Number(timestamp);

      const characterFound = await db
        .select()
        .from(characters)
        .where(ilike(characters.name, sent_to))
        .limit(1);

      if (characterFound.length == 0) {
        return {
          success: false,
          error: "O personagem destinatário não existe.",
        };
      }

      const { email, password } = characterFound[0];

      const result = await scrapeCoinsHistory(email, password);

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
            }
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
            f.sent_by === sent_by.toLowerCase().trim() &&
            f.sent_to === sent_to.toLowerCase().trim() &&
            f.amount_tibia_coins === amount_tibia_coins &&
            f.timestamp >= timestamp
          ) {
            return true;
          }
          return false;
        });

      if (!coinHistory) {
        reply.code(404);
        return {
          success: false,
          error:
            "Nenhum histórico de coins encontrado para os critérios dados.",
        };
      }

      reply.code(200);
      return {
        success: true,
        message: "Histórico de coins encontrado.",
        data: coinHistory,
      };
    }
  );
}
