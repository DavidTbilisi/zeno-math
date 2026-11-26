// Pictures that go with a multiplication or division question: equal groups of dots, an array (with a line where it
// is split for the distributive property), jumps along a number line from 0, and some dots with empty plates to
// share them onto. They show what the question is about without giving its answer: no totals are written.
import { r2 } from "./chart";
import type { Exercise } from "./practiceTypes";

const DOT = `fill="#a5d8ff" stroke="#1971c2" stroke-width="1.5"`;
const INK = "#1e1e1e";
const pic = (body: string, w: number, h: number): Exercise["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`, h, w });
const dot = (x: number, y: number) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="7" ${DOT}/>`;

/** a rings, b dots in each (five to a row inside a ring), at most five rings to a row. */
export function groupsPic(a: number, b: number): Exercise["pic"] {
  const P = 19;
  const [cols, rows] = [Math.min(b, 5), Math.ceil(b / 5)];
  const [gw, gh] = [cols * P + 16, rows * P + 16];
  const per = Math.min(a, 5);
  const out: string[] = [];
  for (let g = 0; g < a; g++) {
    const [gx, gy] = [(g % per) * (gw + 14), Math.floor(g / per) * (gh + 14)];
    out.push(`<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx="${Math.min(gw, gh) / 2}" fill="#fff4e6" stroke="#e8590c" stroke-width="2"/>`);
    for (let i = 0; i < b; i++) out.push(dot(gx + 8 + (i % 5) * P + P / 2, gy + 8 + Math.floor(i / 5) * P + P / 2));
  }
  return pic(out.join(""), per * (gw + 14) - 14, Math.ceil(a / per) * (gh + 14) - 14);
}

/** rows × cols dots; with `split`, a dashed line after that many columns. */
export function arrayPic(rows: number, cols: number, split?: number): Exercise["pic"] {
  const P = 22;
  const gap = split ? 14 : 0;
  const x = (j: number) => 11 + j * P + (split && j >= split ? gap : 0);
  const out: string[] = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) out.push(dot(x(j), 11 + i * P));
  if (split) {
    const lx = x(split) - (P + gap) / 2;
    out.push(`<line x1="${r2(lx)}" y1="-4" x2="${r2(lx)}" y2="${rows * P + 4}" stroke="#e8590c" stroke-width="2" stroke-dasharray="5 4"/>`);
  }
  return pic(out.join(""), cols * P + gap, rows * P);
}

/** a jumps of b from 0, the line marked in ones up to a little past the end, every b-th mark numbered. */
export function jumpsPic(a: number, b: number): Exercise["pic"] {
  const end = a * b + b;
  const u = Math.min(26, 480 / end);
  const [x0, y] = [10, 64];
  const X = (t: number) => x0 + t * u;
  const out: string[] = [`<line x1="${x0 - 6}" y1="${y}" x2="${r2(X(end) + 8)}" y2="${y}" stroke="${INK}" stroke-width="2"/>`];
  for (let t = 0; t <= end; t++) {
    const big = t % b === 0;
    out.push(`<line x1="${r2(X(t))}" y1="${y - (big ? 7 : 4)}" x2="${r2(X(t))}" y2="${y + (big ? 7 : 4)}" stroke="${INK}" stroke-width="${big ? 1.8 : 1}"/>`);
    if (big) out.push(`<text x="${r2(X(t))}" y="${y + 24}" font-size="13" text-anchor="middle" fill="${INK}">${t}</text>`);
  }
  for (let k = 0; k < a; k++) {
    const [p, q] = [X(k * b), X((k + 1) * b)];
    const mid = (p + q) / 2;
    const top = y - 10 - Math.min(40, (q - p) / 2);
    out.push(`<path d="M ${r2(p)} ${y - 3} Q ${r2(mid)} ${r2(top)} ${r2(q)} ${y - 3}" fill="none" stroke="#e8590c" stroke-width="2"/>`);
    out.push(`<path d="M ${r2(q)} ${y - 3} l -7 -5 l 1 7 Z" fill="#e8590c"/>`);
  }
  return pic(out.join(""), X(end) + 14, y + 30);
}

/** n dots in rows of ten, and b empty plates under them to share the dots onto. */
export function sharePic(n: number, b: number): Exercise["pic"] {
  const P = 22;
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(dot(11 + (i % 10) * P, 11 + Math.floor(i / 10) * P));
  const y = Math.ceil(n / 10) * P + 26;
  for (let k = 0; k < b; k++) out.push(`<ellipse cx="${34 + k * 64}" cy="${y}" rx="28" ry="13" fill="#f8f9fa" stroke="#868e96" stroke-width="2"/>`);
  return pic(out.join(""), Math.max(10 * P, b * 64), y + 15);
}
