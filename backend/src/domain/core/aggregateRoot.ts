import { DomainEvent } from './domainEvent';

export abstract class AggregateRoot {
  public readonly id: string;
  private _uncommittedEvents: DomainEvent[] = [];

  constructor(id: string) {
    this.id = id;
  }

  protected addEvent(event: DomainEvent): void {
    this._uncommittedEvents.push(event);
  }

  public getUncommittedEvents(): DomainEvent[] {
    return [...this._uncommittedEvents];
  }

  public clearEvents(): void {
    this._uncommittedEvents = [];
  }
}
