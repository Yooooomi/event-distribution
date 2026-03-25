import { DomainEventConstructor, DomainEvent } from "../event";
import { EventBus } from "../eventBus/eventBus";

export function EventConsumer<T extends DomainEventConstructor>(name: string, EVENTS: T[]) {
  return class {
    constructor(
      public readonly handlers: {
        [key in T as T["type"]]: (event: InstanceType<T>) => Promise<void>;
      },
    ) {}

    async consume(event: DomainEvent): Promise<void> {
      if (!EVENTS.some((ctor) => ctor.type === event.type)) {
        throw new Error(`Event type ${event.type} is not supported by this consumer`);
      }

      const handler = this.handlers[event.type as T["type"]];

      if (!handler) {
        console.warn(`No handler for event type ${event.type}`);
        return;
      }

      await (handler as (event: DomainEvent) => Promise<void>)(event);
    }

    async listen(eventBus: EventBus) {
      const stream = await eventBus.getStream(name, EVENTS);

      for (const EVENT of EVENTS) {
        stream.on(EVENT, (event) => this.consume(event as DomainEvent));
      }
    }
  };
}
