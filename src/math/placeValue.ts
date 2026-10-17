// Base-ten blocks on a place-value mat (Thousands | Hundreds | Tens | Ones): layout, trading rules and SVG.
// Shared by the interactive mat (drag & drop) and the image placed on the board.
import type { RenderedSvg } from "./latex";

export type PVKind = "h" | "t" | "o"; // the blocks the sharing and division games use
export type MatKind = "th" | PVKind; // the mat adds the thousand cube
export const PV_KINDS: MatKind[] = ["th", "h", "t", "o"]; // left → right on the mat
export const PV_VALUE: Record<MatKind, number> = { th: 1000, h: 100, t: 10, o: 1 };
/** Max blocks per column (the mat's space). Thousands stop at 9: there is no ten-thousands column. */
export const PV_CAP: Record<MatKind, number> = { th: 9, h: 12, t: 30, o: 30 };

export type PlaceValueSpec = {
  type: "placeValue";
  th?: number; // absent on mats saved before the thousands column
  h: number;
  t: number;
  o: number;
  showTotal: boolean;
  labels?: string[]; // column titles in the UI language at insert time (three on mats without thousands)
};

export const PV_COLORS: Record<MatKind, { fill: string; stroke: string }> = {
  th: { fill: "#d0bfff", stroke: "#6741d9" },
  h: { fill: "#a5d8ff", stroke: "#1971c2" },
  t: { fill: "#b2f2bb", stroke: "#2f9e44" },
  o: { fill: "#ffd8a8", stroke: "#e8590c" },
};

// ---------- Blocks ----------

export const BLOCK: Record<MatKind, { w: number; h: number }> = {
  th: { w: 50, h: 50 }, // cube drawn in oblique projection, same footprint as a flat
  h: { w: 50, h: 50 }, // flat: 10 × 10 units of 5px (three fit across a column)
  t: { w: 8, h: 80 }, // rod: 1 × 10 units of 8px
  o: { w: 15, h: 15 }, // cube
};

const r2 = (v: number) => Math.round(v * 100) / 100;

/** The thousand cube: a 10 × 10 front face, with top and side faces shaded and ruled into tenths along the edges. */
function cubeSvg(): string {
  const { w } = BLOCK.th;
  const c = PV_COLORS.th;
  const o = 0.75;
  const d = 12; // depth offset of the back faces
  const f = w - d - 2 * o; // front face side
  const x0 = o;
  const y0 = o + d;
  const pt = (x: number, y: number) => `${r2(x)},${r2(y)}`;
  const top = [pt(x0, y0), pt(x0 + d, o), pt(x0 + d + f, o), pt(x0 + f, y0)].join(" ");
  const side = [pt(x0 + f, y0), pt(x0 + f + d, o), pt(x0 + f + d, o + f), pt(x0 + f, y0 + f)].join(" ");
  const lines: string[] = [];
  for (let i = 1; i < 10; i++) {
    const u = (f * i) / 10;
    lines.push(`M${r2(x0 + u)},${r2(y0)}V${r2(y0 + f)}M${r2(x0)},${r2(y0 + u)}H${r2(x0 + f)}`); // front grid
    lines.push(`M${r2(x0 + u)},${r2(y0)}l${d},${-d}`); // top face, front to back
    lines.push(`M${r2(x0 + f)},${r2(y0 + u)}l${d},${-d}`); // side face, front to back
  }
  const face = `fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5" stroke-linejoin="round"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}">` +
    `<polygon points="${top}" ${face}/><polygon points="${top}" fill="#ffffff" opacity="0.4"/>` +
    `<polygon points="${side}" ${face}/><polygon points="${side}" fill="#000000" opacity="0.12"/>` +
    `<rect x="${x0}" y="${y0}" width="${r2(f)}" height="${r2(f)}" ${face}/>` +
    `<path d="${lines.join("")}" stroke="${c.stroke}" stroke-width="0.5" opacity="0.6"/>` +
    `</svg>`
  );
}

