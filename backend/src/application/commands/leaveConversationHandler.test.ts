import { LeaveConversationHandler } from './leaveConversationHandler';
import { LeaveConversationCommand } from './leaveConversationCommand';
import { InMemoryConversationStore } from '../../infrastructure/stores/conversationStore';
import { InMemoryEventBus } from '../../infrastructure/core/inMemoryEventBus';
import { Conversation } from '../../domain/conversation/conversation';

function init() {
  const eventBus = new InMemoryEventBus();
  const conversationStore = new InMemoryConversationStore(eventBus);
  const handler = new LeaveConversationHandler(conversationStore);
  return { eventBus, conversationStore, handler };
}

describe('LeaveConversationHandler', () => {
  it('should throw an error if the conversation does not exist', async () => {
    const { handler } = init();
    
    const command = new LeaveConversationCommand('conv-999', 'user-1');
    await expect(handler.handle(command)).rejects.toThrow('Conversation not found');
  });

  it('should leave the conversation correctly', async () => {
    const { conversationStore, handler } = init();
    
    const conv = Conversation.create('conv-1', 'workspace-1', 'General');
    conv.join('user-1');
    await conversationStore.save(conv);

    let checkConv = await conversationStore.findById('conv-1');
    expect(checkConv?.getMembers()).toContain('user-1');

    const command = new LeaveConversationCommand('conv-1', 'user-1');
    await handler.handle(command);

    checkConv = await conversationStore.findById('conv-1');
    expect(checkConv?.getMembers()).not.toContain('user-1');
  });
});
