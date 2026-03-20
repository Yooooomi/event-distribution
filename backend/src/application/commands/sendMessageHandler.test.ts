import { SendMessageHandler } from './sendMessageHandler';
import { SendMessageCommand } from './sendMessageCommand';
import { InMemoryConversationStore } from '../../infrastructure/stores/conversationStore';
import { InMemoryMessageStore } from '../../infrastructure/stores/messageStore';
import { InMemoryEventBus } from '../../infrastructure/core/inMemoryEventBus';
import { Conversation } from '../../domain/conversation/conversation';

function init() {
  const eventBus = new InMemoryEventBus();
  const conversationStore = new InMemoryConversationStore(eventBus);
  const messageStore = new InMemoryMessageStore(eventBus);
  const handler = new SendMessageHandler(conversationStore, messageStore);
  return { eventBus, conversationStore, messageStore, handler };
}

describe('SendMessageHandler', () => {
  it('should throw an error if the conversation does not exist', async () => {
    const { handler } = init();
    
    const command = new SendMessageCommand('msg-1', 'conv-999', 'user-1', 'Hello');
    await expect(handler.handle(command)).rejects.toThrow('Conversation not found');
  });

  it('should correctly build and dispatch a message to an existing conversation', async () => {
    const { conversationStore, messageStore, handler } = init();
    
    const conv = Conversation.create('conv-1', 'ws-1', 'General');
    await conversationStore.save(conv);

    const command = new SendMessageCommand('msg-1', 'conv-1', 'user-1', 'Hello world');
    await handler.handle(command);

    const message = await messageStore.findById('msg-1');
    expect(message).toBeDefined();
    expect(message?.conversationId).toBe('conv-1');
    expect(message?.senderId).toBe('user-1');
    expect(message?.text).toBe('Hello world');
  });
});
