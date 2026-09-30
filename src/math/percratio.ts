// Percentages and ratios, solved step by step with Singapore-style bar models.
// Percent: p% of X, what percent, the whole from a part (reverse), increase/decrease,
// percentage change, reverse percentage change, simple vs compound interest.
// Ratio: simplifying (also decimals and fractions), sharing a total, one part known, proportion.
// The unit of a bar model is drawn as a blue square, and the working uses the same square, so the
// picture needs no words.
import { C, compose, r2, texAt, W } from "./chart";
import { Frac } from "./fraction";
import type { RenderedSvg } from "./latex";

export type PercentKind = "of" | "whatPercent" | "reverse" | "change" | "percentChange" | "reverseChange" | "interest";
export type RatioKind = "simplify" | "share" | "partKnown" | "proportion";
export type PRKind = PercentKind | RatioKind;
export const PERCENT_KINDS: PercentKind[] = ["of", "whatPercent", "reverse", "change", "percentChange", "reverseChange", "interest"];
export const RATIO_KINDS: RatioKind[] = ["simplify", "share", "partKnown", "proportion"];

/**
 * Fields by kind — of: p, a · whatPercent: a (part), b (whole) · reverse: p, a (the part) ·
 * change / reverseChange: a, p, up · percentChange: a (old), b (new) · interest: a (principal), p (rate), b (years) ·
 * simplify: ratio · share: ratio, a (total) · partKnown: ratio, a (known value), b (which part, 1-based) ·
 * proportion: ratio, a (first term of the second ratio) — solves ratio = a : x.
 */
export type PercRatioSpec = { type: "percratio"; kind: PRKind; p: string; a: string; b: string; ratio: string; up: boolean; step: number };

const U = `{\\color{#1971c2}\\blacksquare}`; // one unit of the bar model (braces keep the colour on the square)

function numOf(s: string): number {
  const f = Frac.parse(s.replace(/\s+/g, ""));
  if (!f) throw new Error("number");
  return f.toNumber();
}
/** Up to 6 decimals, no trailing zeros; "≈" when rounded. */
function fmt(v: number): { tex: string; exact: boolean } {
  const r = Math.round(v * 1e4) / 1e4;
  const exact = Math.abs(r - v) < 1e-9;
  let s = String(r);
  if (/e/.test(s)) s = r.toFixed(4).replace(/\.?0+$/, "");
  return { tex: s, exact };
}
const t = (v: number) => fmt(v).tex;
const eq = (v: number) => (fmt(v).exact ? "=" : "\\approx");

function parseRatio(s: string): Frac[] {
  const parts = s.split(/[:∶]/).map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) throw new Error("ratio");
  return parts.map((x) => {
    const f = Frac.parse(x.replace(/\s+/g, ""));
    if (!f || f.n <= 0) throw new Error("ratio");
    return f;
  });
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

type Line = { tex: string; note?: string };
type Plan = { head: string; lines: Line[]; pic: (y: number) => { svg: string; h: number } };

const BLUE = { f: "#a5d8ff", s: C.blue };
const ORANGE = { f: "#ffd8a8", s: C.orange };
const GREEN = { f: "#b2f2bb", s: C.green };
const RED = { f: "#ffc9c9", s: C.red };
const PARTS = [BLUE, ORANGE, GREEN, { f: "#eebefa", s: C.purple }];

const rect = (x: number, y: number, w: number, h: number, c: { f: string; s: string }, extra = "") =>
  `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(Math.max(0, w))}" height="${h}" fill="${c.f}" stroke="${c.s}" stroke-width="1.6" ${extra}/>`;
