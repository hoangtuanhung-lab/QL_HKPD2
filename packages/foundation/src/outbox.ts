import type { Event } from "./command.js";
export interface DeliveryTransaction {
  hasProcessed(consumer: string, eventId: string): Promise<boolean>;
  markProcessed(consumer: string, eventId: string): Promise<void>;
}
export interface DeliveryStore<T extends DeliveryTransaction> {
  /** Consumer writes and processed receipt commit atomically; serialize (consumer,eventId). */
  transaction<R>(run: (tx: T) => Promise<R>): Promise<R>;
}
/** Handler may only write through tx. External side effects need their own idempotent adapter. */
export async function deliver<T extends DeliveryTransaction>(
  store: DeliveryStore<T>,
  consumer: string,
  event: Event,
  handle: (tx: T, event: Event) => Promise<void>,
): Promise<"processed" | "duplicate"> {
  // Event fields are scalar; freeze the detached snapshot also against handler mutation.
  event = Object.freeze(structuredClone(event));
  if (!consumer || !event.id)
    throw new Error("Consumer and event ID are required.");
  return store.transaction(async (tx) => {
    if (await tx.hasProcessed(consumer, event.id)) return "duplicate";
    await handle(tx, event);
    await tx.markProcessed(consumer, event.id);
    return "processed";
  });
}
