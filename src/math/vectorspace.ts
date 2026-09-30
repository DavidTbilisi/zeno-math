// Vector spaces with exact fractions: span and linear independence, the four fundamental
// subspaces (rank–nullity), coordinates in a basis, Gram–Schmidt, and eigenvalues with their
// eigenspaces (diagonalisation). Vectors in ℝ² and ℝ³ also get a picture.
import { Frac } from "./fraction";
import type { RenderedSvg } from "./latex";
import { gaussJordan, lines, MatrixError, parseMatrix, stepLines, texM, type Mat } from "./matrix";
import { axes, C, compose, fill, lbl, makeFrame, r2, type Caption } from "./chart";

export type SpaceOp = "span" | "subspaces" | "coords" | "gram" | "eigen";
export const SPACE_OPS: SpaceOp[] = ["span", "subspaces", "coords", "gram", "eigen"];
export const SPACE_LABELS: Record<SpaceOp, string> = {
  span: "span{v₁, …, vₖ}",
  subspaces: "C(A), N(A), R(A)",
  coords: "[w]_B",
  gram: "Gram–Schmidt",
  eigen: "Av = λv",
};

/** Vectors are the columns of A; w is the vector for coordinates. */
export type SpaceSpec = { type: "space"; op: SpaceOp; A: string[][]; w: string[]; steps: boolean };

export type SpaceWords = {
  independent: string;
  dependent: string;
  spansAll: string;
  notSpan: string;
  rankNullity: string;
  coords: string;
  gramHint: string;
  gramDropped: string;
  eigenHint: string;
  diagonalizable: string;
  notDiagonalizable: string;
  otherRoots: string;
};

export const SPACE_PRESETS: { op: SpaceOp; label: string; A: string[][]; w?: string[] }[] = [
  { op: "span", label: "ℝ²: independent", A: [["2", "1"], ["1", "3"]] },
  { op: "span", label: "ℝ³: 3 vectors in a plane", A: [["1", "0", "2"], ["0", "1", "3"], ["1", "1", "5"]] },
  { op: "span", label: "ℝ³: a line", A: [["1", "-2"], ["2", "-4"], ["1", "-2"]] },
  { op: "subspaces", label: "3×4, rank 2", A: [["1", "2", "0", "1"], ["2", "4", "1", "4"], ["3", "6", "1", "5"]] },
  { op: "coords", label: "[w]_B in ℝ²", A: [["2", "1"], ["1", "2"]], w: ["4", "5"] },
  { op: "coords", label: "[w]_B in ℝ³", A: [["1", "1", "0"], ["0", "1", "1"], ["1", "0", "1"]], w: ["2", "3", "5"] },
  { op: "gram", label: "Gram–Schmidt ℝ²", A: [["3", "2"], ["1", "2"]] },
  { op: "gram", label: "Gram–Schmidt ℝ³", A: [["1", "1", "0"], ["1", "0", "1"], ["0", "1", "1"]] },
  { op: "eigen", label: "2×2: λ = 5, 2", A: [["4", "1"], ["2", "3"]] },
  { op: "eigen", label: "3×3: repeated λ", A: [["2", "0", "0"], ["0", "3", "4"], ["0", "4", "9"]] },
  { op: "eigen", label: "Not diagonalisable", A: [["2", "1"], ["0", "2"]] },
  { op: "eigen", label: "Rotation: complex λ", A: [["0", "-1"], ["1", "0"]] },
];

// ---------- exact helpers ----------

