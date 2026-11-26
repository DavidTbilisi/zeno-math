// Practice: Functions: fg(a) and f⁻¹(a) from formulas, kept four times in ten. #725 added the rest of the unit: easy,
// f(g(a)) or g(f(a)) from a table, f⁻¹(b) from a table, and f(g(x)) picked as a formula; medium, the inverse of a
// linear function picked, whether g is the inverse of f, whether a table's function is invertible, and the domain
// that makes (x − h)² + k invertible; hard, the inverse of (px + q)/(x + s) picked, f⁻¹(b) read off a graph, and, in a
// new setting, the cost of the fuel for a drive as c(l(d)). The order swapped, the functions multiplied, f⁻¹ read
// forwards, the inner constant not scaled, the steps undone in the wrong order, the inverse taken as 1/f, the
// inverse not checked by composing, a repeated output taken as invertible, the wrong turning point and a slip in
// solving for x are named.
import { fill } from "../chart";
import type { Frac } from "../fraction";
import { fr, num, plainFrac, polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { graphSvg, lineIn, sgn } from "../readFunction";
import { pickPart } from "../tTails";
import { polyText } from "../whichTool";

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 4) return more(r, L, r.int(0, 9), w);
  const sol = (src: string) => ({ kind: "functions" as const, spec: { topic: "compose", src } });
  if (L === 1) {
    const [p, q] = [r.nz(-5, 5), r.int(-6, 6)];
    const quad = r.next() < 0.5;
    const [s, t] = [r.nz(-4, 4), r.int(-5, 5)];
    const gs = quad ? polyStr([t, 0, 1]) : polyStr([t, s]);
    const fs = polyStr([q, p]);
    const a = r.int(-4, 4);
    const g = quad ? a * a + t : s * a + t;
    const v = p * g + q;
    return {
      prompt: fill(w.prompts.fnComp, { a }), q: `f(x) = ${T(fs)}, \\quad g(x) = ${T(gs)}`, answer: num(v), show: String(v), plain: String(v), format: "number",
      solution: sol(`f(x) = ${fs}; g(x) = ${gs}; fg(${a})`),
    };
  }
  const a = r.int(-6, 9);
  let fs: string;
  let v: Frac;
  if (L === 2) {
    const [p, q] = [r.pick([2, 3, 4, 5, -2, -3] as const), r.int(-8, 8)];
    fs = polyStr([q, p]);
    v = fr(a - q, p);
  } else {
    // (p x + q)/(x + s): x = (q − s a)/(a − p).
    let p: number, q: number, s: number;
    do [p, q, s] = [r.nz(-4, 4), r.int(-6, 6), r.nz(-5, 5)];
    while (p * s === q || a === p);
    fs = `(${polyStr([q, p])})/(${polyStr([s, 1])})`;
    v = fr(q - s * a, a - p);
  }
  return {
    prompt: fill(w.prompts.fnInv, { a }), q: `f(x) = ${T(fs)}`, answer: num(v.toNumber(), 1e-9, { lowest: true }), show: v.tex(), plain: plainFrac(v),
    format: v.isInt() ? "number" : "fraction", solution: sol(`f(x) = ${fs}; f^-1(${a})`),
  };
};

const place = (body: string) => (x: number, y: number) => `<g transform="translate(${x} ${y})">${body}</g>`;
const par = (v: number) => (v < 0 ? `(${sgn(v)})` : sgn(v));
/** px + q as read. */
const lin = (p: number, q: number) => polyText(q, p);
/** q − sx, the constant first. */
const constFirst = (q: number, c: number, v = "x") => {
  const t = Math.abs(c) === 1 ? v : `${Math.abs(c)}${v}`;
  return q ? `${sgn(q)} ${c < 0 ? "−" : "+"} ${t}` : `${c < 0 ? "−" : ""}${t}`;
};
/** A table of x and one or two functions, in TeX. */
const tableTex = (xs: number[], rows: [string, number[]][]) =>
  `\\begin{array}{c|${"c".repeat(xs.length)}} x & ${xs.join(" & ")} ${rows.map(([n, ys]) => `\\\\ \\hline ${n}(x) & ${ys.join(" & ")}`).join(" ")} \\end{array}`;

