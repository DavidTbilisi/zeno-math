// Integration techniques with every step: u-substitution (the x-area equals the u-area),
// integration by parts (DI table, LIATE, the cyclic case), partial fractions (exact decomposition
// of any rational function whose denominator splits over Q, plus one irreducible quadratic) and
// trigonometric substitution (with the reference triangle). Every answer is checked numerically:
// differentiating F must give back f, and definite values are compared with Simpson's rule.
import { compile, parse, rationalize } from "mathjs";
import { Frac } from "./fraction";
import type { RenderedSvg } from "./latex";
import {
  axes,
  C,
  compose,
  curve,
  fill,
  FONT,
  lbl,
  makeFrame,
  nt,
  r2,
  sampleY,
  simpson,
  texAt,
  tn,
  vline,
  yRange,
  type Caption,
} from "./chart";

export type SubOuter = "power" | "exp" | "sin" | "cos" | "recip";
export type PartsKind = "exp" | "sin" | "cos" | "ln" | "expsin" | "expcos";
export type TrigForm = "asin" | "sqrtA" | "atan" | "asinh" | "acosh" | "x2sqrt";
export const SUB_OUTERS: SubOuter[] = ["power", "exp", "sin", "cos", "recip"];
export const PARTS_KINDS: PartsKind[] = ["exp", "sin", "cos", "ln", "expsin", "expcos"];
export const TRIG_FORMS: TrigForm[] = ["asin", "sqrtA", "atan", "asinh", "acosh", "x2sqrt"];

/** ∫ c·x^(m−1)·outer(a·x^m + b) dx */
export type SubSpec = { topic: "sub"; outer: SubOuter; c: string; a: string; m: number; b: string; n: string; lo: string; hi: string };
export type PartsSpec = { topic: "parts"; kind: PartsKind; n: number; a: string; b: string; lo: string; hi: string };
export type PartialSpec = { topic: "partial"; num: string; den: string; lo: string; hi: string };
export type TrigSpec = { topic: "trig"; form: TrigForm; a: string; lo: string; hi: string };
export type IntegralSpec = SubSpec | PartsSpec | PartialSpec | TrigSpec;
export type IntTopic = IntegralSpec["topic"];
export type IntSpecOf<K extends IntTopic> = Extract<IntegralSpec, { topic: K }>;
export const INT_TOPICS: IntTopic[] = ["sub", "parts", "partial", "trig"];

export type IntWords = {
  checked: string;
  checkFail: string;
  definite: string;
  improper: string;
  sameArea: string;
  badNumber: string;
  badPoly: string;
  notFactorable: string;
  zeroA: string;
  divideFirst: string;
  diHint: string;
  liate: string;
  cyclic: string;
  triangle: string;
};

/** Plain-text labels for the example chips (maths, so no translation needed). */
export const INT_PRESETS: { [K in IntTopic]: { label: string; spec: IntSpecOf<K> }[] } = {
  sub: [
    { label: "∫ 2x(x² + 1)⁵ dx", spec: { topic: "sub", outer: "power", c: "2", a: "1", m: 2, b: "1", n: "5", lo: "0", hi: "1" } },
    { label: "∫ x² e^(x³) dx", spec: { topic: "sub", outer: "exp", c: "1", a: "1", m: 3, b: "0", n: "1", lo: "0", hi: "1" } },
    { label: "∫ x cos(x²) dx", spec: { topic: "sub", outer: "cos", c: "1", a: "1", m: 2, b: "0", n: "1", lo: "0", hi: "sqrt(pi/2)" } },
    { label: "∫ x / (x² + 4) dx", spec: { topic: "sub", outer: "recip", c: "1", a: "1", m: 2, b: "4", n: "1", lo: "0", hi: "2" } },
    { label: "∫ x √(1 + x²) dx", spec: { topic: "sub", outer: "power", c: "1", a: "1", m: 2, b: "1", n: "1/2", lo: "0", hi: "2" } },
    { label: "∫ sin(3x + 1) dx", spec: { topic: "sub", outer: "sin", c: "1", a: "3", m: 1, b: "1", n: "1", lo: "", hi: "" } },
  ],
  parts: [
    { label: "∫ x eˣ dx", spec: { topic: "parts", kind: "exp", n: 1, a: "1", b: "1", lo: "0", hi: "1" } },
    { label: "∫ x² sin x dx", spec: { topic: "parts", kind: "sin", n: 2, a: "1", b: "1", lo: "0", hi: "pi" } },
    { label: "∫ x cos 2x dx", spec: { topic: "parts", kind: "cos", n: 1, a: "2", b: "1", lo: "", hi: "" } },
    { label: "∫ x³ e^(2x) dx", spec: { topic: "parts", kind: "exp", n: 3, a: "2", b: "1", lo: "", hi: "" } },
    { label: "∫ ln x dx", spec: { topic: "parts", kind: "ln", n: 0, a: "1", b: "1", lo: "1", hi: "e" } },
    { label: "∫ x² ln x dx", spec: { topic: "parts", kind: "ln", n: 2, a: "1", b: "1", lo: "1", hi: "2" } },
    { label: "∫ eˣ sin x dx", spec: { topic: "parts", kind: "expsin", n: 0, a: "1", b: "1", lo: "0", hi: "pi" } },
    { label: "∫ e^(2x) cos 3x dx", spec: { topic: "parts", kind: "expcos", n: 0, a: "2", b: "3", lo: "", hi: "" } },
  ],
  partial: [
    { label: "∫ 1 / ((x − 1)(x + 2)) dx", spec: { topic: "partial", num: "1", den: "(x - 1)(x + 2)", lo: "2", hi: "3" } },
    { label: "∫ (3x + 5) / (x² + x − 2) dx", spec: { topic: "partial", num: "3x + 5", den: "x^2 + x - 2", lo: "", hi: "" } },
    { label: "∫ (x² + 1) / (x(x − 1)²) dx", spec: { topic: "partial", num: "x^2 + 1", den: "x(x - 1)^2", lo: "2", hi: "3" } },
    { label: "∫ x³ / (x² − 1) dx", spec: { topic: "partial", num: "x^3", den: "x^2 - 1", lo: "", hi: "" } },
    { label: "∫ (2x + 3) / ((x − 1)(x² + 1)) dx", spec: { topic: "partial", num: "2x + 3", den: "(x - 1)(x^2 + 1)", lo: "", hi: "" } },
    { label: "∫ 1 / (x² + 2x + 5) dx", spec: { topic: "partial", num: "1", den: "x^2 + 2x + 5", lo: "-1", hi: "1" } },
  ],
  trig: [
    { label: "∫ 1 / √(4 − x²) dx", spec: { topic: "trig", form: "asin", a: "2", lo: "0", hi: "1" } },
    { label: "∫ √(9 − x²) dx", spec: { topic: "trig", form: "sqrtA", a: "3", lo: "-3", hi: "3" } },
    { label: "∫ 1 / (1 + x²) dx", spec: { topic: "trig", form: "atan", a: "1", lo: "0", hi: "1" } },
    { label: "∫ 1 / √(x² + 4) dx", spec: { topic: "trig", form: "asinh", a: "2", lo: "", hi: "" } },
    { label: "∫ 1 / √(x² − 1) dx", spec: { topic: "trig", form: "acosh", a: "1", lo: "2", hi: "3" } },
    { label: "∫ 1 / (x² √(4 − x²)) dx", spec: { topic: "trig", form: "x2sqrt", a: "2", lo: "1", hi: "sqrt(2)" } },
  ],
};

