import { BaseInMemoryStore } from '../core/baseInMemoryStore';
import { BasePostgresStore, DatabaseClient } from '../core/basePostgresStore';
import { Workspace } from '../../domain/workspace/workspace';
import { WorkspaceData, WorkspaceSerializer } from './workspaceSerializer';
import { EventBus } from '../core/eventBus';

export class InMemoryWorkspaceStore extends BaseInMemoryStore<Workspace, WorkspaceData> {
  constructor(eventBus: EventBus, serializer: WorkspaceSerializer = new WorkspaceSerializer()) {
    super(eventBus, serializer);
  }

  async findAll(): Promise<Workspace[]> {
    return Array.from(this.items.values()).map((workspace) => this.serializer.deserialize(workspace));
  }
}

export class PostgresWorkspaceStore extends BasePostgresStore<Workspace, WorkspaceData> {
  constructor(dbClient: DatabaseClient, eventBus: EventBus, serializer: WorkspaceSerializer = new WorkspaceSerializer()) {
    super(dbClient, eventBus, serializer, 'workspaces');
  }

  protected mapToRow(data: WorkspaceData): any {
    return {
      id: data.id,
      name: data.name
    };
  }

  protected mapFromRow(row: any): WorkspaceData {
    return {
      id: row.id,
      name: row.name
    };
  }

  protected getUpsertQuery(): string {
    return `
      INSERT INTO workspaces (id, name)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name
    `;
  }

  protected getUpsertParams(data: WorkspaceData): any[] {
    return [data.id, data.name];
  }
}
