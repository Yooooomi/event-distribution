import { Store } from '../../infrastructure/core/store';
import { Conversation } from '../../domain/conversation/conversation';
import { LeaveConversationCommand } from './leaveConversationCommand';

export class LeaveConversationHandler {
  constructor(private readonly conversationStore: Store<Conversation>) {}

  async handle(command: LeaveConversationCommand): Promise<void> {
    const conversation = await this.conversationStore.findById(command.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.leave(command.userId);
    await this.conversationStore.save(conversation);
  }
}
