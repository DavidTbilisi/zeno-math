// Addition and subtraction models for the first sums. Addition: counters in two boxes put together, or jumps along a
// number line (to a, then counting on b). Subtraction: counters taken away from one box (crossed out), or starting at
// a on the number line and counting back b. Counting goes a hop at a time while b is small and the hops are big
// enough to see. `step` reveals a, then b (a large value shows everything). Once every step is shown, a sum is written
// the other way round under it (a + b = b + a) and a difference is checked by adding back (a − b = c, so c + b = a);
// the special cases write their rule in symbols: n + 0 = n, 0 + n = n, n − 0 = n, n − n = 0.
// Same difference: a − b is the gap between a and b on the number line, and sliding both the same way keeps the gap,
// so both slide until b is a whole ten (63 − 28 = 65 − 30 = 35). Three steps: the gap, the slide, the answer.
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

/** Two steps: a, then b. Same difference has three: the gap, the slide, the answer. */
export const addStepCount = (spec: AddSpec | SubSpec) => (spec.type === "subtraction" && spec.style === "same" ? 3 : 2);

export type SubStyle = "takeaway" | "numberline" | "same";
export const SUB_STYLES: SubStyle[] = ["takeaway", "numberline", "same"];

/** a − b with whole numbers, b at most a. */
export type SubSpec = { type: "subtraction"; style: SubStyle; a: number; b: number; step: number };

export const SUB_LIMITS: Record<SubStyle, number> = { takeaway: 20, numberline: 50, same: 100 };

/** How far same difference slides both numbers: b to the nearest whole ten (up from a 5), so 28 → +2 and 52 → −2. */
export const sameShift = (b: number) => Math.round(b / 10) * 10 - b;

const signed = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);

/**
 * The special cases of subtraction: taking away 0 changes nothing, taking a number from itself leaves 0, and taking
 * away 1 gives the number before. 0 decides over the others (0 − 0), then n − n (1 − 1).
 */
export type SubCase = "zero" | "self" | "one";
export const subCase = (a: number, b: number): SubCase | null => (b === 0 ? "zero" : a === b ? "self" : b === 1 ? "one" : null);

/** The rule a special case of subtraction follows, in symbols: n − 0 = n or n − n = 0 (taking away 1 has none). */
export const subRule = (a: number, b: number): string | null => (b === 0 ? "n − 0 = n" : a === b ? "n − n = 0" : null);

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

/**
 * The sum or difference (or what is known of it so far); once done, the same fact another way (grey) and the special
 * case's rule (green). Returns the bottom.
 */
function equations(out: string[], spec: AddSpec | SubSpec, k: number, y: number): number {
  const { type, a, b } = spec;
  const done = k >= addStepCount(spec);
  const op = type === "addition" ? "+" : "−";
  const c = type === "addition" ? a + b : a - b;
  if (spec.style === "same") {
    // a − b = a′ − b′ = c, the slid difference written in once the slide is shown.
    const s = sameShift(b);
    const slid = k >= 2 && s !== 0 ? ` = ${a + s} − ${b + s}` : "";
    out.push(text(PAD, y, k === 0 ? "? − ? = ?" : `${a} − ${b}${slid} = ${done ? c : "?"}`, { anchor: "start", size: 22, bold: true }));
    if (k >= 2 && s !== 0) out.push(text(PAD, (y += 28), sameWhy(a, b), { anchor: "start", size: 18, color: GREY }));
    if (!done) return y;
  } else {
    out.push(text(PAD, y, done ? `${a} ${op} ${b} = ${c}` : k === 1 ? `${a} ${op} ? = ?` : `? ${op} ? = ?`, { anchor: "start", size: 22, bold: true }));
    if (!done) return y;
  }
  const other = type === "addition" ? (a !== b ? `${b} + ${a} = ${c}` : null) : `${c} + ${b} = ${a}`;
  if (other) out.push(text(PAD, (y += 28), other, { anchor: "start", size: 18, color: GREY }));
  const rule = type === "addition" ? addRule(a, b) : subRule(a, b);
  if (rule) out.push(text(PAD, (y += 30), rule, { anchor: "start", size: 18, color: GREEN, bold: true }));
  return y;
}

