import { BaseInMemoryStore } from '../core/baseInMemoryStore';
import { BasePostgresStore, DatabaseClient } from '../core/basePostgresStore';
import { Message } from '../../domain/message/message';
import { MessageData, MessageSerializer } from './messageSerializer';
import { EventBus } from '../core/eventBus';

export class InMemoryMessageStore extends BaseInMemoryStore<Message, MessageData> {
  constructor(eventBus: EventBus, serializer: MessageSerializer = new MessageSerializer()) {
    super(eventBus, serializer);
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    return Array.from(this.items.values())
      .filter((message) => message.conversationId === conversationId)
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
      .map((message) => this.serializer.deserialize(message));
  }
}

export class PostgresMessageStore extends BasePostgresStore<Message, MessageData> {
  constructor(dbClient: DatabaseClient, eventBus: EventBus, serializer: MessageSerializer = new MessageSerializer()) {
    super(dbClient, eventBus, serializer, 'messages');
  }

  protected mapToRow(data: MessageData): any {
    return {
      id: data.id,
      conversation_id: data.conversationId,
      sender_id: data.senderId,
      text: data.text,
      timestamp: data.timestamp
    };
  }

  protected mapFromRow(row: any): MessageData {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      text: row.text,
      timestamp: row.timestamp
    };
  }

  protected getUpsertQuery(): string {
    return `
      INSERT INTO messages (id, conversation_id, sender_id, text, timestamp)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE
      SET text = EXCLUDED.text
    `;
  }

  protected getUpsertParams(data: MessageData): any[] {
    return [data.id, data.conversationId, data.senderId, data.text, data.timestamp];
  }
}
