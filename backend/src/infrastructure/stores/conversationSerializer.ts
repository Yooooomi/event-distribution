import { AggregateSerializer } from '../core/aggregateSerializer';
import { Conversation } from '../../domain/conversation/conversation';

export interface ConversationData {
  id: string;
  workspaceId: string;
  title: string;
  members: string[];
}

export class ConversationSerializer implements AggregateSerializer<Conversation, ConversationData> {
  serialize(aggregate: Conversation): ConversationData {
    return {
      id: aggregate.id,
      workspaceId: aggregate.workspaceId,
      title: aggregate.title,
      members: aggregate.getMembers(),
    };
  }

  deserialize(data: ConversationData): Conversation {
    return Conversation.load(data.id, data.workspaceId, data.title, data.members || []);
  }
}
