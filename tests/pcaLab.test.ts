// The PCA lab: PC1 is the covariance matrix's first eigenvector and no line through the cloud has less error, the least
// squares line has the least error straight up, and for a line through the mean kept + lost is the whole spread
// (Pythagoras), off the mean the offset squared more; every puzzle starts unsolved and has a solution, and each kind
// of failed try is told apart; scores, the view's geometry, stars and the picture follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bestLine,
  clipLine,
  foot,
  FREE_PTS,
  fromPage,
  handles,
  judgePca,
  lineAngle,
  lineError,
  mainLine,
  moments,
  num,
  ownLine,
  PCA_LADDER,
  PCA_START,
  pc1Score,
  pcaPuzzle,
  pcaStars,
  pcaStart,
  pcaSvg,
  principal,
  shadowSpread,
  toPage,
  totalSpread,
  VIEW,
  type PcaTry,
  type Pt,
} from "../src/math/pcaLab.ts";

const P = PCA_LADDER;
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const words = { total: "total", kept: "kept", lost: "lost", pc1: "PC1", pc2: "PC2", ls: "LS" };

test("PC1 is the covariance matrix's first eigenvector, and no line has less error; least squares has the least error straight up", () => {
  for (const p of [...P.map((q) => q.pts), FREE_PTS]) {
    const mo = moments(p);
    const { l1, l2, angle } = principal(mo);
    const [ux, uy] = [Math.cos((angle * Math.PI) / 180), Math.sin((angle * Math.PI) / 180)];
    assert.ok(close(mo.sxx * ux + mo.sxy * uy, l1 * ux) && close(mo.sxy * ux + mo.syy * uy, l1 * uy), "C u₁ = λ₁ u₁");
    assert.ok(close(l1 + l2, totalSpread(mo)) && l1 >= l2);
    assert.ok(close(lineError(p, mo.m, angle, "perp"), l2));
    const ls = bestLine(mo, "vertical");
    assert.ok(close(Math.tan((ls.angle * Math.PI) / 180), mo.sxy / mo.sxx));
    for (let a = 0; a < 180; a += 0.5) {
      assert.ok(lineError(p, mo.m, a, "perp") >= l2 - 1e-9 && lineError(p, mo.m, a, "vertical") >= ls.error - 1e-9);
      // Moving the line off the mean only adds to the error.
      assert.ok(lineError(p, [mo.m[0] + 0.3, mo.m[1] - 0.2], a, "perp") >= lineError(p, mo.m, a, "perp"));
    }
  }
  assert.deepEqual(bestLine(moments([[1, 0], [1, 2]]), "vertical"), { error: 1, angle: 0 });
  assert.equal(lineError([[0, 0]], [0, 0], 90, "vertical"), Infinity);
});

test("kept + lost = the whole spread for a line through the mean, and the offset squared more off it", () => {
  const p = P[0].pts;
  const mo = moments(p);
  for (let a = 0; a < 180; a += 7) {
    assert.ok(close(shadowSpread(mo, a) + lineError(p, mo.m, a, "perp"), totalSpread(mo)), `θ ${a}`);
    const c: Pt = [mo.m[0] + 1.2, mo.m[1] - 0.7];
    const off = lineError([mo.m], c, a, "perp");
    assert.ok(close(shadowSpread(mo, a) + lineError(p, c, a, "perp"), totalSpread(mo) + off), `θ ${a} off the mean`);
  }
});

test("every puzzle starts unsolved, and has a solution", () => {
  const solve = (i: number): Partial<PcaTry> => {
    const s = pcaStart(P[i]);
    const mo = moments(s.pts);
    const a1 = principal(mo).angle;
    return [
      () => ({ angle: a1 }),
      () => ({ angle: a1 }),
      () => ({ angle: a1 + 90 }),
      () => ({ angle: a1, c: mo.m }),
      () => ({ angle: bestLine(mo, "vertical").angle }),
      () => ({ pts: s.pts.map((q, k): Pt => (k === 8 ? [0.1, 4.5] : q)) }),
      () => ({ mark: Math.round(pc1Score(s.pts, 9) * 20) / 20 }),
      () => ({ pts: s.pts.map((q): Pt => [q[0], q[0] / 2]) }),
    ][i]();
  };
  P.forEach((p, i) => {
    const s = pcaStart(p);
    assert.equal(judgePca(p, s).state, "lost", `puzzle ${i + 1} starts solved`);
    assert.equal(judgePca(p, { ...s, ...solve(i) }).state, "won", `puzzle ${i + 1}`);
    assert.ok(s.pts.every((q) => Math.abs(q[0]) < VIEW && Math.abs(q[1]) < VIEW), `puzzle ${i + 1} in view`);
  });
  // Turning within about 6° of PC1 is close enough; 10° is not.
  const s = pcaStart(P[0]);
  const a1 = principal(moments(s.pts)).angle;
  assert.equal(judgePca(P[0], { ...s, angle: a1 + 5 }).state, "won");
  assert.equal(judgePca(P[0], { ...s, angle: a1 - 10 }).state, "lost");
});

