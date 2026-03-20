import { CreateConversationHandler } from './createConversationHandler';
import { CreateConversationCommand } from './createConversationCommand';
import { InMemoryWorkspaceStore } from '../../infrastructure/stores/workspaceStore';
import { InMemoryConversationStore } from '../../infrastructure/stores/conversationStore';
import { InMemoryEventBus } from '../../infrastructure/core/inMemoryEventBus';
import { Workspace } from '../../domain/workspace/workspace';

function init() {
  const eventBus = new InMemoryEventBus();
  const workspaceStore = new InMemoryWorkspaceStore(eventBus);
  const conversationStore = new InMemoryConversationStore(eventBus);
  const handler = new CreateConversationHandler(conversationStore, workspaceStore);
  return { eventBus, workspaceStore, conversationStore, handler };
}

describe('CreateConversationHandler', () => {
  it('should throw an error if the workspace does not exist', async () => {
    const { handler } = init();
    
    const command = new CreateConversationCommand('conv-1', 'workspace-999', 'General');
    await expect(handler.handle(command)).rejects.toThrow('Workspace not found');
  });

  it('should create and save a new conversation if workspace exists', async () => {
    const { workspaceStore, conversationStore, handler } = init();
    
    const workspace = Workspace.create('workspace-1', 'My Workspace');
    await workspaceStore.save(workspace);

    const command = new CreateConversationCommand('conv-1', 'workspace-1', 'General');
    await handler.handle(command);

    const conversation = await conversationStore.findById('conv-1');
    expect(conversation).toBeDefined();
    expect(conversation?.title).toBe('General');
    expect(conversation?.workspaceId).toBe('workspace-1');
  });
});
