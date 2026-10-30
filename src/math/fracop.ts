// Fraction arithmetic, step by step: + and − on a common denominator (the lcm), × with
// cross-cancelling, ÷ as "keep, change, flip". Mixed numbers and decimals are turned into
// improper fractions first; the answer is simplified by the gcd and written as a mixed number.
// A picture comes first: bars on the common denominator for + and − (each fraction's own pieces bold, the common ones
// inside them), the area model on squares of 1 for ×, and "how many times does b fit into a" for ÷.
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

/**
 * Bars of `parts` equal parts per whole with `count` of them shaded (split into colour runs), at least `minWholes`
 * wholes, the same size of whole as `scaleWholes` wholes would have. With `group`, every group-th line is drawn bold:
 * the fraction's own pieces, with the common pieces they were cut into inside them.
 */
function bars(x: number, y: number, w: number, h: number, parts: number, runs: { count: number; c: { f: string; s: string }; hatch?: boolean }[], scaleWholes = 1, group = 0, minWholes = 1) {
  const total = runs.reduce((s, r) => s + r.count, 0);
  const wholes = Math.max(minWholes, Math.ceil(total / parts));
  const out: string[] = [];
  const sw = Math.max(wholes, scaleWholes); // every row uses the same size of whole
  const gap = sw > 4 ? 8 : 12;
  const bw = (w - (sw - 1) * gap) / sw;
  const cell = bw / parts;
  let k = 0;
  for (const run of runs)
    for (let i = 0; i < run.count; i++, k++) {
      const whole = Math.floor(k / parts);
      const px = x + whole * (bw + gap) + (k % parts) * cell;
      out.push(`<rect x="${r2(px)}" y="${y}" width="${r2(cell)}" height="${h}" fill="${run.hatch ? "url(#fo-hatch)" : run.c.f}"/>`);
    }
  for (let wi = 0; wi < wholes; wi++) {
    const bx = x + wi * (bw + gap);
    for (let i = 1; i < parts; i++) {
      const bold = group > 1 && i % group === 0 && parts / group <= 60;
      if (bold) out.push(`<line x1="${r2(bx + i * cell)}" y1="${y}" x2="${r2(bx + i * cell)}" y2="${y + h}" stroke="#1e1e1e" stroke-width="1.6"/>`);
      else if (cell >= 3) out.push(`<line x1="${r2(bx + i * cell)}" y1="${y}" x2="${r2(bx + i * cell)}" y2="${y + h}" stroke="#868e96" stroke-width="0.8"/>`);
    }
    out.push(`<rect x="${r2(bx)}" y="${y}" width="${r2(bw)}" height="${h}" fill="none" stroke="#1e1e1e" stroke-width="1.6"/>`);
  }
  return { svg: out.join(""), xAt: (k: number) => x + Math.floor(Math.min(k, wholes * parts - 1e-9) / parts) * (bw + gap) + (k - Math.floor(Math.min(k, wholes * parts - 1e-9) / parts) * parts) * cell };
}

/** The most wholes a row of bars may take up before the picture is left out. */
const MAX_WHOLES = 8;

