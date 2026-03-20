import { DomainEvent } from '../core/domainEvent';

export class WorkspaceCreatedEvent implements DomainEvent {
  public eventType = 'WorkspaceCreatedEvent';

  constructor(
    public readonly eventId: string,
    public readonly timestamp: Date,
    public readonly workspaceId: string,
    public readonly name: string
  ) {}
}
