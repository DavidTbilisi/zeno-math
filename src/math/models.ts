// Singapore-method pictorial models rendered to standalone SVG:
// bar models, fraction bars/circles, percent grids/bars and number bonds.
import type { RenderedSvg } from "./latex";
import { renderPlaceValue, type PlaceValueSpec } from "./placeValue";
import { renderMultiply, type MultiplySpec } from "./multiply";
import { renderDivision, type DivisionSpec } from "./division";
import { renderFracOp, type FracOpSpec } from "./fracop";
import { renderPercRatio, type PercRatioSpec } from "./percratio";

export const MODEL_COLORS = [
  { stroke: "#1971c2", fill: "#a5d8ff" },
  { stroke: "#e8590c", fill: "#ffd8a8" },
  { stroke: "#2f9e44", fill: "#b2f2bb" },
  { stroke: "#9c36b5", fill: "#eebefa" },
  { stroke: "#e03131", fill: "#ffc9c9" },
  { stroke: "#f08c00", fill: "#ffec99" },
];

export type BarRow = { label: string; segments: string; total: string };
export type BarModelSpec = { type: "bar"; rows: BarRow[]; grandTotal: string; showNumbers: boolean };
export type FractionRow = { n: number; d: number };
export type FractionSpec = { type: "fraction"; rows: FractionRow[]; shape: "bar" | "circle"; unitLabels: boolean };
export type PercentSpec = { type: "percent"; percent: number; of: number | null; style: "grid" | "bar" };
export type BondSpec = { type: "bond"; whole: string; parts: string[] };
export type ModelSpec = BarModelSpec | FractionSpec | PercentSpec | BondSpec | PlaceValueSpec | MultiplySpec | DivisionSpec | FracOpSpec | PercRatioSpec;
export type ModelType = ModelSpec["type"];

const INK = "#1e1e1e";
const FONT = `font-family="Segoe UI, Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;
const PAD = 16;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const textWidth = (s: string, size = 16) => s.length * size * 0.56;
const r2 = (v: number) => Math.round(v * 100) / 100;
const fmt = (v: number) => String(r2(v));

function text(x: number, y: number, s: string, opts: { size?: number; anchor?: string; color?: string; bold?: boolean } = {}) {
  const { size = 16, anchor = "middle", color = INK, bold = false } = opts;
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}"${
    bold ? ` font-weight="600"` : ""
  }>${esc(s)}</text>`;
}

/** Stacked fraction n/d centered at (cx, cy) where cy is the fraction line. */
function fracLabel(cx: number, cy: number, n: string, d: string, size = 18, color = INK) {
  const w = Math.max(textWidth(n, size), textWidth(d, size)) + 6;
  return (
    text(cx, cy - 5, n, { size, color }) +
    `<line x1="${r2(cx - w / 2)}" y1="${cy}" x2="${r2(cx + w / 2)}" y2="${cy}" stroke="${color}" stroke-width="1.6"/>` +
    text(cx, cy + size, d, { size, color })
  );
}

/** Horizontal curly brace from x1 to x2; dir -1 bulges up, +1 down. Returns path and tip y. */
function hBrace(x1: number, x2: number, y: number, dir: 1 | -1, h = 9) {
  const m = (x1 + x2) / 2;
  const q = Math.min(h, (x2 - x1) / 4);
  const a = y + dir * h;
  const d = `M${x1},${y} Q${x1},${a} ${x1 + q},${a} L${m - q},${a} Q${m},${a} ${m},${a + dir * h} Q${m},${a} ${m + q},${a} L${x2 - q},${a} Q${x2},${a} ${x2},${y}`;
  return { path: `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.5"/>`, tip: a + dir * h };
}

/** Vertical curly brace from y1 to y2 at x, bulging right. */
function vBrace(y1: number, y2: number, x: number, h = 9) {
  const m = (y1 + y2) / 2;
  const q = Math.min(h, (y2 - y1) / 4);
  const a = x + h;
  const d = `M${x},${y1} Q${a},${y1} ${a},${y1 + q} L${a},${m - q} Q${a},${m} ${a + h},${m} Q${a},${m} ${a},${m + q} L${a},${y2 - q} Q${a},${y2} ${x},${y2}`;
  return { path: `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.5"/>`, tip: a + h };
}