/** Standalone SVG for one block (also used inline by the interactive mat). */
export function blockSvg(kind: MatKind): string {
  if (kind === "th") return cubeSvg();
  const { w, h } = BLOCK[kind];
  const c = PV_COLORS[kind];
  const lines: string[] = [];
  if (kind === "h") for (let i = 1; i < 10; i++) lines.push(`M${i * 5},0V50M0,${i * 5}H50`);
  if (kind === "t") for (let i = 1; i < 10; i++) lines.push(`M0,${i * 8}H8`);
  const grid = lines.length ? `<path d="${lines.join("")}" stroke="${c.stroke}" stroke-width="0.6" opacity="0.7"/>` : "";
  const shine = kind === "o" ? `<rect x="2.5" y="2.5" width="5" height="5" rx="1" fill="#ffffff" opacity="0.55"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="${kind === "o" ? 2.5 : 1.5}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>` +
    grid +
    shine +
    `</svg>`
  );
}

// ---------- Layout ----------

export const COL_W = 196; // column width on the mat
export const COL_PAD = 12;

/** Top-left positions of n blocks inside a column's content area (width COL_W − 2·COL_PAD). */
export function blockPositions(kind: MatKind, n: number): { x: number; y: number }[] {
  const inner = COL_W - 2 * COL_PAD;
  return Array.from({ length: n }, (_, i) => {
    if (kind === "th" || kind === "h") {
      const x0 = (inner - (3 * 58 - 8)) / 2;
      return { x: x0 + (i % 3) * 58, y: Math.floor(i / 3) * 58 };
    }
    if (kind === "t") {
      // Two groups of five per row, split by a gap, so tens are counted in fives.
      const x0 = (inner - (10 * 12 - 4 + TEN_GAP)) / 2;
      return { x: x0 + (i % 10) * 12 + (i % 10 >= 5 ? TEN_GAP : 0), y: Math.floor(i / 10) * 90 };
    }
    // Ones sit in ten-frames (2 rows of 5), two frames per row, so tens are easy to spot.
    const f = Math.floor(i / 10);
    const r = Math.floor((i % 10) / 5);
    const c = i % 5;
    const x0 = (inner - (2 * 80 + 12)) / 2;
    return { x: x0 + (f % 2) * 92 + c * 16, y: Math.floor(f / 2) * 44 + r * 16 };
  });
}

const TEN_GAP = 12; // extra space between the 5th and 6th rod of a row

/** Dashed dividers between the two groups of five in each row of ten-rods that reaches a 6th rod. */
export function tenDividers(n: number): { x: number; y: number; h: number }[] {
  const pos = blockPositions("t", n);
  const out: { x: number; y: number; h: number }[] = [];
  for (let i = 5; i < n; i += 10) out.push({ x: pos[i].x - (4 + TEN_GAP) / 2, y: pos[i].y - 2, h: BLOCK.t.h + 4 });
  return out;
}

/** Height a column's blocks need. */
export function columnHeight(kind: MatKind, n: number): number {
  if (n === 0) return 0;
  const pos = blockPositions(kind, n);
  return Math.max(...pos.map((p) => p.y)) + BLOCK[kind].h;
}

export type Counts = { h: number; t: number; o: number };
export type MatCounts = Counts & { th: number };

/** A spec's block counts; mats saved before the thousands column have none. */
export const matCounts = (s: Counts & { th?: number }): MatCounts => ({ th: s.th ?? 0, h: s.h, t: s.t, o: s.o });

export const pvTotal = (s: Counts & { th?: number }) => (s.th ?? 0) * 1000 + s.h * 100 + s.t * 10 + s.o;

/** "125 = 100 + 10 + 15" — shows un-regrouped columns honestly. */
export function expanded(s: Counts & { th?: number }): string {
  const parts = [(s.th ?? 0) * 1000, s.h * 100, s.t * 10, s.o].filter((v) => v > 0);
  const total = pvTotal(s);
  return parts.length > 1 ? `${total} = ${parts.join(" + ")}` : String(total);
}

// ---------- Trading rules ----------

export type DropResult = { counts: MatCounts; message?: "wrong" | "need10" | "full" };

const idx = (k: MatKind) => PV_KINDS.indexOf(k);

/**
 * Applies a drop. `from` is where the block came from; `to` is the column it was dropped on
 * (null = off the mat). Rules: tray → own column adds; mat → off the mat removes;
 * mat → next column right breaks 1 into 10; mat → next column left regroups 10 into 1.
 */
