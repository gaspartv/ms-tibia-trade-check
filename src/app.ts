import Fastify, { FastifyInstance } from "fastify";
import { charactersRoutes } from "./modules/characters/index.js";
import { coinsHistoryRoutes } from "./modules/coins-history/index.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  app.register(coinsHistoryRoutes, { prefix: "/api/tibia" });
  app.register(charactersRoutes, { prefix: "/api" });

  return app;
}
