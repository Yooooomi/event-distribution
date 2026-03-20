import { Store } from '../../infrastructure/core/store';
import { Conversation } from '../../domain/conversation/conversation';
import { Workspace } from '../../domain/workspace/workspace';
import { CreateConversationCommand } from './createConversationCommand';

export class CreateConversationHandler {
  constructor(
    private readonly conversationStore: Store<Conversation>,
    private readonly workspaceStore: Store<Workspace>
  ) {}

  async handle(command: CreateConversationCommand): Promise<void> {
    const workspace = await this.workspaceStore.findById(command.workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const conversation = Conversation.create(command.id, command.workspaceId, command.title);
    await this.conversationStore.save(conversation);
  }
}
