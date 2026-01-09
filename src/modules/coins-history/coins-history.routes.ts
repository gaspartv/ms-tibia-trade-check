import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  scrapeCoinsHistory,
  scrapeCoinsHistoryWithSession,
} from "./coins-history.service.js";
import { CoinsHistoryBody } from "./coins-history.types.js";

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
}