const cols = (A: Mat): Frac[][] => A[0].map((_, j) => A.map((r) => r[j]));
const colTex = (v: Frac[]) => texM(v.map((x) => [x]));
const rowTex = (v: Frac[]) => `\\begin{pmatrix} ${v.map((x) => x.tex()).join(" & ")} \\end{pmatrix}`;
const spanTex = (vs: string[]) => (vs.length ? `\\operatorname{span}\\left\\{ ${vs.join(",\\ ")} \\right\\}` : `\\{\\mathbf{0}\\}`);
const dot = (a: Frac[], b: Frac[]) => a.reduce((s, x, i) => s.add(x.mul(b[i])), Frac.ZERO);
const scale = (v: Frac[], k: Frac) => v.map((x) => x.mul(k));
const sub = (a: Frac[], b: Frac[]) => a.map((x, i) => x.sub(b[i]));
const isZeroV = (v: Frac[]) => v.every((x) => x.isZero());
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
/** Multiply a vector by the lcm of its denominators (and divide by the gcd) — a nicer multiple. */
function integral(v: Frac[]): Frac[] {
  const l = v.reduce((acc, x) => (acc * x.d) / gcd(acc, x.d), 1);
  const ints = v.map((x) => (x.n * l) / x.d);
  const g = ints.reduce((acc, x) => gcd(acc, x), 0) || 1;
  const sign = (ints.find((x) => x !== 0) ?? 1) < 0 ? -1 : 1;
  return ints.map((x) => new Frac((sign * x) / g));
}
/** c · body with 1 and −1 implicit. */
const coefTex = (c: Frac, body: string) => (c.isOne() ? body : c.n === -1 && c.d === 1 ? `-${body}` : `${c.tex()}\\,${body}`);
const sumTex = (terms: string[]) => terms.filter(Boolean).join(" + ").replace(/\+ -/g, "- ") || "0";

/** Basis of the null space from a reduced row echelon form. */
function nullBasis(R: Mat, pivots: number[], n: number): Frac[][] {
  const free = [...Array(n).keys()].filter((c) => !pivots.includes(c));
  return free.map((f) => {
    const x = Array.from({ length: n }, (_, c) => (c === f ? Frac.ONE : Frac.ZERO));
    pivots.forEach((p, i) => (x[p] = R[i][f].neg()));
    return integral(x);
  });
}

/** √q as TeX, simplified (√(8/9) = 2√2/3). */
function sqrtTex(q: Frac): { tex: string; inv: string; value: number } {
  const N = q.n * q.d;
  let a = 1;
  let b = N;
  for (let k = 2; k * k <= b; k++) while (b % (k * k) === 0) (b /= k * k), (a *= k);
  const radical = (c: Frac) =>
    b === 1 ? c.tex() : c.isOne() ? `\\sqrt{${b}}` : c.d === 1 ? `${c.n}\\sqrt{${b}}` : `\\frac{${c.n === 1 ? "" : c.n}\\sqrt{${b}}}{${c.d}}`;
  // √q = (a/d)·√b, and 1/√q = d/(a√b) = (d/(ab))·√b with a rational denominator.
  return { tex: radical(new Frac(a, q.d)), inv: radical(new Frac(q.d, a * b)), value: Math.sqrt(q.toNumber()) };
}

// ---------- polynomials (for eigenvalues) ----------

type Poly = Frac[]; // ascending

/** Characteristic polynomial det(λI − A) by Faddeev–LeVerrier (exact). */
function charPoly(A: Mat): Poly {
  const n = A.length;
  const c: Frac[] = Array(n + 1).fill(Frac.ZERO);
  c[n] = Frac.ONE;
  let M: Mat = A.map((r) => r.map(() => Frac.ZERO));
  for (let k = 1; k <= n; k++) {
    const AM = A.map((row) => M[0].map((_, j) => row.reduce((s, x, t) => s.add(x.mul(M[t][j])), Frac.ZERO)));
    M = AM.map((row, i) => row.map((x, j) => x.add(i === j ? c[n - k + 1] : Frac.ZERO)));
    const AMk = A.map((row) => M[0].map((_, j) => row.reduce((s, x, t) => s.add(x.mul(M[t][j])), Frac.ZERO)));
    const tr = AMk.reduce((s, row, i) => s.add(row[i]), Frac.ZERO);
    c[n - k] = tr.neg().div(new Frac(k));
  }
  return c;
}

