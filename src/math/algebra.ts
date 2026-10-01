// School algebra, one line at a time: linear equations ("do the same to both sides", with a balance scale when
// the numbers are small), linear inequalities (the sign flips when dividing by a negative) on a number line,
// expanding brackets with the grid method, factoring quadratics by the ac method, and quadratic equations
// solved four ways — factoring, completing the square (drawn as a square), the formula, and vertex form.
// Arithmetic is exact (fractions), so every step shows what a pupil would write.
import { cell, table, txt } from "./algoArrays";
import { axes, C, compose, curve, fill, lbl, makeFrame, nf, r2, W, type Caption } from "./chart";
import { latexToSvg, type RenderedSvg } from "./latex";

export type AlgebraTopic = "linear" | "inequality" | "expand" | "factor" | "quadratic";
export const ALGEBRA_TOPICS: AlgebraTopic[] = ["linear", "inequality", "expand", "factor", "quadratic"];
export type QuadMethod = "factor" | "square" | "formula" | "vertex";
export const QUAD_METHODS: QuadMethod[] = ["factor", "square", "formula", "vertex"];

export type AlgebraSpec = { topic: AlgebraTopic; eq: string; method: QuadMethod };

export type AlgebraWords = {
  bad: string;
  tooBig: string;
  divX: string;
  power: string;
  oneVar: string;
  notLinear: string;
  notQuadratic: string;
  needEq: string;
  needIneq: string;
  mixed: string;
  needProduct: string;
  tooMany: string;
  intOnly: string;
  upToSquare: string;
  ops: { sub: string; add: string; div: string; mul: string; flip: string; swap: string; both: string; three: string };
  lin: { check: string; every: string; none: string; balance: string };
  ineq: { flipNote: string; result: string; open: string; closed: string; every: string; none: string };
  exp: { grid: string; collect: string; result: string; next: string };
  fac: { gcf: string; pairs: string; found: string; noPair: string; split: string; group: string; result: string; dos: string; square: string; product: string; sum: string; none: string };
  quad: {
    methods: Record<QuadMethod, string>;
    standard: string;
    zero: string;
    disc: string;
    two: string;
    one: string;
    noneReal: string;
    complexHint: string;
    picture: string;
    pictureNeg: string;
    notToScale: string;
    vertex: string;
    vertexForm: string;
    axis: string;
    opens: { up: string; down: string };
    yint: string;
    cannotFactor: string;
  };
};

// ---------- exact fractions ----------

type Q = { n: number; d: number };
const LIMIT = 1e12;
const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
let words: AlgebraWords; // the words of the current render, for errors deep inside the arithmetic
function q(n: number, d = 1): Q {
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  const r = { n: n / g + 0, d: d / g }; // + 0: no −0
  if (Math.abs(r.n) > LIMIT || r.d > LIMIT || !Number.isInteger(r.n) || !Number.isInteger(r.d)) throw new Error(words.tooBig);
  return r;
}
const ZERO = q(0);
const ONE = q(1);
const add = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const neg = (a: Q) => q(-a.n, a.d);
const sub = (a: Q, b: Q) => add(a, neg(b));
const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
const div = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
const isZero = (a: Q) => a.n === 0;
/** A typographic minus for numbers in running text. */
const minus = (v: number | string) => String(v).replace(/-/g, "−");
const eqQ = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
const sign = (a: Q) => Math.sign(a.n);
const num = (a: Q) => a.n / a.d;
const isInt = (a: Q) => a.d === 1;

/** a/b in LaTeX, the sign in front. */
const texQ = (a: Q) => (a.d === 1 ? `${a.n}` : `${a.n < 0 ? "-" : ""}\\frac{${Math.abs(a.n)}}{${a.d}}`);
/** For running text: 3, −1/2. */
const plainQ = (a: Q) => `${a.n < 0 ? "−" : ""}${Math.abs(a.n)}${a.d === 1 ? "" : `/${a.d}`}`;

// ---------- polynomials in one letter ----------

type Poly = Q[]; // coefficient of x^i at index i

const trim = (p: Poly): Poly => {
  const r = [...p];
  while (r.length > 1 && isZero(r[r.length - 1])) r.pop();
  return r.length ? r : [ZERO];
};
const deg = (p: Poly) => trim(p).length - 1;
const co = (p: Poly, i: number) => p[i] ?? ZERO;
const padd = (a: Poly, b: Poly) => trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => add(co(a, i), co(b, i))));
const pscale = (a: Poly, k: Q) => trim(a.map((c) => mul(c, k)));
const psub = (a: Poly, b: Poly) => padd(a, pscale(b, q(-1)));
const pmul = (a: Poly, b: Poly): Poly => {
  const r: Q[] = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] = add(r[i + j], mul(x, y)))));
  return trim(r);
};
const peval = (p: Poly, x: Q) => p.reduceRight((acc, c) => add(mul(acc, x), c), ZERO);

/** One term c·x^k in LaTeX; `lead`: no "+" in front. */
function termTex(c: Q, k: number, v: string, lead: boolean): string {
  const s = sign(c) < 0 ? "-" : lead ? "" : "+";
  const a = { n: Math.abs(c.n), d: c.d };
  const xs = k === 0 ? "" : k === 1 ? v : `${v}^{${k}}`;
  const coef = k > 0 && a.n === 1 && a.d === 1 ? "" : a.d === 1 ? `${a.n}` : `\\frac{${a.n}}{${a.d}}`;
  return `${s}${lead ? "" : " "}${coef}${xs}`;
}
function polyTex(p: Poly, v: string): string {
  const t = trim(p);
  const parts: string[] = [];
  for (let k = t.length - 1; k >= 0; k--) if (!isZero(t[k])) parts.push(termTex(t[k], k, v, parts.length === 0));
  return parts.length ? parts.join(" ") : "0";
}
/** A term for the step labels: 2x, −3, 1/2·x. */
function termPlain(c: Q, k: number, v: string): string {
  const a = { n: Math.abs(c.n), d: c.d };
  const xs = k === 0 ? "" : k === 1 ? v : `${v}²`;
  const coef = k > 0 && a.n === 1 && a.d === 1 ? "" : a.d === 1 ? `${a.n}` : `${a.n}/${a.d}${k > 0 ? "·" : ""}`;
  return `${coef}${xs}`;
}

// ---------- parsing ----------

const NORMAL: [RegExp, string][] = [
  [/[−–]/g, "-"], [/[×·]/g, "*"], [/÷/g, "/"], [/²/g, "^2"], [/³/g, "^3"], [/≤/g, "<="], [/≥/g, ">="], [/,/g, "."],
];
const normal = (s: string) => NORMAL.reduce((acc, [re, to]) => acc.replace(re, to), s).replace(/\s+/g, " ").trim();