function wrap(width: number, height: number, body: string): RenderedSvg {
  const w = Math.ceil(width);
  const h = Math.ceil(height);
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g ${FONT}>${body}</g></svg>`,
    width: w,
    height: h,
  };
}

// ---------- Bar model ----------

export type Segment = { value: number; label: string; unknown: boolean };
export type SegmentGroup = { start: number; end: number; label: string }; // segment indices, end exclusive

function parseSegment(item: string, showNumbers: boolean): Segment {
  const m = item.match(/^(\d+(?:\.\d+)?)\s*(?:=\s*(.*))?$/);
  if (!m) throw new Error(`"${item}"`);
  const value = Number(m[1]);
  if (!(value > 0)) throw new Error(`"${item}"`);
  const label = m[2] !== undefined ? m[2].trim() : showNumbers ? fmt(value) : "";
  return { value, label, unknown: label.includes("?") };
}

/**
 * Parses "25, 15, 40=?" into segments. `value=label` overrides the displayed label.
 * Brackets group segments under a brace: "[1, 1]=?, 1, 1, 1".
 */
export function parseSegments(src: string, showNumbers: boolean): { segs: Segment[]; groups: SegmentGroup[] } {
  const segs: Segment[] = [];
  const groups: SegmentGroup[] = [];
  const re = /\s*(?:\[([^\]]*)\]\s*(?:=\s*([^,;[]*))?|([^,;[]+))\s*[,;]?/y;
  let m: RegExpExecArray | null;
  while (re.lastIndex < src.length && (m = re.exec(src))) {
    if (m[0] === "") break;
    if (m[1] !== undefined) {
      const start = segs.length;
      for (const item of m[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean)) segs.push(parseSegment(item, showNumbers));
      groups.push({ start, end: segs.length, label: (m[2] ?? "").trim() });
    } else if (m[3]?.trim()) segs.push(parseSegment(m[3].trim(), showNumbers));
  }
  if (re.lastIndex < src.trimEnd().length) throw new Error("syntax");
  return { segs, groups };
}

function renderBar(spec: BarModelSpec): RenderedSvg {
  const rows = spec.rows.map((r) => ({ ...r, ...parseSegments(r.segments, spec.showNumbers) })).filter((r) => r.segs.length);
  if (!rows.length) throw new Error("empty");

  const BW = 480;
  const BH = 44;
  const GAP = 18;
  const labelW = rows.some((r) => r.label.trim()) ? Math.max(...rows.map((r) => textWidth(r.label))) + 18 : 0;
  const maxSum = Math.max(...rows.map((r) => r.segs.reduce((s, x) => s + x.value, 0)));
  const scale = BW / maxSum;
  const x0 = PAD + labelW;

  const parts: string[] = [];
  let y = PAD;
  let firstTop = 0;
  let lastBottom = 0;
  let maxEnd = x0;

  rows.forEach((row, i) => {
    const c = MODEL_COLORS[i % MODEL_COLORS.length];
    const total = row.total.trim();
    if (i === 0 && total) y += 46;
    const top = y;
    if (i === 0) firstTop = top;

    if (row.label.trim()) parts.push(text(x0 - 10, top + BH / 2 + 6, row.label.trim(), { anchor: "end", bold: true }));

    let x = x0;
    const edges: number[] = [x0];
    for (const s of row.segs) {
      const w = s.value * scale;
      parts.push(
        `<rect x="${r2(x)}" y="${top}" width="${r2(w)}" height="${BH}" fill="${s.unknown ? "#ffffff" : c.fill}" stroke="${c.stroke}" stroke-width="2"${
          s.unknown ? ` stroke-dasharray="6 4"` : ""
        }/>`,
      );
      if (s.label && w >= textWidth(s.label) + 4)
        parts.push(text(x + w / 2, top + BH / 2 + 6, s.label, { bold: s.unknown, color: s.unknown ? c.stroke : INK }));
      else if (s.label) parts.push(text(x + w / 2, top - 5, s.label, { size: 13 }));
      x += w;
      edges.push(x);
    }
    maxEnd = Math.max(maxEnd, x);

    // Braces under grouped segments ("[1, 1]=?").
    let below = top + BH;
    for (const g of row.groups) {
      if (g.end <= g.start) continue;
      const b = hBrace(edges[g.start], edges[g.end], top + BH + 4, 1);
      parts.push(b.path);
      if (g.label) parts.push(text((edges[g.start] + edges[g.end]) / 2, b.tip + 18, g.label, { bold: true, color: c.stroke }));
    }
    if (row.groups.length) below += 44;

    if (total) {
      if (i === 0) {
        const b = hBrace(x0, x, top - 4, -1);
        parts.push(b.path, text((x0 + x) / 2, b.tip - 6, total, { bold: true }));
        y = below;
      } else {
        const b = hBrace(x0, x, below + 4, 1);
        parts.push(b.path, text((x0 + x) / 2, b.tip + 18, total, { bold: true }));
        y = below + 46;
      }
    } else y = below;
    lastBottom = top + BH;
    y += GAP;
  });

  let width = maxEnd + PAD;
  const grand = spec.grandTotal.trim();
  if (grand) {
    const b = vBrace(firstTop, lastBottom, maxEnd + 8);
    parts.push(b.path, text(b.tip + 8, (firstTop + lastBottom) / 2 + 6, grand, { anchor: "start", bold: true }));
    width = b.tip + 8 + textWidth(grand) + PAD;
  }
  return wrap(width, y - GAP + PAD, parts.join(""));
}

// ---------- Fractions ----------

function renderFraction(spec: FractionSpec): RenderedSvg {
  const rows = spec.rows.filter((r) => r.d >= 1);
  if (!rows.length) throw new Error("empty");
  const parts: string[] = [];
  const LABEL = 56;
  let y = PAD;
  let width = 0;

  rows.forEach((row, i) => {
    const c = MODEL_COLORS[i % MODEL_COLORS.length];
    const wholes = Math.max(1, Math.ceil(row.n / row.d));
    const x0 = PAD + LABEL;

    if (spec.shape === "bar") {
      const WB = wholes > 1 ? 300 : 420;
      const BH = 48;
      parts.push(fracLabel(PAD + LABEL / 2 - 6, y + BH / 2 + 2, String(row.n), String(row.d)));
      const cw = WB / row.d;
      for (let w = 0; w < wholes; w++) {
        const bx = x0 + w * (WB + 14);
        for (let k = 0; k < row.d; k++) {
          const shaded = w * row.d + k < row.n;
          parts.push(
            `<rect x="${r2(bx + k * cw)}" y="${y}" width="${r2(cw)}" height="${BH}" fill="${shaded ? c.fill : "#ffffff"}" stroke="${c.stroke}" stroke-width="1.5"/>`,
          );
          if (spec.unitLabels && cw >= 26) parts.push(fracLabel(bx + (k + 0.5) * cw, y + BH / 2 - 2, "1", String(row.d), 12));
        }
        parts.push(`<rect x="${bx}" y="${y}" width="${WB}" height="${BH}" fill="none" stroke="${c.stroke}" stroke-width="2.5"/>`);
        width = Math.max(width, bx + WB + PAD);
      }
      y += BH + 20;
    } else {
      const R = 64;
      const cy = y + R;
      parts.push(fracLabel(PAD + LABEL / 2 - 6, cy + 2, String(row.n), String(row.d)));
      for (let w = 0; w < wholes; w++) {
        const cx = x0 + R + w * (2 * R + 18);
        for (let k = 0; k < row.d; k++) {
          const shaded = w * row.d + k < row.n;
          const fill = shaded ? c.fill : "#ffffff";
          if (row.d === 1) {
            parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${fill}" stroke="${c.stroke}" stroke-width="1.5"/>`);
            continue;
          }
          const a1 = -Math.PI / 2 + (2 * Math.PI * k) / row.d;
          const a2 = a1 + (2 * Math.PI) / row.d;
          const large = a2 - a1 > Math.PI ? 1 : 0;
          parts.push(
            `<path d="M${cx},${cy} L${r2(cx + R * Math.cos(a1))},${r2(cy + R * Math.sin(a1))} A${R},${R} 0 ${large} 1 ${r2(
              cx + R * Math.cos(a2),
            )},${r2(cy + R * Math.sin(a2))} Z" fill="${fill}" stroke="${c.stroke}" stroke-width="1.5" stroke-linejoin="round"/>`,
          );
          if (spec.unitLabels && row.d <= 12) {
            const am = (a1 + a2) / 2;
            parts.push(fracLabel(cx + R * 0.62 * Math.cos(am), cy + R * 0.62 * Math.sin(am), "1", String(row.d), 11));
          }
        }
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${c.stroke}" stroke-width="2.5"/>`);
        width = Math.max(width, cx + R + PAD);
      }
      y += 2 * R + 20;
    }
  });
  return wrap(width, y - 20 + PAD, parts.join(""));
}