const evalP = (p: Poly, x: Frac) => p.reduceRight((acc, c) => acc.mul(x).add(c), Frac.ZERO);
function deflate(p: Poly, r: Frac): Poly {
  const out: Frac[] = Array(p.length - 1).fill(Frac.ZERO);
  let carry = Frac.ZERO;
  for (let k = p.length - 1; k >= 1; k--) {
    carry = p[k].add(carry.mul(r));
    out[k - 1] = carry;
  }
  return out;
}
const divisors = (n: number) => {
  const d: number[] = [];
  for (let i = 1; i <= Math.min(Math.abs(n), 100000); i++) if (n % i === 0) d.push(i);
  return d;
};
/** Rational roots with multiplicity; the leftover factor has no rational roots. */
function rationalRoots(p0: Poly): { roots: { r: Frac; m: number }[]; rest: Poly } {
  let p = p0.slice();
  const roots: { r: Frac; m: number }[] = [];
  const push = (r: Frac) => {
    const e = roots.find((x) => x.r.sub(r).isZero());
    if (e) e.m++;
    else roots.push({ r, m: 1 });
  };
  while (p.length > 1) {
    if (p[0].isZero()) {
      push(Frac.ZERO);
      p = p.slice(1);
      continue;
    }
    const l = p.reduce((acc, x) => (acc * x.d) / gcd(acc, x.d), 1);
    const ints = p.map((x) => (x.n * l) / x.d);
    let found: Frac | null = null;
    search: for (const a of divisors(ints[0]))
      for (const b of divisors(ints[ints.length - 1]))
        for (const s of [1, -1]) {
          const cand = new Frac(s * a, b);
          if (evalP(p, cand).isZero()) {
            found = cand;
            break search;
          }
        }
    if (!found) break;
    push(found);
    p = deflate(p, found);
  }
  roots.sort((a, b) => b.r.toNumber() - a.r.toNumber());
  return { roots, rest: p };
}
/** Numeric roots of a leftover polynomial (Durand–Kerner), as TeX. */
function numericRoots(p: Poly): string[] {
  const n = p.length - 1;
  if (n < 1) return [];
  const a = p.map((x) => x.toNumber() / p[n].toNumber());
  let z: [number, number][] = Array.from({ length: n }, (_, k) => [Math.cos(0.4 + (2 * Math.PI * k) / n) * 1.3, Math.sin(0.4 + (2 * Math.PI * k) / n) * 1.3]);
  const mulC = (u: [number, number], v: [number, number]): [number, number] => [u[0] * v[0] - u[1] * v[1], u[0] * v[1] + u[1] * v[0]];
  const divC = (u: [number, number], v: [number, number]): [number, number] => {
    const d = v[0] * v[0] + v[1] * v[1];
    return [(u[0] * v[0] + u[1] * v[1]) / d, (u[1] * v[0] - u[0] * v[1]) / d];
  };
  for (let it = 0; it < 500; it++)
    z = z.map((zi, i) => {
      let val: [number, number] = [1, 0];
      for (let k = n - 1; k >= 0; k--) val = [mulC(val, zi)[0] + a[k], mulC(val, zi)[1]];
      let den: [number, number] = [1, 0];
      z.forEach((zj, j) => j !== i && (den = mulC(den, [zi[0] - zj[0], zi[1] - zj[1]])));
      const q = divC(val, den);
      return [zi[0] - q[0], zi[1] - q[1]];
    });
  const f = (x: number) => String(Math.round(x * 1e4) / 1e4);
  return z.map(([re, im]) => (Math.abs(im) < 1e-7 ? f(re) : `${Math.abs(re) < 1e-7 ? "" : f(re) + " "}${im < 0 ? "-" : "+"} ${f(Math.abs(im)) === "1" ? "" : f(Math.abs(im)) + "\\,"}i`.replace(/^\+ /, "")));
}
function polyTexL(p: Poly): string {
  const terms: string[] = [];
  for (let k = p.length - 1; k >= 0; k--) {
    if (p[k].isZero()) continue;
    const pow = k === 0 ? "" : k === 1 ? "\\lambda" : `\\lambda^{${k}}`;
    terms.push(pow ? coefTex(p[k], pow) : p[k].tex());
  }
  return sumTex(terms);
}
const linL = (r: Frac) => (r.isZero() ? "\\lambda" : `(\\lambda ${r.isNeg() ? "+" : "-"} ${r.abs().tex()})`);

// ---------- pictures ----------

