// Function plots rendered to a standalone SVG string (embeddable in Excalidraw as an image).
import { compile, type EvalFunction } from "mathjs";
import type { RenderedSvg } from "./latex";

export type PlotFn = { expr: string; color: string };
export type PlotSpec = {
  functions: PlotFn[];
  xMin: number;
  xMax: number;
  yMin: number | null; // null = auto
  yMax: number | null;
  grid: boolean;
};

export const PLOT_COLORS = ["#1971c2", "#e03131", "#2f9e44", "#9c36b5", "#e8590c", "#1e1e1e"];

export const DEFAULT_PLOT: PlotSpec = {
  functions: [{ expr: "sin(x)", color: PLOT_COLORS[0] }],
  xMin: -10,
  xMax: 10,
  yMin: null,
  yMax: null,
  grid: true,
};

const W = 560;
const H = 400;
const PAD = 28;
const SAMPLES = 1200;

/** Throws with a readable message if an expression doesn't parse or uses unknown symbols. */
export function compileExpr(expr: string): EvalFunction {
  const code = compile(expr.replace(/^\s*y\s*=/, ""));
  code.evaluate({ x: 1.2345 }); // surfaces "Undefined symbol" errors early
  return code;
}

export function niceStep(range: number, target = 10): number {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
}

function fmt(v: number): string {
  const r = Math.round(v * 1e6) / 1e6;
  return Math.abs(r) >= 1e4 || (Math.abs(r) < 1e-3 && r !== 0) ? r.toExponential(0) : String(r);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function plotToSvg(spec: PlotSpec): RenderedSvg {
  const { xMin, xMax } = spec;
  if (!(xMax > xMin)) throw new Error("x range: min must be less than max");

  // Sample every function.
  const series = spec.functions
    .filter((f) => f.expr.trim())
    .map((f) => {
      const code = compileExpr(f.expr);
      const pts: [number, number][] = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const x = xMin + ((xMax - xMin) * i) / SAMPLES;
        let y: unknown;
        try {
          y = code.evaluate({ x });
        } catch {
          y = NaN;
        }
        pts.push([x, typeof y === "number" && Number.isFinite(y) ? y : NaN]);
      }
      return { ...f, pts };
    });

  // Auto y-range: robust percentile window so asymptotes (tan, 1/x) don't flatten everything.
  let { yMin, yMax } = spec;
  if (yMin === null || yMax === null) {
    const ys = series.flatMap((s) => s.pts.map((p) => p[1])).filter(Number.isFinite).sort((a, b) => a - b);
    const lo = ys.length ? ys[Math.floor(ys.length * 0.02)] : -5;
    const hi = ys.length ? ys[Math.ceil(ys.length * 0.98) - 1] : 5;
    const span = hi - lo || 2;
    yMin ??= lo - span * 0.1;
    yMax ??= hi + span * 0.1;
  }
  if (!(yMax > yMin)) throw new Error("y range: min must be less than max");

  const sx = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD);
  const sy = (y: number) => H - PAD - ((y - yMin!) / (yMax! - yMin!)) * (H - 2 * PAD);

  const parts: string[] = [];
  parts.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);

  // Grid + tick labels.
  const xs = niceStep(xMax - xMin);
  const ysStep = niceStep(yMax - yMin, 8);
  const axisX = Math.min(Math.max(sy(0), PAD), H - PAD); // y-pixel of the x-axis (clamped)
  const axisY = Math.min(Math.max(sx(0), PAD), W - PAD);
  const labels: string[] = [];
  for (let x = Math.ceil(xMin / xs) * xs; x <= xMax + 1e-9; x += xs) {
    const px = sx(x);
    if (spec.grid) parts.push(`<line x1="${px}" y1="${PAD}" x2="${px}" y2="${H - PAD}" stroke="#e9ecef"/>`);
    if (Math.abs(x) > xs / 2)
      labels.push(`<text x="${px}" y="${axisX + 14}" text-anchor="middle">${fmt(x)}</text>`);
  }
  for (let y = Math.ceil(yMin / ysStep) * ysStep; y <= yMax + 1e-9; y += ysStep) {
    const py = sy(y);
    if (spec.grid) parts.push(`<line x1="${PAD}" y1="${py}" x2="${W - PAD}" y2="${py}" stroke="#e9ecef"/>`);
    if (Math.abs(y) > ysStep / 2)
      labels.push(`<text x="${axisY - 5}" y="${py + 4}" text-anchor="end">${fmt(y)}</text>`);
  }

  // Axes with arrowheads.
  parts.push(
    `<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#495057"/></marker></defs>`,
    `<line x1="${PAD - 6}" y1="${axisX}" x2="${W - PAD + 12}" y2="${axisX}" stroke="#495057" stroke-width="1.3" marker-end="url(#a)"/>`,
    `<line x1="${axisY}" y1="${H - PAD + 6}" x2="${axisY}" y2="${PAD - 12}" stroke="#495057" stroke-width="1.3" marker-end="url(#a)"/>`,
    `<g font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#495057">${labels.join("")}` +
      `<text x="${W - PAD + 8}" y="${axisX - 8}" font-style="italic" font-size="13">x</text>` +
      `<text x="${axisY + 8}" y="${PAD - 6}" font-style="italic" font-size="13">y</text></g>`,
  );

  // Curves: split into segments at gaps and at huge jumps (vertical asymptotes).
  parts.push(`<clipPath id="c"><rect x="${PAD}" y="${PAD}" width="${W - 2 * PAD}" height="${H - 2 * PAD}"/></clipPath>`);
  const jump = (yMax - yMin) * 2;
  for (const s of series) {
    const segs: string[] = [];
    let cur: string[] = [];
    let prevY = NaN;
    for (const [x, y] of s.pts) {
      if (!Number.isFinite(y) || (Number.isFinite(prevY) && Math.abs(y - prevY) > jump)) {
        if (cur.length > 1) segs.push(cur.join(" "));
        cur = [];
      }
      if (Number.isFinite(y)) {
        const py = Math.min(Math.max(sy(y), -H), 2 * H);
        cur.push(`${sx(x).toFixed(2)},${py.toFixed(2)}`);
      }
      prevY = y;
    }
    if (cur.length > 1) segs.push(cur.join(" "));
    parts.push(
      `<g clip-path="url(#c)" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">` +
        segs.map((p) => `<polyline points="${p}"/>`).join("") +
        `</g>`,
    );
  }

  // Legend.
  series.forEach((s, i) => {
    const y = PAD + 8 + i * 18;
    parts.push(
      `<g font-family="Helvetica, Arial, sans-serif" font-size="13"><rect x="${PAD + 6}" y="${y - 11}" width="${
        Math.min(240, 40 + s.expr.length * 7.2)
      }" height="16" fill="#ffffff" opacity="0.85"/>` +
        `<line x1="${PAD + 8}" y1="${y - 3}" x2="${PAD + 24}" y2="${y - 3}" stroke="${s.color}" stroke-width="3"/>` +
        `<text x="${PAD + 30}" y="${y + 1}" fill="#1e1e1e">y = ${esc(s.expr.replace(/^\s*y\s*=/, "").trim())}</text></g>`,
    );
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
  return { svg, width: W, height: H };
}