/** A curly-ish bracket above (up) or below a span, with a LaTeX label. */
function brace(x1: number, x2: number, y: number, label: string, up: boolean, color: string = C.ink): string {
  const d = up ? -1 : 1;
  const m = (x1 + x2) / 2;
  return (
    `<path d="M${r2(x1)},${y} q0,${8 * d} 8,${8 * d} H${r2(m - 6)} q6,0 6,${6 * d} q0,${-6 * d} 6,${-6 * d} H${r2(x2 - 8)} q8,0 8,${-8 * d}" fill="none" stroke="${color}" stroke-width="1.6"/>` +
    texAt(label, m, y + d * 30, "middle", 0.85, color).svg
  );
}
/** Percentage ticks under a bar whose 100% is w100 pixels wide. */
function ticks(x: number, y: number, w100: number, maxPct: number, marks: number[]): string {
  const out: string[] = [];
  for (let q = 0; q <= maxPct + 1e-9; q += 10) out.push(`<line x1="${r2(x + (q / 100) * w100)}" y1="${y}" x2="${r2(x + (q / 100) * w100)}" y2="${y + (q % 50 === 0 ? 8 : 5)}" stroke="#868e96"/>`);
  for (const q of [...new Set([0, 100, ...marks])]) out.push(texAt(`${t(q)}\\%`, x + (q / 100) * w100, y + 20, "middle", 0.7, "#495057").svg);
  return out.join("");
}

// ---------- percent ----------

