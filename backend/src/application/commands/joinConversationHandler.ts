import { Store } from '../../infrastructure/core/store';
import { Conversation } from '../../domain/conversation/conversation';
import { JoinConversationCommand } from './joinConversationCommand';

export class JoinConversationHandler {
  constructor(private readonly conversationStore: Store<Conversation>) {}

  async handle(command: JoinConversationCommand): Promise<void> {
    const conversation = await this.conversationStore.findById(command.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.join(command.userId);
    await this.conversationStore.save(conversation);
  }
}
