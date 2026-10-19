// The gradient descent lab: the steps follow x ← x − η f′(x) (and with momentum v ← βv − η f′(x), x ← x + v), on the
// bowl in closed form; every puzzle starts unsolved and has a solution, and on the bowl whether a rate solves a
// puzzle agrees with the closed form for every rate the slider has; each kind of failed try is told apart; stars,
// notices, the slider's rates, free play's functions and the picture follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  budgetOf,
  DEEP_VALLEY,
  DESCENT_FNS,
  DESCENT_LADDER,
  descentNotice,
  descentPath,
  descentPuzzle,
  descentStars,
  descentSvg,
  ETAS,
  etaIndex,
  freeFn,
  judge,
  num,
  plotScale,
  type DescentPuzzle,
  DESCENT_START,
} from "../src/math/descentLab.ts";

const P = DESCENT_LADDER;
/** Plays a try to its end, as Run does: the verdict at the first step it is not still going, or at the budget. */
function play(p: DescentPuzzle, o: { start?: number; eta?: number; beta?: number } = {}) {
  const [start, eta, beta] = [o.start ?? p.start, o.eta ?? p.eta, o.beta ?? 0];
  const budget = budgetOf(p.goal);
  for (let k = 1; ; k++) {
    const v = judge(p, start, eta, beta, k);
    if (v.state !== "going" || k >= budget) return v;
  }
}

test("the steps: x ← x − η f′(x), on the bowl (1 − 2η)ᵏ of the way from the bottom; with momentum, the heavy ball", () => {
  const { df } = DESCENT_FNS.bowl;
  for (const eta of [0.05, 0.3, 0.5, 0.9, 1]) {
    const { xs } = descentPath(df, 0, eta, 0, 12);
    xs.forEach((x, k) => assert.ok(Math.abs(x - 3 - (1 - 2 * eta) ** k * -3) < 1e-9, `η ${eta} step ${k}`));
  }
  const { xs } = descentPath(df, 0, 0.1, 0.5, 6);
  let [x, v] = [0, 0];
  for (let k = 1; k <= 6; k++) {
    v = 0.5 * v - 0.1 * df(x);
    x += v;
    assert.ok(Math.abs(xs[k] - x) < 1e-12);
  }
  const off = descentPath(df, 0, 5, 0, 100);
  assert.ok(off.away && off.xs.length < 101 && off.xs.every(Number.isFinite));
  assert.ok(Math.abs(DESCENT_FNS.valleys.df(DEEP_VALLEY)) < 1e-12 && DESCENT_FNS.valleys.f(DEEP_VALLEY) < DESCENT_FNS.valleys.f(1.1309));
});

test("every puzzle starts unsolved, and has a solution", () => {
  const solutions: { eta?: number; start?: number; beta?: number }[] = [
    { eta: 0.4 },
    { eta: 0.5 },
    { eta: 0.7 },
    { eta: 1 },
    { eta: 0.12 },
    { eta: 5 },
    { start: 0.5 },
    { start: -1 },
    { beta: 0.9 },
  ];
  assert.equal(solutions.length, P.length);
  P.forEach((p, i) => {
    assert.notEqual(play(p).state, "won", `puzzle ${i + 1} starts solved`);
    const v = play(p, solutions[i]);
    assert.equal(v.state, "won", `puzzle ${i + 1}: ${JSON.stringify(v)}`);
    if (v.state === "won") assert.ok(v.steps <= budgetOf(p.goal));
    assert.ok(ETAS.includes(solutions[i].eta ?? p.eta), `puzzle ${i + 1}: the slider has η`);
  });
});

test("on the bowl, whether each rate on the slider solves a puzzle agrees with the closed form", () => {
  const margin = (a: number, b: number) => Math.abs(a - b) > 1e-6;
  for (const eta of ETAS) {
    const r = 1 - 2 * eta;
    // Reach in 10: 3|r|ᵏ ≤ 0.05 for some k ≤ 10 (the distance only shrinks).
    const k = Math.abs(r) < 1 ? (r === 0 ? 1 : Math.max(1, Math.ceil(Math.log(0.05 / 3) / Math.log(Math.abs(r))))) : Infinity;
    if (Math.abs(r) >= 1 || margin(3 * Math.abs(r) ** Math.min(k, 10), 0.05)) assert.equal(play(P[0], { eta }).state === "won", k <= 10, `reach, η ${eta}`);
    // One step: x₁ = 6η.
    if (margin(Math.abs(6 * eta - 3), 0.1)) assert.equal(play(P[1], { eta }).state === "won", Math.abs(6 * eta - 3) < 0.1, `one step, η ${eta}`);
    // Bounce: within 15 steps, jumping past each time (r < 0).
    if (margin(3 * Math.abs(r) ** Math.min(k, 15), 0.05)) assert.equal(play(P[2], { eta }).state === "won", r < 0 && k <= 15, `bounce, η ${eta}`);
    // For ever: jumping past each time, the distance after 12 steps within 0.7 and 1.4 of where it started.
    const q = Math.abs(r) ** 12;
    if (margin(q, 0.7) && margin(q, 1.4)) assert.equal(play(P[3], { eta }).state === "won", r < 0 && q >= 0.7 && q <= 1.4, `for ever, η ${eta}`);
  }
});

