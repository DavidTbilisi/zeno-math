// Prime slice: a number splits at its smallest prime factor; a wave throws the numbers asked for, two in five of them
// prime and none twice, every one up into the stage and down again; a stroke cuts what it crosses (a prime goes off,
// a piece not prime yet flies up to be cut again, and the stroke that made a piece cannot cut it); what falls is
// judged; and every wave on the ladder can be played without a slip, while one left alone slips on every number not
// prime.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isPrime } from "../src/math/numtheory.ts";
import { rng } from "../src/math/random.ts";
import {
  advance,
  BALL_R,
  cut,
  cutNotice,
  cutsIn,
  factorText,
  fake,
  hits,
  live,
  looksPrime,
  markWave,
  PIECE_R,
  pieceFlights,
  posAt,
  primeFactors,
  SLICE_H,
  SLICE_LADDER,
  SLICE_LEVELS,
  SLICE_W,
  sliceNow,
  sliceStars,
  splitOf,
  startSim,
  throwFlight,
  wave,
  waveOver,
  type Sim,
  type SliceEvent,
  type Throw,
  type WaveSpec,
} from "../src/math/primeSlice.ts";

test("a number splits at its smallest prime factor, down to its primes", () => {
  assert.deepEqual(splitOf(12), [2, 6]);
  assert.deepEqual(splitOf(91), [7, 13]);
  assert.deepEqual(splitOf(49), [7, 7]);
  assert.deepEqual(splitOf(13), [13, 1]);
  assert.deepEqual(primeFactors(12), [2, 2, 3]);
  assert.deepEqual(primeFactors(97), [97]);
  assert.deepEqual(primeFactors(128), [2, 2, 2, 2, 2, 2, 2]);
  assert.deepEqual([21, 49, 51, 91, 9].filter(looksPrime), [21, 49, 51, 91, 9]);
  assert.deepEqual([2, 15, 22, 23, 1].filter(looksPrime), []);
  assert.deepEqual([21, 49, 51, 91, 119, 23].filter(fake), [49, 91, 119]);
});

const specs: WaveSpec[] = [...SLICE_LADDER.map((s) => s.spec), ...Object.values(SLICE_LEVELS)];

test("a wave throws the numbers asked for: two in five prime, none twice, every one up into the stage and down", () => {
  for (const spec of specs)
    for (let seed = 1; seed <= 60; seed++) {
      const throws = wave(spec, rng(seed));
      assert.equal(throws.length, spec.count);
      assert.equal(throws.filter((t) => isPrime(t.n)).length, Math.round(spec.count * 0.4));
      assert.equal(new Set(throws.map((t) => t.n)).size, spec.count, `${spec.from}–${spec.to}`);
      for (const [i, t] of throws.entries()) {
        assert.ok(t.n >= spec.from && t.n <= spec.to && t.n > 1, `${t.n}`);
        assert.equal(t.at, 600 + Math.floor(i / spec.volley) * spec.gap);
        assert.ok(t.x0 >= 80 && t.x0 <= SLICE_W - 80 && t.x1 >= 70 && t.x1 <= SLICE_W - 70, `${t.x0} → ${t.x1}`);
        const f = throwFlight(t, spec.flight);
        const [px, py] = posAt(f, t.at + spec.flight / 2);
        assert.ok(py > BALL_R && py < SLICE_H - 2 * BALL_R, `peak ${py}`);
        assert.ok(Math.abs(px - (t.x0 + t.x1) / 2) < 1e-9);
        const [lx, ly] = posAt(f, t.at + spec.flight);
        assert.ok(Math.abs(lx - t.x1) < 1e-9 && Math.abs(ly - (SLICE_H + BALL_R)) < 1e-9);
      }
    }
});

test("the later puzzles throw more numbers that only look prime", () => {
  const share = (spec: WaveSpec) => {
    let [tricky, others] = [0, 0];
    for (let seed = 1; seed <= 200; seed++)
      for (const t of wave(spec, rng(seed)))
        if (!isPrime(t.n)) {
          others++;
          if (looksPrime(t.n)) tricky++;
        }
    return tricky / others;
  };
  assert.ok(share(SLICE_LADDER[1].spec) < share(SLICE_LADDER[5].spec), "more lookalikes later on");
  assert.ok(share(SLICE_LADDER[5].spec) > 0.6);
});

test("a stroke hits what it passes within reach of; a tap what it lands on", () => {
  assert.ok(hits([50, 50], [0, 0], [100, 100], 1));
  assert.ok(hits([50, 60], [0, 50], [100, 50], 10));
  assert.ok(!hits([50, 61], [0, 50], [100, 50], 10));
  assert.ok(!hits([120, 50], [0, 50], [100, 50], 10), "past the end of the stroke");
  assert.ok(hits([5, 5], [0, 0], [0, 0], 8));
  assert.ok(!hits([9, 9], [0, 0], [0, 0], 8));
});

