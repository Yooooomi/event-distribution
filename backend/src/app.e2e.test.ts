import { CreateConversationCommand } from "./application/commands/createConversationCommand";
import { CreateConversationHandler } from "./application/commands/createConversationHandler";
import { CreateWorkspaceCommand } from "./application/commands/createWorkspaceCommand";
import { CreateWorkspaceHandler } from "./application/commands/createWorkspaceHandler";
import { JoinConversationCommand } from "./application/commands/joinConversationCommand";
import { JoinConversationHandler } from "./application/commands/joinConversationHandler";
import { SendMessageCommand } from "./application/commands/sendMessageCommand";
import { SendMessageHandler } from "./application/commands/sendMessageHandler";
import { InMemoryEventBus } from "./infrastructure/core/inMemoryEventBus";
import { InMemoryConversationStore } from "./infrastructure/stores/conversationStore";
import { InMemoryMessageStore } from "./infrastructure/stores/messageStore";
import { InMemoryWorkspaceStore } from "./infrastructure/stores/workspaceStore";
import { ConversationCardProjection } from "./projections/conversationCard/conversationCardProjection";
import { InMemoryConversationCardStore } from "./projections/conversationCard/conversationCardStore";

describe("application e2e", () => {
  it("updates conversation cards after many messages across different conversations", async () => {
    const eventBus = new InMemoryEventBus();
    const workspaceStore = new InMemoryWorkspaceStore(eventBus);
    const conversationStore = new InMemoryConversationStore(eventBus);
    const messageStore = new InMemoryMessageStore(eventBus);
    const conversationCardStore = new InMemoryConversationCardStore();

    new ConversationCardProjection(eventBus, conversationCardStore);

    const createWorkspaceHandler = new CreateWorkspaceHandler(workspaceStore);
    const createConversationHandler = new CreateConversationHandler(
      conversationStore,
      workspaceStore,
    );
    const joinConversationHandler = new JoinConversationHandler(conversationStore);
    const sendMessageHandler = new SendMessageHandler(conversationStore, messageStore);

    const workspaceId = "workspace-load-test";
    await createWorkspaceHandler.handle(
      new CreateWorkspaceCommand(workspaceId, "Load Test Workspace"),
    );

    const conversationSpecs = [
      {
        title: "Alpha",
        members: ["user-a", "user-b"],
        senderId: "user-a",
        totalMessages: 24,
      },
      {
        title: "Beta",
        members: ["user-b", "user-c"],
        senderId: "user-b",
        totalMessages: 27,
      },
      {
        title: "Gamma",
        members: ["user-a", "user-c"],
        senderId: "user-c",
        totalMessages: 30,
      },
    ];

    const conversations = await Promise.all(
      conversationSpecs.map(async (spec, index) => {
        const conversationId = `conversation-${index + 1}`;

        await createConversationHandler.handle(
          new CreateConversationCommand(conversationId, workspaceId, spec.title),
        );

        await Promise.all(
          spec.members.map(async (userId) => {
            await joinConversationHandler.handle(
              new JoinConversationCommand(conversationId, userId),
            );
          }),
        );

        return {
          id: conversationId,
          ...spec,
        };
      }),
    );

    await Promise.all(
      conversations.map(async (conversation) => {
        for (let index = 0; index < conversation.totalMessages; index += 1) {
          await sendMessageHandler.handle(
            new SendMessageCommand(
              `${conversation.id}-message-${index}`,
              conversation.id,
              conversation.senderId,
              `${conversation.title} message ${index}`,
            ),
          );
        }
      }),
    );

    const expectedCards = new Map(
      conversations.map((conversation) => [
        conversation.id,
        {
          title: conversation.title,
          senderId: conversation.senderId,
          text: `${conversation.title} message ${conversation.totalMessages - 1}`,
        },
      ]),
    );

    const [alphaConversation, betaConversation, gammaConversation] = conversations;

    expect(alphaConversation).toBeDefined();
    expect(betaConversation).toBeDefined();
    expect(gammaConversation).toBeDefined();

    await assertUserCards(
      conversationCardStore,
      "user-a",
      [alphaConversation!.id, gammaConversation!.id],
      expectedCards,
    );
    await assertUserCards(
      conversationCardStore,
      "user-b",
      [alphaConversation!.id, betaConversation!.id],
      expectedCards,
    );
    await assertUserCards(
      conversationCardStore,
      "user-c",
      [betaConversation!.id, gammaConversation!.id],
      expectedCards,
    );
  });
});

async function assertUserCards(
  conversationCardStore: InMemoryConversationCardStore,
  userId: string,
  expectedConversationIds: string[],
  expectedCards: Map<string, { title: string; senderId: string; text: string }>,
): Promise<void> {
  const cards = await conversationCardStore.findByUserId(userId);
  expect(cards).toHaveLength(expectedConversationIds.length);

  const cardsByConversationId = new Map(cards.map((card) => [card.conversationId, card]));

  for (const conversationId of expectedConversationIds) {
    const card = cardsByConversationId.get(conversationId);
    const expectedCard = expectedCards.get(conversationId);

    expect(card).toBeDefined();
    expect(expectedCard).toBeDefined();
    expect(card?.userId).toBe(userId);
    expect(card?.title).toBe(expectedCard?.title);
    expect(card?.lastMessageSenderId).toBe(expectedCard?.senderId);
    expect(card?.lastMessageContent).toBe(expectedCard?.text);
    expect(card?.lastMessageTimestamp).toBeTruthy();
  }
}