type Arrow = { v: number[]; color: string; label: string; dashed?: boolean; from?: number[] };

function arrowSvg(x0: number, y0: number, x1: number, y1: number, color: string, width = 2.6, dashed = false): string {
  const [dx, dy] = [x1 - x0, y1 - y0];
  const L = Math.hypot(dx, dy);
  if (L < 1e-6) return `<circle cx="${r2(x1)}" cy="${r2(y1)}" r="3.5" fill="${color}"/>`;
  const [ux, uy] = [dx / L, dy / L];
  const h = Math.min(12, L * 0.4);
  const [bx, by] = [x1 - ux * h, y1 - uy * h];
  return (
    `<line x1="${r2(x0)}" y1="${r2(y0)}" x2="${r2(bx)}" y2="${r2(by)}" stroke="${color}" stroke-width="${width}" ${dashed ? `stroke-dasharray="6 4"` : ""}/>` +
    `<path d="M${r2(x1)},${r2(y1)}L${r2(bx - uy * h * 0.45)},${r2(by + ux * h * 0.45)}L${r2(bx + uy * h * 0.45)},${r2(by - ux * h * 0.45)}z" fill="${color}"/>`
  );
}

/** ℝ² picture: equal scales, arrows, optional span line/plane, extra SVG in data coordinates. */
function picture2d(arrows: Arrow[], opts: { spanLine?: number[]; spanAll?: boolean; extra?: (sx: (x: number) => number, sy: (y: number) => number) => string; reach?: number } = {}): string {
  const R = Math.max(1, ...arrows.flatMap((a) => a.v.map(Math.abs)), ...arrows.flatMap((a) => (a.from ?? [0, 0]).map((x, i) => Math.abs(x + a.v[i]))), opts.reach ?? 0) * 1.25;
  const size = 330;
  const left = (640 - size) / 2;
  const fr = makeFrame("vs", left, 6, size, size, [-R, R], [-R, R]);
  const parts: string[] = [];
  if (opts.spanAll) parts.push(`<rect x="${fr.left}" y="${fr.top}" width="${size}" height="${size}" fill="#d3f9d8" opacity="0.6"/>`);
  parts.push(axes(fr));
  if (opts.spanLine) {
    const [a, b] = opts.spanLine;
    const L = (R * 3) / Math.hypot(a, b);
    parts.push(`<line clip-path="url(#vs)" x1="${r2(fr.sx(-a * L))}" y1="${r2(fr.sy(-b * L))}" x2="${r2(fr.sx(a * L))}" y2="${r2(fr.sy(b * L))}" stroke="${C.green}" stroke-width="5" opacity="0.35"/>`);
  }
  if (opts.extra) parts.push(`<g clip-path="url(#vs)">${opts.extra(fr.sx, fr.sy)}</g>`);
  for (const a of arrows) {
    const [fx, fy] = a.from ?? [0, 0];
    const [x1, y1] = [fr.sx(fx + a.v[0]), fr.sy(fy + a.v[1])];
    parts.push(arrowSvg(fr.sx(fx), fr.sy(fy), x1, y1, a.color, 2.6, a.dashed));
    if (a.label) {
      const [dx, dy] = [a.v[0], -a.v[1]];
      const L = Math.hypot(dx, dy) || 1;
      parts.push(lbl(x1 + (dx / L) * 12, y1 + (dy / L) * 12 + 5, a.label, a.color, "middle", 14));
    }
  }
  return parts.join("");
}

