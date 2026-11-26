// Practice: reading a function (#655). Easy: a function or not from arrows, and f(a) read from a graph or a table.
// Medium: the domain or range of a graph, an intercept, and where the function is increasing. Hard: the average rate
// of change, whether a table is linear, and, in a new setting, two phone plans given one by a rule and one by a table.
// A shared output taken for a break, one input with two outputs taken as fine, the graph read backwards, domain and
// range swapped, the range from the ends, the intercepts swapped, positive taken for increasing, the change not divided
// or divided upside down, increasing taken for linear, the gaps in x ignored and the start taken for the rate are slips.
// #722 added (half the time at the easy and medium levels, three times in ten at the hard one): a function or not from
// a table or a graph, the independent and the dependent variable, y from an equation for a given x; whether a point
// solves a two-variable equation, the missing number of a solution, intercepts read from a table; and a linear
// function written from a story. Two outputs for one input missed, the variables swapped, x and y swapped and the rate
// and the start swapped are slips. #725 added, four times in ten: easy, k·f(a) worked out and a tank's depth h(t)
// read either way; medium, which x is in a graph's domain and what C(a) = b means in a story; hard, the domain of
// √(x − a) or 1/(x − a), a relative or absolute extremum or where f is positive or negative read off a graph, and,
// in a new setting, the domain of a cost or takings function that counts trays or passengers. The input scaled for
// the output, input and output swapped, the notation read as a product, the open end taken in, the domain's sign
// flipped, √0 left out, the extremum's x given for its value, a relative extremum for an absolute one, climbing taken
// for positive, the signs swapped and a count's domain taken as all numbers are slips.
import { C, fill } from "../chart";
import { fromPoly, tex } from "../expr";
import { fr, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { arrowsSvg, graphSvg, sgn, tableSvg, type Pt } from "../readFunction";
import { polyText } from "../whichTool";
import { pickPart } from "../tTails";

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const picOf = (p: { body: string; w: number; h: number }) => ({ svg: place(p.body), h: p.h, w: p.w });

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 6) return notation(r, L, r.int(0, 9), w);
  if (r.int(0, 9) >= (L === 3 ? 7 : 5)) return more(r, L, r.int(0, 9), w);
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

