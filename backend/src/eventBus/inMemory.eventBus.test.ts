import { EventBusSuite } from "./eventBus.suite";
import { InMemoryEventBus } from "./inMemory.eventBus";

describe("InMemoryEventBus", () =>
  EventBusSuite(async () => ({ eventBus: new InMemoryEventBus() })));
