import { PubSub, Topic } from "@google-cloud/pubsub";
import { EventBus, EventStream } from "./eventBus";
import { DomainEvent, DomainEventConstructor } from "../event";

export class GooglePubSubEventStream implements EventStream {
  private readonly handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  public handledEventCount = 0;

  constructor(private readonly EVENTS: DomainEventConstructor[]) {}

  isInterestedBy(event: DomainEvent): boolean {
    return this.EVENTS.some((ctor) => ctor.type === event.type);
  }

  on<T extends DomainEventConstructor>(
    EVENT: T,
    handler: (event: InstanceType<T>) => Promise<void>,
  ): void {
    if (!this.EVENTS.some((ctor) => ctor.type === EVENT.type)) {
      console.error(`Event type ${EVENT.type} is not supported by this stream`);
      return;
    }

    const existing = this.handlers.get(EVENT.type) || [];
    existing.push(handler as (event: DomainEvent) => Promise<void>);
    this.handlers.set(EVENT.type, existing);
  }

  off(EVENT: DomainEventConstructor, handler: (event: DomainEvent) => Promise<void>): void {
    if (!this.EVENTS.some((ctor) => ctor.type === EVENT.type)) {
      console.error(`Event type ${EVENT.type} is not supported by this stream`);
      return;
    }

    const existing = this.handlers.get(EVENT.type) || [];
    this.handlers.set(
      EVENT.type,
      existing.filter((h) => h !== handler),
    );
  }

  async handle(event: DomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.type) || [];
    await Promise.all(eventHandlers.map((handler) => handler(event)));
    this.handledEventCount += 1;
  }
}

export class GooglePubSubEventBus implements EventBus {
  private initialization: Promise<Topic> | undefined;
  private readonly streams: Map<string, GooglePubSubEventStream> = new Map();

  private static TOPIC_NAME = "domain-events";

  constructor(
    private readonly pubsub: PubSub,
    private readonly pushEndpoint: string,
  ) {}

  private init() {
    if (this.initialization) {
      return this.initialization;
    }
    this.initialization = this.pubsub
      .topic(GooglePubSubEventBus.TOPIC_NAME, { messageOrdering: true })
      .get({ autoCreate: true, maxRetries: 5 })
      .then(([topic]) => {
        console.log(`[GooglePubSubEventBus] Topic ${GooglePubSubEventBus.TOPIC_NAME} is ready.`);
        return topic;
      });
    return this.initialization;
  }

  private buildSubscriptionFilter(EVENTS: DomainEventConstructor[]): string {
    const supportedTypes = EVENTS.map((EVENT) => EVENT.type).sort();
    return supportedTypes.map((type) => `attributes.type = "${type}"`).join(" OR ");
  }

  private isSubscriptionUpToDate(
    metadata: {
      filter?: string | null;
      pushConfig?: { pushEndpoint?: string | null } | null;
    },
    expectedFilter: string,
  ): boolean {
    const currentFilter = metadata.filter || "";
    const currentPushEndpoint = metadata.pushConfig?.pushEndpoint || "";
    return currentFilter === expectedFilter && currentPushEndpoint === this.pushEndpoint;
  }

  async publish(event: DomainEvent): Promise<void> {
    const topic = await this.init();
    const orderingKey = event.orderingKey();
    topic.publishMessage({
      data: Buffer.from(JSON.stringify(event)),
      orderingKey,
      attributes: { type: event.type },
    });
  }

  async getStream(name: string, EVENTS: DomainEventConstructor[]): Promise<EventStream> {
    if (name.includes("/")) {
      throw new Error("Stream name cannot contain slashes");
    }

    const topic = await this.init();
    const filter = this.buildSubscriptionFilter(EVENTS);

    let subscription = topic.subscription(name);

    const [exists] = await subscription.exists();

    if (exists) {
      const [metadata] = await subscription.getMetadata();
      if (!this.isSubscriptionUpToDate(metadata, filter)) {
        console.error(`Subscription ${name} exists but is not up to date.`);

        // Do we create subscription based on projection name & event names?
        // await subscription.delete();
        // await subscription.create({
        //   enableMessageOrdering: true,
        //   pushEndpoint: this.pushEndpoint,
        //   filter,
        // });
      }
    } else {
      [subscription] = await subscription.create({
        enableMessageOrdering: true,
        pushEndpoint: this.pushEndpoint,
        filter,
      });
    }

    const stream = this.streams.get(name);
    if (stream) {
      return stream;
    }

    const newStream = new GooglePubSubEventStream(EVENTS);
    this.streams.set(name, newStream);
    return newStream;
  }

  async handleInStream(name: string, event: DomainEvent): Promise<void> {
    const stream = this.streams.get(name);
    if (!stream) {
      return;
    }
    if (!stream.isInterestedBy(event)) {
      throw new Error(`Stream ${name} is not interested in event type ${event.type}`);
    }
    await stream.handle(event);
  }
}
