// Practice: Rate.
import { fill, r2 } from "../chart";
import type { RateSolution } from "../ratePics";
import { type RoadSpec, roadSvg } from "../speedPics";
import { fr, money, noZeroEnd, num, plainFrac, tidy } from "../practiceKit";
import type { Answer, Exercise, Gen, PracticeWords, Rng, Trap } from "../practiceTypes";

/** A speed answer, which may be typed with its unit (48 km, 60 km/h, 3 h, 5 m/s). */
const speedNum = (v: number, w: PracticeWords, traps: Trap[] = []): Answer => ({ k: "num", v, tol: 1e-9, units: [w.speed.kmh, w.speed.ms, w.units.km, w.units.m, w.time.h, w.speed.s], traps });

/**
 * Speed (P6), the medium rate questions about it: distance = speed × time with any one of the three missing, in
 * kilometres and hours on a double number line; or a time in minutes (taking the minutes for hours is the trap), or a
 * runner in metres and seconds, worked in lines.
 */
function speedOne(r: Rng, w: PracticeWords): Omit<Exercise, "skill" | "level" | "seed"> {
  const P = w.prompts;
  const kind = r.int(0, 4);
  const line = (ask: RateSolution["ask"], v: number, t: number, steps: string[]) => ({
    kind: "rate" as const, spec: { ask, u: v, n: t, t: v * t, cost: false, top: w.time.h, bottom: w.units.km, steps } satisfies RateSolution & { steps: string[] },
  });
  const base = { q: "", format: "number" as const };
  if (kind <= 2) {
    const [v, t] = [5 * r.int(6, 24), r.int(2, 5)];
    const d = v * t;
    if (kind === 0) return { ...base, prompt: fill(P.speedDistance, { v, t }), answer: speedNum(d, w), show: String(d), plain: String(d), solution: line("total", v, t, [`${v} \\times ${t} = ${d}`]) };
    if (kind === 1) {
      const traps: Trap[] = [{ id: "rateInverted", a: num(t / d), vars: { t: d, n: t } }];
      return { ...base, prompt: fill(P.speedSpeed, { d, t }), answer: speedNum(v, w, traps), show: String(v), plain: String(v), solution: line("rate", v, t, [`${d} \\div ${t} = ${v}`]) };
    }
    return { ...base, prompt: fill(P.speedTime, { d, v }), answer: speedNum(t, w), show: String(t), plain: String(t), solution: line("units", v, t, [`${d} \\div ${v} = ${t}`]) };
  }
  if (kind === 3) {
    // Minutes are sixtieths of an hour: v is a multiple of 6 and t of 10, so the distance is whole.
    const [v, t] = [6 * r.int(5, 20), 10 * r.int(1, 5)];
    const d = (v * t) / 60;
    const traps: Trap[] = [{ id: "minutesAsHours", a: num(v * t), vars: { t, v, d } }];
    const steps = [`${t}\\text{ ${w.time.min}} = \\frac{${t}}{60}\\text{ ${w.time.h}}`, `${v} \\times \\frac{${t}}{60} = ${d}`];
    return { ...base, prompt: fill(P.speedMinutes, { v, t }), answer: speedNum(d, w, traps), show: String(d), plain: String(d), steps };
  }
  const [v, t] = [r.int(3, 9), 10 * r.int(2, 9)];
  const d = v * t;
  return { ...base, prompt: fill(P.speedRunner, { d, t }), answer: speedNum(v, w, [{ id: "rateInverted", a: num(t / d), vars: { t: d, n: t } }]), show: String(v), plain: String(v), steps: [`${d} \\div ${t} = ${v}`] };
}

/**
 * Speed in two steps, the hard rate questions about it: the average speed over two legs (the mean of the two speeds is
 * the trap), two vehicles driving towards each other (closing at the sum of their speeds) and one catching another up
 * (gaining at the difference). Each comes with a picture of the road.
 */
