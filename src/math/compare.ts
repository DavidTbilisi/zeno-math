// Two towers of blocks for comparing two whole numbers from 0 to 10, as a picture: standing side by side for a
// question, or slid to a middle line with two pencils joining their tops and their bottoms for its worked solution, so
// the pencils draw the sign between the numbers beneath (the live piece on the board does the same, moving).
import { esc, FONT } from "./chart";
import type { RenderedSvg } from "./latex";
import { COMPARE_COLORS, compareSign, PENCIL_COLORS, towerSpan } from "./live";

export type CompareSpec = { a: number; b: number };

const INK = "#1e1e1e";
const [BW, BH, GAP, PAD] = [32, 11, 90, 10];
const TOP = 118;
const MID = PAD + TOP / 2 + 3;
const FLOOR = PAD + TOP;

function tower(n: number, x: number, top: number): string {
  let s = "";
  for (let i = 0; i < n; i++) {
    const y = top + (n - 1 - i) * BH;
    const fill = COMPARE_COLORS[i % COMPARE_COLORS.length];
    if (i === n - 1) for (const f of [0.2, 0.6]) s += `<rect x="${x + f * BW}" y="${y - 4}" width="${0.2 * BW}" height="5" rx="1.5" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>`;
    s += `<rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="2" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>`;
  }
  return s;
}

/** The towers for a and b with the numbers under them; with `pencils`, centred and joined, and the sign between. */
export function towersSvg({ a, b }: CompareSpec, pencils: boolean): { body: string; w: number; h: number } {
  const xs = [PAD, PAD + BW + GAP];
  const spans = [a, b].map((n) => towerSpan(n, BH, FLOOR, MID, pencils ? 1 : 0));
  let body = tower(a, xs[0], spans[0][0]) + tower(b, xs[1], spans[1][0]);
  if (pencils)
    for (const end of [0, 1] as const)
      body += `<line x1="${xs[0] + BW}" y1="${spans[0][end]}" x2="${xs[1]}" y2="${spans[1][end]}" stroke="${PENCIL_COLORS[end]}" stroke-width="4" stroke-linecap="round"/>`;
  const y = FLOOR + 26;
  const label = (x: number, t: string) => `<text x="${x}" y="${y}" font-size="20" text-anchor="middle" fill="${INK}">${esc(t)}</text>`;
  body += label(xs[0] + BW / 2, String(a)) + label(xs[1] + BW / 2, String(b));
  if (pencils) body += label((xs[0] + BW + xs[1]) / 2, compareSign(a, b));
  return { body: `<g ${FONT}>${body}</g>`, w: xs[1] + BW + PAD, h: y + PAD };
}

/** The worked solution: the pencils laid. */
export function renderCompare(spec: CompareSpec): RenderedSvg {
  const { body, w, h } = towersSvg(spec, true);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`, width: w, height: h };
}
