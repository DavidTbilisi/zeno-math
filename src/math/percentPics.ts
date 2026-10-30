// The worked pictures for the percentage questions: bars cut into equal chunks of one step (10 %, or 5 %, 20 %, 25 %:
// whatever the percents in the question are made of), each chunk with its amount written in it, so a percent is a
// count of chunks and the answer is chunks added up. Percents under the bar, amounts in it: a double number line.
// Of: 100 % is the whole amount; the chunks the percent covers are green. Change: the price before (100 %) and after,
// the chunks gained green or the chunks lost dashed red; the change counted in chunks is the percent. Before the
// change: the price after is known (100 % + p %), cut into its chunks; the price before is 100 % of them, green.
import { C, FONT, r2 } from "./chart";

export type PercentSolution =
  | { pic: "of"; p: number; a: number }
  | { pic: "change"; a: number; b: number }
  | { pic: "reverse"; p: number; now: number; up: boolean };

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** The amount, without floating dust. */
const num = (v: number) => String(Number(v.toFixed(6)));

/** The chunk the bars are cut into: a percent that goes into both 100 and the question's percent. */
export function percentStep(s: PercentSolution): { step: number; p: number; whole: number; unit: number } {
  if (s.pic === "of") {
    const step = gcd(s.p, 100);
    return { step, p: s.p, whole: s.a, unit: (s.a * step) / 100 };
  }
  if (s.pic === "change") {
    const p = Math.round((Math.abs(s.b - s.a) * 100) / s.a);
    const step = gcd(p, 100);
    return { step, p, whole: s.a, unit: (s.a * step) / 100 };
  }
  const step = gcd(s.p, 100);
  const whole = (s.now * 100) / (100 + (s.up ? s.p : -s.p));
  return { step, p: s.p, whole, unit: (whole * step) / 100 };
}

/** The written working, as LaTeX lines: through one chunk. */
export function percentSteps(s: PercentSolution): string[] {
  const { step, p, whole, unit } = percentStep(s);
  const k = p / step;
  const n = 100 / step;
  if (s.pic === "of") return [`100\\% = ${num(whole)}`, `${step}\\% = ${num(whole)} \\div ${n} = ${num(unit)}`, `${p}\\% = ${k} \\times ${num(unit)} = ${num(k * unit)}`];
  if (s.pic === "change") {
    const [lo, hi] = s.b > s.a ? [s.a, s.b] : [s.b, s.a];
    const sign = s.b > s.a ? "+" : "-";
    return [`${num(hi)} - ${num(lo)} = ${num(hi - lo)}`, `100\\% = ${num(whole)},\\ ${step}\\% = ${num(whole)} \\div ${n} = ${num(unit)}`, `${num(hi - lo)} = ${k} \\times ${num(unit)}`, `${sign === "-" ? "-" : ""}${k} \\times ${step}\\% = ${sign}${p}\\%`];
  }
  const after = 100 + (s.up ? p : -p);
  return [`100\\% ${s.up ? "+" : "-"} ${p}\\% = ${after}\\%`, `${after}\\% = ${num(s.now)}`, `${step}\\% = ${num(s.now)} \\div ${after / step} = ${num(unit)}`, `100\\% = ${n} \\times ${num(unit)} = ${num(whole)}`];
}

const BLUE = { fill: "#a5d8ff", stroke: C.blue };
const GREEN = { fill: "#b2f2bb", stroke: C.green };
const BH = 34;

function text(x: number, y: number, s: string, size: number, color: string = C.ink, bold = false, anchor = "middle") {
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}"${bold ? ' font-weight="700"' : ""}>${s}</text>`;
}

/** A brace from x1 to x2, opening down (above a bar) or up (below one), with its label. */
function brace(x1: number, x2: number, y: number, label: string, color: string, below: boolean) {
  const d = below ? 1 : -1;
  const mid = (x1 + x2) / 2;
  return (
    `<path d="M ${r2(x1)} ${y} q 0 ${8 * d} 8 ${8 * d} H ${r2(mid - 6)} l 6 ${6 * d} l 6 ${-6 * d} H ${r2(x2 - 8)} q 8 0 8 ${-8 * d}" fill="none" stroke="${color}" stroke-width="1.8"/>` +
    text(mid, y + (below ? 32 : -18), label, 16, color, true)
  );
}

type Chunk = "base" | "answer" | "lost";

