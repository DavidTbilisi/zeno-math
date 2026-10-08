// Shared drawing helpers for the Analysis and Statistics pictures: number formatting, plot frames
// with axes, curves, labels, and composing a LaTeX header + plot + captions into one standalone SVG.
import { latexToSvg, type RenderedSvg } from "./latex";
import { niceStep } from "./scale";
import { fill, nf } from "./text";

// fill and nf live in text.ts (no imports) so that messages can be filled in without loading MathJax; the pictures
// here still get them from this module.
export { fill, nf };
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo)));
/** Number for captions (proper minus sign). */
export const nt = (v: number, digits = 4) => nf(v, digits).replace(/^-/, "−").replace("e-", "e−");
/** Number for LaTeX. */
export function tn(v: number, digits = 4): string {
  const s = nf(v, digits);
  const m = s.match(/^(-?[\d.]+)e([+-]\d+)$/);
  if (m) return `${m[1]} \\cdot 10^{${Number(m[2])}}`;
  return s.replace("−∞", "-\\infty").replace("∞", "\\infty").replace("—", "?");
}
export const paren = (v: number) => (v < 0 ? `(${tn(v)})` : tn(v));

/** Round down to `sig` significant digits (a safe δ). */
export function floorSig(v: number, sig = 3): number {
  if (!(v > 0)) return 0;
  const p = 10 ** (Math.floor(Math.log10(v)) - sig + 1);
  return Number((Math.floor(v / p + 1e-9) * p).toPrecision(sig));
}

export const SUB = "₀₁₂₃₄₅₆₇₈₉";
export const sub = (n: number) => String(n).replace(/\d/g, (d) => SUB[Number(d)]);

// ---------- drawing ----------

