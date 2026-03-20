import { DatabaseClient } from '../../infrastructure/core/basePostgresStore';
import { ConversationCard } from './conversationCard';

export interface ConversationCardStore {
  upsert(card: ConversationCard): Promise<void>;
  delete(userId: string, conversationId: string): Promise<void>;
  findByUserId(userId: string): Promise<ConversationCard[]>;
  findByConversationId(conversationId: string): Promise<ConversationCard[]>;
  findById(userId: string, conversationId: string): Promise<ConversationCard | null>;
}

export class InMemoryConversationCardStore implements ConversationCardStore {
  // key is `${userId}_${conversationId}`
  private cards: Map<string, ConversationCard> = new Map();

  private getKey(userId: string, conversationId: string): string {
    return `${userId}_${conversationId}`;
  }

  async upsert(card: ConversationCard): Promise<void> {
    this.cards.set(this.getKey(card.userId, card.conversationId), { ...card });
  }

  async delete(userId: string, conversationId: string): Promise<void> {
    this.cards.delete(this.getKey(userId, conversationId));
  }

  async findByUserId(userId: string): Promise<ConversationCard[]> {
    return Array.from(this.cards.values()).filter(c => c.userId === userId);
  }

  async findByConversationId(conversationId: string): Promise<ConversationCard[]> {
    return Array.from(this.cards.values()).filter(c => c.conversationId === conversationId);
  }

  async findById(userId: string, conversationId: string): Promise<ConversationCard | null> {
    return this.cards.get(this.getKey(userId, conversationId)) || null;
  }
}

export class PostgresConversationCardStore implements ConversationCardStore {
  constructor(private readonly dbClient: DatabaseClient) {}

  async upsert(card: ConversationCard): Promise<void> {
    const query = `
      INSERT INTO conversation_cards (
        user_id, conversation_id, title, last_message_sender_id, last_message_content, last_message_timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, conversation_id) DO UPDATE SET
        title = EXCLUDED.title,
        last_message_sender_id = EXCLUDED.last_message_sender_id,
        last_message_content = EXCLUDED.last_message_content,
        last_message_timestamp = EXCLUDED.last_message_timestamp
    `;
    const params = [
      card.userId,
      card.conversationId,
      card.title,
      card.lastMessageSenderId,
      card.lastMessageContent,
      card.lastMessageTimestamp
    ];
    await this.dbClient.query(query, params);
  }

  async delete(userId: string, conversationId: string): Promise<void> {
    await this.dbClient.query(
      `DELETE FROM conversation_cards WHERE user_id = $1 AND conversation_id = $2`,
      [userId, conversationId]
    );
  }

  async findByUserId(userId: string): Promise<ConversationCard[]> {
    const result = await this.dbClient.query(
      `SELECT * FROM conversation_cards WHERE user_id = $1`,
      [userId]
    );
    return result.rows.map(this.mapFromRow);
  }

  async findByConversationId(conversationId: string): Promise<ConversationCard[]> {
    const result = await this.dbClient.query(
      `SELECT * FROM conversation_cards WHERE conversation_id = $1`,
      [conversationId]
    );
    return result.rows.map(this.mapFromRow);
  }

  async findById(userId: string, conversationId: string): Promise<ConversationCard | null> {
    const result = await this.dbClient.query(
      `SELECT * FROM conversation_cards WHERE user_id = $1 AND conversation_id = $2`,
      [userId, conversationId]
    );
    if (result.rows.length === 0) return null;
    return this.mapFromRow(result.rows[0]);
  }

  private mapFromRow(row: any): ConversationCard {
    return {
      userId: row.user_id,
      conversationId: row.conversation_id,
      title: row.title,
      lastMessageSenderId: row.last_message_sender_id,
      lastMessageContent: row.last_message_content,
      lastMessageTimestamp: row.last_message_timestamp
    };
  }
}
