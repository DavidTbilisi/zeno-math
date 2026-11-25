// Practice: Multiplying and dividing decimals. Tenths times tenths on a hundred grid (0.3 × 0.4 is 12 hundredths) and a
// decimal times a whole number; then a decimal times a decimal, the point placed by counting places or by an estimate,
// and tenths past one on the grid; then dividing by a decimal by making the divisor whole, powers of ten, a length cut
// into pieces or a jug poured into glasses, and whether a product or quotient is more or less without working it out.
// The places of one factor only, the point left out, the point not checked by an estimate, only the divisor made whole,
// 10³ read as 10 × 3, zeros tacked on after the point and "times makes bigger, divide makes smaller" are the slips.
import { fill } from "../chart";
import { fmtM, num, tidy } from "../practiceKit";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, Trap } from "../practiceTypes";

/** A decimal to one significant figure, for an estimate: 0.35 → 0.4, 2.4 → 2, 17.5 → 20. */
export function roughly(x: number): number {
  const e = 10 ** Math.floor(Math.log10(x));
  return Number((Math.round(x / e + 1e-9) * e).toFixed(10));
}

const gen: Gen = (r, L, w) => {
  const W = w.decTimes;
  const out = (q: string, v: number, more: { traps?: Trap[]; prompt?: string; steps?: string[]; solution?: Part["solution"] }): Part => ({
    prompt: more.prompt ?? w.prompts.times, q, answer: { ...num(v), traps: more.traps ?? [] }, show: tidy(v), plain: tidy(v), format: "number",
    ...(more.solution ? { solution: more.solution } : { steps: more.steps ?? [] }),
  });
  /** The slips whose answers are numbers, different from the right one and from each other. */
  const slips = (v: number, list: [MistakeId, number | null, Record<string, string | number>][]): Trap[] => {
    const seen = new Set([tidy(v)]);
    return list.flatMap(([id, x, vars]) => {
      // Too small to be written without a power (3.4e-7) is not a slip anyone types.
      if (x === null || seen.has(tidy(x)) || tidy(x).includes("e")) return [];
      seen.add(tidy(x));
      return [{ id, a: num(Number(tidy(x))), vars: { ...vars, x: tidy(x) } }];
    });
  };
  /** A decimal with p places from its digits m, never ending in 0. */
  const dec = (lo: number, hi: number) => {
    for (;;) {
      const m = r.int(lo, hi);
      if (m % 10) return m;
    }
  };

  /** a/10 × b/10 on the hundred grid: the overlap counted in hundredths. Tenths for the answer is the slip. */
  const grid = (a: number, b: number) => {
    const v = (a * b) / 100;
    const [fa, fb] = [tidy(a / 10), tidy(b / 10)];
    const traps = slips(v, [["placesNotAdded", (a * b) / 10, { a: fa, b: fb, pa: 1, pb: 1, p: 2, m: a * b, v: tidy(v) }]]);
    return out(`${fa} \\times ${fb}`, v, { traps, solution: { kind: "model", spec: { type: "multiply", style: "grid", a, b, step: 999 } } });
  };
  /** The estimate first, then the digits multiplied as whole numbers, then the point placed. */
  const working = (fa: string, fb: string, ma: number, mb: number, v: number) => [
    `${fa} \\times ${fb} \\approx ${tidy(roughly(Number(fa)))} \\times ${tidy(roughly(Number(fb)))} = ${tidy(roughly(Number(fa)) * roughly(Number(fb)))}`,
    `${ma} \\times ${mb} = ${ma * mb}`,
    `${fa} \\times ${fb} = ${tidy(v)}`,
  ];
  /** ma with pa places times mb with pb places. Placing the point by the larger count only is the slip. */
  const product = (ma: number, pa: number, mb: number, pb: number) => {
    const [fa, fb] = [fmtM(ma, pa), fmtM(mb, pb)];
    const p = pa + pb;
    const v = (ma * mb) / 10 ** p;
    const vars = { a: fa, b: fb, pa, pb, p, m: ma * mb, v: tidy(v), e: tidy(roughly(Number(fa)) * roughly(Number(fb))) };
    const traps = slips(v, [
      ["placesNotAdded", (ma * mb) / 10 ** Math.max(pa, pb), vars],
      ["pointDropped", pb === 0 ? ma * mb : null, vars],
    ]);
    return out(`${fa} \\times ${fb}`, v, { traps, steps: working(fa, fb, ma, mb, v) });
  };
  /** The digits' product is given; the point is placed by an estimate. Ten times too big or too small are the slips. */
  const placePoint = (ma: number, pa: number, mb: number, pb: number) => {
    const [fa, fb] = [fmtM(ma, pa), fmtM(mb, pb)];
    const v = (ma * mb) / 10 ** (pa + pb);
    const e = tidy(roughly(Number(fa)) * roughly(Number(fb)));
    const vars = { a: fa, b: fb, e, v: tidy(v) };
    const traps = slips(v, [["pointNotEstimated", v * 10, vars], ["pointNotEstimated", v / 10, vars]]);
    return out(`${fa} \\times ${fb}`, v, { prompt: fill(W.placePoint, { a: ma, b: mb, m: ma * mb }), traps, steps: [working(fa, fb, ma, mb, v)[0], `${fa} \\times ${fb} = ${tidy(v)}`] });
  };
  /**
   * a ÷ b with b a decimal: both made f times bigger, so the divisor is whole and the answer the same. Only the divisor
   * made whole is the slip.
   */
  const divide = (A: number, mb: number, pb: number, prompt?: string, q?: string) => {
    // A: the dividend in the divisor's places (a = A / 10^pb), so a × 10^pb = A is what is divided by mb.
    const f = 10 ** pb;
    const [fa, fb] = [tidy(A / f), fmtM(mb, pb)];
    const v = A / mb;
    const vars = { a: fa, b: fb, f, a2: tidy(A), b2: mb, v: tidy(v) };
    // The slip's answer, when it is a decimal short enough to be written down.
    const only = Number(fa) / mb;
    const traps = slips(v, [["divisorOnlyScaled", Number.isInteger(only * 1e4) || Math.abs(only * 1e4 - Math.round(only * 1e4)) < 1e-6 ? only : null, vars]]);
    const steps = [`${fa} \\div ${fb} = (${fa} \\times ${f}) \\div (${fb} \\times ${f})`, `= ${tidy(A)} \\div ${mb} = ${tidy(v)}`];
    return out(q ?? `${fa} \\div ${fb}`, v, { prompt, traps, steps });
  };

  if (L === 1) {
    if (r.next() < 0.5) return grid(r.int(2, 9), r.int(2, 9));
    // A decimal times a whole number: 1.25 × 12, 0.6 × 15.
    const pa = r.int(1, 2);
    return product(dec(pa === 1 ? 3 : 11, pa === 1 ? 99 : 499), pa, r.int(3, 25), 0);
  }
  if (L === 2) {
    const kind = r.int(0, 2);
    if (kind === 2) {
      // Past one on the grid: 1.3 × 2.4.
      const a = dec(11, 29);
      return grid(a, r.next() < 0.5 ? r.int(2, 9) : dec(11, 29));
    }
    const [pa, pb] = r.pick([[1, 1], [1, 2], [2, 1]] as const);
    const ma = dec(11, 99);
    const mb = pb === 1 ? dec(2, 49) : dec(2, 99);
    return kind === 0 ? product(ma, pa, mb, pb) : placePoint(ma, pa, mb, pb);
  }
  const kind = r.int(0, 3);
  if (kind === 0) {
    // By tenths (4.8 ÷ 0.6) or hundredths (0.72 ÷ 0.08, 1.56 ÷ 0.12); the answer whole, or a decimal now and then.
    const pb = r.int(1, 2);
    const mb = pb === 1 ? r.int(2, 9) : r.pick([r.int(2, 9), r.int(11, 48)]);
    const q = r.next() < 0.75 ? r.int(3, 40) : dec(13, 99) / 10;
    return divide(Number(tidy(q * mb)), mb, pb);
  }
  if (kind === 1) {
    const which = r.int(0, 2);
    // Dividing goes no further than thousandths of a thousandth: 0.72 ÷ 10³ = 0.00072.
    const n = which === 2 ? r.int(1, 3) : r.int(2, 6);
    const f = 10 ** n;
    const pow = `10^{${n}}`;
    if (which === 0) {
      const traps = slips(f, [["powerTimesExponent", 10 * n, { n, prod: Array<string>(n).fill("10").join(" × "), v: f }]]);
      return out(pow, f, { traps, steps: [`${pow} = ${Array<string>(n).fill("10").join(" \\times ")} = ${f}`] });
    }
    const p = r.int(1, 2);
    const m = dec(11, p === 1 ? 99 : 999);
    const a = fmtM(m, p);
    const times = which === 1;
    const v = Number(tidy(times ? Number(a) * f : Number(a) / f));
    const traps = slips(v, [
      ["zerosTacked", times ? Number(a) : null, { a, f, n, v: tidy(v) }],
      ["pointWrongWay", Number(tidy(times ? Number(a) / f : Number(a) * f)), { f }],
    ]);
    return out(`${a} ${times ? "\\times" : "\\div"} ${pow}`, v, { traps, steps: [`${pow} = ${f}`, `${a} ${times ? "\\times" : "\\div"} ${f} = ${tidy(v)}`] });
  }
  if (kind === 2) {
    // A length cut into equal pieces, or a jug poured into glasses: how many times the decimal goes into the whole.
    if (r.next() < 0.5) {
      const [mb, pb] = r.pick([[15, 2], [25, 2], [4, 1], [75, 2], [6, 1], [35, 2]] as const);
      const n = r.int(4, 30);
      const A = n * mb;
      return divide(A, mb, pb, fill(W.ribbon, { a: tidy(A / 10 ** pb), b: fmtM(mb, pb) }), "");
    }
    const [mb, pb] = r.pick([[2, 1], [25, 2], [3, 1], [4, 1], [75, 2]] as const);
    const n = r.int(3, 12);
    const A = n * mb;
    return divide(A, mb, pb, fill(W.jug, { a: tidy(A / 10 ** pb), b: fmtM(mb, pb) }), "");
  }
  // More or less than the first number, without working it out: × or ÷ a decimal below one (or, now and then, above).
  const a = dec(12, 96) / 10;
  const below = r.next() < 0.75;
  const b = below ? r.pick([0.2, 0.4, 0.5, 0.6, 0.8, 0.25, 0.75]) : r.pick([1.2, 1.5, 2.5]);
  const times = r.next() < 0.5;
  const v = times ? a * b : a / b;
  const more = v > a;
  const options = [W.more, W.less].map((t) => ({ text: t, plain: t, tex: `\\text{${t}}` }));
  const right = more ? 0 : 1;
  const traps: Trap[] = below ? [{ id: times ? "timesAlwaysBigger" : "divideAlwaysSmaller", a: { k: "pick", options, right: 1 - right }, vars: { a: tidy(a), b: tidy(b), v: tidy(v) } }] : [];
  const fa = tidy(a);
  return {
    prompt: fill(W.moreOrLess, { a: fa }),
    q: `${fa} ${times ? "\\times" : "\\div"} ${tidy(b)}`,
    answer: { k: "pick", options, right, traps },
    show: options[right].tex,
    plain: options[right].plain,
    format: "pick",
    steps: [`${fa} ${times ? "\\times" : "\\div"} ${tidy(b)} = ${tidy(v)} ${more ? ">" : "<"} ${fa}`],
  };
};

export default gen;
