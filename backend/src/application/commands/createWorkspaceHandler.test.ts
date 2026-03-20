import { CreateWorkspaceHandler } from './createWorkspaceHandler';
import { CreateWorkspaceCommand } from './createWorkspaceCommand';
import { InMemoryWorkspaceStore } from '../../infrastructure/stores/workspaceStore';
import { InMemoryEventBus } from '../../infrastructure/core/inMemoryEventBus';

function init() {
  const eventBus = new InMemoryEventBus();
  const workspaceStore = new InMemoryWorkspaceStore(eventBus);
  const handler = new CreateWorkspaceHandler(workspaceStore);
  return { eventBus, workspaceStore, handler };
}

describe('CreateWorkspaceHandler', () => {
  it('should create and save a new workspace', async () => {
    const { workspaceStore, handler } = init();
    
    const command = new CreateWorkspaceCommand('workspace-1', 'My Workspace');
    await handler.handle(command);
    
    const workspace = await workspaceStore.findById('workspace-1');
    expect(workspace).toBeDefined();
    expect(workspace?.name).toBe('My Workspace');
  });
});
