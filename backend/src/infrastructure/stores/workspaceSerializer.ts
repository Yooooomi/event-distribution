import { AggregateSerializer } from '../core/aggregateSerializer';
import { Workspace } from '../../domain/workspace/workspace';

export interface WorkspaceData {
  id: string;
  name: string;
}

export class WorkspaceSerializer implements AggregateSerializer<Workspace, WorkspaceData> {
  serialize(aggregate: Workspace): WorkspaceData {
    return {
      id: aggregate.id,
      name: aggregate.name
    };
  }

  deserialize(data: WorkspaceData): Workspace {
    return Workspace.load(data.id, data.name);
  }
}
