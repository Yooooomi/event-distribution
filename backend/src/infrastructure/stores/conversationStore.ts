import { BaseInMemoryStore } from '../core/baseInMemoryStore';
import { BasePostgresStore, DatabaseClient } from '../core/basePostgresStore';
import { Conversation } from '../../domain/conversation/conversation';
import { ConversationData, ConversationSerializer } from './conversationSerializer';
import { EventBus } from '../core/eventBus';

export class InMemoryConversationStore extends BaseInMemoryStore<Conversation, ConversationData> {
  constructor(eventBus: EventBus, serializer: ConversationSerializer = new ConversationSerializer()) {
    super(eventBus, serializer);
  }

  async findAll(): Promise<Conversation[]> {
    return Array.from(this.items.values()).map((conversation) => this.serializer.deserialize(conversation));
  }

  async findByWorkspaceId(workspaceId: string): Promise<Conversation[]> {
    return Array.from(this.items.values())
      .filter((conversation) => conversation.workspaceId === workspaceId)
      .map((conversation) => this.serializer.deserialize(conversation));
  }
}

export class PostgresConversationStore extends BasePostgresStore<Conversation, ConversationData> {
  constructor(dbClient: DatabaseClient, eventBus: EventBus, serializer: ConversationSerializer = new ConversationSerializer()) {
    super(dbClient, eventBus, serializer, 'conversations');
  }

  protected mapToRow(data: ConversationData): any {
    return {
      id: data.id,
      workspace_id: data.workspaceId,
      title: data.title,
      members: JSON.stringify(data.members)
    };
  }

  protected mapFromRow(row: any): ConversationData {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      members: typeof row.members === 'string' ? JSON.parse(row.members) : (row.members || [])
    };
  }

  protected getUpsertQuery(): string {
    return `
      INSERT INTO conversations (id, workspace_id, title, members)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE
      SET title = EXCLUDED.title,
          members = EXCLUDED.members
    `;
  }

  protected getUpsertParams(data: ConversationData): any[] {
    return [
      data.id,
      data.workspaceId,
      data.title,
      JSON.stringify(data.members)
    ];
  }
}
