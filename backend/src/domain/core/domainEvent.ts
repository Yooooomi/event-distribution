export interface DomainEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
}

export type PartitionKeySelector<TEvent extends DomainEvent = DomainEvent> =
  | Extract<keyof TEvent, string>
  | ((event: TEvent) => string);

export interface KafkaPartitionedEventClass<TEvent extends DomainEvent = DomainEvent> {
  partitionKey?: PartitionKeySelector<TEvent>;
}