export function applyDrop(counts: MatCounts, kind: MatKind, from: "tray" | "mat", to: MatKind | null): DropResult {
  const c = { ...counts };
  if (from === "tray") {
    if (to === null) return { counts: c };
    if (to !== kind) return { counts: c, message: "wrong" };
    if (c[kind] >= PV_CAP[kind]) return { counts: c, message: "full" };
    c[kind]++;
    return { counts: c };
  }
  if (to === null) {
    c[kind]--;
    return { counts: c };
  }
  if (to === kind) return { counts: c };
  const d = idx(to) - idx(kind);
  if (d === 1) return breakDown(c, kind);
  if (d === -1) return regroup(c, kind);
  return { counts: c, message: "wrong" };
}

/** 1 block → 10 of the next smaller kind. */
export function breakDown(counts: MatCounts, kind: MatKind): DropResult {
  const c = { ...counts };
  const lower = PV_KINDS[idx(kind) + 1];
  if (!lower || c[kind] < 1) return { counts: c };
  if (c[lower] + 10 > PV_CAP[lower]) return { counts: c, message: "full" };
  c[kind]--;
  c[lower] += 10;
  return { counts: c };
}

/** 10 blocks → 1 of the next bigger kind. */
export function regroup(counts: MatCounts, kind: MatKind): DropResult {
  const c = { ...counts };
  const higher = PV_KINDS[idx(kind) - 1];
  if (!higher) return { counts: c };
  if (c[kind] < 10) return { counts: c, message: "need10" };
  if (c[higher] + 1 > PV_CAP[higher]) return { counts: c, message: "full" };
  c[kind] -= 10;
  c[higher]++;
  return { counts: c };
}

// ---------- Adding and taking away with blocks ----------

export type PVOp = "add" | "sub";
/**
 * An exercise on the mat: a's blocks start on the mat, and the zone under each column holds b's blocks still to put
 * in (adding) or the blocks taken away so far (subtracting). Trading on the mat works as always.
 */
export type BlockSum = { op: PVOp; a: number; b: number; zone: MatCounts };
export type SumVerdict = "correct" | "placeAll" | "takeExact" | "regroup" | "restart";
export const SUM_MAX = 999;

const NONE: MatCounts = { th: 0, h: 0, t: 0, o: 0 };

/** n as one block per unit of each digit: 1234 → 1 thousand, 2 hundreds, 3 tens, 4 ones. */
export const placeDigits = (n: number): MatCounts => ({ th: Math.floor(n / 1000) % 10, h: Math.floor(n / 100) % 10, t: Math.floor(n / 10) % 10, o: n % 10 });

export const sumAnswer = (s: { op: PVOp; a: number; b: number }) => (s.op === "add" ? s.a + s.b : s.a - s.b);

/** Whole numbers up to SUM_MAX, and never taking away more than there is. */
export const validSum = (op: PVOp, a: number, b: number) =>
  [a, b].every((n) => Number.isInteger(n) && n >= 0 && n <= SUM_MAX) && (op === "add" || b <= a);

/** Two- and three-digit numbers; a difference takes away at most a. */
export function randomSum(op: PVOp, rnd: () => number = Math.random): { a: number; b: number } {
  const a = 10 + Math.floor(rnd() * (SUM_MAX - 9));
  const b = op === "add" ? 10 + Math.floor(rnd() * (SUM_MAX - 9)) : 1 + Math.floor(rnd() * a);
  return { a, b };
}

export function startSum(op: PVOp, a: number, b: number): { counts: MatCounts; sum: BlockSum } {
  return { counts: placeDigits(a), sum: { op, a, b, zone: op === "add" ? placeDigits(b) : { ...NONE } } };
}

export type SumMove = { counts: MatCounts; zone: MatCounts; message?: "full" | "enough" };

/**
 * Moves one block between a column and its zone. Adding only moves zone → mat. Taking away moves mat → zone, never
 * more than b has in that place, and a block taken by mistake can go back.
 */
