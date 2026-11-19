// Shapes in a row: ordinal numbers and repeating patterns, two first-grade topics (Visible Thinking 1A ch. 5 and 6,
// 2B ch. 14; Dimension Math KB). Ordinals: which shape is 4th from the left (easy), the position of the shape marked
// with an arrow, counted from the left or the right (medium), the shape just before or after the 7th (hard); counting
// from the other end, and the neighbour on the wrong side, are the slips. Patterns: a repeating unit of shapes (or of
// colours), shown twice or more: what comes next (easy), how many shapes the repeating part has or which is the 13th
// (medium), which is the 20th to the 60th, found by the remainder (hard); the shape shown last repeated, the number
// of different shapes taken for the unit's length, and the remainder counted from 0, are the slips.

/** The shapes, each with its own colour, and the colours a colour pattern draws its circles in. */
export const SHAPES = ["circle", "square", "triangle", "star", "heart", "diamond"] as const;
export type Shape = (typeof SHAPES)[number];
export const COLOURS = ["red", "blue", "green", "orange", "purple", "pink", "yellow"] as const;
/** The colours of a colour pattern: no two alike at a glance (pink is too near red). */
export const PATTERN_COLOURS: readonly Colour[] = ["red", "blue", "green", "orange", "purple", "yellow"];
export type Colour = (typeof COLOURS)[number];
export const SHAPE_COLOUR: Record<Shape, Colour> = { circle: "red", square: "blue", triangle: "green", star: "orange", heart: "pink", diamond: "purple" };
export const HEX: Record<Colour, string> = { red: "#e03131", blue: "#1971c2", green: "#2f9e44", orange: "#f08c00", purple: "#9c36b5", pink: "#e64980", yellow: "#f2c200" };
/** A shape as text (a button) and as TeX (the working). */
export const SYMBOL: Record<Shape, string> = { circle: "●", square: "■", triangle: "▲", star: "★", heart: "♥", diamond: "◆" };
export const TEX: Record<Shape, string> = { circle: "\\bullet", square: "\\blacksquare", triangle: "\\blacktriangle", star: "\\bigstar", heart: "\\heartsuit", diamond: "\\blacklozenge" };

/** A thing in the row: a shape in a colour. A colour pattern is all circles. */
export type Item = { shape: Shape; colour: Colour };
export const itemOf = (shape: Shape): Item => ({ shape, colour: SHAPE_COLOUR[shape] });
export const sameItem = (a: Item, b: Item) => a.shape === b.shape && a.colour === b.colour;
/** What tells two items apart in a question: the shape, or in a colour pattern the colour. */
export type By = "shape" | "colour";
export const keyOf = (it: Item, by: By) => (by === "shape" ? it.shape : it.colour);

