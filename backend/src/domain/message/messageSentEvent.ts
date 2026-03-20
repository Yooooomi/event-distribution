import { DomainEvent } from "../core/domainEvent";

export class MessageSentEvent implements DomainEvent {
  public static readonly partitionKey = (event: MessageSentEvent) => event.conversationId;

  public eventType = "MessageSentEvent";

  constructor(
    public readonly eventId: string,
    public readonly timestamp: Date,
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly senderId: string,
    public readonly text: string,
  ) {}
}
