// Practice: Simultaneous equations. Every level keeps its older question half the time (a system solved). #724 added
// the rest of the unit: easy, whether a point solves a system, the solution read where two graphed lines cross, and
// how many solutions two graphed lines give; medium, how many solutions from the equations, the number that makes
// adding remove y, and ticket and age stories; hard, in a new setting, the system a shop's story makes, which of two
// lines a point is on, plans that never (or always) cost the same, and the k that gives infinitely many solutions.
// One equation checked only, the count misread, the elimination factor's sign, the other unknown given, the
// story's prices swapped, the right side not scaled and x and y swapped are slips.
import { fill, r2 } from "../chart";
import { num, polyStr } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { graph2Svg, lineIn } from "../readFunction";
import { pickPart } from "../tTails";

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, r.int(0, 9), w);
  const x = r.int(-6, 6);
  const y = r.int(-6, 6);
  const big = L === 3 ? 9 : 5;
  let a1: number, b1: number, a2: number, b2: number;
  do {
    [a1, b1, a2, b2] = [r.nz(-big, big), r.nz(-big, big), r.nz(-big, big), r.nz(-big, big)];
    if (L === 1) b2 = r.pick([b1, -b1]);
  } while (a1 * b2 - a2 * b1 === 0);
  const eq = (a: number, b: number) => `${polyStr([0, a])} ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}y = ${a * x + b * y}`;
  const [e1, e2] = [eq(a1, b1), eq(a2, b2)];
  return {
    prompt: w.prompts.simultaneous,
    q: `\\begin{cases} ${e1} \\\\ ${e2} \\end{cases}`,
    answer: { k: "tuple", vs: [x, y], tol: 1e-9 },
    show: `x = ${x}, \\; y = ${y}`,
    plain: `x = ${x}; y = ${y}`,
    format: "point",
    solution: { kind: "coord", spec: { topic: "meet", src: `${e1}; ${e2}` } },
  };
};