/** The slide written out: (63 + 2) − (28 + 2) = 65 − 30. */
function sameWhy(a: number, b: number) {
  const s = sameShift(b);
  const by = s < 0 ? `− ${-s}` : `+ ${s}`;
  return `(${a} ${by}) − (${b} ${by}) = ${a + s} − ${b + s}`;
}

/**
 * A number line from lo to hi at `unit` px a unit: a tick at every number, numbered every 1, 2 or 5 units (by how much
 * room there is) and at the marked numbers, in their colour; a number too close to a marked one gives way to it.
 */
function axis(out: string[], y: number, lo: number, hi: number, X: (v: number) => number, unit: number, marks: [number, string][]) {
  const f = hi >= 100 ? 1.4 : 1; // three-digit numbers need more room
  const every = unit >= 22 * f ? 1 : unit >= 11 * f ? 2 : 5;
  out.push(`<line x1="${X(lo) - 8}" y1="${y}" x2="${X(hi) + 16}" y2="${y}" stroke="${INK}" stroke-width="2"/>`);
  for (let v = lo; v <= hi; v++) {
    const color = marks.find(([m]) => m === v)?.[1];
    const labelled = !!color || (v % every === 0 && marks.every(([m]) => Math.abs(v - m) >= every));
    out.push(`<line x1="${X(v)}" y1="${y - (labelled ? 8 : 5)}" x2="${X(v)}" y2="${y + (labelled ? 8 : 5)}" stroke="${INK}" stroke-width="${labelled ? 2 : 1}"/>`);
    if (labelled) out.push(text(X(v), y + 28, String(v), { bold: !!color, color: color ?? INK, size: color ? 17 : 14 }));
  }
}

const ARROWS = `<defs>${[A, B].map((c, i) => `<marker id="j${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${c.stroke}"/></marker>`).join("")}</defs>`;