function picture(spec: FracOpSpec, plan: ReturnType<typeof planFracOp>): { svg: string; h: number } {
  const { A, B, res } = plan;
  const [a, b] = [A.q, B.q];
  const pos = a.n >= 0 && b.n >= 0;
  const defs = `<defs><pattern id="fo-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#f1f3f5"/><line x1="0" y1="0" x2="0" y2="6" stroke="#adb5bd" stroke-width="2"/></pattern></defs>`;
  const out: string[] = [defs];
  const x0 = 170;
  const bw = W - x0 - 24;
  /** A row's label, right-aligned before the bars: the fraction as written, and on the common pieces when that differs. */
  const label = (y: number, tex: string, color?: string) => out.push(texAt(tex, x0 - 12, y + 19, "end", 0.85, color).svg);
  const recut = (p: Parsed, top: number, L: number) => (p.q.d === L && !p.convert ? fr(top, L) : `${p.tex} = ${fr(top, L)}`);
  if ((spec.op === "+" || spec.op === "-") && pos) {
    // Each fraction cut into the common pieces: its own pieces bold, the common ones inside them. Then put together
    // (+), or the second taken away from the first (−, the part taken away hatched).
    const L = plan.L;
    const a1 = (a.n * L) / a.d;
    const b1 = (b.n * L) / b.d;
    const sum = spec.op === "+" ? a1 + b1 : a1 - b1;
    const maxW = Math.max(1, Math.ceil(Math.max(a1, b1, sum) / L));
    if (maxW > MAX_WHOLES || sum < 0) return { svg: "", h: 0 };
    let y = 8;
    label(y, recut(A, a1, L));
    out.push(bars(x0, y, bw, 38, L, [{ count: a1, c: BLUE }], maxW, L / a.d).svg);
    y += 58;
    label(y, `${spec.op === "+" ? "+" : "-"}\\ ${recut(B, b1, L)}`);
    out.push(bars(x0, y, bw, 38, L, [{ count: b1, c: ORANGE }], maxW, L / b.d).svg);
    y += 58;
    label(y, `=\\ ${fr(sum, L)}${res.tex !== fr(sum, L) ? ` = ${res.tex}` : ""}`, C.green);
    const runs = spec.op === "+" ? [{ count: a1, c: BLUE }, { count: b1, c: ORANGE }] : [{ count: sum, c: GREEN }, { count: b1, c: GREEN, hatch: true }];
    out.push(bars(x0, y, bw, 38, L, runs, maxW).svg);
    return { svg: out.join(""), h: y + 58 };
  }
  const [wu, hu] = [Math.ceil(a.n / a.d), Math.ceil(b.n / b.d)];
  if (spec.op === "×" && pos && a.n > 0 && b.n > 0 && wu <= 4 && hu <= 4) {
    // Area model: a of the width, b of the height, on squares of 1 (bold) cut into a.d × b.d pieces; the overlap is
    // the product, a.n × b.n pieces of 1/(a.d × b.d) each.
    const U = Math.round(Math.min(230, 300 / Math.max(wu, hu)));
    const [SW, SH] = [U * wu, U * hu];
    const X = (W - SW) / 2 + 20;
    const Y = 30;
    const [aw, bh] = [(U * a.n) / a.d, (U * b.n) / b.d];
    const rect = (x: number, y: number, w: number, h: number, f: string) => `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${f}"/>`;
    out.push(rect(X, Y, SW, SH, "#ffffff"), rect(X, Y, aw, SH - bh, BLUE.f), rect(X + aw, Y + SH - bh, SW - aw, bh, ORANGE.f), rect(X, Y + SH - bh, aw, bh, GREEN.f));
    const line = (x1: number, y1: number, x2: number, y2: number, bold: boolean) =>
      `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${bold ? "#1e1e1e" : "#adb5bd"}" stroke-width="${bold ? 1.6 : 0.8}"/>`;
    for (let i = 1; i < wu * a.d; i++) if (i % a.d === 0 || U / a.d >= 4) out.push(line(X + (i * U) / a.d, Y, X + (i * U) / a.d, Y + SH, i % a.d === 0));
    for (let j = 1; j < hu * b.d; j++) if (j % b.d === 0 || U / b.d >= 4) out.push(line(X, Y + SH - (j * U) / b.d, X + SW, Y + SH - (j * U) / b.d, j % b.d === 0));
    out.push(`<rect x="${X}" y="${Y}" width="${SW}" height="${SH}" fill="none" stroke="#1e1e1e" stroke-width="2"/>`);
    out.push(texAt(A.tex, X + aw / 2, Y + SH + 22, "middle", 0.85, C.blue).svg);
    out.push(texAt(B.tex, X - 10, Y + SH - bh / 2, "end", 0.85, C.orange).svg);
    const prod = fr(a.n * b.n, a.d * b.d);
    out.push(texAt(`${prod}${res.tex !== prod ? ` = ${res.tex}` : ""}`, X + SW + 16, Y + SH - bh / 2, "start", 1, C.green).svg);
    return { svg: out.join(""), h: Y + SH + 46 };
  }
  if (spec.op === "÷" && pos && b.n > 0) {
    // How many times does b fit into a? Both cut into the common pieces; each copy of b bracketed along a, and the
    // last part of one shown against the whole copy (dashed): 2 of its 5 pieces is 2/5 of a b.
    const L = lcm(a.d, b.d);
    const a1 = (a.n * L) / a.d;
    const b1 = (b.n * L) / b.d;
    const times = a1 / b1;
    const copies = Math.ceil(times);
    const maxW = Math.max(1, Math.ceil(Math.max(copies * b1, b1) / L));
    if (maxW > MAX_WHOLES || copies > 16) return { svg: "", h: 0 };
    label(8, recut(A, a1, L));
    const top = bars(x0, 8, bw, 38, L, [{ count: a1, c: BLUE }], maxW, L / a.d, maxW);
    out.push(top.svg);
    for (let g = 0; g * b1 < a1; g++) {
      const s = g * b1;
      const e = Math.min(a1, (g + 1) * b1);
      const full = e - s === b1;
      const [xs, xe] = [top.xAt(s) + 2, top.xAt(e) - 2];
      if (!full) out.push(`<rect x="${r2(top.xAt(s))}" y="6" width="${r2(top.xAt(s + b1) - top.xAt(s))}" height="42" fill="none" stroke="${C.orange}" stroke-width="2" stroke-dasharray="6 4"/>`);
      out.push(`<path d="M${r2(xs)},56 v8 H${r2(xe)} v-8" fill="none" stroke="${full ? C.orange : C.purple}" stroke-width="2"/>`);
      out.push(texAt(full ? String(g + 1) : fr(e - s, b1), (xs + xe) / 2, 82, "middle", 0.8, full ? C.orange : C.purple).svg);
    }
    label(104, recut(B, b1, L));
    out.push(bars(x0, 104, bw, 38, L, [{ count: b1, c: ORANGE }], maxW, L / b.d).svg);
    out.push(texAt(`${fr(a1, L)} \\div ${fr(b1, L)} = ${a1} \\div ${b1} = ${res.tex}`, W / 2, 174, "middle", 0.95, C.green).svg);
    return { svg: out.join(""), h: 200 };
  }
  return { svg: "", h: 0 };
}

export function renderFracOp(spec: FracOpSpec): RenderedSvg {
  const plan = planFracOp(spec);
  const k = Math.max(0, Math.min(spec.step, plan.lines.length));
  const parts: string[] = [];
  let y = 18;
  // The picture first, then the working under it.
  const pic = picture(spec, plan);
  if (pic.h) {
    parts.push(`<g transform="translate(0 ${y})">${pic.svg}</g>`);
    y += pic.h + 10;
  }
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
  return compose(`${plan.problem} = \\,?`, parts.join(""), y, []);
}
