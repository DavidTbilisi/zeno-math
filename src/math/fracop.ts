// Fraction arithmetic, step by step: + and − on a common denominator (the lcm), × with
// cross-cancelling, ÷ as "keep, change, flip". Mixed numbers and decimals are turned into
// improper fractions first; the answer is simplified by the gcd and written as a mixed number.
// A picture goes with each operation: bars on the common denominator for + and −, the area model
// for ×, and "how many times does it fit" for ÷.
import { C, compose, r2, texAt, W } from "./chart";
import type { RenderedSvg } from "./latex";

export type FracOp = "+" | "-" | "×" | "÷";
export const FRAC_OPS: FracOp[] = ["+", "-", "×", "÷"];
export type FracOpSpec = { type: "fracop"; op: FracOp; a: string; b: string; step: number };

type Q = { n: number; d: number }; // not reduced: the numbers as the pupil writes them
type Parsed = { q: Q; tex: string; convert: string | null };

const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const fr = (n: number, d: number) => (d === 1 ? `${n}` : `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`);
const par = (n: number, d: number) => (n < 0 ? `\\left(${fr(n, d)}\\right)` : fr(n, d));
const num = (n: number) => (n < 0 ? `(${n})` : `${n}`);

/** "3/4", "1 2/3", "-2", "0.25" → an (unreduced) fraction, with the conversion step when needed. */
export function parseFrac(src: string): Parsed | null {
  const s = src.trim().replace(/[−–]/g, "-").replace(",", ".").replace(/\s+/g, " ");
  let m = s.match(/^([-+]?)(\d+) (\d+)\/(\d+)$/);
  if (m) {
    const [w, n, d] = [Number(m[2]), Number(m[3]), Number(m[4])];
    if (!d) return null;
    const sign = m[1] === "-" ? -1 : 1;
    const tex = `${sign < 0 ? "-" : ""}${w}\\frac{${n}}{${d}}`;
    const top = w * d + n;
    return { q: { n: sign * top, d }, tex, convert: `${tex} = ${sign < 0 ? "-" : ""}\\frac{${w} \\cdot ${d} + ${n}}{${d}} = ${fr(sign * top, d)}` };
  }
  m = s.match(/^([-+]?\d+)\/(\d+)$/);
  if (m) {
    const [n, d] = [Number(m[1]), Number(m[2])];
    return d ? { q: { n, d }, tex: fr(n, d), convert: null } : null;
  }
  m = s.match(/^([-+]?\d+)$/);
  if (m) return { q: { n: Number(m[1]), d: 1 }, tex: m[1], convert: null };
  m = s.match(/^([-+]?)(\d*)\.(\d+)$/);
  if (m) {
    const scale = 10 ** m[3].length;
    const n = (m[1] === "-" ? -1 : 1) * (Number(m[2] || "0") * scale + Number(m[3]));
    const g = gcd(n, scale);
    const tex = `${m[1] === "-" ? "-" : ""}${m[2] || "0"}.${m[3]}`;
    return { q: { n: n / g, d: scale / g }, tex, convert: `${tex} = ${fr(n, scale)}${g > 1 ? ` = ${fr(n / g, scale / g)}` : ""}` };
  }
  return null;
}

/** Simplify, then write as a mixed number: the steps and the final LaTeX. */
function finish(n: number, d: number, lines: Line[]): { n: number; d: number; tex: string } {
  const g = gcd(n, d);
  if (g > 1 && d !== 1) {
    lines.push({ tex: `${fr(n, d)} = \\frac{${n} \\div ${g}}{${d} \\div ${g}} = ${fr(n / g, d / g)}`, note: `\\gcd(${Math.abs(n)}, ${d}) = ${g}` });
    n /= g;
    d /= g;
  }
  let tex = fr(n, d);
  if (d !== 1 && Math.abs(n) > d) {
    const w = Math.trunc(n / d);
    const r = Math.abs(n) % d;
    tex = `${w < 0 || n < 0 ? "-" : ""}${Math.abs(w)}\\frac{${r}}{${d}}`;
    lines.push({ tex: `${fr(n, d)} = ${tex}`, note: `${Math.abs(n)} = ${Math.abs(w)} \\cdot ${d} + ${r}` });
  }
  return { n, d, tex };
}

type Line = { tex: string; note?: string };

