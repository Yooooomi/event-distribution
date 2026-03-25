import { PubSub } from "@google-cloud/pubsub";
import { EventBusSuite } from "./eventBus.suite";
import { GooglePubSubEventBus } from "./googlePubSub.eventBus";
import { Hono } from "hono";
import { serve } from "@hono/node-server";

describe("GooglePubSubEventBus", () => {
  return EventBusSuite(async () => {
    const callbackPort = 9800 + Math.floor(Math.random() * 200);

    const pubsub = new PubSub({
      projectId: "demo-no-project",
      apiEndpoint: "localhost:8085",
    });

    const eventBus = new GooglePubSubEventBus(
      pubsub,
      `http://host.docker.internal:${callbackPort}/push`,
    );

    const app = new Hono();

    app.post("/push", async (c) => {
      const message: { subscription: string; message: { data: string } } = await c.req.json();
      const subscriptionName = message.subscription.slice(
        message.subscription.lastIndexOf("/") + 1,
      );

      // Use serializer registry
      const event = JSON.parse(Buffer.from(message.message.data, "base64").toString("utf-8"));
      await eventBus.handleInStream(subscriptionName, event);
      return c.text("OK");
    });

    const served = serve({ fetch: app.fetch, port: callbackPort });
    return {
      eventBus,
      close: async () => {
        served.close();
        const [subscriptions] = await pubsub.getSubscriptions();
        for (const subscription of subscriptions) {
          await subscription.delete();
        }
      },
    };
  });
});