/** Recursive descent over + − × ÷ ^ and brackets, with implicit products (2x, 3(x+1), (x+1)(x−2)). */
function parsePoly(src: string, ctx: { v: string }): Poly {
  const s = src.replace(/\s+/g, "");
  let i = 0;
  const bad = () => new Error(fill(words.bad, { s: src.trim() }));
  const peek = () => s[i];
  const expr = (): Poly => {
    let p = termP();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      const t = termP();
      p = op === "+" ? padd(p, t) : psub(p, t);
    }
    return p;
  };
  const termP = (): Poly => {
    let p = unary();
    for (;;) {
      const c = peek();
      if (c === "*" || c === "/") {
        i++;
        const f = unary();
        if (c === "*") p = pmul(p, f);
        else {
          if (deg(f) > 0) throw new Error(words.divX);
          if (isZero(f[0])) throw bad();
          p = pscale(p, div(ONE, f[0]));
        }
      } else if (c !== undefined && /[\d.(a-z]/i.test(c)) p = pmul(p, power());
      else return p;
    }
  };
  const unary = (): Poly => {
    if (peek() === "-") return i++, pscale(unary(), q(-1));
    if (peek() === "+") return i++, unary();
    return power();
  };
  const power = (): Poly => {
    const base = atom();
    if (peek() !== "^") return base;
    i++;
    const m = /^\d+/.exec(s.slice(i));
    if (!m || Number(m[0]) > 6) throw new Error(words.power);
    i += m[0].length;
    let r: Poly = [ONE];
    for (let k = 0; k < Number(m[0]); k++) r = pmul(r, base);
    return r;
  };
  const atom = (): Poly => {
    const c = peek();
    if (c === "(") {
      i++;
      const p = expr();
      if (peek() !== ")") throw bad();
      i++;
      return p;
    }
    const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (m) {
      i += m[0].length;
      const [whole, frac = ""] = m[0].split(".");
      return [q(Number(whole + frac), 10 ** frac.length)];
    }
    if (c !== undefined && /[a-z]/i.test(c)) {
      i++;
      if (ctx.v && ctx.v !== c) throw new Error(words.oneVar);
      ctx.v = c;
      return [ZERO, ONE];
    }
    throw bad();
  };
  if (!s) throw bad();
  const p = expr();
  if (i < s.length) throw bad();
  return p;
}

type Rel = "<" | "<=" | ">" | ">=" | "=";
const REL_TEX: Record<Rel, string> = { "<": "<", "<=": "\\le", ">": ">", ">=": "\\ge", "=": "=" };
const FLIP: Record<Rel, Rel> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=", "=": "=" };

function splitRel(src: string): { parts: string[]; rels: Rel[] } {
  const s = normal(src);
  const parts: string[] = [];
  const rels: Rel[] = [];
  let last = 0;
  for (const m of s.matchAll(/<=|>=|=<|=>|<|>|=/g)) {
    parts.push(s.slice(last, m.index));
    rels.push(({ "=<": "<=", "=>": ">=" } as Record<string, Rel>)[m[0]] ?? (m[0] as Rel));
    last = m.index! + m[0].length;
  }
  parts.push(s.slice(last));
  return { parts, rels };
}

// ---------- drawing ----------

type Line = { tex: string; op?: string; color?: string };

/** Equation lines, one under another, each with what was done on the right. */
function lines(rows: Line[], y0: number, x0 = 28): { svg: string; h: number } {
  const parts: string[] = [];
  let y = y0;
  for (const r of rows) {
    const t = latexToSvg(r.tex, r.color ?? C.ink);
    const k = Math.min(1, (W - x0 - 230) / t.width);
    const w = t.width * k;
    const h = t.height * k;
    const rowH = Math.max(30, h + 10);
    parts.push(
      t.svg
        .replace(/width="[\d.]+"/, `width="${r2(w)}"`)
        .replace(/height="[\d.]+"/, `height="${r2(h)}"`)
        .replace(/^<svg/, `<svg x="${x0}" y="${r2(y + (rowH - h) / 2)}"`),
    );
    if (r.op) parts.push(txt(W - 24, y + rowH / 2 + 5, r.op, { color: r.color === C.red ? C.red : C.blue, anchor: "end", bold: true, size: 13 }));
    y += rowH;
  }
  return { svg: parts.join(""), h: y - y0 };
}

const sideTex = (a: Q, b: Q, v: string) => polyTex([b, a], v);

// ---------- linear equations ----------

/** A balance with x-bags and unit weights; crossed-out items are the ones taken from both pans. */
function balance(left: [number, number], right: [number, number], gone: [number, number], v: string, y0: number): { svg: string; h: number } {
  const parts: string[] = [];
  const cx = W / 2;
  const beamY = y0 + 18;
  parts.push(
    `<path d="M${cx - 14},${y0 + 150} L${cx},${beamY} L${cx + 14},${y0 + 150} Z" fill="#dee2e6" stroke="#868e96"/>`,
    `<line x1="${cx - 230}" y1="${beamY}" x2="${cx + 230}" y2="${beamY}" stroke="#495057" stroke-width="4" stroke-linecap="round"/>`,
    `<circle cx="${cx}" cy="${beamY}" r="5" fill="#495057"/>`,
  );
  const pan = (px: number, [bags, units]: [number, number]) => {
    const panY = y0 + 128;
    parts.push(
      `<line x1="${px - 100}" y1="${panY}" x2="${px}" y2="${beamY}" stroke="#adb5bd"/>`,
      `<line x1="${px + 100}" y1="${panY}" x2="${px}" y2="${beamY}" stroke="#adb5bd"/>`,
      `<path d="M${px - 110},${panY} L${px + 110},${panY} L${px + 92},${panY + 12} L${px - 92},${panY + 12} Z" fill="#e9ecef" stroke="#868e96"/>`,
    );
    // Items sit on the pan, bags first; the first `gone` of each are crossed out.
    const items: { bag: boolean; gone: boolean }[] = [
      ...Array.from({ length: bags }, (_, i) => ({ bag: true, gone: i < gone[0] })),
      ...Array.from({ length: units }, (_, i) => ({ bag: false, gone: i < gone[1] })),
    ];
    let x = px - 108;
    let row = 0;
    for (const it of items) {
      const w = it.bag ? 28 : 18;
      if (x + w > px + 108) {
        x = px - 108;
        row++;
      }
      const h = it.bag ? 34 : 18;
      const y = panY - h - row * 38;
      const op = it.gone ? ` opacity="0.35"` : "";
      parts.push(
        it.bag
          ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="#d0ebff" stroke="${C.blue}" stroke-width="1.5"${op}/>` +
            txt(x + w / 2, y + h / 2 + 5, v, { anchor: "middle", italic: true, bold: true, color: C.blue, size: 14 })
          : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#fff4e6" stroke="${C.orange}" stroke-width="1.3"${op}/>` +
            txt(x + w / 2, y + h / 2 + 4, "1", { anchor: "middle", color: C.orange, size: 11, bold: true }),
      );
      if (it.gone) parts.push(`<line x1="${x - 2}" y1="${y + h + 2}" x2="${x + w + 2}" y2="${y - 2}" stroke="${C.red}" stroke-width="2"/>`);
      x += w + 4;
    }
  };
  pan(cx - 170, left);
  pan(cx + 170, right);
  return { svg: parts.join(""), h: 160 };
}

