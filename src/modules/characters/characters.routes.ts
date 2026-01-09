import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createCharacter, getAllCharacters } from "./characters.service.js";
import { CreateCharacterBody } from "./characters.types.js";

export async function charactersRoutes(fastify: FastifyInstance) {
  // POST /characters - Criar um novo character
  fastify.post<{ Body: CreateCharacterBody }>(
    "/characters",
    async (
      request: FastifyRequest<{ Body: CreateCharacterBody }>,
      reply: FastifyReply
    ) => {
      const { name, email, password } = request.body;

      if (!name || !email || !password) {
        reply.code(400);
        return {
          success: false,
          error: "name, email e password são obrigatórios",
        };
      }

      const result = await createCharacter({ name, email, password });

      if (!result.success) {
        reply.code(400);
      }

      return result;
    }
  );

  // GET /characters - Listar todos os characters
  fastify.get("/characters", async () => {
    const characters = await getAllCharacters();
    return {
      success: true,
      data: characters,
    };
  });
}