function planPercent(spec: PercRatioSpec): Plan {
  const x0 = 60;
  const BW = W - 2 * x0; // pixels available for the widest bar
  const H = 36;
  switch (spec.kind as PercentKind) {
    case "of": {
      const p = numOf(spec.p);
      const X = numOf(spec.a);
      const one = X / 100;
      const R = (p / 100) * X;
      return {
        head: `${t(p)}\\% \\cdot ${t(X)} = \\,?`,
        lines: [
          { tex: `100\\% = ${t(X)}` },
          { tex: `1\\% = \\frac{${t(X)}}{100} ${eq(one)} ${t(one)}` },
          { tex: `${t(p)}\\% = ${t(p)} \\cdot ${t(one)} ${eq(R)} ${t(R)}`, note: `\\frac{${t(p)}}{100} \\cdot ${t(X)} ${eq(R)} ${t(R)}` },
          { tex: `${t(p)}\\% \\cdot ${t(X)} ${eq(R)} ${t(R)}` },
        ],
        pic: (y) => {
          const maxP = Math.max(100, p);
          const w100 = (BW * 100) / maxP;
          return {
            svg:
              rect(x0, y + 40, w100, H, { f: "#ffffff", s: C.ink }) +
              rect(x0, y + 40, (w100 * Math.min(p, maxP)) / 100, H, BLUE) +
              brace(x0, x0 + w100, y + 34, t(X), true) +
              brace(x0, x0 + (w100 * p) / 100, y + 40 + H + 42, `${t(p)}\\% = ${t(R)}`, false, C.blue) +
              ticks(x0, y + 40 + H + 2, w100, maxP, [p]),
            h: 40 + H + 94,
          };
        },
      };
    }
    case "whatPercent": {
      const A = numOf(spec.a);
      const B = numOf(spec.b);
      if (!B) throw new Error("zero");
      const P = (A / B) * 100;
      return {
        head: `\\frac{${t(A)}}{${t(B)}} = \\,?\\,\\%`,
        lines: [
          { tex: `\\frac{${t(A)}}{${t(B)}} ${eq(A / B)} ${t(A / B)}` },
          { tex: `${t(A / B)} \\cdot 100\\% ${eq(P)} ${t(P)}\\%` },
          { tex: `${t(A)} ${eq(P)} ${t(P)}\\% \\cdot ${t(B)}` },
        ],
        pic: (y) => {
          const maxP = Math.max(100, P);
          const w100 = (BW * 100) / maxP;
          return {
            svg:
              rect(x0, y + 40, w100, H, { f: "#ffffff", s: C.ink }) +
              rect(x0, y + 40, (w100 * P) / 100, H, BLUE) +
              brace(x0, x0 + w100, y + 34, `${t(B)} = 100\\%`, true) +
              brace(x0, x0 + (w100 * P) / 100, y + 40 + H + 42, `${t(A)} ${eq(P)} ${t(P)}\\%`, false, C.blue) +
              ticks(x0, y + 40 + H + 2, w100, maxP, []),
            h: 40 + H + 94,
          };
        },
      };
    }
    case "reverse": {
      const p = numOf(spec.p);
      const A = numOf(spec.a);
      if (!p) throw new Error("zero");
      const one = A / p;
      const Wh = one * 100;
      return {
        head: `${t(p)}\\% \\cdot \\,?\\, = ${t(A)}`,
        lines: [
          { tex: `${t(p)}\\% = ${t(A)}` },
          { tex: `1\\% = \\frac{${t(A)}}{${t(p)}} ${eq(one)} ${t(one)}` },
          { tex: `100\\% = 100 \\cdot ${t(one)} ${eq(Wh)} ${t(Wh)}`, note: `${t(A)} \\div \\frac{${t(p)}}{100} ${eq(Wh)} ${t(Wh)}` },
        ],
        pic: (y) => {
          const maxP = Math.max(100, p);
          const w100 = (BW * 100) / maxP;
          return {
            svg:
              rect(x0, y + 40, w100, H, { f: "#ffffff", s: C.ink }) +
              rect(x0, y + 40, (w100 * p) / 100, H, BLUE) +
              brace(x0, x0 + w100, y + 34, `?\\, ${eq(Wh)} ${t(Wh)}`, true, C.green) +
              brace(x0, x0 + (w100 * p) / 100, y + 40 + H + 42, `${t(p)}\\% = ${t(A)}`, false, C.blue) +
              ticks(x0, y + 40 + H + 2, w100, maxP, [p]),
            h: 40 + H + 94,
          };
        },
      };
    }
    case "change":
    case "reverseChange": {
      const p = numOf(spec.p);
      const A = numOf(spec.a);
      const q = spec.up ? 100 + p : 100 - p;
      if (q <= 0) throw new Error("range");
      const m = q / 100;
      const sign = spec.up ? "+" : "-";
      const reverse = spec.kind === "reverseChange";
      const orig = reverse ? A / m : A;
      const now = reverse ? A : A * m;
      const lines: Line[] = [{ tex: `100\\% ${sign} ${t(p)}\\% = ${t(q)}\\%` }];
      if (!reverse) {
        lines.push({ tex: `${t(q)}\\% = ${t(m)}`, note: `${t(p)}\\% \\cdot ${t(A)} ${eq((p / 100) * A)} ${t((p / 100) * A)}` });
        lines.push({ tex: `${t(A)} \\cdot ${t(m)} ${eq(now)} ${t(now)}` });
      } else {
        lines.push({ tex: `${t(q)}\\% = ${t(A)}` });
        lines.push({ tex: `1\\% = \\frac{${t(A)}}{${t(q)}} ${eq(A / q)} ${t(A / q)}` });
        // The classic mistake: taking p% of the new value instead of the original.
        const wrong = spec.up ? A - (p / 100) * A : A + (p / 100) * A;
        lines.push({ tex: `\\color{#e03131}{${t(A)} ${spec.up ? "-" : "+"} ${t(p)}\\% \\cdot ${t(A)} ${eq(wrong)} ${t(wrong)} \\;\\neq\\; ${t(orig)}}` });
        lines.push({ tex: `100\\% = 100 \\cdot ${t(A / q)} ${eq(orig)} ${t(orig)}`, note: `${t(A)} \\div ${t(m)} ${eq(orig)} ${t(orig)}` });
      }
      return {
        head: reverse ? `\\,?\\, \\cdot \\left(1 ${sign} \\frac{${t(p)}}{100}\\right) = ${t(A)}` : `${t(A)} \\cdot \\left(1 ${sign} \\frac{${t(p)}}{100}\\right) = \\,?`,
        lines,
        pic: (y) => {
          const maxP = Math.max(100, q);
          const w100 = (BW * 100) / maxP;
          const wq = (w100 * q) / 100;
          const svg =
            // original: 100%
            rect(x0, y + 40, w100, H, BLUE) +
            brace(x0, x0 + w100, y + 34, `${reverse ? "?\\, " + eq(orig) + " " : ""}${t(orig)} = 100\\%`, true, reverse ? C.green : C.ink) +
            // new: q%
            rect(x0, y + 40 + H + 22, Math.min(w100, wq), H, BLUE) +
            (spec.up
              ? rect(x0 + w100, y + 40 + H + 22, wq - w100, H, GREEN)
              : rect(x0 + wq, y + 40 + H + 22, w100 - wq, H, RED, `fill-opacity="0.55" stroke-dasharray="5 4"`)) +
            brace(x0, x0 + wq, y + 40 + 2 * H + 62, `${t(now)} = ${t(q)}\\%`, false, spec.up ? C.green : C.red) +
            ticks(x0, y + 40 + 2 * H + 24, w100, maxP, [q]);
          return { svg, h: 40 + 2 * H + 122 };
        },
      };
    }
    case "percentChange": {
      const A = numOf(spec.a);
      const B = numOf(spec.b);
      if (!A) throw new Error("zero");
      const d = B - A;
      const P = (d / A) * 100;
      return {
        head: `${t(A)} \\to ${t(B)}: \\quad ?\\,\\%`,
        lines: [
          { tex: `${t(B)} - ${t(A)} = ${t(d)}` },
          { tex: `\\frac{${t(d)}}{${t(A)}} \\cdot 100\\% ${eq(P)} ${t(P)}\\%`, note: `\\frac{${t(B)}}{${t(A)}} ${eq(B / A)} ${t(B / A)} = ${t((B / A) * 100)}\\%` },
        ],
        pic: (y) => {
          const q = (B / A) * 100;
          const maxP = Math.max(100, q);
          const w100 = (BW * 100) / maxP;
          const wq = (w100 * Math.max(0, q)) / 100;
          const up = d >= 0;
          return {
            svg:
              rect(x0, y + 40, w100, H, BLUE) +
              brace(x0, x0 + w100, y + 34, `${t(A)} = 100\\%`, true) +
              rect(x0, y + 40 + H + 22, Math.min(w100, wq), H, BLUE) +
              (up ? rect(x0 + w100, y + 40 + H + 22, wq - w100, H, GREEN) : rect(x0 + wq, y + 40 + H + 22, w100 - wq, H, RED, `fill-opacity="0.55" stroke-dasharray="5 4"`)) +
              brace(up ? x0 + w100 : x0 + wq, up ? x0 + wq : x0 + w100, y + 40 + 2 * H + 62, `${up ? "+" : ""}${t(d)} ${eq(P)} ${up ? "+" : ""}${t(P)}\\%`, false, up ? C.green : C.red) +
              ticks(x0, y + 40 + 2 * H + 24, w100, maxP, []),
            h: 40 + 2 * H + 122,
          };
        },
      };
    }
    case "interest": {
      const P0 = numOf(spec.a);
      const r = numOf(spec.p);
      const n = Math.round(numOf(spec.b));
      if (n < 0 || n > 30) throw new Error("range");
      const simple = P0 * (1 + (r / 100) * n);
      const comp = P0 * (1 + r / 100) ** n;
      return {
        head: `${t(P0)},\\ ${t(r)}\\%,\\ n = ${n}`,
        // Money: two decimals.
        lines: (() => {
          const m = (v: number) => (Math.round(v * 100) / 100).toFixed(2).replace(/\.00$/, "");
          const e = (v: number) => (Math.abs(Math.round(v * 100) / 100 - v) < 1e-9 ? "=" : "\\approx");
          return [
            { tex: `I = ${t(P0)} \\cdot \\frac{${t(r)}}{100} \\cdot ${n} ${e(simple - P0)} ${m(simple - P0)}`, note: `${t(P0)} + ${m(simple - P0)} ${e(simple)} ${m(simple)}` },
            { tex: `${t(P0)} \\cdot \\left(1 + \\frac{${t(r)}}{100}\\right)^{${n}} = ${t(P0)} \\cdot ${t(1 + r / 100)}^{${n}} ${e(comp)} ${m(comp)}` },
            { tex: `${m(comp)} - ${m(simple)} ${e(comp - simple)} ${m(comp - simple)}` },
          ];
        })(),
        pic: (y) => {
          // Year by year: simple (grey outline) against compound (blue).
          const years = Array.from({ length: n + 1 }, (_, k) => k);
          const maxV = Math.max(comp, simple);
          const ch = 180;
          const slot = Math.min(60, BW / (n + 1));
          const out: string[] = [];
          years.forEach((k) => {
            const cx = x0 + (k + 0.5) * slot;
            const vs = P0 * (1 + (r / 100) * k);
            const vc = P0 * (1 + r / 100) ** k;
            const hs = (vs / maxV) * ch;
            const hc = (vc / maxV) * ch;
            out.push(rect(cx - slot * 0.36, y + 10 + ch - hc, slot * 0.36, hc, BLUE));
            out.push(rect(cx, y + 10 + ch - hs, slot * 0.36, hs, { f: "#e9ecef", s: "#868e96" }));
            if (n <= 12 || k % Math.ceil(n / 12) === 0) out.push(texAt(String(k), cx, y + 10 + ch + 14, "middle", 0.65, "#495057").svg);
          });
          out.push(`<line x1="${x0}" y1="${y + 10 + ch}" x2="${x0 + (n + 1) * slot}" y2="${y + 10 + ch}" stroke="${C.ink}"/>`);
          out.push(texAt((Math.round(comp * 100) / 100).toFixed(2), x0 + (n + 0.32) * slot, y + 10 + ch - (comp / maxV) * ch - 12, "middle", 0.7, C.blue).svg);
          return { svg: out.join(""), h: ch + 40 };
        },
      };
    }
  }
}

