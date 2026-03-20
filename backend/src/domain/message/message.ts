import { AggregateRoot } from '../core/aggregateRoot';
import { MessageSentEvent } from './messageSentEvent';
import { randomUUID } from 'crypto';

export class Message extends AggregateRoot {
  public readonly conversationId: string;
  public readonly senderId: string;
  public readonly text: string;
  public readonly timestamp: Date;

  private constructor(id: string, conversationId: string, senderId: string, text: string, timestamp: Date) {
    super(id);
    this.conversationId = conversationId;
    this.senderId = senderId;
    this.text = text;
    this.timestamp = timestamp;
  }

  public static create(id: string, conversationId: string, senderId: string, text: string): Message {
    const timestamp = new Date();
    const message = new Message(id, conversationId, senderId, text, timestamp);
    message.addEvent(new MessageSentEvent(randomUUID(), timestamp, id, conversationId, senderId, text));
    return message;
  }

  public static load(id: string, conversationId: string, senderId: string, text: string, timestamp: Date): Message {
    return new Message(id, conversationId, senderId, text, timestamp);
  }
}