/** A bar of chunks from x0, each `w` wide: filled by kind, the amount in each, ticks with percents under when asked. */
function bar(out: string[], x0: number, y: number, w: number, kinds: Chunk[], unit: number, step: number, percents: Set<number> | null) {
  kinds.forEach((kind, i) => {
    const x = x0 + i * w;
    const c = kind === "answer" ? GREEN : BLUE;
    if (kind === "lost") out.push(`<rect x="${r2(x)}" y="${y}" width="${r2(w)}" height="${BH}" fill="#fff5f5" stroke="${C.red}" stroke-width="1.5" stroke-dasharray="5 4"/>`);
    else out.push(`<rect x="${r2(x)}" y="${y}" width="${r2(w)}" height="${BH}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>`);
    const label = num(unit);
    if (w >= label.length * 7.5 + 4) out.push(text(x + w / 2, y + BH / 2 + 5, label, w >= 30 ? 14 : 12, kind === "lost" ? C.red : C.ink));
  });
  if (!percents) return;
  for (let i = 0; i <= kinds.length; i++) {
    const pc = i * step;
    const x = x0 + i * w;
    out.push(`<line x1="${r2(x)}" y1="${y + BH}" x2="${r2(x)}" y2="${y + BH + 6}" stroke="${C.grey}" stroke-width="1.5"/>`);
    if (percents.has(pc)) out.push(text(x, y + BH + 20, `${pc}%`, 12, C.grey));
  }
}

/**
 * Which percents the ticks name: every one when the chunks are wide enough, else the ones the question uses, then 0
 * and 100 where they don't crowd them.
 */
function named(n: number, step: number, w: number, keep: number[]) {
  if (w >= 34) return new Set(Array.from({ length: n + 1 }, (_, i) => i * step));
  const out: number[] = [];
  for (const pc of [...keep, 0, 100]) if (out.every((q) => (Math.abs(q - pc) / step) * w >= 34)) out.push(pc);
  return new Set(out);
}

export function percentSvg(s: PercentSolution): { body: string; w: number; h: number } {
  const { step, p, whole, unit } = percentStep(s);
  const k = p / step;
  const n = 100 / step;
  const x0 = s.pic === "change" ? 50 : 20;
  const out: string[] = [];
  if (s.pic === "of") {
    const w = 480 / n;
    const y = 40;
    out.push(brace(x0, x0 + 480, y - 4, `100% = ${num(whole)}`, C.ink, false));
    bar(out, x0, y, w, Array.from({ length: n }, (_, i) => (i < k ? "answer" : "base")), unit, step, named(n, step, w, [p]));
    out.push(brace(x0, x0 + k * w, y + BH + 28, `${p}% = ${num(k * unit)}`, C.green, true));
    return { body: out.join(""), w: 520, h: y + BH + 72 };
  }
  // Change and before the change: the bar before (100 %) over the bar after (100 % ± p %), chunks the same size.
  const up = s.pic === "change" ? s.b > s.a : s.up;
  const after = n + (up ? k : -k);
  const w = 480 / Math.max(n, n + (up ? k : 0));
  const [y1, y2] = [40, 40 + BH + 56];
  const before = Array.from({ length: n }, (): Chunk => (s.pic === "reverse" ? "answer" : "base"));
  out.push(brace(x0, x0 + n * w, y1 - 4, s.pic === "reverse" ? `? = ${num(whole)} = 100%` : `${num(whole)} = 100%`, s.pic === "reverse" ? C.green : C.ink, false));
  bar(out, x0, y1, w, before, unit, step, null);
  const kinds: Chunk[] = Array.from({ length: Math.max(n, after) }, (_, i) => (i < Math.min(n, after) ? "base" : up ? (s.pic === "change" ? "answer" : "base") : "lost"));
  bar(out, x0, y2, w, kinds, unit, step, named(kinds.length, step, w, [100 + (up ? p : -p)]));
  // The chunks under 100 % line up: a dashed line down from the end of the bar before.
  out.push(`<line x1="${r2(x0 + n * w)}" y1="${y1 + BH}" x2="${r2(x0 + n * w)}" y2="${y2}" stroke="${C.grey}" stroke-dasharray="4 4"/>`);
  const yb = y2 + BH + 28;
  if (s.pic === "change") {
    const [xa, xb] = [x0 + Math.min(n, after) * w, x0 + Math.max(n, after) * w];
    out.push(brace(xa, xb, yb, `${up ? "+" : "−"}${num(k * unit)} = ${up ? "+" : "−"}${p}%`, up ? C.green : C.red, true));
    // Before and after, written left of their bars.
    out.push(text(x0 - 8, y1 + BH / 2 + 6, num(s.a), 16, C.ink, true, "end"));
    out.push(text(x0 - 8, y2 + BH / 2 + 6, num(s.b), 16, C.ink, true, "end"));
  } else out.push(brace(x0, x0 + after * w, yb, `${num(s.now)} = ${100 + (up ? p : -p)}%`, C.ink, true));
  return { body: out.join(""), w: x0 + 500, h: yb + 44 };
}

export function renderPercent(spec: PercentSolution, steps: { svg: string; width: number; height: number } | null) {
  const pic = percentSvg(spec);
  const w = Math.max(pic.w + 20, steps?.width ?? 0);
  const ph = pic.h + 20;
  const h = ph + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${r2(ph)})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${r2(h)}" viewBox="0 0 ${w} ${r2(h)}"><rect width="${w}" height="${r2(h)}" fill="#ffffff"/><g ${FONT} transform="translate(${r2((w - pic.w) / 2)} 10)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
