// Practice: reading a function (#655). Easy: a function or not from arrows, and f(a) read from a graph or a table.
// Medium: the domain or range of a graph, an intercept, and where the function is increasing. Hard: the average rate
// of change, whether a table is linear, and, in a new setting, two phone plans given one by a rule and one by a table.
// A shared output taken for a break, one input with two outputs taken as fine, the graph read backwards, domain and
// range swapped, the range from the ends, the intercepts swapped, positive taken for increasing, the change not divided
// or divided upside down, increasing taken for linear, the gaps in x ignored and the start taken for the rate are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { arrowsSvg, graphSvg, sgn, tableSvg, type Pt } from "../readFunction";
import { pickPart } from "../tTails";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), h: p.h, w: p.w });

const gen: Gen = (r, L, w) => {
  const W = w.rfn;
  const withPic = (p: Part, pic: { body: string; w: number; h: number }): Part => ({ ...p, pic: picOf(pic) });
  const numQ = (prompt: string, v: number, traps: Trap[], steps: string[]): Part => ({
    prompt, q: "", answer: { ...num(v), traps }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const shuffle = <T,>(xs: T[]) => xs.map((x) => [r.next(), x] as const).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
  const distinct = (n: number, lo: number, hi: number) => {
    const s = new Set<number>();
    while (s.size < n) s.add(r.int(lo, hi));
    return [...s].sort((a, b) => a - b);
  };
  /** The ends of y = mx + c inside the grid from −6 to 6. */
  const lineEnds = (m: number, c: number): Pt[] => [-6, 6].map((x) => {
    const y = m * x + c;
    return (Math.abs(y) <= 6 ? [x, y] : [(Math.sign(y) * 6 - c) / m, Math.sign(y) * 6]) as Pt;
  });
  const interval = (a: number, b: number, v: string, strict = false) => `${sgn(a)} ${strict ? "<" : "≤"} ${v} ${strict ? "<" : "≤"} ${sgn(b)}`;

  if (L === 1) {
    if (r.next() < 0.5) {
      const many = r.next() < 0.5;
      const xs = distinct(many ? 3 : 4, -5, 9);
      const ys = distinct(many ? 4 : 3, -5, 9);
      let pairs: [number, number][];
      let x = 0;
      if (many) {
        // One input with two arrows; the others one each.
        const k = r.int(0, 2);
        x = xs[k];
        const order = shuffle([0, 1, 2, 3]);
        pairs = [[k, order[0]], [k, order[1]], ...[0, 1, 2].filter((i) => i !== k).map((i, j) => [i, order[2 + j]] as [number, number])];
      } else {
        // Every input one arrow, two of them to the same output.
        const order = shuffle([0, 1, 2, r.int(0, 2)]);
        pairs = xs.map((_, i) => [i, order[i]]);
      }
      return withPic(pickPart(r, [W.yesFn, W.noFn], many ? 1 : 0, [many ? { id: "oneToManyFunction", at: 0, vars: { x: sgn(x) } } : { id: "sameOutputNotFunction", at: 1 }],
        W.isFunction, [`\\text{${W.fnStep}}`]), arrowsSvg(xs, ys, pairs));
    }
    // f(a) from a line y = mx + c, on a graph or in a table; slipping reads the x where y = a.
    for (;;) {
      const m = r.pick([-2, -1, 1, 2, 3]);
      const c = r.int(-3, 3);
      const f = (x: number) => m * x + c;
      const xs = [-2, -1, 0, 1, 2, 3];
      const a = r.pick(xs);
      const back = (a - c) / m;
      if (!Number.isInteger(back) || back === f(a) || Math.abs(f(a)) > 6 || Math.abs(back) > 6 || a === 0) continue;
      const table = r.next() < 0.5 && xs.includes(back) && xs.map(f).includes(a);
      const p = numQ(fill(table ? W.fTable : W.fGraph, { a: sgn(a) }), f(a), [{ id: "readXForY", a: num(back), vars: { a: sgn(a) } }], [`f(${sgn(a)}) = ${sgn(f(a))}`]);
      return withPic(p, table ? tableSvg(xs, xs.map(f)) : graphSvg(lineEnds(m, c), { lo: -6, hi: 6 }));
    }
  }

  if (L === 2) {
    const t = r.pick(["domain", "range", "intercept", "rise"] as const);
    if (t === "intercept") {
      for (;;) {
        const m = r.pick([-3, -2, -1, 1, 2, 3]);
        const x0 = r.int(-3, 3);
        const c = -m * x0;
        if (x0 === 0 || c === x0 || Math.abs(c) > 6) continue;
        const y = r.next() < 0.5;
        return withPic(numQ(y ? W.yIntQ : W.xIntQ, y ? c : x0, [{ id: "interceptsSwapped", a: num(y ? x0 : c) }], [`\\text{${W.intStep}}`]), graphSvg(lineEnds(m, c), { lo: -6, hi: 6 }));
      }
    }
    if (t === "rise") {
      // Up then down, or down then up; the falling part stays above the axis.
      const [x0, x1, x2] = [r.int(-5, -3), r.int(-1, 1), r.int(3, 5)];
      const upFirst = r.next() < 0.5;
      const shape: Pt[] = upFirst
        ? [[x0, r.int(-4, -2)], [x1, r.int(3, 5)], [x2, r.int(1, 2)]]
        : [[x0, r.int(4, 5)], [x1, r.int(1, 2)], [x2, r.int(4, 6)]];
      const [rise, fall] = upFirst ? [[x0, x1], [x1, x2]] : [[x1, x2], [x0, x1]];
      return withPic(pickPart(r, [interval(rise[0], rise[1], "x", true), interval(fall[0], fall[1], "x", true), interval(x0, x2, "x", true)], 0,
        [{ id: "positiveVsIncreasing", at: 1 }], W.riseQ, [`\\text{${W.riseStep}}`]), graphSvg(shape, { lo: -6, hi: 6, ends: true }));
    }
    // Domain or range of a broken line, ends included; the highest or lowest point is inside.
    for (;;) {
      const xs = [r.int(-5, -3), r.int(-2, -1), r.int(1, 2), r.int(3, 5)];
      const ys = [r.int(-3, 3), r.int(-5, 5), r.int(-5, 5), r.int(-3, 3)];
      const [lo, hi] = [Math.min(...ys), Math.max(...ys)];
      const [e0, e1] = [Math.min(ys[0], ys[3]), Math.max(ys[0], ys[3])];
      if (hi - lo < 3 || (e0 === lo && e1 === hi)) continue;
      const pts = xs.map((x, i) => [x, ys[i]] as Pt);
      const range = t === "range";
      const v = range ? "y" : "x";
      const right = range ? interval(lo, hi, v) : interval(xs[0], xs[3], v);
      const swapped = range ? interval(xs[0], xs[3], v) : interval(lo, hi, v);
      const options = [right, swapped];
      const traps: { id: Trap["id"]; at: number; vars?: Record<string, string | number> }[] = [{ id: "domainRangeSwapped", at: 1 }];
      if (range) {
        options.push(interval(e0, e1, v));
        traps.push({ id: "rangeFromEnds", at: 2, vars: { lo: sgn(lo), hi: sgn(hi) } });
      }
      if (new Set(options).size < options.length) continue;
      return withPic(pickPart(r, options, 0, traps, range ? W.rangeQ : W.domainQ, [`\\text{${W.rangeStep}}`]), graphSvg(pts, { lo: -6, hi: 6, ends: true }));
    }
  }

  const t = r.pick(["rate", "linear", "plans"] as const);
  if (t === "rate") {
    for (;;) {
      const p = r.int(-4, 4);
      const q = r.int(-5, 5);
      const f = (x: number) => x * x + p * x + q;
      const [a, b] = distinct(2, -2, 5);
      const d = f(b) - f(a);
      const n = b - a;
      if (d === 0 || n === 1) continue;
      const v = d / n;
      const vars = { a, b, d: sgn(d), n };
      const traps: Trap[] = [{ id: "rateNotDivided", a: num(d), vars }];
      if (Math.abs(n / d - v) > 0.01) traps.push({ id: "rateUpsideDown", a: num(n / d, 0.005), vars });
      const rule = `x² ${p < 0 ? "−" : "+"} ${Math.abs(p)}x ${q < 0 ? "−" : "+"} ${Math.abs(q)}`.replace(" + 0x", "").replace(" − 0x", "").replace(/ [+−] 0$/, "").replace(" 1x", " x");
      return numQ(fill(W.rateQ, { f: rule, a: sgn(a), b: sgn(b) }), v, traps, [`f(${sgn(b)}) = ${f(b)}, \\quad f(${sgn(a)}) = ${f(a)}`, `\\frac{${d}}{${n}} = ${sgn(v)}`]);
    }
  }
  if (t === "linear") {
    const kind = r.pick(["curve", "gapSteps", "gapLine"] as const);
    const c = r.int(-3, 5);
    let xs = [0, 1, 2, 3, 4];
    let ys: number[];
    if (kind === "curve") ys = xs.map((x) => x * x + c);
    else {
      xs = r.pick([[0, 1, 2, 4, 5], [0, 1, 3, 4, 5], [0, 2, 3, 4, 5], [1, 2, 3, 5, 6]]);
      const m = r.pick([2, 3, 4]);
      ys = kind === "gapSteps" ? xs.map((_, i) => c + m * i) : xs.map((x) => c + m * x);
    }
    const steps = ys.slice(1).map((y, i) => y - ys[i]).join(", ");
    const right = kind === "gapLine" ? 0 : 1;
    const trap = kind === "curve" ? { id: "linearByIncreasing" as const, at: 0, vars: { steps } } : { id: "xGapsIgnored" as const, at: 1 - right };
    return withPic(pickPart(r, [W.linear, W.notLinear], right, [trap], W.linQ, [`\\text{${W.linStep}}`]), tableSvg(xs, ys));
  }
  // A new setting: a rule against a table, the faster one starting lower.
  for (;;) {
    const [ka, kb] = [r.int(3, 12), r.int(3, 12)];
    const [sa, sb] = [r.pick([0, 10, 20, 30, 40]), r.pick([0, 10, 20, 30, 40])];
    if (ka === kb || sa === sb || (ka > kb) === (sa > sb)) continue;
    const ruleIsA = r.next() < 0.5;
    const [k, s, kt, st] = ruleIsA ? [ka, sa, kb, sb] : [kb, sb, ka, sa];
    const ms = [0, 1, 2, 3, 4];
    const right = ka > kb ? 0 : 1;
    const vars = { p: sa > sb ? "A" : "B", ra: ka, rb: kb };
    return withPic(pickPart(r, [W.planA, W.planB], right, [{ id: "startForRate", at: 1 - right, vars }],
      fill(W.planQ, { r: ruleIsA ? "A" : "B", k, s, t: ruleIsA ? "B" : "A" }), [`\\text{${fill(W.planStep, { ra: ka, rb: kb })}}`]), tableSvg(ms, ms.map((m) => st + kt * m), [W.months, W.cost]));
  }
};

export default gen;
