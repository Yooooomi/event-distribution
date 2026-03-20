import { serve } from "@hono/node-server";
import { ProcessEnvironment } from "./infrastructure/config/processEnvironment";
import { createApplication } from "./app";

// Initialize Environment
const env = new ProcessEnvironment();
const port = parseInt(env.get("PORT") || "3000", 10);
const { app, kafkaEventBusInstance } = createApplication(env);

async function bootstrap() {
  if (kafkaEventBusInstance) {
    await kafkaEventBusInstance.connect();
    console.log(`[EventBus] Kafka connection established.`);
  }

  console.log(`Server is running on http://localhost:${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}

bootstrap().catch(console.error);
