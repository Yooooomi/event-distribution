import { AggregateRoot } from '../../domain/core/aggregateRoot';

export interface AggregateSerializer<TAggregate extends AggregateRoot, TData> {
  serialize(aggregate: TAggregate): TData;
  deserialize(data: TData): TAggregate;
}