const sg = (v: number) => String(v).replace(/^-/, "−");
/** ax + by = c as read: "2x − y = 7". */
const eqSay = (a: number, b: number, c: number) => `${a === 1 ? "" : a === -1 ? "−" : sg(a)}x ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}y = ${sg(c)}`;
/** y = mx + c as read. */
const lineSay = (m: number, c: number) => `y = ${m === 1 ? "" : m === -1 ? "−" : sg(m)}x${c ? ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}` : ""}`;
/** a·p + b·q worked out: "2 × 3 + (−1) × 4 = 2". */
const work = (a: number, b: number, p: number, q: number) => `${sg(a)} × ${p < 0 ? `(${sg(p)})` : p} ${b < 0 ? "−" : "+"} ${Math.abs(b)} × ${q < 0 ? `(${sg(q)})` : q} = ${sg(a * p + b * q)}`;
const tex = (s: string) => s.replace(/−/g, "-");
const cases = (e1: string, e2: string) => `\\begin{cases} ${tex(e1)} \\\\ ${tex(e2)} \\end{cases}`;
const place = (body: string) => (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), w: p.w, h: p.h });

/** A number to type, with slips that differ from it. */
function numPart(prompt: string, q: string, v: number, slips: [Trap["id"], number, Record<string, string | number>][], steps: string[]): Part {
  const traps: Trap[] = slips.filter(([, s]) => s !== v).map(([id, s, vars]) => ({ id, a: num(s), vars: { x: sg(s), v: sg(v), ...vars } }));
  return { prompt, q, answer: { ...num(v), traps }, show: sg(v), plain: String(v), format: "number", steps };
}

/** Two lines y = mx + c through (x0, y0), slopes apart, both crossing the grid. */
function crossing(r: Rng): { m1: number; c1: number; m2: number; c2: number; x0: number; y0: number } {
  for (;;) {
    const [x0, y0] = [r.int(-4, 4), r.int(-4, 4)];
    const [m1, m2] = [r.nz(-3, 3), r.nz(-3, 3)];
    const [c1, c2] = [y0 - m1 * x0, y0 - m2 * x0];
    if (m1 !== m2 && Math.abs(c1) <= 6 && Math.abs(c2) <= 6) return { m1, c1, m2, c2, x0, y0 };
  }
}

function more(r: Rng, L: number, kind: number, w: PracticeWords): Part {
  const W = w.sysP;
  const counts = [W.one, W.none, W.many];
  if (L === 1) {
    if (kind <= 2) {
      // Does a point solve the system? Shown either the solution or a point on the first line only.
      for (;;) {
        const [x, y] = [r.int(-5, 5), r.int(-5, 5)];
        const [a1, b1, a2, b2] = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5)];
        if (a1 * b2 === a2 * b1) continue;
        const [c1, c2] = [a1 * x + b1 * y, a2 * x + b2 * y];
        const yes = r.next() < 0.4;
        const [p, q] = yes ? [x, y] : [x + b1, y - a1];
        if (!yes && (a2 * p + b2 * q === c2 || Math.abs(p) > 9 || Math.abs(q) > 9)) continue;
        const e1 = eqSay(a1, b1, c1);
        const e2 = eqSay(a2, b2, c2);
        const pt = `(${sg(p)}, ${sg(q)})`;
        const w1 = work(a1, b1, p, q);
        const w2 = `${work(a2, b2, p, q)}${yes ? "" : ` ≠ ${sg(c2)}`}`;
        const traps = yes ? [] : [{ id: "oneEquationChecked" as const, at: 0, vars: { p: pt, a: w1, b: w2, v: W.no } }];
        return { ...pickPart(r, [W.yes, W.no], yes ? 0 : 1, traps, fill(W.isSol, { p: pt }), [tex(w1), tex(w2).replace("≠", "\\ne")]), q: cases(e1, e2) };
      }
    }
    if (kind <= 5) {
      // The solution read where the two graphed lines cross.
      const { m1, c1, m2, c2, x0, y0 } = crossing(r);
      const traps: Trap[] = x0 === y0 ? [] : [{ id: "pointCoordsSwapped", a: { k: "tuple", vs: [y0, x0], tol: 1e-9 }, vars: { w: `${lineSay(m1, c1)}: ${sg(m1)} × ${x0 < 0 ? `(${sg(x0)})` : x0} ${c1 < 0 ? "−" : "+"} ${Math.abs(c1)} = ${sg(y0)}`, v: `x = ${sg(x0)}, y = ${sg(y0)}` } }];
      return {
        prompt: fill(W.graphSol, { a: lineSay(m1, c1), b: lineSay(m2, c2) }), q: "",
        answer: { k: "tuple", vs: [x0, y0], tol: 1e-9, traps }, show: `x = ${x0}, \\; y = ${y0}`, plain: `x = ${x0}; y = ${y0}`, format: "point",
        steps: [`(${x0}, ${y0})`], pic: picOf(graph2Svg(lineIn(m1, c1, -6, 6), lineIn(m2, c2, -6, 6), { lo: -6, hi: 6 })),
      };
    }
    // How many solutions two graphed lines give: crossing, parallel, or one line.
    const sort = r.pick([0, 1, 2]);
    const m = r.nz(-2, 2);
    const c = r.int(-3, 3);
    const [m2, c2] = sort === 0 ? [m === 1 ? -1 : m + (m > 0 ? -2 : 2) || 1, c] : sort === 1 ? [m, c + r.pick([-3, -2, 2, 3])] : [m, c];
    const slipAt = [1, 0, 0][sort];
    const why = [W.whyCross, W.whyParallel, W.whySame][sort];
    return { ...pickPart(r, counts, sort, [{ id: "linesCountMisread", at: slipAt, vars: { why, v: counts[sort] } }], W.graphCount, [`\\text{${counts[sort]}}`]), pic: picOf(graph2Svg(lineIn(m, c, -6, 6), lineIn(m2, c2, -6, 6), { lo: -6, hi: 6 })) };
  }
  if (L === 2) {
    if (kind <= 3) {
      // How many solutions, from the equations: the second the first times k (all of it, or the left side only), or not.
      for (;;) {
        const [a, b] = [r.nz(-5, 5), r.nz(-5, 5)];
        const c = r.int(-9, 9);
        const k = r.pick([-3, -2, 2, 3]);
        const sort = r.pick([0, 1, 2]);
        const [a2, b2, c2] = sort === 0 ? [r.nz(-5, 5), r.nz(-5, 5), r.int(-9, 9)] : [k * a, k * b, sort === 2 ? k * c : k * c + r.pick([-4, -2, 3, 5])];
        if (sort === 0 && a * b2 === a2 * b) continue;
        const why = fill([W.algCross, W.algParallel, W.algSame][sort], { k: sg(k) });
        const slipAt = [1, 2, 1][sort];
        return { ...pickPart(r, counts, sort, [{ id: "linesCountMisread", at: slipAt, vars: { why, v: counts[sort] } }], W.algCount, [`\\text{${counts[sort]}}`]), q: cases(eqSay(a, b, c), eqSay(a2, b2, c2)) };
      }
    }
    if (kind <= 5) {
      // The number the second equation is multiplied by so that adding removes y.
      const b2 = r.pick([-2, -1, 1, 2]);
      const k = r.pick([-3, -2, 2, 3]);
      const b1 = -k * b2;
      const [x, y] = [r.int(-5, 5), r.int(-5, 5)];
      const [a1, a2] = [r.nz(-5, 5), r.nz(-4, 4)];
      if (a1 + k * a2 === 0) return more(r, L, kind, w);
      return numPart(W.eliminate, cases(eqSay(a1, b1, a1 * x + b1 * y), eqSay(a2, b2, a2 * x + b2 * y)), k,
        [["eliminationSignWrong", -k, { w: `${sg(b1)}y + ${k < 0 ? `(${sg(k)})` : k} × ${b2 < 0 ? `(${sg(b2)}y)` : `${b2}y`} = 0` }]], [`${b1}y + ${k} \\times ${b2 < 0 ? `(${b2}y)` : `${b2}y`} = 0`, `k = ${k}`]);
    }
    if (kind <= 7) {
      // Tickets: adults and children, the count and the takings.
      const [a, c] = r.pick([[8, 5], [10, 6], [12, 7], [9, 4], [15, 10]] as const);
      const [A, Cn] = [r.int(5, 30), r.int(5, 30)];
      if (A === Cn) return more(r, L, kind, w);
      const adults = r.next() < 0.5;
      const v = adults ? A : Cn;
      return numPart(fill(adults ? W.ticketsA : W.ticketsC, { a, c, n: A + Cn, t: a * A + c * Cn }), "", v,
        [["otherUnknownGiven", adults ? Cn : A, { w: `${A} + ${Cn} = ${A + Cn}, ${a} × ${A} + ${c} × ${Cn} = ${a * A + c * Cn}` }]],
        [`a + c = ${A + Cn}`, `${a}a + ${c}c = ${a * A + c * Cn}`, adults ? `a = ${A}` : `c = ${Cn}`]);
    }
    // Ages: Ana is d years older than Beka; in y years their ages add to s.
    const [B, d, y] = [r.int(3, 20), r.int(2, 9), r.int(2, 6)];
    const A = B + d;
    const s = A + B + 2 * y;
    return numPart(fill(W.ages, { d, y, s }), "", A, [["otherUnknownGiven", B, { w: `${A} − ${B} = ${d}, (${A} + ${y}) + (${B} + ${y}) = ${s}` }]],
      [`a = b + ${d}`, `(a + ${y}) + (b + ${y}) = ${s}`, `2b + ${d + 2 * y} = ${s}`, `b = ${B}, \\; a = ${A}`]);
  }
  if (kind <= 2) {
    // The system a shop's story makes.
    const [p, q] = r.pick([[3, 5], [2, 7], [4, 9], [6, 10], [5, 8]] as const);
    const [x, y] = [r.int(3, 15), r.int(3, 15)];
    const [n, t] = [x + y, p * x + q * y];
    const sys = (a: string, b: string) => `${a}; ${b}`;
    const opts = [sys(`x + y = ${n}`, `${p}x + ${q}y = ${t}`), sys(`x + y = ${n}`, `${q}x + ${p}y = ${t}`), sys(`x + y = ${t}`, `${p}x + ${q}y = ${n}`), sys(`${p}x + ${q}y = ${n}`, `x + y = ${t}`)];
    return pickPart(r, opts, 0, [{ id: "systemCoefficientsSwapped", at: 1, vars: { p, q, v: opts[0] } }], fill(W.shop, { p, q, n, t }), [`\\text{${opts[0]}}`]);
  }
  if (kind <= 4) {
    // Which of two lines a point is on.
    const { m1, c1, m2, c2, x0, y0 } = crossing(r);
    const sort = r.pick([0, 1, 2, 3]);
    const [px, py] = sort === 0 ? [x0, y0] : sort === 1 ? [x0 + 1, y0 + m1] : sort === 2 ? [x0 + 1, y0 + m2] : [x0 + 1, y0 + m1 + m2 + (m1 === -m2 ? 1 : 0)];
    const onA = py === m1 * px + c1;
    const onB = py === m2 * px + c2;
    if ([onA && onB, onA && !onB, !onA && onB, !onA && !onB].indexOf(true) !== sort) return more(r, L, kind, w);
    const pt = `(${sg(px)}, ${sg(py)})`;
    const at = (m: number, c: number) => `${sg(m)} × ${px < 0 ? `(${sg(px)})` : px} ${c < 0 ? "−" : "+"} ${Math.abs(c)} = ${sg(m * px + c)}`;
    const opts = [W.both, W.onlyA, W.onlyB, W.neither];
    const traps = sort === 1 || sort === 2 ? [{ id: "oneEquationChecked" as const, at: 0, vars: { p: pt, a: sort === 1 ? at(m1, c1) : at(m2, c2), b: `${sort === 1 ? at(m2, c2) : at(m1, c1)} ≠ ${sg(py)}`, v: opts[sort] } }] : [];
    return pickPart(r, opts, sort, traps, fill(W.whichLine, { a: lineSay(m1, c1), b: lineSay(m2, c2), p: pt }), [`A: ${tex(at(m1, c1))}`, `B: ${tex(at(m2, c2))}`]);
  }
  if (kind <= 6) {
    // Two plans: the same monthly charge never meets unless they start the same (the second plan then the first in
    // other words); different charges meet once.
    const s = r.pick([10, 15, 20, 25]);
    const f = r.pick([20, 30, 40, 50]);
    const sort = r.pick([0, 1, 2]);
    const [s2, f2] = sort === 0 ? [s + r.pick([5, 10]), f - r.pick([10, 20])] : sort === 1 ? [s, f + r.pick([10, 20])] : [s, f];
    const why = fill([W.storyOne, W.storyNone, W.storySame][sort], { s, d: Math.abs(f2 - f), f });
    const say2 = sort === 2 ? fill(W.planSame, { s: s2, f: f2 }) : fill(W.plan, { s: s2, f: f2 });
    return pickPart(r, counts, sort, [{ id: "linesCountMisread", at: [1, 0, 1][sort], vars: { why, v: counts[sort] } }],
      `${fill(W.plans, { a: fill(W.plan, { s, f }), b: say2 })} ${W.plansAsk}`, [`\\text{${counts[sort]}}`]);
  }
  // The k that gives infinitely many solutions: the whole second equation the first times s.
  const [a, b] = [r.nz(-5, 5), r.nz(-5, 5)];
  const c = r.nz(-9, 9);
  const s = r.pick([-2, 2, 3, 4]);
  return numPart(fill(W.findK, { e: eqSay(a, b, c), f: `${eqSay(s * a, s * b, 0).replace(/= 0$/, "= k")}` }), "", s * c,
    [["systemScaleMissed", c, { s: sg(s), c: sg(c) }]], [`${s} \\times (${a}x ${b < 0 ? "-" : "+"} ${Math.abs(b)}y) = ${s * a}x ${s * b < 0 ? "-" : "+"} ${Math.abs(s * b)}y`, `k = ${s} \\times ${c} = ${s * c}`]);
}

export default gen;