const one = (n: number, at = 0): Throw => ({ n, at, x0: 300, x1: 300, peak: 200 });
const run = (sim: Sim, throws: Throw[], to: number) => {
  const events: SliceEvent[] = [];
  for (let t = sim.t + 16; t <= to; t += 16) {
    const r = advance(sim, throws, 2000, t);
    sim = r.sim;
    events.push(...r.events);
  }
  return { sim, events };
};

test("a number not prime cut splits in two; a piece not prime yet is cut again; a prime cut goes off", () => {
  const throws = [one(12), one(7, 100)];
  let { sim } = run(startSim(), throws, 1000);
  assert.equal(sim.thrown, 2);
  const [twelve, seven] = sim.balls;
  const at = posAt(twelve.f, sim.t);
  const c = cut(sim, [at[0] - 40, at[1]], [at[0] + 40, at[1]], 1);
  // 7 is right behind it on the same path: the stroke goes through both.
  assert.deepEqual(c.events.map((e) => e.kind).sort(), ["boom", "cut"]);
  assert.deepEqual(c.events.find((e) => e.kind === "cut"), { kind: "cut", n: 12, p: 2, q: 6, piece: false, root: 12 });
  sim = c.sim;
  assert.equal(sim.balls.find((b) => b.id === seven.id)!.end!.kind, "boom");
  const pieces = sim.balls.filter((b) => b.piece);
  assert.deepEqual(pieces.map((b) => b.n), [2, 6]);
  assert.deepEqual(pieces.map(live), [false, true], "the 2 is done with, the 6 still to cut");
  // The stroke that made the pieces cannot cut them; the next one can.
  const six = pieces[1];
  const p6 = posAt(six.f, sim.t);
  assert.equal(cut(sim, p6, p6, 1).events.length, 0);
  const again = cut(sim, p6, p6, 2);
  assert.deepEqual(again.events, [{ kind: "cut", n: 6, p: 2, q: 3, piece: true, root: 12 }]);
  // A prime piece cannot be cut at all (once the two have flown apart).
  const apart = run(sim, throws, sim.t + 320).sim;
  const p2 = posAt(apart.balls.find((b) => b.id === pieces[0].id)!.f, apart.t);
  assert.equal(cut(apart, p2, p2, 3).events.length, 0);
  assert.equal(cutNotice(again.events.filter((e) => e.kind === "cut"), 1), "chain");
});

test("what falls is judged: a prime let fall is right, a number or a piece not prime a slip, a prime piece nothing", () => {
  const throws = [one(9), one(11), one(15)];
  let { sim } = run(startSim(), throws, 400);
  const fifteen = sim.balls.find((b) => b.n === 15)!;
  const at = posAt(fifteen.f, sim.t);
  // Cut 15 alone, along its own path: 9 and 11 are on the same path, so cut it with a tap off to the side.
  sim = { ...sim, balls: sim.balls.map((b) => (b.n === 15 ? { ...b, f: { ...b.f, x0: b.f.x0 + 200 } } : b)) };
  const c = cut(sim, [at[0] + 200, at[1]], [at[0] + 200, at[1]], 1);
  assert.deepEqual(c.events.map((e) => e.kind), ["cut"]);
  const r = run(c.sim, throws, 4000);
  const kinds = r.events.map((e) => `${e.kind} ${e.n}`).sort();
  // 15 = 3 × 5: both pieces are prime and only fall. 9 falls uncut, 11 is spared.
  assert.deepEqual(kinds, ["dropped 9", "spared 11"]);
  assert.ok(waveOver(r.sim, throws));
  assert.equal(r.sim.balls.length, 0, "everything gone has faded");
  assert.ok(!waveOver(startSim(), throws));
});

/** Plays a wave frame by frame; `bot` taps every number not prime once it is well inside the stage and no prime is near. */
function play(throws: Throw[], flight: number, bot: boolean) {
  let sim = startSim();
  const events: SliceEvent[] = [];
  let stroke = 0;
  for (let t = 16; !waveOver(sim, throws) && t < 120_000; t += 16) {
    const r = advance(sim, throws, flight, t);
    sim = r.sim;
    events.push(...r.events);
    if (!bot) continue;
    for (const b of sim.balls) {
      if (b.end || !live(b) || isPrime(b.n)) continue;
      const p = posAt(b.f, t);
      if (p[1] > SLICE_H - (b.piece ? PIECE_R : BALL_R)) continue;
      if (sim.balls.some((o) => !o.end && !o.piece && isPrime(o.n) && hits(posAt(o.f, t), p, p, BALL_R))) continue;
      const c = cut(sim, p, p, ++stroke);
      sim = c.sim;
      events.push(...c.events);
    }
  }
  return events;
}