// ---------- Percent ----------

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Summary lines, e.g. ["25% = 25/100 = 1/4", "25% × 80 = 20"]. */
function percentSummary(p: number, of: number | null): string[] {
  const g = Number.isInteger(p) && p > 0 ? gcd(p, 100) : 1;
  let s = `${fmt(p)}% = ${fmt(p)}/100`;
  if (g > 1) s += ` = ${p / g}/${100 / g}`;
  return of === null ? [s] : [s, `${fmt(p)}% × ${fmt(of)} = ${fmt((p / 100) * of)}`];
}

function summaryText(x: number, y: number, lines: string[]) {
  return lines.map((l, i) => text(x, y + i * 24, l, { anchor: "start", bold: true })).join("");
}
const summaryWidth = (lines: string[]) => Math.max(...lines.map((l) => textWidth(l)));

function renderPercent(spec: PercentSpec): RenderedSvg {
  const p = Math.min(100, Math.max(0, spec.percent));
  const c = MODEL_COLORS[0];
  const parts: string[] = [];

  if (spec.style === "grid") {
    const CELL = 26;
    const G = CELL * 10;
    const x0 = PAD;
    const y0 = PAD;
    // Fill column by column so each full column reads as "10%".
    for (let i = 0; i < 100; i++) {
      const col = Math.floor(i / 10);
      const row = i % 10;
      const frac = Math.min(1, Math.max(0, p - i)); // partial cell for decimals
      const x = x0 + col * CELL;
      const y = y0 + row * CELL;
      parts.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="#ffffff" stroke="#adb5bd" stroke-width="1"/>`);
      if (frac > 0)
        parts.push(`<rect x="${x}" y="${y}" width="${r2(CELL * frac)}" height="${CELL}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1"/>`);
    }
    parts.push(`<rect x="${x0}" y="${y0}" width="${G}" height="${G}" fill="none" stroke="${INK}" stroke-width="2"/>`);
    const summary = percentSummary(p, spec.of);
    parts.push(summaryText(x0, y0 + G + 28, summary));
    return wrap(Math.max(G, summaryWidth(summary)) + 2 * PAD, y0 + G + 28 + (summary.length - 1) * 24 + PAD, parts.join(""));
  }

  // Percent bar: 10 equal parts of 10%, with a double number line for "p% of N".
  const BW = 500;
  const BH = 44;
  const x0 = PAD + 14;
  const y0 = PAD + 26;
  const px = x0 + (BW * p) / 100;
  parts.push(`<rect x="${x0}" y="${y0}" width="${r2((BW * p) / 100)}" height="${BH}" fill="${c.fill}"/>`);
  for (let k = 1; k < 10; k++)
    parts.push(`<line x1="${x0 + k * BW / 10}" y1="${y0}" x2="${x0 + k * BW / 10}" y2="${y0 + BH}" stroke="#adb5bd" stroke-width="1"/>`);
  parts.push(`<rect x="${x0}" y="${y0}" width="${BW}" height="${BH}" fill="none" stroke="${INK}" stroke-width="2"/>`);
  parts.push(`<line x1="${r2(px)}" y1="${y0 - 6}" x2="${r2(px)}" y2="${y0 + BH + 6}" stroke="${c.stroke}" stroke-width="2.5"/>`);
  parts.push(text(x0, y0 - 8, "0%", { size: 13 }), text(x0 + BW, y0 - 8, "100%", { size: 13 }));
  if (p > 6 && p < 92) parts.push(text(px, y0 - 10, `${fmt(p)}%`, { bold: true, color: c.stroke }));
  else parts.push(text(px, y0 - 24, `${fmt(p)}%`, { bold: true, color: c.stroke }));

  let y = y0 + BH;
  if (spec.of !== null) {
    const ly = y + 24;
    parts.push(`<line x1="${x0}" y1="${ly}" x2="${x0 + BW}" y2="${ly}" stroke="${INK}" stroke-width="1.5"/>`);
    for (const [x, label, bold] of [
      [x0, "0", false],
      [x0 + BW, fmt(spec.of), false],
      [px, fmt((p / 100) * spec.of), true],
    ] as const) {
      parts.push(`<line x1="${r2(x)}" y1="${ly - 6}" x2="${r2(x)}" y2="${ly + 6}" stroke="${bold ? c.stroke : INK}" stroke-width="2"/>`);
      if (!bold && Math.abs(x - px) < 30) continue;
      parts.push(text(x, ly + 24, label, { bold, color: bold ? c.stroke : INK }));
    }
    y = ly + 24;
  }
  const summary = percentSummary(p, spec.of);
  parts.push(summaryText(x0, y + 34, summary));
  return wrap(Math.max(x0 + BW, x0 + summaryWidth(summary)) + PAD + 14, y + 34 + (summary.length - 1) * 24 + PAD, parts.join(""));
}

// ---------- Number bond ----------

function renderBond(spec: BondSpec): RenderedSvg {
  const parts0 = spec.parts.map((p) => p.trim());
  const radius = (s: string) => Math.max(34, textWidth(s, 20) / 2 + 14);
  const RW = radius(spec.whole);
  const radii = parts0.map(radius);
  const spacing = Math.max(120, ...radii.map((r) => 2 * r + 24));
  const span = spacing * (parts0.length - 1);
  const width = Math.max(span + 2 * Math.max(...radii), 2 * RW) + 2 * PAD;
  const cx = width / 2;
  const wy = PAD + RW;
  const py = wy + RW + 80;
  const out: string[] = [];

  parts0.forEach((_, i) => {
    const x = cx - span / 2 + i * spacing;
    const ang = Math.atan2(py - wy, x - cx);
    out.push(
      `<line x1="${r2(cx + RW * Math.cos(ang))}" y1="${r2(wy + RW * Math.sin(ang))}" x2="${r2(x - radii[i] * Math.cos(ang))}" y2="${r2(
        py - radii[i] * Math.sin(ang),
      )}" stroke="${INK}" stroke-width="2"/>`,
    );
  });
  const circle = (x: number, y: number, r: number, label: string, c: (typeof MODEL_COLORS)[number]) =>
    `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r)}" fill="${label.includes("?") ? "#ffffff" : c.fill}" stroke="${c.stroke}" stroke-width="2.5"${
      label.includes("?") ? ` stroke-dasharray="6 4"` : ""
    }/>` + text(x, y + 7, label, { size: 20, bold: true });
  out.push(circle(cx, wy, RW, spec.whole.trim(), MODEL_COLORS[0]));
  parts0.forEach((p, i) => out.push(circle(cx - span / 2 + i * spacing, py, radii[i], p, MODEL_COLORS[1])));
  return wrap(width, py + Math.max(...radii) + PAD, out.join(""));
}

