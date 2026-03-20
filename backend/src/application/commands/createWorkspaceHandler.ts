import { Store } from '../../infrastructure/core/store';
import { Workspace } from '../../domain/workspace/workspace';
import { CreateWorkspaceCommand } from './createWorkspaceCommand';

export class CreateWorkspaceHandler {
  constructor(private readonly store: Store<Workspace>) {}

  async handle(command: CreateWorkspaceCommand): Promise<void> {
    const workspace = Workspace.create(command.id, command.name);
    await this.store.save(workspace);
  }
}
