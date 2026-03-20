import { EventBus } from "../../infrastructure/core/eventBus";
import { ConversationCardStore } from "./conversationCardStore";
import { ConversationCreatedEvent } from "../../domain/conversation/conversationCreatedEvent";
import { UserJoinedConversationEvent } from "../../domain/conversation/userJoinedConversationEvent";
import { UserLeftConversationEvent } from "../../domain/conversation/userLeftConversationEvent";
import { MessageSentEvent } from "../../domain/message/messageSentEvent";

export class ConversationCardProjection {
  // A secondary metadata map for Replay integrity. Maps conversationId -> title
  // In a real system, this would be a persistent table, to allow projecting from scratch.
  private conversationTitles: Map<string, string> = new Map();

  constructor(
    private readonly eventBus: EventBus,
    private readonly store: ConversationCardStore,
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.eventBus.subscribe("ConversationCreatedEvent", async (event: any) => {
      this.handleConversationCreated(event as ConversationCreatedEvent);
    });

    this.eventBus.subscribe("UserJoinedConversationEvent", async (event: any) => {
      await this.handleUserJoined(event as UserJoinedConversationEvent);
    });

    this.eventBus.subscribe("UserLeftConversationEvent", async (event: any) => {
      await this.handleUserLeft(event as UserLeftConversationEvent);
    });

    this.eventBus.subscribe("MessageSentEvent", async (event: any) => {
      await this.handleMessageSent(event as MessageSentEvent);
    });
  }

  private handleConversationCreated(event: ConversationCreatedEvent): void {
    this.conversationTitles.set(event.conversationId, event.title);
  }

  private async handleUserJoined(event: UserJoinedConversationEvent): Promise<void> {
    const title = this.conversationTitles.get(event.conversationId) || "Unknown Conversation";

    // Using upsert ensures idempotent behavior when rebuilding from scratch
    const existing = await this.store.findById(event.userId, event.conversationId);

    await this.store.upsert({
      userId: event.userId,
      conversationId: event.conversationId,
      title: title,
      lastMessageSenderId: existing?.lastMessageSenderId || null,
      lastMessageContent: existing?.lastMessageContent || null,
      lastMessageTimestamp: existing?.lastMessageTimestamp || null,
    });
  }

  private async handleUserLeft(event: UserLeftConversationEvent): Promise<void> {
    await this.store.delete(event.userId, event.conversationId);
  }

  private async handleMessageSent(event: MessageSentEvent): Promise<void> {
    await wait(Math.random() * 1000);

    if (Math.random() < 0.1) {
      console.warn(
        `[ConversationCardProjection] Simulated random failure for event: ${event.eventType}`,
      );
      throw new Error("Simulated random failure");
    }

    // A message is sent in a conversation. We must update the last message info
    // for all users currently in that conversation.
    const cards = await this.store.findByConversationId(event.conversationId);

    for (const card of cards) {
      // Idempotency: Only update if the event timestamp is newer than current,
      // or if there is no current message. (Useful for disordered replays)
      if (!card.lastMessageTimestamp || event.timestamp >= card.lastMessageTimestamp) {
        card.lastMessageSenderId = event.senderId;
        card.lastMessageContent = event.text;
        card.lastMessageTimestamp = event.timestamp;
        await this.store.upsert(card);
      }
    }
  }
}

const wait = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
