import { DomainEvent } from "../event";
import { EventConsumer } from "./eventConsumer";

describe("EventConsumer", () => {
  class TestEvent1 extends DomainEvent<{ value: number }>().new("TestEvent1") {
    orderingKey(): string {
      return this.payload.value.toString();
    }
  }
  class TestEvent2 extends DomainEvent<{ value: number }>().new("TestEvent2") {
    orderingKey(): string {
      return this.payload.value.toString();
    }
  }

  it("should consume events in order", async () => {
    const consumedEvents: string[] = [];
    class MyConsumer extends EventConsumer("test-consumer", [TestEvent1, TestEvent2]) {}
    const consumer = new MyConsumer({
      TestEvent1: async () => {
        consumedEvents.push("event1");
      },
      TestEvent2: async () => {
        consumedEvents.push("event2");
      },
    });

    await consumer.consume(TestEvent1.new({ value: 1 }));
    await consumer.consume(TestEvent2.new({ value: 2 }));

    expect(consumedEvents).toEqual(["event1", "event2"]);
  });
});