function more(r: Rng, L: number, kind: number, w: PracticeWords): Part {
  const P = w.fnsP;
  const numQ = (prompt: string, q: string, v: number, slips: [Trap["id"], number, Record<string, string | number>][], steps: string[], pic?: Part["pic"]): Part => ({
    prompt, q, ...(pic ? { pic } : {}), show: sgn(v), plain: String(v), format: "number", steps,
    answer: { ...num(v), traps: slips.filter(([, x], i) => x !== v && !slips.slice(0, i).some(([, y]) => y === x)).map(([id, x, vars]) => ({ id, a: num(x), vars: { x: sgn(x), v: sgn(v), ...vars } })) },
  });
  if (L === 1) {
    if (kind <= 3) {
      // f(g(a)) or g(f(a)) from a table of both.
      const xs = [0, 1, 2, 3, 4];
      const f = xs.map(() => r.int(0, 4));
      const g = xs.map(() => r.int(0, 4));
      const a = r.int(0, 4);
      const fg = r.next() < 0.5;
      const [inner, outer] = fg ? [g, f] : [f, g];
      const v = outer[inner[a]];
      if (v === inner[outer[a]]) return more(r, L, kind, w);
      const e = fg ? `f(g(${a}))` : `g(f(${a}))`;
      const wk = fg ? `g(${a}) = ${g[a]}, f(${g[a]}) = ${v}` : `f(${a}) = ${f[a]}, g(${f[a]}) = ${v}`;
      return numQ(fill(P.tableComp, { e }), tableTex(xs, [["f", f], ["g", g]]), v,
        [["compositeOrderSwapped", inner[outer[a]], { e, w: wk }], ["compositeAsProduct", f[a] * g[a], { w: wk }]], [wk.replace(/, /, ",\\ ")]);
    }
    if (kind <= 6) {
      // f⁻¹(b) from a table, b also an input so that f(b) can be misread.
      const xs = [1, 2, 3, 4, 5];
      const ys = xs.map((x) => [r.next(), x] as const).concat([6, 7, 8].map((x) => [r.next(), x] as const)).sort((p, q) => p[0] - q[0]).slice(0, 5).map((p) => p[1]);
      const i = xs.findIndex((x, k) => ys[k] <= 5 && ys[k] !== x);
      if (i < 0) return more(r, L, kind, w);
      const b = ys[i];
      return numQ(fill(P.tableInv, { b }), tableTex(xs, [["f", ys]]), xs[i], [["inverseReadForward", ys[b - 1], { b, w: `f(${xs[i]}) = ${b}` }]], [`f(${xs[i]}) = ${b}`, `f^{-1}(${b}) = ${xs[i]}`]);
    }
    // f(g(x)) picked as a formula.
    const [p, q] = [r.pick([2, 3, 4, -2]), r.nz(-5, 5)];
    const [s, t] = [r.pick([2, 3, -1, -2, -3]), r.nz(-5, 5)];
    if (s * q + t === p * t + q) return more(r, L, kind, w);
    const right = lin(p * s, p * t + q);
    const opts = [right, lin(s * p, s * q + t), lin(p * s, t + q), polyText(q * t, p * t + q * s, p * s)];
    const wk = `f(g(x)) = ${sgn(p)}(${lin(s, t)}) ${q < 0 ? "−" : "+"} ${Math.abs(q)} = ${right}`;
    return pickPart(r, opts, 0, [
      { id: "compositeOrderSwapped", at: 1, vars: { e: "f(g(x))", w: wk, v: right } },
      { id: "innerConstantNotScaled", at: 2, vars: { w: wk, v: right } },
      { id: "compositeAsProduct", at: 3, vars: { w: wk, v: right } },
    ], fill(P.findComp, { f: lin(p, q), g: lin(s, t) }), [`f(g(x)) = ${p}(${polyStr([t, s])}) ${q < 0 ? "-" : "+"} ${Math.abs(q)}`, `= ${polyStr([p * t + q, p * s])}`]);
  }
  if (L === 2) {
    const [p, q] = [r.pick([2, 3, 4, 5, -2, -3]), r.nz(-6, 6)];
    const pp = par(p);
    const right = `(x ${q < 0 ? "+" : "−"} ${Math.abs(q)})/${pp}`;
    const solve = `x = ${lin(p, q).replace(/x/, "y")} → y = ${right}`;
    if (kind <= 3) {
      // The inverse of px + q.
      const opts = [right, `x/${pp} ${q < 0 ? "+" : "−"} ${Math.abs(q)}`, `1/(${lin(p, q)})`, `(x ${q < 0 ? "−" : "+"} ${Math.abs(q)})/${pp}`];
      return pickPart(r, opts, 0, [
        { id: "inverseOrderWrong", at: 1, vars: { p: sgn(p), q: sgn(q), v: right } },
        { id: "inverseAsReciprocal", at: 2, vars: { w: solve, v: right } },
        { id: "inverseSolvedWrong", at: 3, vars: { w: solve, v: right } },
      ], fill(P.invLin, { f: lin(p, q) }), [`x = ${polyStr([q, p], "y")}`, `y = \\frac{x ${q < 0 ? "+" : "-"} ${Math.abs(q)}}{${p}}`]);
    }
    if (kind <= 5) {
      // Is g the inverse of f? Checked by f(g(x)).
      const good = r.next() < 0.5;
      const g = good ? right : `x/${pp} ${q < 0 ? "+" : "−"} ${Math.abs(q)}`;
      const off = q * (1 - p);
      const comp = `f(g(x)) = ${sgn(p)}(${g}) ${q < 0 ? "−" : "+"} ${Math.abs(q)} = ${good ? "x" : lin(1, off)}`;
      return pickPart(r, [P.yes, P.no], good ? 0 : 1, good ? [] : [{ id: "inverseNotComposed", at: 0, vars: { w: comp, v: P.no } }],
        fill(P.verify, { f: lin(p, q), g }), [`f(g(x)) = ${good ? "x" : polyStr([off, 1])}`]);
    }
    if (kind <= 7) {
      // Is a table's function invertible? Not when two inputs share an output.
      const xs = [-2, -1, 0, 1, 2];
      const ys = [...new Set(Array.from({ length: 12 }, () => r.int(-5, 9)))].slice(0, 5);
      if (ys.length < 5) return more(r, L, kind, w);
      const good = r.next() < 0.5;
      const [i, j] = [r.int(0, 2), r.int(3, 4)];
      if (!good) ys[j] = ys[i];
      return { ...pickPart(r, [P.yes, P.no], good ? 0 : 1, good ? [] : [{ id: "repeatedOutputInvertible", at: 0, vars: { a: sgn(xs[i]), b: sgn(xs[j]), c: sgn(ys[i]), v: P.no } }],
        P.invertible, [good ? `\\text{${P.allDiffer}}` : `f(${xs[i]}) = f(${xs[j]}) = ${ys[i]}`]), q: tableTex(xs, [["f", ys]]) };
    }
    // The domain that makes (x − h)² + k invertible.
    const [h, k] = [r.nz(-4, 4), r.nz(-5, 5)];
    if (k === h || k === -h) return more(r, L, kind, w);
    const opts = [`x ≥ ${sgn(h)}`, "x ≥ 0", `x ≥ ${sgn(k)}`, `x ≥ ${sgn(-h)}`];
    return pickPart(r, opts, 0, [1, 2, 3].map((at) => ({ id: "restrictWrongPoint" as const, at, vars: { h: sgn(h), v: opts[0] } })),
      fill(P.restrict, { f: `(${lin(1, -h)})² ${k < 0 ? "−" : "+"} ${Math.abs(k)}` }), [`\\text{${fill(P.turnsAt, { h: sgn(h) })}}`]);
  }
  if (kind <= 3) {
    // The inverse of (px + q)/(x + s): x = (q − sy)/(y − p).
    const [p, q, s] = [r.nz(-4, 4), r.int(-6, 6), r.nz(-5, 5)];
    if (p * s === q) return more(r, L, kind, w);
    const right = `(${polyText(q, -s)})/(${lin(1, -p)})`;
    const opts = [right, `(${lin(1, s)})/(${lin(p, q)})`, `(${polyText(-q, s)})/(${lin(1, -p)})`, `(${polyText(q, -s)})/(${lin(1, p)})`];
    const wk = `xy ${s < 0 ? "−" : "+"} ${Math.abs(s)}y = ${lin(p, q)} → x(y ${p < 0 ? "+" : "−"} ${Math.abs(p)}) = ${constFirst(q, -s, "y")}`;
    return pickPart(r, opts, 0, [
      { id: "inverseAsReciprocal", at: 1, vars: { w: wk, v: right } },
      { id: "inverseSolvedWrong", at: 2, vars: { w: wk, v: right } },
    ], fill(P.invRat, { f: `(${lin(p, q)})/(${lin(1, s)})` }), [`y(x ${s < 0 ? "-" : "+"} ${Math.abs(s)}) = ${polyStr([q, p])}`, `x = \\frac{${q} ${s < 0 ? "+" : "-"} ${Math.abs(s)}y}{y ${p < 0 ? "+" : "-"} ${Math.abs(p)}}`]);
  }
  if (kind <= 6) {
    // A new setting: the fuel for a drive, l(d) = d ÷ k litres, costing c(l) = pl + s.
    const k = r.pick([5, 8, 10]);
    const d = k * r.int(4, 12);
    const [p, s] = [r.pick([2, 3, 4]), r.pick([5, 8, 10])];
    const v = (p * d) / k + s;
    const wk = `l(${d}) = ${d} ÷ ${k} = ${d / k}, c(${d / k}) = ${p} × ${d / k} + ${s} = ${v}`;
    return numQ(fill(P.fuel, { k, p, s, d }), "", v, [["compositeOrderSwapped", (p * d + s) / k, { e: `c(l(${d}))`, w: wk }]],
      [`l(${d}) = ${d / k}`, `c(${d / k}) = ${p} \\times ${d / k} + ${s} = ${v}`]);
  }
  // f⁻¹(b) read off the graph of a line (not of slope −1, which is its own inverse).
  for (;;) {
    const [m, c, x0] = [r.pick([-2, 1, 2, 3]), r.int(-3, 3), r.int(-4, 4)];
    const b = m * x0 + c;
    if (Math.abs(b) > 6 || b === x0 || m * b + c === x0) continue;
    const g = graphSvg(lineIn(m, c, -6, 6), { lo: -6, hi: 6 });
    return numQ(fill(P.graphInv, { b: sgn(b) }), "", x0, [["inverseReadForward", m * b + c, { b: sgn(b), w: `f(${sgn(x0)}) = ${sgn(b)}` }]],
      [`f(${x0}) = ${b}`, `f^{-1}(${b}) = ${x0}`], { svg: place(g.body), w: g.w, h: g.h });
  }
}

export default gen;
