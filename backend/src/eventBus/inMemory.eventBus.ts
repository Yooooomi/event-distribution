import { DomainEvent, DomainEventConstructor } from "../event";
import { EventStream, EventBus } from "./eventBus";

export class InMemoryEventStream implements EventStream {
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();
  private currentHandlers = new Map<string, Promise<void>>();
  private queue: Map<string, DomainEvent[]> = new Map();

  public handledEventCount = 0;

  constructor(private readonly EVENTS: DomainEventConstructor[]) {}

  isInterestedBy(event: DomainEvent): boolean {
    return this.EVENTS.some((ctor) => ctor.type === event.type);
  }

  /**
   * Need to implement retry and dead letter queue
   */
  private async dequeue() {
    for (const [orderingKey, events] of this.queue.entries()) {
      if (this.currentHandlers.get(orderingKey)) {
        continue;
      }

      const [event] = events;

      if (!event) {
        continue;
      }

      const eventHandlers = this.handlers.get(event.type) || [];
      if (eventHandlers.length === 0) {
        this.handledEventCount += 1;
        continue;
      }

      const processingPromise = Promise.all(eventHandlers.map((handler) => handler(event)))
        .then(() => {
          this.handledEventCount += 1;
          this.dequeue();
        })
        .catch((e) => {
          console.error(`Error processing event ${event.eventId}:`, e);
          this.currentHandlers.delete(orderingKey);
        });

      this.currentHandlers.set(orderingKey, processingPromise);
    }
  }

  async handle(event: DomainEvent): Promise<void> {
    const eventOrderingKey = event.orderingKey();
    const eventQueue = this.queue.get(eventOrderingKey) || [];
    eventQueue.push(event);
    this.queue.set(eventOrderingKey, eventQueue);
    this.dequeue();
  }

  on<T extends DomainEventConstructor>(
    EVENT: T,
    handler: (event: InstanceType<T>) => Promise<void>,
  ): void {
    if (!this.EVENTS.some((ctor) => ctor.type === EVENT.type)) {
      throw new Error(`Event type ${EVENT.type} is not supported by this stream`);
    }

    const eventHandlers = this.handlers.get(EVENT.type) || [];
    eventHandlers.push(handler as (event: DomainEvent) => Promise<void>);
    this.handlers.set(EVENT.type, eventHandlers);
  }

  off(EVENT: DomainEventConstructor, handler: (event: DomainEvent) => Promise<void>): void {
    if (!this.EVENTS.some((ctor) => ctor.type === EVENT.type)) {
      throw new Error(`Event type ${EVENT.type} is not supported by this stream`);
    }

    const eventHandlers = this.handlers.get(EVENT.type) || [];
    this.handlers.set(
      EVENT.type,
      eventHandlers.filter((h) => h !== handler),
    );
  }
}

export class InMemoryEventBus implements EventBus {
  private readonly streams: Map<string, InMemoryEventStream> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    const interestedStreams = Array.from(this.streams.values()).filter((stream) =>
      stream.isInterestedBy(event),
    );

    await Promise.all(interestedStreams.map((stream) => stream.handle(event)));
  }

  async getStream(name: string, EVENTS: DomainEventConstructor[]): Promise<EventStream> {
    const existing = this.streams.get(name);
    if (existing) {
      return existing;
    }
    const stream = new InMemoryEventStream(EVENTS);
    this.streams.set(name, stream);
    return stream;
  }
}