function renderLinear(s: AlgebraSpec, w: AlgebraWords): RenderedSvg {
  const { parts, rels } = splitRel(s.eq);
  if (rels.length !== 1 || rels[0] !== "=") throw new Error(w.needEq);
  const ctx = { v: "" };
  const L0 = parsePoly(parts[0], ctx);
  const R0 = parsePoly(parts[1], ctx);
  const v = ctx.v || "x";
  if (deg(L0) > 1 || deg(R0) > 1) throw new Error(fill(w.notLinear, { d: Math.max(deg(L0), deg(R0)) }));
  let [bL, aL] = [co(L0, 0), co(L0, 1)];
  let [bR, aR] = [co(R0, 0), co(R0, 1)];
  const rows: Line[] = [{ tex: `${sideTex(aL, bL, v)} = ${sideTex(aR, bR, v)}` }];
  const both = w.ops.both;
  const opText = (c: Q, k: number) => fill(sign(c) > 0 ? w.ops.sub : w.ops.add, { t: termPlain(c, k, v), where: both });
  const caps: Caption[] = [];

  // Balance scale: small whole numbers, all on the plus side, and a whole positive answer.
  const small = [aL, bL, aR, bR].every((c) => isInt(c) && c.n >= 0) && num(aL) <= 6 && num(aR) <= 6 && num(bL) <= 12 && num(bR) <= 12 && !eqQ(aL, aR);
  const goneBags = Math.min(num(aL), num(aR));

  // 1. Take the smaller x-term from both sides, so x stays on one side with a positive coefficient.
  const m = sign(sub(aL, aR)) > 0 ? aR : aL;
  if (!isZero(m)) {
    aL = sub(aL, m);
    aR = sub(aR, m);
    rows.push({ tex: `${sideTex(aL, bL, v)} = ${sideTex(aR, bR, v)}`, op: opText(m, 1) });
  }
  if (isZero(aL) && isZero(aR)) {
    const same = eqQ(bL, bR);
    caps.push({ text: same ? w.lin.every : fill(w.lin.none, { l: plainQ(bL), r: plainQ(bR) }), color: same ? C.green : C.red });
    const body = lines(rows.slice(1), 4);
    return compose(rows[0].tex, body.svg, body.h + 4, caps);
  }
  const xLeft = !isZero(aL);
  const a = xLeft ? aL : aR;
  // 2. Take the constant on the x side from both sides.
  const k = xLeft ? bL : bR;
  if (!isZero(k)) {
    bL = sub(bL, k);
    bR = sub(bR, k);
    rows.push({ tex: `${sideTex(aL, bL, v)} = ${sideTex(aR, bR, v)}`, op: opText(k, 0) });
  }
  // 3. Divide by the coefficient.
  const c = xLeft ? bR : bL;
  const x = div(c, a);
  if (!eqQ(a, ONE)) rows.push({ tex: xLeft ? `${v} = ${texQ(x)}` : `${texQ(x)} = ${v}`, op: fill(w.ops.div, { t: plainQ(a), where: both }) });
  if (!xLeft) rows.push({ tex: `${v} = ${texQ(x)}`, op: w.ops.swap });
  rows[rows.length - 1].color = C.green;

  const body: string[] = [];
  let y = 4;
  const ln = lines(rows.slice(1), y);
  body.push(ln.svg);
  y += ln.h + 8;
  if (small && isInt(x) && x.n > 0) {
    const bal = balance([num(co(L0, 1)), num(co(L0, 0))], [num(co(R0, 1)), num(co(R0, 0))], [goneBags, num(k)], v, y);
    body.push(bal.svg);
    y += bal.h;
    caps.push({ text: fill(w.lin.balance, { bags: goneBags, units: num(k), a: plainQ(a), c: plainQ(c), x: plainQ(x), v }), color: "#495057" });
  }
  caps.push({ text: fill(w.lin.check, { v, x: plainQ(x), l: plainQ(peval(L0, x)), r: plainQ(peval(R0, x)) }), color: C.green });
  return compose(rows[0].tex, body.join(""), y, caps);
}

// ---------- linear inequalities ----------

function numberLine(lo: { x: Q; closed: boolean } | null, hi: { x: Q; closed: boolean } | null, v: string, y0: number, color: string): { svg: string; h: number } {
  const ends = [lo, hi].filter((e): e is { x: Q; closed: boolean } => !!e).map((e) => num(e.x));
  const a = Math.floor(Math.min(...ends)) - 4;
  const b = Math.ceil(Math.max(...ends)) + 4;
  const step = Math.max(1, Math.ceil((b - a) / 16));
  const x0 = 40;
  const x1 = W - 40;
  const sx = (t: number) => x0 + ((t - a) / (b - a)) * (x1 - x0);
  const y = y0 + 26;
  const parts: string[] = [
    `<line x1="${x0 - 12}" y1="${y}" x2="${x1 + 12}" y2="${y}" stroke="#495057" stroke-width="1.5"/>`,
    `<path d="M${x1 + 12},${y} l-8,-4 l0,8 Z M${x0 - 12},${y} l8,-4 l0,8 Z" fill="#495057"/>`,
  ];
  for (let t = Math.ceil(a / step) * step; t <= b; t += step) {
    parts.push(`<line x1="${r2(sx(t))}" y1="${y - 5}" x2="${r2(sx(t))}" y2="${y + 5}" stroke="#495057"/>`, txt(sx(t), y + 20, t < 0 ? `−${-t}` : `${t}`, { anchor: "middle", size: 11, color: "#495057" }));
  }
  const from = lo ? sx(num(lo.x)) : x0 - 12;
  const to = hi ? sx(num(hi.x)) : x1 + 12;
  parts.push(`<line x1="${r2(from)}" y1="${y}" x2="${r2(to)}" y2="${y}" stroke="${color}" stroke-width="5" stroke-linecap="butt" opacity="0.85"/>`);
  if (!lo) parts.push(`<path d="M${x0 - 16},${y} l10,-7 l0,14 Z" fill="${color}"/>`);
  if (!hi) parts.push(`<path d="M${x1 + 16},${y} l-10,-7 l0,14 Z" fill="${color}"/>`);
  for (const e of [lo, hi]) {
    if (!e) continue;
    const px = r2(sx(num(e.x)));
    parts.push(`<circle cx="${px}" cy="${y}" r="6.5" fill="${e.closed ? color : "#ffffff"}" stroke="${color}" stroke-width="2.5"/>`);
    parts.push(txt(px, y - 14, `${v} = ${plainQ(e.x)}`, { anchor: "middle", size: 12, color, bold: true }));
  }
  return { svg: parts.join(""), h: 56 };
}