export const W = 640;
export const FONT = `font-family="Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;
export const C = { blue: "#1971c2", red: "#e03131", green: "#2f9e44", orange: "#e8590c", purple: "#9c36b5", ink: "#1e1e1e", grey: "#868e96" };

export type Frame = {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  sx: (x: number) => number;
  sy: (y: number) => number;
};

export function makeFrame(id: string, left: number, top: number, w: number, h: number, [x0, x1]: number[], [y0, y1]: number[]): Frame {
  return {
    id, left, top, right: left + w, bottom: top + h, x0, x1, y0, y1,
    sx: (x) => left + ((x - x0) / (x1 - x0)) * w,
    sy: (y) => top + h - ((y - y0) / (y1 - y0)) * h,
  };
}

export const r2 = (v: number) => Math.round(v * 100) / 100;

export type AxesOptions = {
  integerX?: boolean;
  /** Custom x ticks (e.g. 1, 10, 100 on a log scale). */
  xTicks?: { v: number; label: string }[];
  /** false: no y-axis, y labels or horizontal grid (dot plots, box plots). */
  yAxis?: boolean;
  /** Put the x-axis along the bottom edge instead of through y = 0 (data that doesn't start at 0). */
  xAtBottom?: boolean;
  yFormat?: (y: number) => string;
};

/** Grid, axes through 0 (clamped to the frame), tick labels and the clip path for curves. */
export function axes(f: Frame, options: boolean | AxesOptions = false): string {
  const o: AxesOptions = typeof options === "boolean" ? { integerX: options } : options;
  const showY = o.yAxis !== false;
  const parts: string[] = [`<clipPath id="${f.id}"><rect x="${f.left}" y="${f.top}" width="${f.right - f.left}" height="${f.bottom - f.top}"/></clipPath>`];
  const labels: string[] = [];
  const ax = o.xAtBottom ? f.bottom : Math.min(Math.max(f.sy(0), f.top), f.bottom); // pixel y of the x-axis
  const ay = Math.min(Math.max(f.sx(0), f.left), f.right);
  let xs = niceStep(f.x1 - f.x0, 10);
  if (o.integerX) xs = Math.max(1, Math.round(xs));
  const xTicks = o.xTicks ?? [];
  if (!o.xTicks)
    for (let x = Math.ceil(f.x0 / xs) * xs; x <= f.x1 + 1e-9; x += xs)
      if (o.xAtBottom || !showY || Math.abs(x) > xs / 2) xTicks.push({ v: x, label: nt(x, 3) });
  for (const t of xTicks) {
    const px = r2(f.sx(t.v));
    parts.push(`<line x1="${px}" y1="${f.top}" x2="${px}" y2="${f.bottom}" stroke="#e9ecef"/>`);
    labels.push(`<text x="${px}" y="${r2(Math.min(ax + 14, f.bottom + 14))}" text-anchor="middle">${esc(t.label)}</text>`);
  }
  if (showY) {
    const ys = niceStep(f.y1 - f.y0, 7);
    for (let y = Math.ceil(f.y0 / ys) * ys; y <= f.y1 + 1e-9; y += ys) {
      const py = r2(f.sy(y));
      parts.push(`<line x1="${f.left}" y1="${py}" x2="${f.right}" y2="${py}" stroke="#e9ecef"/>`);
      if (Math.abs(y) > ys / 2 || o.xAtBottom)
        labels.push(`<text x="${r2(Math.max(ay - 5, f.left - 5))}" y="${py + 4}" text-anchor="end">${o.yFormat ? o.yFormat(y) : nt(y, 3)}</text>`);
    }
  }
  parts.push(
    `<rect x="${f.left}" y="${f.top}" width="${f.right - f.left}" height="${f.bottom - f.top}" fill="none" stroke="#dee2e6"/>`,
    `<line x1="${f.left}" y1="${r2(ax)}" x2="${f.right}" y2="${r2(ax)}" stroke="#495057" stroke-width="1.2"/>`,
    showY ? `<line x1="${r2(ay)}" y1="${f.top}" x2="${r2(ay)}" y2="${f.bottom}" stroke="#495057" stroke-width="1.2"/>` : "",
    `<g ${FONT} font-size="11" fill="#495057">${labels.join("")}</g>`,
  );
  return parts.join("");
}

/** A function graph, split at gaps and at vertical asymptotes. */
export function curve(f: Frame, fn: (x: number) => number, color: string, width = 2.4, extra = "", from = f.x0, to = f.x1, samples = 1500): string {
  const jump = (f.y1 - f.y0) * 2;
  const H = f.bottom - f.top;
  const segs: string[] = [];
  let cur: string[] = [];
  let prev = NaN;
  for (let i = 0; i <= samples; i++) {
    const x = from + ((to - from) * i) / samples;
    const y = fn(x);
    if (!Number.isFinite(y) || (Number.isFinite(prev) && Math.abs(y - prev) > jump)) {
      if (cur.length > 1) segs.push(cur.join(" "));
      cur = [];
    }
    if (Number.isFinite(y)) cur.push(`${r2(f.sx(x))},${r2(Math.min(Math.max(f.sy(y), f.top - H), f.bottom + H))}`);
    prev = y;
  }
  if (cur.length > 1) segs.push(cur.join(" "));
  return `<g clip-path="url(#${f.id})" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" ${extra}>${segs
    .map((p) => `<polyline points="${p}"/>`)
    .join("")}</g>`;
}

export const sampleY = (fn: (x: number) => number, x0: number, x1: number, n = 600) =>
  Array.from({ length: n + 1 }, (_, i) => fn(x0 + ((x1 - x0) * i) / n));

/** A y-window that ignores spikes (2–98th percentile) and always contains `must`. */
export function yRange(values: number[], must: number[] = []): [number, number] {
  const ys = values.filter(Number.isFinite).sort((a, b) => a - b);
  let lo = ys.length ? ys[Math.floor(ys.length * 0.02)] : -1;
  let hi = ys.length ? ys[Math.ceil(ys.length * 0.98) - 1] : 1;
  for (const m of must) if (Number.isFinite(m)) (lo = Math.min(lo, m)), (hi = Math.max(hi, m));
  if (hi - lo < 1e-9) (lo -= 1), (hi += 1);
  const pad = (hi - lo) * 0.08;
  return [lo - pad, hi + pad];
}

/** Text with a white halo so it stays readable over lines and bands. */
export function lbl(x: number, y: number, text: string, color: string, anchor = "start", size = 13, italic = true): string {
  return `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${size}" ${italic ? `font-style="italic"` : ""} font-weight="600" fill="${color}" text-anchor="${anchor}" paint-order="stroke" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round">${esc(text)}</text>`;
}
/** An arrow from (x0, y0) to (x1, y1) in pixels, its head at the end; a dot when it has no length. */
export function arrow(x0: number, y0: number, x1: number, y1: number, color: string, width = 2.6, dashed = false): string {
  const [dx, dy] = [x1 - x0, y1 - y0];
  const L = Math.hypot(dx, dy);
  if (L < 1e-6) return `<circle cx="${r2(x1)}" cy="${r2(y1)}" r="3.5" fill="${color}"/>`;
  const [ux, uy] = [dx / L, dy / L];
  const h = Math.min(12, L * 0.4);
  const [bx, by] = [x1 - ux * h, y1 - uy * h];
  return (
    `<line x1="${r2(x0)}" y1="${r2(y0)}" x2="${r2(bx)}" y2="${r2(by)}" stroke="${color}" stroke-width="${width}" ${dashed ? `stroke-dasharray="6 4"` : ""}/>` +
    `<path d="M${r2(x1)},${r2(y1)}L${r2(bx - uy * h * 0.45)},${r2(by + ux * h * 0.45)}L${r2(bx + uy * h * 0.45)},${r2(by - ux * h * 0.45)}z" fill="${color}"/>`
  );
}

export const dot = (x: number, y: number, color: string, r = 4, hollow = false) =>
  `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r}" fill="${hollow ? "#ffffff" : color}" stroke="${color}" stroke-width="${hollow ? 2 : 1}"/>`;
