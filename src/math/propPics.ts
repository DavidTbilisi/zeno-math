// Pictures for the proportional-relationship questions of #708: a straight line y = kx + c on a squared grid, its
// whole-number points marked, so whether it goes through (0, 0) can be seen. Plain SVG strings.
import { C, FONT, r2 } from "./chart";

type Pic = { svg: (x: number, y: number) => string; h: number; w: number };
const at = (body: string, w: number, h: number): Pic => ({ svg: (x, y) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`, w, h });
const text = (x: number, y: number, s: string, anchor = "middle", color: string = C.ink) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="12" fill="${color}" text-anchor="${anchor}">${s}</text>`;

/** y = kx + c for x from 0 to xmax, on a grid whose y step is `ys`; the points at x = 1, 2, … marked. */
export function lineGraph(k: number, c: number, xmax: number, ys: number): Pic {
  const ymax = Math.ceil((k * xmax + c) / ys) * ys;
  const [ox, oy, S] = [36, 16 + (ymax / ys) * 24, 24];
  const X = (x: number) => ox + x * S;
  const Y = (y: number) => oy - (y / ys) * 24;
  const out: string[] = [];
  for (let i = 0; i <= xmax; i++) {
    out.push(`<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(ymax)}" stroke="#dee2e6" stroke-width="1"/>`);
    out.push(text(X(i), oy + 16, String(i)));
  }
  for (let j = 0; j <= ymax / ys; j++) {
    out.push(`<line x1="${X(0)}" y1="${Y(j * ys)}" x2="${X(xmax)}" y2="${Y(j * ys)}" stroke="#dee2e6" stroke-width="1"/>`);
    if (j) out.push(text(ox - 6, Y(j * ys) + 4, String(j * ys), "end"));
  }
  out.push(`<path d="M${X(0)},${Y(0)} H${X(xmax) + 8} M${X(0)},${Y(0)} V${Y(ymax) - 8}" stroke="${C.ink}" stroke-width="1.8" fill="none"/>`);
  out.push(text(X(xmax) + 14, oy + 4, "x"), text(ox, Y(ymax) - 12, "y"));
  out.push(`<line x1="${X(0)}" y1="${r2(Y(c))}" x2="${X(xmax)}" y2="${r2(Y(k * xmax + c))}" stroke="${C.blue}" stroke-width="2.6"/>`);
  for (let i = 1; i <= xmax; i++) out.push(`<circle cx="${X(i)}" cy="${r2(Y(k * i + c))}" r="4" fill="${C.orange}"/>`);
  return at(out.join(""), X(xmax) + 24, oy + 26);
}

/** A tape diagram: A's row of m equal parts with its amount bracketed, B's row of n parts with "?". */
export function tapePic(m: number, n: number, a: number): Pic {
  const pw = Math.min(56, 320 / Math.max(m, n));
  const [x0, H] = [40, 34];
  const out: string[] = [];
  const row = (y: number, k: number, fill: string, stroke: string, name: string) => {
    out.push(`<text x="${x0 - 14}" y="${y + H / 2 + 6}" ${FONT} font-size="18" font-weight="700" fill="${stroke}" text-anchor="middle">${name}</text>`);
    for (let i = 0; i < k; i++) out.push(`<rect x="${r2(x0 + i * pw)}" y="${y}" width="${r2(pw)}" height="${H}" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>`);
  };
  row(30, m, "#a5d8ff", C.blue, "A");
  row(30 + H + 16, n, "#ffd8a8", C.orange, "B");
  out.push(`<path d="M${x0},24 v-8 H${r2(x0 + m * pw)} v8" fill="none" stroke="${C.ink}" stroke-width="2"/>`);
  out.push(`<text x="${r2(x0 + (m * pw) / 2)}" y="11" ${FONT} font-size="15" font-weight="700" fill="${C.ink}" text-anchor="middle">${a}</text>`);
  out.push(`<text x="${r2(x0 + n * pw + 12)}" y="${30 + H + 16 + H / 2 + 6}" ${FONT} font-size="18" font-weight="700" fill="${C.orange}">?</text>`);
  return at(out.join(""), x0 + Math.max(m, n) * pw + 40, 30 + 2 * H + 26);
}