test("every wave on the ladder can be played without a slip, and left alone slips on every number not prime", () => {
  for (const d of [...SLICE_LADDER.map((_, stage) => ({ mode: "puzzle" as const, stage, level: 1 as const, seed: 1 })), ...[1, 2, 3].flatMap((level) => Array.from({ length: 20 }, (_, seed) => ({ mode: "endless" as const, stage: 0, level: level as 1 | 2 | 3, seed, timed: seed % 2 === 1 })))]) {
    const { spec, throws } = sliceNow(d);
    const clean = play(throws, spec.flight, true);
    assert.equal(clean.filter((e) => e.kind === "boom" || e.kind === "dropped").length, 0, `${d.mode} ${d.stage} ${d.level} ${d.seed}`);
    assert.equal(clean.filter((e) => e.kind === "cut").length, cutsIn(throws));
    assert.equal(clean.filter((e) => e.kind === "spared").length, throws.filter((t) => isPrime(t.n)).length);
    const idle = play(throws, spec.flight, false);
    assert.equal(idle.filter((e) => e.kind === "dropped").length, throws.filter((t) => !isPrime(t.n)).length);
  }
});

test("the ladder's waves are fixed, the endless run's come from its seed, and against the clock they come faster", () => {
  const a = sliceNow({ mode: "puzzle", stage: 4, level: 1, seed: 1 });
  assert.deepEqual(sliceNow({ mode: "puzzle", stage: 4, level: 3, seed: 99 }), a);
  assert.equal(a.spec, SLICE_LADDER[4].spec);
  const e = sliceNow({ mode: "endless", stage: 0, level: 2, seed: 5 });
  assert.notDeepEqual(sliceNow({ mode: "endless", stage: 0, level: 2, seed: 6 }).throws, e.throws);
  const fast = sliceNow({ mode: "endless", stage: 0, level: 2, seed: 5, timed: true });
  assert.deepEqual(fast.throws.map((t) => t.n), e.throws.map((t) => t.n));
  assert.ok(fast.spec.flight < e.spec.flight && fast.spec.gap < e.spec.gap);
  for (const [i, { spec }] of SLICE_LADDER.entries()) if (i > 0) assert.ok(spec.to >= SLICE_LADDER[i - 1].spec.to || spec.from > SLICE_LADDER[i - 1].spec.from, `puzzle ${i + 1}`);
});

test("stars count slips; the notices: two in a stroke, a piece cut again, a number only 7 or more divides", () => {
  assert.deepEqual([0, 1, 2, 5].map(sliceStars), [3, 2, 1, 1]);
  const c = (n: number, piece = false) => ({ kind: "cut" as const, n, ...{ p: splitOf(n)[0], q: splitOf(n)[1] }, piece, root: n });
  assert.equal(cutNotice([c(12)], 2), "double");
  assert.equal(cutNotice([c(6, true)], 1), "chain");
  assert.equal(cutNotice([c(91)], 1), "fake");
  assert.equal(cutNotice([c(21)], 1), null);
});

test("a piece not prime yet goes high, toward the middle, and floats down; the sides turn a piece back", () => {
  // 15 = 3 × 5, both prime: they fly apart alike. 12 = 2 × 6: the 2 flies off, the 6 goes up to the top third.
  const g = 400;
  const [three, five] = pieceFlights(15, 100, 300, 50, g);
  assert.deepEqual([three, five].map((f) => Math.sign(f.vx)), [-1, 1]);
  assert.equal(three.vy, five.vy);
  const [two, six] = pieceFlights(12, 500, 300, 50, g);
  assert.ok(two.vx > 0 && six.vx < 0, "the 6 heads for the middle");
  assert.ok(six.g < g);
  const top = Math.min(...Array.from({ length: 300 }, (_, i) => posAt(six, 50 + i * 10)[1]));
  assert.ok(Math.abs(top - SLICE_H / 3) < 1, `top ${top}`);
  const air = (f: typeof six) => Array.from({ length: 1000 }, (_, i) => 50 + i * 10).find((t) => posAt(f, t)[1] > SLICE_H + PIECE_R)! - 50;
  assert.ok(air(six) > 1.5 * air(two), `${air(six)} ms against ${air(two)}`);
  for (let t = 50; t < 5000; t += 10) {
    const x = posAt(two, t)[0];
    assert.ok(x >= PIECE_R && x <= SLICE_W - PIECE_R, `${x}`);
  }
});

test("at the end every number thrown is right, or wrong with what slipped; its primes are written as powers", () => {
  assert.equal(factorText(12), "2² × 3");
  assert.equal(factorText(128), "2⁷");
  assert.equal(factorText(1024), "2¹⁰");
  assert.equal(factorText(91), "7 × 13");
  assert.equal(factorText(97), "97");
  const throws = [12, 13, 51, 7, 45].map((n) => one(n));
  assert.deepEqual(markWave(throws, [{ n: 6, root: 12 }, { n: 7, root: 7 }, { n: 51, root: 51 }]), [
    { n: 12, ok: false, slip: 6 },
    { n: 13, ok: true },
    { n: 51, ok: false, slip: 51 },
    { n: 7, ok: false, slip: 7 },
    { n: 45, ok: true },
  ]);
});
