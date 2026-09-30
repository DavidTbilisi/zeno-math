// Complex numbers: the three forms (a + bi, r(cos θ + i sin θ), re^{iθ}) with |z|, arg z and the conjugate;
// + − × ÷ step by step with the pictures (parallelogram, lengths multiply and angles add); powers by De Moivre
// (and the cycle of iⁿ); n-th roots as a regular polygon; quadratics with a negative discriminant; and Euler's
// formula on the unit circle. Values are shown exactly when they are simple (√2/2, π/3), else to 4 decimals.
import { evaluate } from "mathjs";
import { axes, C, compose, curve, dot, fill, lbl, makeFrame, r2, W, yRange, type Caption, type Frame } from "./chart";
import type { RenderedSvg } from "./latex";
import { niceStep } from "./plot";
import { texBox } from "./logic";

export type CxTopic = "form" | "ops" | "powers" | "roots" | "quadratic" | "euler";
export const CX_TOPICS: CxTopic[] = ["form", "ops", "powers", "roots", "quadratic", "euler"];
export type CxOp = "+" | "-" | "*" | "/";
export const CX_OPS: CxOp[] = ["+", "-", "*", "/"];
/** z, w: complex inputs; n: the power or the number of roots; a, b, c: the quadratic; t: the angle for Euler. */
export type CxSpec = { topic: CxTopic; z: string; w: string; op: CxOp; n: string; a: string; b: string; c: string; t: string };

export type CxWords = {
  badNumber: string;
  divZero: string;
  badN: string;
  aZero: string;
  zeroArg: string;
  formCap: string;
  addCap: string;
  subCap: string;
  mulCap: string;
  divCap: string;
  powCap: string;
  iCycle: string;
  rootsCap: string;
  rootsCap2: string;
  quadNeg: string;
  quadPos: string;
  vieta: string;
  eulerCap: string;
  eulerPi: string;
  parabola: string;
};

// ---------- numbers ----------

type Cx = { re: number; im: number };
const EPS = 1e-9;
const cx = (re: number, im = 0): Cx => ({ re, im });
const add = (a: Cx, b: Cx) => cx(a.re + b.re, a.im + b.im);
const sub = (a: Cx, b: Cx) => cx(a.re - b.re, a.im - b.im);
const mul = (a: Cx, b: Cx) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const abs = (a: Cx) => Math.hypot(a.re, a.im);
const arg = (a: Cx) => Math.atan2(a.im, a.re);
const polar = (r: number, t: number) => cx(r * Math.cos(t), r * Math.sin(t));
const clean = (v: number) => (Math.abs(v) < 1e-10 ? 0 : v);

