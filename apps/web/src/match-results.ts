export interface MatchEntrant {
  id: string;
  label: string;
  schoolId: string;
  schoolName?: string;
  members: string[];
}
export interface EventDraw {
  code: string;
  mode: "knockout" | "round_robin" | "performance";
  revision: number;
  entrants: MatchEntrant[];
  win_points: number;
  draw_points: number;
  loss_points: number;
  allow_draw: boolean;
  score_unit?: string;
}
export interface DrawSetup {
  mode: EventDraw["mode"];
  entrants: MatchEntrant[];
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  allowDraw: boolean;
  unit?: string;
}
export interface ResultMatch {
  id: string;
  code: string;
  round_no: number;
  match_no: number;
  side1: string | null;
  side2: string | null;
  source1: string | null;
  source2: string | null;
  score1: number | null;
  score2: number | null;
  status: "not_started" | "pending" | "confirmed" | "reentry";
  revision: number;
  reopen_requested: boolean;
  winner: string | null;
  bye: boolean;
  log: {
    action: string;
    actor_id: string;
    actor_email?: string;
    reason: string;
    at: string;
    before_state?: { score1: number | null; score2: number | null };
    after_state?: { score1: number | null; score2: number | null };
  }[];
}
export interface MatchCommand {
  action: "submit" | "confirm" | "reject" | "request_reentry";
  score1?: number;
  score2?: number;
  reason?: string;
}
export function roundRobinProgress(
  draw: EventDraw,
  matches: ResultMatch[],
  through = Infinity,
) {
  const rows = draw.entrants.map((e) => ({
    ...e,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    scored: 0,
    conceded: 0,
  }));
  const units = (v: number) => Math.round(v * 1000);
  for (const m of matches) {
    if (
      m.code !== draw.code ||
      m.match_no > through ||
      m.status !== "confirmed" ||
      m.bye ||
      m.score1 === null ||
      m.score2 === null
    )
      continue;
    const a = rows.find((r) => r.id === m.side1),
      b = rows.find((r) => r.id === m.side2);
    if (!a || !b) continue;
    a.played++;
    b.played++;
    a.scored += units(m.score1);
    a.conceded += units(m.score2);
    b.scored += units(m.score2);
    b.conceded += units(m.score1);
    if (m.score1 === m.score2) {
      a.draws++;
      b.draws++;
      a.points += units(draw.draw_points);
      b.points += units(draw.draw_points);
    } else {
      const w = m.score1 > m.score2 ? a : b,
        l = w === a ? b : a;
      w.wins++;
      l.losses++;
      w.points += units(draw.win_points);
      l.points += units(draw.loss_points);
    }
  }
  return rows.map((r) => ({
    ...r,
    points: r.points / 1000,
    scored: r.scored / 1000,
    conceded: r.conceded / 1000,
  }));
}

export function upstreamUnderReview(
  match: ResultMatch,
  matches: readonly ResultMatch[],
): boolean {
  const todo = [match.source1, match.source2],
    seen = new Set<string>();
  while (todo.length) {
    const id = todo.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const parent = matches.find((m) => m.id === id);
    if (!parent || parent.status !== "confirmed" || parent.reopen_requested)
      return true;
    todo.push(parent.source1, parent.source2);
  }
  return false;
}