function speedTwo(r: Rng, w: PracticeWords): Omit<Exercise, "skill" | "level" | "seed"> {
  const P = w.prompts;
  const kind = r.int(0, 2);
  const u = { kmh: w.speed.kmh, km: w.units.km, h: w.time.h };
  const pic = (spec: RoadSpec) => {
    const p = roadSvg(spec, u);
    return { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${p.body}</g>`, h: p.h, w: p.w };
  };
  const answer = (v: number, traps: Trap[]) => ({ answer: speedNum(v, w, traps), show: tidy(v), plain: tidy(v), q: "", format: "number" as const });
  if (kind === 0) {
    // Whole hours on each leg, different times, and an average that comes out whole.
    let v1: number, v2: number, t1: number, t2: number;
    do [v1, v2, t1, t2] = [10 * r.int(3, 9), 10 * r.int(3, 9), r.int(1, 3), r.int(1, 3)];
    while (v1 === v2 || t1 === t2 || (v1 * t1 + v2 * t2) % (t1 + t2) !== 0);
    const [d1, d2] = [v1 * t1, v2 * t2];
    const avg = (d1 + d2) / (t1 + t2);
    const traps: Trap[] = [{ id: "meanOfSpeeds", a: num((v1 + v2) / 2), vars: { d: d1 + d2, h: t1 + t2 } }];
    return {
      prompt: fill(P.speedAverage, { d1, v1, d2, v2 }),
      pic: pic({ kind: "legs", d1, v1, d2, v2 }),
      ...answer(avg, traps),
      steps: [`${d1} + ${d2} = ${d1 + d2}`, `\\frac{${d1}}{${v1}} + \\frac{${d2}}{${v2}} = ${t1} + ${t2} = ${t1 + t2}`, `${d1 + d2} \\div ${t1 + t2} = ${avg}`],
    };
  }
  if (kind === 1) {
    const [v1, v2, t] = [10 * r.int(4, 9), 10 * r.int(4, 9), r.int(2, 5)];
    const d = (v1 + v2) * t;
    const traps: Trap[] = v1 !== v2 ? [{ id: "meetDifference", a: num(d / Math.abs(v1 - v2)), vars: { a: v1, b: v2, s: v1 + v2 } }] : [];
    return { prompt: fill(P.speedMeet, { d, v1, v2 }), pic: pic({ kind: "meet", d, v1, v2 }), ...answer(t, traps), steps: [`${v1} + ${v2} = ${v1 + v2}`, `${d} \\div ${v1 + v2} = ${t}`] };
  }
  // A cyclist's head start of h hours, and a car that catches up in t hours (a half or a whole number).
  let v1: number, h: number, t: number, diff: number;
  do {
    [v1, h, t] = [r.int(10, 20), r.int(1, 3), r.pick([0.5, 1, 1.5, 2, 3])];
    diff = (v1 * h) / t;
  } while (!Number.isInteger(diff) || v1 + diff > 120 || diff < 10);
  const v2 = v1 + diff;
  const gap = v1 * h;
  const traps: Trap[] = [{ id: "catchSum", a: num(gap / (v1 + v2)), vars: { a: v2, b: v1, s: diff } }];
  return {
    prompt: fill(P.speedCatch, { v1, h, v2 }),
    pic: pic({ kind: "catch", d: gap, v1, v2, h }),
    ...answer(t, traps),
    steps: [`${v1} \\times ${h} = ${gap}`, `${v2} - ${v1} = ${diff}`, `${gap} \\div ${diff} = ${tidy(t)}`],
  };
}

const gen: Gen = (r, L, w) => {
  // A rate as the amount for one unit (P5): rice at so much a kilogram, or a tap letting out so many litres a
  // minute. Given two of the rate, the total and the number of units, the third.
  const cost = r.next() < 0.5;
  const P = w.prompts;
  /** In the prompt: money, or litres as a plain number. */
  const said = (v: number) => (cost ? money(w, v) : tidy(v));
  /** In the working and the answer: money with both places when it has cents. */
  const shown = (v: number) => (cost && !Number.isInteger(v) ? v.toFixed(2) : tidy(v));
  /** The picture: a double number line, units on top and the amount underneath; the working beneath it. */
  const line = (ask: RateSolution["ask"], u: number, n: number, t: number, more: { m?: number; v?: number } = {}) => ({
    ask, u, n, t, ...more, cost, top: cost ? w.units.kg : "", bottom: cost ? fill(w.money, { v: "" }).trim() : w.units.l,
  });
  const one = (v: number, steps: string[], spec: RateSolution, traps: Trap[] = []) => ({
    q: "", answer: { ...num(v), traps }, show: shown(v), plain: shown(v), format: "number" as const, solution: { kind: "rate" as const, spec: { ...spec, steps } },
  });
  /** The rate from the total: dividing the other way round is the trap. */
  const inverted = (t: number, n: number): Trap[] => [{ id: "rateInverted", a: num(n / t), vars: { t: shown(t), n } }];
  if (L === 1) {
    const [u, n] = [r.int(2, 12), r.int(2, 9)];
    const t = u * n;
    if (r.next() < 0.5) return { prompt: fill(cost ? P.rateCost : P.rateTap, { n, t: said(t) }), ...one(u, [`${t} \\div ${n} = ${u}`], line("rate", u, n, t), inverted(t, n)) };
    return { prompt: fill(cost ? P.rateCostTotal : P.rateTapTotal, { n, r: said(u) }), ...one(t, [`${u} \\times ${n} = ${t}`], line("total", u, n, t)) };
  }
  if (L === 2) {
    const kind = r.int(0, 4);
    if (kind >= 3) return speedOne(r, w);
    if (kind === 0) {
      // How many units: the total divided by the rate.
      const [u, n] = [r.int(2, 12), r.int(3, 15)];
      return { prompt: fill(cost ? P.rateCostUnits : P.rateTapUnits, { r: said(u), t: said(u * n) }), ...one(n, [`${u * n} \\div ${u} = ${n}`], line("units", u, n, u * n)) };
    }
    // A rate with cents (1.05 to 4.95 a kilogram) or tenths of a litre, worked in cents or tenths.
    const f = cost ? 100 : 10;
    const uf = cost ? 5 * r.int(21, 99) : noZeroEnd(r, 11, 99);
    const n = r.int(3, 9);
    const [u, t] = [uf / f, (uf * n) / f];
    if (kind === 1) return { prompt: fill(cost ? P.rateCostTotal : P.rateTapTotal, { n, r: said(u) }), ...one(t, [`${shown(u)} \\times ${n} = ${shown(t)}`], line("total", u, n, t)) };
    return { prompt: fill(cost ? P.rateCost : P.rateTap, { n, t: said(t) }), ...one(u, [`${shown(t)} \\div ${n} = ${shown(u)}`], line("rate", u, n, t), inverted(t, n)) };
  }
  if (r.next() < 0.5) return speedTwo(r, w);
  // Two steps, the rate first (the unitary method): n units for t, so m units for? Adding the difference in units to
  // the total, as if each unit added one, is the trap.
  const u = cost ? 5 * r.int(5, 60) / 100 : r.int(2, 12);
  const n = r.int(2, 9);
  let m: number;
  do m = r.int(2, 15);
  while (m === n || m % n === 0);
  const [t, v] = [Number(tidy(u * n)), Number(tidy(u * m))];
  // At 1 a unit, adding and multiplying agree.
  const traps: Trap[] = t + m - n > 0 && u !== 1 ? [{ id: "addedNotScaled", a: num(Number(tidy(t + m - n))), vars: { a: n, b: m, k: plainFrac(fr(m, n)) } }] : [];
  return { prompt: fill(cost ? P.rateCostTwo : P.rateTapTwo, { n, t: said(t), m }), ...one(v, [`${shown(t)} \\div ${n} = ${shown(u)}`, `${shown(u)} \\times ${m} = ${shown(v)}`], line("two", u, n, t, { m, v }), traps) };
};

export default gen;
