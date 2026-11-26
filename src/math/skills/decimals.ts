// Practice: Decimals.
// #704: at P4 also adding and taking away on hundredths grids, the best estimate of a sum or difference (each number
// rounded to a whole), and stories: juice in a jug and a bottle, rope cut off, who jumped farther, a length or mass
// rounded; at the hard level thousandths, bare and as times on a stopwatch. The last digits lined up, the decimals
// cut off instead of rounded and more digits taken for bigger are named.
import { fill } from "../chart";
import { hundredthsGrids } from "../decimalGrids";
import { pickText } from "../mulDivKit";
import { fmtM, noZeroEnd, num, tidy } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const D = w.decPics;
  /** a ± b, a and b given as m over 10^p: the points lined up, the last digits lined up the slip (when the places differ). */
  const plusMinus = (a: { m: number; p: number }, b: { m: number; p: number }, plus: boolean, prompt = w.prompts.times, pic?: Part["pic"]): Part => {
    const P = Math.max(a.p, b.p);
    const at = (x: typeof a) => x.m * 10 ** (P - x.p);
    const res = plus ? at(a) + at(b) : at(a) - at(b);
    const v = res / 10 ** P;
    const slip = plus ? a.m + b.m : a.m - b.m;
    const [fa, fb] = [fmtM(a.m, a.p), fmtM(b.m, b.p)];
    const short = a.p < P ? a : b;
    const traps: Trap[] = a.p !== b.p && slip > 0 && slip !== res ? [{ id: "alignedRight", a: num(slip / 10 ** P), vars: { a: fmtM(short.m, short.p), pa: fmtM(at(short), P) } }] : [];
    const op = plus ? "+" : "-";
    const steps = a.p === b.p ? [`${fa} ${op} ${fb} = ${tidy(v)}`] : [`${fa} ${op} ${fb} = ${fmtM(at(a), P)} ${op} ${fmtM(at(b), P)}`, `= ${fmtM(res, P)}`];
    const story = prompt !== w.prompts.times;
    const solution = { kind: "decimal" as const, spec: { pic: "columns", op, a: at(a), b: at(b), pa: a.p, pb: b.p, P, steps } };
    return { prompt, q: story ? "" : `${fa} ${op} ${fb}`, answer: { ...num(v), traps }, show: tidy(v), plain: tidy(v), format: "number", solution, ...(pic ? { pic } : {}) };
  };
  if (L === 1) {
    const kind = r.int(0, 4);
    if (kind >= 2) return easyNew(kind);
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
  if (r.int(0, 3) === 0) {
    // Thousandths (#704): a number with three places and one with one or two, bare or as stopwatch times.
    const x = { m: noZeroEnd(r, 1001, 19999), p: 3 };
    const y = { m: noZeroEnd(r, 11, 199), p: r.int(1, 2) };
    const t = r.int(0, 2);
    if (t === 0) {
      // Added either way round; taken away the larger first.
      const plus = r.next() < 0.5;
      const big = x.m >= y.m * 10 ** (3 - y.p);
      if (plus) return r.next() < 0.5 ? plusMinus(x, y, true) : plusMinus(y, x, true);
      return big ? plusMinus(x, y, false) : plusMinus(y, x, false);
    }
    // Times on a stopwatch, 10 s to 15 s: two laps added, or how much faster one runner was.
    const lap = () => ({ m: noZeroEnd(r, 10001, 14999), p: 3 });
    const other = () => ({ m: noZeroEnd(r, 101, 149), p: 1 });
    const [p, q] = [lap(), r.next() < 0.5 ? lap() : other()];
    if (t === 1) return plusMinus(p, q, true, fill(D.laps, { a: fmtM(p.m, p.p), b: fmtM(q.m, q.p) }));
    const at = (u: typeof p) => u.m * 10 ** (3 - u.p);
    if (at(p) === at(q)) return plusMinus(p, q, true, fill(D.laps, { a: fmtM(p.m, p.p), b: fmtM(q.m, q.p) }));
    const [fast, slow] = at(p) < at(q) ? [p, q] : [q, p];
    return plusMinus(slow, fast, false, fill(D.faster, { a: fmtM(fast.m, fast.p), b: fmtM(slow.m, slow.p) }));
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

  /** P4's new kinds (#704): 2 ± on hundredths grids, 3 the best estimate, 4 stories. */
  function easyNew(kind: number): Part {
    if (kind === 2) {
      // Hundredths added (blue and orange) or taken away (crossed out) on one grid; one of them tenths now and then.
      const plus = r.next() < 0.5;
      const a = plus ? r.int(12, 70) : r.int(30, 95);
      const room = plus ? 99 - a : a - 5;
      let b = r.next() < 0.4 && room >= 10 ? 10 * r.int(1, Math.floor(room / 10)) : r.int(5, room);
      if (b === a) b -= 1;
      const as = (m: number) => (m % 10 ? { m, p: 2 } : { m: m / 10, p: 1 });
      return plusMinus(as(a), as(b), plus, w.prompts.times, hundredthsGrids([plus ? { a, b } : { a, out: b }]));
    }
    if (kind === 3) {
      // The best estimate of a sum or difference of two numbers with two places: each rounded to a whole first. The
      // first one's decimals are .55 or more, so cutting them off gives another answer.
      const plus = r.next() < 0.5;
      const x = r.int(2, 9) * 100 + r.int(55, 95);
      // Taken away, the second's decimals are under .5, so cutting both off still moves the estimate.
      let y = r.int(1, 8) * 100 + (plus ? r.int(5, 95) : r.int(5, 45));
      if (!plus && Math.round(y / 100) >= Math.round(x / 100)) y = Math.floor(x / 100 - 2) * 100 + (y % 100);
      const [rx, ry] = [Math.round(x / 100), Math.round(y / 100)];
      const [cx, cy] = [Math.floor(x / 100), Math.floor(y / 100)];
      const right = plus ? rx + ry : rx - ry;
      const cut = plus ? cx + cy : cx - cy;
      const exact = (plus ? x + y : x - y) / 100;
      const q = `${tidy(x / 100)} ${plus ? "+" : "−"} ${tidy(y / 100)}`;
      const others = [right + 2, right - 2, right + 1].filter((o) => o > 0 && o !== cut && o !== right).slice(0, cut !== right ? 1 : 2);
      return pickText(r, fill(D.bestEstimate, { q }), String(right), cut !== right ? [{ text: String(cut), id: "truncated", vars: {} }] : [], others.map(String), {
        steps: [`${tidy(x / 100)} \\approx ${rx}, \\quad ${tidy(y / 100)} \\approx ${ry}`, `${rx} ${plus ? "+" : "-"} ${ry} = ${right} \\quad (${tidy(exact)})`],
      });
    }
    const t = r.int(0, 3);
    if (t <= 1) {
      // Juice in a jug and a bottle, or rope cut off.
      const part = () => {
        const p = r.int(1, 2);
        return { m: noZeroEnd(r, 10 ** p + 1, 10 ** (p + 1) * 3 - 1), p };
      };
      let [a, b] = [part(), part()];
      const at = (u: typeof a) => u.m * 10 ** (2 - u.p);
      while (at(a) === at(b)) b = part();
      if (t === 1 && at(a) < at(b)) [a, b] = [b, a];
      const f = (u: typeof a) => fmtM(u.m, u.p);
      return plusMinus(a, b, t === 0, fill(t === 0 ? D.jug : D.rope, { a: f(a), b: f(b) }));
    }
    if (t === 2) {
      // Who jumped farther: 2.4 m against 2.35 m, where more digits look bigger.
      const tn = r.int(2, 9);
      let h = r.next() < 0.6 ? r.int(11, 10 * tn - 1) : r.int(10 * tn + 1, Math.min(99, 10 * tn + 9));
      if (h % 10 === 0) h += 1;
      const whole = r.int(1, 3);
      const swap = r.next() < 0.5;
      const [x, y] = [`${whole}.${tn}`, `${whole}.${String(h).padStart(2, "0")}`];
      const [a, b] = swap ? [y, x] : [x, y];
      const nino = Number(a) > Number(b);
      const right = nino ? D.nino : D.gio;
      // More digits taken for bigger names the one with two places.
      const longer = swap ? D.nino : D.gio;
      const slips = longer !== right ? [{ text: longer, id: "longerDecimal" as const, vars: { a: Number(a).toFixed(2), b: Number(b).toFixed(2) } }] : [];
      return pickText(r, fill(D.jump, { a, b }), right, slips, slips.length ? [] : [nino ? D.gio : D.nino], {
        steps: [`${Number(a).toFixed(2)} ${nino ? ">" : "<"} ${Number(b).toFixed(2)}`],
      });
    }
    // A length rounded to a tenth, or a mass to a whole: the digits cut off instead is the slip.
    const tenth = r.next() < 0.5;
    const m = tenth ? r.int(5, 25) * 100 + r.int(1, 9) * 10 + r.int(5, 9) : r.int(1, 9) * 100 + r.int(51, 99);
    const v = tenth ? Math.round(m / 10) / 10 : Math.round(m / 100);
    const cut = tenth ? Math.floor(m / 10) / 10 : Math.floor(m / 100);
    const a = tidy(m / 100);
    return {
      prompt: fill(tenth ? D.pencil : D.apples, { a }), q: "", answer: { ...num(v), traps: [{ id: "truncated", a: num(cut), vars: {} }] }, show: tidy(v), plain: tidy(v), format: "number",
      steps: [`${a} \\approx ${tidy(v)}`],
    };
  }
};

export default gen;
