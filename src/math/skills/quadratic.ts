// Practice: Quadratic equations. Easy: by factorisation; medium: with a leading coefficient; hard: by the formula.
// #727 added, six times in ten: easy, x² = n² by taking square roots, √x = n, x³ = n³ and ∛x = n; medium,
// a(x − h)² = k by square roots, which equation square roots solve straight away, and the other solution someone
// missed; hard, in new settings, a stone's landing time from h = −5(t + p)(t − q), the greatest profit or its price
// from vertex form, and a garden's width from its area. One root only, the square halved, the root not squared, the
// cube root taken as a third or the cube as three times, a negative cube root's sign dropped, the bracket's sign
// kept, the root taken before dividing, an x term ignored, the other root just negated, a negative root kept, the
// vertex's two numbers swapped and the other side given are slips.
import { fill } from "../chart";
import { sqrtSplit } from "../expr";
import type { Frac } from "../fraction";
import { dp, fr, gcd, num, plainFrac, pmul, polyStr, surdTex, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
import { pickPart } from "../tTails";
import { polyText } from "../whichTool";

const gen: Gen = (r, L, w) => (r.int(0, 9) >= 4 ? more(r, L, w) : classic(r, L, w));

/** The equations from before #727: by factorisation, then by the formula. src/math/whichTool.ts draws its quadratics here. */
export const classic: Gen = (r, L, w) => {
  if (L < 3) {
    let p: number, q: number, a: number, cs: number[];
    let roots: Frac[];
    if (L === 1) {
      do [p, q] = [r.int(-9, 9), r.int(-9, 9)];
      while (p === q);
      a = 1;
      cs = pmul([-p, 1], [-q, 1]);
      roots = [fr(p), fr(q)];
    } else {
      do [a, p, q] = [r.int(2, 3), r.nz(-7, 7), r.int(-6, 6)];
      while (gcd(a, p) !== 1);
      cs = pmul([-p, a], [-q, 1]);
      roots = [fr(p, a), fr(q)];
    }
    const eq = `${polyStr(cs)} = 0`;
    roots.sort((x, y) => x.toNumber() - y.toNumber());
    return {
      prompt: w.prompts.quadratic,
      q: `${T(polyStr(cs))} = 0`,
      answer: { k: "set", vs: roots.map((x) => x.toNumber()), tol: 1e-9 },
      show: roots.map((x) => `x = ${x.tex()}`).join(", \\; "),
      plain: roots.map(plainFrac).join("; "),
      format: "roots",
      solution: { kind: "algebra", spec: { topic: "quadratic", eq, method: "factor" } },
    };
  }
  let b: number, c: number, D: number;
  do [b, c] = [r.int(-8, 8), r.nz(-10, 10)];
  while ((D = b * b - 4 * c) <= 0 || Number.isInteger(Math.sqrt(D)));
  const { out, s } = sqrtSplit(fr(D));
  const eq = `${polyStr([c, b, 1])} = 0`;
  const vs = [(-b - Math.sqrt(D)) / 2, (-b + Math.sqrt(D)) / 2];
  return {
    prompt: w.prompts.quadratic,
    q: `${T(polyStr([c, b, 1]))} = 0`,
    answer: { k: "set", vs, tol: 0.0051 },
    show: `x = ${surdTex(fr(-b, 2), out.div(fr(2)), s).replace(/ [+-] /, " \\pm ")} \\approx ${dp(vs[0], 2)}, \\; ${dp(vs[1], 2)}`,
    plain: vs.map((v) => dp(v, 3)).join("; "),
    format: "roots",
    solution: { kind: "algebra", spec: { topic: "quadratic", eq, method: "formula" } },
  };
};

const m = (v: number) => String(v).replace("-", "−");
const tex = (s: string) => s.replace(/−/g, "-").replace(/²/g, "^2").replace(/³/g, "^3");
const set = (vs: number[]) => ({ k: "set" as const, vs, tol: 1e-9, listed: true });

/** A set of solutions with its slips (each a set of its own), the working shown. */
function rootsPart(e: string, vs: number[], traps: Trap[], steps: string[], prompt: string): Part {
  const sorted = [...vs].sort((x, y) => x - y);
  const key = (u: number[]) => [...u].sort((x, y) => x - y).join(",");
  const seen = new Set([key(sorted)]);
  const kept = traps.filter((t) => t.a.k === "set" && !seen.has(key(t.a.vs)) && seen.add(key(t.a.vs)));
  return {
    prompt, q: tex(e), answer: { k: "set", vs: sorted, tol: 1e-9, listed: true, traps: kept },
    show: sorted.map((v) => `x = ${sgn(v)}`).join(", \\; "), plain: sorted.join("; "), format: "roots", steps,
  };
}

function numPart(prompt: string, v: number, traps: Trap[], steps: string[], q = ""): Part {
  const kept = traps.filter((t, i) => t.a.k === "num" && t.a.v !== v && !traps.slice(0, i).some((u) => u.a.k === "num" && t.a.k === "num" && u.a.v === t.a.v));
  return { prompt, q, answer: { ...num(v), traps: kept }, show: sgn(v), plain: String(v), format: "number", steps };
}

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.quaP;
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });
  if (L === 1) {
    const t = r.pick(["square", "square", "sqrt", "cube", "cbrt"] as const);
    const n = r.int(2, 12);
    if (t === "square") {
      // x² = n², 2x² = 2n² or x² + c = n² + c.
      const v = r.int(0, 2);
      const [a, c] = [v === 1 ? r.pick([2, 3]) : 1, v === 2 ? r.int(1, 9) : 0];
      const e = `${a === 1 ? "" : a}x²${c ? ` + ${c}` : ""} = ${a * n * n + c}`;
      const traps: Trap[] = [{ id: "rootOnlyPositive", a: set([n]), vars: { k: n * n, v: n } }];
      if (a === 1 && !c && n % 2 === 0) traps.push({ id: "halvedNotRoot", a: set([n * n / 2]), vars: { x: n * n / 2, n: n * n, v: n } });
      return rootsPart(e, [-n, n], traps, [...(a > 1 || c ? [`x^2 = ${n * n}`] : []), `x = \\pm\\sqrt{${n * n}} = \\pm ${n}`], w.prompts.quadratic);
    }
    if (t === "sqrt") return numPart(w.prompts.quadratic, n * n, [slip("rootNotSquared", n, { b: n })], [`\\sqrt{x} = ${n} \\Rightarrow x = ${n}^2 = ${n * n}`], `\\sqrt{x} = ${n}`);
    const c = r.int(2, 5);
    if (t === "cbrt") return numPart(w.prompts.quadratic, c ** 3, [slip("cubeAsTripled", 3 * c, { c, v: c ** 3 })], [`\\sqrt[3]{x} = ${c} \\Rightarrow x = ${c}^3 = ${c ** 3}`], `\\sqrt[3]{x} = ${c}`);
    const neg = r.next() < 0.4;
    const k = (neg ? -1 : 1) * c ** 3;
    const v = neg ? -c : c;
    return numPart(w.prompts.quadratic, v, [
      slip("cubeRootAsThird", k / 3, { x: m(Math.round((k / 3) * 100) / 100), k: m(k), v: m(v) }),
      ...(neg ? [slip("cubeNegativeRoot", c, { k: m(k), v: c })] : []),
    ], [`x = \\sqrt[3]{${k}} = ${v}`], `x^3 = ${k}`);
  }
  if (L === 2) {
    const t = r.pick(["shifted", "shifted", "strategy", "other"] as const);
    let h = 0;
    while (!h) h = r.int(-6, 6);
    const k = r.int(1, 7);
    const br = polyText(-h, 1);
    if (t === "shifted") {
      // a(x − h)² = a·k²: divide, take ± the root, undo the shift.
      const a = r.pick([1, 2, 3, 4]);
      const e = `${a === 1 ? "" : a}(${br})² = ${a * k * k}`;
      const roots = [h - k, h + k];
      return rootsPart(e, roots, [
        { id: "rootOnlyPositive", a: set([h + k]), vars: { k: k * k, v: k } },
        { id: "rootShiftSignKept", a: set([-h - k, -h + k]), vars: { b: br, m: k, v: `${m(h - k)}, ${m(h + k)}` } },
        ...(a === 4 ? [{ id: "notDividedFirst" as const, a: set([h - 2 * k, h + 2 * k]), vars: { a, s: k * k, m: k } }] : []),
      ], [...(a > 1 ? [`(${tex(br)})^2 = ${k * k}`] : []), `${tex(br)} = \\pm ${k}`, `x = ${h} \\pm ${k}`], w.prompts.quadratic);
    }
    if (t === "other") {
      // Someone found one solution of (x − h)² = k²: the other comes from the negative root.
      const e = `(${br})² = ${k * k}`;
      return numPart(fill(W.otherQ, { e, x: m(h + k) }), h - k, [slip("otherRootNegated", -(h + k), { x: m(h + k), b: br, m: k, v: m(h - k) })],
        [`${tex(br)} = -${k}`, `x = ${h - k}`]);
    }
    // Which one square roots solve straight away: no x term, only x² (or one bracket) squared.
    const a = r.pick([1, 2, 3]);
    const right = r.next() < 0.5 ? `${a === 1 ? "" : a}x² − ${a * k * k} = 0` : `(${br})² = ${k * k}`;
    const b = 2 * r.int(1, 4);
    const xs = `x² + ${b}x = ${r.int(5, 20)}`;
    const ys = `x² − ${b + 1}x + ${r.int(2, 6)} = 0`;
    const opts = [right, xs, ys];
    return pickPart(r, opts, 0, [
      { id: "linearTermIgnored", at: 1, vars: { e: xs, v: right } },
      { id: "linearTermIgnored", at: 2, vars: { e: ys, v: right } },
    ], W.strategyQ, [`\\text{${fill(W.strategyWhy, { e: right })}}`]);
  }
  // Hard: new settings.
  const t = r.pick(["stone", "profit", "garden"] as const);
  if (t === "stone") {
    const [p, q] = [r.int(1, 3), r.int(2, 6)];
    return numPart(fill(W.stoneQ, { p, q }), q, [slip("negativeRootKept", -p, { x: m(-p), q: W.aTime, v: q })],
      [`-5(t + ${p})(t - ${q}) = 0`, `t = -${p} \\text{ or } t = ${q}`, `t = ${q}`]);
  }
  if (t === "profit") {
    const a = r.pick([1, 2, 5]);
    const h = r.int(8, 30);
    const k = 10 * r.int(10, 90);
    const price = r.next() < 0.5;
    const e = `P(x) = −${a === 1 ? "" : a}(x − ${h})² + ${k}`;
    return numPart(fill(price ? W.priceQ : W.profitQ, { e }), price ? h : k, [
      slip("vertexPartSwapped", price ? k : h, { h, k, xw: W.price, yw: W.profit, v: price ? h : k }),
    ], [`\\text{${fill(W.vertexAt, { h, k })}}`]);
  }
  // A garden n m longer than wide with area A: w² + nw − A = 0.
  const wd = r.int(3, 12);
  const n = r.int(2, 8);
  const A = wd * (wd + n);
  return numPart(fill(W.gardenQ, { n, A }), wd, [
    slip("negativeRootKept", -(wd + n), { x: m(-(wd + n)), q: W.aWidth, v: wd }),
    slip("otherSideGiven", wd + n, { x: wd + n, n, v: wd }),
  ], [`w(w + ${n}) = ${A}`, `w^2 + ${n}w - ${A} = 0`, `(w - ${wd})(w + ${wd + n}) = 0`, `w = ${wd}`]);
}

export default gen;