function renderInequality(s: AlgebraSpec, w: AlgebraWords): RenderedSvg {
  const { parts, rels } = splitRel(s.eq);
  if (!rels.length || rels.length > 2 || rels.includes("=")) throw new Error(w.needIneq);
  const ctx = { v: "" };
  const polys = parts.map((p) => parsePoly(p, ctx));
  const v = ctx.v || "x";
  if (polys.some((p) => deg(p) > 1)) throw new Error(fill(w.notLinear, { d: Math.max(...polys.map(deg)) }));
  const rows: Line[] = [];
  const caps: Caption[] = [];
  let flipped = false;
  let lo: { x: Q; closed: boolean } | null = null;
  let hi: { x: Q; closed: boolean } | null = null;

  if (rels.length === 2) {
    // a < bx + c ≤ d: do the same to all three parts.
    const up = rels.every((r) => r === "<" || r === "<=");
    const down = rels.every((r) => r === ">" || r === ">=");
    if (!up && !down) throw new Error(w.mixed);
    if (deg(polys[0]) > 0 || deg(polys[2]) > 0 || deg(polys[1]) !== 1) throw new Error(w.needIneq);
    let [l, r] = [co(polys[0], 0), co(polys[2], 0)];
    let [b, a] = [co(polys[1], 0), co(polys[1], 1)];
    let [r1, r2_]: Rel[] = rels;
    const show = (op?: string, color?: string) =>
      rows.push({ tex: `${texQ(l)} ${REL_TEX[r1]} ${sideTex(a, b, v)} ${REL_TEX[r2_]} ${texQ(r)}`, op, color });
    show();
    const three = w.ops.three;
    if (!isZero(b)) {
      const op = fill(sign(b) > 0 ? w.ops.sub : w.ops.add, { t: plainQ(q(Math.abs(b.n), b.d)), where: three });
      [l, r] = [sub(l, b), sub(r, b)];
      b = ZERO;
      show(op);
    }
    if (!eqQ(a, ONE)) {
      const negA = sign(a) < 0;
      [l, r] = [div(l, a), div(r, a)];
      if (negA) {
        // Dividing every part by a negative keeps the parts in place and turns both signs round.
        flipped = true;
        [r1, r2_] = [FLIP[r1], FLIP[r2_]];
      }
      const op = fill(negA ? w.ops.flip : w.ops.div, { t: plainQ(a), where: three });
      a = ONE;
      show(op, negA ? C.red : undefined);
    }
    rows[rows.length - 1].color = rows[rows.length - 1].color ?? C.green;
    // Read as an interval from the smaller end.
    const ascending = r1 === "<" || r1 === "<=";
    const [small, smallClosed, big, bigClosed] = ascending ? [l, r1 === "<=", r, r2_ === "<="] : [r, r2_ === ">=", l, r1 === ">="];
    if (num(small) > num(big) || (eqQ(small, big) && !(smallClosed && bigClosed))) {
      caps.push({ text: w.ineq.none, color: C.red });
      const body = lines(rows.slice(1), 4);
      return compose(rows[0].tex, body.svg, body.h + 4, caps);
    }
    lo = { x: small, closed: smallClosed };
    hi = { x: big, closed: bigClosed };
  } else {
    let [bL, aL] = [co(polys[0], 0), co(polys[0], 1)];
    let [bR, aR] = [co(polys[1], 0), co(polys[1], 1)];
    let rel = rels[0];
    const both = w.ops.both;
    const show = (op?: string, color?: string) => rows.push({ tex: `${sideTex(aL, bL, v)} ${REL_TEX[rel]} ${sideTex(aR, bR, v)}`, op, color });
    show();
    // x-terms to the left, constants to the right, then divide (and flip for a negative).
    if (!isZero(aR)) {
      const op = fill(sign(aR) > 0 ? w.ops.sub : w.ops.add, { t: termPlain(aR, 1, v), where: both });
      aL = sub(aL, aR);
      aR = ZERO;
      show(op);
    }
    if (isZero(aL)) {
      const holds = (rel === "<" && num(bL) < num(bR)) || (rel === "<=" && num(bL) <= num(bR)) || (rel === ">" && num(bL) > num(bR)) || (rel === ">=" && num(bL) >= num(bR));
      caps.push({ text: fill(holds ? w.ineq.every : w.ineq.none, {}), color: holds ? C.green : C.red });
      const body = lines(rows.slice(1), 4);
      return compose(rows[0].tex, body.svg, body.h + 4, caps);
    }
    if (!isZero(bL)) {
      const op = fill(sign(bL) > 0 ? w.ops.sub : w.ops.add, { t: termPlain(bL, 0, v), where: both });
      bR = sub(bR, bL);
      bL = ZERO;
      show(op);
    }
    if (!eqQ(aL, ONE)) {
      const negA = sign(aL) < 0;
      bR = div(bR, aL);
      const op = fill(negA ? w.ops.flip : w.ops.div, { t: plainQ(aL), where: both });
      if (negA) {
        rel = FLIP[rel];
        flipped = true;
      }
      aL = ONE;
      show(op, negA ? C.red : undefined);
    }
    rows[rows.length - 1].color = rows[rows.length - 1].color ?? C.green;
    const closed = rel === "<=" || rel === ">=";
    if (rel === "<" || rel === "<=") hi = { x: bR, closed };
    else lo = { x: bR, closed };
  }

  const body: string[] = [];
  let y = 4;
  const ln = lines(rows.slice(1), y);
  body.push(ln.svg);
  y += ln.h + 10;
  const nl = numberLine(lo, hi, v, y, C.blue);
  body.push(nl.svg);
  y += nl.h;
  if (flipped) caps.push({ text: w.ineq.flipNote, color: C.red });
  const dots = [lo, hi].filter(Boolean).map((e) => (e!.closed ? w.ineq.closed : w.ineq.open));
  caps.push({ text: fill(w.ineq.result, { dots: [...new Set(dots)].join("; ") }), color: "#495057" });
  return compose(rows[0].tex, body.join(""), y, caps);
}

// ---------- expanding brackets ----------

/** "(2x+3)(x−4)", "3(x+1)(x−2)", "(x+5)^2": the factors as written. */
function splitFactors(src: string, ctx: { v: string }): Poly[] {
  const s = normal(src).replace(/\s+/g, "");
  const out: Poly[] = [];
  let i = 0;
  while (i < s.length) {
    let chunk: string;
    if (s[i] === "(") {
      let depth = 0;
      let j = i;
      for (; j < s.length; j++) {
        if (s[j] === "(") depth++;
        if (s[j] === ")" && --depth === 0) break;
      }
      if (depth !== 0 && j >= s.length) throw new Error(fill(words.bad, { s: src }));
      chunk = s.slice(i, j + 1);
      i = j + 1;
    } else {
      const j = s.indexOf("(", i);
      chunk = s.slice(i, j < 0 ? s.length : j).replace(/\*$/, "");
      i = j < 0 ? s.length : j;
    }
    let times = 1;
    const m = /^\^(\d+)/.exec(s.slice(i));
    if (m) {
      times = Number(m[1]);
      i += m[0].length;
    }
    if (s[i] === "*") i++;
    if (!chunk || chunk === "+") continue;
    const p = chunk === "-" ? [q(-1)] : parsePoly(chunk, ctx);
    for (let k = 0; k < times; k++) out.push(p);
  }
  return out;
}

const nonzeroTerms = (p: Poly) =>
  trim(p)
    .map((c, k) => ({ c, k }))
    .filter((t) => !isZero(t.c))
    .reverse();

const DEG_FILL = ["#fff4e6", "#ebfbee", "#e7f5ff", "#f3f0ff", "#fff0f6", "#f8f9fa", "#f8f9fa"];
const DEG_INK = [C.orange, C.green, C.blue, C.purple, "#c2255c", "#495057", "#495057"];