/** ℝ³ picture in an oblique projection; the span is drawn as a line or a translucent plane. */
function picture3d(arrows: Arrow[], span?: { line?: number[]; plane?: [number[], number[]] }): string {
  const R = Math.max(1, ...arrows.flatMap((a) => a.v.map(Math.abs))) * 1.2;
  const s = 150 / R;
  const [ox, oy] = [320, 190];
  const P = ([x, y, z]: number[]): [number, number] => [ox + s * (-0.55 * x + 1 * y), oy + s * (0.42 * x - 1 * z)];
  const parts: string[] = [];
  const axis = (v: number[], name: string) => {
    const [a, b] = P(v.map((x) => -x * R));
    const [c, d] = P(v.map((x) => x * R));
    parts.push(`<line x1="${r2(a)}" y1="${r2(b)}" x2="${r2(c)}" y2="${r2(d)}" stroke="#adb5bd" stroke-width="1.2"/>`, lbl(c + 6, d + 4, name, C.grey, "start", 13));
  };
  axis([1, 0, 0], "x");
  axis([0, 1, 0], "y");
  axis([0, 0, 1], "z");
  if (span?.plane) {
    // Orthonormalise the two directions so the patch is a nice square.
    const [u0, v0] = span.plane;
    const nu = Math.hypot(...u0);
    const u = u0.map((x) => x / nu);
    const d = v0.reduce((acc, x, i) => acc + x * u[i], 0);
    const w0 = v0.map((x, i) => x - d * u[i]);
    const nw = Math.hypot(...w0);
    const w = w0.map((x) => x / nw);
    const L = R * 0.95;
    const corners = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ].map(([a, b]) => P(u.map((x, i) => L * (a * x + b * w[i]))));
    parts.push(`<polygon points="${corners.map(([a, b]) => `${r2(a)},${r2(b)}`).join(" ")}" fill="#b2f2bb" opacity="0.45" stroke="${C.green}" stroke-width="1"/>`);
  }
  if (span?.line) {
    const n = Math.hypot(...span.line);
    const [a, b] = P(span.line.map((x) => (-x / n) * R * 1.3));
    const [c, d] = P(span.line.map((x) => (x / n) * R * 1.3));
    parts.push(`<line x1="${r2(a)}" y1="${r2(b)}" x2="${r2(c)}" y2="${r2(d)}" stroke="${C.green}" stroke-width="5" opacity="0.35"/>`);
  }
  for (const ar of arrows) {
    const [x0, y0] = P([0, 0, 0]);
    const [x1, y1] = P(ar.v);
    parts.push(arrowSvg(x0, y0, x1, y1, ar.color, 2.6, ar.dashed));
    if (ar.label) parts.push(lbl(x1 + 8, y1 - 6, ar.label, ar.color, "start", 14));
  }
  return parts.join("");
}

const COLORS = [C.blue, C.red, C.purple, C.orange];
const SUBS = ["₁", "₂", "₃", "₄"];
const num = (v: Frac[]) => v.map((x) => x.toNumber());

/** Body for vectors in ℝ² / ℝ³ (null when there's nothing to draw). */
function vectorsPicture(vs: Frac[][], names: string[], span?: { basis: Frac[][] }, colors = COLORS): { body: string; h: number } | null {
  const m = vs[0]?.length ?? 0;
  const arrows: Arrow[] = vs.map((v, i) => ({ v: num(v), color: colors[i % colors.length], label: names[i] }));
  if (m === 2) {
    const rank = span?.basis.length ?? 0;
    return { body: picture2d(arrows, { spanLine: rank === 1 ? num(span!.basis[0]) : undefined, spanAll: rank === 2 }), h: 344 };
  }
  if (m === 3) {
    const b = span?.basis ?? [];
    return { body: picture3d(arrows, b.length === 1 ? { line: num(b[0]) } : b.length === 2 ? { plane: [num(b[0]), num(b[1])] } : undefined), h: 380 };
  }
  return null;
}

function finish(tex: string, pic: { body: string; h: number } | null, captions: Caption[]): RenderedSvg {
  return compose(tex, pic?.body ?? "", pic?.h ?? 0, captions);
}

// ---------- operations ----------