// ---------- ratio ----------

/** Rows of unit squares, one row per part, with labels; returns the svg and the x-range of each row. */
function unitRows(y: number, units: number[], unitValue: string | null, labels: string[]) {
  const total = Math.max(...units);
  const size = Math.min(54, Math.floor((W - 200) / total));
  const x0 = 110;
  const out: string[] = [];
  units.forEach((u, i) => {
    const ry = y + i * (size + 16);
    out.push(texAt(labels[i], x0 - 24, ry + size / 2, "middle", 0.9, PARTS[i].s).svg);
    for (let k = 0; k < u; k++) out.push(rect(x0 + k * size, ry, size, size, PARTS[i]));
    if (unitValue && size >= 26) for (let k = 0; k < u; k++) out.push(texAt(unitValue, x0 + (k + 0.5) * size, ry + size / 2, "middle", Math.min(0.8, size / 60)).svg);
  });
  return { svg: out.join(""), h: units.length * (size + 16), x0, size };
}

function planRatio(spec: PercRatioSpec): Plan {
  const parts = parseRatio(spec.ratio);
  const names = ["A", "B", "C", "D"].slice(0, parts.length);
  // The terms as typed (decimals stay decimals; fractions become LaTeX fractions).
  const typed = spec.ratio.split(/[:∶]/).map((x) => x.trim()).filter(Boolean).map((x) => x.replace(/^(\d+)\/(\d+)$/, "\\frac{$1}{$2}"));
  const rTex = (xs: (string | number)[]) => xs.join(" : ");
  // Make the ratio whole-numbered and simplest.
  const toInts = (): { ints: number[]; lines: Line[] } => {
    const lines: Line[] = [];
    let ints = parts.map((f) => f.n);
    if (parts.some((f) => f.d !== 1)) {
      const L = parts.reduce((m, f) => lcm(m, f.d), 1);
      ints = parts.map((f) => (f.n * L) / f.d);
      lines.push({ tex: `${rTex(typed)} = ${rTex(ints)}`, note: `\\cdot ${L}` });
    }
    const g = ints.reduce(gcd);
    if (g > 1) {
      const s = ints.map((v) => v / g);
      lines.push({ tex: `${rTex(ints)} = ${rTex(s)}`, note: `\\div ${g}` });
      ints = s;
    }
    return { ints, lines };
  };
  switch (spec.kind as RatioKind) {
    case "simplify": {
      const { ints, lines } = toInts();
      const raw = parts.map((f) => f.toNumber());
      if (!lines.length) lines.push({ tex: `\\gcd(${rTex(ints).replace(/ : /g, ", ")}) = 1` });
      if (parts.length === 2) lines.push({ tex: `${rTex(ints)} = 1 : ${t(ints[1] / ints[0])}`, note: `= ${t(ints[0] / ints[1])} : 1` });
      lines.push({ tex: `${rTex(typed)} = ${rTex(ints)}` });
      return {
        head: `${rTex(typed)} = \\,?`,
        lines,
        pic: (y) => {
          const g = raw.every((v) => Number.isInteger(v)) ? raw.reduce((a, b) => gcd(a, b)) : 0;
          if (!g || ints.reduce((s, v) => s + v, 0) > 40) return { svg: "", h: 0 };
          // Each square is a group of g — the same number of groups in the simplified ratio.
          const rows = unitRows(y, ints, t(g), names);
          return rows;
        },
      };
    }
    case "share": {
      const { ints, lines } = toInts();
      const T = numOf(spec.a);
      const sum = ints.reduce((s, v) => s + v, 0);
      const u = T / sum;
      lines.push({ tex: `${ints.join(" + ")} = ${sum}\\ ${U}` });
      lines.push({ tex: `${sum}\\ ${U} = ${t(T)} \\;\\Rightarrow\\; 1\\ ${U} = \\frac{${t(T)}}{${sum}} ${eq(u)} ${t(u)}` });
      lines.push({ tex: ints.map((v, i) => `${names[i]} = ${v} \\cdot ${t(u)} ${eq(v * u)} ${t(v * u)}`).join(",\\quad ") });
      return {
        head: `${t(T)} \\;\\to\\; ${rTex(typed)}`,
        lines,
        pic: (y) => {
          if (Math.max(...ints) > 30) return { svg: "", h: 0 };
          const rows = unitRows(y + 10, ints, t(u), names);
          const right = rows.x0 + Math.max(...ints) * rows.size;
          // A bracket on the right spanning every row: the total.
          const out = rows.svg + `<path d="M${right + 12},${y + 10} h8 V${y + 10 + rows.h - 16} h-8" fill="none" stroke="${C.ink}" stroke-width="1.6"/>` + texAt(t(T), right + 26, y + 10 + (rows.h - 16) / 2, "start", 0.9).svg;
          return { svg: out, h: rows.h + 20 };
        },
      };
    }
    case "partKnown": {
      const { ints, lines } = toInts();
      const V = numOf(spec.a);
      const idx = Math.round(numOf(spec.b)) - 1;
      if (idx < 0 || idx >= ints.length) throw new Error("part");
      const u = V / ints[idx];
      const sum = ints.reduce((s, v) => s + v, 0);
      lines.push({ tex: `${names[idx]}: ${ints[idx]}\\ ${U} = ${t(V)} \\;\\Rightarrow\\; 1\\ ${U} = \\frac{${t(V)}}{${ints[idx]}} ${eq(u)} ${t(u)}` });
      lines.push({ tex: ints.map((v, i) => `${names[i]} = ${v} \\cdot ${t(u)} ${eq(v * u)} ${t(v * u)}`).join(",\\quad ") });
      lines.push({ tex: `${sum}\\ ${U} = ${sum} \\cdot ${t(u)} ${eq(sum * u)} ${t(sum * u)}` });
      return {
        head: `${rTex(names)} = ${rTex(typed)}, \\quad ${names[idx]} = ${t(V)}`,
        lines,
        pic: (y) => {
          if (Math.max(...ints) > 30) return { svg: "", h: 0 };
          const rows = unitRows(y + 10, ints, t(u), names);
          const ry = y + 10 + idx * (rows.size + 16);
          const right = rows.x0 + ints[idx] * rows.size;
          const out = rows.svg + `<path d="M${right + 10},${ry} h8 V${ry + rows.size} h-8" fill="none" stroke="${C.blue}" stroke-width="1.6"/>` + texAt(t(V), right + 24, ry + rows.size / 2, "start", 0.9, C.blue).svg;
          return { svg: out, h: rows.h + 20 };
        },
      };
    }
    case "proportion": {
      if (parts.length !== 2) throw new Error("ratio");
      const [a, b] = parts.map((f) => f.toNumber());
      const c = numOf(spec.a);
      const k = c / a;
      const x = b * k;
      return {
        head: `${t(a)} : ${t(b)} = ${t(c)} : x`,
        lines: [
          { tex: `\\frac{${t(a)}}{${t(b)}} = \\frac{${t(c)}}{x} \\;\\Rightarrow\\; ${t(a)} \\cdot x = ${t(b)} \\cdot ${t(c)}` },
          { tex: `x = \\frac{${t(b)} \\cdot ${t(c)}}{${t(a)}} ${eq(x)} ${t(x)}`, note: `k = \\frac{${t(c)}}{${t(a)}} ${eq(k)} ${t(k)},\\ x = ${t(b)} \\cdot k` },
          { tex: `${t(a)} : ${t(b)} = ${t(c)} : ${t(x)}` },
        ],
        pic: (y) => {
          // Ratio table with the scale factor.
          const cx = [W / 2 - 110, W / 2 + 110];
          const out: string[] = [];
          const cell = (px: number, py: number, s: string, col: { f: string; s: string }) => rect(px - 50, py, 100, 44, col) + texAt(s, px, py + 22, "middle", 1).svg;
          out.push(cell(cx[0], y + 10, t(a), BLUE), cell(cx[0], y + 64, t(b), ORANGE), cell(cx[1], y + 10, t(c), BLUE), cell(cx[1], y + 64, t(x), GREEN));
          for (const yy of [y + 32, y + 86])
            out.push(
              `<defs><marker id="pr-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${C.purple}"/></marker></defs>`,
              `<line x1="${cx[0] + 56}" y1="${yy}" x2="${cx[1] - 56}" y2="${yy}" stroke="${C.purple}" stroke-width="2" marker-end="url(#pr-ah)"/>`,
              texAt(`\\times ${t(k)}`, W / 2, yy - 12, "middle", 0.8, C.purple).svg,
            );
          return { svg: out.join(""), h: 124 };
        },
      };
    }
  }
}

