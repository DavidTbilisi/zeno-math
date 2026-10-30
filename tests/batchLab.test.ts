// The batch lab: the loss's gradient agrees with small steps and is 0 at the least-squares line; full-batch descent
// reaches it with a rate the valley takes and blows up with one too large; the schedules, momentum and Adam's first
// step do what they say; runs come out the same for the same seed; every puzzle is unsolved at its start and won by
// just the settings its notice speaks of, each kind of miss told apart; and the picture is drawn.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BATCH_LADDER,
  BATCH_START,
  BATCHES,
  batchSvg,
  bestOf,
  dataOf,
  ETAS,
  gradOf,
  judgeBatch,
  judgeRun,
  lossOf,
  OPTIMISERS,
  puzzlePatch,
  rateAt,
  SCHEDULES,
  setupOf,
  train,
  type LiveBatch,
  type Setup,
} from "../src/math/batchLab.ts";

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps * Math.max(1, Math.abs(b));
const setup = (o: Partial<Setup> = {}): Setup => ({ data: "line", seed: 1, batch: 24, eta: 0.2, schedule: "constant", opt: "sgd", start: [-1, 4], epochs: 20, ...o });

test("the gradient agrees with small steps, and is 0 at the least-squares line", () => {
  const pts = dataOf("line", 1);
  const h = 1e-6;
  for (const [w, b] of [[0, 0], [-1, 4], [2.5, -1]]) {
    const [gw, gb] = gradOf(pts, w, b);
    assert.ok(close(gw, (lossOf(pts, w + h, b) - lossOf(pts, w - h, b)) / (2 * h), 1e-5));
    assert.ok(close(gb, (lossOf(pts, w, b + h) - lossOf(pts, w, b - h)) / (2 * h), 1e-5));
  }
  const best = bestOf(pts);
  const [gw, gb] = gradOf(pts, best.w, best.b);
  assert.ok(Math.abs(gw) < 1e-9 && Math.abs(gb) < 1e-9);
  assert.equal(pts.length, 24);
  assert.deepEqual(dataOf("wide", 3), dataOf("wide", 3), "the same seed draws the same points");
});

test("full-batch descent reaches the best line, or blows up with too large a rate", () => {
  const pts = dataOf("line", 1);
  const best = bestOf(pts);
  const run = train(pts, setup({ epochs: 60 }));
  assert.equal(run.path.length, 61, "one step an epoch");
  const [w, b] = run.path[60];
  assert.ok(close(w, best.w, 1e-4) && close(b, best.b, 1e-4));
  assert.ok(run.losses.every((l, i) => i === 0 || l <= run.losses[i - 1] + 1e-12), "a rate the valley takes never goes up");
  const away = train(pts, setup({ eta: 0.5 }));
  assert.ok(away.away && away.path.length < 21);
});

test("batches: an epoch is one pass, shuffled the same way for the same seed", () => {
  const pts = dataOf("line", 1);
  for (const batch of BATCHES) assert.equal(train(pts, setup({ batch, epochs: 2 })).path.length, 1 + 2 * (24 / batch));
  const a = train(pts, setup({ batch: 1, eta: 0.05, epochs: 2 }));
  assert.deepEqual(a.path, train(pts, setup({ batch: 1, eta: 0.05, epochs: 2 })).path);
  assert.notDeepEqual(a.path, train(pts, setup({ batch: 1, eta: 0.05, epochs: 2, seed: 2 })).path);
  assert.deepEqual(a.epochEnds, [24, 48]);
});

test("schedules, momentum and Adam's first step", () => {
  assert.deepEqual([0, 4, 5, 10].map((e) => rateAt(0.1, "step", e)), [0.1, 0.1, 0.05, 0.025]);
  assert.deepEqual([0, 1, 3].map((e) => rateAt(0.1, "decay", e)), [0.1, 0.05, 0.025]);
  assert.equal(rateAt(0.1, "constant", 9), 0.1);
  const pts = dataOf("line", 1);
  // Momentum's second step is η · (β · g₁ + g₂).
  const m = train(pts, setup({ opt: "momentum", eta: 0.01, epochs: 2 }));
  const g1 = gradOf(pts, -1, 4);
  const g2 = gradOf(pts, ...m.path[1]);
  assert.ok(close(m.path[2][0], m.path[1][0] - 0.01 * (0.9 * g1[0] + g2[0])));
  // Adam's first step moves every coordinate by η, whatever the size of its gradient.
  const a = train(pts, setup({ data: "wide", opt: "adam", eta: 0.05, epochs: 1 }));
  assert.ok(close(Math.abs(a.path[1][0] - a.path[0][0]), 0.05, 1e-6) && close(Math.abs(a.path[1][1] - a.path[0][1]), 0.05, 1e-6));
});