export const hline = (f: Frame, y: number, color: string, extra = "") =>
  `<line x1="${f.left}" y1="${r2(f.sy(y))}" x2="${f.right}" y2="${r2(f.sy(y))}" stroke="${color}" ${extra}/>`;
export const vline = (f: Frame, x: number, color: string, extra = "") =>
  `<line x1="${r2(f.sx(x))}" y1="${f.top}" x2="${r2(f.sx(x))}" y2="${f.bottom}" stroke="${color}" ${extra}/>`;

/** Horizontal band y ∈ [lo, hi] labelled "L + ε" above and "L − ε" below. */
export function band(f: Frame, lo: number, hi: number, name: string, color: string, fillColor: string): string {
  const top = Math.max(f.sy(hi), f.top);
  const bot = Math.min(f.sy(lo), f.bottom);
  return (
    (bot > top ? `<rect x="${f.left}" y="${r2(top)}" width="${f.right - f.left}" height="${r2(bot - top)}" fill="${fillColor}" opacity="0.5"/>` : "") +
    hline(f, hi, color, `stroke-width="1.3"`) +
    hline(f, lo, color, `stroke-width="1.3"`) +
    lbl(f.right - 6, f.sy(hi) - 5, `${name} + ε`, color, "end") +
    lbl(f.right - 6, f.sy(lo) + 15, `${name} − ε`, color, "end")
  );
}

export function legend(f: Frame, items: { text: string; color: string; dash?: boolean }[]): string {
  return items
    .map((it, i) => {
      const y = f.top + 16 + i * 19;
      return (
        `<line x1="${f.left + 10}" y1="${y - 4}" x2="${f.left + 30}" y2="${y - 4}" stroke="${it.color}" stroke-width="3" ${it.dash ? `stroke-dasharray="6 4"` : ""}/>` +
        lbl(f.left + 36, y, it.text, C.ink, "start", 13, false)
      );
    })
    .join("");
}

/** Greedy word wrap for caption lines. */
export function wrap(text: string, max = 74): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    if (cur && (cur + " " + word).length > max) {
      lines.push(cur);
      cur = word;
    } else cur = cur ? cur + " " + word : word;
  }
  if (cur) lines.push(cur);
  return lines;
}

export type Caption = { text: string; color?: string };

