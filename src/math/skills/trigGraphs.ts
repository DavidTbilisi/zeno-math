// Practice: trigonometric graphs (#663). Easy: the amplitude, the period and the midline of y = a·sin(bx) + d or
// a·cos(bx) + d. Medium: the same read from a graph. Hard: b from a graph, and, in a new setting, a harbour's tide.
// The amplitude as the whole height, b given for the period, 360° times b, the top for the midline, the period given
// for b and the midline for high tide are slips. Since #733 some medium questions ask where the first peak or trough
// after 0° is and how high the wave reaches, and half the hard ones have a phase shift: how a·sin(bx − k) + d is
// moved, where a shifted sine first peaks, the equation of a shifted wave from its graph or from its features, a
// tide from its high-water time and the warmest month of a year. A peak not scaled by b, the top taken for the
// amplitude alone, the shift the wrong way, k not divided by b, a sine's peak put at its start, sine and cosine
// swapped, the shift left outside the bracket and the amplitude and midline swapped are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
import { pickPart } from "../tTails";
import { waveSvg } from "../trigWave";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const rad = (d: number) => (d * Math.PI) / 180;

const gen: Gen = (r, L, w) => {
  const W = w.qtg;
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[], pic?: Part["pic"]): Part => ({
    prompt, q: "", ...(pic ? { pic } : {}), answer: { ...num(v), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > 1e-9) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });
  const a = r.int(2, 5);
  const b = r.pick([2, 3, 4, 6]);
  const d = r.pick([-3, -2, -1, 1, 2, 3]);
  const fn = r.pick(["sin", "cos"]);
  const f = `y = ${a}${fn}(${b}x) ${d > 0 ? "+" : "−"} ${Math.abs(d)}`;
  const t = r.pick(["amp", "period", "mid"] as const);

  if (L === 2 && r.int(0, 9) >= 6) return peak(r, w, numQ, slip);
  if (L === 3 && r.int(0, 9) >= 5) return shifted(r, w, numQ, slip);
  if (L === 1) {
    if (t === "amp") return numQ(fill(W.ampQ, { f }), a, [slip("amplitudeDoubled", 2 * a, { a, h: 2 * a })], [`\\text{amplitude} = ${a}`]);
    if (t === "period")
      return numQ(fill(W.periodQ, { f }), 360 / b, [slip("periodAsB", b, { b, p: 360 / b }), slip("periodNotDivided", 360 * b, { b })], [`360° \\div ${b} = ${360 / b}°`]);
    return numQ(fill(W.midQ, { f }), d, [slip("midlineFromMax", d + a, { t: d + a, lo: d - a })], [`y = ${d}`]);
  }

  // A drawn wave, read from its picture: b from 1 to 3 so a period shows.
  const bb = r.pick([1, 2, 3]);
  const aa = r.pick([1, 2, 3]);
  const dd = r.pick([-1, 0, 1, 2]);
  const g = (x: number) => aa * (fn === "sin" ? Math.sin(rad(bb * x)) : Math.cos(rad(bb * x))) + dd;
  const [hi, lo] = [dd + aa, dd - aa];
  const pic = waveSvg(g, Math.min(-1, lo - 1), Math.max(1, hi + 1));
  const shown = { svg: place(pic.body), w: pic.w, h: pic.h };
  if (L === 2) {
    if (t === "amp") return numQ(W.ampPicQ, aa, [slip("amplitudeDoubled", 2 * aa, { a: aa, h: 2 * aa })], [`\\frac{${hi} - (${lo})}{2} = ${aa}`], shown);
    if (t === "period") return numQ(W.periodPicQ, 360 / bb, [bb > 1 && slip("periodAsB", bb, { b: bb, p: 360 / bb })], [`${bb} \\text{ waves in } 360°`, `${360 / bb}°`], shown);
    return numQ(W.midPicQ, dd, [slip("midlineFromMax", hi, { t: hi, lo })], [`\\frac{${hi} + (${lo})}{2} = ${dd}`], shown);
  }

  if (r.next() < 0.5) {
    const b3 = r.pick([2, 3, 4]);
    const g3 = (x: number) => aa * Math.sin(rad(b3 * x)) + dd;
    const p3 = waveSvg(g3, Math.min(-1, dd - aa - 1), Math.max(1, dd + aa + 1));
    return numQ(fill(W.bPicQ, { f: `y = ${aa}sin(bx)${dd ? ` ${dd > 0 ? "+" : "−"} ${Math.abs(dd)}` : ""}` }), b3, [slip("bAsPeriod", 360 / b3, { p: 360 / b3, b: b3 })],
      [`\\text{period} = ${360 / b3}°`, `b = 360 \\div ${360 / b3} = ${b3}`], { svg: place(p3.body), w: p3.w, h: p3.h });
  }
  // A new setting: the depth of a harbour, d + a·sin(30t)° metres, t hours after midnight.
  const [mean, amp] = [r.pick([4, 5, 6, 8]), r.pick([1, 2, 3])];
  if (r.next() < 0.5)
    return numQ(fill(W.tideHighQ, { m: mean, a: amp }), mean + amp, [slip("highTideAsMidline", mean, { m: mean, a: amp })], [`\\sin = 1`, `${mean} + ${amp} = ${mean + amp}`]);
  return numQ(fill(W.tideGapQ, { m: mean, a: amp }), 12, [slip("periodAsB", 30, { b: 30, p: 12 })], [`360 \\div 30 = 12`]);
};

type NumQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[], pic?: Part["pic"]) => Part;
type Slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>) => Trap;

/** A number with a true minus and the sign written out: "+ 2", "− 3", "" for 0. */
const plus = (d: number) => (d ? ` ${d > 0 ? "+" : "−"} ${Math.abs(d)}` : "");
const coef = (a: number) => (a === 1 ? "" : String(a));

/** Medium (#733): the first peak or trough after 0°, and how high the wave reaches. */
function peak(r: Rng, w: PracticeWords, numQ: NumQ, slip: Slip): Part {
  const W = w.tgP;
  const a = r.int(2, 5);
  const b = r.pick([2, 3, 6]);
  const d = r.pick([-2, -1, 1, 2, 3]);
  const fn = r.pick(["sin", "cos"] as const);
  const f = `y = ${a}${fn}(${b}x)${plus(d)}`;
  if (r.next() < 0.5) {
    // A sine first peaks a quarter of the way through a wave; a cosine first dips half way through.
    const whole = fn === "sin" ? 90 : 180;
    return numQ(fill(fn === "sin" ? W.firstMaxQ : W.firstMinQ, { f }), whole / b, [slip("peakNotScaled", whole, { u: whole, b, v: whole / b, fn })],
      [`${fn}(${b}x) = ${fn === "sin" ? 1 : -1} \\text{ when } ${b}x = ${whole}°`, `x = ${whole} \\div ${b} = ${whole / b}°`]);
  }
  return numQ(fill(W.maxQ, { f }), a + d, [slip("maxWithoutMidline", a, { a, d: sgn(d), v: a + d })], [`${d} + ${a} = ${a + d}`]);
}