// ---------- exact numbers and TeX ----------

function frac(s: string, w: IntWords): Frac {
  const f = Frac.parse(s);
  if (!f) throw new Error(fill(w.badNumber, { s }));
  return f;
}

/** A float that is really a simple fraction (from mathjs coefficients) back to a Frac. */
function toFrac(x: number, w: IntWords): Frac {
  if (Number.isInteger(x)) return new Frac(x);
  let [h1, h0, k1, k0, b] = [1, 0, 0, 1, Math.abs(x)];
  for (let i = 0; i < 25; i++) {
    const ai = Math.floor(b);
    [h1, h0] = [ai * h1 + h0, h1];
    [k1, k0] = [ai * k1 + k0, k1];
    if (k1 > 100000) break;
    if (Math.abs(Math.abs(x) - h1 / k1) < 1e-9) return new Frac(Math.sign(x) * h1, k1);
    b = 1 / (b - ai);
  }
  throw new Error(w.badPoly);
}

const fj = (f: Frac) => `(${f.n}/${f.d})`;
const isMinusOne = (f: Frac) => f.n === -1 && f.d === 1;

/** c · body in TeX ("" = just the number); 1 and −1 are left implicit. */
function scaled(c: Frac, body: string): string {
  if (!body) return c.tex();
  if (c.isOne()) return body;
  if (isMinusOne(c)) return "-" + body;
  return `${c.tex()}${/^[\d.]/.test(body) ? " \\cdot " : "\\,"}${body}`;
}
const sumTex = (terms: string[]) => (terms.filter(Boolean).join(" + ").replace(/\+ -/g, "- ") || "0");
const xPow = (k: number, v = "x") => (k === 0 ? "" : k === 1 ? v : `${v}^{${k}}`);

type Poly = Frac[]; // ascending coefficients

const trim = (p: Poly): Poly => {
  const q = p.slice();
  while (q.length > 1 && q[q.length - 1].isZero()) q.pop();
  return q.length ? q : [Frac.ZERO];
};
const deg = (p: Poly) => trim(p).length - 1;
const isZeroP = (p: Poly) => p.every((c) => c.isZero());
function polyTex(p: Poly, v = "x"): string {
  const terms: string[] = [];
  for (let k = p.length - 1; k >= 0; k--) if (!p[k].isZero()) terms.push(scaled(p[k], xPow(k, v)));
  return sumTex(terms);
}
const polyJs = (p: Poly) => p.map((c, k) => (c.isZero() ? "" : `${fj(c)}*x^${k}`)).filter(Boolean).join(" + ") || "0";
const nonzeroTerms = (p: Poly) => p.filter((c) => !c.isZero()).length;
/** p(x) · fn, e.g. "(x^{2} - 2x + 2)e^{x}" or "3x\,e^{x}". */
function polyTimes(p: Poly, fn: string): string {
  if (isZeroP(p)) return "";
  if (nonzeroTerms(p) === 1) {
    const k = p.findIndex((c) => !c.isZero());
    return scaled(p[k], k ? `${xPow(k)}\\,${fn}` : fn);
  }
  return `\\left(${polyTex(p)}\\right)${fn}`;
}
const pmul = (a: Poly, b: Poly): Poly => {
  const r = Array.from({ length: a.length + b.length - 1 }, () => Frac.ZERO);
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] = r[i + j].add(x.mul(y)))));
  return r;
};
const pscale = (p: Poly, c: Frac) => p.map((x) => x.mul(c));
const evalP = (p: Poly, x: Frac) => p.reduceRight((acc, c) => acc.mul(x).add(c), Frac.ZERO);
function pdivmod(n: Poly, d: Poly): [Poly, Poly] {
  const r = trim(n).slice();
  const dd = trim(d);
  const q = Array.from({ length: Math.max(1, r.length - dd.length + 1) }, () => Frac.ZERO);
  for (let k = r.length - dd.length; k >= 0; k--) {
    const c = r[k + dd.length - 1].div(dd[dd.length - 1]);
    q[k] = c;
    dd.forEach((x, i) => (r[k + i] = r[k + i].sub(c.mul(x))));
  }
  return [trim(q), trim(r.slice(0, Math.max(1, dd.length - 1)))];
}

/** x − r as TeX / mathjs. */
const linTex = (r: Frac) => (r.isZero() ? "x" : `x ${r.isNeg() ? "+" : "-"} ${r.abs().tex()}`);
const linJs = (r: Frac) => `(x - ${fj(r)})`;
/** (x − r)^j, with parentheses only when needed. */
const linPow = (r: Frac, j: number) => (r.isZero() ? xPow(j) : j === 1 ? `(${linTex(r)})` : `(${linTex(r)})^{${j}}`);
const argTex = (a: Frac) => (a.isOne() ? "x" : scaled(a, "x"));
const trigTex = (fn: "sin" | "cos", a: Frac) => (a.isOne() || (a.isInt() && !a.isNeg()) ? `\\${fn} ${argTex(a)}` : `\\${fn}\\left(${argTex(a)}\\right)`);
const expTex = (a: Frac) => `e^{${argTex(a)}}`;

// ---------- evaluation helpers ----------

function fnOf(expr: string): (x: number) => number {
  const code = compile(expr);
  return (x) => {
    try {
      const y = code.evaluate({ x });
      return typeof y === "number" ? y : NaN;
    } catch {
      return NaN;
    }
  };
}

type Bound = { v: number; tex: string } | null;
function bound(s: string, w: IntWords): Bound {
  if (!s.trim()) return null;
  let v: unknown;
  try {
    v = compile(s).evaluate({});
  } catch {
    v = NaN;
  }
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(fill(w.badNumber, { s }));
  const f = Frac.parse(s);
  return { v, tex: f ? f.tex() : parse(s).toTex({ parenthesis: "auto", implicit: "hide" }) };
}

/** F′ = f at sample points (central differences). */
function verify(f: (x: number) => number, F: (x: number) => number, x0: number, x1: number): boolean {
  let checked = 0;
  for (let i = 1; i < 40; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.37)) / 40;
    const y = f(x);
    const h = 1e-5 * Math.max(1, Math.abs(x));
    const d = (F(x + h) - F(x - h)) / (2 * h);
    if (!Number.isFinite(y) || !Number.isFinite(d) || Math.abs(y) > 1e6) continue;
    if (Math.abs(d - y) > 1e-4 * Math.max(1, Math.abs(y))) return false;
    checked++;
  }
  return checked >= 3;
}

