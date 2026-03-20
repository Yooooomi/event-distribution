import { AggregateRoot } from '../core/aggregateRoot';
import { WorkspaceCreatedEvent } from './workspaceCreatedEvent';
import { randomUUID } from 'crypto';

export class Workspace extends AggregateRoot {
  public readonly name: string;

  private constructor(id: string, name: string) {
    super(id);
    this.name = name;
  }

  public static create(id: string, name: string): Workspace {
    const workspace = new Workspace(id, name);
    workspace.addEvent(new WorkspaceCreatedEvent(randomUUID(), new Date(), id, name));
    return workspace;
  }

  public static load(id: string, name: string): Workspace {
    return new Workspace(id, name);
  }
}
