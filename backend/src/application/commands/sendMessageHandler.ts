import { Store } from '../../infrastructure/core/store';
import { Conversation } from '../../domain/conversation/conversation';
import { Message } from '../../domain/message/message';
import { SendMessageCommand } from './sendMessageCommand';

export class SendMessageHandler {
  constructor(
    private readonly conversationStore: Store<Conversation>,
    private readonly messageStore: Store<Message>
  ) {}

  async handle(command: SendMessageCommand): Promise<void> {
    const conversation = await this.conversationStore.findById(command.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const message = Message.create(command.id, command.conversationId, command.senderId, command.text);
    await this.messageStore.save(message);
  }
}
