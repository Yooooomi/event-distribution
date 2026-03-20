import { Kafka, Producer, Consumer, Admin } from "kafkajs";

import {
  DomainEvent,
  KafkaPartitionedEventClass,
  PartitionKeySelector,
} from "../../domain/core/domainEvent";
import { EventBus } from "./eventBus";
import { NoRetryError } from "./noRetryError";

export class KafkaEventBus implements EventBus {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private admin: Admin;
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  constructor(
    brokers: string[],
    private readonly clientId: string,
    private readonly topicPartitions = 3,
  ) {
    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: brokers,
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: `${this.clientId}-group` });
    this.admin = this.kafka.admin();
  }

  async connect(): Promise<void> {
    await this.admin.connect();
    const topics = await this.admin.listTopics();
    if (!topics.includes("domain-events")) {
      await this.admin.createTopics({
        topics: [
          { topic: "domain-events", numPartitions: this.topicPartitions, replicationFactor: 1 },
        ],
      });
      console.log("[KafkaEventBus] Topic domain-events created natively.");
    }
    await this.admin.disconnect();

    await this.producer.connect();
    await this.consumer.connect();

    // Subscribe to domain-events
    await this.consumer.subscribe({ topic: "domain-events", fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;

        const event: DomainEvent = JSON.parse(message.value.toString());
        const eventHandlers = this.handlers.get(event.eventType) || [];

        const results = await Promise.allSettled(eventHandlers.map((handler) => handler(event)));

        const retryableFailure = results.find(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected" && !(result.reason instanceof NoRetryError),
        );

        if (retryableFailure) {
          throw retryableFailure.reason;
        }

        const noRetryFailures = results.filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected" && result.reason instanceof NoRetryError,
        );

        if (noRetryFailures.length > 0) {
          console.warn("[KafkaEventBus] Message handling failed without retry:", noRetryFailures);
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }

  async publish(event: DomainEvent): Promise<void> {
    try {
      // ensure earlier events were sent
      // KAFKA HEAD - missing - HEAD
      await this.producer.send({
        topic: "domain-events",
        messages: [{ key: this.resolvePartitionKey(event), value: JSON.stringify(event) }],
      });
    } catch (e) {
      console.error("[KafkaEventBus] Failed to publish", e);
      throw e;
    }
  }

  private resolvePartitionKey(event: DomainEvent): string {
    const eventClass = event.constructor as KafkaPartitionedEventClass;
    const selector = eventClass.partitionKey;

    if (!selector) {
      return event.eventType;
    }

    const key = this.resolveKeyFromSelector(event, selector);
    return key ?? event.eventType;
  }

  private resolveKeyFromSelector(
    event: DomainEvent,
    selector: PartitionKeySelector,
  ): string | undefined {
    if (typeof selector === "function") {
      return selector(event);
    }

    const value = event[selector];
    return value == null ? undefined : String(value);
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    const eventHandlers = this.handlers.get(eventType) || [];
    eventHandlers.push(handler);
    this.handlers.set(eventType, eventHandlers);
  }
}
