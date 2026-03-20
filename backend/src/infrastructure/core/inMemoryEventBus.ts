import { DomainEvent } from '../../domain/core/domainEvent';
import { EventBus } from './eventBus';

export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventType) || [];
    await Promise.all(eventHandlers.map(handler => handler(event)));
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    const eventHandlers = this.handlers.get(eventType) || [];
    eventHandlers.push(handler);
    this.handlers.set(eventType, eventHandlers);
  }
}
