import { AggregateRoot } from '../core/aggregateRoot';
import { ConversationCreatedEvent } from './conversationCreatedEvent';
import { UserJoinedConversationEvent } from './userJoinedConversationEvent';
import { UserLeftConversationEvent } from './userLeftConversationEvent';
import { randomUUID } from 'crypto';

export class Conversation extends AggregateRoot {
  public readonly workspaceId: string;
  public readonly title: string;
  private readonly members: Set<string>;

  private constructor(id: string, workspaceId: string, title: string, members: string[] = []) {
    super(id);
    this.workspaceId = workspaceId;
    this.title = title;
    this.members = new Set(members);
  }

  public getMembers(): string[] {
    return Array.from(this.members);
  }

  public static create(id: string, workspaceId: string, title: string): Conversation {
    const conversation = new Conversation(id, workspaceId, title);
    conversation.addEvent(new ConversationCreatedEvent(randomUUID(), new Date(), id, workspaceId, title));
    return conversation;
  }

  public join(userId: string): void {
    if (!this.members.has(userId)) {
      this.members.add(userId);
      this.addEvent(new UserJoinedConversationEvent(randomUUID(), new Date(), this.id, userId));
    }
  }

  public leave(userId: string): void {
    if (this.members.has(userId)) {
      this.members.delete(userId);
      this.addEvent(new UserLeftConversationEvent(randomUUID(), new Date(), this.id, userId));
    }
  }

  public static load(id: string, workspaceId: string, title: string, members: string[] = []): Conversation {
    return new Conversation(id, workspaceId, title, members);
  }
}