type Definite = { lo: NonNullable<Bound>; hi: NonNullable<Bound>; value: number; numeric: number; improper: boolean } | null;
function definite(f: (x: number) => number, F: (x: number) => number, lo: Bound, hi: Bound): Definite {
  if (!lo || !hi) return null;
  const value = F(hi.v) - F(lo.v);
  const numeric = simpson(f, lo.v, hi.v, 4000);
  // Undefined or unbounded on the way: improper.
  const ys = sampleY(f, lo.v, hi.v, 400);
  const improper = !Number.isFinite(numeric) || ys.some((y) => !Number.isFinite(y)) || !Number.isFinite(value);
  return { lo, hi, value, numeric, improper };
}

/** A panel with f, its axes and (for a definite integral) the shaded area. */
function areaPanel(id: string, left: number, top: number, w: number, h: number, f: (x: number) => number, [x0, x1]: number[], shade: [number, number] | null, name: string, color = C.blue): string {
  const fr = makeFrame(id, left, top, w, h, [x0, x1], yRange(sampleY(f, x0, x1, 500), [0]));
  const parts = [axes(fr)];
  if (shade) {
    const [a, b] = [Math.max(Math.min(...shade), x0), Math.min(Math.max(...shade), x1)];
    const pts: string[] = [];
    let ok = b > a;
    for (let i = 0; i <= 300 && ok; i++) {
      const x = a + ((b - a) * i) / 300;
      const y = f(x);
      if (!Number.isFinite(y)) ok = false;
      else pts.push(`${r2(fr.sx(x))},${r2(Math.min(Math.max(fr.sy(y), fr.top), fr.bottom))}`);
    }
    if (ok) parts.push(`<polygon points="${r2(fr.sx(a))},${r2(fr.sy(0))} ${pts.join(" ")} ${r2(fr.sx(b))},${r2(fr.sy(0))}" fill="#ffd8a8" opacity="0.8" stroke="${C.orange}" stroke-width="1"/>`);
  }
  parts.push(curve(fr, f, color, 2.6), lbl(fr.right - 6, fr.top + 16, name, color, "end", 13));
  return parts.join("");
}

const windowFor = (d: Definite, fallback: [number, number]): [number, number] => {
  if (!d) return fallback;
  const [a, b] = [Math.min(d.lo.v, d.hi.v), Math.max(d.lo.v, d.hi.v)];
  const pad = (b - a) * 0.35 || 1;
  return [a - pad, b + pad];
};

/** Header rows [lhs, rhs] → aligned LaTeX; plus the definite line and captions. */
function finish(
  rows: [string, string][],
  integrand: string,
  d: Definite,
  ok: boolean,
  body: string,
  bodyH: number,
  w: IntWords,
  extra: Caption[] = [],
): RenderedSvg {
  const all = rows.slice();
  if (d && !d.improper) all.push([`\\int_{${d.lo.tex}}^{${d.hi.tex}} ${integrand}\\,dx`, `= F(${d.hi.tex}) - F(${d.lo.tex}) \\approx ${tn(d.value)}`]);
  const tex = `\\begin{aligned} ${all.map(([l, r]) => `${l} &${r}`).join(" \\\\[3pt] ")} \\end{aligned}`;
  const captions: Caption[] = [...extra];
  if (d) captions.push(d.improper ? { text: w.improper, color: C.red } : { text: fill(w.definite, { v: nt(d.value), s: nt(d.numeric) }), color: C.orange });
  captions.push(ok ? { text: w.checked, color: C.green } : { text: w.checkFail, color: C.red });
  return compose(tex, body, bodyH, captions);
}

// ---------- u-substitution ----------

function renderSub(s: SubSpec, w: IntWords): RenderedSvg {
  const c = frac(s.c, w);
  const a = frac(s.a, w);
  const b = frac(s.b, w);
  const m = Math.max(1, Math.min(6, Math.round(s.m)));
  let outer = s.outer;
  const n = outer === "power" ? frac(s.n, w) : Frac.ONE;
  if (a.isZero() || c.isZero()) throw new Error(w.zeroA);
  if (outer === "power" && isMinusOne(n)) outer = "recip";

  const g: Poly = Array.from({ length: m + 1 }, (_, k) => (k === 0 ? b : k === m ? a : Frac.ZERO));
  const gT = polyTex(g);
  const gJ = polyJs(g);
  const gp = a.mul(new Frac(m)); // g′ = a·m·x^(m−1)
  const k = c.div(gp);
  const P = `\\left(${gT}\\right)`;
  const xm1 = xPow(m - 1);

  const outerX = { power: `${P}^{${n.tex()}}`, exp: `e^{${gT}}`, sin: `\\sin${P}`, cos: `\\cos${P}`, recip: "" }[outer];
  const integrand = outer === "recip" ? `\\frac{${scaled(c, xm1)}}{${gT}}` : sumTex([scaled(c, xm1 ? `${xm1}\\,${outerX}` : outerX)]);
  const outerU = { power: `u^{${n.tex()}}`, exp: "e^{u}", sin: "\\sin u", cos: "\\cos u", recip: "\\frac{1}{u}" }[outer];
  const n1 = n.add(Frac.ONE);
  const Fu = (v: string, paren: boolean) => {
    const V = paren ? `\\left(${v}\\right)` : v;
    return {
      power: scaled(k.div(n1), `${V}^{${n1.tex()}}`),
      exp: scaled(k, `e^{${v}}`),
      sin: scaled(k.neg(), `\\cos ${V}`),
      cos: scaled(k, `\\sin ${V}`),
      recip: scaled(k, `\\ln\\left|${v}\\right|`),
    }[outer];
  };
  const outerJ = (v: string) => ({ power: `(${v})^${fj(n)}`, exp: `exp(${v})`, sin: `sin(${v})`, cos: `cos(${v})`, recip: `1/(${v})` })[outer];
  const FJ = (v: string) =>
    ({
      power: `${fj(k.div(n1))}*(${v})^${fj(n1)}`,
      exp: `${fj(k)}*exp(${v})`,
      sin: `${fj(k.neg())}*cos(${v})`,
      cos: `${fj(k)}*sin(${v})`,
      recip: `${fj(k)}*log(abs(${v}))`,
    })[outer];
  const f = fnOf(`${fj(c)}*x^${m - 1}*${outerJ(gJ)}`);
  const F = fnOf(FJ(gJ));
  const fu = fnOf(`${fj(k)}*${outerJ("x")}`);

  const rows: [string, string][] = [
    [`u = ${gT}`, `\\quad\\Rightarrow\\quad du = ${scaled(gp, xm1)}\\,dx`],
    [`\\int ${integrand}\\,dx`, `= ${scaled(k, `\\int ${outerU}\\,du`)}`],
    ["", `= ${Fu("u", false)} + C`],
    ["", `= ${Fu(gT, true)} + C`],
  ];

  const lo = bound(s.lo, w);
  const hi = bound(s.hi, w);
  const d = definite(f, F, lo, hi);
  const [x0, x1] = windowFor(d, [-2, 2]);
  const ok = verify(f, F, x0, x1);

  // Left: area under f in x. Right: the same area under k·outer(u) between u(lo) and u(hi).
  const gv = fnOf(gJ);
  let uShade: [number, number] | null = null;
  let ur: [number, number];
  const extra: Caption[] = [];
  if (d && !d.improper) {
    const [u1, u2] = [gv(d.lo.v), gv(d.hi.v)];
    uShade = [u1, u2];
    const [ua, ub] = [Math.min(u1, u2), Math.max(u1, u2)];
    const pad = (ub - ua) * 0.35 || 1;
    ur = [ua - pad, ub + pad];
    const uTex = (x: Bound) => {
      const fx = Frac.parse(x ? (x === d.lo ? s.lo : s.hi) : "");
      return fx ? evalP(g, fx).tex() : tn(gv(x!.v));
    };
    rows.push([`\\int_{${d.lo.tex}}^{${d.hi.tex}} ${integrand}\\,dx`, `= ${scaled(k, `\\int_{${uTex(d.lo)}}^{${uTex(d.hi)}} ${outerU}\\,du`)}`]);
    extra.push({ text: fill(w.sameArea, { a: nt(d.lo.v, 3), b: nt(d.hi.v, 3), u1: nt(u1, 3), u2: nt(u2, 3) }) });
  } else {
    const us = sampleY(gv, x0, x1, 200).filter(Number.isFinite);
    ur = [Math.min(...us), Math.max(...us)];
    if (ur[1] - ur[0] < 1e-9) ur = [ur[0] - 1, ur[1] + 1];
  }
  const body =
    areaPanel("sx", 44, 6, 268, 250, f, [x0, x1], d && !d.improper ? [d.lo.v, d.hi.v] : null, "f(x)") +
    areaPanel("su", 360, 6, 262, 250, fu, ur, uShade, "g(u)", C.purple) +
    lbl(178, 286, "x", C.ink, "middle", 14) +
    lbl(491, 286, "u", C.purple, "middle", 14);
  return finish(rows, integrand, d, ok, body, 294, w, extra);
}

