import { DomainEvent } from "../core/domainEvent";

export class UserLeftConversationEvent implements DomainEvent {
  public static readonly partitionKey = (event: UserLeftConversationEvent) => event.conversationId;

  public eventType = "UserLeftConversationEvent";

  constructor(
    public readonly eventId: string,
    public readonly timestamp: Date,
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}
