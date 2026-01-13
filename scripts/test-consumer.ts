import "../src/config/env.js";
import {
  closeRabbitMQ,
  connectRabbitMQ,
  startCheckTibiaCoinsConsumer,
} from "../src/messaging/index.js";

async function testConsumer() {
  console.log("🚀 Iniciando teste do consumer...\n");

  await connectRabbitMQ();

  await startCheckTibiaCoinsConsumer(async (message) => {
    console.log("\n📋 Processando mensagem:");
    console.log(`   Sender:   ${message.send_name}`);
    console.log(`   Receiver: ${message.received_name}`);
    console.log(`   TC Amount: ${message.tc_amount}`);

    // Simula processamento
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("\n🎉 Mensagem processada com sucesso!");
  });

  console.log("\n⏳ Aguardando mensagens... (Ctrl+C para sair)\n");

  // Mantém o processo rodando
  process.on("SIGINT", async () => {
    console.log("\n🛑 Encerrando consumer...");
    await closeRabbitMQ();
    process.exit(0);
  });
}

testConsumer().catch((error) => {
  console.error("❌ Erro:", error);
  process.exit(1);
});