// ---------- integration by parts ----------

type Wave = { c: Frac; fn: "exp" | "sin" | "cos" };
const waveTex = (v: Wave, a: Frac) => scaled(v.c, v.fn === "exp" ? expTex(a) : trigTex(v.fn, a));
/** One antiderivative of c·e^(ax), c·sin(ax), c·cos(ax). */
function integrateWave(v: Wave, a: Frac): Wave {
  if (v.fn === "exp") return { c: v.c.div(a), fn: "exp" };
  if (v.fn === "sin") return { c: v.c.neg().div(a), fn: "cos" };
  return { c: v.c.div(a), fn: "sin" };
}

function renderParts(s: PartsSpec, w: IntWords): RenderedSvg {
  const a = frac(s.a, w);
  const n = Math.max(0, Math.min(6, Math.round(s.n)));
  if (a.isZero()) throw new Error(w.zeroA);
  const lo = bound(s.lo, w);
  const hi = bound(s.hi, w);
  const rows: [string, string][] = [];
  const cells: string[] = [];
  let integrand: string;
  let fJ: string;
  let FJ: string;
  let caption: string;
  let fallback: [number, number] = [-3, 3];

  if (s.kind === "exp" || s.kind === "sin" || s.kind === "cos") {
    // Tabular method: differentiate x^n down to 0, integrate the wave n + 1 times.
    const D: Poly[] = [];
    let p: Poly = Array.from({ length: n + 1 }, (_, k) => (k === n ? Frac.ONE : Frac.ZERO));
    for (let k = 0; k <= n + 1; k++) {
      D.push(p);
      p = p.length > 1 ? p.slice(1).map((c, i) => c.mul(new Frac(i + 1))) : [Frac.ZERO];
    }
    const I: Wave[] = [{ c: Frac.ONE, fn: s.kind }];
    for (let k = 0; k <= n; k++) I.push(integrateWave(I[k], a));
    // Collect Σ (−1)^k D_k · I_(k+1) by function.
    const acc: Record<Wave["fn"], Poly> = { exp: [Frac.ZERO], sin: [Frac.ZERO], cos: [Frac.ZERO] };
    for (let k = 0; k <= n; k++) {
      const term = pscale(D[k], I[k + 1].c.mul(new Frac(k % 2 ? -1 : 1)));
      const cur = acc[I[k + 1].fn];
      acc[I[k + 1].fn] = trim(Array.from({ length: Math.max(cur.length, term.length) }, (_, i) => (cur[i] ?? Frac.ZERO).add(term[i] ?? Frac.ZERO)));
    }
    const fnT = { exp: expTex(a), sin: trigTex("sin", a), cos: trigTex("cos", a) };
    const fnJ = { exp: `exp(${fj(a)}*x)`, sin: `sin(${fj(a)}*x)`, cos: `cos(${fj(a)}*x)` };
    integrand = n ? `${xPow(n)}\\,${fnT[s.kind]}` : fnT[s.kind];
    fJ = `x^${n}*${fnJ[s.kind]}`;
    const answer = sumTex((["exp", "sin", "cos"] as const).map((fn) => polyTimes(acc[fn], fnT[fn])));
    FJ = (["exp", "sin", "cos"] as const).map((fn) => `(${polyJs(acc[fn])})*${fnJ[fn]}`).join(" + ");
    const terms = Array.from({ length: n + 1 }, (_, k) => {
      const Dk = polyTex(D[k]);
      const Ik = waveTex(I[k + 1], a);
      return `${k % 2 ? "-" : "+"} ${nonzeroTerms(D[k]) > 1 || /^-/.test(Dk) ? `(${Dk})` : Dk} \\cdot ${/^-/.test(Ik) ? `\\left(${Ik}\\right)` : Ik}`;
    });
    rows.push(
      [`\\int ${integrand}\\,dx`, `= ${terms.join(" ").replace(/^\+ /, "")} + C`],
      ["", `= ${answer} + C`],
    );
    // DI table cells: D_k and I_k side by side.
    for (let k = 0; k <= n + 1; k++) cells.push(polyTex(D[k]), waveTex(I[k], a));
    caption = w.diHint;
  } else if (s.kind === "ln") {
    const n1 = new Frac(n + 1);
    const v = scaled(Frac.ONE.div(n1), xPow(n + 1));
    integrand = n ? `${xPow(n)}\\ln x` : "\\ln x";
    fJ = `x^${n}*log(x)`;
    FJ = `${fj(Frac.ONE.div(n1))}*x^${n + 1}*log(x) - ${fj(Frac.ONE.div(n1.mul(n1)))}*x^${n + 1}`;
    rows.push(
      [`\\int ${integrand}\\,dx`, `= uv - \\int v\\,du = ${v}\\ln x - \\int ${v}\\cdot\\frac{1}{x}\\,dx`],
      ["", `= ${v}\\ln x - ${scaled(Frac.ONE.div(n1), `\\int ${xPow(n) || "1"}\\,dx`)}`],
      ["", `= ${v}\\ln x - ${scaled(Frac.ONE.div(n1.mul(n1)), xPow(n + 1))} + C`],
    );
    cells.push("u = \\ln x", `dv = ${xPow(n) || "1"}\\,dx`, "du = \\frac{1}{x}\\,dx", `v = ${v}`);
    caption = w.liate;
    fallback = [0.02, 4];
  } else {
    const b = frac(s.b, w);
    if (b.isZero()) throw new Error(w.zeroA);
    const sin = s.kind === "expsin";
    const E = expTex(a);
    const S = trigTex("sin", b);
    const Co = trigTex("cos", b);
    const ia = Frac.ONE.div(a);
    const ba = b.div(a);
    const den = a.mul(a).add(b.mul(b));
    integrand = `${E}${sin ? S : Co}`;
    fJ = `exp(${fj(a)}*x)*${sin ? "sin" : "cos"}(${fj(b)}*x)`;
    FJ = sin
      ? `exp(${fj(a)}*x)*(${fj(a)}*sin(${fj(b)}*x) - ${fj(b)}*cos(${fj(b)}*x))/${fj(den)}`
      : `exp(${fj(a)}*x)*(${fj(a)}*cos(${fj(b)}*x) + ${fj(b)}*sin(${fj(b)}*x))/${fj(den)}`;
    const other = `\\int ${E}${sin ? Co : S}\\,dx`;
    const first = scaled(ia, `${E}${sin ? S : Co}`);
    const second = scaled(ia, `${E}${sin ? Co : S}`);
    const sq = ba.mul(ba);
    rows.push(
      ["I = \\int " + integrand + "\\,dx", `= ${sumTex([first, scaled(sin ? ba.neg() : ba, other)])}`],
      ["", `= ${sumTex([first, scaled(sin ? ba.neg() : ba, `\\left(${sumTex([second, scaled(sin ? ba : ba.neg(), "I")])}\\right)`)])}`],
      [`${scaled(Frac.ONE.add(sq), "I")}`, `= ${E}\\left(${sin ? sumTex([scaled(ia, S), scaled(b.div(a.mul(a)).neg(), Co)]) : sumTex([scaled(ia, Co), scaled(b.div(a.mul(a)), S)])}\\right)`],
      ["I", `= ${scaled(Frac.ONE.div(den), `${E}\\left(${sin ? sumTex([scaled(a, S), scaled(b.neg(), Co)]) : sumTex([scaled(a, Co), scaled(b, S)])}\\right)`)} + C`],
    );
    cells.push(`u = ${sin ? S : Co}`, `dv = ${E}\\,dx`, `du = ${scaled(sin ? b : b.neg(), sin ? Co : S)}\\,dx`, `v = ${scaled(ia, E)}`);
    caption = w.cyclic;
  }

  const f = fnOf(fJ);
  const F = fnOf(FJ);
  const d = definite(f, F, lo, hi);
  const xr = windowFor(d, fallback);
  const ok = verify(f, F, Math.max(xr[0], s.kind === "ln" ? 0.05 : -Infinity), xr[1]);

  // Left: the DI table (or u / dv grid). Right: the integrand and the area.
  const parts: string[] = [];
  let tableH: number;
  if (s.kind === "exp" || s.kind === "sin" || s.kind === "cos") {
    const rowsN = cells.length / 2;
    const rh = Math.min(44, 270 / rowsN);
    const top = 34;
    parts.push(
      lbl(120, 20, "D", C.blue, "middle", 16, false),
      lbl(250, 20, "I", C.purple, "middle", 16, false),
      `<line x1="40" y1="28" x2="320" y2="28" stroke="${C.grey}"/>`,
    );
    for (let k = 0; k < rowsN; k++) {
      const y = top + rh * (k + 0.5);
      parts.push(texAt(cells[2 * k], 120, y, "middle", 0.95, C.blue).svg, texAt(cells[2 * k + 1], 250, y, "middle", 0.95, C.purple).svg);
      if (k < rowsN - 1) {
        parts.push(
          `<line x1="160" y1="${r2(y + 6)}" x2="206" y2="${r2(y + rh - 6)}" stroke="${C.orange}" stroke-width="1.8" marker-end="url(#ia)"/>`,
          lbl(172, y + rh / 2 + 4, k % 2 ? "−" : "+", C.orange, "middle", 16, false),
        );
      }
    }
    parts.unshift(`<defs><marker id="ia" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${C.orange}"/></marker></defs>`);
    tableH = top + rh * rowsN + 6;
  } else {
    // 2 × 2 grid: u | dv over du | v.
    const [x0, xm, x2, y0, ym, y2] = [20, 170, 330, 30, 100, 170];
    parts.push(
      `<g stroke="${C.grey}" fill="none"><rect x="${x0}" y="${y0}" width="${x2 - x0}" height="${y2 - y0}" rx="8"/><line x1="${xm}" y1="${y0}" x2="${xm}" y2="${y2}"/><line x1="${x0}" y1="${ym}" x2="${x2}" y2="${ym}"/></g>`,
      texAt(cells[0], (x0 + xm) / 2, (y0 + ym) / 2, "middle", 0.95, C.blue).svg,
      texAt(cells[1], (xm + x2) / 2, (y0 + ym) / 2, "middle", 0.95, C.purple).svg,
      texAt(cells[2], (x0 + xm) / 2, (ym + y2) / 2, "middle", 0.95, C.blue).svg,
      texAt(cells[3], (xm + x2) / 2, (ym + y2) / 2, "middle", 0.95, C.purple).svg,
      `<text x="${(x0 + x2) / 2}" y="${y2 + 30}" text-anchor="middle" ${FONT} font-size="15" font-style="italic" fill="${C.ink}">∫ u dv = uv − ∫ v du</text>`,
    );
    tableH = 220;
  }
  const bodyH = Math.max(tableH, 256);
  parts.push(areaPanel("pp", 370, 6, 252, bodyH - 12, f, xr, d && !d.improper ? [d.lo.v, d.hi.v] : null, "f(x)"));
  return finish(rows, integrand, d, ok, parts.join(""), bodyH, w, [{ text: caption }]);
}

