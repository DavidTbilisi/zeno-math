// Practice: trigonometric graphs (#663). Easy: the amplitude, the period and the midline of y = a·sin(bx) + d or
// a·cos(bx) + d. Medium: the same read from a graph. Hard: b from a graph, and, in a new setting, a harbour's tide.
// The amplitude as the whole height, b given for the period, 360° times b, the top for the midline, the period given
// for b and the midline for high tide are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
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

export default gen;
