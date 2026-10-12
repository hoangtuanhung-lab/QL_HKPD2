import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import {
  rankRoundRobin,
  participationCounts,
  awardEvent,
  executeResult,
} from "@hkpd/results";
import {
  confirmDraw,
  replaceDraftDraw,
  createDraw,
  type Draw,
} from "@hkpd/competition";
import { snapshot, roster, random } from "./group-c-fixtures.js";
import { command, TestResultStore, clock, ids } from "./group-k-fixtures.js";
const entrants = ["a", "b", "c"].map((id) => ({ id, schoolId: id }));
const cycle = [
  ["a", "b", 0, 1],
  ["b", "c", 1, 2],
  ["c", "a", 2, 0],
].map(([left, right, lw, rw], i) => ({
  id: `m${i}`,
  left: String(left),
  right: String(right),
  leftScore: 2,
  rightScore: 1,
  confirmed: true,
  leftWarnings: Number(lw),
  rightWarnings: Number(rw),
}));
it("Q-01 missing set difference blocks lower criteria and manual tie override", () => {
  for (const manual of [false, true]) {
    const r = rankRoundRobin(entrants, cycle, {
      sport: "tug_or_push",
      ...(manual
        ? {
            manualTieOrder: ["a", "b", "c"],
            decisionKind: "physical_draw" as const,
            decisionActorId: "leader",
            decisionReason: "Synthetic draw",
          }
        : {}),
    });
    expect(r.status).toBe("unresolved");
    expect(r.provisional).toBe(false);
    expect(r.rows.every((x) => x.rank === null && x.needsDecision)).toBe(true);
    expect(r.rows.some((x) => x.criteria.includes("Ít cảnh cáo hơn"))).toBe(
      false,
    );
  }
});
it("Q-01 three-person head-to-head is inapplicable; full sets allow warnings to resolve", () => {
  const r = rankRoundRobin(
    entrants,
    cycle.map((g) => ({ ...g, leftSets: 2, rightSets: 1 })),
    { sport: "tug_or_push" },
  );
  expect(r.status).toBe("resolved");
  expect(r.rows.map((x) => x.rank)).toEqual([1, 2, 3]);
});
it("Q-01 missing football fair-play cannot be bypassed by a draw decision", () => {
  const r = rankRoundRobin(
    entrants,
    cycle.map((g) => ({ ...g, leftScore: 0, rightScore: 0 })),
    {
      sport: "football",
      manualTieOrder: ["a", "b", "c"],
      decisionKind: "physical_draw",
      decisionActorId: "leader",
      decisionReason: "Synthetic",
    },
  );
  expect(r.status).toBe("unresolved");
});
const parties = entrants.map((e) => ({
  id: e.id,
  eventId: "event",
  schoolId: e.schoolId,
  status: "active" as const,
  playedMatchIds: ["real"],
  performed: true,
  validAchievement: true,
  history: [],
}));
it.each([
  [0, 0],
  [3, 2],
  [2, 2],
])(
  "Q-02 rejects contradictory actual/approved/registered %i/%i",
  (registered, approved) => {
    expect(() => participationCounts(parties, registered, approved)).toThrow();
    expect(() =>
      awardEvent(parties, ["a", "b", "c"], {
        kind: "individual",
        registered,
        approved,
        bronzeMatchCancelled: false,
      }),
    ).toThrow();
  },
);
it("Q-02 consistent counts preserve awards; unplayed entrants do not inflate actual", () => {
  const r = awardEvent(parties, ["a", "b", "c"], {
    kind: "individual",
    registered: 3,
    approved: 3,
    bronzeMatchCancelled: false,
  });
  expect(r.awards.map((x) => x.points)).toEqual([11, 9, 7]);
  expect(
    participationCounts(
      parties.map((p) => ({ ...p, performed: false, playedMatchIds: [] })),
      3,
      0,
    ).actual,
  ).toBe(0);
});
const broken = (base: Draw, change: (d: Draw) => void) => {
  const d = structuredClone(base);
  change(d);
  return d;
};
it.each([3, 4, 5, 6, 7, 8, 16, 32, 64])(
  "Q-03 valid persisted draw %i confirms without randomizing",
  (count) => {
    const s = snapshot(count);
    const r = confirmDraw(s, 1);
    expect(r.status).toBe("draw_confirmed");
    expect(r.draw).toEqual(s.draw);
  },
);
it("Q-03 shuffled RR and team RR confirm with their persisted positions", () => {
  for (const kind of ["individual_combat", "team"] as const) {
    const entrants = roster(kind === "team" ? 8 : 5);
    const s = {
      ...snapshot(entrants.length),
      kind,
      entrants,
      draw: createDraw("event-a", entrants, kind, { random: random(99) }),
    };
    expect(confirmDraw(s, 1).draw).toEqual(s.draw);
  }
});
it.each(["empty", "self", "unknown", "duplicate", "cycle", "ghost"] as const)(
  "Q-03 rejects %s topology on confirm and replace",
  (kind) => {
    const s = snapshot(8);
    const d = broken(s.draw!, (d) => {
      if (kind === "empty") d.rounds = [];
      else if (kind === "duplicate")
        d.rounds[0]!.matches = [
          d.rounds[0]!.matches[0]!,
          d.rounds[0]!.matches[0]!,
        ];
      else if (kind === "cycle")
        d.rounds[0]!.matches[0]!.slots = [
          { kind: "winner", matchId: d.rounds.at(-1)!.matches[0]!.id },
          { kind: "participant", entrantId: s.entrants[1]!.id },
        ];
      else if (kind === "ghost")
        d.rounds[0]!.matches[0]!.slots = [{ kind: "ghost" }, { kind: "ghost" }];
      else
        d.rounds[0]!.matches[0]!.slots = [
          { kind: "participant", entrantId: s.entrants[0]!.id },
          {
            kind: "participant",
            entrantId: kind === "self" ? s.entrants[0]!.id : "unknown",
          },
        ];
    });
    expect(() => confirmDraw({ ...s, draw: d }, 1)).toThrow();
    expect(() => replaceDraftDraw(s, 1, d)).toThrow();
    expect(s.version).toBe(1);
    expect(s.status).toBe("draft");
  },
);
it("Q-04 duplicate entrant replacement is rejected without changing the prior draft", () => {
  const s = snapshot(3),
    before = structuredClone(s);
  const d = {
    ...s.draw!,
    entrants: [s.entrants[0]!, s.entrants[0]!, s.entrants[2]!],
  };
  expect(() => replaceDraftDraw(s, 1, d)).toThrow();
  expect(s).toEqual(before);
});
it("Q-05 queued lease captures identity, base version and TTL before await", async () => {
  const store = new TestResultStore(),
    c = command({ type: "lease", ttlSeconds: 30 }),
    original = structuredClone(c);
  const pending = executeResult(store, c, clock);
  c.operation = { type: "lease", ttlSeconds: 120 };
  c.actorId = ids.admin;
  c.sessionId = "other";
  c.editionId = randomUUID();
  c.baseVersion = 99;
  const r = await pending;
  expect(Date.parse(r.match.lease!.expiresAt) - clock().getTime()).toBe(30000);
  expect(r.match.lease!.actorId).toBe(original.actorId);
  expect(r.match.lease!.sessionId).toBe(original.sessionId);
  expect(await executeResult(store, original, clock)).toEqual(r);
  expect(store.state.version).toBe(2);
});
it("Q-05 nested submission payload cannot be mutated while queued", async () => {
  const store = new TestResultStore();
  const lease = await executeResult(
    store,
    command({ type: "lease", ttlSeconds: 30 }),
    clock,
  );
  const { score } = await import("./group-k-fixtures.js");
  const payload = score();
  const c = command({ type: "submit", token: lease.leaseToken!, payload }, 2),
    original = structuredClone(c);
  const pending = executeResult(store, c, clock);
  payload.entries[0]!.value.scored = 99;
  const r = await pending;
  expect(r.match.submissions[0]!.payload).toEqual(
    original.operation.type === "submit" ? original.operation.payload : null,
  );
  expect(await executeResult(store, original, clock)).toEqual(r);
});
it("Q-05 foundation command cannot change payload while actor refresh awaits", async () => {
  const { executeCommand } = await import("@hkpd/foundation");
  const actor = {
    id: "admin",
    approved: true,
    assignments: [{ editionId: "edition", role: "admin" as const }],
  };
  const c = {
    actor,
    editionId: "edition",
    method: "POST" as const,
    path: "/resource",
    key: randomUUID(),
    baseVersion: 1,
    action: "edition.configure" as const,
    payload: { name: "before" },
  };
  const store: import("@hkpd/foundation").CommandStore = {
    transaction: async (run) =>
      run({
        actor: async () => actor,
        target: async () => ({
          id: "resource",
          version: 1,
          scope: { editionId: "edition" },
        }),
        receipt: async () => null,
        apply: async (c) => c.payload,
        audit: async () => {},
        enqueue: async () => {},
        saveReceipt: async () => {},
      }),
  };
  const work = executeCommand(store, c);
  c.payload.name = "after";
  expect(await work).toEqual({ name: "before" });
});
it("Q-05 registration captures nested operation before queue processing", async () => {
  const R = await import("@hkpd/registration");
  const f = await import("./group-r-fixtures.js");
  const store = new f.TestRegistryStore();
  const c = f.command({
      type: "propose-student",
      schoolId: f.ids.school,
      studentCode: "immutable",
      name: "before",
      sex: "male",
      birthYear: 2014,
      grade: 6,
    }),
    original = structuredClone(c);
  const work = R.executeRegistration(store, c, f.clock);
  if (c.operation.type === "propose-student") c.operation.name = "after";
  const result = await work;
  expect(store.state.students[0]!.name).toBe("before");
  expect(await R.executeRegistration(store, original, f.clock)).toEqual(result);
});