export function renderSpace(spec: SpaceSpec, w: SpaceWords): RenderedSvg {
  const A = parseMatrix(spec.A);
  const m = A.length;
  const n = A[0].length;
  const vs = cols(A);
  const vNames = vs.map((_, i) => `v_{${i + 1}}`);
  const vLabels = vs.map((_, i) => `v${SUBS[i]}`);
  const listTex = vs.map((v, i) => `${vNames[i]} = ${colTex(v)}`).join(",\\quad ");

  switch (spec.op) {
    case "span": {
      const gj = gaussJordan(A, n);
      const r = gj.pivots.length;
      const out = [`& ${listTex}`];
      if (spec.steps) out.push(...stepLines(A, gj.steps, n));
      else out.push(`& ${texM(A)} \\longrightarrow ${texM(gj.result)}`);
      const basis = gj.pivots.map((p) => vNames[p]);
      out.push(`& \\operatorname{rank} = ${r} \\;\\Rightarrow\\; ${spanTex(vNames)} = ${spanTex(basis)}, \\quad \\dim = ${r}`);
      const captions: Caption[] = [];
      if (r === n) captions.push({ text: fill(w.independent, { d: r }), color: C.green });
      else {
        // Every free column gives a dependency relation.
        for (const x of nullBasis(gj.result, gj.pivots, n)) out.push(`& ${sumTex(x.map((c, j) => (c.isZero() ? "" : coefTex(c, vNames[j]))))} = \\mathbf{0}`);
        const free = [...Array(n).keys()].filter((c) => !gj.pivots.includes(c)).map((c) => `v${SUBS[c]}`);
        captions.push({ text: fill(w.dependent, { cols: free.join(", ") }), color: C.red });
      }
      captions.push({ text: fill(r === m ? w.spansAll : w.notSpan, { n: m, d: r }) });
      return finish(lines(out), vectorsPicture(vs, vLabels, { basis: gj.pivots.map((p) => vs[p]) }), captions);
    }

    case "subspaces": {
      const gj = gaussJordan(A, n);
      const r = gj.pivots.length;
      const At = vs; // rows of Aᵀ = columns of A
      const gjT = gaussJordan(At, m);
      const out: string[] = [];
      if (spec.steps) out.push(...stepLines(A, gj.steps, n));
      else out.push(`& A = ${texM(A)} \\longrightarrow ${texM(gj.result)}`);
      const colSpace = gj.pivots.map((p) => colTex(vs[p]));
      const rowSpace = gj.result.slice(0, r).map(rowTex);
      const nul = nullBasis(gj.result, gj.pivots, n).map(colTex);
      const lnul = nullBasis(gjT.result, gjT.pivots, m).map(colTex);
      out.push(
        `C(A) &= ${spanTex(colSpace)} \\subseteq \\mathbb{R}^{${m}}, \\quad \\dim = ${r}`,
        `R(A) &= ${spanTex(rowSpace)} \\subseteq \\mathbb{R}^{${n}}, \\quad \\dim = ${r}`,
        `N(A) &= ${spanTex(nul)} \\subseteq \\mathbb{R}^{${n}}, \\quad \\dim = ${n - r}`,
        `N(A^{T}) &= ${spanTex(lnul)} \\subseteq \\mathbb{R}^{${m}}, \\quad \\dim = ${m - r}`,
        `\\operatorname{rank} A + \\dim N(A) &= ${r} + ${n - r} = ${n}`,
      );
      return finish(lines(out), null, [{ text: fill(w.rankNullity, { r, k: n - r, n }) }]);
    }

    case "coords": {
      if (m !== n) throw new MatrixError("notBasis");
      const wv = spec.w.slice(0, m).map((s) => {
        const f = Frac.parse(s);
        if (!s.trim()) throw new MatrixError("empty");
        if (!f) throw new MatrixError("invalid");
        return f;
      });
      if (wv.length !== m) throw new MatrixError("empty");
      const aug = A.map((row, i) => [...row, wv[i]]);
      const gj = gaussJordan(aug, n);
      if (gj.pivots.length < n) throw new MatrixError("notBasis");
      const c = gj.result.map((row) => row[n]);
      const bNames = vs.map((_, i) => `b_{${i + 1}}`);
      const out = [`& ${vs.map((v, i) => `${bNames[i]} = ${colTex(v)}`).join(",\\quad ")},\\quad w = ${colTex(wv)}`];
      if (spec.steps) out.push(...stepLines(aug, gj.steps, n));
      out.push(`& [w]_B = ${colTex(c)}`, `& w = ${sumTex(c.map((x, i) => (x.isZero() ? "" : coefTex(x, colTex(vs[i])))))}`);
      let pic: { body: string; h: number } | null = null;
      if (m === 2) {
        const [b1, b2] = vs.map(num);
        const [c1, c2] = c.map((x) => x.toNumber());
        const wn = num(wv);
        // Skewed grid of the basis: lines through k·b1 along b2, and through k·b2 along b1.
        const extra = (sx: (x: number) => number, sy: (y: number) => number) => {
          const g: string[] = [];
          for (let k = -8; k <= 8; k++)
            for (const [p, d] of [
              [b1.map((x) => x * k), b2],
              [b2.map((x) => x * k), b1],
            ])
              g.push(`M${r2(sx(p[0] - d[0] * 20))},${r2(sy(p[1] - d[1] * 20))}L${r2(sx(p[0] + d[0] * 20))},${r2(sy(p[1] + d[1] * 20))}`);
          return `<path d="${g.join("")}" stroke="#ffc078" stroke-width="1" fill="none"/>`;
        };
        pic = {
          body: picture2d(
            [
              { v: b1.map((x) => x * c1), color: C.blue, label: "", dashed: true },
              { v: b2.map((x) => x * c2), from: b1.map((x) => x * c1), color: C.red, label: "", dashed: true },
              { v: b1, color: C.blue, label: "b₁" },
              { v: b2, color: C.red, label: "b₂" },
              { v: wn, color: C.green, label: "w" },
            ],
            { extra, reach: Math.max(...wn.map(Math.abs)) },
          ),
          h: 344,
        };
      } else if (m === 3) pic = vectorsPicture([...vs, wv], ["b₁", "b₂", "b₃", "w"], undefined, [C.blue, C.red, C.purple, C.green]);
      return finish(lines(out), pic, [{ text: fill(w.coords, { c: c.map((x) => (x.isInt() ? String(x.n) : `${x.n}/${x.d}`)).join(", ") }) }]);
    }

    case "gram": {
      const us: Frac[][] = [];
      const out = [`& ${listTex}`];
      const captions: Caption[] = [];
      vs.forEach((v, j) => {
        let u = v.slice();
        const parts: string[] = [];
        us.forEach((ui, i) => {
          const k = dot(v, ui).div(dot(ui, ui));
          u = sub(u, scale(ui, k));
          if (!k.isZero()) parts.push(`${k.isNeg() ? "+" : "-"} ${k.abs().isOne() ? "" : k.abs().tex()}${colTex(ui)}`);
        });
        const name = `u_{${j + 1}}`;
        if (j === 0) out.push(`${name} &= v_{1} = ${colTex(u)}`);
        else {
          const formula = us.map((_, i) => `\\frac{v_{${j + 1}} \\cdot u_{${i + 1}}}{u_{${i + 1}} \\cdot u_{${i + 1}}}\\,u_{${i + 1}}`).join(" - ");
          out.push(`${name} &= v_{${j + 1}} - ${formula}`, `&= ${colTex(v)} ${parts.join(" ")} = ${colTex(u)}`);
        }
        if (isZeroV(u)) captions.push({ text: fill(w.gramDropped, { k: j + 1 }), color: C.red });
        else us.push(u);
      });
      const es = us.map((u) => {
        const nm = sqrtTex(dot(u, u));
        return { u, nm };
      });
      out.push(
        ...es.map(({ u, nm }, i) => `e_{${i + 1}} &= \\frac{u_{${i + 1}}}{\\lVert u_{${i + 1}} \\rVert} = ${nm.tex === "1" ? "" : `\\frac{1}{${nm.tex}}${colTex(u)} = ${nm.inv}`}${colTex(u)}`),
      );
      captions.unshift({ text: w.gramHint });
      const unit = es.map(({ u, nm }) => u.map((x) => x.toNumber() / nm.value));
      let pic: { body: string; h: number } | null = null;
      const greys: Arrow[] = vs.map((v, i) => ({ v: num(v), color: "#adb5bd", label: `v${SUBS[i]}`, dashed: true }));
      const eArrows: Arrow[] = unit.map((e, i) => ({ v: e, color: COLORS[i % 4], label: `e${SUBS[i]}` }));
      if (m === 2) pic = { body: picture2d([...greys, ...eArrows]), h: 344 };
      if (m === 3) pic = { body: picture3d([...greys, ...eArrows]), h: 380 };
      return finish(lines(out), pic, captions);
    }

    case "eigen": {
      if (m !== n) throw new MatrixError("square");
      const p = charPoly(A);
      const { roots, rest } = rationalRoots(p);
      const factored = [...roots.map(({ r, m: k }) => (k > 1 ? `${linL(r)}^{${k}}` : linL(r))), rest.length > 1 ? `\\left(${polyTexL(rest)}\\right)` : ""].join("");
      const out = [`& A = ${texM(A)}`, `& \\det(\\lambda I - A) = ${polyTexL(p)}${factored && factored !== polyTexL(p) && roots.length ? ` = ${factored}` : ""}`];
      const eigvecs: { lam: Frac; v: Frac[] }[] = [];
      let geoTotal = 0;
      for (const { r, m: alg } of roots) {
        const M = A.map((row, i) => row.map((x, j) => (i === j ? x.sub(r) : x)));
        const gj = gaussJordan(M, n);
        const basis = nullBasis(gj.result, gj.pivots, n);
        geoTotal += basis.length;
        basis.forEach((v) => eigvecs.push({ lam: r, v }));
        out.push(
          `& \\lambda = ${r.tex()}${alg > 1 ? `\\ (\\times ${alg})` : ""}:\\quad A - ${r.isNeg() ? `(${r.tex()})` : r.tex()}I = ${texM(M)} \\longrightarrow ${texM(gj.result)} \\;\\Rightarrow\\; E_{${r.tex()}} = ${spanTex(basis.map(colTex))}`,
        );
      }
      const captions: Caption[] = [{ text: w.eigenHint }];
      const allRational = rest.length <= 1;
      if (allRational && geoTotal === n) {
        const P = A.map((_, i) => eigvecs.map((e) => e.v[i]));
        const D = eigvecs.map((e, i) => eigvecs.map((_, j) => (i === j ? e.lam : Frac.ZERO)));
        out.push(`& A = PDP^{-1}, \\quad P = ${texM(P)}, \\quad D = ${texM(D)}`);
        captions.push({ text: w.diagonalizable, color: C.green });
      } else if (allRational) captions.push({ text: w.notDiagonalizable, color: C.red });
      if (!allRational) {
        const others = numericRoots(rest);
        out.push(`& \\lambda \\approx ${others.join(",\\ ")}`);
        captions.push({ text: fill(w.otherRoots, { k: others.length }) });
      }

      let pic: { body: string; h: number } | null = null;
      if (n === 2 && eigvecs.length) {
        const An = A.map((r) => r.map((x) => x.toNumber()));
        const apply = (v: number[]) => [An[0][0] * v[0] + An[0][1] * v[1], An[1][0] * v[0] + An[1][1] * v[1]];
        const arrows: Arrow[] = [];
        const lines2 = (sx: (x: number) => number, sy: (y: number) => number) =>
          eigvecs
            .map(({ v }) => {
              const [a, b] = num(v);
              const L = 50 / Math.hypot(a, b);
              return `<line x1="${r2(sx(-a * L))}" y1="${r2(sy(-b * L))}" x2="${r2(sx(a * L))}" y2="${r2(sy(b * L))}" stroke="${C.green}" stroke-width="1.6" stroke-dasharray="7 5"/>`;
            })
            .join("");
        eigvecs.forEach(({ lam, v }, i) => {
          const vn = num(v);
          arrows.push({ v: apply(vn), color: COLORS[i % 4], label: `A·v${SUBS[i]} = ${lam.tex().replace(/\\frac\{(\d+)\}\{(\d+)\}/, "$1/$2")}·v${SUBS[i]}`, dashed: true });
          arrows.push({ v: vn, color: COLORS[i % 4], label: `v${SUBS[i]}` });
        });
        pic = { body: picture2d(arrows, { extra: lines2 }), h: 344 };
      }
      return finish(lines(out), pic, captions);
    }
  }
}

export const DEFAULT_SPACE: SpaceSpec = { type: "space", op: "span", A: SPACE_PRESETS[1].A, w: ["0", "0", "0"], steps: true };