function renderExpand(s: AlgebraSpec, w: AlgebraWords): RenderedSvg {
  const ctx = { v: "" };
  let factors = splitFactors(s.eq, ctx);
  const v = ctx.v || "x";
  // A plain number in front multiplies at the end.
  const consts = factors.filter((f) => deg(f) === 0);
  factors = factors.filter((f) => deg(f) > 0);
  const k = consts.reduce((acc, f) => mul(acc, f[0]), ONE);
  if (factors.length < 2 && !(factors.length === 1 && !eqQ(k, ONE))) throw new Error(w.needProduct);
  if (factors.length > 3 || factors.some((f) => nonzeroTerms(f).length > 4)) throw new Error(w.tooMany);

  const body: string[] = [];
  const caps: Caption[] = [];
  let y = 4;
  let acc = factors[0];
  for (let f = 1; f < factors.length; f++) {
    const rowsT = nonzeroTerms(acc);
    const colsT = nonzeroTerms(factors[f]);
    const cw = Math.min(110, Math.floor((W - 120) / colsT.length));
    const ch = 40;
    const gx = (W - 70 - cw * colsT.length) / 2 + 70;
    const termTexOf = (c: Q, kk: number) => termTex(c, kk, v, true);
    // Header row and column: the terms of each factor.
    colsT.forEach((t, j) => body.push(texCell(gx + j * cw, y, cw, 30, termTexOf(t.c, t.k), "#f1f3f5", C.ink)));
    rowsT.forEach((t, i) => body.push(texCell(gx - 70, y + 30 + i * ch, 70, ch, termTexOf(t.c, t.k), "#f1f3f5", C.ink)));
    body.push(txt(gx - 35, y + 20, "×", { anchor: "middle", bold: true, size: 15 }));
    rowsT.forEach((r, i) =>
      colsT.forEach((c, j) => {
        const p = mul(r.c, c.c);
        const d = r.k + c.k;
        body.push(texCell(gx + j * cw, y + 30 + i * ch, cw, ch, termTexOf(p, d), DEG_FILL[d], DEG_INK[d]));
      }),
    );
    y += 30 + rowsT.length * ch + 10;
    // Collect: one bracket per power, in the colours of the grid.
    const next = pmul(acc, factors[f]);
    const groups: string[] = [];
    for (let d = rowsT[0].k + colsT[0].k; d >= 0; d--) {
      const prods: Q[] = [];
      rowsT.forEach((r) => colsT.forEach((c) => r.k + c.k === d && prods.push(mul(r.c, c.c))));
      if (!prods.length) continue;
      // A lone term carries its own sign; several in a bracket get a "+" in front.
      const g = prods.length > 1
        ? `${groups.length ? "+ " : ""}(${prods.map((p, i) => termTex(p, d, v, i === 0)).join(" ")})`
        : termTex(prods[0], d, v, groups.length === 0);
      groups.push(`\\color{${DEG_INK[d]}}{${g}}`);
    }
    const collected = groups.join(" ");
    const ln = lines([{ tex: `= ${collected}`, op: w.exp.collect }, { tex: `= ${polyTex(next, v)}`, color: f === factors.length - 1 && eqQ(k, ONE) ? C.green : C.ink }], y);
    body.push(ln.svg);
    y += ln.h + 8;
    if (f < factors.length - 1) caps.push({ text: fill(w.exp.next, { p: polyPlain(next, v) }), color: "#495057" });
    acc = next;
  }
  if (!eqQ(k, ONE)) {
    const res = pscale(acc, k);
    const ln = lines([{ tex: `${texQ(k)} \\cdot (${polyTex(acc, v)}) = ${polyTex(res, v)}`, op: fill(w.ops.mul, { t: plainQ(k) }), color: C.green }], y);
    body.push(ln.svg);
    y += ln.h;
    acc = res;
  }
  caps.unshift({ text: w.exp.grid, color: "#495057" });
  caps.push({ text: fill(w.exp.result, { p: polyPlain(acc, v) }), color: C.green });
  // The header as the factors were given, repeated factors as a power.
  const head: string[] = eqQ(k, ONE) ? [] : [texQ(k)];
  for (let i = 0; i < factors.length; ) {
    let j = i;
    while (j < factors.length && polyTex(factors[j], v) === polyTex(factors[i], v)) j++;
    head.push(`\\left(${polyTex(factors[i], v)}\\right)${j - i > 1 ? `^{${j - i}}` : ""}`);
    i = j;
  }
  return compose(head.join(""), body.join(""), y, caps);
}

function texCell(x: number, y: number, w: number, h: number, tex: string, fillC: string, ink: string): string {
  const t = latexToSvg(tex, ink);
  const k = Math.min(1, (w - 8) / t.width, (h - 6) / t.height);
  const tw = t.width * k;
  const th = t.height * k;
  return (
    `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${fillC}" stroke="#adb5bd"/>` +
    t.svg
      .replace(/width="[\d.]+"/, `width="${r2(tw)}"`)
      .replace(/height="[\d.]+"/, `height="${r2(th)}"`)
      .replace(/^<svg/, `<svg x="${r2(x + (w - tw) / 2)}" y="${r2(y + (h - th) / 2)}"`)
  );
}

function polyPlain(p: Poly, v: string): string {
  const t = trim(p);
  const parts: string[] = [];
  for (let k = t.length - 1; k >= 0; k--) {
    if (isZero(t[k])) continue;
    const term = termPlain(t[k], k, v).replace("²", k > 1 ? (["", "", "²", "³", "⁴", "⁵", "⁶"][k] ?? `^${k}`) : "");
    const s = sign(t[k]) < 0 ? "−" : "+";
    parts.push(parts.length ? `${s} ${term}` : `${s === "−" ? "−" : ""}${term}`);
  }
  return parts.join(" ") || "0";
}

// ---------- factoring (ac method) ----------

type Factored = {
  rows: Line[];
  /** The linear factors found, as [constant, coefficient]; empty if it doesn't factor. */
  linear: [number, number][];
  /** Shown under the steps. */
  table?: { svg: string; h: number };
  caps: Caption[];
  ok: boolean;
};

const isSquare = (n: number) => n >= 0 && Number.isInteger(Math.sqrt(n));

/** ax² + bx + c with whole numbers: common factor, then the ac method (pairs, split, group). */
function factorSteps(p: Poly, v: string, w: AlgebraWords, y0: number): Factored {
  const t = trim(p);
  if (t.some((c) => !isInt(c))) throw new Error(w.intOnly);
  if (deg(t) > 2) throw new Error(w.upToSquare);
  if (deg(t) < 1) throw new Error(fill(w.bad, { s: polyPlain(t, v) }));
  const ints = t.map((c) => c.n);
  const rows: Line[] = [{ tex: polyTex(t, v) }];
  const caps: Caption[] = [];
  // Common factor: the gcd of the coefficients (negative if the leading one is), and x if there's no constant.
  let g = ints.reduce((acc, c) => gcd(acc, c), 0);
  if (ints[ints.length - 1] < 0) g = -g;
  let xPow = 0;
  while (ints[xPow] === 0) xPow++;
  const rest = ints.map((c) => c / g).slice(xPow);
  const xs = xPow === 0 ? "" : xPow === 1 ? v : `${v}^{${xPow}}`;
  const outerTex = `${g === 1 ? "" : g === -1 ? "-" : g}${xs}`;
  const linear: [number, number][] = Array.from({ length: xPow }, () => [0, 1] as [number, number]);
  if (rest.length === 1) {
    // A single term: nothing to factor.
    caps.push({ text: w.fac.none, color: "#495057" });
    return { rows, linear, caps, ok: true };
  }
  if (outerTex) {
    const gPlain = `${g}${xPow === 0 ? "" : xPow === 1 ? v : `${v}²`}`.replace("-", "−");
    rows.push({ tex: `= ${outerTex}(${polyTex(rest.map((c) => q(c)), v)})`, op: fill(w.fac.gcf, { g: gPlain }) });
    if (rest.length === 2) {
      linear.push([rest[0], rest[1]]);
      rows[rows.length - 1].color = C.green;
      return { rows, linear, caps, ok: true };
    }
  }
  if (rest.length === 2) {
    linear.push([rest[0], rest[1]]);
    caps.push({ text: w.fac.none, color: "#495057" });
    return { rows, linear, caps, ok: true };
  }
  const [c, b, a] = rest;
  // Special shapes worth naming.
  if (b === 0 && c < 0 && isSquare(a) && isSquare(-c)) caps.push({ text: w.fac.dos, color: C.purple });
  else if (b * b === 4 * a * c && isSquare(a) && isSquare(c)) caps.push({ text: w.fac.square, color: C.purple });

  const ac = a * c;
  // Pairs p·q = ac, with the signs that can add up to b.
  const pairs: [number, number][] = [];
  const lim = Math.floor(Math.sqrt(Math.abs(ac)));
  for (let d = 1; d <= lim; d++) {
    if (ac % d) continue;
    const e = Math.abs(ac / d);
    if (ac > 0) pairs.push(b >= 0 ? [d, e] : [-d, -e]);
    else pairs.push(...(d === e ? [[d, -e]] as [number, number][] : [[d, -e], [-d, e]] as [number, number][]));
  }
  const hit = pairs.find(([p1, q1]) => p1 + q1 === b);
  let shown = pairs;
  if (pairs.length > 10) {
    const at = hit ? pairs.indexOf(hit) : 0;
    shown = pairs.slice(Math.max(0, Math.min(at - 5, pairs.length - 10)), Math.max(0, Math.min(at - 5, pairs.length - 10)) + 10);
  }
  const tb = table(
    W / 2 - 150,
    y0,
    [{ head: fill(w.fac.product, { ac: minus(ac) }), w: 160 }, { head: fill(w.fac.sum, { b: minus(b) }), w: 140 }],
    shown.map(([p1, q1]) => {
      const good = p1 + q1 === b;
      return {
        cells: [`${p1} · ${q1}`.replace(/-/g, "−"), `${p1 + q1}`.replace(/-/g, "−") + (good ? "  ✓" : "")],
        colors: good ? [C.green, C.green] : undefined,
        fills: good ? ["#ebfbee", "#ebfbee"] : undefined,
        bold: good ? [true, true] : undefined,
      };
    }),
  );
  caps.unshift({ text: fill(w.fac.pairs, { ac: String(ac).replace("-", "−"), b: String(b).replace("-", "−") }), color: "#495057" });
  if (!hit) {
    caps.push({ text: fill(w.fac.noPair, { ac: String(ac).replace("-", "−"), b: String(b).replace("-", "−"), d: String(b * b - 4 * a * c).replace("-", "−") }), color: C.red });
    return { rows, linear: [], table: tb, caps, ok: false };
  }
  // Split the middle term so that grouping works: a·x² + p·x | + q·x + c, with p sharing a factor with a.
  let [p1, q1] = hit;
  const g1of = (x: number, y: number) => gcd(x, y) || 1;
  if ((q1 * g1of(a, p1)) % a !== 0) [p1, q1] = [q1, p1];
  const g1 = g1of(a, p1);
  const inner: [number, number] = [p1 / g1, a / g1]; // (a/g1·x + p/g1)
  const g2 = (q1 * g1) / a;
  const T = (n: number) => q(n);
  // a·x² + p·x + q·x + c
  rows.push({
    tex: `${outerTex ? "= " + outerTex + "(" : "= "}${termTex(T(a), 2, v, true)} ${termTex(T(p1), 1, v, false)} ${termTex(T(q1), 1, v, false)} ${termTex(T(c), 0, v, false)}${outerTex ? ")" : ""}`,
    op: fill(w.fac.split, { b: String(b).replace("-", "−"), p: String(p1).replace("-", "−"), q: String(q1).replace("-", "−") }),
  });
  const lin1 = polyTex([T(inner[0]), T(inner[1])], v);
  const g1Tex = `${g1 === 1 ? "" : g1 === -1 ? "-" : g1}${v}`;
  const g2Tex = `${g2 < 0 ? "-" : "+"} ${Math.abs(g2)}`;
  rows.push({
    tex: `${outerTex ? "= " + outerTex + "[" : "= "}${g1Tex}(${lin1}) ${g2Tex}(${lin1})${outerTex ? "]" : ""}`,
    op: w.fac.group,
  });
  const lin2 = polyTex([T(g2), T(g1)], v);
  rows.push({ tex: `= ${outerTex}(${lin2})(${lin1})`, op: w.fac.result, color: C.green });
  linear.push([g2, g1], [inner[0], inner[1]]);
  caps.push({ text: fill(w.fac.found, { p: String(p1).replace("-", "−"), q: String(q1).replace("-", "−") }), color: C.green });
  return { rows, linear, table: tb, caps, ok: true };
}

