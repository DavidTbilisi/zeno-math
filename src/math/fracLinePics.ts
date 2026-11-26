// Pictures for fractions as numbers (#702): a number line marked in equal parts, with a point or lettered points on it
// and, above it, a fraction bar the same length as one whole, or below it, a second line cut finer; shapes cut into
// parts, equal or not, lettered for a pick; bars of one whole each with pieces shaded past the first. Labels are
// written stacked (a top over a bottom) as a child writes them; the answer is never written.
import { r2 } from "./chart";
import type { Exercise } from "./practiceTypes";

const INK = "#1e1e1e";
const ASK = "#e8590c";
const SHADE = `fill="#a5d8ff" stroke="${INK}" stroke-width="1.5"`;
const EMPTY = `fill="#ffffff" stroke="${INK}" stroke-width="1.5"`;
const pic = (body: string, w: number, h: number): Exercise["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`, h, w });
const text = (x: number, y: number, s: string, o: { size?: number; color?: string; bold?: boolean } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.size ?? 15}" text-anchor="middle" fill="${o.color ?? INK}"${o.bold ? ' font-weight="700"' : ""}>${s}</text>`;
/** "3/4" stacked, its top at y; a whole number on one line. */
const label = (x: number, y: number, s: string, color = INK) => {
  const [n, d] = s.split("/");
  if (d === undefined) return text(x, y + 14, s, { color });
  return `${text(x, y + 11, n, { size: 13, color })}<line x1="${r2(x - 8)}" y1="${r2(y + 15)}" x2="${r2(x + 8)}" y2="${r2(y + 15)}" stroke="${color}" stroke-width="1.2"/>${text(x, y + 28, d, { size: 13, color })}`;
};

export type LineOpts = {
  /** Wholes the line runs over from 0, and the equal parts each whole is cut into. */
  wholes: number;
  d: number;
  /** Labels under the marks, by parts from 0: "0", "1", "1/4". */
  labels: [number, string][];
  /** A point on the line, parts from 0. */
  dot?: number;
  /** Lettered points above the line, parts from 0. */
  letters?: [number, string][];
  /** A bar over the first whole, cut into the line's parts, the first `shaded` of them shaded. */
  bar?: number;
  /** A second line below, the same wholes, cut into this many parts each, labelled at 0 and the wholes. */
  under?: number;
};

/** A number line from 0 over `wholes` wholes, marks at every part. */
export function fracLine(o: LineOpts): Exercise["pic"] {
  const unit = Math.min(300, 600 / o.wholes);
  const [x0, w] = [24, unit * o.wholes];
  const top = o.bar !== undefined ? (o.letters ? 70 : 50) : o.letters ? 26 : 12;
  const out: string[] = [];
  const at = (parts: number, d = o.d) => x0 + (parts / d) * unit;
  if (o.bar !== undefined)
    for (let i = 0; i < o.d; i++) out.push(`<rect x="${r2(at(i))}" y="6" width="${r2(unit / o.d)}" height="30" ${i < o.bar ? SHADE : EMPTY}/>`);
  const line = (y: number, d: number, labels: [number, string][]) => {
    out.push(`<line x1="${x0 - 8}" y1="${y}" x2="${r2(x0 + w + 12)}" y2="${y}" stroke="${INK}" stroke-width="2"/>`);
    out.push(`<path d="M ${r2(x0 + w + 12)} ${y} l -7 -5 v 10 z" fill="${INK}"/>`);
    for (let i = 0; i <= d * o.wholes; i++) {
      const tall = i % d === 0 ? 9 : 6;
      out.push(`<line x1="${r2(at(i, d))}" y1="${y - tall}" x2="${r2(at(i, d))}" y2="${y + tall}" stroke="${INK}" stroke-width="${i % d === 0 ? 2 : 1.5}"/>`);
    }
    for (const [p, s] of labels) out.push(label(at(p, d), y + 10, s));
  };
  line(top, o.d, o.labels);
  for (const [p, s] of o.letters ?? []) out.push(`<circle cx="${r2(at(p))}" cy="${top}" r="5" fill="${ASK}"/>${text(at(p), top - 10, s, { color: ASK, bold: true })}`);
  if (o.dot !== undefined) out.push(`<circle cx="${r2(at(o.dot))}" cy="${top}" r="6.5" fill="${ASK}" stroke="#ffffff" stroke-width="1.5"/>`);
  let h = top + 46;
  if (o.under !== undefined) {
    const y = top + 62;
    line(y, o.under, Array.from({ length: o.wholes + 1 }, (_, k) => [k * o.under!, String(k)] as [number, string]));
    h = y + 46;
  }
  return pic(out.join(""), x0 + w + 24, h);
}

/** A circle cut into sectors, or a rectangle into strips, at the given cuts (fractions of the way round or across). */
export type CutShape = { kind: "circle" | "rect"; cuts: number[] };

/** Shapes side by side, lettered underneath. */
export function cutShapes(shapes: CutShape[], letters: string[]): Exercise["pic"] {
  const [S, gap] = [96, 34];
  const out: string[] = [];
  shapes.forEach((s, i) => {
    const x = i * (S + gap);
    if (s.kind === "circle") {
      const [cx, cy, R] = [x + S / 2, S / 2 + 4, S / 2 - 2];
      out.push(`<circle cx="${cx}" cy="${cy}" r="${R}" ${EMPTY}/>`);
      for (const c of s.cuts) {
        const a = 2 * Math.PI * c - Math.PI / 2;
        out.push(`<line x1="${cx}" y1="${cy}" x2="${r2(cx + R * Math.cos(a))}" y2="${r2(cy + R * Math.sin(a))}" stroke="${INK}" stroke-width="1.5"/>`);
      }
    } else {
      out.push(`<rect x="${x}" y="${S / 4}" width="${S}" height="${S / 2}" ${EMPTY}/>`);
      for (const c of s.cuts) out.push(`<line x1="${r2(x + c * S)}" y1="${S / 4}" x2="${r2(x + c * S)}" y2="${(3 * S) / 4}" stroke="${INK}" stroke-width="1.5"/>`);
    }
    out.push(text(x + S / 2, S + 26, letters[i], { color: ASK, bold: true, size: 16 }));
  });
  return pic(out.join(""), shapes.length * (S + gap) - gap, S + 32);
}

/** `bars` bars, each one whole cut into d, the first n pieces shaded across them. */
export function wholeBars(bars: number, d: number, n: number): Exercise["pic"] {
  const [W, H, gap] = [Math.min(240, 24 * d), 30, 12];
  const out: string[] = [];
  for (let b = 0; b < bars; b++)
    for (let i = 0; i < d; i++) out.push(`<rect x="${r2((i * W) / d)}" y="${b * (H + gap)}" width="${r2(W / d)}" height="${H}" ${b * d + i < n ? SHADE : EMPTY}/>`);
  return pic(out.join(""), W + 2, bars * (H + gap) - gap + 2);
}
