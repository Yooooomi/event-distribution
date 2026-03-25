import { DomainEventConstructor } from "../event";
import { EventConsumer } from "./eventConsumer";

export function Projection<T extends DomainEventConstructor>(name: string, EVENTS: T[]) {
  return EventConsumer(`projection-${name}`, EVENTS);
}