export function planFracOp(spec: FracOpSpec) {
  const A = parseFrac(spec.a);
  const B = parseFrac(spec.b);
  if (!A || !B) throw new Error("parse");
  if (spec.op === "÷" && B.q.n === 0) throw new Error("zero");
  const lines: Line[] = [];
  for (const p of [A, B]) if (p.convert) lines.push({ tex: p.convert });
  const { n: n1, d: d1 } = A.q;
  const { n: n2, d: d2 } = B.q;
  let res: { n: number; d: number; tex: string };
  let L = 0;
  if (spec.op === "+" || spec.op === "-") {
    const plus = spec.op === "+";
    L = lcm(d1, d2);
    const [k1, k2] = [L / d1, L / d2];
    const [a1, a2] = [n1 * k1, n2 * k2];
    const sign = plus ? "+" : "-";
    if (d1 !== d2) {
      lines.push({
        tex: `${fr(n1, d1)} ${sign} ${par(n2, d2)} = \\frac{${num(n1)} \\cdot ${k1}}{${d1} \\cdot ${k1}} ${sign} \\frac{${num(n2)} \\cdot ${k2}}{${d2} \\cdot ${k2}}`,
        note: `\\operatorname{lcm}(${d1}, ${d2}) = ${L}`,
      });
    }
    const s = plus ? a1 + a2 : a1 - a2;
    lines.push({ tex: `${d1 !== d2 ? `= ${fr(a1, L)} ${sign} ${par(a2, L)}` : `${fr(n1, d1)} ${sign} ${par(n2, d2)}`} = \\frac{${a1} ${plus ? (a2 < 0 ? "-" : "+") : a2 < 0 ? "+" : "-"} ${Math.abs(a2)}}{${L}} = ${fr(s, L)}` });
    res = finish(s, L, lines);
  } else {
    // ÷ becomes × by the reciprocal.
    let [m1, e1, m2, e2] = [n1, d1, n2, d2];
    if (spec.op === "÷") {
      [m2, e2] = n2 < 0 ? [-d2, -n2] : [d2, n2];
      lines.push({ tex: `${fr(n1, d1)} \\div ${par(n2, d2)} = ${fr(n1, d1)} \\times ${par(m2, e2)}`, note: `\\left(${fr(n2, d2)}\\right)^{-1} = ${fr(m2, e2)}` });
    }
    // Cross-cancel before multiplying.
    const g1 = gcd(m1, e2);
    const g2 = gcd(m2, e1);
    if (g1 > 1 || g2 > 1) {
      const c = (v: number, g: number) => (g > 1 ? `\\overset{${Math.abs(v / g)}}{\\cancel{${Math.abs(v)}}}` : `${Math.abs(v)}`);
      const sg = m1 * m2 < 0 ? "-" : "";
      lines.push({
        tex: `${fr(m1, e1)} \\times ${par(m2, e2)} = ${sg}\\frac{${c(m1, g1)} \\cdot ${c(m2, g2)}}{${c(e1, g2)} \\cdot ${c(e2, g1)}}`,
        note: [g1 > 1 ? `\\gcd(${Math.abs(m1)}, ${e2}) = ${g1}` : "", g2 > 1 ? `\\gcd(${Math.abs(m2)}, ${e1}) = ${g2}` : ""].filter(Boolean).join(",\\ "),
      });
      [m1, e2, m2, e1] = [m1 / g1, e2 / g1, m2 / g2, e1 / g2];
    }
    const pn = m1 * m2;
    const pd = e1 * e2;
    lines.push({ tex: `${g1 > 1 || g2 > 1 ? "" : `${fr(m1, e1)} \\times ${par(m2, e2)} `}= \\frac{${num(m1)} \\cdot ${num(m2)}}{${e1} \\cdot ${e2}} = ${fr(pn, pd)}` });
    res = finish(pn, pd, lines);
  }
  // Decimal value.
  const value = res.n / res.d;
  let dec = "";
  if (res.d !== 1) {
    let d = res.d;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    dec = d === 1 && String(value).length <= 10 ? ` = ${value}` : ` \\approx ${Math.round(value * 10000) / 10000}`;
  }
  const opTex = { "+": "+", "-": "-", "×": "\\times", "÷": "\\div" }[spec.op];
  const problem = `${A.tex} ${opTex} ${B.q.n < 0 ? `\\left(${B.tex}\\right)` : B.tex}`;
  lines.push({ tex: `${problem} = ${res.tex}${dec}` });
  return { A, B, lines, res, L, problem };
}

export function fracOpStepCount(spec: FracOpSpec): number {
  try {
    return planFracOp(spec).lines.length;
  } catch {
    return 0;
  }
}

