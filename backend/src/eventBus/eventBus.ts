import { DomainEvent, DomainEventConstructor } from "../event";

export type OrderingKeySelector = (event: DomainEvent) => string;

export interface EventStream {
  on<T extends DomainEventConstructor>(
    EVENT: T,
    handler: (event: InstanceType<T>) => Promise<void>,
  ): void;
  off(EVENT: DomainEventConstructor, handler: (event: DomainEvent) => Promise<void>): void;
  handle(event: DomainEvent): Promise<void>;

  /**
   * For testing purposes
   */
  handledEventCount: number;
}

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  getStream(name: string, EVENTS: DomainEventConstructor[]): Promise<EventStream>;
}
