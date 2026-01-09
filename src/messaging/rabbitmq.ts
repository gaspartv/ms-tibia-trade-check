import amqplib from "amqplib";
import { env } from "../config/env.js";

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.Channel | null = null;

export interface RabbitMQConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  vhost: string;
}

function getConfig(): RabbitMQConfig {
  return {
    host: env.RABBITMQ_HOST,
    port: env.RABBITMQ_PORT,
    user: env.RABBITMQ_USER,
    password: env.RABBITMQ_PASSWORD,
    vhost: env.RABBITMQ_VHOST,
  };
}

function getConnectionUrl(): string {
  const config = getConfig();
  return `amqp://${config.user}:${config.password}@${config.host}:${config.port}${config.vhost}`;
}

export async function connectRabbitMQ(): Promise<amqplib.ChannelModel> {
  if (connection) {
    return connection;
  }

  const url = getConnectionUrl();
  console.log("🐰 Conectando ao RabbitMQ...");

  try {
    connection = await amqplib.connect(url);

    connection.on("error", (err) => {
      console.error("❌ RabbitMQ connection error:", err);
      connection = null;
      channel = null;
    });

    connection.on("close", () => {
      console.log("🐰 RabbitMQ connection closed");
      connection = null;
      channel = null;
    });

    console.log("✅ RabbitMQ conectado com sucesso!");
    return connection;
  } catch (error) {
    console.error("❌ Falha ao conectar no RabbitMQ:", error);
    throw error;
  }
}

export async function getChannel(): Promise<amqplib.Channel> {
  if (channel) {
    return channel;
  }

  const conn = await connectRabbitMQ();
  channel = await conn.createChannel();

  channel.on("error", (err) => {
    console.error("❌ RabbitMQ channel error:", err);
    channel = null;
  });

  channel.on("close", () => {
    console.log("🐰 RabbitMQ channel closed");
    channel = null;
  });

  return channel;
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    console.log("🐰 RabbitMQ desconectado");
  } catch (error) {
    console.error("❌ Erro ao fechar conexão RabbitMQ:", error);
  }
}

export { channel, connection };