const BLUE = { f: "#a5d8ff", s: C.blue };
const ORANGE = { f: "#ffd8a8", s: C.orange };
const GREEN = { f: "#b2f2bb", s: C.green };

/** Bars of `parts` equal parts per whole with `count` of them shaded (split into colour runs). */
function bars(x: number, y: number, w: number, h: number, parts: number, runs: { count: number; c: { f: string; s: string }; hatch?: boolean }[], scaleWholes = 1) {
  const total = runs.reduce((s, r) => s + r.count, 0);
  const wholes = Math.max(1, Math.ceil(total / parts));
  const out: string[] = [];
  const sw = Math.max(wholes, scaleWholes); // every row uses the same size of whole
  const bw = (w - (sw - 1) * 12) / sw;
  const cell = bw / parts;
  let k = 0;
  for (const run of runs)
    for (let i = 0; i < run.count; i++, k++) {
      const whole = Math.floor(k / parts);
      const px = x + whole * (bw + 12) + (k % parts) * cell;
      out.push(`<rect x="${r2(px)}" y="${y}" width="${r2(cell)}" height="${h}" fill="${run.hatch ? "url(#fo-hatch)" : run.c.f}"/>`);
    }
  for (let wi = 0; wi < wholes; wi++) {
    const bx = x + wi * (bw + 12);
    if (parts <= 60) for (let i = 1; i < parts; i++) out.push(`<line x1="${r2(bx + i * cell)}" y1="${y}" x2="${r2(bx + i * cell)}" y2="${y + h}" stroke="#868e96" stroke-width="0.8"/>`);
    out.push(`<rect x="${r2(bx)}" y="${y}" width="${r2(bw)}" height="${h}" fill="none" stroke="#1e1e1e" stroke-width="1.6"/>`);
  }
  return out.join("");
}