// ---------- partial fractions ----------

function polyOf(s: string, w: IntWords): Poly {
  let coeffs: number[];
  try {
    // "x(x - 1)^2" would parse as calling a function x; make the product explicit.
    const src = s.replace(/([x\d.)])\s*\(/g, "$1*(");
    const r = rationalize(src, {}, true) as unknown as { coefficients: number[]; variables: string[]; denominator: unknown };
    if (r.denominator || r.variables.some((v) => v !== "x")) throw new Error();
    coeffs = r.coefficients.length ? r.coefficients : [compile(src).evaluate({}) as number];
  } catch {
    throw new Error(w.badPoly);
  }
  return trim(coeffs.map((c) => toFrac(c, w)));
}

const divisors = (n: number) => {
  const out: number[] = [];
  for (let i = 1; i <= Math.min(n, 100000); i++) if (n % i === 0) out.push(i);
  return out;
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

type Factored = { lead: Frac; roots: { r: Frac; m: number }[]; quad: Poly | null };

/** Rational roots (with multiplicity) by the rational root theorem; one irreducible quadratic may remain. */
function factor(D: Poly, w: IntWords): Factored {
  const lead = D[D.length - 1];
  let p = pscale(D, Frac.ONE.div(lead));
  const roots: { r: Frac; m: number }[] = [];
  const push = (r: Frac) => {
    const e = roots.find((x) => x.r.sub(r).isZero());
    if (e) e.m++;
    else roots.push({ r, m: 1 });
  };
  while (deg(p) >= 1) {
    if (p[0].isZero()) {
      push(Frac.ZERO);
      p = p.slice(1);
      continue;
    }
    if (deg(p) === 1) {
      push(p[0].neg().div(p[1]));
      p = [Frac.ONE];
      break;
    }
    const L = p.reduce((l, c) => (l * c.d) / gcd(l, c.d), 1);
    const ints = p.map((c) => (c.n * L) / c.d);
    let found: Frac | null = null;
    outer: for (const pd of divisors(Math.abs(ints[0])))
      for (const qd of divisors(Math.abs(ints[ints.length - 1])))
        for (const sg of [1, -1]) {
          const cand = new Frac(sg * pd, qd);
          if (evalP(p, cand).isZero()) {
            found = cand;
            break outer;
          }
        }
    if (!found) break;
    push(found);
    p = pdivmod(p, [found.neg(), Frac.ONE])[0];
  }
  if (deg(p) === 0) return { lead, roots, quad: null };
  if (deg(p) === 2 && p[1].mul(p[1]).sub(new Frac(4).mul(p[0])).isNeg()) return { lead, roots, quad: p };
  throw new Error(w.notFactorable);
}

/** Solve a square linear system exactly. */
function solve(A: Frac[][], y: Frac[]): Frac[] {
  const n = y.length;
  const M = A.map((row, i) => [...row, y[i]]);
  for (let c = 0; c < n; c++) {
    const p = M.findIndex((row, i) => i >= c && !row[c].isZero());
    if (p < 0) throw new Error("singular");
    [M[c], M[p]] = [M[p], M[c]];
    const pv = M[c][c];
    M[c] = M[c].map((x) => x.div(pv));
    for (let i = 0; i < n; i++)
      if (i !== c && !M[i][c].isZero()) {
        const f = M[i][c];
        M[i] = M[i].map((x, j) => x.sub(f.mul(M[c][j])));
      }
  }
  return M.map((row) => row[n]);
}

const sqrtFrac = (f: Frac): Frac | null => {
  const [a, b] = [Math.round(Math.sqrt(f.n)), Math.round(Math.sqrt(f.d))];
  return a * a === f.n && b * b === f.d ? new Frac(a, b) : null;
};
const LETTERS = ["A", "B", "D", "E", "G", "H", "K", "M"];

function renderPartial(s: PartialSpec, w: IntWords): RenderedSvg {
  const N = polyOf(s.num, w);
  const Dp = polyOf(s.den, w);
  if (deg(Dp) < 1) throw new Error(w.badPoly);
  const { lead, roots, quad } = factor(Dp, w);
  const monic = pscale(Dp, Frac.ONE.div(lead));
  const [Pq, R] = pdivmod(pscale(N, Frac.ONE.div(lead)), monic);
  const improperFrac = deg(N) >= deg(Dp);

  // Unknowns: A/(x − r)^j for each root and power, then (Bx + D)/Q.
  type Term = { kind: "lin"; r: Frac; j: number } | { kind: "qx" } | { kind: "q1" };
  const terms: Term[] = [];
  for (const { r, m } of roots) for (let j = 1; j <= m; j++) terms.push({ kind: "lin", r, j });
  if (quad) terms.push({ kind: "qx" }, { kind: "q1" });
  const linearPart = roots.reduce<Poly>((acc, { r, m }) => Array.from({ length: m }).reduce<Poly>((p) => pmul(p, [r.neg(), Frac.ONE]), acc), [Frac.ONE]);
  const basis = terms.map((t) => {
    if (t.kind !== "lin") return pmul(linearPart, t.kind === "qx" ? [Frac.ZERO, Frac.ONE] : [Frac.ONE]);
    let p = quad ? quad.slice() : [Frac.ONE];
    for (const { r, m } of roots) for (let i = 0; i < (r.sub(t.r).isZero() ? m - t.j : m); i++) p = pmul(p, [r.neg(), Frac.ONE]);
    return p;
  });
  const size = deg(monic);
  const coef = solve(
    Array.from({ length: size }, (_, k) => basis.map((b) => b[k] ?? Frac.ZERO)),
    Array.from({ length: size }, (_, k) => R[k] ?? Frac.ZERO),
  );

  const qT = quad ? polyTex(quad) : "";
  const monicT = [...roots.map(({ r, m }) => linPow(r, m)), quad ? `(${qT})` : ""].join("").replace(/^\(([^()]*)\)$/, "$1");
  const factoredT = (lead.isOne() ? "" : isMinusOne(lead) ? "-" : lead.tex()) + monicT;
  const fracT = (c: Frac, den: string) => (c.isZero() ? "" : `${c.isNeg() ? "-" : ""}\\frac{${c.abs().n}}{${c.abs().d === 1 ? "" : c.abs().d}${den}}`);
  const letters: string[] = [];
  const setup: string[] = [];
  const decomp: string[] = [];
  const integral: string[] = [];
  const FJ: string[] = [];
  let li = 0;
  terms.forEach((t, i) => {
    if (t.kind === "lin") {
      const L = LETTERS[li++];
      letters.push(`${L} = ${coef[i].tex()}`);
      const den = linPow(t.r, t.j);
      setup.push(`\\frac{${L}}{${den.replace(/^\((.*)\)$/, "$1")}}`);
      decomp.push(fracT(coef[i], coef[i].abs().d === 1 ? den.replace(/^\((.*)\)$/, "$1") : den));
      if (coef[i].isZero()) return;
      if (t.j === 1) {
        integral.push(scaled(coef[i], `\\ln\\left|${linTex(t.r)}\\right|`));
        FJ.push(`${fj(coef[i])}*log(abs${linJs(t.r)})`);
      } else {
        const c2 = coef[i].div(new Frac(1 - t.j));
        const den2 = linPow(t.r, t.j - 1);
        integral.push(fracT(c2, c2.abs().d === 1 ? den2.replace(/^\((.*)\)$/, "$1") : den2));
        FJ.push(`${fj(c2)}/${linJs(t.r)}^${t.j - 1}`);
      }
    }
  });
  if (quad) {
    const [B, Dq] = [coef[terms.length - 2], coef[terms.length - 1]];
    const [L1, L2] = [LETTERS[li], LETTERS[li + 1]];
    letters.push(`${L1} = ${B.tex()}`, `${L2} = ${Dq.tex()}`);
    setup.push(`\\frac{${L1}x + ${L2}}{${qT}}`);
    if (!B.isZero() || !Dq.isZero()) decomp.push(`\\frac{${polyTex([Dq, B])}}{${qT}}`);
    // (Bx + D)/Q = (B/2)(2x + p)/Q + (D − Bp/2)/Q
    const [q0, p1] = [quad[0], quad[1]];
    const half = p1.div(new Frac(2));
    if (!B.isZero()) {
      integral.push(scaled(B.div(new Frac(2)), `\\ln\\left(${qT}\\right)`));
      FJ.push(`${fj(B.div(new Frac(2)))}*log(${polyJs(quad)})`);
    }
    const K = Dq.sub(B.mul(half));
    const s2 = q0.sub(half.mul(half));
    if (!K.isZero()) {
      const sr = sqrtFrac(s2);
      const inner = linTex(half.neg());
      if (sr) integral.push(scaled(K.div(sr), `\\arctan${sr.isOne() ? `\\left(${inner}\\right)` : `\\frac{${inner}}{${sr.tex()}}`}`));
      else integral.push(`${K.isNeg() ? "-" : ""}\\frac{${K.abs().tex()}}{\\sqrt{${s2.tex()}}}\\arctan\\frac{${inner}}{\\sqrt{${s2.tex()}}}`);
      FJ.push(`${fj(K)}/sqrt(${fj(s2)})*atan((x + ${fj(half)})/sqrt(${fj(s2)}))`);
    }
  }
  const Pint: Poly = [Frac.ZERO, ...Pq.map((c, k) => c.div(new Frac(k + 1)))];
  if (!isZeroP(Pq)) FJ.unshift(polyJs(Pint));

  const integrand = `\\frac{${polyTex(N)}}{${polyTex(Dp)}}`;
  const pT = isZeroP(Pq) ? "" : polyTex(Pq);
  const rT = `\\frac{${polyTex(R)}}{${monicT}}`;
  const rows: [string, string][] = [[integrand, `= ${improperFrac ? sumTex([pT, rT]) : `\\frac{${polyTex(N)}}{${factoredT}}`}`]];
  if (!isZeroP(R)) rows.push([rT, `= ${sumTex(setup)}, \\qquad ${letters.join(",\\ ")}`]);
  rows.push(["", `= ${sumTex([pT, ...decomp])}`], [`\\int ${integrand}\\,dx`, `= ${sumTex([isZeroP(Pint) ? "" : polyTex(Pint), ...integral])} + C`]);

  const f = fnOf(`(${polyJs(N)})/(${polyJs(Dp)})`);
  const F = fnOf(FJ.join(" + ") || "0");
  const lo = bound(s.lo, w);
  const hi = bound(s.hi, w);
  const d = definite(f, F, lo, hi);
  const rs = roots.map((x) => x.r.toNumber());
  const span = [...rs, ...(d ? [d.lo.v, d.hi.v] : [])];
  const x0 = Math.min(...span, 0) - 2.5;
  const x1 = Math.max(...span, 0) + 2.5;
  const ok = verify(f, F, x0, x1);
  const body =
    areaPanel("pf", 48, 6, 574, 280, f, [x0, x1], d && !d.improper ? [d.lo.v, d.hi.v] : null, "f(x)") +
    rs.map((r) => (r > x0 && r < x1 ? vline(makeFrame("pf", 48, 6, 574, 280, [x0, x1], [0, 1]), r, C.red, `stroke-dasharray="5 4" stroke-width="1.4"`) : "")).join("");
  return finish(rows, integrand, d, ok, body, 294, w, improperFrac ? [{ text: w.divideFirst }] : []);
}

// ---------- trigonometric substitution ----------

function renderTrig(s: TrigSpec, w: IntWords): RenderedSvg {
  const a = frac(s.a, w);
  if (!(a.toNumber() > 0)) throw new Error(w.zeroA);
  const A = a.tex();
  const a2 = a.mul(a);
  const A2 = a2.tex();
  const av = a.toNumber();
  const xa = a.isOne() ? "x" : `\\frac{x}{${A}}`;
  const sub = (fn: string) => scaled(a, fn);
  const inv = Frac.ONE.div(a);
  const inv2 = Frac.ONE.div(a2);
  const sq = { minus: `\\sqrt{${A2} - x^2}`, plus: `\\sqrt{x^2 + ${A2}}`, xminus: `\\sqrt{x^2 - ${A2}}` };
  let rows: [string, string][];
  let integrand: string;
  let fJ: string;
  let FJ: string;
  let tri: { hyp: string; opp: string; adj: string; rel: string };
  let fallback: [number, number];
  const aT = a.isInt() ? String(a.n) : `${a.n}/${a.d}`;
  const sinTri = { hyp: A, opp: "x", adj: sq.minus, rel: `sin θ = x / ${aT}` };
  const tanTri = { hyp: sq.plus, opp: "x", adj: A, rel: `tan θ = x / ${aT}` };

  switch (s.form) {
    case "asin":
      integrand = `\\frac{1}{${sq.minus}}`;
      fJ = `1/sqrt(${av * av} - x^2)`;
      FJ = `asin(x/${av})`;
      rows = [
        ["x", `= ${sub("\\sin\\theta")}, \\quad dx = ${sub("\\cos\\theta")}\\,d\\theta, \\quad ${sq.minus} = ${sub("\\cos\\theta")}`],
        [`\\int ${integrand}\\,dx`, `= \\int \\frac{${sub("\\cos\\theta")}}{${sub("\\cos\\theta")}}\\,d\\theta = \\int d\\theta = \\theta + C`],
        ["", `= \\arcsin ${xa} + C`],
      ];
      tri = sinTri;
      fallback = [-av * 1.2, av * 1.2];
      break;
    case "sqrtA":
      integrand = sq.minus;
      fJ = `sqrt(${av * av} - x^2)`;
      FJ = `${av * av}/2*asin(x/${av}) + x*sqrt(${av * av} - x^2)/2`;
      rows = [
        ["x", `= ${sub("\\sin\\theta")}, \\quad dx = ${sub("\\cos\\theta")}\\,d\\theta, \\quad ${sq.minus} = ${sub("\\cos\\theta")}`],
        [`\\int ${integrand}\\,dx`, `= ${scaled(a2, "\\int \\cos^2\\theta\\,d\\theta")} = ${scaled(a2.div(new Frac(2)), "\\left(\\theta + \\sin\\theta\\cos\\theta\\right)")} + C`],
        ["", `= ${scaled(a2.div(new Frac(2)), `\\arcsin ${xa}`)} + \\frac{x${sq.minus}}{2} + C`],
      ];
      tri = sinTri;
      fallback = [-av * 1.2, av * 1.2];
      break;
    case "atan":
      integrand = `\\frac{1}{x^2 + ${A2}}`;
      fJ = `1/(x^2 + ${av * av})`;
      FJ = `atan(x/${av})/${av}`;
      rows = [
        ["x", `= ${sub("\\tan\\theta")}, \\quad dx = ${sub("\\sec^2\\theta")}\\,d\\theta, \\quad x^2 + ${A2} = ${scaled(a2, "\\sec^2\\theta")}`],
        [`\\int ${integrand}\\,dx`, `= \\int \\frac{${sub("\\sec^2\\theta")}}{${scaled(a2, "\\sec^2\\theta")}}\\,d\\theta = ${scaled(inv, "\\theta")} + C`],
        ["", `= ${scaled(inv, `\\arctan ${xa}`)} + C`],
      ];
      tri = tanTri;
      fallback = [-3 * av, 3 * av];
      break;
    case "asinh":
      integrand = `\\frac{1}{${sq.plus}}`;
      fJ = `1/sqrt(x^2 + ${av * av})`;
      FJ = `log(abs(x + sqrt(x^2 + ${av * av})))`;
      rows = [
        ["x", `= ${sub("\\tan\\theta")}, \\quad dx = ${sub("\\sec^2\\theta")}\\,d\\theta, \\quad ${sq.plus} = ${sub("\\sec\\theta")}`],
        [`\\int ${integrand}\\,dx`, `= \\int \\frac{${sub("\\sec^2\\theta")}}{${sub("\\sec\\theta")}}\\,d\\theta = \\int \\sec\\theta\\,d\\theta = \\ln\\left|\\sec\\theta + \\tan\\theta\\right| + C`],
        ["", `= \\ln\\left|\\frac{${sq.plus} + x}{${A}}\\right| + C = \\ln\\left|x + ${sq.plus}\\right| + C'`],
      ];
      tri = tanTri;
      fallback = [-3 * av, 3 * av];
      break;
    case "acosh":
      integrand = `\\frac{1}{${sq.xminus}}`;
      fJ = `1/sqrt(x^2 - ${av * av})`;
      FJ = `log(abs(x + sqrt(x^2 - ${av * av})))`;
      rows = [
        ["x", `= ${sub("\\sec\\theta")}, \\quad dx = ${sub("\\sec\\theta\\tan\\theta")}\\,d\\theta, \\quad ${sq.xminus} = ${sub("\\tan\\theta")}`],
        [`\\int ${integrand}\\,dx`, `= \\int \\frac{${sub("\\sec\\theta\\tan\\theta")}}{${sub("\\tan\\theta")}}\\,d\\theta = \\int \\sec\\theta\\,d\\theta = \\ln\\left|\\sec\\theta + \\tan\\theta\\right| + C`],
        ["", `= \\ln\\left|\\frac{x + ${sq.xminus}}{${A}}\\right| + C = \\ln\\left|x + ${sq.xminus}\\right| + C'`],
      ];
      tri = { hyp: "x", opp: sq.xminus, adj: A, rel: `sec θ = x / ${aT}` };
      fallback = [av * 1.02, 4 * av];
      break;
    case "x2sqrt":
      integrand = `\\frac{1}{x^2${sq.minus}}`;
      fJ = `1/(x^2*sqrt(${av * av} - x^2))`;
      FJ = `-sqrt(${av * av} - x^2)/(${av * av}*x)`;
      rows = [
        ["x", `= ${sub("\\sin\\theta")}, \\quad dx = ${sub("\\cos\\theta")}\\,d\\theta, \\quad ${sq.minus} = ${sub("\\cos\\theta")}`],
        [`\\int ${integrand}\\,dx`, `= \\int \\frac{${sub("\\cos\\theta")}}{${scaled(a2, "\\sin^2\\theta")}\\cdot ${sub("\\cos\\theta")}}\\,d\\theta = ${scaled(inv2, "\\int \\csc^2\\theta\\,d\\theta")} = ${scaled(inv2.neg(), "\\cot\\theta")} + C`],
        ["", `= -\\frac{${sq.minus}}{${a2.isOne() ? "" : A2}x} + C`],
      ];
      tri = sinTri;
      fallback = [av * 0.05, av * 0.98];
      break;
  }

  const f = fnOf(fJ);
  const F = fnOf(FJ);
  const d = definite(f, F, bound(s.lo, w), bound(s.hi, w));
  const xr = windowFor(d, fallback);
  const ok = verify(f, F, xr[0], xr[1]);

  // The reference triangle: θ at the left, right angle at the bottom right.
  const [Ax, Ay, Bx, By, Cy] = [30, 236, 220, 236, 86];
  const body = [
    `<polygon points="${Ax},${Ay} ${Bx},${By} ${Bx},${Cy}" fill="#e7f5ff" stroke="${C.ink}" stroke-width="2"/>`,
    `<path d="M${Bx - 14},${By} v-14 h14" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`,
    `<path d="M${Ax + 34},${Ay} A34,34 0 0 0 ${r2(Ax + 34 * Math.cos(Math.atan2(By - Cy, Bx - Ax)))},${r2(Ay - 34 * Math.sin(Math.atan2(By - Cy, Bx - Ax)))}" fill="none" stroke="${C.orange}" stroke-width="1.8"/>`,
    texAt("\\theta", Ax + 48, Ay - 11, "middle", 1, C.orange).svg,
    texAt(tri.adj, (Ax + Bx) / 2, By + 20, "middle", 0.95, C.blue).svg,
    texAt(tri.opp, Bx + 8, (By + Cy) / 2, "start", 0.95, C.blue).svg,
    texAt(tri.hyp, (Ax + Bx) / 2 - 16, (Ay + Cy) / 2 - 16, "end", 0.95, C.blue).svg,
    areaPanel("tg", 370, 6, 252, 256, f, xr, d && !d.improper ? [d.lo.v, d.hi.v] : null, "f(x)"),
  ].join("");
  return finish(rows, integrand, d, ok, body, 270, w, [{ text: fill(w.triangle, { rel: tri.rel }) }]);
}

export function renderIntegral(spec: IntegralSpec, words: IntWords): RenderedSvg {
  switch (spec.topic) {
    case "sub":
      return renderSub(spec, words);
    case "parts":
      return renderParts(spec, words);
    case "partial":
      return renderPartial(spec, words);
    case "trig":
      return renderTrig(spec, words);
  }
}
