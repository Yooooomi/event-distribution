import { DomainEvent } from "../core/domainEvent";

export class UserJoinedConversationEvent implements DomainEvent {
  public static readonly partitionKey = (event: UserJoinedConversationEvent) =>
    event.conversationId;

  public eventType = "UserJoinedConversationEvent";

  constructor(
    public readonly eventId: string,
    public readonly timestamp: Date,
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}
