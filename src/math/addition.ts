// Addition models for the first sums: counters in two boxes put together, and jumps along a number line (to a, then
// counting on b, one hop at a time while b is small and the hops are big enough to see). `step` reveals a, then b (a large value shows everything).
// Once every step is shown, the sum the other way round is written under it (a + b = b + a), and adding 0 writes
// its rule in symbols: n + 0 = n or 0 + n = n.
import type { RenderedSvg } from "./latex";

export type AddStyle = "counters" | "numberline";
export const ADD_STYLES: AddStyle[] = ["counters", "numberline"];

export type AddSpec = { type: "addition"; style: AddStyle; a: number; b: number; step: number };

export const ADD_LIMITS: Record<AddStyle, { a: number; b: number }> = {
  counters: { a: 20, b: 20 },
  numberline: { a: 50, b: 50 },
};

/** The special cases of addition: adding 0 changes nothing, and adding 1 gives the next number. 0 decides over 1. */
export type AddCase = "zero" | "one";
export const addCase = (a: number, b: number): AddCase | null => (a === 0 || b === 0 ? "zero" : a === 1 || b === 1 ? "one" : null);

/** The rule for adding 0, written the way round the numbers are: n + 0 = n or 0 + n = n. */
export const addRule = (a: number, b: number): string | null => (b === 0 ? "n + 0 = n" : a === 0 ? "0 + n = n" : null);

/** Two steps: a, then b. */
export const addStepCount = (_spec: AddSpec) => 2;

const INK = "#1e1e1e";
const FONT = `font-family="Segoe UI, Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;
const PAD = 16;
const A = { fill: "#a5d8ff", stroke: "#1971c2" };
const B = { fill: "#ffd8a8", stroke: "#e8590c" };
const GREY = "#868e96";
const GREEN = "#2f9e44";

const text = (x: number, y: number, s: string, o: { size?: number; anchor?: string; color?: string; bold?: boolean } = {}) =>
  `<text x="${Math.round(x * 10) / 10}" y="${Math.round(y * 10) / 10}" font-size="${o.size ?? 16}" text-anchor="${o.anchor ?? "middle"}" fill="${o.color ?? INK}"${o.bold ? ' font-weight="700"' : ""}>${s}</text>`;
const width = (s: string, size = 16) => s.length * size * 0.56;

function wrap(w: number, h: number, body: string): RenderedSvg {
  const W = Math.ceil(w);
  const H = Math.ceil(h);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g ${FONT}>${body}</g></svg>`, width: W, height: H };
}

/** The sum (or what is known of it so far), the sum the other way round, and the rule for 0; returns the bottom. */
function equations(out: string[], { a, b }: AddSpec, k: number, y: number): number {
  const done = k >= 2;
  out.push(text(PAD, y, done ? `${a} + ${b} = ${a + b}` : k === 1 ? `${a} + ? = ?` : "? + ? = ?", { anchor: "start", size: 22, bold: true }));
  if (!done) return y;
  if (a !== b) out.push(text(PAD, (y += 28), `${b} + ${a} = ${a + b}`, { anchor: "start", size: 18, color: GREY }));
  const rule = addRule(a, b);
  if (rule) out.push(text(PAD, (y += 30), rule, { anchor: "start", size: 18, color: GREEN, bold: true }));
  return y;
}

/** a counters in one box and b in another, five to a row; an empty box is drawn dashed. */
function counters(spec: AddSpec, k: number) {
  const { a, b } = spec;
  const P = 26;
  const rows = Math.max(1, Math.ceil(Math.max(a, b) / 5));
  const bw = 5 * P + 16;
  const bh = rows * P + 16;
  const x0 = PAD;
  const y0 = PAD + 8;
  const out: string[] = [];
  const box = (x: number, n: number, c: typeof A, shown: boolean) => {
    const filled = shown && n > 0;
    out.push(`<rect x="${x}" y="${y0}" width="${bw}" height="${bh}" rx="10" fill="${filled ? "#fff" : "none"}" stroke="${shown ? c.stroke : "#ced4da"}" stroke-width="2"${filled ? "" : ' stroke-dasharray="6 5"'}/>`);
    if (shown) {
      for (let i = 0; i < n; i++)
        out.push(`<circle cx="${x + 8 + (i % 5) * P + P / 2}" cy="${y0 + 8 + Math.floor(i / 5) * P + P / 2}" r="10" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>`);
      out.push(text(x + bw / 2, y0 + bh + 26, String(n), { bold: true, size: 18, color: c.stroke }));
    }
  };
  box(x0, a, A, k >= 1);
  out.push(text(x0 + bw + 22, y0 + bh / 2 + 9, "+", { size: 28, bold: true }));
  box(x0 + bw + 44, b, B, k >= 2);
  const bottom = equations(out, spec, k, y0 + bh + 66);
  const W = Math.max(x0 + 2 * bw + 44 + PAD, PAD * 2 + width(`${a} + ${b} = ${a + b}`, 22));
  return wrap(W, bottom + PAD, out.join(""));
}