/** y = mx + c as read, with a true minus. */
const lineSay = (m: number, c: number) => `y = ${m === 1 ? "" : m === -1 ? "−" : sgn(m)}x${c ? ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}` : ""}`;
const pt = (x: number, y: number) => `(${sgn(x)}, ${sgn(y)})`;

function more(r: Rng, L: number, kind: number, w: PracticeWords): Part {
  const W = w.rfn;
  const P = w.rfnP;
  const yesNo = [W.yesFn, W.noFn];
  const numQ = (prompt: string, v: number, slips: [Trap["id"], number, Record<string, string | number>][], steps: string[]): Part => ({
    prompt, q: "", answer: { ...num(v), traps: slips.filter(([, s]) => s !== v).map(([id, s, vars]) => ({ id, a: num(s), vars: { x: sgn(s), v: sgn(v), ...vars } })) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  if (L === 1) {
    if (kind <= 2) {
      // A table: one x with two different values of y is not a function; two x with one y is.
      const xs = [-2, -1, 0, 1, 2, 3].slice(0, 5);
      const ys = xs.map(() => r.int(-5, 9));
      const broken = r.next() < 0.5;
      const k = r.int(0, 3);
      const tx = [...xs];
      const ty = [...ys];
      if (broken) {
        tx[4] = tx[k];
        if (ty[4] === ty[k]) ty[4] = ty[k] + r.pick([1, 2, 3]);
      } else ty[4] = ty[k];
      const t = tableSvg(tx, ty);
      const traps = broken ? [{ id: "twoOutputsMissed" as const, at: 0, vars: { x: sgn(tx[k]), a: sgn(ty[k]), b: sgn(ty[4]) } }] : [{ id: "sameOutputNotFunction" as const, at: 1 }];
      return withPicOf(pickPart(r, yesNo, broken ? 1 : 0, traps, P.tableFn, [`\\text{${P.fnRule}}`]), t);
    }
    if (kind <= 4) {
      // A graph: a vertical line meets a function's graph once at most.
      const shape = r.pick(["v", "bowl", "side", "circle"] as const);
      const c = r.int(-3, 1);
      const pts: Pt[] = shape === "v" ? [[-6, 6 + c], [0, c], [6, 6 + c]]
        : shape === "bowl" ? [-3, -2, -1, 0, 1, 2, 3].map((x) => [x, (x * x) / 2 + c] as Pt)
        : shape === "side" ? [[5, -6], [-1, 0], [5, 6]]
        : Array.from({ length: 33 }, (_, i) => [4 * Math.cos((i * Math.PI) / 16), 4 * Math.sin((i * Math.PI) / 16)] as Pt);
      const fn = shape === "v" || shape === "bowl";
      const at = shape === "side" ? { x: 2, a: -3, b: 3 } : { x: 0, a: -4, b: 4 };
      const traps = fn ? [{ id: "sameOutputNotFunction" as const, at: 1 }] : [{ id: "twoOutputsMissed" as const, at: 0, vars: { x: sgn(at.x), a: sgn(at.a), b: sgn(at.b) } }];
      return withPicOf(pickPart(r, yesNo, fn ? 0 : 1, traps, P.graphFn, [`\\text{${P.vertical}}`]), graphSvg(pts, { lo: -6, hi: 6 }));
    }
    if (kind <= 6) {
      // The independent variable (chosen) and the dependent one (that follows).
      const st = r.pick([1, 2, 3] as const);
      const [say, a, b] = [P[`dep${st}`], P[`dep${st}A`], P[`dep${st}B`]];
      const indep = r.next() < 0.5;
      return pickPart(r, [a, b], indep ? 0 : 1, [{ id: "dependentIndependentSwapped", at: indep ? 1 : 0, vars: { x: indep ? b : a, v: indep ? a : b, i: a } }],
        `${say} ${indep ? P.indepQ : P.depQ}`, [`\\text{${a} → ${b}}`]);
    }
    // y from an equation for a given x: the x put in, not solved for.
    for (;;) {
      const m = r.pick([-3, -2, 2, 3, 4]);
      const c = r.int(-6, 6);
      const a = r.nz(-5, 6);
      const back = (a - c) / m;
      const y = m * a + c;
      if (!Number.isInteger(back) || back === y) continue;
      return numQ(fill(P.fromEq, { e: lineSay(m, c), a: sgn(a) }), y, [["readXForY", back, { a: sgn(a) }]], [`y = ${m} \\times (${a}) ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${y}`]);
    }
  }
  if (L === 2) {
    if (kind <= 3) {
      // Is a point a solution? Put x and y in; the point that is a solution with x and y swapped is not one.
      for (;;) {
        const m = r.pick([-2, -1, 2, 3]);
        const c = r.int(-4, 4);
        const x = r.nz(-4, 4);
        const y = m * x + c;
        const e = lineSay(m, c);
        if (r.next() < 0.4) {
          if (y === x) continue;
          return pickPart(r, yesNo, 0, [], fill(P.isSol, { p: pt(x, y), e }), [`${m}(${x}) ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${y}`]);
        }
        // (y, x) shown: it is a solution only if swapping were allowed.
        if (y === x || m * y + c === x) continue;
        return pickPart(r, yesNo, 1, [{ id: "pointCoordsSwapped", at: 0, vars: { x: W.yesFn, v: W.noFn, w: `${m} × ${sgn(y)} ${c < 0 ? "−" : "+"} ${Math.abs(c)} = ${sgn(m * y + c)} ≠ ${sgn(x)}` } }],
          fill(P.isSol, { p: pt(y, x), e }), [`${m}(${y}) ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${m * y + c} \\ne ${x}`]);
      }
    }
    if (kind <= 5) {
      // The missing y of a solution of px + qy = k.
      for (;;) {
        const [p, q] = [r.pick([1, 2, 3, 4, 5]), r.pick([2, 3, 4, -2, -3])];
        const a = r.nz(-6, 6);
        const y = r.nz(-6, 6);
        const k = p * a + q * y;
        const back = (k - q * a) / p;
        if (back === y) continue;
        const e = `${p === 1 ? "" : p}x ${q < 0 ? "−" : "+"} ${Math.abs(q)}y = ${sgn(k)}`;
        const slips: [Trap["id"], number, Record<string, string | number>][] = Number.isInteger(back) ? [["pairOrderSwapped", back, { a: sgn(a), w: `${p} × ${sgn(a)} ${q < 0 ? "−" : "+"} ${Math.abs(q)}y = ${sgn(k)}` }]] : [];
        return numQ(fill(P.missing, { a: sgn(a), e }), y, slips, [`${p}(${a}) ${q < 0 ? "-" : "+"} ${Math.abs(q)}y = ${k}`, `y = ${y}`]);
      }
    }
    // Intercepts from a table: y where x = 0, x where y = 0.
    for (;;) {
      const m = r.pick([-3, -2, -1, 1, 2, 3]);
      const x0 = r.nz(-3, 3);
      const c = -m * x0;
      if (c === x0) continue;
      const lo = Math.min(0, x0) - r.int(0, 1);
      const xs = Array.from({ length: 6 }, (_, i) => lo + i);
      if (!xs.includes(0) || !xs.includes(x0)) continue;
      const yAsked = r.next() < 0.5;
      return withPicOf(numQ(yAsked ? P.tYInt : P.tXInt, yAsked ? c : x0, [["interceptsSwapped", yAsked ? x0 : c, {}]], [yAsked ? `x = 0 \\Rightarrow y = ${c}` : `y = 0 \\Rightarrow x = ${x0}`]), tableSvg(xs, xs.map((x) => m * x + c)));
    }
  }
  // A linear function written from a story: the change each unit times x, plus the start.
  const pool = r.next() < 0.5;
  const a = pool ? r.pick([20, 25, 40, 50]) : r.pick([2, 3, 4]);
  const b = pool ? r.pick([100, 200, 300, 500]) : r.pick([20, 24, 30, 36]);
  const m = pool ? a : -a;
  const e = fromPoly([fr(b), fr(m)]);
  const slipLine = (mm: number, cc: number) => ({ k: "expr" as const, e: fromPoly([fr(cc), fr(mm)]), mode: "line" as const });
  const traps: Trap[] = [{ id: "rateStartSwapped", a: slipLine(b, m), vars: { x: lineSay(b, m), v: lineSay(m, b), a: sgn(m), b, u: pool ? P.minute : P.hour } }];
  if (!pool) traps.push({ id: "slopeSignInContext", a: slipLine(a, b), vars: { x: lineSay(a, b), v: sgn(m) } });
  return { prompt: fill(pool ? P.pool : P.candle, { a, b }), q: "", answer: { k: "expr", e, mode: "line", traps }, show: `y = ${tex(e)}`, plain: `y = ${m}x + ${b}`, format: "line", steps: [`y = ${tex(e)}`] };
}

const withPicOf = (p: Part, pic: { body: string; w: number; h: number }): Part => ({ ...p, pic: picOf(pic) });

/** A number in a product: (−3) in brackets. */
const par = (v: number) => (v < 0 ? `(${sgn(v)})` : sgn(v));

function notation(r: Rng, L: number, kind: number, w: PracticeWords): Part {
  const N = w.rfnN;
  const numQ = (prompt: string, v: number, slips: [Trap["id"], number, Record<string, string | number>][], steps: string[], pic?: Part["pic"]): Part => ({
    prompt, q: "", ...(pic ? { pic } : {}), show: sgn(v), plain: String(v), format: "number", steps,
    answer: { ...num(v), traps: slips.filter(([, x]) => x !== v).map(([id, x, vars]) => ({ id, a: num(x), vars: { x: sgn(x), v: sgn(v), ...vars } })) },
  });
  if (L === 1) {
    if (kind <= 4) {
      // k·f(a): the output times k, not the output at k·a.
      for (;;) {
        const [p, q] = [r.nz(-4, 4), r.int(-6, 6)];
        const quad = r.next() < 0.5;
        const f = (x: number) => (quad ? p * x * x + q : p * x + q);
        const fs = quad ? polyText(q, 0, p) : polyText(q, p);
        const [k, a] = [r.pick([2, 3, -2]), r.nz(-3, 3)];
        const [v, x] = [k * f(a), f(k * a)];
        if (v === x) continue;
        const e = `${sgn(k)}f(${sgn(a)})`;
        const wk = `f(${sgn(a)}) = ${sgn(f(a))}, ${sgn(k)} × ${par(f(a))} = ${sgn(v)}`;
        return numQ(fill(N.evalQ, { f: fs, e }), v, [["outsideInsideSwapped", x, { e, m: fill(N.timesOut, { k: sgn(k), a: sgn(a) }), w: wk }]],
          [`f(${a}) = ${f(a)}`, `${k} \\times ${f(a) < 0 ? `(${f(a)})` : f(a)} = ${v}`]);
      }
    }
    // A tank's depth h(t) = A − st: h at a time, or the time for a depth.
    const s = r.pick([2, 3, 4, 5]);
    const m = r.int(8, 12);
    const A = s * m;
    if (r.next() < 0.5) {
      const k = s * r.int(1, Math.floor(m / s));
      const v = A - s * k;
      return numQ(fill(N.depthAt, { A, s, k }), v, [["inputOutputSwapped", (A - k) / s, { f: "h", w: `h(${k}) = ${A} − ${s} × ${k} = ${v}.` }]],
        [`h(${k}) = ${A} - ${s} \\times ${k} = ${v}`]);
    }
    const t0 = r.int(1, m - 1);
    const d = s * (m - t0);
    return numQ(fill(N.depthWhen, { A, s, d }), t0, [["inputOutputSwapped", A - s * d, { f: "h", w: `${A} − ${s}t = ${d}, so t = ${t0}.` }]],
      [`${A} - ${s}t = ${d}`, `t = ${t0}`]);
  }
  if (L === 2) {
    if (kind <= 4) {
      // Which x is in the domain of a graph closed at a and open at b.
      const [a, b] = [r.int(-5, -1), r.int(2, 5)];
      const xs = Array.from({ length: b - a + 1 }, (_, i) => a + i);
      // A gentle walk: each step up one, down one or level.
      const ys = [r.int(-2, 2)];
      for (let i = 1; i < xs.length; i++) ys.push(Math.max(-4, Math.min(4, ys[i - 1] + r.int(-1, 1))));
      const g = graphSvg(xs.map((x, i) => [x, ys[i]] as Pt), { lo: -6, hi: 6 });
      const X = (x: number) => 20 + (x + 6) * 22;
      const Y = (y: number) => 20 + (6 - y) * 22;
      const body = `${g.body}<circle cx="${X(a)}" cy="${Y(ys[0])}" r="5" fill="${C.blue}"/><circle cx="${X(b)}" cy="${Y(ys[ys.length - 1])}" r="5" fill="#fff" stroke="${C.blue}" stroke-width="2.5"/>`;
      const inside = r.int(a, b - 1);
      const opts = [inside, b, a - 1, b + 1].map((x) => `x = ${sgn(x)}`);
      return { ...pickPart(r, opts, 0, [{ id: "openDotIncluded", at: 1, vars: { t: sgn(b), v: opts[0] } }], N.inDomain, [`${a} \\le x < ${b}`]), pic: picOf({ body, w: g.w, h: g.h }) };
    }
    // What C(a) = b means in a story.
    const ctx = r.int(0, 2);
    const f = ["C", "h", "d"][ctx];
    const a = r.int(2, 6);
    const b = r.int(3, 8) * a + r.int(1, a - 1);
    const say = (x: number, y: number) => fill([N.say0, N.say1, N.say2][ctx], { a: x, b: y });
    const opts = [say(a, b), say(b, a), fill(N.times, { f, a, b })];
    return pickPart(r, opts, 0, [
      { id: "inputOutputSwapped", at: 1, vars: { f, w: fill(N.inOut, { f, a, b }), v: opts[0] } },
      { id: "notationAsProduct", at: 2, vars: { f, a, v: opts[0] } },
    ], fill([N.ctx0, N.ctx1, N.ctx2][ctx], { a, b }), [`${f}(${a}) = ${b}`]);
  }
  if (kind <= 2) {
    // The domain of √(x − a) or 1/(x − a).
    const a = r.nz(-6, 6);
    const inner = polyText(-a, 1);
    if (r.next() < 0.5) {
      const opts = [`x ≥ ${sgn(a)}`, `x > ${sgn(a)}`, `x ≥ ${sgn(-a)}`, N.allReal];
      return pickPart(r, opts, 0, [
        { id: "rootZeroExcluded", at: 1, vars: { a: sgn(a), v: opts[0] } },
        { id: "domainSignFlipped", at: 2, vars: { w: `${inner} ≥ 0 → x ≥ ${sgn(a)}`, v: opts[0] } },
      ], fill(N.domainOf, { f: `√(${inner})` }), [`${polyStr1(-a)} \\ge 0`, `x \\ge ${a}`]);
    }
    const opts = [`x ≠ ${sgn(a)}`, `x ≠ ${sgn(-a)}`, "x ≠ 0", N.allReal];
    return pickPart(r, opts, 0, [{ id: "domainSignFlipped", at: 1, vars: { w: `${inner} ≠ 0 → x ≠ ${sgn(a)}`, v: opts[0] } }],
      fill(N.domainOf, { f: `1/(${inner})` }), [`${polyStr1(-a)} \\ne 0`, `x \\ne ${a}`]);
  }
  if (kind <= 5) {
    if (r.next() < 0.6) {
      // Extrema of a zigzag through x = −6, −2, 2, 6: a peak at −2 below the end at 6, a dip at 2 above the end at −6.
      const y1 = r.int(1, 3);
      const y3 = r.int(y1 + 1, 6);
      const y0 = r.int(-6, -3);
      const y2 = r.int(y0 + 1, 0);
      const g = graphSvg([[-6, y0], [-2, y1], [2, y2], [6, y3]], { lo: -6, hi: 6, ends: true });
      const pic = picOf(g);
      if (r.next() < 0.5)
        return numQ(N.relMax, y1, [["extremumXForY", -2, { at: "−2", y: sgn(y1) }], ["relativeForAbsolute", y3, { w: N.relWhy }]], [`f(-2) = ${y1}`], pic);
      return numQ(N.absMin, y0, [["extremumXForY", -6, { at: "−6", y: sgn(y0) }], ["relativeForAbsolute", y2, { w: N.absWhy }]], [`f(-6) = ${y0}`], pic);
    }
    // Where f is positive or negative: zeros at z1 < z2, a hump between them.
    const [z1, z2] = [r.int(-4, -1), r.int(1, 4)];
    const top = r.int(z1 + 1, z2 - 1);
    const g = graphSvg([[-6, -r.int(2, 5)], [z1, 0], [top, r.int(2, 5)], [z2, 0], [6, -r.int(2, 5)]], { lo: -6, hi: 6, ends: true });
    const inner = `${sgn(z1)} < x < ${sgn(z2)}`;
    const outer = fill(N.orText, { a: `x < ${sgn(z1)}`, b: `x > ${sgn(z2)}` });
    const pos = r.next() < 0.5;
    const opts = pos ? [inner, outer, `−6 < x < ${sgn(top)}`, `${sgn(top)} < x < 6`] : [outer, inner, `${sgn(top)} < x < 6`, `−6 < x < ${sgn(top)}`];
    const traps = [{ id: "signIntervalsSwapped" as const, at: 1, vars: { v: opts[0] } }, ...(pos ? [{ id: "increasingForPositive" as const, at: 2, vars: { v: opts[0] } }] : [])];
    return { ...pickPart(r, opts, 0, traps, pos ? N.posQ : N.negQ, [`f(${z1}) = f(${z2}) = 0`]), pic: picOf(g) };
  }
  // A new setting: the domain of a function that counts trays or passengers.
  const bus = r.next() < 0.5;
  const n = bus ? r.pick([30, 40, 50]) : r.pick([6, 8, 10, 12]);
  const [p, s0] = bus ? [r.pick([2, 3, 5]), 0] : [r.pick([4, 5, 6]), r.pick([10, 15, 20])];
  const opts = [fill(N.wholeTo, { n }), fill(N.allTo, { n }), fill(N.wholeFromTo, { lo: s0, hi: p * n + s0 }), N.wholeUp];
  return pickPart(r, opts, 0, [
    { id: "domainNotWhole", at: 1, vars: { v: opts[0] } },
    { id: "domainRangeSwapped", at: 2 },
  ], fill(bus ? N.busQ : N.ovenQ, { n, p, s: s0 }), [`0 \\le ${bus ? "k" : "n"} \\le ${n}`]);
}

/** x − a in TeX. */
const polyStr1 = (c: number) => (c ? `x ${c < 0 ? "-" : "+"} ${Math.abs(c)}` : "x");

export default gen;
