// Practice: Vectors. #717 added vectors by magnitude and direction. Easy (grade 10): a vector's components from its
// endpoints on a grid, from its length and direction, its direction from its components, its length, and the unit
// vector along it. Medium: two vectors given by length and direction added, as a length or as components, and a plane
// flying in a wind. Hard: a line through two points as A + t(B − A), the point at a given t, and the t of a point on it.
// The endpoints taken the wrong way round, cos and sin swapped, the angle left in the wrong quadrant, the components
// added for the length, the unit vector divided by the components' sum, the lengths added, the second point taken for
// the direction and t read from the point alone are slips.
import { C, fill, FONT, r2 } from "../chart";
import { sqrtSplit } from "../expr";
import type { Frac } from "../fraction";
import { dp, fr, num, plainFrac, surdTex } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

type V2 = [number, number];
const TRIPLE = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [15, 8, 17]] as const;
const rad = (d: number) => (d * Math.PI) / 180;
const tup = (v: (number | string)[]) => `(${v.join("; ")})`;
/** A point or vector as the question writes it. */
const pt = (v: (number | string)[]) => `(${v.join(", ")})`;
const colTex = (v: (number | string)[]) => `\\begin{pmatrix} ${v.join(" \\\\ ")} \\end{pmatrix}`;
/** An arrow from A to B on a square grid, with A and B named; y up. */
function arrowPic(A: V2, B: V2, names: [string, string] = ["A", "B"]) {
  const xs = [A[0], B[0], 0];
  const ys = [A[1], B[1], 0];
  const [x0, x1, y0, y1] = [Math.min(...xs) - 1, Math.max(...xs) + 1, Math.min(...ys) - 1, Math.max(...ys) + 1];
  const cell = Math.min(22, 220 / Math.max(x1 - x0, y1 - y0));
  const W = (x1 - x0) * cell + 20;
  const H = (y1 - y0) * cell + 20;
  const at = (p: V2, x: number, y: number): V2 => [x + 10 + (p[0] - x0) * cell, y + 10 + (y1 - p[1]) * cell];
  return {
    w: W, h: H,
    svg: (x: number, y: number) => {
      const out: string[] = [];
      for (let c = x0; c <= x1; c++) {
        const [px] = at([c, 0], x, y);
        out.push(`<line x1="${r2(px)}" y1="${r2(y + 10)}" x2="${r2(px)}" y2="${r2(y + H - 10)}" stroke="${c === 0 ? "#868e96" : "#e9ecef"}" stroke-width="${c === 0 ? 1.4 : 1}"/>`);
      }
      for (let c = y0; c <= y1; c++) {
        const [, py] = at([0, c], x, y);
        out.push(`<line x1="${r2(x + 10)}" y1="${r2(py)}" x2="${r2(x + W - 10)}" y2="${r2(py)}" stroke="${c === 0 ? "#868e96" : "#e9ecef"}" stroke-width="${c === 0 ? 1.4 : 1}"/>`);
      }
      const [a, b] = [at(A, x, y), at(B, x, y)];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const head = (k: number) => `${r2(b[0] - 11 * Math.cos(ang + k))},${r2(b[1] - 11 * Math.sin(ang + k))}`;
      out.push(`<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="${C.blue}" stroke-width="2.5"/>`);
      out.push(`<polygon points="${r2(b[0])},${r2(b[1])} ${head(0.4)} ${head(-0.4)}" fill="${C.blue}"/>`);
      for (const [p, n] of [[a, names[0]], [b, names[1]]] as const)
        if (n) out.push(`<circle cx="${r2(p[0])}" cy="${r2(p[1])}" r="3" fill="#1e1e1e"/><text x="${r2(p[0] + 6)}" y="${r2(p[1] - 6)}" ${FONT} font-size="13" font-weight="700" fill="#1e1e1e">${n}</text>`);
      return `<g>${out.join("")}</g>`;
    },
  };
}
/** A tuple answer with its slips, each kept only if it differs from the answer. */
function tuplePart(prompt: string, vs: number[], tol: number, plain: string, show: string, traps: Trap[], steps: string[], pic?: Part["pic"]): Part {
  const kept = traps.filter((t, i) => t.a.k === "tuple" && t.a.vs.some((x, j) => Math.abs(x - vs[j]) > Math.max(tol * 10, 2e-6)) && !traps.slice(0, i).some((u) => JSON.stringify(u.a) === JSON.stringify(t.a)));
  return { prompt, q: "", pic, answer: { k: "tuple", vs, tol, traps: kept }, show, plain, format: vs.length === 3 ? "xyz" : "vector", steps };
}
const tslip = (id: Trap["id"], vs: number[], tol: number, vars: Record<string, string | number>): Trap => ({ id, a: { k: "tuple", vs, tol }, vars });
const nslip = (id: Trap["id"], v: number, tol: number, vars: Record<string, string | number>): Trap => ({ id, a: num(v, tol), vars });
const keepNum = (v: number, tol: number, traps: Trap[]) => traps.filter((t) => t.a.k === "num" && Math.abs(t.a.v - v) > Math.max(2 * tol, 0.02));
const fracs = (fs: Frac[]) => tup(fs.map(plainFrac));

