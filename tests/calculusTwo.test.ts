// Single-variable calculus: the integrals asked are right by construction (each answer differentiates back to the
// integrand, each named slip doesn't), slips equal to the right answer are dropped, and a pick question's slips never
// name the right option.
import { test } from "node:test";
import assert from "node:assert/strict";
import { byParts, exact, F, numTraps, partialOrTrig, pickOf, piTimes, substitution, word, type Integral } from "../src/math/calculusTwo.ts";
import { derive } from "../src/math/derive.ts";
import { evalE, parseE } from "../src/math/expr.ts";
import { rngOf } from "../src/math/practiceKit.ts";

// Points right of every pole and log the integrals have (partial fractions put them at x ≤ 1).
const XS = [1.3, 1.7, 2.2, 2.9, 3.6];
const close = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

function checkIntegral(g: Integral, where: string) {
  const f = parseE(g.f);
  const d = derive(parseE(g.F));
  for (const x of XS) assert.ok(close(evalE(d, x), evalE(f, x)), `${where}: (${g.F})' ≠ ${g.f} at ${x}`);
  if (!g.slip) return;
  const s = derive(parseE(g.slip.F));
  assert.ok(XS.some((x) => !close(evalE(s, x), evalE(f, x))), `${where}: the slip ${g.slip.F} is right too`);
}

test("every integral asked differentiates back to its integrand, and its slip doesn't", () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const [name, make] of [["substitution", substitution], ["by parts", byParts], ["partial fractions", partialOrTrig]] as const) {
      checkIntegral(make(rngOf(seed)), `${name}, seed ${seed}`);
    }
  }
});

test("a slip that gives the right answer, or another slip's, is dropped", () => {
  assert.deepEqual(numTraps(2, [["forgotPi", 2], ["forgotFactorial", 4], ["wrongCentre", 4]]).map((t) => t.id), ["forgotFactorial"]);
  assert.equal(exact(F(3, 4), [["radiusInverted", F(3, 4)]]).answer.traps, undefined);
  const e = exact(F(6, 4));
  assert.deepEqual([e.show, e.plain, e.format], ["\\frac{3}{2}", "3/2", "exact"]);
  assert.equal(exact(F(4, 2)).format, "number");
  const p = piTimes(F(9), [["forgotPi", 9]]);
  assert.deepEqual([p.show, p.plain], ["9\\pi", "9pi"]);
  assert.ok(close((p.answer as { v: number }).v, 9 * Math.PI));
  assert.equal(piTimes(F(-1, 2)).show, "\\frac{-\\pi}{2}");
});

test("a pick question's slips never name the right option", () => {
  const options = [word("converges"), word("diverges")];
  const right = pickOf(options, 0, [["pTestBackwards", 0], ["pTestAtZero", 1]]);
  assert.deepEqual(right.answer.traps?.map((t) => t.id), ["pTestAtZero"]);
  assert.equal(right.plain, "converges");
  assert.equal(pickOf(options, 1, [["pTestAtZero", 1]]).answer.traps, undefined);
});
