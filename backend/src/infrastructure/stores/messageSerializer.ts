import { AggregateSerializer } from '../core/aggregateSerializer';
import { Message } from '../../domain/message/message';

export interface MessageData {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

export class MessageSerializer implements AggregateSerializer<Message, MessageData> {
  serialize(aggregate: Message): MessageData {
    return {
      id: aggregate.id,
      conversationId: aggregate.conversationId,
      senderId: aggregate.senderId,
      text: aggregate.text,
      timestamp: aggregate.timestamp
    };
  }

  deserialize(data: MessageData): Message {
    return Message.load(data.id, data.conversationId, data.senderId, data.text, data.timestamp);
  }
}
