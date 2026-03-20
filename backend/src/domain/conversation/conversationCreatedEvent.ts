import { DomainEvent } from "../core/domainEvent";

export class ConversationCreatedEvent implements DomainEvent {
  public static readonly partitionKey = (event: ConversationCreatedEvent) => event.conversationId;

  public eventType = "ConversationCreatedEvent";

  constructor(
    public readonly eventId: string,
    public readonly timestamp: Date,
    public readonly conversationId: string,
    public readonly workspaceId: string,
    public readonly title: string,
  ) {}
}
