export interface DomainEvent {
  eventId: string;
  type: string;
  payload: unknown;
  orderingKey(): string;
}

export interface DomainEventConstructor {
  type: string;
  new (...args: any[]): DomainEvent;
}

export function DomainEvent<T>() {
  return {
    new: <const N extends string>(type: N) => {
      abstract class AbstractEvent implements DomainEvent {
        eventId = crypto.randomUUID();

        static type = type;
        type = type;

        abstract orderingKey(): string;

        constructor(public readonly payload: T) {}

        static new<C extends AbstractEvent>(this: new (payload: T) => C, payload: T): C {
          return new this(payload);
        }
      }

      return AbstractEvent;
    },
  };
}
