// Two towers of blocks for comparing two whole numbers from 0 to 10, as a picture: standing side by side for a
// question, or slid to a middle line with two pencils joining their tops and their bottoms for its worked solution, so
// the pencils draw the sign between the numbers beneath (the live piece on the board does the same, moving). Two
// fractions are drawn the same way, as bars of the same height whose shaded parts are the towers.
import { esc, FONT } from "./chart";
import type { RenderedSvg } from "./latex";
import { COMPARE_COLORS, compareSign, type Frac, FRACTION_FILLS, fracSign, PENCIL_COLORS, towerSpan } from "./live";

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

// ——— Fractions ———

/**
 * Two fractions as bars of the same height, as the live piece draws them. `cut` cuts both bars into that many equal
 * pieces (dashed), for comparing over a common bottom; `half` marks half-way up, for comparing with 1/2.
 */
export type FractionBarsSpec = { a: Frac; b: Frac; cut?: number; half?: boolean; steps?: string[] };

const [FW, FH, FGAP] = [34, 120, 80];
const FFLOOR = PAD + FH;
const FMID = PAD + FH / 2;
const LABEL_H = 48;

/** A fraction written as top, line, bottom, centred on x. */
function fracLabel(x: number, y: number, f: Frac): string {
  return (
    `<text x="${x}" y="${y + 16}" font-size="17" text-anchor="middle" fill="${INK}">${f.n}</text>` +
    `<line x1="${x - 11}" y1="${y + 22}" x2="${x + 11}" y2="${y + 22}" stroke="${INK}" stroke-width="1.6"/>` +
    `<text x="${x}" y="${y + 40}" font-size="17" text-anchor="middle" fill="${INK}">${f.d}</text>`
  );
}

/** Dashed lines cutting a bar (bottom at `bottom`, the whole FH high) into `cut` pieces, between `top` and `bottom`. */
function cuts(x: number, bottom: number, top: number, cut: number): string {
  let s = "";
  for (let k = 1; k < cut; k++) {
    const y = bottom - (k * FH) / cut;
    if (y > top + 0.5) s += `<line x1="${x + 2}" y1="${y}" x2="${x + FW - 2}" y2="${y}" stroke="#495057" stroke-width="0.8" stroke-dasharray="3 2"/>`;
  }
  return s;
}

/** One bar of a fraction: d parts, n of them shaded from the bottom; `whole` draws the empty parts too. */
function fracBar(f: Frac, x: number, bottom: number, fill: string, whole: boolean, cut?: number): string {
  const part = FH / f.d;
  let s = "";
  for (let i = 0; i < (whole ? f.d : f.n); i++)
    s += `<rect x="${x}" y="${bottom - (i + 1) * part}" width="${FW}" height="${part}" fill="${i < f.n ? fill : "#ffffff"}" stroke="${INK}" stroke-width="1.2"/>`;
  return s + (cut ? cuts(x, bottom, whole ? bottom - FH : bottom - f.n * part, cut) : "");
}

/**
 * The bars of a and b: standing, whole, with the fractions beneath; with `pencils`, beside them the shaded parts
 * alone, slid to a middle line and joined by the two pencils, with the sign between.
 */
export function fractionBarsSvg({ a, b, cut, half }: FractionBarsSpec, pencils: boolean): { body: string; w: number; h: number } {
  const xs = [PAD, PAD + FW + FGAP];
  const panelW = 2 * FW + FGAP;
  let body = fracBar(a, xs[0], FFLOOR, FRACTION_FILLS[0], true, cut) + fracBar(b, xs[1], FFLOOR, FRACTION_FILLS[1], true, cut);
  if (half) {
    const y = FFLOOR - FH / 2;
    body += `<line x1="${xs[0] - 6}" y1="${y}" x2="${xs[1] + FW + 6}" y2="${y}" stroke="#e03131" stroke-width="1.6" stroke-dasharray="6 4"/>`;
    body += `<text x="${(xs[0] + FW + xs[1]) / 2}" y="${y - 6}" font-size="14" text-anchor="middle" fill="#e03131">1/2</text>`;
  }
  body += fracLabel(xs[0] + FW / 2, FFLOOR + 6, a) + fracLabel(xs[1] + FW / 2, FFLOOR + 6, b);
  let w = PAD + panelW + PAD;
  if (pencils) {
    const ox = w + 40;
    const px = [ox, ox + FW + FGAP];
    const spans = [a, b].map((f) => towerSpan(f.n, FH / f.d, FFLOOR, FMID, 1));
    for (const [i, f] of [a, b].entries()) body += fracBar(f, px[i], spans[i][1], FRACTION_FILLS[i], false, cut);
    for (const end of [0, 1] as const)
      body += `<line x1="${px[0] + FW}" y1="${spans[0][end]}" x2="${px[1]}" y2="${spans[1][end]}" stroke="${PENCIL_COLORS[end]}" stroke-width="4" stroke-linecap="round"/>`;
    body += `<text x="${(px[0] + FW + px[1]) / 2}" y="${FFLOOR + 32}" font-size="24" text-anchor="middle" fill="${INK}">${esc(fracSign(a, b))}</text>`;
    w = ox + panelW + PAD;
  }
  return { body: `<g ${FONT}>${body}</g>`, w, h: FFLOOR + LABEL_H + PAD };
}

/** The worked solution: the bars standing and joined by the pencils, with the written steps beneath. */
export function renderFractionBars(spec: FractionBarsSpec, steps: RenderedSvg | null): RenderedSvg {
  const pic = fractionBarsSvg(spec, true);
  const w = Math.max(pic.w, steps?.width ?? 0);
  const h = pic.h + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${pic.h})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/><g transform="translate(${(w - pic.w) / 2} 0)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
