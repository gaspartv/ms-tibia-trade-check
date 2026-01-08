import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  scrapeCoinsHistory,
  scrapeCoinsHistoryWithSession,
} from "../services/tibiaCoinsHistoryScraper.js";

interface CoinsHistoryBody {
  email?: string;
  password?: string;
  sessionId?: string;
}

export async function coinsHistoryRoutes(fastify: FastifyInstance) {
  // GET - Documentação da API
  fastify.get(
    "/coins-history",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return {
        message: "API de Tibia Coins History Scraper",
        usage: {
          method: "POST",
          body: {
            option1: {
              email: "seu-email@example.com",
              password: "sua-senha",
            },
            option2: {
              sessionId: "id-da-sessao-flaresolverr-existente",
            },
          },
          response: {
            success: true,
            entries: [
              {
                number: 7,
                date: "Feb 05 2020, 05:28:31 CET",
                description: "Raphaelita gifted to raphaelitta",
                character: "",
                balance: -225,
                coinType: "transferable",
              },
              {
                number: 2,
                date: "Oct 28 2019, 23:24:47 CET",
                description: "30 days",
                character: "Raphaelita",
                balance: -250,
                coinType: "non-transferable",
              },
            ],
            totalEntries: 7,
          },
        },
        notes: [
          "Requer FlareSolverr rodando em http://localhost:8191",
          "Use docker para iniciar: docker run -d --name flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest",
          "balance negativo = saída de coins, positivo = entrada de coins",
          "coinType indica se são coins transferíveis ou não-transferíveis",
        ],
      };
    }
  );

  // POST - Scrape de Coins History
  fastify.post<{ Body: CoinsHistoryBody }>(
    "/coins-history",
    async (
      request: FastifyRequest<{ Body: CoinsHistoryBody }>,
      reply: FastifyReply
    ) => {
      const { email, password, sessionId } = request.body;

      // Se tiver sessionId, usa sessão existente
      if (sessionId) {
        fastify.log.info(
          "Usando sessão existente para scrape de Coins History..."
        );
        const result = await scrapeCoinsHistoryWithSession(sessionId);
        return result;
      }

      // Caso contrário, faz login completo
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
