import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const server = buildApp();

const start = async () => {
  try {
    await server.listen({ port: env.PORT });
    console.log(`Server running on port ${env.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
