import { EventEmitter } from "events";

export type LiveEvent = {
  kind:
    | "request.created"
    | "request.updated"
    | "order.created"
    | "order.updated"
    | "payment.updated";
  data: unknown;
};

const globalForBus = globalThis as unknown as { sofraBus?: EventEmitter };

export const bus = globalForBus.sofraBus ?? new EventEmitter();
bus.setMaxListeners(500);

if (!globalForBus.sofraBus) globalForBus.sofraBus = bus;

export function publish(venueId: string, event: LiveEvent) {
  bus.emit(`venue:${venueId}`, event);
}

export function subscribe(venueId: string, handler: (event: LiveEvent) => void) {
  const channel = `venue:${venueId}`;
  bus.on(channel, handler);
  return () => bus.off(channel, handler);
}