test("every puzzle is unsolved at its start and won by just the settings its notice speaks of", () => {
  const winners = (stage: number) => {
    const p = BATCH_LADDER[stage];
    const d0 = { ...BATCH_START, stage, ...puzzlePatch(p) } as LiveBatch;
    assert.notEqual(judgeBatch(d0)?.state, "won", `puzzle ${stage + 1} is not won at its start`);
    const vals: (string | number)[] = p.knob === "eta" ? ETAS : p.knob === "batch" ? BATCHES : p.knob === "schedule" ? SCHEDULES : OPTIMISERS;
    return vals.filter((v) => judgeBatch({ ...d0, [p.knob]: v } as LiveBatch)?.state === "won");
  };
  assert.deepEqual(BATCH_LADDER.map((_, i) => winners(i)), [[0.2], [0.05, 0.1], ["step", "decay"], [2], ["momentum"], ["adam"]]);
  assert.deepEqual(BATCH_LADDER.map((p) => p.notice), ["edge", "noisy", "schedule", "minibatch", "momentum", "adam"]);
});

test("a miss says why: too slow, still jittering, or blown up", () => {
  const why = (stage: number, patch: Partial<LiveBatch>) => {
    const v = judgeBatch({ ...BATCH_START, stage, ...puzzlePatch(BATCH_LADDER[stage]), ...patch } as LiveBatch)!;
    return v.state === "lost" ? v.why : "won";
  };
  assert.equal(why(0, { eta: 0.1 }), "slow");
  assert.equal(why(0, { eta: 0.5 }), "blowUp");
  assert.equal(why(1, { eta: 0.2 }), "jitter");
  assert.equal(why(2, { schedule: "constant" }), "jitter");
  assert.equal(why(3, { batch: 24 }), "slow");
  assert.equal(why(3, { batch: 1 }), "jitter");
  assert.equal(why(4, { opt: "sgd" }), "slow");
  assert.equal(why(5, { opt: "momentum" }), "blowUp");
  // judgeRun on its own: a run ending at the best is won.
  const pts = dataOf("line", 1);
  assert.equal(judgeRun(train(pts, setup({ epochs: 60 })), bestOf(pts).loss, { kind: "settle", tol: 1e-6 }).state, "won");
});

test("free play keeps its own settings, a puzzle only its dial", () => {
  const free = setupOf({ ...BATCH_START, mode: "free", data: "wide", batch: 8, eta: 0.02, opt: "adam" });
  assert.deepEqual([free.data, free.batch, free.eta, free.opt, free.epochs], ["wide", 8, 0.02, "adam", 50]);
  const p = setupOf({ ...BATCH_START, stage: 4, batch: 1, opt: "momentum" });
  assert.deepEqual([p.batch, p.opt, p.eta], [4, "momentum", 0.002], "the batch size is the puzzle's, the step the player's");
});

test("the picture: contours, the path, the points and the loss chart", () => {
  const pts = dataOf("line", 1);
  const s = setup({ batch: 4, eta: 0.05, epochs: 5 });
  const run = train(pts, s);
  const words = { map: "loss over (w, b)", data: "points", loss: "loss above the best", epoch: "epoch", target: "goal", best: "best" };
  const svg = batchSvg(pts, s, run, 12, { tol: 0.01, words });
  assert.ok(!/NaN|Infinity/.test(svg));
  assert.equal((svg.match(/<polyline/g) ?? []).length, 9 + 1 + 1, "nine contours, the path and the chart's line");
  assert.ok(svg.includes("loss over (w, b)") && svg.includes(">goal<"));
  // A run that blew up is drawn at the map's edge, still without NaN.
  const away = train(pts, setup({ eta: 2 }));
  assert.ok(!/NaN|Infinity/.test(batchSvg(pts, setup({ eta: 2 }), away, away.path.length - 1, { tol: 0.01, words })));
});