/** a counters in a box, five to a row; once b is shown, the last b are crossed out (taken away). */
function takeaway(spec: SubSpec, k: number) {
  const { a, b } = spec;
  const P = 26;
  const bw = 5 * P + 16;
  const bh = Math.max(1, Math.ceil(a / 5)) * P + 16;
  const x0 = PAD;
  const y0 = PAD + 8;
  const out: string[] = [];
  const shown = k >= 1;
  const taken = k >= 2;
  const filled = shown && a > 0;
  out.push(`<rect x="${x0}" y="${y0}" width="${bw}" height="${bh}" rx="10" fill="${filled ? "#fff" : "none"}" stroke="${shown ? A.stroke : "#ced4da"}" stroke-width="2"${filled ? "" : ' stroke-dasharray="6 5"'}/>`);
  if (shown) {
    for (let i = 0; i < a; i++) {
      const [cx, cy] = [x0 + 8 + (i % 5) * P + P / 2, y0 + 8 + Math.floor(i / 5) * P + P / 2];
      const gone = taken && i >= a - b;
      out.push(`<circle cx="${cx}" cy="${cy}" r="10" fill="${gone ? "#f1f3f5" : A.fill}" stroke="${gone ? "#adb5bd" : A.stroke}" stroke-width="1.5"/>`);
      if (gone) out.push(`<path d="M${cx - 8},${cy - 8}L${cx + 8},${cy + 8}M${cx + 8},${cy - 8}L${cx - 8},${cy + 8}" stroke="${B.stroke}" stroke-width="2.5" stroke-linecap="round"/>`);
    }
    out.push(text(x0 + bw / 2, y0 + bh + 26, String(a), { bold: true, size: 18, color: A.stroke }));
    if (taken) out.push(text(x0 + bw + 14, y0 + bh / 2 + 7, `− ${b}`, { anchor: "start", bold: true, size: 20, color: B.stroke }));
  }
  const bottom = equations(out, spec, k, y0 + bh + 66);
  const W = Math.max(x0 + bw + 70 + PAD, PAD * 2 + width(`${a} − ${b} = ${a - b}`, 22));
  return wrap(W, bottom + PAD, out.join(""));
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

/**
 * Adding: a jump from 0 to a, then b hops of 1 counting on. Taking away: a dot at a, then b hops of 1 counting back.
 * One jump of b instead when b is over 10 or the hops would be tiny; ±0 is a loop at a.
 */
function numberline(spec: AddSpec | SubSpec, k: number) {
  const { a, b } = spec;
  const add = spec.type === "addition";
  const sign = add ? "+" : "−";
  const c = add ? a + b : a - b;
  const end = Math.max(add ? c : a, 10); // the line runs to the furthest number reached, and at least to 10
  const unit = Math.max(8, Math.min(40, 600 / (end + 1)));
  const x0 = PAD + 14;
  const lineY = PAD + 110;
  const X = (v: number) => x0 + v * unit;
  const out: string[] = [ARROWS];
  const landA = k >= 1;
  const landB = k >= 2;
  // Where a jump lands is numbered, in its colour.
  axis(out, lineY, 0, end, X, unit, [...(landB ? [[c, B.stroke] as [number, string]] : []), ...(landA ? [[a, A.stroke] as [number, string]] : [])]);
  const arc = (from: number, to: number, c: typeof A, id: number, label: string) => {
    const [s, e] = [X(from), X(to)];
    const h = Math.min(70, 16 + Math.abs(e - s) * 0.3);
    out.push(`<path d="M${s},${lineY - 4} Q${(s + e) / 2},${lineY - 4 - h * 2} ${e},${lineY - 4}" fill="none" stroke="${c.stroke}" stroke-width="2.5" marker-end="url(#j${id})"/>`);
    if (label) out.push(text((s + e) / 2, lineY - 10 - h, label, { bold: true, color: c.stroke, size: 14 }));
  };
  // Adding starts with a jump to a; taking away starts at a, marked with a dot.
  if (landA && add && a > 0) arc(0, a, A, 0, `+${a}`);
  if (landA && !add) out.push(`<circle cx="${X(a)}" cy="${lineY}" r="6" fill="${A.stroke}"/>`);
  if (landB) {
    const dir = add ? 1 : -1;
    if (b === 0) {
      // Adding or taking away 0 goes nowhere: a loop back to a.
      const x = X(a);
      out.push(`<path d="M${x - 3},${lineY - 6} C${x - 26},${lineY - 56} ${x + 26},${lineY - 56} ${x + 3},${lineY - 6}" fill="none" stroke="${B.stroke}" stroke-width="2.5" marker-end="url(#j1)"/>`);
      out.push(text(x, lineY - 50, `${sign}0`, { bold: true, color: B.stroke, size: 14 }));
    } else if (b <= 10 && unit >= 20) for (let i = 0; i < b; i++) arc(a + dir * i, a + dir * (i + 1), B, 1, unit >= 22 ? `${sign}1` : "");
    else arc(a, c, B, 1, `${sign}${b}`);
  }
  const bottom = equations(out, spec, k, lineY + 70);
  return wrap(Math.max(X(end) + 40, PAD * 2 + width(`${a} ${sign} ${b} = ${c}`, 22)), bottom + PAD, out.join(""));
}

/**
 * Same difference: a and b on a number line with the gap between them bracketed; below, both slid the same way so b is
 * a whole ten, on a second line at the same scale, the gap bracketed again and just as long. The gap is the answer.
 * The lines show only the stretch the numbers are in, from the ten below b to the ten above a.
 */
function same(spec: SubSpec, k: number) {
  const { a, b } = spec;
  const s = sameShift(b);
  const c = a - b;
  const lo = Math.floor(Math.min(b, b + s) / 10) * 10;
  const hi = Math.max(Math.ceil(Math.max(a, a + s) / 10) * 10, lo + 10);
  const unit = Math.max(8, Math.min(40, 600 / (hi - lo + 1)));
  const x0 = PAD + 34; // room for b's slide label when b is at the start of the line
  const X = (v: number) => x0 + (v - lo) * unit;
  const [y1, y2] = [PAD + 56, PAD + 200];
  const out: string[] = [ARROWS];
  /** The gap from b to a, bracketed above or below the line, with its length (or ? until the answer is shown). */
  const gap = (y: number, from: number, to: number, above: boolean) => {
    const [l, r, t] = [X(from), X(to), above ? 8 : -8];
    out.push(`<path d="M${l},${y + t}V${y}H${r}V${y + t}" fill="none" stroke="${GREEN}" stroke-width="2.5"/>`);
    out.push(text((l + r) / 2, above ? y - 8 : y + 22, k >= 3 ? String(c) : "?", { bold: true, color: GREEN, size: 18 }));
  };
  const dots = (y: number, x: number, w: number) =>
    out.push(`<circle cx="${X(w)}" cy="${y}" r="6" fill="${B.stroke}"/><circle cx="${X(x)}" cy="${y}" r="6" fill="${A.stroke}"/>`);
  if (k >= 1) {
    axis(out, y1, lo, hi, X, unit, [[a, A.stroke], [b, B.stroke]]);
    gap(y1 - 30, b, a, true);
    dots(y1, a, b);
  }
  if (k >= 2) {
    axis(out, y2, lo, hi, X, unit, [[a + s, A.stroke], [b + s, B.stroke]]);
    gap(y2 + 44, b + s, a + s, false);
    dots(y2, a + s, b + s);
    // Both slide by the same amount: a's arrow labelled on its right, b's on its left, so they never meet.
    const slide = (from: number, col: typeof A, id: number, right: boolean) => {
      const [p, q] = [X(from), X(from + s)];
      out.push(`<line x1="${p}" y1="${y1 + 38}" x2="${q}" y2="${y2 - 10}" stroke="${col.stroke}" stroke-width="2.5" marker-end="url(#j${id})"/>`);
      out.push(text((p + q) / 2 + (right ? 10 : -10), (y1 + y2) / 2 + 18, signed(s), { anchor: right ? "start" : "end", bold: true, color: col.stroke, size: 15 }));
    };
    slide(a, A, 0, true);
    slide(b, B, 1, false);
  }
  const bottom = equations(out, spec, k, y2 + 104);
  const longest = Math.max(width(`${a} − ${b} = ${a + s} − ${b + s} = ${c}`, 22), width(sameWhy(a, b), 18));
  return wrap(Math.max(X(hi) + 40, PAD * 2 + longest), bottom + PAD, out.join(""));
}

export function renderAddition(spec: AddSpec): RenderedSvg {
  const lim = ADD_LIMITS[spec.style];
  if (!(Number.isInteger(spec.a) && Number.isInteger(spec.b) && spec.a >= 0 && spec.b >= 0 && spec.a <= lim.a && spec.b <= lim.b)) throw new Error("range");
  const k = Math.max(0, Math.min(spec.step, addStepCount(spec)));
  return spec.style === "counters" ? counters(spec, k) : numberline(spec, k);
}

export function renderSubtraction(spec: SubSpec): RenderedSvg {
  const { a, b } = spec;
  if (!(Number.isInteger(a) && Number.isInteger(b) && b >= 0 && b <= a && a <= SUB_LIMITS[spec.style])) throw new Error("range");
  const k = Math.max(0, Math.min(spec.step, addStepCount(spec)));
  return spec.style === "takeaway" ? takeaway(spec, k) : spec.style === "same" ? same(spec, k) : numberline(spec, k);
}
