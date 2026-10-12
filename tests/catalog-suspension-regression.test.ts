import { describe, expect, it } from "vitest";
import {
  snapshotCatalog,
  suspendEvent,
  transitionRegistration,
} from "@hkpd/registration";
import {
  confirmEvent,
  prepareEvent,
  assertRosterCurrent,
} from "../packages/integration/src/index.js";
import { approvedRegistry, bundle } from "./cross-group-fixtures.js";
import { randomUUID } from "node:crypto";

describe("AUD-01 current catalog validation before confirming an existing draft", () => {
  it("keeps a valid team draw confirmable and blocks it after suspension", () => {
    const state = approvedRegistry(6);
    const eventId = state.catalog.nodes.find((n) => n.kind === "event")!.id;
    const schoolIds = [0, 2, 4].map((i) => state.athletes[i]!.schoolId);
    state.catalog = snapshotCatalog(
      state.catalog.id,
      state.editionId,
      1,
      state.catalog.nodes.map((n) =>
        n.kind === "event"
          ? {
              ...n,
              participantKind: "team" as const,
              rules: { minMembers: 2, maxMembers: 2 },
            }
          : n,
      ),
    );
    state.athletes = state.athletes.map((a, i) => ({
      ...a,
      schoolId: schoolIds[Math.floor(i / 2)]!,
    }));
    state.teams = schoolIds.map((schoolId, i) => ({
      id: randomUUID(),
      editionId: state.editionId,
      schoolId,
      eventId,
      name: `Synthetic team ${i}`,
      memberIds: state.athletes.slice(i * 2, i * 2 + 2).map((a) => a.id),
    }));
    state.registrations = [];
    const now = new Date("2026-10-12T00:00:00.000Z");
    for (const team of state.teams) {
      const registration = {
        id: randomUUID(),
        editionId: state.editionId,
        schoolId: team.schoolId,
        eventId,
        version: 1,
        approvedRevisionId: null,
        revisions: [
          {
            id: randomUUID(),
            version: 1,
            status: "draft" as const,
            participant: { kind: "team" as const, teamId: team.id },
          },
        ],
      };
      const submitted = transitionRegistration(
        state,
        registration,
        "submit",
        1,
        now,
      );
      state.registrations = [
        ...state.registrations,
        transitionRegistration(
          state,
          submitted,
          "approve",
          submitted.version,
          now,
        ),
      ];
    }
    const draft = prepareEvent(
      state,
      eventId,
      "team",
      { snapshotId: randomUUID(), kind: "score", precision: 0 },
      randomUUID,
      { random: () => 0 },
    );
    expect(confirmEvent(draft, state, 1).competition.status).toBe(
      "draw_confirmed",
    );
    expect(() =>
      confirmEvent(
        draft,
        { ...state, catalog: suspendEvent(state.catalog, eventId) },
        1,
      ),
    ).toThrow("Danh mục/kỳ giải");
  });
  it.each([3, 6])(
    "rejects draft then event suspension for %i entrants without changing snapshots",
    (count) => {
      const state = approvedRegistry(count),
        draft = bundle(state);
      const suspended = {
        ...state,
        catalog: suspendEvent(state.catalog, draft.competition.eventId),
      };
      const before = structuredClone({ draft, suspended });
      expect(suspended.catalog.id).toBe(draft.catalogSnapshotId);
      expect(suspended.catalog.sourceVersion).toBe(
        draft.catalogSourceVersion + 1,
      );
      expect(() => confirmEvent(draft, suspended, 1)).toThrow(
        expect.objectContaining({ code: "ROSTER_STALE" }),
      );
      expect({ draft, suspended }).toEqual(before);
      expect(() =>
        prepareEvent(
          suspended,
          draft.competition.eventId,
          "individual_combat",
          draft.rule,
          randomUUID,
        ),
      ).toThrow();
    },
  );
  it("rejects when the parent sport has been suspended", () => {
    const state = approvedRegistry(3),
      draft = bundle(state);
    const stopped = {
      ...state,
      catalog: snapshotCatalog(
        state.catalog.id,
        state.editionId,
        state.catalog.sourceVersion + 1,
        state.catalog.nodes.map((n) =>
          n.kind === "sport" ? { ...n, active: false } : n,
        ),
      ),
    };
    expect(() => confirmEvent(draft, stopped, 1)).toThrow(
      expect.objectContaining({ code: "ROSTER_STALE" }),
    );
  });
  it.each(["event", "sport"])(
    "also checks inactive %s even with matching version metadata",
    (kind) => {
      const state = approvedRegistry(3),
        draft = bundle(state);
      const stopped = {
        ...state,
        catalog: snapshotCatalog(
          state.catalog.id,
          state.editionId,
          state.catalog.sourceVersion + 1,
          state.catalog.nodes.map((n) =>
            n.kind === kind ? { ...n, active: false } : n,
          ),
        ),
      };
      // Corrupt/backfilled bundle metadata must not substitute for the activity check.
      const matchingVersion = {
        ...draft,
        catalogSourceVersion: stopped.catalog.sourceVersion,
      };
      expect(() => confirmEvent(matchingVersion, stopped, 1)).toThrow(
        "đã ngừng",
      );
    },
  );
  it("rejects changed rule configuration under the same catalog ID, even if the event stays active", () => {
    const state = approvedRegistry(3),
      draft = bundle(state);
    const changed = {
      ...state,
      catalog: snapshotCatalog(
        state.catalog.id,
        state.editionId,
        state.catalog.sourceVersion + 1,
        state.catalog.nodes.map((n) =>
          n.kind === "event"
            ? { ...n, rules: { ...n.rules, schoolQuota: 1 } }
            : n,
        ),
      ),
    };
    expect(() => confirmEvent(draft, changed, 1)).toThrow("Danh mục/kỳ giải");
    expect(confirmEvent(bundle(changed), changed, 1).competition.status).toBe(
      "draw_confirmed",
    );
  });
  it.each(["sport", "participantKind", "eventKind"])(
    "rejects mismatched %s despite unchanged catalog identifiers",
    (field) => {
      const state = approvedRegistry(3),
        original = bundle(state);
      const draft = structuredClone(original);
      if (field === "sport") draft.competition.sportId = randomUUID();
      if (field === "eventKind")
        draft.competition.kind = "unsupported" as never;
      const current =
        field === "participantKind"
          ? {
              ...state,
              catalog: snapshotCatalog(
                state.catalog.id,
                state.editionId,
                state.catalog.sourceVersion,
                state.catalog.nodes.map((n) =>
                  n.kind === "event"
                    ? { ...n, participantKind: "team" as const }
                    : n,
                ),
              ),
            }
          : state;
      expect(() => confirmEvent(draft, current, 1)).toThrow("không khớp");
    },
  );
  it.each([undefined, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects missing/invalid bundle catalog version %s",
    (version) => {
      const state = approvedRegistry(3),
        draft = { ...bundle(state), catalogSourceVersion: version };
      expect(() => confirmEvent(draft as never, state, 1)).toThrow(
        "Danh mục/kỳ giải",
      );
    },
  );
  it("validates catalog version at preparation and rejects stale registry versions", () => {
    const state = approvedRegistry(3),
      draft = bundle(state);
    expect(() =>
      bundle({ ...state, catalog: { ...state.catalog, sourceVersion: 0 } }),
    ).toThrow("Phiên bản danh mục");
    expect(() =>
      confirmEvent(
        draft,
        { ...state, catalog: { ...state.catalog, sourceVersion: 0 } },
        1,
      ),
    ).toThrow("Danh mục/kỳ giải");
  });
  it.each([3, 6])(
    "unchanged authoritative catalog still confirms %i-entrant draw and captures version",
    (count) => {
      const state = approvedRegistry(count),
        draft = bundle(state);
      expect(draft.catalogSourceVersion).toBe(state.catalog.sourceVersion);
      expect(() => assertRosterCurrent(draft, state)).not.toThrow();
      const confirmed = confirmEvent(draft, state, 1);
      expect(confirmed.competition.status).toBe("draw_confirmed");
      expect(confirmed.competition.version).toBe(2);
      expect(confirmed.catalogSourceVersion).toBe(state.catalog.sourceVersion);
      expect(draft.competition.status).toBe("draft");
    },
  );
});
