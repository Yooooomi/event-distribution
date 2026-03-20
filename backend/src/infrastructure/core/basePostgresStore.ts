import { AggregateRoot } from '../../domain/core/aggregateRoot';
import { Store } from './store';
import { EventBus } from './eventBus';
import { AggregateSerializer } from './aggregateSerializer';

export interface DatabaseClient {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
}

export abstract class BasePostgresStore<TAggregate extends AggregateRoot, TData extends { id: string }> implements Store<TAggregate> {
  constructor(
    protected readonly dbClient: DatabaseClient,
    protected readonly eventBus: EventBus,
    protected readonly serializer: AggregateSerializer<TAggregate, TData>,
    protected readonly tableName: string
  ) {}

  protected abstract mapToRow(data: TData): any;
  protected abstract mapFromRow(row: any): TData;
  protected abstract getUpsertQuery(): string;
  protected abstract getUpsertParams(data: TData): any[];

  async save(aggregate: TAggregate): Promise<void> {
    const uncommittedEvents = aggregate.getUncommittedEvents();
    const data = this.serializer.serialize(aggregate);

    await this.dbClient.query(this.getUpsertQuery(), this.getUpsertParams(data));

    for (const event of uncommittedEvents) {
      await this.eventBus.publish(event);
    }

    aggregate.clearEvents();
  }

  async findById(id: string): Promise<TAggregate | null> {
    const result = await this.dbClient.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    
    const data = this.mapFromRow(result.rows[0]);
    return this.serializer.deserialize(data);
  }
}
