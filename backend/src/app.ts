import { randomUUID } from "crypto";

import { Hono } from "hono";
import { cors } from "hono/cors";

import { CreateConversationCommand } from "./application/commands/createConversationCommand";
import { CreateConversationHandler } from "./application/commands/createConversationHandler";
import { CreateWorkspaceCommand } from "./application/commands/createWorkspaceCommand";
import { CreateWorkspaceHandler } from "./application/commands/createWorkspaceHandler";
import { JoinConversationCommand } from "./application/commands/joinConversationCommand";
import { JoinConversationHandler } from "./application/commands/joinConversationHandler";
import { LeaveConversationCommand } from "./application/commands/leaveConversationCommand";
import { LeaveConversationHandler } from "./application/commands/leaveConversationHandler";
import { SendMessageCommand } from "./application/commands/sendMessageCommand";
import { SendMessageHandler } from "./application/commands/sendMessageHandler";
import { Environment } from "./domain/core/environment";
import { ProcessEnvironment } from "./infrastructure/config/processEnvironment";
import { EventBus } from "./infrastructure/core/eventBus";
import { InMemoryEventBus } from "./infrastructure/core/inMemoryEventBus";
import { KafkaEventBus } from "./infrastructure/core/kafkaEventBus";
import { InMemoryConversationStore } from "./infrastructure/stores/conversationStore";
import { InMemoryMessageStore } from "./infrastructure/stores/messageStore";
import { InMemoryWorkspaceStore } from "./infrastructure/stores/workspaceStore";
import { ConversationCardProjection } from "./projections/conversationCard/conversationCardProjection";
import { ConversationCardStore, InMemoryConversationCardStore } from "./projections/conversationCard/conversationCardStore";

export interface ApplicationContext {
  app: Hono;
  conversationCardStore: ConversationCardStore;
  eventBus: EventBus;
  kafkaEventBusInstance: KafkaEventBus | null;
}

export function createApplication(env: Environment = new ProcessEnvironment()): ApplicationContext {
  const app = new Hono();
  app.use("*", cors());

  const kafkaBrokers = env.get("KAFKA_BROKERS");
  const kafkaTopicPartitions = parseInt(env.get("KAFKA_DOMAIN_EVENTS_PARTITIONS") || "3", 10);

  let eventBus: EventBus;
  let kafkaEventBusInstance: KafkaEventBus | null = null;

  if (kafkaBrokers) {
    kafkaEventBusInstance = new KafkaEventBus(
      kafkaBrokers.split(","),
      "event-bus-server",
      Number.isNaN(kafkaTopicPartitions) ? 3 : kafkaTopicPartitions,
    );
    eventBus = kafkaEventBusInstance;
    console.log(`[EventBus] Using KafkaEventBus with brokers: ${kafkaBrokers}`);
  } else {
    eventBus = new InMemoryEventBus();
    console.log("[EventBus] Using InMemoryEventBus");
  }

  const eventsToLog = [
    "WorkspaceCreatedEvent",
    "ConversationCreatedEvent",
    "UserJoinedConversationEvent",
    "UserLeftConversationEvent",
    "MessageSentEvent",
  ];
  for (const eventType of eventsToLog) {
    eventBus.subscribe(eventType, async (event) => {
      console.log(`[EventBus] Received event: ${event.eventType}`, event);
    });
  }

  const workspaceStore = new InMemoryWorkspaceStore(eventBus);
  const conversationStore = new InMemoryConversationStore(eventBus);
  const messageStore = new InMemoryMessageStore(eventBus);
  const users = new Map<string, { id: string; name: string }>();

  const conversationCardStore = new InMemoryConversationCardStore();
  new ConversationCardProjection(eventBus, conversationCardStore);

  const createWorkspaceHandler = new CreateWorkspaceHandler(workspaceStore);
  const createConversationHandler = new CreateConversationHandler(conversationStore, workspaceStore);
  const joinConversationHandler = new JoinConversationHandler(conversationStore);
  const leaveConversationHandler = new LeaveConversationHandler(conversationStore);
  const sendMessageHandler = new SendMessageHandler(conversationStore, messageStore);

  app.get("/users", (c) => {
    return c.json(Array.from(users.values()), 200);
  });

  app.post("/users", async (c) => {
    const body = (await c.req.json()) as { name: string };
    if (!body.name || !body.name.trim()) {
      return c.json({ error: "name is required" }, 400);
    }

    const user = {
      id: randomUUID(),
      name: body.name.trim(),
    };

    users.set(user.id, user);
    return c.json(user, 201);
  });

  app.get("/workspaces", async (c) => {
    const workspaces = await workspaceStore.findAll();
    return c.json(
      workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
      })),
      200,
    );
  });

  app.post("/workspaces", async (c) => {
    const body = (await c.req.json()) as { name: string };
    const id = randomUUID();
    const command = new CreateWorkspaceCommand(id, body.name);

    await createWorkspaceHandler.handle(command);

    return c.json({ id, status: "Workspace created" }, 201);
  });

  app.post("/workspaces/:workspaceId/conversations", async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const body = (await c.req.json()) as { title: string };
    const id = randomUUID();
    const command = new CreateConversationCommand(id, workspaceId, body.title);

    try {
      await createConversationHandler.handle(command);
      return c.json({ id, status: "Conversation created" }, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  app.get("/workspaces/:workspaceId/conversations", async (c) => {
    const workspaceId = c.req.param("workspaceId");
    const conversations = await conversationStore.findByWorkspaceId(workspaceId);

    return c.json(
      conversations.map((conversation) => ({
        id: conversation.id,
        workspaceId: conversation.workspaceId,
        title: conversation.title,
        members: conversation.getMembers(),
      })),
      200,
    );
  });

  app.post("/conversations/:conversationId/join", async (c) => {
    const conversationId = c.req.param("conversationId");
    const body = (await c.req.json()) as { userId: string };
    const command = new JoinConversationCommand(conversationId, body.userId);
    try {
      await joinConversationHandler.handle(command);
      return c.json({ status: "Joined conversation" }, 200);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  app.post("/conversations/:conversationId/leave", async (c) => {
    const conversationId = c.req.param("conversationId");
    const body = (await c.req.json()) as { userId: string };
    const command = new LeaveConversationCommand(conversationId, body.userId);
    try {
      await leaveConversationHandler.handle(command);
      return c.json({ status: "Left conversation" }, 200);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  app.post("/conversations/:conversationId/messages", async (c) => {
    const conversationId = c.req.param("conversationId");
    const body = (await c.req.json()) as { senderId: string; text: string };
    const id = randomUUID();
    const command = new SendMessageCommand(id, conversationId, body.senderId, body.text);

    try {
      await sendMessageHandler.handle(command);
      return c.json({ id, status: "Message sent" }, 201);
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  });

  app.get("/conversations/:conversationId/messages", async (c) => {
    const conversationId = c.req.param("conversationId");
    const messages = await messageStore.findByConversationId(conversationId);

    return c.json(
      messages.map((message) => ({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        text: message.text,
        timestamp: message.timestamp,
      })),
      200,
    );
  });

  app.get("/users/:userId/conversation-cards", async (c) => {
    const userId = c.req.param("userId");
    const cards = await conversationCardStore.findByUserId(userId);
    return c.json(cards, 200);
  });

  return {
    app,
    conversationCardStore,
    eventBus,
    kafkaEventBusInstance,
  };
}