export function renderModel(spec: ModelSpec): RenderedSvg {
  switch (spec.type) {
    case "bar":
      return renderBar(spec);
    case "fraction":
      return renderFraction(spec);
    case "percent":
      return renderPercent(spec);
    case "bond":
      return renderBond(spec);
    case "placeValue":
      return renderPlaceValue(spec);
    case "multiply":
      return renderMultiply(spec);
    case "division":
      return renderDivision(spec);
    case "fracop":
      return renderFracOp(spec);
    case "percratio":
      return renderPercRatio(spec);
  }
}

// ---------- Presets ----------

export const DEFAULT_MODELS: { [K in ModelType]: Extract<ModelSpec, { type: K }> } = {
  bar: { type: "bar", rows: [{ label: "", segments: "25, 15, 40=?", total: "80" }], grandTotal: "", showNumbers: true },
  fraction: { type: "fraction", rows: [{ n: 3, d: 4 }], shape: "bar", unitLabels: true },
  percent: { type: "percent", percent: 25, of: 80, style: "bar" },
  bond: { type: "bond", whole: "10", parts: ["7", "?"] },
  placeValue: { type: "placeValue", h: 0, t: 0, o: 0, showTotal: true },
  multiply: { type: "multiply", style: "groups", a: 3, b: 4, step: 999 },
  division: { type: "division", style: "bracket", a: 624, b: 12, decimals: 0, step: 999 },
  fracop: { type: "fracop", op: "+", a: "2/3", b: "3/4", step: 999 },
  percratio: { type: "percratio", kind: "of", p: "15", a: "240", b: "1", ratio: "2:3", up: true, step: 999 },
};

