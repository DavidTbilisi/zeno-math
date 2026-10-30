// The threshold lab: the confusion matrix and the measures from it, the ROC curve from (0, 0) to (1, 1) with its area
// the chance a positive outscores a negative, the precision–recall curve, every puzzle unsolved at its start and won at
// the thresholds its notice speaks of, each kind of miss told apart, and the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import { aucOf, confusion, cuts, dataOf, judgeRoc, metricsOf, prOf, ROC_LADDER, PUZZLE_SEED, rocOf, rocSvg, snap, tToX, xToT, type Example } from "../src/math/rocLab.ts";

const ex = (s: number, pos: boolean): Example => ({ s, pos });
const words = {
  strip: "scores", pos: "positive", neg: "negative", called: "called", matrix: "matrix", actual: "true", predicted: "called",
  metrics: { accuracy: "accuracy", precision: "precision", recall: "recall", f1: "F1" },
  roc: "ROC", pr: "PR", auc: "AUC", fpr: "FPR", tpr: "TPR", recallAxis: "recall", precisionAxis: "precision",
};

test("the confusion matrix and the measures from it", () => {
  const xs = [ex(0.9, true), ex(0.8, true), ex(0.3, true), ex(0.7, false), ex(0.2, false), ex(0.1, false)];
  const c = confusion(xs, 0.5);
  assert.deepEqual(c, { tp: 2, fp: 1, fn: 1, tn: 2 });
  const m = metricsOf(c);
  assert.equal(m.accuracy, 4 / 6);
  assert.equal(m.precision, 2 / 3);
  assert.equal(m.recall, 2 / 3);
  assert.ok(Math.abs(m.f1 - 2 / 3) < 1e-12);
  assert.equal(m.fpr, 1 / 3);
  // A score equal to the threshold is called positive; above every score nothing is, and precision is not defined.
  assert.deepEqual(confusion(xs, 0.8), { tp: 2, fp: 0, fn: 1, tn: 3 });
  assert.ok(Number.isNaN(metricsOf(confusion(xs, 1.01)).precision));
});

test("the ROC curve, its area, and the precision–recall curve", () => {
  const xs = [ex(0.9, true), ex(0.8, true), ex(0.3, true), ex(0.7, false), ex(0.2, false), ex(0.1, false)];
  const roc = rocOf(xs);
  assert.deepEqual(roc[0], [0, 0]);
  assert.deepEqual(roc[roc.length - 1], [1, 1]);
  // 8 of the 9 positive–negative pairs are in the right order.
  assert.ok(Math.abs(aucOf(xs) - 8 / 9) < 1e-12);
  // The trapezia under the ROC curve give the same area.
  let area = 0;
  for (let i = 1; i < roc.length; i++) area += ((roc[i][0] - roc[i - 1][0]) * (roc[i][1] + roc[i - 1][1])) / 2;
  assert.ok(Math.abs(area - aucOf(xs)) < 1e-12);
  assert.equal(aucOf([ex(0.9, true), ex(0.1, false)]), 1);
  assert.equal(aucOf([ex(0.5, true), ex(0.5, false)]), 0.5);
  const pr = prOf(xs);
  assert.deepEqual(pr[0], [1 / 3, 1]);
  assert.ok(pr.every(([r, p]) => r >= 0 && r <= 1 && p >= 0 && p <= 1));
  // Classes further apart are easier to tell: the area grows with the gap.
  assert.ok(aucOf(dataOf("balanced", 2, 0.1)) < aucOf(dataOf("balanced", 2, 0.3)) && aucOf(dataOf("balanced", 2, 0.3)) < aucOf(dataOf("balanced", 2, 0.6)));
});

test("every puzzle is unsolved at its start and won where its notice says", () => {
  const winners = ROC_LADDER.map((p) => {
    const xs = dataOf(p.data, PUZZLE_SEED);
    assert.notEqual(judgeRoc(xs, p.start, p.goal).state, "won");
    return cuts(xs).filter((t) => judgeRoc(xs, t, p.goal).state === "won");
  });
  assert.ok(winners[0].length > 0 && Math.max(...winners[0]) < ROC_LADDER[0].start, "recall wants a lower threshold than the start");
  assert.ok(winners[1].length > 0 && Math.min(...winners[1]) > ROC_LADDER[1].start, "precision wants a higher one");
  assert.deepEqual(winners.slice(2).map((w) => w.length), [1, 4, 1, 1]);
  // The rare data: calling nothing positive is 90 % accurate and catches nothing.
  const rare = metricsOf(confusion(dataOf("rare", PUZZLE_SEED), 1.01));
  assert.deepEqual([rare.accuracy, rare.recall], [0.9, 0]);
});

test("a miss says why", () => {
  const why = (t: number, i: number) => {
    const v = judgeRoc(dataOf(ROC_LADDER[i].data, PUZZLE_SEED), t, ROC_LADDER[i].goal);
    return v.state === "lost" ? v.why : "won";
  };
  assert.equal(why(0.8, 0), "recallLow");
  assert.equal(why(0.3, 1), "precisionLow");
  assert.equal(why(0.9, 2), "notBest");
  assert.equal(why(0.3, 4), "fprHigh");
  assert.equal(why(0.8, 4), "notHighest");
  assert.equal(why(1.01, 3), "recallLow");
  assert.equal(why(0.45, 3), "precisionLow");
});

test("the strip maps thresholds to the page and back, and the picture is drawn", () => {
  for (const t of [0, 0.25, 0.5, 1, 1.01]) assert.equal(xToT(tToX(t)), t);
  assert.equal(snap(1.5), 1.01);
  assert.equal(snap(-1), 0);
  const svg = rocSvg(dataOf("rare", 1), 0.5, words);
  assert.ok(!/NaN|Infinity/.test(svg));
  assert.ok(svg.includes(">TP<") && svg.includes("AUC = 0.909"));
  assert.ok(!/NaN/.test(rocSvg(dataOf("rare", 1), 1.01, words)), "nothing called positive still draws");
});
