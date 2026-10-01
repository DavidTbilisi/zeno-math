// Base-ten blocks on a place-value mat (Hundreds | Tens | Ones): layout, trading rules and SVG.
// Shared by the interactive mat (drag & drop) and the image placed on the board.
import type { RenderedSvg } from "./latex";

export type PVKind = "h" | "t" | "o";
export const PV_KINDS: PVKind[] = ["h", "t", "o"]; // left → right on the mat
export const PV_VALUE: Record<PVKind, number> = { h: 100, t: 10, o: 1 };
/** Max blocks per column (the mat's space). Hundreds stop at 9: there is no thousands column. */
export const PV_CAP: Record<PVKind, number> = { h: 9, t: 30, o: 30 };

export type PlaceValueSpec = {
  type: "placeValue";
  h: number;
  t: number;
  o: number;
  showTotal: boolean;
  labels?: [string, string, string]; // column titles in the UI language at insert time
};

export const PV_COLORS: Record<PVKind, { fill: string; stroke: string }> = {
  h: { fill: "#a5d8ff", stroke: "#1971c2" },
  t: { fill: "#b2f2bb", stroke: "#2f9e44" },
  o: { fill: "#ffd8a8", stroke: "#e8590c" },
};

// ---------- Blocks ----------

export const BLOCK: Record<PVKind, { w: number; h: number }> = {
  h: { w: 60, h: 60 }, // flat: 10 × 10 units of 6px
  t: { w: 8, h: 80 }, // rod: 1 × 10 units of 8px
  o: { w: 15, h: 15 }, // cube
};

/** Standalone SVG for one block (also used inline by the interactive mat). */
export function blockSvg(kind: PVKind): string {
  const { w, h } = BLOCK[kind];
  const c = PV_COLORS[kind];
  const lines: string[] = [];
  if (kind === "h") for (let i = 1; i < 10; i++) lines.push(`M${i * 6},0V60M0,${i * 6}H60`);
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
export function blockPositions(kind: PVKind, n: number): { x: number; y: number }[] {
  const inner = COL_W - 2 * COL_PAD;
  return Array.from({ length: n }, (_, i) => {
    if (kind === "h") {
      const x0 = (inner - (3 * 66 - 6)) / 2;
      return { x: x0 + (i % 3) * 66, y: Math.floor(i / 3) * 66 };
    }
    if (kind === "t") {
      const x0 = (inner - (10 * 12 - 4)) / 2;
      return { x: x0 + (i % 10) * 12, y: Math.floor(i / 10) * 90 };
    }
    // Ones sit in ten-frames (2 rows of 5), two frames per row, so tens are easy to spot.
    const f = Math.floor(i / 10);
    const r = Math.floor((i % 10) / 5);
    const c = i % 5;
    const x0 = (inner - (2 * 80 + 12)) / 2;
    return { x: x0 + (f % 2) * 92 + c * 16, y: Math.floor(f / 2) * 44 + r * 16 };
  });
}

/** Height a column's blocks need. */
export function columnHeight(kind: PVKind, n: number): number {
  if (n === 0) return 0;
  const pos = blockPositions(kind, n);
  return Math.max(...pos.map((p) => p.y)) + BLOCK[kind].h;
}

export const pvTotal = (s: { h: number; t: number; o: number }) => s.h * 100 + s.t * 10 + s.o;

/** "125 = 100 + 10 + 15" — shows un-regrouped columns honestly. */
export function expanded(s: { h: number; t: number; o: number }): string {
  const parts = [s.h * 100, s.t * 10, s.o].filter((v) => v > 0);
  const total = pvTotal(s);
  return parts.length > 1 ? `${total} = ${parts.join(" + ")}` : String(total);
}

// ---------- Trading rules ----------

export type Counts = { h: number; t: number; o: number };
export type DropResult = { counts: Counts; message?: "wrong" | "need10" | "full" };

const idx = (k: PVKind) => PV_KINDS.indexOf(k);

/**
 * Applies a drop. `from` is where the block came from; `to` is the column it was dropped on
 * (null = off the mat). Rules: tray → own column adds; mat → off the mat removes;
 * mat → next column right breaks 1 into 10; mat → next column left regroups 10 into 1.
 */
export function applyDrop(counts: Counts, kind: PVKind, from: "tray" | "mat", to: PVKind | null): DropResult {
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
export function breakDown(counts: Counts, kind: PVKind): DropResult {
  const c = { ...counts };
  const lower = PV_KINDS[idx(kind) + 1];
  if (!lower || c[kind] < 1) return { counts: c };
  if (c[lower] + 10 > PV_CAP[lower]) return { counts: c, message: "full" };
  c[kind]--;
  c[lower] += 10;
  return { counts: c };
}

/** 10 blocks → 1 of the next bigger kind. */
export function regroup(counts: Counts, kind: PVKind): DropResult {
  const c = { ...counts };
  const higher = PV_KINDS[idx(kind) - 1];
  if (!higher) return { counts: c };
  if (c[kind] < 10) return { counts: c, message: "need10" };
  if (c[higher] + 1 > PV_CAP[higher]) return { counts: c, message: "full" };
  c[kind] -= 10;
  c[higher]++;
  return { counts: c };
}

// ---------- Board image ----------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderPlaceValue(spec: PlaceValueSpec): RenderedSvg {
  const labels = spec.labels ?? ["Hundreds", "Tens", "Ones"];
  const PAD = 12;
  const HEAD = 34;
  const FOOT = 36;
  const body = Math.max(90, ...PV_KINDS.map((k) => columnHeight(k, spec[k]))) + 2 * COL_PAD;
  const width = 3 * COL_W + 2 * PAD;
  const matH = HEAD + body + FOOT;
  const height = PAD + matH + (spec.showTotal ? 44 : 0) + PAD;
  const font = `font-family="Segoe UI, Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;

  const parts: string[] = [`<rect x="${PAD}" y="${PAD}" width="${3 * COL_W}" height="${matH}" rx="10" fill="#ffffff" stroke="#adb5bd" stroke-width="1.5"/>`];
  PV_KINDS.forEach((k, i) => {
    const x = PAD + i * COL_W;
    const c = PV_COLORS[k];
    if (i > 0) parts.push(`<line x1="${x}" y1="${PAD}" x2="${x}" y2="${PAD + matH}" stroke="#adb5bd" stroke-width="1.5"/>`);
    parts.push(`<rect x="${x + 6}" y="${PAD + 6}" width="${COL_W - 12}" height="${HEAD - 10}" rx="6" fill="${c.fill}" opacity="0.6"/>`);
    parts.push(`<text x="${x + COL_W / 2}" y="${PAD + 24}" text-anchor="middle" font-size="15" font-weight="600" fill="${c.stroke}" ${font}>${esc(labels[i])}</text>`);
    for (const p of blockPositions(k, spec[k])) {
      parts.push(blockSvg(k).replace("<svg ", `<svg x="${x + COL_PAD + p.x}" y="${PAD + HEAD + COL_PAD + p.y}" `));
    }
    parts.push(
      `<text x="${x + COL_W / 2}" y="${PAD + matH - 11}" text-anchor="middle" font-size="22" font-weight="700" fill="${spec[k] >= 10 ? "#e03131" : "#1e1e1e"}" ${font}>${spec[k]}</text>`,
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