function picture(spec: FracOpSpec, plan: ReturnType<typeof planFracOp>): { svg: string; h: number } {
  const { A, B, res } = plan;
  const [a, b] = [A.q, B.q];
  const pos = a.n >= 0 && b.n >= 0;
  const defs = `<defs><pattern id="fo-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#f1f3f5"/><line x1="0" y1="0" x2="0" y2="6" stroke="#adb5bd" stroke-width="2"/></pattern></defs>`;
  const out: string[] = [defs];
  const labelX = 70;
  const x0 = 110;
  const bw = W - x0 - 24;
  if ((spec.op === "+" || spec.op === "-") && pos) {
    const L = plan.L;
    const a1 = (a.n * L) / a.d;
    const b1 = (b.n * L) / b.d;
    const total = spec.op === "+" ? a1 + b1 : a1;
    if (L > 60 || total / L > 4) return { svg: "", h: 0 };
    const rows: [string, { count: number; c: { f: string; s: string }; hatch?: boolean }[]][] = [
      [fr(a1, L), [{ count: a1, c: BLUE }]],
      [fr(b1, L), [{ count: b1, c: ORANGE }]],
      spec.op === "+"
        ? [fr(a1 + b1, L), [{ count: a1, c: BLUE }, { count: b1, c: ORANGE }]]
        : [fr(a1 - b1, L), a1 >= b1 ? [{ count: a1 - b1, c: GREEN }, { count: b1, c: GREEN, hatch: true }] : []],
    ];
    let y = 8;
    const maxW = Math.max(1, ...rows.map(([, runs]) => Math.ceil(runs.reduce((s, r) => s + r.count, 0) / L)));
    rows.forEach(([tex, runs], i) => {
      if (!runs.length) return;
      out.push(texAt(`${i === 2 ? "=" : i === 1 ? (spec.op === "+" ? "+" : "-") : ""}\\ ${tex}`, labelX, y + 19, "middle", 0.9).svg);
      out.push(bars(x0, y, bw, 38, L, runs, maxW));
      y += 58;
    });
    return { svg: out.join(""), h: y };
  }
  if (spec.op === "×" && pos && a.n <= a.d && b.n <= b.d && a.d <= 20 && b.d <= 20) {
    // Area model: a of the width, b of the height; the overlap is the product.
    const S = 230;
    const X = (W - S) / 2 + 40;
    const Y = 30;
    const cw = S / a.d;
    const chh = S / b.d;
    for (let i = 0; i < a.d; i++)
      for (let j = 0; j < b.d; j++) {
        const inA = i < a.n;
        const inB = j < b.n;
        const fill = inA && inB ? GREEN.f : inA ? BLUE.f : inB ? ORANGE.f : "#ffffff";
        out.push(`<rect x="${r2(X + i * cw)}" y="${r2(Y + S - (j + 1) * chh)}" width="${r2(cw)}" height="${r2(chh)}" fill="${fill}" stroke="#adb5bd" stroke-width="0.8"/>`);
      }
    out.push(`<rect x="${X}" y="${Y}" width="${S}" height="${S}" fill="none" stroke="#1e1e1e" stroke-width="2"/>`);
    out.push(texAt(fr(a.n, a.d), X + (a.n * cw) / 2, Y + S + 22, "middle", 0.85, C.blue).svg);
    out.push(texAt(fr(b.n, b.d), X - 26, Y + S - (b.n * chh) / 2, "middle", 0.85, C.orange).svg);
    const g = gcd(a.n * b.n, a.d * b.d);
    out.push(texAt(`${fr(a.n * b.n, a.d * b.d)}${g > 1 && a.n * b.n ? ` = ${fr((a.n * b.n) / g, (a.d * b.d) / g)}` : ""}`, X + S + 20, Y + S / 2, "start", 1, C.green).svg);
    return { svg: out.join(""), h: Y + S + 46 };
  }
  if (spec.op === "÷" && pos && b.n > 0) {
    // How many times does b fit into a? Both on the common denominator.
    const L = lcm(a.d, b.d);
    const a1 = (a.n * L) / a.d;
    const b1 = (b.n * L) / b.d;
    const times = a1 / b1;
    if (L > 60 || a1 / L > 4 || times > 16) return { svg: "", h: 0 };
    out.push(texAt(fr(a1, L), labelX, 27, "middle", 0.9).svg);
    out.push(bars(x0, 8, bw, 38, L, [{ count: a1, c: BLUE }]));
    // Brackets for each copy of b.
    const wholes = Math.max(1, Math.ceil(a1 / L));
    const barW = Math.min(bw, (bw - (wholes - 1) * 12) / wholes);
    const cell = barW / L;
    const xAt = (k: number) => x0 + Math.floor(Math.min(k, a1 - 1e-9) / L) * (barW + 12) + (k - Math.floor(Math.min(k, a1 - 1e-9) / L) * L) * cell;
    for (let g = 0; g * b1 < a1; g++) {
      const s = g * b1;
      const e = Math.min(a1, (g + 1) * b1);
      const full = e - s === b1;
      const xs = xAt(s) + 2;
      const xe = xAt(e) - 2 + (e % L === 0 && e > 0 ? 0 : 0);
      const y = 56;
      out.push(`<path d="M${r2(xs)},${y} v8 H${r2(xe)} v-8" fill="none" stroke="${full ? C.orange : C.purple}" stroke-width="2"/>`);
      out.push(texAt(full ? String(g + 1) : fr(e - s, b1), (xs + xe) / 2, y + 26, "middle", 0.8, full ? C.orange : C.purple).svg);
    }
    out.push(texAt(`${fr(a1, L)} = ${res.tex} \\times ${fr(b1, L)}`, W / 2, 128, "middle", 0.95, C.green).svg);
    return { svg: out.join(""), h: 150 };
  }
  return { svg: "", h: 0 };
}

export function renderFracOp(spec: FracOpSpec): RenderedSvg {
  const plan = planFracOp(spec);
  const k = Math.max(0, Math.min(spec.step, plan.lines.length));
  const parts: string[] = [];
  let y = 18;
  plan.lines.slice(0, k).forEach((l, i) => {
    const cancel = l.tex.includes("\\cancel");
    if (cancel) y += 12;
    const last = i === plan.lines.length - 1;
    const t = texAt(l.tex, 24, y + 14, "start", last ? 1.05 : 0.95, last ? C.green : undefined);
    parts.push(t.svg);
    if (l.note) {
      const nt = texAt(l.note, Math.min(W - 20, 24 + t.w + 26), y + 14, "start", 0.75, "#868e96");
      if (24 + t.w + 26 + nt.w < W - 8) parts.push(nt.svg);
      else parts.push(texAt(l.note, W - 16, y + 14 + 34, "end", 0.75, "#868e96").svg), (y += 30);
    }
    y += cancel ? 76 : 62;
  });
  const pic = picture(spec, plan);
  if (pic.h) {
    parts.push(`<g transform="translate(0 ${y})">${pic.svg}</g>`);
    y += pic.h;
  }
  return compose(`${plan.problem} = \\,?`, parts.join(""), y, []);
}
