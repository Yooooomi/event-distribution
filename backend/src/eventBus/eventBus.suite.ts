import { DomainEvent } from "../event";
import { EventBus, EventStream } from "./eventBus";

export function EventBusSuite(
  eventBusFactory: () => Promise<{ eventBus: EventBus; close?: () => void }>,
) {
  async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function deferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    const promise = new Promise<T>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  }

  async function waitForCallCount(mock: jest.Mock, expectedCalls: number, timeoutMs = 5000) {
    const start = Date.now();
    while (mock.mock.calls.length < expectedCalls) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(
          `Timed out waiting for ${expectedCalls} calls, got ${mock.mock.calls.length}`,
        );
      }
      await wait(50);
    }
  }

  async function waitForHandleCount(
    eventStream: EventStream,
    expectedCount: number,
    timeoutMs = 5000,
  ) {
    const start = Date.now();
    while (eventStream.handledEventCount < expectedCount) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(
          `Timed out waiting for ${expectedCount} handled events, got ${eventStream.handledEventCount}`,
        );
      }
      await wait(50);
    }
  }

  class TestEvent extends DomainEvent<{ value: number }>().new("TestEvent") {
    orderingKey(): string {
      return this.payload.value.toString();
    }
  }

  class UnsupportedEvent extends DomainEvent<{}>().new("UnsupportedEvent") {
    orderingKey(): string {
      return "unsupported";
    }
  }

  describe("EventBus", () => {
    it("should publish and subscribe to events", async () => {
      const { eventBus, close } = await eventBusFactory();

      const stream = await eventBus.getStream("test-stream", [TestEvent]);

      const handler = jest.fn();
      stream.on(TestEvent, handler);

      const event = new TestEvent({ value: 42 });
      await eventBus.publish(event);

      // Wait for the event to be handled
      await waitForHandleCount(stream, 1);

      expect(handler).toHaveBeenCalledWith(event);
      close?.();
    });

    it("should not call handler after it is unsubscribed", async () => {
      const { eventBus, close } = await eventBusFactory();

      const stream = await eventBus.getStream("test-stream-off", [TestEvent]);

      const handler = jest.fn();
      stream.on(TestEvent, handler);
      stream.off(TestEvent, handler);

      const event = new TestEvent({ value: 7 });
      await eventBus.publish(event);

      await waitForHandleCount(stream, 1);

      expect(handler).not.toHaveBeenCalled();
      close?.();
    });

    it("should only dispatch events to interested streams", async () => {
      const { eventBus, close } = await eventBusFactory();

      const interestedStream = await eventBus.getStream("test-stream-interested", [TestEvent]);
      const uninterestedStream = await eventBus.getStream("test-stream-uninterested", [
        UnsupportedEvent,
      ]);

      const interestedHandler = jest.fn();
      const uninterestedHandler = jest.fn();

      interestedStream.on(TestEvent, interestedHandler);
      uninterestedStream.on(UnsupportedEvent, uninterestedHandler);

      const event = new TestEvent({ value: 99 });
      await eventBus.publish(event);

      await waitForHandleCount(interestedStream, 1);

      expect(interestedHandler).toHaveBeenCalledWith(event);
      expect(uninterestedHandler).not.toHaveBeenCalled();
      close?.();
    });

    it("should return the same stream instance for the same stream name", async () => {
      const { eventBus, close } = await eventBusFactory();

      const streamA = await eventBus.getStream("test-stream-singleton", [TestEvent]);
      const streamB = await eventBus.getStream("test-stream-singleton", [TestEvent]);

      expect(streamA).toBe(streamB);
      close?.();
    });

    it("should let two streams consume the same events at different paces", async () => {
      const { eventBus, close } = await eventBusFactory();

      const slowStream = await eventBus.getStream("test-stream-slow", [TestEvent]);
      const fastStream = await eventBus.getStream("test-stream-fast", [TestEvent]);

      const unblockSlow = deferred<void>();
      const slowHandler = jest.fn(async () => {
        await unblockSlow.promise;
      });
      const fastHandler = jest.fn(async () => Promise.resolve());

      slowStream.on(TestEvent, slowHandler);
      fastStream.on(TestEvent, fastHandler);

      await eventBus.publish(new TestEvent({ value: 1 }));
      await eventBus.publish(new TestEvent({ value: 2 }));

      await waitForCallCount(fastHandler, 2);

      expect(slowHandler).toHaveBeenCalled();
      expect(fastHandler).toHaveBeenCalledTimes(2);

      unblockSlow.resolve();
      close?.();
    });

    it("should throw when trying to subscribe to an unsupported event type", async () => {
      const { eventBus, close } = await eventBusFactory();

      const stream = await eventBus.getStream("test-stream", [TestEvent]);

      expect(() => stream.on(UnsupportedEvent, Promise.resolve)).toThrow(
        "Event type UnsupportedEvent is not supported by this stream",
      );
      close?.();
    });
  });
}