/** Hard (#733): sinusoids with a phase shift, read, built from features and from stories. */
function shifted(r: Rng, w: PracticeWords, numQ: NumQ, slip: Slip): Part {
  const W = w.tgP;
  const t = r.pick(["move", "peak", "graph", "build", "tide", "warm"] as const);
  if (t === "move") {
    const b = r.pick([2, 3]);
    const sh = r.pick([15, 20, 30, 45]);
    const k = b * sh;
    const a = r.int(2, 4);
    const d = r.pick([-1, 1, 2]);
    const opts = [fill(W.right, { s: sh }), fill(W.left, { s: sh }), fill(W.right, { s: k }), fill(W.left, { s: k })];
    return pickPart(r, opts, 0, [
      { id: "phaseShiftSign", at: 1, vars: { v: opts[0] } },
      { id: "shiftNotDividedByB", at: 2, vars: { k, b, v: sh } },
    ], fill(W.moveQ, { f: `y = ${a}sin(${b}x − ${k}°)${plus(d)}`, g: `y = ${a}sin(${b}x)${plus(d)}` }),
    [`${b}x - ${k}° = ${b}(x - ${sh}°)`, `x - ${sh}° \\Rightarrow ${sh}° \\text{ ${W.toRight}}`]);
  }
  if (t === "peak") {
    // Not 45°: there 90° − c is c, and the shift taken the wrong way would look like the peak put at the start.
    const c = r.pick([20, 30, 60]);
    const a = r.int(2, 4);
    const d = r.pick([-1, 1, 2]);
    return numQ(fill(W.shiftMaxQ, { f: `y = ${a}sin(x − ${c}°)${plus(d)}` }), c + 90, [
      slip("sinPeakAtStart", c, { c, v: c + 90 }),
      slip("phaseShiftSign", 90 - c, { v: `${c + 90}°` }),
    ], [`x - ${c}° = 90°`, `x = ${c + 90}°`]);
  }
  if (t === "graph") {
    // A shifted sine drawn: the tiles differ in the shift's sign, sine for cosine, and the amplitude and midline.
    const a = r.pick([1, 2, 3]);
    const d = r.pick([1, 2].filter((v) => v !== a));
    const c = r.pick([30, 45, 60]);
    const pic = waveSvg((x) => a * Math.sin(rad(x - c)) + d, Math.min(-1, d - a - 1), d + a + 1);
    const opts = [`y = ${coef(a)}sin(x − ${c}°) + ${d}`, `y = ${coef(a)}sin(x + ${c}°) + ${d}`, `y = ${coef(a)}cos(x − ${c}°) + ${d}`, `y = ${coef(d)}sin(x − ${c}°) + ${a}`];
    return {
      ...pickPart(r, opts, 0, [
        { id: "phaseShiftSign", at: 1, vars: { v: opts[0] } },
        { id: "sinCosStartSwapped", at: 2, vars: { c, v: opts[0] } },
        { id: "ampMidlineSwapped", at: 3, vars: { a, d, v: opts[0] } },
      ], W.graphQ, [`\\text{${W.midSay}} \\; y = ${d}, \\; \\text{${W.ampSay}} \\; ${a}`, `\\text{${W.riseSay}} \\; x = ${c}°`]),
      pic: { svg: place(pic.body), w: pic.w, h: pic.h },
    };
  }
  if (t === "build") {
    const b = r.pick([2, 3, 4]);
    const P = 360 / b;
    const c = r.pick([10, 15, 20, 30]);
    const a = r.int(2, 5);
    const d = r.pick([-2, -1, 1, 3]);
    const opts = [`y = ${a}sin(${b}(x − ${c}°))${plus(d)}`, `y = ${a}sin(${b}(x + ${c}°))${plus(d)}`, `y = ${a}sin(${b}x − ${c}°)${plus(d)}`, `y = ${a}sin(${P}(x − ${c}°))${plus(d)}`];
    return pickPart(r, opts, 0, [
      { id: "phaseShiftSign", at: 1, vars: { v: opts[0] } },
      { id: "bracketNotAroundShift", at: 2, vars: { f: opts[2], c: `${c}°`, v: opts[0] } },
      { id: "bAsPeriod", at: 3, vars: { p: P, b } },
    ], fill(W.buildQ, { a, d: sgn(d), p: P, c }), [`b = 360 \\div ${P} = ${b}`, `y = ${a}\\sin(${b}(x - ${c}°)) ${d > 0 ? "+" : "-"} ${Math.abs(d)}`]);
  }
  if (t === "tide") {
    const h = r.int(2, 5);
    const m = r.pick([4, 5, 6, 8]);
    const a = r.pick([1, 2, 3]);
    const opts = [`d = ${m} + ${coef(a)}cos(30(t − ${h}))`, `d = ${m} + ${coef(a)}cos(30(t + ${h}))`, `d = ${m} + ${coef(a)}sin(30(t − ${h}))`, `d = ${m} + ${coef(a)}cos(30t − ${h})`];
    return pickPart(r, opts, 0, [
      { id: "phaseShiftSign", at: 1, vars: { v: opts[0] } },
      { id: "sinCosStartSwapped", at: 2, vars: { c: h, v: opts[0] } },
      { id: "bracketNotAroundShift", at: 3, vars: { f: opts[3], c: h, v: opts[0] } },
    ], fill(W.tideQ, { h, hi: m + a, lo: m - a }), [`\\text{${W.midSay}} \\; ${m}, \\; \\text{${W.ampSay}} \\; ${a}`, `\\cos = 1 \\text{ at } t = ${h}`, `360 \\div 12 = 30`]);
  }
  const c = r.int(1, 4);
  const m = r.pick([12, 14, 15, 18]);
  const a = r.pick([6, 8, 10]);
  return numQ(fill(W.warmQ, { f: `T = ${m} + ${a}sin(30(t − ${c}))` }), c + 3, [slip("sinPeakAtStart", c, { c, v: c + 3 })],
    [`30(t - ${c}) = 90`, `t - ${c} = 3`, `t = ${c + 3}`]);
}

export default gen;