/** LaTeX header + plot body + wrapped captions, stacked into one SVG. */
export function compose(tex: string, body: string, bodyH: number, captions: Caption[]): RenderedSvg {
  const head = latexToSvg(tex);
  const k = Math.min(1, (W - 32) / head.width);
  const hw = r2(head.width * k);
  const hh = r2(head.height * k);
  const headSvg = head.svg
    .replace(/width="[\d.]+"/, `width="${hw}"`)
    .replace(/height="[\d.]+"/, `height="${hh}"`)
    .replace(/^<svg/, `<svg x="${r2((W - hw) / 2)}" y="14"`);
  const top = 14 + hh + 10;
  const lines = captions.flatMap((c) => wrap(c.text).map((text) => ({ text, color: c.color ?? C.ink })));
  const capTop = top + bodyH + 12;
  const H = Math.ceil(capTop + lines.length * 21 + (lines.length ? 10 : 0));
  const caps = lines
    .map((l, i) => `<text x="${W / 2}" y="${capTop + 15 + i * 21}" text-anchor="middle" ${FONT} font-size="14.5" font-weight="600" fill="${l.color}">${esc(l.text)}</text>`)
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#ffffff"/>${headSvg}<g transform="translate(0 ${r2(top)})">${body}</g>${caps}</svg>`;
  return { svg, width: W, height: H };
}

export type TexLine = { tex: string; op?: string; color?: string };

/** Equation lines, one under another, each with what was done on the right. */
export function texLines(rows: TexLine[], y0: number, x0 = 28): { svg: string; h: number } {
  const parts: string[] = [];
  let y = y0;
  for (const r of rows) {
    const t = latexToSvg(r.tex, r.color ?? C.ink);
    const k = Math.min(1, (W - x0 - 230) / t.width);
    const w = t.width * k;
    const h = t.height * k;
    const rowH = Math.max(30, h + 10);
    parts.push(
      t.svg
        .replace(/width="[\d.]+"/, `width="${r2(w)}"`)
        .replace(/height="[\d.]+"/, `height="${r2(h)}"`)
        .replace(/^<svg/, `<svg x="${x0}" y="${r2(y + (rowH - h) / 2)}"`),
    );
    if (r.op)
      parts.push(
        `<text x="${W - 24}" y="${r2(y + rowH / 2 + 5)}" ${FONT} font-size="13" fill="${r.color === C.red ? C.red : C.blue}" text-anchor="end" font-weight="700">${esc(r.op)}</text>`,
      );
    y += rowH;
  }
  return { svg: parts.join(""), h: y - y0 };
}

export const PLOT = { left: 48, top: 6, w: W - 48 - 18, h: 380 };
export const BODY_H = PLOT.top + PLOT.h + 16;

/** A LaTeX snippet placed inside the picture (centred vertically on y). */
export function texAt(tex: string, x: number, y: number, anchor: "start" | "middle" | "end" = "middle", scale = 1, color?: string) {
  const r = latexToSvg(tex, color);
  const w = r.width * scale;
  const h = r.height * scale;
  const x0 = anchor === "start" ? x : anchor === "middle" ? x - w / 2 : x - w;
  const svg = r.svg
    .replace(/width="[\d.]+"/, `width="${r2(w)}"`)
    .replace(/height="[\d.]+"/, `height="${r2(h)}"`)
    .replace(/^<svg/, `<svg x="${r2(x0)}" y="${r2(y - h / 2)}"`);
  return { svg: `<rect x="${r2(x0 - 2)}" y="${r2(y - h / 2 - 1)}" width="${r2(w + 4)}" height="${r2(h + 2)}" fill="#ffffff" opacity="0.85"/>${svg}`, w };
}

/** Simpson's rule; NaN if f is undefined anywhere on the way. */
export function simpson(fn: (x: number) => number, a: number, b: number, n = 2000): number {
  const hh = (b - a) / n;
  let sum = fn(a) + fn(b);
  for (let i = 1; i < n; i++) sum += fn(a + i * hh) * (i % 2 ? 4 : 2);
  return (sum * hh) / 3;
}
