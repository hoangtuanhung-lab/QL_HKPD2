import {
  deliver,
  type Event,
  type DeliveryTransaction,
  type DeliveryStore,
} from "@hkpd/foundation";
import {
  ensure,
  invalidatePublication,
  type ResultMatch,
  type Publication,
} from "@hkpd/results";
import { publicationReadiness, type EventBundle } from "./pipeline.js";
export interface ResultDeliveryTransaction extends DeliveryTransaction {
  resultForUpdate(matchId: string): Promise<ResultMatch>;
  bundleForUpdate(eventId: string): Promise<EventBundle>;
  matchesForUpdate(eventId: string): Promise<readonly ResultMatch[]>;
  publicationForUpdate(eventId: string): Promise<Publication | null>;
  savePublication(
    publication: Publication,
    expectedVersion: number,
  ): Promise<void>;
  invalidateMatches(matchIds: readonly string[]): Promise<void>;
  requestRebuild(
    editionId: string,
    eventId: string,
    sourceVersions: Readonly<Record<string, number>>,
  ): Promise<void>;
}
/** Atomic internal consumer; store must lock C/K/publication and receipt together. No network side effects. */
export function deliverResultConfirmed(
  store: DeliveryStore<ResultDeliveryTransaction>,
  event: Event,
) {
  ensure(
    event.type === "OfficialResultConfirmed" &&
      Number.isSafeInteger(event.version) &&
      event.version > 0,
    "EVENT_INPUT",
    "Không phải sự kiện kết quả xác nhận.",
  );
  return deliver(store, "competition-results-v1", event, async (tx, event) => {
    const match = await tx.resultForUpdate(event.resourceId);
    ensure(
      match.id === event.resourceId &&
        match.editionId === event.editionId &&
        match.official &&
        match.official.version >= event.version,
      "EVENT_SCOPE",
      "Sự kiện sai phạm vi hoặc official chưa sẵn sàng.",
    );
    const bundle = await tx.bundleForUpdate(match.eventId);
    ensure(
      bundle.competition.editionId === event.editionId &&
        bundle.competition.eventId === match.eventId,
      "EVENT_SCOPE",
      "Sai phạm vi sơ đồ.",
    );
    const records = await tx.matchesForUpdate(match.eventId);
    ensure(
      records.some(
        (m) =>
          m.id === match.id && m.official?.version === match.official!.version,
      ),
      "EVENT_SCOPE",
      "Snapshot kết quả không đồng nhất.",
    );
    const state = publicationReadiness(bundle, records);
    const p = await tx.publicationForUpdate(match.eventId);
    if (p) {
      ensure(
        p.editionId === event.editionId,
        "EVENT_SCOPE",
        "Công bố sai kỳ giải.",
      );
      const next = invalidatePublication(p, match.id, match.official.version);
      if (next !== p) await tx.savePublication(next, p.version);
    }
    await tx.invalidateMatches(state.staleMatchIds);
    await tx.requestRebuild(
      event.editionId,
      match.eventId,
      state.sourceVersions,
    );
  });
}
