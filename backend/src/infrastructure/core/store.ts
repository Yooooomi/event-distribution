import { AggregateRoot } from '../../domain/core/aggregateRoot';

export interface Store<TAggregate extends AggregateRoot> {
  save(aggregate: TAggregate): Promise<void>;
  findById(id: string): Promise<TAggregate | null>;
}