/** The kinds #717 added. */
function more(r: Rng, L: 1 | 2 | 3, kind: number, w: PracticeWords): Part {
  const W = w.vecP;
  if (L === 1 && kind === 5) {
    // Components from the endpoints: AB = B − A.
    let A: V2, B: V2;
    do [A, B] = [[r.int(-4, 4), r.int(-4, 4)], [r.int(-4, 4), r.int(-4, 4)]];
    while (A[0] === B[0] || A[1] === B[1]);
    const v = [B[0] - A[0], B[1] - A[1]];
    return tuplePart(fill(W.fromEnds, { a: pt(A), b: pt(B) }), v, 1e-9, tup(v), colTex(v),
      [tslip("componentsReversed", [-v[0], -v[1]], 1e-9, { x: tup([-v[0], -v[1]]), v: tup(v) })],
      [`\\vec{AB} = B - A = (${B[0]} - (${A[0]}),\\; ${B[1]} - (${A[1]})) = (${v[0]}, ${v[1]})`], arrowPic(A, B));
  }
  if (L === 1 && kind === 6) {
    // Components from length and direction: (m cos θ, m sin θ), θ anticlockwise from the x-axis.
    const m = r.int(3, 20);
    let t = 5 * r.int(2, 70);
    while (t % 90 === 0) t = 5 * r.int(2, 70);
    const v = [m * Math.cos(rad(t)), m * Math.sin(rad(t))];
    const swapped = [m * Math.sin(rad(t)), m * Math.cos(rad(t))];
    const p = (u: number[]) => tup(u.map((x) => dp(x, 2)));
    return tuplePart(fill(W.fromPolar, { m, t }), v, 0.0051, p(v), colTex(v.map((x) => dp(x, 2))),
      [tslip("vecSinCosSwapped", swapped, 0.0051, { x: p(swapped), v: p(v) })],
      [`x = ${m}\\cos ${t}^\\circ \\approx ${dp(v[0], 2)}`, `y = ${m}\\sin ${t}^\\circ \\approx ${dp(v[1], 2)}`]);
  }
  if (L === 1 && kind === 7) {
    // The direction from the components, 0° to 360°: tan⁻¹(y/x) put in the right quadrant.
    let x: number, y: number;
    do [x, y] = [r.nz(-9, 9), r.nz(-9, 9)];
    while (x > 0 && y > 0 && r.next() < 0.8);
    const t = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    const raw = (Math.atan(y / x) * 180) / Math.PI;
    return {
      prompt: fill(W.direction, { v: pt([x, y]) }), q: "", pic: arrowPic([0, 0], [x, y], ["", ""]),
      answer: { k: "num", v: t, tol: 0.0051, units: ["°"], traps: keepNum(t, 0.0051, [nslip("directionQuadrant", raw, 0.0051, { x: dp(raw, 2), v: dp(t, 2) })]) },
      show: `${dp(t, 2)}^\\circ`, plain: dp(t, 2), format: "dp2",
      steps: [`\\tan^{-1}\\frac{${y}}{${x}} \\approx ${dp(raw, 2)}^\\circ`, `(${x}, ${y})\\text{: } \\theta \\approx ${dp(t, 2)}^\\circ`],
    };
  }
  const [a, b, h] = r.pick(TRIPLE);
  const [sx, sy] = [r.pick([1, -1]), r.pick([1, -1])];
  const [x, y] = [sx * a, sy * b];
  if (L === 1 && kind === 8)
    // The length of a vector from its components: √(x² + y²).
    return {
      prompt: fill(W.length2, { v: pt([x, y]) }), q: "", pic: arrowPic([0, 0], [x, y], ["", ""]),
      answer: { ...num(h), traps: [nslip("vecComponentsAdded", a + b, 1e-9, { x: a + b, v: h })] },
      show: String(h), plain: String(h), format: "number", steps: [`|\\mathbf{v}| = \\sqrt{(${x})^2 + (${y})^2} = \\sqrt{${h * h}} = ${h}`],
    };
  if (L === 1) {
    // The unit vector along v: v ÷ |v|.
    const u = [fr(x, h), fr(y, h)];
    const bad = [fr(x, a + b), fr(y, a + b)];
    return tuplePart(fill(W.unit, { v: pt([x, y]) }), u.map((f) => f.toNumber()), 1e-9, fracs(u), colTex(u.map((f) => f.tex())),
      [tslip("unitBySum", bad.map((f) => f.toNumber()), 1e-9, { x: fracs(bad), v: fracs(u), s: a + b, h })],
      [`|\\mathbf{v}| = \\sqrt{(${x})^2 + (${y})^2} = ${h}`, `\\hat{\\mathbf{v}} = \\frac{1}{${h}}(${x}, ${y}) = (${u[0].tex()}, ${u[1].tex()})`]);
  }
  if (L === 2 && kind <= 7) {
    // Two vectors by length and direction added: components first, then the length (or the components).
    const [m1, m2] = [r.int(3, 15), r.int(3, 15)];
    const t1 = 5 * r.int(0, 71);
    let t2 = 5 * r.int(0, 71);
    while (Math.abs(((t2 - t1 + 540) % 360) - 180) < 25 || Math.abs(((t2 - t1 + 540) % 360) - 180) > 160) t2 = 5 * r.int(0, 71);
    const s = [m1 * Math.cos(rad(t1)) + m2 * Math.cos(rad(t2)), m1 * Math.sin(rad(t1)) + m2 * Math.sin(rad(t2))];
    const p = (u: number[]) => tup(u.map((q) => dp(q, 2)));
    const steps = [`\\mathbf{a} = (${m1}\\cos ${t1}^\\circ, ${m1}\\sin ${t1}^\\circ),\\; \\mathbf{b} = (${m2}\\cos ${t2}^\\circ, ${m2}\\sin ${t2}^\\circ)`, `\\mathbf{a} + \\mathbf{b} \\approx (${dp(s[0], 2)}, ${dp(s[1], 2)})`];
    if (kind === 7) {
      const sw = [m1 * Math.sin(rad(t1)) + m2 * Math.sin(rad(t2)), m1 * Math.cos(rad(t1)) + m2 * Math.cos(rad(t2))];
      return tuplePart(fill(W.addComp, { m: m1, t: t1, n: m2, u: t2 }), s, 0.0051, p(s), colTex(s.map((q) => dp(q, 2))), [tslip("vecSinCosSwapped", sw, 0.0051, { x: p(sw), v: p(s) })], steps);
    }
    const v = Math.hypot(s[0], s[1]);
    return {
      prompt: fill(W.addLen, { m: m1, t: t1, n: m2, u: t2 }), q: "",
      answer: { ...num(v, 0.0051), traps: keepNum(v, 0.0051, [nslip("magnitudesAdded", m1 + m2, 0.0051, { x: m1 + m2, m: m1, n: m2, v: dp(v, 2) })]) },
      show: `\\approx ${dp(v, 2)}`, plain: dp(v, 2), format: "dp2", steps: [...steps, `|\\mathbf{a} + \\mathbf{b}| \\approx ${dp(v, 2)}`],
    };
  }
  if (L === 2) {
    // A new setting: a plane's heading and a wind, added as vectors; bearings clockwise from north.
    const sp = 10 * r.int(15, 50);
    const wind = 5 * r.int(4, 16);
    const hd = 5 * r.int(0, 71);
    let to = 5 * r.int(0, 71);
    while (Math.abs(((to - hd + 540) % 360) - 180) < 30 || Math.abs(((to - hd + 540) % 360) - 180) > 150) to = 5 * r.int(0, 71);
    const g = [sp * Math.sin(rad(hd)) + wind * Math.sin(rad(to)), sp * Math.cos(rad(hd)) + wind * Math.cos(rad(to))];
    const v = Math.hypot(g[0], g[1]);
    const three = (n: number) => String(n).padStart(3, "0");
    return {
      prompt: fill(W.plane, { s: sp, h: three(hd), w: wind, t: three(to) }), q: "",
      answer: { k: "num", v, tol: 0.0051, units: ["km/h"], traps: keepNum(v, 0.0051, [nslip("magnitudesAdded", sp + wind, 0.0051, { x: sp + wind, m: sp, n: wind, v: dp(v, 2) })]) },
      show: `\\approx ${dp(v, 2)}\\,\\mathrm{km/h}`, plain: dp(v, 2), format: "dp2",
      steps: [`\\text{east: } ${sp}\\sin ${hd}^\\circ + ${wind}\\sin ${to}^\\circ \\approx ${dp(g[0], 2)}`, `\\text{north: } ${sp}\\cos ${hd}^\\circ + ${wind}\\cos ${to}^\\circ \\approx ${dp(g[1], 2)}`, `\\sqrt{${dp(g[0], 2)}^2 + ${dp(g[1], 2)}^2} \\approx ${dp(v, 2)}`],
    };
  }
  // A line through A and B: r = A + t(B − A).
  const A = [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)];
  let d: number[];
  do d = [r.int(-4, 4), r.int(-4, 4), r.int(-4, 4)];
  while (d.filter(Boolean).length < 2);
  const B = A.map((q, i) => q + d[i]);
  if (kind <= 7) {
    const t = r.pick([2, 3, -1, -2, 4]);
    const P = A.map((q, i) => q + t * d[i]);
    const bad = A.map((q, i) => q + t * B[i]);
    return tuplePart(fill(W.lineAt, { a: pt(A), b: pt(B), t }), P, 1e-9, tup(P), colTex(P),
      [tslip("directionAsPoint", bad, 1e-9, { x: tup(bad), v: tup(P), d: tup(d) })],
      [`\\mathbf{d} = B - A = (${d.join(", ")})`, `\\mathbf{r} = (${A.join(", ")}) + ${t}(${d.join(", ")}) = (${P.join(", ")})`]);
  }
  const t = r.pick([2, 3, 4, -1, -2, -3]);
  const P = A.map((q, i) => q + t * d[i]);
  const i = d.findIndex((q) => q !== 0 && P[d.indexOf(q)] !== 0);
  const k = i < 0 ? d.findIndex((q) => q !== 0) : i;
  const only = P[k] / d[k];
  return {
    prompt: fill(W.lineT, { a: pt(A), b: pt(B), p: pt(P) }), q: "",
    answer: { ...num(t), traps: Math.abs(only - t) > 1e-6 ? [nslip("tFromPointOnly", only, 1e-9, { x: dp(only, 2), v: t })] : [] },
    show: String(t), plain: String(t), format: "number",
    steps: [`\\mathbf{d} = B - A = (${d.join(", ")})`, `P - A = (${P.map((q, j) => q - A[j]).join(", ")}) = ${t}\\,\\mathbf{d}`, `t = ${t}`],
  };
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, 9);
  if (extra >= 5) return more(r, L, extra, w);
  return old(r, L, w);
};