export function sumMove(counts: MatCounts, sum: BlockSum, kind: MatKind, toZone: boolean): SumMove {
  const c = { ...counts };
  const z = { ...sum.zone };
  if (toZone) {
    if (sum.op === "add" || c[kind] < 1) return { counts: c, zone: z };
    if (z[kind] >= placeDigits(sum.b)[kind]) return { counts: c, zone: z, message: "enough" };
    c[kind]--;
    z[kind]++;
  } else {
    if (z[kind] < 1) return { counts: c, zone: z };
    if (c[kind] >= PV_CAP[kind]) return { counts: c, zone: z, message: "full" };
    z[kind]--;
    c[kind]++;
  }
  return { counts: c, zone: z };
}

/** Done when every block of b is in (or exactly b is taken away) and no column holds 10 or more. */
export function sumVerdict(counts: MatCounts, sum: BlockSum): SumVerdict {
  const target = placeDigits(sum.b);
  if (sum.op === "add" && PV_KINDS.some((k) => sum.zone[k] > 0)) return "placeAll";
  if (sum.op === "sub" && PV_KINDS.some((k) => sum.zone[k] !== target[k])) return "takeExact";
  if (PV_KINDS.some((k) => counts[k] >= 10)) return "regroup";
  return pvTotal(counts) === sumAnswer(sum) ? "correct" : "restart";
}

// ---------- Board image ----------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderPlaceValue(spec: PlaceValueSpec): RenderedSvg {
  const labels = spec.labels?.length === 4 ? spec.labels : ["Thousands", ...(spec.labels ?? ["Hundreds", "Tens", "Ones"])];
  const counts = matCounts(spec);
  const cols = PV_KINDS.length;
  const PAD = 12;
  const HEAD = 34;
  const FOOT = 36;
  const body = Math.max(90, ...PV_KINDS.map((k) => columnHeight(k, counts[k]))) + 2 * COL_PAD;
  const width = cols * COL_W + 2 * PAD;
  const matH = HEAD + body + FOOT;
  const height = PAD + matH + (spec.showTotal ? 44 : 0) + PAD;
  const font = `font-family="Segoe UI, Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;

  const parts: string[] = [`<rect x="${PAD}" y="${PAD}" width="${cols * COL_W}" height="${matH}" rx="10" fill="#ffffff" stroke="#adb5bd" stroke-width="1.5"/>`];
  PV_KINDS.forEach((k, i) => {
    const x = PAD + i * COL_W;
    const c = PV_COLORS[k];
    if (i > 0) parts.push(`<line x1="${x}" y1="${PAD}" x2="${x}" y2="${PAD + matH}" stroke="#adb5bd" stroke-width="1.5"/>`);
    parts.push(`<rect x="${x + 6}" y="${PAD + 6}" width="${COL_W - 12}" height="${HEAD - 10}" rx="6" fill="${c.fill}" opacity="0.6"/>`);
    parts.push(`<text x="${x + COL_W / 2}" y="${PAD + 24}" text-anchor="middle" font-size="15" font-weight="600" fill="${c.stroke}" ${font}>${esc(labels[i])}</text>`);
    if (k === "t")
      for (const d of tenDividers(spec.t)) {
        const lx = x + COL_PAD + d.x;
        const ly = PAD + HEAD + COL_PAD + d.y;
        parts.push(`<line x1="${lx}" y1="${ly}" x2="${lx}" y2="${ly + d.h}" stroke="${c.stroke}" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6"/>`);
      }
    for (const p of blockPositions(k, counts[k])) {
      parts.push(blockSvg(k).replace("<svg ", `<svg x="${x + COL_PAD + p.x}" y="${PAD + HEAD + COL_PAD + p.y}" `));
    }
    parts.push(
      `<text x="${x + COL_W / 2}" y="${PAD + matH - 11}" text-anchor="middle" font-size="22" font-weight="700" fill="${counts[k] >= 10 ? "#e03131" : "#1e1e1e"}" ${font}>${counts[k]}</text>`,
    );
  });
  if (spec.showTotal)
    parts.push(`<text x="${PAD + 4}" y="${PAD + matH + 32}" font-size="22" font-weight="700" fill="#1e1e1e" ${font}>${expanded(spec)}</text>`);

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`,
    width,
    height,
  };
}
