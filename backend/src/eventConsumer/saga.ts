import { DomainEventConstructor } from "../event";
import { EventConsumer } from "./eventConsumer";

export function Saga<T extends DomainEventConstructor>(name: string, EVENTS: T[]) {
  return EventConsumer(`saga-${name}`, EVENTS);
}
