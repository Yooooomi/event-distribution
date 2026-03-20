import { AggregateRoot } from '../../domain/core/aggregateRoot';
import { Store } from './store';
import { EventBus } from './eventBus';
import { AggregateSerializer } from './aggregateSerializer';

export abstract class BaseInMemoryStore<TAggregate extends AggregateRoot, TData extends { id: string }> implements Store<TAggregate> {
  protected items: Map<string, TData> = new Map();

  constructor(
    protected readonly eventBus: EventBus,
    protected readonly serializer: AggregateSerializer<TAggregate, TData>
  ) {}

  async save(aggregate: TAggregate): Promise<void> {
    const uncommittedEvents = aggregate.getUncommittedEvents();

    // 1. Serialize and save the aggregate state
    const data = this.serializer.serialize(aggregate);
    this.items.set(aggregate.id, data);

    // 2. Publish domain events
    for (const event of uncommittedEvents) {
      await this.eventBus.publish(event);
    }

    // 3. Clear uncommitted events after successful save and publish
    aggregate.clearEvents();
  }

  async findById(id: string): Promise<TAggregate | null> {
    const data = this.items.get(id);
    if (!data) {
      return null;
    }
    return this.serializer.deserialize(data);
  }
}