function renderFactor(s: AlgebraSpec, w: AlgebraWords): RenderedSvg {
  const ctx = { v: "" };
  const p = parsePoly(normal(s.eq), ctx);
  const v = ctx.v || "x";
  const res = factorSteps(p, v, w, 4);
  const body: string[] = [];
  let y = 4;
  if (res.table) {
    body.push(res.table.svg);
    y += res.table.h + 12;
  }
  const ln = lines(res.rows, y);
  body.push(ln.svg);
  y += ln.h;
  return compose(polyTex(p, v), body.join(""), y, res.caps);
}

// ---------- quadratic equations ----------

/** √(n/d) as r·√m with r rational and m square-free (m = 1: rational). */
function surd(x: Q): { r: Q; m: number } {
  let s = x.n * x.d;
  let k = 1;
  for (let f = 2; f * f <= s; f++) while (s % (f * f) === 0) {
    s /= f * f;
    k *= f;
  }
  return { r: q(k, x.d), m: s };
}
function surdTex(r: Q, m: number): string {
  if (m === 1) return texQ(r);
  const coef = eqQ(r, ONE) ? "" : r.d === 1 ? `${r.n}` : `\\frac{${r.n}}{${r.d}}`;
  return `${coef}\\sqrt{${m}}`;
}

function renderQuadratic(s: AlgebraSpec, w: AlgebraWords): RenderedSvg {
  const { parts, rels } = splitRel(s.eq);
  if (rels.length > 1 || (rels.length === 1 && rels[0] !== "=")) throw new Error(w.needEq);
  const ctx = { v: "" };
  const L = parsePoly(parts[0], ctx);
  const R = rels.length ? parsePoly(parts[1], ctx) : [ZERO];
  const v = ctx.v || "x";
  const P = psub(L, R);
  if (deg(P) !== 2) throw new Error(fill(w.notQuadratic, { d: deg(P) }));
  const [c, b, a] = [co(P, 0), co(P, 1), co(P, 2)];
  const rows: Line[] = [];
  const caps: Caption[] = [];
  const body: string[] = [];
  let y = 4;
  const std = `${polyTex(P, v)} = 0`;
  if (rels.length && !(deg(R) === 0 && isZero(R[0]))) rows.push({ tex: `${polyTex(L, v)} = ${polyTex(R, v)}` }, { tex: std, op: w.quad.standard });
  else rows.push({ tex: std });
  const D = sub(mul(b, b), mul(q(4), mul(a, c)));
  const hV = div(neg(b), mul(q(2), a));
  const roots = (): Q[] | { p: Q; r: Q; m: number } | null => {
    if (sign(D) < 0) return null;
    const sd = surd(div(D, mul(q(4), mul(a, a))));
    if (sd.m === 1) return isZero(sd.r) ? [hV] : [sub(hV, sd.r), add(hV, sd.r)];
    return { p: hV, r: sd.r, m: sd.m };
  };
  const rootsCaption = () => {
    const r = roots();
    if (!r) {
      const im = Math.sqrt(-num(D)) / (2 * Math.abs(num(a)));
      caps.push({ text: w.quad.noneReal, color: C.red }, { text: fill(w.quad.complexHint, { re: minus(nf(num(hV), 3)), im: nf(im, 3), v }), color: C.purple });
    } else if (Array.isArray(r)) caps.push({ text: r.length === 1 ? fill(w.quad.one, { v, x: plainQ(r[0]) }) : fill(w.quad.two, { v, x1: plainQ(r[0]), x2: plainQ(r[1]) }), color: C.green });
    else {
      const d = Math.sqrt(r.m) * num(r.r);
      caps.push({ text: fill(w.quad.two, { v, x1: minus(nf(num(r.p) - d, 4)), x2: minus(nf(num(r.p) + d, 4)) }) + " (≈)", color: C.green });
    }
  };
  const rootsTex = () => {
    const r = roots();
    if (!r) return null;
    if (Array.isArray(r)) return r.length === 1 ? `${v} = ${texQ(r[0])}` : `${v}_1 = ${texQ(r[0])}, \\quad ${v}_2 = ${texQ(r[1])}`;
    return `${v} = ${isZero(r.p) ? "" : texQ(r.p)} \\pm ${surdTex(r.r, r.m)}`;
  };

  if (s.method === "factor") {
    // Whole numbers first: multiply through by the common denominator.
    let ints = P;
    const lcd = P.reduce((acc, x) => (acc * x.d) / gcd(acc, x.d), 1);
    if (lcd !== 1) {
      ints = pscale(P, q(lcd));
      rows.push({ tex: `${polyTex(ints, v)} = 0`, op: fill(w.ops.mul, { t: String(lcd) }) });
    }
    const ln0 = lines(rows, y);
    body.push(ln0.svg);
    y += ln0.h + 6;
    const f = factorSteps(ints, v, w, y);
    if (f.table) {
      body.push(f.table.svg);
      y += f.table.h + 10;
    }
    const steps = f.rows.slice(1).map((r) => ({ ...r, tex: r.tex.replace(/^= /, "") + " = 0" }));
    caps.push(...f.caps);
    if (!f.ok) {
      caps.push({ text: w.quad.cannotFactor, color: "#495057" });
      const rt = rootsTex();
      if (rt) steps.push({ tex: rt, op: w.quad.methods.formula, color: C.green });
      const ln = lines(steps, y);
      body.push(ln.svg);
      y += ln.h;
      rootsCaption();
      return compose(std, body.join(""), y, caps);
    }
    // Zero product: one of the factors is 0.
    const lin = f.linear.filter(([, k]) => k !== 0);
    steps.push({ tex: lin.map(([c0, k]) => `${polyTex([q(c0), q(k)], v)} = 0`).join(" \\quad \\text{or} \\quad "), op: w.quad.zero });
    const xs = [...new Map(lin.map(([c0, k]) => div(q(-c0), q(k))).map((r) => [`${r.n}/${r.d}`, r] as const)).values()].sort((p1, p2) => num(p1) - num(p2));
    steps.push({ tex: xs.map((x, i) => `${v}${xs.length > 1 ? `_${i + 1}` : ""} = ${texQ(x)}`).join(", \\quad "), color: C.green });
    const ln = lines(steps, y);
    body.push(ln.svg);
    y += ln.h;
    caps.push({ text: xs.length === 1 ? fill(w.quad.one, { v, x: plainQ(xs[0]) }) : fill(w.quad.two, { v, x1: plainQ(xs[0]), x2: plainQ(xs[1]) }), color: C.green });
    return compose(std, body.join(""), y, caps);
  }

  if (s.method === "formula") {
    rows.push(
      { tex: `a = ${texQ(a)}, \\quad b = ${texQ(b)}, \\quad c = ${texQ(c)}` },
      { tex: `\\Delta = b^2 - 4ac = (${texQ(b)})^2 - 4 \\cdot (${texQ(a)}) \\cdot (${texQ(c)}) = ${texQ(D)}`, op: w.quad.disc },
    );
    const r = roots();
    if (r) {
      const sd = surd(D);
      rows.push({ tex: `${v} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{${texQ(neg(b))} \\pm ${surdTex(sd.r, sd.m)}}{${texQ(mul(q(2), a))}}` });
      rows.push({ tex: rootsTex()!, color: C.green });
    }
    const ln = lines(rows, y);
    body.push(ln.svg);
    y += ln.h;
    rootsCaption();
    return compose(std, body.join(""), y, caps);
  }

  if (s.method === "square") {
    let B = b;
    let Cc = c;
    if (!eqQ(a, ONE)) {
      B = div(b, a);
      Cc = div(c, a);
      rows.push({ tex: `${polyTex([Cc, B, ONE], v)} = 0`, op: fill(w.ops.div, { t: plainQ(a), where: w.ops.both }) });
    }
    if (!isZero(Cc)) rows.push({ tex: `${polyTex([ZERO, B, ONE], v)} = ${texQ(neg(Cc))}`, op: fill(sign(Cc) > 0 ? w.ops.sub : w.ops.add, { t: plainQ(q(Math.abs(Cc.n), Cc.d)), where: w.ops.both }) });
    const half = div(B, q(2));
    const sq = mul(half, half);
    const Rr = add(neg(Cc), sq);
    const halfTex = `\\left(${texQ(half)}\\right)^2`;
    if (!isZero(B)) {
      rows.push({ tex: `${polyTex([ZERO, B, ONE], v)} + ${halfTex} = ${texQ(neg(Cc))} + ${halfTex}`, op: fill(w.ops.add, { t: `(${plainQ(half)})²`, where: w.ops.both }) });
      rows.push({ tex: `\\left(${polyTex([half, ONE], v)}\\right)^2 = ${texQ(Rr)}` });
    }
    const r = roots();
    if (r) {
      const sd = surd(Rr);
      rows.push({ tex: `${polyTex([half, ONE], v)} = \\pm ${surdTex(sd.r, sd.m)}` });
      rows.push({ tex: rootsTex()!, color: C.green });
    }
    const ln = lines(rows, y);
    body.push(ln.svg);
    y += ln.h + 10;
    if (!isZero(B)) {
      // The square: x by x, two strips of B/2 by x, and the missing corner (B/2)².
      const X = 110;
      const H = Math.max(26, Math.min(70, (Math.abs(num(half)) / Math.max(1, Math.abs(num(half)) + 2)) * 110));
      const x0 = W / 2 - (X + H) / 2;
      const neg2 = sign(half) < 0;
      body.push(
        `<rect x="${r2(x0)}" y="${y}" width="${X}" height="${X}" fill="#d0ebff" stroke="${C.blue}" stroke-width="1.5"/>`,
        `<rect x="${r2(x0 + X)}" y="${y}" width="${r2(H)}" height="${X}" fill="#d3f9d8" stroke="${C.green}" stroke-width="1.5"/>`,
        `<rect x="${r2(x0)}" y="${r2(y + X)}" width="${X}" height="${r2(H)}" fill="#d3f9d8" stroke="${C.green}" stroke-width="1.5"/>`,
        `<rect x="${r2(x0 + X)}" y="${r2(y + X)}" width="${r2(H)}" height="${r2(H)}" fill="#fff4e6" stroke="${C.orange}" stroke-width="1.8" stroke-dasharray="5 3"/>`,
        lbl(x0 + X / 2, y + X / 2 + 5, `${v}²`, C.blue, "middle", 15),
        lbl(x0 + X + H / 2, y + X / 2 + 5, `${plainQ(q(Math.abs(half.n), half.d))}${v}`, C.green, "middle", 12),
        lbl(x0 + X / 2, y + X + H / 2 + 5, `${plainQ(q(Math.abs(half.n), half.d))}${v}`, C.green, "middle", 12),
        lbl(x0 + X + H / 2, y + X + H / 2 + 4, `(${plainQ(q(Math.abs(half.n), half.d))})²`, C.orange, "middle", 10, false),
        txt(x0 + X / 2, y - 4, v, { anchor: "middle", italic: true, size: 12, color: "#495057" }),
        txt(x0 + X + H / 2, y - 4, plainQ(q(Math.abs(half.n), half.d)), { anchor: "middle", size: 11, color: "#495057" }),
        txt(x0 + X + H + 8, y + X + H + 4, w.quad.notToScale, { size: 10.5, color: "#868e96" }),
      );
      y += X + H + 12;
      caps.push({ text: fill(neg2 ? w.quad.pictureNeg : w.quad.picture, { h: plainQ(q(Math.abs(half.n), half.d)), v }), color: "#495057" });
    }
    rootsCaption();
    return compose(std, body.join(""), y, caps);
  }

  // Vertex form a(x − h)² + k, and the parabola.
  const kV = peval(P, hV);
  const inner = polyTex([neg(hV), ONE], v);
  const aTex = eqQ(a, ONE) ? "" : eqQ(a, q(-1)) ? "-" : texQ(a);
  rows.push(
    { tex: `h = -\\frac{b}{2a} = ${texQ(hV)}, \\quad k = f(h) = ${texQ(kV)}`, op: w.quad.vertexForm },
    { tex: `${polyTex(P, v)} = ${aTex}\\left(${inner}\\right)^2 ${isZero(kV) ? "" : sign(kV) > 0 ? `+ ${texQ(kV)}` : `- ${texQ(neg(kV))}`}`, color: C.green },
  );
  const ln = lines(rows, y);
  body.push(ln.svg);
  y += ln.h + 8;
  const r = roots();
  const rootNums = !r ? [] : Array.isArray(r) ? r.map(num) : [num(r.p) - Math.sqrt(r.m) * num(r.r), num(r.p) + Math.sqrt(r.m) * num(r.r)];
  const h = num(hV);
  const k = num(kV);
  const spread = Math.max(3, ...rootNums.map((x) => Math.abs(x - h) * 1.4), Math.abs(h) * 1.15 - Math.abs(h) + 3);
  const xr: [number, number] = [h - spread, h + spread];
  const fy = (x: number) => num(a) * (x - h) ** 2 + k;
  const ys = [k, fy(xr[0]), num(c), 0];
  const yr: [number, number] = [Math.min(...ys), Math.max(...ys)];
  const pad = (yr[1] - yr[0]) * 0.12 || 1;
  const fr = makeFrame("q-par", 48, y, W - 48 - 24, 260, xr, [yr[0] - pad, yr[1] + pad]);
  body.push(
    axes(fr),
    `<line x1="${r2(fr.sx(h))}" y1="${fr.top}" x2="${r2(fr.sx(h))}" y2="${fr.bottom}" stroke="${C.purple}" stroke-dasharray="6 4" stroke-width="1.4"/>`,
    curve(fr, fy, C.blue, 2.6),
    `<circle cx="${r2(fr.sx(h))}" cy="${r2(fr.sy(k))}" r="5" fill="${C.red}"/>`,
    lbl(fr.sx(h) + 8, fr.sy(k) + (num(a) > 0 ? 18 : -10), `(${minus(nf(h, 3))}, ${minus(nf(k, 3))})`, C.red, "start", 12, false),
  );
  if (xr[0] <= 0 && 0 <= xr[1]) body.push(`<circle cx="${r2(fr.sx(0))}" cy="${r2(fr.sy(num(c)))}" r="4" fill="${C.orange}"/>`);
  for (const x of rootNums) body.push(`<circle cx="${r2(fr.sx(x))}" cy="${r2(fr.sy(0))}" r="4.5" fill="#ffffff" stroke="${C.green}" stroke-width="2.4"/>`);
  y += 260 + 8;
  caps.push(
    { text: fill(w.quad.vertex, { h: plainQ(hV), k: plainQ(kV) }), color: C.red },
    { text: fill(w.quad.axis, { v, h: plainQ(hV) }) + " " + (sign(a) > 0 ? w.quad.opens.up : w.quad.opens.down), color: C.purple },
    { text: fill(w.quad.yint, { c: plainQ(c) }), color: C.orange },
  );
  rootsCaption();
  return compose(std, body.join(""), y, caps);
}

