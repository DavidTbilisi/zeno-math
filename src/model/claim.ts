// Claim what you know, then prove it (#823). On the grade being worked on, the learner ticks skills they say they know
// already; each is then asked at its highest level in the grade, the claimed skills taking turns. Two right answers at
// the first try prove a skill and one miss ends its proof. A proved skill's levels in the grade, and its lower levels,
// become secure, marked as proved by a claim, with their spaced review due a day later: a claim is checked again, not
// trusted for good.
import type { SkillId } from "../math/practiceSkills.ts";
import type { Level } from "./elo.ts";
import { cellKey, cellsOf, isSecure, SECURE_RUN, type Cell, type Cells } from "./placement.ts";
import type { Grade } from "./curriculum.ts";
import { learnSpacing, type Spacing } from "./spacing.ts";

/** Right answers at the first try that prove a claimed skill. */
export const PROOF_RIGHT = 2;

/** One claimed skill's proof: the level asked, right answers so far, and how it ended. */
export type Proof = { skill: SkillId; level: Level; right: number; result?: "proved" | "missed" };
/** A claim under way: the proofs, and whose turn is next. */
export type Claim = { grade: Grade; proofs: Proof[]; turn: number };

/** The skills of a grade the learner can claim: those with a level in it not yet secure, in curriculum order. */
export function claimable(grade: Grade, cells: Cells): SkillId[] {
  const out: SkillId[] = [];
  for (const c of cellsOf(grade)) if (!isSecure(cells[cellKey(c)]) && !out.includes(c.skill)) out.push(c.skill);
  return out;
}

/** A claim on these skills of the grade, each to be asked at its highest level there. */
export function startClaim(grade: Grade, skills: readonly SkillId[]): Claim {
  const top = (skill: SkillId) => Math.max(...cellsOf(grade).filter((c) => c.skill === skill).map((c) => c.level)) as Level;
  return { grade, proofs: skills.map((skill) => ({ skill, level: top(skill), right: 0 })), turn: 0 };
}

/** The question asked next: the next proof still open, from the one whose turn it is. */
export function nextProof(c: Claim): Cell | null {
  const n = c.proofs.length;
  for (let i = 0; i < n; i++) {
    const p = c.proofs[(c.turn + i) % n];
    if (!p.result) return { skill: p.skill, level: p.level };
  }
  return null;
}

/** One answer to the proof of a skill: right at the first try counts towards it, anything else ends it. */
export function claimStep(c: Claim, skill: SkillId, firstTry: boolean): Claim {
  const i = c.proofs.findIndex((p) => p.skill === skill && !p.result);
  if (i < 0) return c;
  const proofs = c.proofs.map((p, j) => {
    if (j !== i) return p;
    const right = p.right + (firstTry ? 1 : 0);
    return { ...p, right, result: !firstTry ? ("missed" as const) : right >= PROOF_RIGHT ? ("proved" as const) : undefined };
  });
  return { ...c, proofs, turn: (i + 1) % c.proofs.length };
}

export const claimDone = (c: Claim) => c.proofs.every((p) => p.result);

/** The levels a proved skill makes secure: every level up to the one asked. */
export const creditedCells = (p: Proof): Cell[] => ([1, 2, 3] as const).filter((L) => L <= p.level).map((level) => ({ skill: p.skill, level }));

/**
 * The record after a claim: each proved skill's levels secure (proved by a claim, the answers seen kept as they were)
 * with a spaced review due a day after `at`; levels secure already and the skills not proved are left alone.
 */
export function creditClaim(c: Claim, cells: Cells, spacing: Spacing, at: number): { cells: Cells; spacing: Spacing } {
  const out: Cells = { ...cells };
  const due: Spacing = { ...spacing };
  for (const p of c.proofs) {
    if (p.result !== "proved") continue;
    for (const cell of creditedCells(p)) {
      const k = cellKey(cell);
      if (isSecure(out[k])) continue;
      const s = out[k];
      out[k] = { seen: s?.seen ?? 0, right: s?.right ?? 0, run: SECURE_RUN, proved: true };
      delete due[k];
      learnSpacing(due, k, true, true, at);
    }
  }
  return { cells: out, spacing: due };
}