export function planPercRatio(spec: PercRatioSpec): Plan {
  return (PERCENT_KINDS as PRKind[]).includes(spec.kind) ? planPercent(spec) : planRatio(spec);
}

export function percRatioStepCount(spec: PercRatioSpec): number {
  try {
    return planPercRatio(spec).lines.length;
  } catch {
    return 0;
  }
}

export function renderPercRatio(spec: PercRatioSpec): RenderedSvg {
  const plan = planPercRatio(spec);
  const k = Math.max(0, Math.min(spec.step, plan.lines.length));
  const parts: string[] = [];
  let y = 18;
  plan.lines.slice(0, k).forEach((l, i) => {
    const last = i === plan.lines.length - 1;
    const tt = texAt(l.tex, 24, y + 12, "start", 0.95, last ? C.green : undefined);
    parts.push(tt.svg);
    if (l.note) {
      const nt = texAt(l.note, 24 + tt.w + 26, y + 12, "start", 0.75, "#868e96");
      if (24 + tt.w + 26 + nt.w < W - 8) parts.push(nt.svg);
      else parts.push(texAt(l.note, W - 16, y + 12 + 32, "end", 0.75, "#868e96").svg), (y += 30);
    }
    y += l.tex.includes("^{") || l.tex.includes("\\left") ? 66 : 54;
  });
  const pic = plan.pic(y + 4);
  parts.push(pic.svg);
  y += pic.h + 4;
  return compose(plan.head, parts.join(""), y, []);
}