// ---------- entry ----------

export function renderAlgebra(spec: AlgebraSpec, w: AlgebraWords): RenderedSvg {
  words = w;
  switch (spec.topic) {
    case "linear":
      return renderLinear(spec, w);
    case "inequality":
      return renderInequality(spec, w);
    case "expand":
      return renderExpand(spec, w);
    case "factor":
      return renderFactor(spec, w);
    case "quadratic":
      return renderQuadratic(spec, w);
  }
}

/** For tests: the linear factors the ac method finds (as [constant, coefficient]), or null if it finds none. */
export function algebraFactors(src: string, w: AlgebraWords): [number, number][] | null {
  words = w;
  const ctx = { v: "" };
  const f = factorSteps(parsePoly(normal(src), ctx), ctx.v || "x", w, 0);
  return f.ok ? f.linear : null;
}

/** For tests: the polynomial a string stands for. */
export function algebraPoly(src: string, w: AlgebraWords): { coeffs: number[]; v: string } {
  words = w;
  const ctx = { v: "" };
  return { coeffs: parsePoly(normal(src), ctx).map(num), v: ctx.v || "x" };
}

const P = (topic: AlgebraTopic, eq: string, method: QuadMethod = "factor"): AlgebraSpec => ({ topic, eq, method });
export const ALGEBRA_PRESETS: { [K in AlgebraTopic]: { label: string; spec: AlgebraSpec }[] } = {
  linear: [
    { label: "3x + 5 = x + 11", spec: P("linear", "3x + 5 = x + 11") },
    { label: "2x + 3 = 11", spec: P("linear", "2x + 3 = 11") },
    { label: "5(x − 2) = 3x + 4", spec: P("linear", "5(x - 2) = 3x + 4") },
    { label: "x/2 + 1/3 = 2", spec: P("linear", "x/2 + 1/3 = 2") },
    { label: "7 − 2y = 3y − 8", spec: P("linear", "7 - 2y = 3y - 8") },
    { label: "2(x + 3) = 2x + 6", spec: P("linear", "2(x + 3) = 2x + 6") },
    { label: "x + 1 = x + 2", spec: P("linear", "x + 1 = x + 2") },
  ],
  inequality: [
    { label: "3x − 4 < 2x + 1", spec: P("inequality", "3x - 4 < 2x + 1") },
    { label: "5 − 2x ≥ 11 (flip)", spec: P("inequality", "5 - 2x >= 11") },
    { label: "−3 < 2x + 1 ≤ 7", spec: P("inequality", "-3 < 2x + 1 <= 7") },
    { label: "4 ≥ (1 − x)/2 > −1", spec: P("inequality", "4 >= (1 - x)/2 > -1") },
  ],
  expand: [
    { label: "(2x + 3)(x − 4)", spec: P("expand", "(2x + 3)(x - 4)") },
    { label: "(x + 5)²", spec: P("expand", "(x + 5)^2") },
    { label: "(x − 3)(x + 3)", spec: P("expand", "(x - 3)(x + 3)") },
    { label: "(x + 2)(x² − x + 4)", spec: P("expand", "(x + 2)(x^2 - x + 4)") },
    { label: "2(x + 1)(x − 5)", spec: P("expand", "2(x + 1)(x - 5)") },
    { label: "(x + 1)³", spec: P("expand", "(x + 1)^3") },
  ],
  factor: [
    { label: "x² + 5x + 6", spec: P("factor", "x^2 + 5x + 6") },
    { label: "6x² + 11x − 10", spec: P("factor", "6x^2 + 11x - 10") },
    { label: "2x² − 8x − 42", spec: P("factor", "2x^2 - 8x - 42") },
    { label: "4x² − 9", spec: P("factor", "4x^2 - 9") },
    { label: "9x² − 12x + 4", spec: P("factor", "9x^2 - 12x + 4") },
    { label: "6x² + 9x", spec: P("factor", "6x^2 + 9x") },
    { label: "x² + x + 1", spec: P("factor", "x^2 + x + 1") },
  ],
  quadratic: [
    { label: "x² − 5x + 6 = 0", spec: P("quadratic", "x^2 - 5x + 6 = 0", "factor") },
    { label: "2x² + 3x = 2", spec: P("quadratic", "2x^2 + 3x = 2", "factor") },
    { label: "x² + 6x − 7 = 0 · square", spec: P("quadratic", "x^2 + 6x - 7 = 0", "square") },
    { label: "x² − 4x − 1 = 0 · square", spec: P("quadratic", "x^2 - 4x - 1 = 0", "square") },
    { label: "3x² − 5x − 1 = 0 · formula", spec: P("quadratic", "3x^2 - 5x - 1 = 0", "formula") },
    { label: "x² + 2x + 5 = 0 · formula", spec: P("quadratic", "x^2 + 2x + 5 = 0", "formula") },
    { label: "−x² + 4x + 5 · vertex", spec: P("quadratic", "-x^2 + 4x + 5 = 0", "vertex") },
    { label: "2x² − 4x − 6 · vertex", spec: P("quadratic", "2x^2 - 4x - 6 = 0", "vertex") },
  ],
};
