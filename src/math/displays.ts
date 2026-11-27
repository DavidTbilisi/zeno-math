// Displays built from data (#735): a line plot of fractions with an X for each value, the raw data laid out in a grid
// to be sorted into a table, a table of counts, and a mosaic plot whose column widths are the groups' shares and whose
// heights are the shares within each group.
import { C, FONT, r2 } from "./chart";

export type Pic = { body: string; w: number; h: number };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const text = (x: number, y: number, s: string | number, size = 13, color: string = C.ink, anchor = "middle", bold = false) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" ${FONT} fill="${color}"${bold ? ` font-weight="700"` : ""}>${esc(String(s))}</text>`;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/** n/d as read: 3/8, 1/2, 1, 1 1/4. */
export function fracLabel(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const [a, b] = [n / g, d / g];
  if (b === 1) return String(a);
  const whole = Math.floor(a / b);
  return whole ? `${whole} ${a - whole * b}/${b}` : `${a}/${b}`;
}

/** A line plot: an X for each value (a count of 1/d steps), stacked over a line from lo/d to hi/d. */
export function linePlotSvg(vs: readonly number[], lo: number, hi: number, d: number, label: string): Pic {
  const u = Math.max(34, Math.min(60, 470 / (hi - lo)));
  const x0 = 34;
  const counts = new Map<number, number>();
  for (const v of vs) counts.set(v, (counts.get(v) ?? 0) + 1);
  const tall = Math.max(...counts.values());
  const y = 24 + tall * 20;
  const out: string[] = [];
  for (const [v, c] of counts)
    for (let i = 0; i < c; i++) {
      const [x, cy, s] = [x0 + (v - lo) * u, y - 13 - i * 20, 6];
      out.push(`<path d="M${r2(x - s)} ${r2(cy - s)} L${r2(x + s)} ${r2(cy + s)} M${r2(x + s)} ${r2(cy - s)} L${r2(x - s)} ${r2(cy + s)}" stroke="${C.blue}" stroke-width="2.6" stroke-linecap="round"/>`);
    }
  out.push(`<line x1="${x0 - 12}" y1="${y}" x2="${r2(x0 + (hi - lo) * u + 12)}" y2="${y}" stroke="${C.ink}" stroke-width="1.6"/>`);
  for (let v = lo; v <= hi; v++) {
    const x = x0 + (v - lo) * u;
    out.push(`<line x1="${r2(x)}" y1="${y}" x2="${r2(x)}" y2="${y + 6}" stroke="${C.ink}"/>`, text(x, y + 21, fracLabel(v, d), 12));
  }
  const w = r2((hi - lo) * u + 2 * x0);
  out.push(text(w / 2, y + 42, label, 12, C.grey));
  return { body: out.join(""), w, h: y + 50 };
}

/** The raw data, one value a cell, `cols` to a row: what a table, a dot plot or a histogram is built from. */
export function dataGridSvg(items: readonly string[], cols: number): Pic {
  const [cw, rh] = [Math.max(56, 12 + 8 * Math.max(...items.map((s) => s.length))), 30];
  const rows = Math.ceil(items.length / cols);
  const out = [`<rect x="2" y="2" width="${cols * cw + 4}" height="${rows * rh + 4}" rx="8" fill="#f8f9fa" stroke="#dee2e6"/>`];
  items.forEach((s, i) => out.push(text(4 + (i % cols) * cw + cw / 2, 4 + Math.floor(i / cols) * rh + 20, s, 15)));
  return { body: out.join(""), w: cols * cw + 8, h: rows * rh + 8 };
}

/** A table of counts: a name and its count on each row, under a heading. */
export function countTableSvg(head: readonly [string, string], rows: readonly { name: string; n: number }[]): Pic {
  const [c1, c2, rh] = [150, 90, 32];
  const out = [`<rect x="2" y="2" width="${c1 + c2}" height="${(rows.length + 1) * rh}" fill="#fff" stroke="${C.ink}" stroke-width="1.4"/>`, `<rect x="2" y="2" width="${c1 + c2}" height="${rh}" fill="#e7f5ff" stroke="${C.ink}" stroke-width="1.4"/>`];
  out.push(text(2 + c1 / 2, 2 + 21, head[0], 14, C.ink, "middle", true), text(2 + c1 + c2 / 2, 2 + 21, head[1], 14, C.ink, "middle", true));
  rows.forEach((row, i) => {
    const y = 2 + (i + 1) * rh;
    out.push(`<line x1="2" y1="${y}" x2="${2 + c1 + c2}" y2="${y}" stroke="${C.ink}"/>`, text(2 + c1 / 2, y + 22, row.name, 18), text(2 + c1 + c2 / 2, y + 22, row.n, 16));
  });
  out.push(`<line x1="${2 + c1}" y1="2" x2="${2 + c1}" y2="${2 + (rows.length + 1) * rh}" stroke="${C.ink}"/>`);
  return { body: out.join(""), w: c1 + c2 + 6, h: (rows.length + 1) * rh + 6 };
}

