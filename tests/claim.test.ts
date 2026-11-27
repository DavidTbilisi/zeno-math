// Claim what you know, then prove it (#823): the claimed skills take turns at their highest level in the grade, two
// right at the first try prove one and a miss ends it; a proved skill's levels become secure with a review a day later.
import { test } from "node:test";
import assert from "node:assert/strict";
import { claimable, claimDone, claimStep, creditClaim, nextProof, PROOF_RIGHT, startClaim } from "../src/model/claim.ts";
import { cellKey, cellsOf, currentGrade, isSecure, recordCell, SECURE_RUN, type Cells } from "../src/model/placement.ts";
import { DAY } from "../src/model/spacing.ts";

const G = 7 as const;
const skills = [...new Set(cellsOf(G).map((c) => c.skill))];

test("the skills to claim are the grade's not yet secure, each asked at its highest level in the grade", () => {
  assert.ok(skills.length >= 3);
  assert.deepEqual(claimable(G, {}), skills);
  const [a, b] = skills;
  const secure: Cells = Object.fromEntries(cellsOf(G).filter((c) => c.skill === a).map((c) => [cellKey(c), { seen: 3, right: 3, run: 3 }]));
  assert.deepEqual(claimable(G, secure), skills.slice(1), "a skill secure in the grade is not offered");
  const c = startClaim(G, [b]);
  assert.equal(c.proofs[0].level, Math.max(...cellsOf(G).filter((x) => x.skill === b).map((x) => x.level)));
});

test("the claimed skills take turns; two right prove one, a miss ends it; the claim ends when every proof has", () => {
  const [a, b, c] = skills;
  let claim = startClaim(G, [a, b, c]);
  const asked: string[] = [];
  const answer = (right: boolean) => {
    const q = nextProof(claim)!;
    asked.push(q.skill);
    claim = claimStep(claim, q.skill, right);
  };
  answer(true); // a 1
  answer(false); // b missed
  answer(true); // c 1
  answer(true); // a proved
  assert.equal(claimDone(claim), false);
  answer(true); // c proved
  assert.deepEqual(asked, [a, b, c, a, c]);
  assert.equal(nextProof(claim), null);
  assert.ok(claimDone(claim));
  assert.deepEqual(claim.proofs.map((p) => p.result), ["proved", "missed", "proved"]);
  assert.equal(PROOF_RIGHT, 2);
  // An answer on a skill whose proof is over changes nothing.
  assert.deepEqual(claimStep(claim, b, true), claim);
});

test("a proved skill's levels up to the one asked are secure, marked proved, with a review due a day later; nothing else moves", () => {
  const [a, b] = skills;
  let claim = startClaim(G, [a, b]);
  for (const r of [true, false, true]) claim = claimStep(claim, nextProof(claim)!.skill, r);
  const at = Date.UTC(2026, 10, 27, 9);
  const before: Cells = { [`${a}.1`]: { seen: 4, right: 3, run: 3 } };
  const { cells, spacing } = creditClaim(claim, before, {}, at);
  const top = claim.proofs[0].level;
  for (let L = 1; L <= top; L++) assert.ok(isSecure(cells[`${a}.${L}`]), `${a} ${L}`);
  assert.deepEqual(cells[`${a}.1`], before[`${a}.1`], "a level secure already keeps its own record");
  for (let L = 2; L <= top; L++) {
    assert.deepEqual(cells[`${a}.${L}`], { seen: 0, right: 0, run: SECURE_RUN, proved: true });
    assert.deepEqual(spacing[`${a}.${L}`], { step: 0, due: at + DAY });
  }
  assert.ok(Object.keys(cells).every((k) => !k.startsWith(`${b}.`)), "a missed claim credits nothing");
  // A miss after the claim takes the mark away with the run.
  assert.equal(recordCell(cells[`${a}.${top}`], true).proved, true);
  assert.equal(recordCell(cells[`${a}.${top}`], false).proved, undefined);
});

test("proving most of a grade moves the learner on, as practice does", () => {
  let claim = startClaim(G, skills);
  while (!claimDone(claim)) claim = claimStep(claim, nextProof(claim)!.skill, true);
  assert.equal(claim.proofs.length * PROOF_RIGHT, skills.length * 2, "two questions a skill");
  const { cells } = creditClaim(claim, {}, {}, 0);
  assert.equal(currentGrade(G, cells), 8);
});
