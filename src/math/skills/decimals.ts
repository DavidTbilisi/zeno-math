// Practice: Decimals.
import { fill } from "../chart";
import { fmtM, noZeroEnd, num, tidy } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  if (L === 1) {
    // Adding or subtracting decimals of one or two places (P4), worked with the points lined up: the one with fewer
    // places gets a zero. Lining up the last digits instead is the trap.
    const part = () => {
      const p = r.int(1, 2);
      return { m: noZeroEnd(r, 10 ** p + 1, 10 ** (p + 2) - 1), p };
    };
    const plus = r.next() < 0.5;
    let [a, b] = [part(), part()];
    const P = Math.max(a.p, b.p);
    /** The number in the smaller place of the two (tenths or hundredths). */
    const at = (x: typeof a) => x.m * 10 ** (P - x.p);
    while (at(a) === at(b)) b = part();
    if (!plus && at(a) < at(b)) [a, b] = [b, a];
    const res = plus ? at(a) + at(b) : at(a) - at(b);
    const v = res / 10 ** P;
    const slip = plus ? a.m + b.m : a.m - b.m;
    const [fa, fb] = [fmtM(a.m, a.p), fmtM(b.m, b.p)];
    const traps: Trap[] = a.p !== b.p && slip > 0 && slip !== res ? [{ id: "alignedRight", a: num(slip / 10 ** P), vars: { a: a.p < P ? fa : fb, pa: a.p < P ? fmtM(at(a), P) : fmtM(at(b), P) } }] : [];
    const op = plus ? "+" : "-";
    const steps = a.p === b.p ? [`${fa} ${op} ${fb} = ${tidy(v)}`] : [`${fa} ${op} ${fb} = ${fmtM(at(a), P)} ${op} ${fmtM(at(b), P)}`, `= ${fmtM(res, P)}`];
    const solution = { kind: "decimal" as const, spec: { pic: "columns", op, a: at(a), b: at(b), pa: a.p, pb: b.p, P, steps } };
    return { prompt: w.prompts.times, q: `${fa} ${op} ${fb}`, answer: { ...num(v), traps }, show: tidy(v), plain: tidy(v), format: "number", solution };
  }
  /** x × f or x ÷ f (f a power of ten), with the other one as the trap: the digits moved the wrong way. */
  const shifted = (m: number, p: number, f: number, times: boolean) => {
    const [up, down] = [Number(tidy((m * f) / 10 ** p)), Number(tidy(m / 10 ** p / f))];
    const [v, slip] = times ? [up, down] : [down, up];
    return { v, traps: [{ id: "pointWrongWay", a: num(slip), vars: { f } }] as Trap[] };
  };
  if (L === 2) {
    if (r.next() < 0.5) {
      // Multiplying or dividing by 10, 100 or 1000 (P5): the digits move past the point.
      const [p, f, times] = [r.int(1, 3), 10 ** r.int(1, 3), r.next() < 0.5];
      const m = noZeroEnd(r, 11, 9999);
      const { v, traps } = shifted(m, p, f, times);
      const q = `${fmtM(m, p)} ${times ? "\\times" : "\\div"} ${f}`;
      const solution = { kind: "decimal" as const, spec: { pic: "shift", m, p, e: Math.log10(f), times, steps: [`${q} = ${tidy(v)}`] } };
      return { prompt: w.prompts.times, q, answer: { ...num(v), traps }, show: tidy(v), plain: tidy(v), format: "number", solution };
    }
    // A decimal times or divided by a one-digit number (P4), worked in tenths or hundredths as whole numbers. For a
    // division the answer is drawn first, so it comes out exactly.
    const [p, d] = [r.int(1, 2), r.int(2, 9)];
    const f = 10 ** p;
    if (r.next() < 0.5) {
      const m = noZeroEnd(r, f + 1, 30 * f);
      const v = (m * d) / f;
      const steps = [`${fmtM(m, p)} \\times ${d} = \\frac{${m} \\times ${d}}{${f}} = \\frac{${m * d}}{${f}} = ${tidy(v)}`];
      return { prompt: w.prompts.times, q: `${fmtM(m, p)} \\times ${d}`, answer: num(v), show: tidy(v), plain: tidy(v), format: "number", solution: { kind: "decimal", spec: { pic: "jumps", m, p, d, times: true, steps } } };
    }
    let m: number;
    do m = noZeroEnd(r, f + 1, 20 * f);
    while ((m * d) % 10 === 0);
    const v = m / f;
    const steps = [`${fmtM(m * d, p)} \\div ${d} = \\frac{${m * d} \\div ${d}}{${f}} = \\frac{${m}}{${f}} = ${tidy(v)}`];
    return { prompt: w.prompts.times, q: `${fmtM(m * d, p)} \\div ${d}`, answer: num(v), show: tidy(v), plain: tidy(v), format: "number", solution: { kind: "decimal", spec: { pic: "jumps", m, p, d, times: false, steps } } };
  }
  if (r.next() < 0.5) {
    // A measurement from one unit to the other in decimal form (P5): km and m, m and cm, kg and g, litres and ml.
    const [big, small, f] = r.pick([["km", "m", 1000], ["m", "cm", 100], ["kg", "g", 1000], ["l", "ml", 1000]] as const);
    const down = r.next() < 0.5;
    const p = down ? r.int(1, f === 100 ? 2 : 3) : 0;
    let m: number;
    do m = down ? noZeroEnd(r, 10 ** p + 1, 20 * 10 ** p) : r.int(15, 20 * f);
    while (!down && m % f === 0);
    const { v, traps } = shifted(m, p, f, down);
    const a = `${fmtM(m, p)} ${w.units[down ? big : small]}`;
    const units = [w.units[down ? big : small], w.units[down ? small : big]];
    const spec = { pic: "shift", m, p, e: Math.log10(f), times: down, units, steps: [`${fmtM(m, p)} ${down ? "\\times" : "\\div"} ${f} = ${tidy(v)}`] };
    return { prompt: fill(w.prompts.convertUnit, { a, u: w.units[down ? small : big] }), q: "", answer: { ...num(v), traps }, show: tidy(v), plain: tidy(v), format: "number", solution: { kind: "decimal", spec } };
  }
  // A whole number divided by a whole number, the answer as a decimal (P4): exact when the divisor goes into a power of
  // ten, else rounded to 2 places. The worked solution is the long division, carried past the point.
  const exact = r.next() < 0.5;
  const b = r.pick(exact ? [4, 8, 20, 25, 40] : [3, 6, 7, 9, 11, 12]);
  let a: number;
  do a = r.int(b + 1, 12 * b);
  while (a % b === 0);
  const v = exact ? a / b : Math.round((100 * a) / b) / 100;
  const places = exact ? (tidy(v).split(".")[1] ?? "").length : 3;
  const solution = { kind: "model" as const, spec: { type: "division", style: "bracket", a, b, decimals: places, step: 999 } };
  const q = `${a} \\div ${b}`;
  if (exact) return { prompt: w.prompts.decimalQuotient, q, answer: num(v), show: tidy(v), plain: tidy(v), format: "number", solution };
  return { prompt: w.prompts.decimalQuotient2, q, answer: num(v, 0.0051), show: v.toFixed(2), plain: v.toFixed(2), format: "dp2", solution };
};

export default gen;