/** A table: a heading row and rows of cells, the first column left-aligned (as a computer's regression output). */
export function tableSvg(head: readonly string[], rows: readonly (readonly (string | number)[])[]): Pic {
  const cw = head.map((h, i) => Math.max(90, 16 + 8 * Math.max(h.length, ...rows.map((row) => String(row[i]).length))));
  const rh = 30;
  const W = cw.reduce((a, b) => a + b, 0);
  const at = (i: number) => 2 + cw.slice(0, i).reduce((a, b) => a + b, 0);
  const out = [`<rect x="2" y="2" width="${W}" height="${(rows.length + 1) * rh}" fill="#fff" stroke="${C.ink}" stroke-width="1.4"/>`, `<line x1="2" y1="${2 + rh}" x2="${2 + W}" y2="${2 + rh}" stroke="${C.ink}" stroke-width="1.4"/>`];
  head.forEach((h, i) => out.push(text(i ? at(i) + cw[i] - 10 : at(i) + 10, 2 + 20, h, 14, C.ink, i ? "end" : "start", true)));
  rows.forEach((row, j) => row.forEach((c, i) => out.push(text(i ? at(i) + cw[i] - 10 : at(i) + 10, 2 + (j + 1) * rh + 20, c, 15, C.ink, i ? "end" : "start"))));
  return { body: out.join(""), w: W + 6, h: (rows.length + 1) * rh + 6 };
}

/** A Venn diagram of two sets in S, the count of each part (A only, both, B only, neither) written where it lies. */
export function vennSvg(names: readonly [string, string], counts: readonly [number, number, number, number]): Pic {
  const [W, H] = [360, 210];
  const out = [`<rect x="2" y="2" width="${W}" height="${H}" rx="6" fill="#fff" stroke="${C.ink}" stroke-width="1.4"/>`, text(20, 26, "S", 15, C.ink, "middle", true)];
  out.push(`<circle cx="140" cy="112" r="78" fill="${C.blue}" fill-opacity="0.14" stroke="${C.blue}" stroke-width="2"/>`, `<circle cx="222" cy="112" r="78" fill="${C.orange}" fill-opacity="0.14" stroke="${C.orange}" stroke-width="2"/>`);
  out.push(text(80, 40, names[0], 14, C.blue, "middle", true), text(282, 40, names[1], 14, C.orange, "middle", true));
  out.push(text(103, 118, counts[0], 20), text(181, 118, counts[1], 20), text(259, 118, counts[2], 20), text(W - 24, H - 14, counts[3], 20));
  return { body: out.join(""), w: W + 6, h: H + 6 };
}

/**
 * A mosaic plot of two groups: each column is as wide as its group's share of everyone, and split from the bottom into
 * the first part's share of that group and the rest. Both scales are marked every 10 %.
 */
export function mosaicSvg(groups: readonly [string, string], parts: readonly [string, string], cells: readonly (readonly number[])[]): Pic {
  const [x0, y0, pw, ph] = [52, 34, 360, 240];
  const tot = cells.map((c) => c[0] + c[1]);
  const all = tot[0] + tot[1];
  const colours = [C.orange, "#a5d8ff"];
  const out: string[] = [];
  let x = x0;
  tot.forEach((t, g) => {
    const w = (t / all) * pw;
    const low = (cells[g][0] / t) * ph;
    out.push(`<rect x="${r2(x)}" y="${r2(y0 + ph - low)}" width="${r2(w)}" height="${r2(low)}" fill="${colours[0]}" fill-opacity="0.8" stroke="#fff" stroke-width="3"/>`);
    out.push(`<rect x="${r2(x)}" y="${y0}" width="${r2(w)}" height="${r2(ph - low)}" fill="${colours[1]}" stroke="#fff" stroke-width="3"/>`);
    out.push(text(x + w / 2, y0 + ph + 40, groups[g], 14, C.ink, "middle", true));
    x += w;
  });
  for (let k = 0; k <= 10; k++) {
    const y = y0 + ph - (k / 10) * ph;
    const xx = x0 + (k / 10) * pw;
    out.push(`<line x1="${x0 - 5}" y1="${r2(y)}" x2="${x0}" y2="${r2(y)}" stroke="${C.ink}"/>`, text(x0 - 8, y + 4, `${k * 10}%`, 11, C.ink, "end"));
    out.push(`<line x1="${r2(xx)}" y1="${y0 + ph}" x2="${r2(xx)}" y2="${y0 + ph + 5}" stroke="${C.ink}"/>`, text(xx, y0 + ph + 18, `${k * 10}%`, 10, C.grey));
    if (k && k < 10) out.push(`<line x1="${x0}" y1="${r2(y)}" x2="${x0 + pw}" y2="${r2(y)}" stroke="${C.ink}" stroke-opacity="0.18" stroke-dasharray="3 4"/>`);
  }
  out.push(`<rect x="${x0}" y="${y0}" width="${pw}" height="${ph}" fill="none" stroke="${C.ink}" stroke-width="1.5"/>`);
  parts.forEach((p, i) => out.push(`<rect x="${x0 + i * 150}" y="6" width="16" height="16" fill="${colours[i]}"/>`, text(x0 + 22 + i * 150, 19, p, 13, C.ink, "start")));
  return { body: out.join(""), w: x0 + pw + 20, h: y0 + ph + 50 };
}