/** A jump from 0 to a, then b hops of 1 counting on (one jump of b when b is over 10 or the hops are tiny); +0 is a loop at a. */
function numberline(spec: AddSpec, k: number) {
  const { a, b } = spec;
  const end = Math.max(a + b, 10);
  const unit = Math.max(8, Math.min(40, 600 / (end + 1)));
  const every = unit >= 22 ? 1 : unit >= 11 ? 2 : 5; // label every unit, or every 2nd or 5th
  const x0 = PAD + 14;
  const lineY = PAD + 110;
  const X = (v: number) => x0 + v * unit;
  const out: string[] = [
    `<defs>${[A, B].map((c, i) => `<marker id="j${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${c.stroke}"/></marker>`).join("")}</defs>`,
    `<line x1="${X(0) - 8}" y1="${lineY}" x2="${X(end) + 16}" y2="${lineY}" stroke="${INK}" stroke-width="2"/>`,
  ];
  const landA = k >= 1;
  const landB = k >= 2;
  const landed = [landA && a, landB && a + b].filter((v): v is number => v !== false);
  for (let v = 0; v <= end; v++) {
    // Every few units are numbered, and where a jump lands; a number too close to a landing gives way to it.
    const labelled = landed.includes(v) || (v % every === 0 && landed.every((l) => Math.abs(v - l) >= every));
    out.push(`<line x1="${X(v)}" y1="${lineY - (labelled ? 8 : 5)}" x2="${X(v)}" y2="${lineY + (labelled ? 8 : 5)}" stroke="${INK}" stroke-width="${labelled ? 2 : 1}"/>`);
    const color = landB && v === a + b ? B.stroke : landA && v === a ? A.stroke : null;
    if (labelled) out.push(text(X(v), lineY + 28, String(v), { bold: !!color, color: color ?? INK, size: color ? 17 : 14 }));
  }
  const arc = (from: number, to: number, c: typeof A, id: number, label: string) => {
    const [s, e] = [X(from), X(to)];
    const h = Math.min(70, 16 + (e - s) * 0.3);
    out.push(`<path d="M${s},${lineY - 4} Q${(s + e) / 2},${lineY - 4 - h * 2} ${e},${lineY - 4}" fill="none" stroke="${c.stroke}" stroke-width="2.5" marker-end="url(#j${id})"/>`);
    if (label) out.push(text((s + e) / 2, lineY - 10 - h, label, { bold: true, color: c.stroke, size: 14 }));
  };
  if (landA && a > 0) arc(0, a, A, 0, `+${a}`);
  if (landB) {
    if (b === 0) {
      // Adding 0 goes nowhere: a loop back to a.
      const x = X(a);
      out.push(`<path d="M${x - 3},${lineY - 6} C${x - 26},${lineY - 56} ${x + 26},${lineY - 56} ${x + 3},${lineY - 6}" fill="none" stroke="${B.stroke}" stroke-width="2.5" marker-end="url(#j1)"/>`);
      out.push(text(x, lineY - 50, "+0", { bold: true, color: B.stroke, size: 14 }));
    } else if (b <= 10 && unit >= 20) for (let i = 0; i < b; i++) arc(a + i, a + i + 1, B, 1, unit >= 22 ? "+1" : "");
    else arc(a, a + b, B, 1, `+${b}`);
  }
  const bottom = equations(out, spec, k, lineY + 70);
  return wrap(Math.max(X(end) + 40, PAD * 2 + width(`${a} + ${b} = ${a + b}`, 22)), bottom + PAD, out.join(""));
}

export function renderAddition(spec: AddSpec): RenderedSvg {
  const lim = ADD_LIMITS[spec.style];
  if (!(Number.isInteger(spec.a) && Number.isInteger(spec.b) && spec.a >= 0 && spec.b >= 0 && spec.a <= lim.a && spec.b <= lim.b)) throw new Error("range");
  const k = Math.max(0, Math.min(spec.step, addStepCount(spec)));
  return spec.style === "counters" ? counters(spec, k) : numberline(spec, k);
}