test("a failed try says why", () => {
  const why = (i: number, t: Partial<PcaTry> = {}) => {
    const v = judgePca(P[i], { ...pcaStart(P[i]), ...t });
    return v.state === "lost" ? v.why : v.state;
  };
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map((i) => why(i)), ["least", "most", "worst", "offMean", "least", "upright", "score", "keep"]);
  // On the mean but turned wrong is said as turning, not moving.
  const mo = moments(P[3].pts);
  assert.equal(why(3, { c: mo.m, angle: principal(mo).angle + 40 }), "least");
  // PC1 is not the best line when the errors are measured straight up.
  assert.equal(why(4, { angle: principal(moments(P[4].pts)).angle }), "least");
  const v = judgePca(P[6], pcaStart(P[6]));
  assert.ok(v.state === "lost" && v.have === -3 && close(v.want, pc1Score(P[6].pts, 9)));
});

test("a point's score is where its shadow falls along PC1, from the mean", () => {
  const p = P[6].pts;
  const mo = moments(p);
  const line = mainLine(P[6], { pts: p, angle: 0, c: [0, 0] });
  assert.ok(close(line.c[0], mo.m[0]) && close(line.angle, principal(mo).angle));
  const f = foot(p[9], line.c, line.angle, "perp");
  assert.ok(close(Math.hypot(f[0] - mo.m[0], f[1] - mo.m[1]), Math.abs(pc1Score(p, 9))));
  // The scores add up to 0, and their mean square is λ₁.
  const scores = p.map((_, i) => pc1Score(p, i));
  assert.ok(close(scores.reduce((a, b) => a + b, 0), 0) && close(scores.reduce((a, b) => a + b * b, 0) / p.length, principal(mo).l1));
});

test("the view: page and cloud both ways, lines clipped to it, the handles inside, feet on the line", () => {
  for (const q of [[-5, -5], [0, 0], [3.2, -1.7]] as Pt[]) {
    const back = fromPage(toPage(q));
    assert.ok(close(back[0], q[0]) && close(back[1], q[1]));
  }
  assert.deepEqual(clipLine([0, 0], [1, 0]), [-5, 5]);
  assert.equal(clipLine([0, 6], [1, 0]), null);
  assert.equal(clipLine([7, 7], [Math.SQRT1_2, -Math.SQRT1_2]), null);
  for (const [c, a] of [[[0, 0], 30], [[-4.5, 4.5], 0], [[3, -2], 95]] as [Pt, number][]) {
    for (const h of handles(c, a)) assert.ok(Math.abs(h[0]) <= VIEW && Math.abs(h[1]) <= VIEW, `${c} ${a}: ${h}`);
    const f = foot([1, 2], c, a, "perp");
    assert.ok(close(lineError([f], c, a, "perp"), 0));
    const g = foot([1, 2], c, a, "vertical");
    assert.ok(close(g[0], 1) && close(lineError([g], c, a, "vertical"), 0, 1e-6));
  }
  assert.deepEqual(handles([0, 0], 0).map((h) => h.map((v) => Math.round(v * 10) / 10)), [[-3.8, 0], [3.8, 0]]);
  assert.equal(lineAngle(-30), 150);
  assert.equal(lineAngle(200), 20);
});

test("every picture draws, with too few points, a line upright and errors straight up", () => {
  P.forEach((p, i) => {
    const s = pcaStart(p);
    for (const best of [false, true]) {
      const svg = pcaSvg(s, mainLine(p, s), { errors: p.errors ?? "perp", best, drag: p.drag, special: p.special, hideMean: p.hideMean, score: p.goal.kind === "score", move: !!p.c, own: ownLine(p), words });
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `puzzle ${i + 1}`);
      assert.equal(svg.includes(">LS<"), best && p.errors === "vertical");
    }
  });
  for (const pts of [[], [[1, 1]], FREE_PTS] as Pt[][]) {
    for (const errors of ["perp", "vertical"] as const) {
      const svg = pcaSvg({ pts, mark: 0 }, { c: [0, 0], angle: 90 }, { errors, best: true, drag: "all", own: true, move: true, words });
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${pts.length} points, ${errors}`);
    }
  }
  assert.match(pcaSvg({ pts: FREE_PTS, mark: 0 }, { c: [0, 0], angle: 90 }, { errors: "vertical", best: false, words }), /∞/);
});

test("stars, the puzzle in play, where tries start, and numbers for the readout", () => {
  assert.deepEqual([pcaStars(0), pcaStars(1), pcaStars(5)], [3, 2, 1]);
  assert.equal(pcaPuzzle({ mode: "puzzle", stage: 4 }), P[4]);
  assert.equal(pcaPuzzle({ mode: "free", stage: 4 }), null);
  assert.ok(ownLine(null) && ownLine(P[0]) && !ownLine(P[5]) && !ownLine(P[6]));
  assert.deepEqual(PCA_START.pts, P[0].pts);
  assert.notEqual(PCA_START.pts, P[0].pts);
  const free = pcaStart(null);
  assert.deepEqual(free.pts, FREE_PTS);
  assert.equal(pcaStart(P[3]).c[0], -2.5);
  assert.deepEqual(mainLine(P[5], { pts: [[0, 0]], angle: 12, c: [1, 1] }), { c: [1, 1], angle: 12 });
  assert.deepEqual([num(-2.345), num(0.001), num(3), num(Infinity)], ["−2.35", "0", "3", "∞"]);
});