/** 3+4i, 2e^(iπ/3), 2∠60°, sqrt(-4), (1+i)^3 … read with mathjs. */
export function parseCx(s: string, w: CxWords): Cx {
  const src = s.trim();
  if (!src) throw new Error(fill(w.badNumber, { s }));
  const norm = (t: string) =>
    t
      .replace(/π/g, " pi ") // spaced, so "iπ" is i·pi and not a name "ipi"
      .replace(/√\s*\(/g, "sqrt(")
      .replace(/√\s*([\d.]+)/g, "sqrt($1)")
      .replace(/[·×]/g, "*")
      .replace(/[−–]/g, "-")
      .replace(/(\d+(?:\.\d+)?)\s*°/g, "($1*pi/180)");
  try {
    const angle = /^(.*?)\s*∠\s*(.+)$/.exec(src);
    const v = angle ? evaluate(`(${norm(angle[1] || "1")}) * (cos(${norm(angle[2])}) + i*sin(${norm(angle[2])}))`) : evaluate(norm(src), { cis: (t: number) => evaluate(`cos(${t}) + i*sin(${t})`) });
    if (typeof v === "number") return cx(v);
    if (v && typeof v === "object" && "re" in v && "im" in v) return cx(clean(v.re as number), clean(v.im as number));
  } catch {
    // fall through to the message below
  }
  throw new Error(fill(w.badNumber, { s }));
}

/** A rational p/q close to v, with a small denominator. */
function rat(v: number, maxQ = 12, maxP = 400): [number, number] | null {
  for (let q = 1; q <= maxQ; q++) {
    const p = Math.round(v * q);
    if (Math.abs(p) <= maxP && Math.abs(v - p / q) < EPS * Math.max(1, Math.abs(v))) return [p, q];
  }
  return null;
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

type Nice = { tex: string; text: string; exact: boolean };

/** v as an integer, a fraction, (p/q)√m, or a decimal. */
export function nice(v: number): Nice {
  if (Math.abs(v) < 1e-10) return { tex: "0", text: "0", exact: true };
  const sign = v < 0 ? "-" : "";
  const tsign = v < 0 ? "−" : "";
  const r = rat(Math.abs(v));
  if (r) {
    const [p, q] = r;
    return q === 1 ? { tex: `${sign}${p}`, text: `${tsign}${p}`, exact: true } : { tex: `${sign}\\frac{${p}}{${q}}`, text: `${tsign}${p}/${q}`, exact: true };
  }
  for (const m of [2, 3, 5, 6, 7, 10]) {
    const k = rat(Math.abs(v) / Math.sqrt(m), 12, 60);
    if (!k) continue;
    const [p, q] = k;
    const num = `${p === 1 ? "" : p}\\sqrt{${m}}`;
    const tnum = `${p === 1 ? "" : p}√${m}`;
    return q === 1 ? { tex: `${sign}${num}`, text: `${tsign}${tnum}`, exact: true } : { tex: `${sign}\\frac{${num}}{${q}}`, text: `${tsign}${tnum}/${q}`, exact: true };
  }
  const d = Math.abs(v).toFixed(4).replace(/\.?0+$/, "");
  return { tex: `${sign}${d}`, text: `${tsign}${d}`, exact: false };
}

/** a + bi with the usual shortcuts (i, −i, no "+ 0i"). */
function cxNice(z: Cx): Nice {
  const re = nice(z.re);
  const imAbs = nice(Math.abs(z.im));
  const exact = re.exact && imAbs.exact;
  if (Math.abs(z.im) < 1e-10) return re;
  const coef = (t: string) => (t === "1" ? "" : t);
  const iTex = `${coef(imAbs.tex)}i`;
  const iText = `${coef(imAbs.text)}i`;
  if (Math.abs(z.re) < 1e-10) return { tex: `${z.im < 0 ? "-" : ""}${iTex}`, text: `${z.im < 0 ? "−" : ""}${iText}`, exact };
  return { tex: `${re.tex} ${z.im < 0 ? "-" : "+"} ${iTex}`, text: `${re.text} ${z.im < 0 ? "−" : "+"} ${iText}`, exact };
}

/** An angle as a multiple of π when it is one (π/3, −3π/4), else in radians. */
function angNice(t: number): Nice & { deg: string } {
  const degV = (t * 180) / Math.PI;
  const dr = rat(degV, 4, 100000);
  const deg = (dr ? (dr[1] === 1 ? `${dr[0]}°` : `${(dr[0] / dr[1]).toFixed(2)}°`) : `${degV.toFixed(2)}°`).replace("-", "−");
  if (Math.abs(t) < 1e-10) return { tex: "0", text: "0", exact: true, deg: "0°" };
  const r = rat(t / Math.PI, 12, 200);
  if (r) {
    const [p, q] = r;
    const g = gcd(p, q);
    const [pp, qq] = [p / g, q / g];
    const s = pp < 0 ? "-" : "";
    const a = Math.abs(pp);
    const num = a === 1 ? "\\pi" : `${a}\\pi`;
    const tnum = a === 1 ? "π" : `${a}π`;
    return qq === 1 ? { tex: `${s}${num}`, text: `${s ? "−" : ""}${tnum}`, exact: true, deg } : { tex: `${s}\\frac{${num}}{${qq}}`, text: `${s ? "−" : ""}${tnum}/${qq}`, exact: true, deg };
  }
  const d = nice(t);
  return { ...d, deg };
}
/** r·e^{θi}, dropping a length of 1 and the whole factor when θ = 0. */
const expForm = (r: string, t: string) => (t === "0" ? r : `${r === "1" ? "" : r}\\,e^{${t} i}`);
/** z = a + bi = re^{θi}, without repeating itself when both forms read the same (z = 8). */
const zLine = (z: Cx, rn: Nice, tn: Nice) => {
  const e = expForm(rn.tex, tn.tex);
  const rect = cxNice(z).tex;
  return e === rect ? `z = ${rect}` : `z = ${rect} ${rn.exact && tn.exact ? "=" : "\\approx"} ${e}`;
};
/** An angle inside cos / sin: bracketed when negative. */
const ang = (t: string) => (t.startsWith("-") ? `\\left(${t}\\right)` : t);
const eq = (x: Nice) => (x.exact ? "=" : "\\approx");

// ---------- drawing ----------

const PLANE = 300;

/** A square complex plane around the origin that holds all the points. */
function plane(points: Cx[], left: number, top: number, size = PLANE, id = "cx"): Frame {
  const m = Math.max(1.2, ...points.map((p) => Math.max(Math.abs(p.re), Math.abs(p.im)))) * 1.22;
  return makeFrame(id, left, top, size, size, [-m, m], [-m, m]);
}

function planeAxes(f: Frame): string {
  // About six labelled ticks each way, so small planes are not crowded.
  const step = niceStep(f.x1 - f.x0, 6);
  const ticks: { v: number; label: string }[] = [];
  for (let x = Math.ceil(f.x0 / step) * step; x <= f.x1 + 1e-9; x += step) if (Math.abs(x) > step / 2) ticks.push({ v: x, label: nice(x).exact ? nice(x).text : x.toFixed(1) });
  return axes(f, { xTicks: ticks, yFormat: (y) => (Math.abs(Math.round(y / step) * step - y) < 1e-9 ? nice(y).text : "") }) + lbl(f.right - 4, f.sy(0) - 6, "Re", "#495057", "end", 12) + lbl(f.sx(0) + 6, f.top + 14, "Im", "#495057", "start", 12);
}

/** An arrow from a to b in plane coordinates. */
function arrow(f: Frame, a: Cx, b: Cx, color: string, width = 2.4, dash = false): string {
  const [x1, y1, x2, y2] = [f.sx(a.re), f.sy(a.im), f.sx(b.re), f.sy(b.im)];
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return dot(x2, y2, color, 3.5);
  const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
  const h = Math.min(10, len / 2);
  const [bx, by] = [x2 - ux * h, y2 - uy * h];
  return (
    `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(bx)}" y2="${r2(by)}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="6 4"` : ""}/>` +
    `<path d="M${r2(x2)} ${r2(y2)} L${r2(bx - uy * h * 0.45)} ${r2(by + ux * h * 0.45)} L${r2(bx + uy * h * 0.45)} ${r2(by - ux * h * 0.45)} Z" fill="${color}"/>`
  );
}

/** A label next to point p, pushed away from the origin. */
function pointLabel(f: Frame, p: Cx, text: string, color: string): string {
  const [x, y] = [f.sx(p.re), f.sy(p.im)];
  // Away from the origin, but flipped when it would run past the plane (into the steps).
  const wpx = text.length * 7.2;
  let right = p.re >= 0;
  if (right && x + 8 + wpx > f.right + 6) right = false;
  if (!right && x - 8 - wpx < f.left - 34) right = true;
  return lbl(x + (right ? 8 : -8), y + (p.im >= 0 ? -8 : 17), text, color, right ? "start" : "end", 13);
}

/** An angle arc from the positive real axis to angle t (radians), radius in pixels. */
function arc(f: Frame, t0: number, t1: number, rpx: number, color: string, width = 2): string {
  const [cxp, cyp] = [f.sx(0), f.sy(0)];
  const n = Math.max(2, Math.ceil(Math.abs(t1 - t0) / 0.08));
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / n;
    return `${r2(cxp + rpx * Math.cos(t))},${r2(cyp - rpx * Math.sin(t))}`;
  });
  return `<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
}

const circlePx = (f: Frame, r: number, color: string, extra = "") =>
  `<circle cx="${r2(f.sx(0))}" cy="${r2(f.sy(0))}" r="${r2(f.sx(r) - f.sx(0))}" fill="none" stroke="${color}" ${extra}/>`;

/** TeX lines in a column, each shrunk to the width if needed. */
function steps(lines: string[], x: number, y: number, maxW: number, scale = 0.95): { svg: string; h: number } {
  const parts: string[] = [];
  let yy = y;
  for (const l of lines) {
    let b = texBox(l, scale);
    if (b.w > maxW) b = texBox(l, (scale * maxW) / b.w);
    parts.push(b.at(x, yy + b.h / 2, "start"));
    yy += b.h + 12;
  }
  return { svg: parts.join(""), h: yy - y };
}

/** Plane on the left, steps on the right. */
function layout(planeSvg: string, lines: string[]): { svg: string; h: number } {
  const st = steps(lines, PLANE + 70, 8, W - PLANE - 90);
  return { svg: planeSvg + st.svg, h: Math.max(PLANE + 24, st.h + 8) };
}

// ---------- topics ----------

function renderForm(s: CxSpec, w: CxWords): RenderedSvg {
  const z = parseCx(s.z, w);
  const r = abs(z);
  const f = plane([z], 40, 8);
  const parts: string[] = [planeAxes(f)];
  const zc = cx(z.re, -z.im);
  const P = { x: f.sx(z.re), y: f.sy(z.im) };
  // Legs a and b, the conjugate, the angle.
  parts.push(`<line x1="${r2(P.x)}" y1="${r2(P.y)}" x2="${r2(P.x)}" y2="${r2(f.sy(0))}" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="5 4"/>`);
  parts.push(`<line x1="${r2(P.x)}" y1="${r2(P.y)}" x2="${r2(f.sx(0))}" y2="${r2(P.y)}" stroke="${C.green}" stroke-width="1.6" stroke-dasharray="5 4"/>`);
  if (Math.abs(z.im) > 1e-9) parts.push(arrow(f, cx(0), zc, "#adb5bd", 1.8, true), pointLabel(f, zc, "z̄", C.grey));
  if (r > 1e-9) parts.push(arc(f, 0, arg(z), 26, C.orange));
  parts.push(arrow(f, cx(0), z, C.blue, 2.8), pointLabel(f, z, `z = ${cxNice(z).text}`, C.blue));
  if (Math.abs(z.re) > 1e-12 && Math.abs(z.im) > 1e-12) parts.push(lbl(P.x, f.sy(0) + (z.im >= 0 ? 16 : -8), nice(z.re).text, C.red, "middle", 12, false));
  if (Math.abs(z.re) > 1e-12 && Math.abs(z.im) > 1e-12) parts.push(lbl(f.sx(0) + (z.re >= 0 ? -6 : 6), P.y + 4, nice(z.im).text, C.green, z.re >= 0 ? "end" : "start", 12, false));

  const rn = nice(r);
  const lines: string[] = [`z = ${cxNice(z).tex}`, `|z| = \\sqrt{a^2 + b^2} = \\sqrt{${nice(z.re * z.re).tex} + ${nice(z.im * z.im).tex}} ${eq(rn)} ${rn.tex}`];
  if (r < 1e-12) {
    lines.push(`\\arg z \\text{ undefined}`);
    const body = layout(parts.join(""), lines);
    return compose(`z = 0`, body.svg, body.h, [{ text: w.zeroArg, color: C.red }]);
  }
  const t = arg(z);
  const tn = angNice(t);
  // The angle: a reference angle from arctan, then the quadrant.
  if (Math.abs(z.re) > 1e-12 && Math.abs(z.im) > 1e-12) {
    const alpha = Math.atan(Math.abs(z.im / z.re));
    const an = angNice(alpha);
    lines.push(`\\alpha = \\arctan\\left|\\tfrac{b}{a}\\right| = \\arctan ${nice(Math.abs(z.im / z.re)).tex} ${eq(an)} ${an.tex}`);
    const q = z.re > 0 ? (z.im > 0 ? 1 : 4) : z.im > 0 ? 2 : 3;
    const rule = { 1: `\\theta = \\alpha`, 2: `\\theta = \\pi - \\alpha`, 3: `\\theta = -(\\pi - \\alpha)`, 4: `\\theta = -\\alpha` }[q];
    lines.push(`\\text{Q${["", "I", "II", "III", "IV"][q]}}: ${rule} ${eq(tn)} ${tn.tex} \\;(${tn.deg.replace("°", "^\\circ")})`);
  } else lines.push(`\\theta = \\arg z = ${tn.tex} \\;(${tn.deg.replace("°", "^\\circ")})`);
  lines.push(`z = ${rn.tex}\\left(\\cos ${ang(tn.tex)} + i \\sin ${ang(tn.tex)}\\right)`);
  lines.push(`z ${rn.exact && tn.exact ? "=" : "\\approx"} ${expForm(rn.tex, tn.tex)}`);
  lines.push(`\\bar z = ${cxNice(zc).tex}, \\quad z\\bar z = |z|^2 = ${nice(r * r).tex}`);
  const inv = cx(z.re / (r * r), -z.im / (r * r));
  lines.push(`\\frac{1}{z} = \\frac{\\bar z}{|z|^2} = ${cxNice(inv).tex}`);
  const body = layout(parts.join(""), lines);
  const approx = rn.exact && tn.exact ? "=" : "\\approx";
  return compose(`${cxNice(z).tex} ${approx} ${expForm(rn.tex, tn.tex)}`, body.svg, body.h, [{ text: w.formCap, color: "#495057" }]);
}

function renderOps(s: CxSpec, w: CxWords): RenderedSvg {
  const z = parseCx(s.z, w);
  const v = parseCx(s.w, w);
  const Z = cxNice(z).tex;
  const V = cxNice(v).tex;
  const wrapTex = (t: string) => `\\left(${t}\\right)`;
  const lines: string[] = [];
  let res: Cx;
  const caps: Caption[] = [];
  const [a, b, c, d] = [z.re, z.im, v.re, v.im];
  const n = (x: number) => nice(x).tex;
  // Negative numbers in brackets: 3 − (−2).
  const par = (x: number) => (x < -1e-12 ? `(${n(x)})` : n(x));
  const pts: Cx[] = [z, v];
  switch (s.op) {
    case "+":
      res = add(z, v);
      lines.push(`(${n(a)} + ${par(c)}) + (${n(b)} + ${par(d)})i`, `= ${cxNice(res).tex}`);
      caps.push({ text: w.addCap, color: "#495057" });
      break;
    case "-":
      res = sub(z, v);
      lines.push(`(${n(a)} - ${par(c)}) + (${n(b)} - ${par(d)})i`, `= ${cxNice(res).tex}`);
      caps.push({ text: w.subCap, color: "#495057" });
      pts.push(cx(-v.re, -v.im));
      break;
    case "*": {
      res = mul(z, v);
      lines.push(
        `= ${n(a * c)} + ${par(a * d)}i + ${par(b * c)}i + ${par(b * d)}i^2`,
        `= (${n(a * c)} - ${par(b * d)}) + (${n(a * d)} + ${par(b * c)})i`,
        `= ${cxNice(res).tex}`,
      );
      const [r1, r2v, t1, t2] = [abs(z), abs(v), arg(z), arg(v)];
      lines.push(`|z w| = |z|\\,|w| = ${nice(r1).tex} \\cdot ${nice(r2v).tex} = ${nice(r1 * r2v).tex}`);
      caps.push({ text: fill(w.mulCap, { r1: nice(r1).text, r2: nice(r2v).text, r: nice(r1 * r2v).text, t1: angNice(t1).deg, t2: angNice(t2).deg, t: angNice(t1 + t2).deg }), color: "#495057" });
      break;
    }
    case "/": {
      const den = c * c + d * d;
      if (den < 1e-18) throw new Error(w.divZero);
      res = cx((a * c + b * d) / den, (b * c - a * d) / den);
      const conj = cxNice(cx(c, -d)).tex;
      lines.push(
        `= \\frac{${wrapTex(Z)}${wrapTex(conj)}}{${wrapTex(V)}${wrapTex(conj)}}`,
        `= \\frac{${cxNice(mul(z, cx(c, -d))).tex}}{${n(c)}^2 + ${par(d)}^2} = \\frac{${cxNice(mul(z, cx(c, -d))).tex}}{${n(den)}}`,
        `= ${cxNice(res).tex}`,
      );
      caps.push({ text: w.divCap, color: "#495057" });
      break;
    }
  }
  pts.push(res);
  const f = plane(pts, 40, 8);
  const parts: string[] = [planeAxes(f)];
  if (s.op === "+" || s.op === "-") {
    const v2 = s.op === "+" ? v : cx(-v.re, -v.im);
    // The parallelogram.
    parts.push(arrow(f, z, res, C.red, 1.4, true), arrow(f, v2, res, C.blue, 1.4, true));
    if (s.op === "-") parts.push(arrow(f, cx(0), v, "#adb5bd", 1.8, true), pointLabel(f, v, "w", C.grey), arrow(f, v, z, C.purple, 2, true));
    parts.push(arrow(f, cx(0), z, C.blue, 2.6), arrow(f, cx(0), v2, C.red, 2.6), arrow(f, cx(0), res, C.green, 3));
    parts.push(pointLabel(f, z, "z", C.blue), pointLabel(f, v2, s.op === "+" ? "w" : "−w", C.red), pointLabel(f, res, s.op === "+" ? "z + w" : "z − w", C.green));
  } else {
    // Lengths multiply, angles add (or subtract).
    parts.push(arc(f, 0, arg(z), 22, C.blue), arc(f, 0, arg(v), 32, C.red), arc(f, 0, arg(res), 42, C.green));
    parts.push(arrow(f, cx(0), z, C.blue, 2.6), arrow(f, cx(0), v, C.red, 2.6), arrow(f, cx(0), res, C.green, 3));
    parts.push(pointLabel(f, z, "z", C.blue), pointLabel(f, v, "w", C.red), pointLabel(f, res, s.op === "*" ? "zw" : "z/w", C.green));
  }
  const opTex = { "+": "+", "-": "-", "*": "", "/": "\\div" }[s.op];
  const head = `${wrapTex(Z)} ${opTex} ${wrapTex(V)} = ${cxNice(res).tex}`;
  const body = layout(parts.join(""), [`${wrapTex(Z)} ${opTex} ${wrapTex(V)}`, ...lines]);
  return compose(head, body.svg, body.h, caps);
}

function intIn(s: string, lo: number, hi: number, w: CxWords): number {
  const n = Number(s.trim());
  if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(fill(w.badN, { a: lo, b: hi }));
  return n;
}

function renderPowers(s: CxSpec, w: CxWords): RenderedSvg {
  const z = parseCx(s.z, w);
  const n = intIn(s.n, -12, 24, w);
  const r = abs(z);
  if (r < 1e-12 && n <= 0) throw new Error(w.divZero);
  const t = arg(z);
  const res = polar(r ** n, n * t);
  const pw = Array.from({ length: Math.abs(n) + 1 }, (_, k) => polar(r ** (Math.sign(n) * k), Math.sign(n) * k * t));
  const f = plane(pw, 40, 8);
  const parts: string[] = [planeAxes(f), circlePx(f, 1, "#dee2e6", `stroke-dasharray="4 4"`)];
  // The spiral of powers z⁰, z¹, … zⁿ.
  const path = pw.map((p) => `${r2(f.sx(p.re))},${r2(f.sy(p.im))}`).join(" ");
  parts.push(`<polyline points="${path}" fill="none" stroke="#b197fc" stroke-width="1.4"/>`);
  pw.forEach((p, k) => {
    parts.push(dot(f.sx(p.re), f.sy(p.im), k === pw.length - 1 ? C.green : C.purple, k === pw.length - 1 ? 5 : 3.5));
    // Every label when there are few points (or all on the unit circle), else just z and the last power.
    if (pw.length <= 5 || Math.abs(r - 1) < 1e-9 || k === pw.length - 1 || k === 1) parts.push(pointLabel(f, p, k === 0 ? "1" : k === 1 ? (n < 0 ? "z⁻¹" : "z") : `z${sup(n < 0 ? -k : k)}`, k === pw.length - 1 ? C.green : C.purple));
  });
  parts.push(arrow(f, cx(0), res, C.green, 2.6));
  const rn = nice(r);
  const tn = angNice(t);
  const R = rn.tex === "1" ? "" : rn.tex;
  const Rn = nice(r ** n).tex === "1" ? "" : nice(r ** n).tex;
  // nθ brought back into (−π, π].
  let nt = n * t;
  while (nt > Math.PI + 1e-9) nt -= 2 * Math.PI;
  while (nt <= -Math.PI + 1e-9) nt += 2 * Math.PI;
  const full = angNice(n * t);
  const red = angNice(nt);
  const lines = [
    zLine(z, rn, tn),
    `z^{${n}} =${R ? `${R.includes("sqrt") ? `\\left(${R}\\right)` : R}^{${n}}` : ""}\\,e^{${n}\\cdot ${tn.tex}\\, i}`,
    ...(Math.abs(nt - n * t) > 1e-9 ? [`${n}\\cdot ${tn.tex} = ${full.tex} \\equiv ${red.tex} \\pmod{2\\pi}`] : []),
    `= ${Rn}\\left(\\cos ${ang(red.tex)} + i\\sin ${ang(red.tex)}\\right)`,
    `${cxNice(res).exact ? "=" : "\\approx"} ${cxNice(cx(clean(res.re), clean(res.im))).tex}`,
  ];
  const caps: Caption[] = [{ text: w.powCap, color: "#495057" }];
  // The cycle of i.
  if (Math.abs(z.re) < 1e-12 && Math.abs(z.im - 1) < 1e-12) {
    const m = ((n % 4) + 4) % 4;
    lines.push(`i^{${n}} = i^{4\\cdot ${Math.floor(n / 4)} + ${m}} = i^{${m}} = ${["1", "i", "-1", "-i"][m]}`);
    caps.unshift({ text: w.iCycle, color: C.purple });
  }
  const body = layout(parts.join(""), lines);
  const zt = cxNice(z).tex;
  const baseTex = /^[a-z0-9]+$/i.test(zt) ? zt : `\\left(${zt}\\right)`;
  return compose(`${baseTex}^{${n}} = ${cxNice(cx(clean(res.re), clean(res.im))).tex}`, body.svg, body.h, caps);
}
const sup = (k: number) => String(k).replace(/-/g, "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);

function renderRoots(s: CxSpec, w: CxWords): RenderedSvg {
  const z = parseCx(s.z, w);
  const n = intIn(s.n, 2, 12, w);
  const r = abs(z);
  const t = arg(z);
  const rr = r ** (1 / n);
  const roots = Array.from({ length: n }, (_, k) => polar(rr, (t + 2 * Math.PI * k) / n));
  // Fit the roots; z itself only when it is not far outside (∛8: z = 8 would shrink the triangle).
  const showZ = r > 1e-12 && r <= 2.5 * rr;
  const f = plane(showZ ? [...roots, z] : roots, 40, 8);
  const parts: string[] = [planeAxes(f), circlePx(f, rr, C.purple, `stroke-width="1.4" stroke-dasharray="5 4"`)];
  if (showZ) parts.push(arrow(f, cx(0), z, "#adb5bd", 1.8, true), pointLabel(f, z, "z", C.grey));
  // The regular polygon through the roots.
  parts.push(`<polygon points="${roots.map((p) => `${r2(f.sx(p.re))},${r2(f.sy(p.im))}`).join(" ")}" fill="#f3d9fa" fill-opacity="0.5" stroke="${C.purple}" stroke-width="2"/>`);
  roots.forEach((p, k) => parts.push(dot(f.sx(p.re), f.sy(p.im), C.purple, 4.5), pointLabel(f, p, `w${"₀₁₂₃₄₅₆₇₈₉"[k] ?? k}`, C.purple)));
  const rn = nice(r);
  const tn = angNice(t);
  const rrn = nice(rr);
  const lines = [
    zLine(z, rn, tn),
    `w_k = \\sqrt[${n}]{${rn.tex}}\\; e^{\\frac{${tn.tex} + 2\\pi k}{${n}} i}, \\quad k = 0, \\dots, ${n - 1}`,
    ...roots.slice(0, 8).map((p, k) => {
      const e = expForm(rrn.tex, angNice((t + 2 * Math.PI * k) / n).tex);
      const rect = cxNice(cx(clean(p.re), clean(p.im)));
      return e === rect.tex ? `w_{${k}} = ${e}` : `w_{${k}} = ${e} ${rect.exact ? "=" : "\\approx"} ${rect.tex}`;
    }),
  ];
  if (n > 8) lines.push(`\\dots`);
  const body = layout(parts.join(""), lines);
  const caps: Caption[] = [{ text: n === 2 ? fill(w.rootsCap2, { r: rrn.text }) : fill(w.rootsCap, { n, r: rrn.text, d: r2(360 / n) }), color: "#495057" }];
  return compose(`\\sqrt[${n}]{${cxNice(z).tex}}`, body.svg, body.h, caps);
}

/** a·v² + b·v + c with the usual shortcuts (no 1·, no + 0), as TeX or as plain text. */
function polyOf(a: number, b: number, c: number, v: string, tex: boolean): string {
  const out: string[] = [];
  const terms: [number, string][] = [[a, tex ? `${v}^2` : `${v}²`], [b, v], [c, ""]];
  for (const [k, pow] of terms) {
    if (Math.abs(k) < 1e-12) continue;
    const mag = nice(Math.abs(k));
    const coef = (tex ? mag.tex : mag.text) === "1" && pow ? "" : tex ? mag.tex : mag.text;
    const sign = k < 0 ? (out.length ? (tex ? " - " : " − ") : tex ? "-" : "−") : out.length ? " + " : "";
    out.push(`${sign}${coef}${pow}`);
  }
  return out.join("") || "0";
}

function renderQuadratic(s: CxSpec, w: CxWords): RenderedSvg {
  const [a, b, c] = [s.a, s.b, s.c].map((v) => {
    const z = parseCx(v, w);
    if (Math.abs(z.im) > 1e-12) throw new Error(fill(w.badNumber, { s: v }));
    return z.re;
  });
  if (Math.abs(a) < 1e-12) throw new Error(w.aZero);
  const D = b * b - 4 * a * c;
  const neg = D < -1e-12;
  const sq = Math.sqrt(Math.abs(D));
  const z1 = neg ? cx(-b / (2 * a), sq / (2 * a)) : cx((-b + sq) / (2 * a));
  const z2 = neg ? cx(-b / (2 * a), -sq / (2 * a)) : cx((-b - sq) / (2 * a));
  // The parabola, on the left.
  const vx = -b / (2 * a);
  const span = Math.max(3, Math.abs(z1.im) * 2 + 2, Math.abs(z1.re - z2.re) + 2);
  const fx = (x: number) => a * x * x + b * x + c;
  const [y0, y1] = yRange([fx(vx - span), fx(vx), fx(vx + span), 0], [0, fx(vx)]);
  const g = makeFrame("par", 30, 8, 270, 250, [vx - span, vx + span], [y0, y1]);
  const parts: string[] = [axes(g), curve(g, fx, C.blue, 2.4), lbl(g.left + 8, g.top + 16, `y = ${polyOf(a, b, c, "x", false)}`, C.blue, "start", 12, false)];
  if (!neg) [z1, z2].forEach((z) => parts.push(dot(g.sx(z.re), g.sy(0), C.green, 5)));
  // The roots in the complex plane, on the right.
  const f = plane([z1, z2], 350, 8, 250, "roots");
  parts.push(planeAxes(f));
  if (neg) parts.push(`<line x1="${r2(f.sx(z1.re))}" y1="${r2(f.sy(z1.im))}" x2="${r2(f.sx(z2.re))}" y2="${r2(f.sy(z2.im))}" stroke="${C.purple}" stroke-dasharray="5 4"/>`);
  parts.push(dot(f.sx(z1.re), f.sy(z1.im), C.green, 5), dot(f.sx(z2.re), f.sy(z2.im), C.green, 5));
  parts.push(pointLabel(f, z1, `z₁ = ${cxNice(z1).text}`, C.green), pointLabel(f, z2, `z₂ = ${cxNice(z2).text}`, C.green));
  const n = (x: number) => nice(x).tex;
  const p = (x: number) => (x < 0 ? `(${n(x)})` : n(x));
  const Dn = nice(D);
  const lines = [
    `D = b^2 - 4ac = ${p(b)}^2 - 4\\cdot ${p(a)}\\cdot ${p(c)} = ${Dn.tex}`,
    neg ? `\\sqrt{D} = \\sqrt{${Dn.tex}} = i\\sqrt{${n(-D)}} = ${cxNice(cx(0, sq)).tex}` : `\\sqrt{D} = ${nice(sq).tex}`,
    `z_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a} = \\frac{${n(-b)} \\pm ${neg ? cxNice(cx(0, sq)).tex : nice(sq).tex}}{${n(2 * a)}}`,
    `z_1 = ${cxNice(z1).tex}, \\quad z_2 = ${cxNice(z2).tex}`,
  ];
  const st = steps(lines, 30, 280, W - 60);
  parts.push(st.svg);
  const caps: Caption[] = [
    { text: neg ? w.quadNeg : w.quadPos, color: neg ? C.purple : C.green },
    { text: fill(w.vieta, { s: nice(-b / a).text, p: nice(c / a).text }), color: "#495057" },
  ];
  const poly = `${polyOf(a, b, c, "z", true)} = 0`;
  return compose(poly, parts.join(""), 280 + st.h, caps);
}

function renderEuler(s: CxSpec, w: CxWords): RenderedSvg {
  const tz = parseCx(s.t, w);
  if (Math.abs(tz.im) > 1e-12) throw new Error(fill(w.badNumber, { s: s.t }));
  const t = tz.re;
  const p = polar(1, t);
  const f = plane([cx(1), cx(0, 1)], 40, 8);
  const parts: string[] = [planeAxes(f), circlePx(f, 1, "#adb5bd", `stroke-width="1.6"`)];
  const P = { x: f.sx(p.re), y: f.sy(p.im) };
  parts.push(`<line x1="${r2(f.sx(0))}" y1="${r2(f.sy(0))}" x2="${r2(P.x)}" y2="${r2(f.sy(0))}" stroke="${C.green}" stroke-width="4"/>`);
  parts.push(`<line x1="${r2(P.x)}" y1="${r2(f.sy(0))}" x2="${r2(P.x)}" y2="${r2(P.y)}" stroke="${C.red}" stroke-width="4"/>`);
  parts.push(arc(f, 0, t, 30, C.orange, 2.2), arrow(f, cx(0), p, C.blue, 2.6), dot(P.x, P.y, C.blue, 5));
  const tn = angNice(t);
  parts.push(pointLabel(f, p, `e^(i·${tn.text})`, C.blue));
  const c = nice(Math.cos(t));
  const sn = nice(Math.sin(t));
  const lines = [
    `e^{i\\theta} = \\cos\\theta + i\\sin\\theta`,
    `\\theta = ${tn.tex} \\;(${tn.deg.replace("°", "^\\circ")})`,
    `\\cos ${ang(tn.tex)} ${eq(c)} ${c.tex}, \\quad \\sin ${ang(tn.tex)} ${eq(sn)} ${sn.tex}`,
    `e^{${tn.tex} i} ${c.exact && sn.exact ? "=" : "\\approx"} ${cxNice(cx(clean(p.re), clean(p.im))).tex}`,
    `|e^{i\\theta}| = \\sqrt{\\cos^2\\theta + \\sin^2\\theta} = 1`,
  ];
  const caps: Caption[] = [{ text: w.eulerCap, color: "#495057" }];
  const isPi = Math.abs(Math.abs(t) - Math.PI) < 1e-9;
  if (isPi) (lines.push(`e^{i\\pi} + 1 = 0`), caps.unshift({ text: w.eulerPi, color: C.purple }));
  const body = layout(parts.join(""), lines);
  return compose(isPi ? `e^{i\\pi} + 1 = 0` : `e^{${tn.tex} i} = \\cos ${ang(tn.tex)} + i \\sin ${ang(tn.tex)}`, body.svg, body.h, caps);
}

export function renderComplex(spec: CxSpec, words: CxWords): RenderedSvg {
  switch (spec.topic) {
    case "form":
      return renderForm(spec, words);
    case "ops":
      return renderOps(spec, words);
    case "powers":
      return renderPowers(spec, words);
    case "roots":
      return renderRoots(spec, words);
    case "quadratic":
      return renderQuadratic(spec, words);
    case "euler":
      return renderEuler(spec, words);
  }
}

// ---------- presets ----------

const base: CxSpec = { topic: "form", z: "3+4i", w: "1-2i", op: "+", n: "3", a: "1", b: "2", c: "5", t: "pi/3" };
const p = (topic: CxTopic, over: Partial<CxSpec>): CxSpec => ({ ...base, topic, ...over });

export const CX_PRESETS: { [K in CxTopic]: { label: string; spec: CxSpec }[] } = {
  form: [
    { label: "3 + 4i", spec: p("form", { z: "3+4i" }) },
    { label: "−1 + i", spec: p("form", { z: "-1+i" }) },
    { label: "−2 − 2√3 i", spec: p("form", { z: "-2-2sqrt(3)i" }) },
    { label: "2∠150°", spec: p("form", { z: "2∠150°" }) },
    { label: "3i", spec: p("form", { z: "3i" }) },
    { label: "−5", spec: p("form", { z: "-5" }) },
  ],
  ops: [
    { label: "(3 + 2i) + (1 − 4i)", spec: p("ops", { z: "3+2i", w: "1-4i", op: "+" }) },
    { label: "(2 + 3i) − (4 − i)", spec: p("ops", { z: "2+3i", w: "4-i", op: "-" }) },
    { label: "(2 + i)(1 + 3i)", spec: p("ops", { z: "2+i", w: "1+3i", op: "*" }) },
    { label: "(1 + i) · i (a quarter turn)", spec: p("ops", { z: "1+i", w: "i", op: "*" }) },
    { label: "(4 + 2i) ÷ (1 − i)", spec: p("ops", { z: "4+2i", w: "1-i", op: "/" }) },
    { label: "(3 + 4i)(3 − 4i)", spec: p("ops", { z: "3+4i", w: "3-4i", op: "*" }) },
  ],
  powers: [
    { label: "i⁷", spec: p("powers", { z: "i", n: "7" }) },
    { label: "(1 + i)⁸", spec: p("powers", { z: "1+i", n: "8" }) },
    { label: "(1 + √3 i)⁶", spec: p("powers", { z: "1+sqrt(3)i", n: "6" }) },
    { label: "(0.9 + 0.4i)¹² spiral", spec: p("powers", { z: "0.9+0.4i", n: "12" }) },
    { label: "(1 + i)⁻²", spec: p("powers", { z: "1+i", n: "-2" }) },
  ],
  roots: [
    { label: "∛8", spec: p("roots", { z: "8", n: "3" }) },
    { label: "⁴√(−16)", spec: p("roots", { z: "-16", n: "4" }) },
    { label: "√i", spec: p("roots", { z: "i", n: "2" }) },
    { label: "6th roots of unity", spec: p("roots", { z: "1", n: "6" }) },
    { label: "5th roots of 1", spec: p("roots", { z: "1", n: "5" }) },
    { label: "∛(−8i)", spec: p("roots", { z: "-8i", n: "3" }) },
  ],
  quadratic: [
    { label: "z² + 2z + 5", spec: p("quadratic", { a: "1", b: "2", c: "5" }) },
    { label: "z² + 9", spec: p("quadratic", { a: "1", b: "0", c: "9" }) },
    { label: "z² + z + 1", spec: p("quadratic", { a: "1", b: "1", c: "1" }) },
    { label: "2z² − 4z + 10", spec: p("quadratic", { a: "2", b: "-4", c: "10" }) },
    { label: "z² − 4 (real roots)", spec: p("quadratic", { a: "1", b: "0", c: "-4" }) },
  ],
  euler: [
    { label: "θ = π", spec: p("euler", { t: "pi" }) },
    { label: "θ = π/3", spec: p("euler", { t: "pi/3" }) },
    { label: "θ = π/2", spec: p("euler", { t: "pi/2" }) },
    { label: "θ = 3π/4", spec: p("euler", { t: "3pi/4" }) },
    { label: "θ = 1 rad", spec: p("euler", { t: "1" }) },
  ],
};