export const PRESETS: { [K in ModelType]: { key: string; spec: Extract<ModelSpec, { type: K }> }[] } = {
  bar: [
    { key: "partWhole", spec: DEFAULT_MODELS.bar },
    {
      key: "comparison",
      spec: {
        type: "bar",
        rows: [
          { label: "A", segments: "30", total: "" },
          { label: "B", segments: "30, 18=?", total: "48" },
        ],
        grandTotal: "",
        showNumbers: true,
      },
    },
    {
      key: "units",
      spec: {
        type: "bar",
        rows: [
          { label: "A", segments: "1=1u, 1=1u, 1=1u", total: "" },
          { label: "B", segments: "1=1u", total: "" },
        ],
        grandTotal: "48",
        showNumbers: false,
      },
    },
    {
      key: "fractionOfSet",
      spec: {
        type: "bar",
        rows: [{ label: "", segments: "[1, 1]=?, 1, 1, 1", total: "60" }],
        grandTotal: "",
        showNumbers: false,
      },
    },
  ],
  fraction: [
    { key: "single", spec: DEFAULT_MODELS.fraction },
    { key: "equivalent", spec: { type: "fraction", rows: [{ n: 1, d: 2 }, { n: 2, d: 4 }, { n: 4, d: 8 }], shape: "bar", unitLabels: true } },
    { key: "compare", spec: { type: "fraction", rows: [{ n: 2, d: 3 }, { n: 3, d: 4 }], shape: "circle", unitLabels: false } },
    { key: "improper", spec: { type: "fraction", rows: [{ n: 5, d: 4 }], shape: "bar", unitLabels: true } },
  ],
  percent: [
    { key: "percentOf", spec: DEFAULT_MODELS.percent },
    { key: "hundredGrid", spec: { type: "percent", percent: 35, of: null, style: "grid" } },
    { key: "discount", spec: { type: "percent", percent: 20, of: 150, style: "bar" } },
  ],
  multiply: [
    { key: "mulGroups", spec: { type: "multiply", style: "groups", a: 3, b: 4, step: 999 } },
    { key: "mulArray", spec: { type: "multiply", style: "array", a: 4, b: 6, step: 999 } },
    { key: "mulJumps", spec: { type: "multiply", style: "numberline", a: 5, b: 3, step: 999 } },
    { key: "mulDistributive", spec: { type: "multiply", style: "area", a: 7, b: 12, step: 999 } },
    { key: "mulArea", spec: { type: "multiply", style: "area", a: 23, b: 14, step: 999 } },
    { key: "mulBig", spec: { type: "multiply", style: "area", a: 123, b: 45, step: 999 } },
    { key: "mulLattice", spec: { type: "multiply", style: "lattice", a: 234, b: 56, step: 999 } },
    { key: "mulLatticeBig", spec: { type: "multiply", style: "lattice", a: 4567, b: 382, step: 999 } },
  ],
  percratio: [
    { key: "prOf", spec: { type: "percratio", kind: "of", p: "15", a: "240", b: "1", ratio: "2:3", up: true, step: 999 } },
    { key: "prWhat", spec: { type: "percratio", kind: "whatPercent", p: "20", a: "18", b: "24", ratio: "2:3", up: true, step: 999 } },
    { key: "prReverse", spec: { type: "percratio", kind: "reverse", p: "30", a: "45", b: "1", ratio: "2:3", up: true, step: 999 } },
    { key: "prSale", spec: { type: "percratio", kind: "change", p: "25", a: "80", b: "1", ratio: "2:3", up: false, step: 999 } },
    { key: "prRaise", spec: { type: "percratio", kind: "change", p: "12", a: "250", b: "1", ratio: "2:3", up: true, step: 999 } },
    { key: "prChange", spec: { type: "percratio", kind: "percentChange", p: "20", a: "40", b: "52", ratio: "2:3", up: true, step: 999 } },
    { key: "prBefore", spec: { type: "percratio", kind: "reverseChange", p: "20", a: "96", b: "1", ratio: "2:3", up: true, step: 999 } },
    { key: "prInterest", spec: { type: "percratio", kind: "interest", p: "5", a: "1000", b: "10", ratio: "2:3", up: true, step: 999 } },
    { key: "prSimplify", spec: { type: "percratio", kind: "simplify", p: "20", a: "80", b: "1", ratio: "12:18:30", up: true, step: 999 } },
    { key: "prSimplifyFrac", spec: { type: "percratio", kind: "simplify", p: "20", a: "80", b: "1", ratio: "1/2 : 3/4", up: true, step: 999 } },
    { key: "prShare", spec: { type: "percratio", kind: "share", p: "20", a: "45", b: "1", ratio: "2:3", up: true, step: 999 } },
    { key: "prPart", spec: { type: "percratio", kind: "partKnown", p: "20", a: "24", b: "1", ratio: "3:5", up: true, step: 999 } },
    { key: "prProportion", spec: { type: "percratio", kind: "proportion", p: "20", a: "15", b: "1", ratio: "3:4", up: true, step: 999 } },
  ],
  fracop: [
    { key: "foAdd", spec: { type: "fracop", op: "+", a: "2/3", b: "3/4", step: 999 } },
    { key: "foSameDen", spec: { type: "fracop", op: "+", a: "3/8", b: "1/8", step: 999 } },
    { key: "foSub", spec: { type: "fracop", op: "-", a: "5/6", b: "1/4", step: 999 } },
    { key: "foMixed", spec: { type: "fracop", op: "+", a: "2 1/3", b: "1 3/4", step: 999 } },
    { key: "foMul", spec: { type: "fracop", op: "×", a: "2/3", b: "3/4", step: 999 } },
    { key: "foCancel", spec: { type: "fracop", op: "×", a: "8/15", b: "5/12", step: 999 } },
    { key: "foDiv", spec: { type: "fracop", op: "÷", a: "3/4", b: "1/8", step: 999 } },
    { key: "foDivMixed", spec: { type: "fracop", op: "÷", a: "2 1/2", b: "3/4", step: 999 } },
  ],
  division: [
    { key: "div624", spec: { type: "division", style: "bracket", a: 624, b: 12, decimals: 0, step: 999 } },
    { key: "div625", spec: { type: "division", style: "bracket", a: 625, b: 12, decimals: 0, step: 999 } },
    { key: "divZero", spec: { type: "division", style: "bracket", a: 8136, b: 4, decimals: 0, step: 999 } },
    { key: "divBig", spec: { type: "division", style: "bracket", a: 98765, b: 43, decimals: 0, step: 999 } },
    { key: "divDecimal", spec: { type: "division", style: "bracket", a: 7, b: 8, decimals: 4, step: 999 } },
    { key: "divRepeat", spec: { type: "division", style: "bracket", a: 1, b: 7, decimals: 10, step: 999 } },
    { key: "divCorner", spec: { type: "division", style: "corner", a: 9372, b: 12, decimals: 0, step: 999 } },
    { key: "divShort", spec: { type: "division", style: "short", a: 7236, b: 6, decimals: 0, step: 999 } },
  ],
  placeValue: [
    { key: "pvEmpty", spec: { type: "placeValue", h: 0, t: 0, o: 0, showTotal: true } },
    { key: "pv234", spec: { type: "placeValue", h: 2, t: 3, o: 4, showTotal: true } },
    { key: "pvRegroup", spec: { type: "placeValue", h: 0, t: 1, o: 15, showTotal: true } },
    { key: "pvBorrow", spec: { type: "placeValue", h: 1, t: 0, o: 3, showTotal: true } },
  ],
  bond: [
    { key: "bond10", spec: DEFAULT_MODELS.bond },
    { key: "bondThree", spec: { type: "bond", whole: "100", parts: ["45", "30", "?"] } },
    { key: "bondFraction", spec: { type: "bond", whole: "1", parts: ["1/4", "3/4"] } },
  ],
};