/** The kinds the skill had before #717. */
const old: Gen = (r, L, w) => {
  const vec = (n: number, lo: number, hi: number) => Array.from({ length: n }, () => r.int(lo, hi));
  const vs = (v: (number | string)[]) => `(${v.join(", ")})`;
  const col = (v: number[]) => `\\begin{pmatrix} ${v.join(" \\\\ ")} \\end{pmatrix}`;
  const sol = (topic: string, src: string) => ({ kind: "vectors" as const, spec: { topic, src } });
  if (L === 1) {
    const [a, b] = [vec(2, -6, 6), vec(2, -6, 6)];
    const [p, q] = [r.pick([1, 2, 3, -2] as const), r.pick([1, 2, 3, -1, -2, -3] as const)];
    const res = a.map((x, i) => p * x + q * b[i]);
    const k = (c: number, first: boolean) => (Math.abs(c) === 1 ? (c < 0 && first ? "-" : "") : String(first ? c : Math.abs(c)));
    const e = `${k(p, true)}a ${q < 0 ? "-" : "+"} ${k(q, false)}b`;
    return {
      prompt: fill(w.prompts.vecCombo, { a: vs(a), b: vs(b) }),
      q: e.replace(/([ab])/g, "\\mathbf{$1}"),
      answer: { k: "tuple", vs: res, tol: 1e-9 },
      show: col(res),
      plain: `(${res.join("; ")})`,
      format: "vector",
      solution: sol("basics", `a = ${vs(a)}; b = ${vs(b)}; ${e}`),
    };
  }
  if (L === 2) {
    const A = vec(3, -5, 5);
    let d: number[];
    do d = vec(3, -6, 6);
    while (d.filter(Boolean).length < 2);
    const B = A.map((x, i) => x + d[i]);
    const d2 = d.reduce((s, x) => s + x * x, 0);
    const { out, s } = sqrtSplit(fr(d2));
    const v = Math.sqrt(d2);
    return {
      prompt: fill(w.prompts.vecLength, { a: `A${vs(A)}`, b: `B${vs(B)}` }),
      q: "",
      answer: num(v, 1e-9, { surd: true }),
      show: s === 1 ? String(out.n) : `${surdTex(fr(0), out, s)} \\approx ${dp(v, 2)}`,
      plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
      format: "exact",
      solution: sol("basics", `A${vs(A)}; B${vs(B)}`),
    };
  }
  // a = (k, p, q), b = (m, k, n) are perpendicular when k·m + p·k + q·n = 0.
  let p: number, q: number, m: number, n: number;
  do [p, q, m, n] = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5)];
  while (m + p === 0);
  const kv = fr(-q * n, m + p);
  const at = (v: (number | string)[]) => v.map((x) => (x === "k" ? `${kv.n}/${kv.d}` : x));
  return {
    prompt: fill(w.prompts.vecPerp, { a: vs(["k", p, q]), b: vs([m, "k", n]) }),
    q: "",
    answer: num(kv.toNumber(), 1e-9, { lowest: true }),
    show: kv.tex(),
    plain: plainFrac(kv),
    format: "fraction",
    solution: sol("dot", `a = ${vs(at(["k", p, q]))}; b = ${vs(at([m, "k", n]))}`),
  };
};

export default gen;
