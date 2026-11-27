// Scatter plots and lines of fit (#652). A residual is how far a point is above its line, the actual y less the
// predicted; the line of best fit is the one whose squared residuals add up to the least, and its residuals add up to
// nothing: those above balance those below. `scatterSvg` draws points, lines and labels for a question; the piece
// `fitLine` has the learner drag a line through points while each residual is drawn as a square, and shrink the squares.
import { C } from "./chart";

const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif"`;

export type Pt = readonly [number, number];
export type Line = { m: number; c: number };

/** The least-squares line through the points. */
export function bestLine(pts: readonly Pt[]): Line {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  const sxy = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
  const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  const m = sxy / sxx;
  return { m, c: my - m * mx };
}
/** Each point's residual from the line: actual less predicted. */
export const residuals = (pts: readonly Pt[], l: Line) => pts.map(([x, y]) => y - (l.m * x + l.c));
/** The sum of the squared residuals. */
export const sse = (pts: readonly Pt[], l: Line) => residuals(pts, l).reduce((s, r) => s + r * r, 0);

/** The correlation coefficient r of the points. */
export function corr(pts: readonly Pt[]): number {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  const sxy = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
  const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  const syy = pts.reduce((s, p) => s + (p[1] - my) ** 2, 0);
  return sxy / Math.sqrt(sxx * syy);
}

/** A number as written, to two decimal places at most. */
export const short = (v: number) => String(Math.round(v * 100) / 100).replace("-", "−");
/** y = mx + c written out: y = 2.5x + 10, y = −3x + 40, y = x − 2. */
export function lineText(l: Line) {
  const m = l.m === 1 ? "" : l.m === -1 ? "−" : short(l.m);
  const c = l.c === 0 ? "" : l.c > 0 ? ` + ${short(l.c)}` : ` − ${short(-l.c)}`;
  return `y = ${m}x${c}`;
}

/**
 * Points on axes from 0 to xMax and 0 to yMax, labelled every xStep and yStep, with lines drawn across and points
 * named. Lines and names are coloured in turn (blue, orange).
 */
