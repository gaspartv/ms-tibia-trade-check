import Fastify from "fastify";
import { coinsHistoryRoutes } from "./routes/coinsHistory.js";

const server = Fastify({
  logger: true,
});

// Registra rotas
server.register(coinsHistoryRoutes, { prefix: "/api/tibia" });

// Rota de health check
server.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Rota raiz
server.get("/", async () => {
  return {
    name: "API Tibia Trade Check",
    version: "1.0.0",
    endpoints: [
      "GET  /health - Health check",
      "GET  /api/tibia/coins-history - Documentação",
      "POST /api/tibia/coins-history - Scrape de Tibia Coins History",
    ],
  };
});

// Inicia o servidor
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3000", 10);
    const host = process.env.HOST || "0.0.0.0";

    await server.listen({ port, host });
    console.log(`Server running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