test("a failed try says why", () => {
  const why = (p: DescentPuzzle, o: Parameters<typeof play>[1]) => {
    const v = play(p, o);
    return v.state === "lost" ? v.why : v.state;
  };
  assert.equal(why(P[0], { eta: 0.05 }), "slow");
  assert.equal(why(P[0], { eta: 1.5 }), "blowUp");
  assert.equal(why(P[0], { eta: 0.97 }), "bouncing");
  assert.equal(why(P[1], { eta: 0.2 }), "short");
  assert.equal(why(P[1], { eta: 0.7 }), "long");
  assert.equal(why(P[2], { eta: 0.3 }), "noCross");
  assert.equal(why(P[2], { eta: 0.95 }), "bouncing");
  assert.equal(why(P[3], { eta: 0.7 }), "fades");
  assert.equal(why(P[3], { eta: 1.2 }), "grows");
  assert.equal(why(P[4], { eta: 0.4 }), "blowUp");
  assert.equal(why(P[5], { eta: 0.3 }), "slow");
  assert.equal(why(P[6], {}), "flat");
  assert.equal(why(P[7], {}), "local");
  assert.equal(why(P[8], {}), "local");
  // The short and long tries say where the ball is and where the bottom is.
  assert.deepEqual(play(P[1], { eta: 0.2 }), { state: "lost", why: "short", x: 1.2000000000000002, target: 3 });
  // Stuck on the hilltop is said after the first step; the wrong valley as soon as the ball settles there.
  assert.equal(judge(P[6], 0, 0.1, 0, 1).state, "lost");
  const stop = Array.from({ length: 100 }, (_, i) => judge(P[8], 2, 0.01, 0, i + 1)).findIndex((v) => v.state === "lost") + 1;
  assert.ok(stop > 10 && stop < 100, `settled in the near valley at step ${stop}`);
  assert.equal(judge(P[0], 0, 0.4, 0, 0).state, "going");
});

test("stars, notices and the slider's rates", () => {
  assert.deepEqual([descentStars(0), descentStars(1), descentStars(4)], [3, 2, 1]);
  const lost = (why: "blowUp" | "grows" | "flat" | "local" | "slow") => ({ state: "lost" as const, why, x: 0, target: 0 });
  assert.deepEqual([lost("blowUp"), lost("grows"), lost("flat"), lost("local"), lost("slow")].map((v) => descentNotice(P[0], v)), ["blewUp", "blewUp", "flat", "local", null]);
  const won = { state: "won" as const, steps: 1 };
  assert.deepEqual(P.map((p) => descentNotice(p, won)), [null, "oneStep", null, "edge", null, null, null, null, "momentum"]);
  assert.equal(descentNotice(null, won), null);
  assert.equal(ETAS[0], 0.001);
  assert.equal(ETAS[ETAS.length - 1], 10);
  ETAS.forEach((v, i) => {
    assert.ok(i === 0 || v > ETAS[i - 1], `${v} after ${ETAS[i - 1]}`);
    assert.equal(etaIndex(v), i);
    assert.equal(Number(v.toPrecision(2)), v);
  });
  assert.equal(ETAS[etaIndex(0.0503)], 0.05);
  for (const p of P) assert.ok(ETAS.includes(p.eta));
  assert.equal(DESCENT_START.eta, P[0].eta);
});

test("free play reads a function of x, with its slope", () => {
  const f = freeFn("x^2 - 2x")!;
  assert.ok(Math.abs(f.df(3) - 4) < 1e-6 && f.f(3) === 3);
  assert.equal(freeFn("x +"), null);
  assert.equal(freeFn("sqrt(x)"), null);
  assert.ok(freeFn("sin(3x) + x^2/4"));
});

test("every picture draws, the ball off the view included", () => {
  P.forEach((p, i) => {
    const fn = DESCENT_FNS[p.fn];
    for (const eta of [p.eta, 0.5, 3]) {
      const { xs, away } = descentPath(fn.df, p.start, eta, 0, 30);
      const svg = descentSvg(fn, xs, { next: xs[xs.length - 1] - eta * fn.df(xs[xs.length - 1]), targets: p.targets, away, drag: !!p.drag });
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `puzzle ${i + 1}, η ${eta}`);
    }
  });
  const svg = descentSvg(freeFn("1/x")!, [0.5, 2], { next: 4 });
  assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
});

test("the page's scale goes both ways, the puzzle in play is found, and readout numbers are tidy", () => {
  const s = plotScale(DESCENT_FNS.bowl);
  for (const x of [-1.5, 0, 3, 7.5]) assert.ok(Math.abs(s.toX(s.X(x)) - x) < 1e-9);
  assert.ok(s.Y(0) > s.Y(10) && s.y0 < 0 && s.y1 > 9);
  assert.equal(descentPuzzle({ mode: "puzzle", stage: 3 }), P[3]);
  assert.equal(descentPuzzle({ mode: "free", stage: 3 }), null);
  assert.deepEqual([num(-2.5), num(1e-7), num(0.001), num(3.14159)], ["−2.5", "0", "0.001", "3.142"]);
});
