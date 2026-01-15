import Fastify, { FastifyInstance } from "fastify";
import { coinsHistoryRoutes } from "./modules/coins-history/index.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  app.register(coinsHistoryRoutes, { prefix: "/api/tibia" });

  return app;
}