type Next = () => number;
const intOf = (next: Next) => (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
const shuffled = <T>(next: Next, xs: readonly T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------- ordinals ----------

export type OrdinalMistake = "otherEnd" | "wrongNeighbour";
export type Side = "left" | "right";
export type OrdinalQuestion =
  /** Easy and hard: which shape is at a position (hard: just before or after one), four shapes to choose from. */
  | { kind: "which" | "beside"; row: Item[]; n: number; side: Side; dir?: "before" | "after"; right: Shape; options: Shape[]; trap: { id: OrdinalMistake; shape: Shape } | null }
  /** Medium: the position of the marked shape, counted from one side. */
  | { kind: "position"; row: Item[]; at: number; side: Side; v: number; trap: { id: OrdinalMistake; v: number } };

/** Index into the row of the n-th counted from a side (1-based n). */
export const indexFrom = (len: number, n: number, side: Side) => (side === "left" ? n - 1 : len - n);
const randomRow = (int: (lo: number, hi: number) => number, len: number) => Array.from({ length: len }, () => itemOf(SHAPES[int(0, SHAPES.length - 1)]));

export function ordinalQuestion(level: 1 | 2 | 3, next: Next): OrdinalQuestion {
  const int = intOf(next);
  for (;;) {
    const len = level === 1 ? int(6, 8) : 10;
    const row = randomRow(int, len);
    if (new Set(row.map((x) => x.shape)).size < 4) continue;
    if (level === 2) {
      const at = int(0, len - 1);
      const side: Side = next() < 0.5 ? "left" : "right";
      const v = side === "left" ? at + 1 : len - at;
      if (2 * v === len + 1) continue;
      return { kind: "position", row, at, side, v, trap: { id: "otherEnd", v: len + 1 - v } };
    }
    const side: Side = level === 1 ? "left" : next() < 0.5 ? "left" : "right";
    const n = level === 1 ? int(2, len) : int(2, len - 1);
    const i = indexFrom(len, n, side);
    if (level === 1) {
      // Counting from the right instead is the slip: a different shape there, or the question can't tell them apart.
      const other = row[indexFrom(len, n, "right")].shape;
      if (other === row[i].shape) continue;
      const options = shuffled(next, [row[i].shape, other, ...shuffled(next, SHAPES.filter((s) => s !== row[i].shape && s !== other)).slice(0, 2)]);
      return { kind: "which", row, n, side, right: row[i].shape, options, trap: { id: "otherEnd", shape: other } };
    }
    // Just before is the one nearer the side counted from; after, the one further from it.
    const dir = next() < 0.5 ? "before" : "after";
    const step = (dir === "before" ? -1 : 1) * (side === "left" ? 1 : -1);
    const [j, k] = [i + step, i - step];
    if (row[j].shape === row[k].shape || row[j].shape === row[i].shape) continue;
    // The two neighbours and the shape itself, then others, four different shapes in all.
    const near = [...new Set([row[j].shape, row[k].shape, row[i].shape])];
    const options = shuffled(next, [...near, ...shuffled(next, SHAPES.filter((s) => !near.includes(s)))].slice(0, 4));
    return { kind: "beside", row, n, side, dir, right: row[j].shape, options, trap: { id: "wrongNeighbour", shape: row[k].shape } };
  }
}

// ---------- repeating patterns ----------

export type PatternMistake = "repeatedLast" | "distinctNotUnit" | "remainderShift";
export type PatternQuestion = {
  kind: "next" | "length" | "nth";
  by: By;
  /** The repeating part, and how many items are shown. */
  unit: Item[];
  shown: number;
  /** nth: the position asked for. */
  n: number;
  /** next and nth: the right item, the options (by shape or colour) and the slip; length: the unit's length. */
  right: Item | null;
  options: Item[];
  v: number;
  trap: { id: PatternMistake; item: Item | null; v: number } | null;
};
/** The units of repetition: letters stand for different items. */
const UNIT_SHAPES = ["AB", "ABB", "AAB", "ABC", "AABB", "ABCC", "ABAC", "ABCD"];
export const itemAt = (unit: Item[], n: number) => unit[(n - 1) % unit.length];

export function patternQuestion(level: 1 | 2 | 3, next: Next): PatternQuestion {
  const int = intOf(next);
  for (;;) {
    const form = UNIT_SHAPES[int(level === 1 ? 0 : 1, level === 1 ? 4 : UNIT_SHAPES.length - 1)];
    const by: By = next() < 0.3 ? "colour" : "shape";
    const letters = [...new Set(form)];
    const picked = shuffled(next, by === "shape" ? [...SHAPES] : [...PATTERN_COLOURS]).slice(0, letters.length);
    const itemFor = (l: string) => {
      const x = picked[letters.indexOf(l)];
      return by === "shape" ? itemOf(x as Shape) : { shape: "circle" as Shape, colour: x as Colour };
    };
    const unit = [...form].map(itemFor);
    const u = unit.length;
    const pool = by === "shape" ? SHAPES.map(itemOf) : PATTERN_COLOURS.map((c) => ({ shape: "circle" as Shape, colour: c }));
    const optionsWith = (must: Item[]) => {
      const rest = pool.filter((p) => !must.some((m) => sameItem(m, p)));
      return shuffled(next, [...must, ...shuffled(next, rest)].slice(0, Math.max(4, must.length)));
    };
    const kind = level === 1 ? "next" : level === 2 ? (next() < 0.5 ? "length" : "nth") : "nth";
    if (kind === "next") {
      // Two whole units and some of a third; the next item, and the last one shown repeated as the slip.
      const shown = 2 * u + int(0, u - 1);
      const right = itemAt(unit, shown + 1);
      const last = itemAt(unit, shown);
      const trap = sameItem(last, right) ? null : { id: "repeatedLast" as const, item: last, v: 0 };
      if (!trap) continue;
      return { kind, by, unit, shown, n: shown + 1, right, options: optionsWith([right, last]), v: 0, trap };
    }
    if (kind === "length") {
      const distinct = letters.length;
      if (distinct === u) continue;
      return { kind, by, unit, shown: 3 * u, n: 0, right: null, options: [], v: u, trap: { id: "distinctNotUnit", item: null, v: distinct } };
    }
    const shown = 2 * u;
    const n = level === 2 ? int(shown + 3, 15) : int(20, 60);
    const right = itemAt(unit, n);
    const shifted = itemAt(unit, n + 1);
    if (n <= shown || sameItem(right, shifted)) continue;
    return { kind, by, unit, shown, n, right, options: optionsWith([right, shifted]), v: 0, trap: { id: "remainderShift", item: shifted, v: 0 } };
  }
}

// ---------- words ----------

/** The words of both skills (the locale's `rows` block). */
export type RowWords = {
  shapes: Record<Shape, string>;
  colours: Record<Colour, string>;
  /** "4th": the first, and the forms for numbers ending in 1, 2, 3 and the rest (English; other languages use one form). */
  ordinal: { first: string; st: string; nd: string; rd: string; th: string };
  side: Record<Side, string>;
  which: string;
  position: string;
  before: string;
  after: string;
  next: string;
  length: string;
  nth: string;
};
/** An ordinal in the learner's language: 1st, 22nd, 13th; მე-4; 4-я. */
export function ordinalText(n: number, w: RowWords["ordinal"]): string {
  if (n === 1) return w.first;
  const [d, h] = [n % 10, n % 100];
  const form = h >= 11 && h <= 13 ? w.th : d === 1 ? w.st : d === 2 ? w.nd : d === 3 ? w.rd : w.th;
  return form.replace("{n}", String(n));
}
