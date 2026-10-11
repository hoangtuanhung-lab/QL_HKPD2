import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import {
  confirmDraw,
  roundRobin,
  projectMatches,
  type CompetitionSnapshot,
} from "../packages/competition/src/index.js";
import {
  confirmPreview,
  submitPreview,
} from "../packages/results/src/index.js";
import { match, score, ids, clock } from "./group-k-fixtures.js";
const entrants = Array.from({ length: 3 }, (_, i) => ({
  id: randomUUID(),
  label: `Đối tượng ${i}`,
  schoolId: randomUUID(),
  personIds: [randomUUID()],
}));
const eventId = randomUUID(),
  editionId = randomUUID();
function competition(): CompetitionSnapshot {
  return {
    eventId,
    editionId,
    sportId: randomUUID(),
    kind: "individual_combat",
    version: 1,
    status: "draft",
    startedAt: null,
    entrants,
    draw: roundRobin(eventId, entrants),
    withdrawnIds: [],
  };
}
it("C rejects confirming a draw with stale team member identities", () => {
  const c = competition();
  c.entrants = c.entrants.map((e, i) =>
    i === 0 ? { ...e, personIds: [randomUUID()] } : e,
  );
  expect(() => confirmDraw(c, 1)).toThrow();
});
it("A03/C refuses two entrants aliased to the same athlete UUID", () => {
  const draw = competition().draw!;
  const target = randomUUID();
  expect(() =>
    projectMatches(draw, {
      editionId,
      matchIds: new Map(
        draw.rounds.flatMap((r) => r.matches).map((m) => [m.id, randomUUID()]),
      ),
      participants: new Map(
        entrants.map((e) => [
          e.id,
          { kind: "athlete" as const, athlete_id: target },
        ]),
      ),
    }),
  ).toThrow();
});
it("K refuses a submission attached to another match/edition even if scores match", () => {
  const s = structuredClone(
    submitPreview(match(), score(), ids.ref, clock(), randomUUID()),
  );
  s.submissions[0]!.edition_id = randomUUID();
  expect(() =>
    confirmPreview(
      s,
      {
        submission_id: s.submissions[0]!.id,
        submission_version: 1,
        base_official_version: 0,
      },
      ids.leader,
      clock(),
      randomUUID(),
    ),
  ).toThrow();
});
it("R prevents revision approval/registration once C/K has locked the event", async () => {
  const {
    TestRegistryStore,
    registry,
    athlete,
    registration,
    ids: rids,
    schoolActor,
  } = await import("./group-r-fixtures.js");
  const { executeRegistration } =
    await import("../packages/registration/src/index.js");
  const state = registry();
  state.athletes = [athlete("a")];
  state.registrations = [registration("r", "a")];
  for (const lifecycle of [
    { locked: true, startedAt: null, hasSavedResults: false },
    {
      locked: false,
      startedAt: "2026-10-11T00:00:00Z",
      hasSavedResults: false,
    },
    { locked: false, startedAt: null, hasSavedResults: true },
  ]) {
    const store = new TestRegistryStore(state);
    store.lifecycle = lifecycle;
    await expect(
      executeRegistration(
        store,
        {
          actorId: schoolActor.id,
          editionId: rids.edition,
          key: randomUUID(),
          baseVersion: 1,
          operation: { type: "submit", registrationId: "r" },
        },
        clock,
      ),
    ).rejects.toMatchObject({ code: "EVENT_LOCKED" });
    expect(store.state).toEqual(state);
    expect(store.events).toHaveLength(0);
  }
});
it("B04 passes the freshly loaded actor to apply, not forged/stale assignments from the command", async () => {
  const { executeCommand } =
    await import("../packages/foundation/src/index.js");
  const trusted = {
    id: "actor",
    approved: true,
    assignments: [
      { editionId: "edition", role: "school" as const, schoolId: "school" },
    ],
  };
  const command = {
    actor: {
      ...trusted,
      assignments: [
        ...trusted.assignments,
        { editionId: "edition", role: "admin" as const },
      ],
    },
    action: "school.write" as const,
    editionId: "edition",
    method: "POST" as const,
    path: "/register",
    key: randomUUID(),
    baseVersion: 1,
    payload: {},
  };
  await executeCommand(
    {
      transaction: async (run) =>
        run({
          actor: async () => trusted,
          target: async () => ({
            id: "resource",
            version: 1,
            scope: { editionId: "edition", schoolId: "school" },
          }),
          receipt: async () => null,
          apply: async (c) => {
            expect(c.actor).toEqual(trusted);
            return {};
          },
          audit: async () => {},
          enqueue: async () => {},
          saveReceipt: async () => {},
        }),
    },
    command,
  );
});
