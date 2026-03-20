import { JoinConversationHandler } from './joinConversationHandler';
import { JoinConversationCommand } from './joinConversationCommand';
import { InMemoryConversationStore } from '../../infrastructure/stores/conversationStore';
import { InMemoryEventBus } from '../../infrastructure/core/inMemoryEventBus';
import { Conversation } from '../../domain/conversation/conversation';

function init() {
  const eventBus = new InMemoryEventBus();
  const conversationStore = new InMemoryConversationStore(eventBus);
  const handler = new JoinConversationHandler(conversationStore);
  return { eventBus, conversationStore, handler };
}

describe('JoinConversationHandler', () => {
  it('should throw an error if the conversation does not exist', async () => {
    const { handler } = init();
    
    const command = new JoinConversationCommand('conv-999', 'user-1');
    await expect(handler.handle(command)).rejects.toThrow('Conversation not found');
  });

  it('should join the existing conversation and save correctly', async () => {
    const { conversationStore, handler } = init();
    
    const conv = Conversation.create('conv-1', 'workspace-1', 'General');
    await conversationStore.save(conv);

    const command = new JoinConversationCommand('conv-1', 'user-1');
    await handler.handle(command);

    const updatedConv = await conversationStore.findById('conv-1');
    expect(updatedConv?.getMembers()).toContain('user-1');
  });
});