export function scatterSvg(pts: readonly Pt[], o: { xMax: number; yMax: number; xStep: number; yStep: number; xLabel?: string; yLabel?: string; lines?: { l: Line; name?: string }[]; names?: (string | null)[] }) {
  const pw = 300;
  const ph = 200;
  const x0 = 44;
  const y0 = 12;
  const X = (x: number) => x0 + (x / o.xMax) * pw;
  const Y = (y: number) => y0 + ph - (y / o.yMax) * ph;
  const out: string[] = [];
  for (let v = 0; v <= o.yMax + 1e-9; v += o.yStep) {
    out.push(`<line x1="${x0}" y1="${Y(v)}" x2="${x0 + pw}" y2="${Y(v)}" stroke="#e9ecef"/>`);
    out.push(`<text x="${x0 - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" ${font} fill="${C.ink}">${v}</text>`);
  }
  for (let v = 0; v <= o.xMax + 1e-9; v += o.xStep) out.push(`<text x="${X(v)}" y="${y0 + ph + 16}" font-size="11" text-anchor="middle" ${font} fill="${C.ink}">${v}</text>`);
  out.push(`<line x1="${x0}" y1="${y0 + ph}" x2="${x0 + pw}" y2="${y0 + ph}" stroke="${C.ink}" stroke-width="1.5"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + ph}" stroke="${C.ink}" stroke-width="1.5"/>`);
  (o.lines ?? []).forEach(({ l, name }, i) => {
    const color = i ? C.orange : C.blue;
    // Clipped to the plot: from where it enters to where it leaves.
    const ys = [0, o.xMax].map((x) => l.m * x + l.c);
    let [xa, xb] = [0, o.xMax];
    let [ya, yb] = ys;
    const clip = (y: number) => (l.m === 0 ? null : (y - l.c) / l.m);
    if (ya < 0) [xa, ya] = [clip(0)!, 0];
    if (ya > o.yMax) [xa, ya] = [clip(o.yMax)!, o.yMax];
    if (yb < 0) [xb, yb] = [clip(0)!, 0];
    if (yb > o.yMax) [xb, yb] = [clip(o.yMax)!, o.yMax];
    out.push(`<line x1="${X(xa)}" y1="${Y(ya)}" x2="${X(xb)}" y2="${Y(yb)}" stroke="${color}" stroke-width="2"/>`);
    if (name) out.push(`<text x="${X(xb) + 4}" y="${Y(yb) + (i ? 12 : -4)}" font-size="13" font-weight="700" ${font} fill="${color}">${name}</text>`);
  });
  pts.forEach(([x, y], i) => {
    out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="4.5" fill="${C.ink}"/>`);
    const name = o.names?.[i];
    if (name) out.push(`<text x="${X(x) + 7}" y="${Y(y) - 6}" font-size="13" font-weight="700" ${font} fill="${C.red}">${name}</text>`);
  });
  let h = y0 + ph + 22;
  if (o.xLabel) out.push(`<text x="${x0 + pw / 2}" y="${(h += 14)}" font-size="12" text-anchor="middle" ${font} fill="${C.grey}">${o.xLabel}</text>`);
  if (o.yLabel) out.push(`<text x="12" y="${y0 + ph / 2}" font-size="12" text-anchor="middle" ${font} fill="${C.grey}" transform="rotate(-90 12 ${y0 + ph / 2})">${o.yLabel}</text>`);
  return { body: out.join(""), w: x0 + pw + 40, h: h + 6 };
}

/** The piece: which set of points, and the line's heights at x = 0 and x = 10 (data units, steps of 0.1). */
export type LiveFitLine = { set: number; y0: number; y1: number };
export const FIT_SETS: readonly (readonly Pt[])[] = [
  [[1, 2.2], [2, 2.8], [3, 4.5], [4, 4.1], [5, 5.9], [6, 6.2], [7, 7.8], [8, 7.5], [9, 9.1]],
  [[1, 8.8], [2, 8.1], [3, 7.6], [4, 6.2], [5, 6.0], [6, 4.4], [7, 4.1], [8, 2.6], [9, 2.2]],
  [[1, 2], [2, 3], [3, 3.6], [4, 5], [5, 5.4], [6, 6.6], [7, 7.2], [8, 1.5], [9, 9]],
];
export const FITLINE_START: LiveFitLine = { set: 0, y0: 2, y1: 2 };
export const FIT_LO = -2;
export const FIT_HI = 12;
/** The line a state draws. */
export const lineOf = (s: LiveFitLine): Line => ({ m: (s.y1 - s.y0) / 10, c: s.y0 });
/** Close enough to the best: within 3 % of the least sum of squares (and a hair). */
export const isBest = (s: LiveFitLine) => {
  const pts = FIT_SETS[s.set];
  return sse(pts, lineOf(s)) <= sse(pts, bestLine(pts)) * 1.03 + 0.05;
};

/** A residual plot: each point's residual against x, from −top to top, with the zero line dashed across. */
export function residualSvg(pts: readonly Pt[], xMax: number, top: number, yLabel: string) {
  const [pw, ph, x0, y0] = [300, 180, 44, 12];
  const X = (x: number) => x0 + (x / xMax) * pw;
  const Y = (y: number) => y0 + ph / 2 - (y / top) * (ph / 2);
  const out: string[] = [];
  for (const v of [-top, -top / 2, 0, top / 2, top]) {
    out.push(`<line x1="${x0}" y1="${Y(v)}" x2="${x0 + pw}" y2="${Y(v)}" stroke="${v ? "#e9ecef" : C.ink}"${v ? "" : ` stroke-dasharray="5 4" stroke-width="1.5"`}/>`);
    out.push(`<text x="${x0 - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" ${font} fill="${C.ink}">${short(v)}</text>`);
  }
  for (let v = 0; v <= xMax; v += 2) out.push(`<text x="${X(v)}" y="${y0 + ph + 16}" font-size="11" text-anchor="middle" ${font} fill="${C.ink}">${v}</text>`);
  out.push(`<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + ph}" stroke="${C.ink}" stroke-width="1.5"/>`);
  for (const [x, y] of pts) out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="4.5" fill="${C.ink}"/>`);
  out.push(`<text x="12" y="${y0 + ph / 2}" font-size="12" text-anchor="middle" ${font} fill="${C.grey}" transform="rotate(-90 12 ${y0 + ph / 2})">${yLabel}</text>`);
  return { body: out.join(""), w: x0 + pw + 20, h: y0 + ph + 26 };
}
