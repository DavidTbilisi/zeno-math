// The pictures for the area and perimeter questions #709 added: unit squares to compare, a rectangle with only some
// of its squares drawn, a rectangle split in two, an L-shape, a polygon with its sides marked, a triangle and a
// parallelogram with a sloping side beside the height, a house (a rectangle with a roof), half and quarter circles,
// a circle in a square and a path round a pool, the last two shaded. Plain SVG; nothing is drawn to scale beyond
// what the question needs.
import { C, FONT, r2 } from "./chart";
import type { Part } from "./practiceTypes";

type Pic = NonNullable<Part["pic"]>;
const FILL = "#e7f5ff";
const FILL2 = "#fff4e6";
const SHADE = "#ffc9c9";
const text = (x: number, y: number, s: string, anchor = "middle", color: string = C.ink, size = 15) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}">${s}</text>`;
const pic = (body: string, w: number, h: number): Pic => ({ svg: (x, y) => `<g transform="translate(${r2(x)} ${r2(y)})" ${FONT}>${body}</g>`, w: r2Num(w), h: r2Num(h) });
const r2Num = (v: number) => Math.round(v * 100) / 100;
const square = (x: number, y: number, s: number, fill = FILL) => `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(s)}" height="${r2(s)}" fill="${fill}" stroke="${C.ink}" stroke-width="1.2"/>`;

/** Two shapes of unit squares, A and B, each w × h. */
export function unitShapes(a: [number, number], b: [number, number]): Pic {
  const S = 22;
  const out: string[] = [];
  let x = 20;
  for (const [i, [w, h]] of [a, b].entries()) {
    out.push(text(x + (w * S) / 2, 18, i ? "B" : "A", "middle", i ? C.orange : C.blue, 17));
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) out.push(square(x + c * S, 28 + r * S, S, i ? FILL2 : FILL));
    x += w * S + 44;
  }
  return pic(out.join(""), x, 28 + Math.max(a[1], b[1]) * S + 8);
}

/** A rectangle w × h of unit squares with only its first row and first column drawn. */
export function partialArray(w: number, h: number): Pic {
  const S = Math.min(26, 260 / w, 160 / h);
  const out = [`<rect x="20" y="10" width="${r2(w * S)}" height="${r2(h * S)}" fill="#ffffff" stroke="${C.ink}" stroke-width="2"/>`];
  for (let c = 0; c < w; c++) out.push(square(20 + c * S, 10, S));
  for (let r = 1; r < h; r++) out.push(square(20, 10 + r * S, S));
  return pic(out.join(""), w * S + 40, h * S + 20);
}

/** A rectangle a high and b + c wide, split by a dashed line into b and c. */
export function splitRect(a: number, b: number, c: number, unit = ""): Pic {
  const s = Math.min(24, 240 / (b + c), 120 / a);
  const [x0, y0] = [60, 8];
  const [wb, wc, H] = [b * s, c * s, a * s];
  const u = unit ? ` ${unit}` : "";
  return pic(
    `<rect x="${x0}" y="${y0}" width="${r2(wb)}" height="${r2(H)}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` +
      `<rect x="${r2(x0 + wb)}" y="${y0}" width="${r2(wc)}" height="${r2(H)}" fill="${FILL2}" stroke="${C.ink}" stroke-width="2"/>` +
      `<line x1="${r2(x0 + wb)}" y1="${y0}" x2="${r2(x0 + wb)}" y2="${r2(y0 + H)}" stroke="${C.red}" stroke-width="2" stroke-dasharray="6 4"/>` +
      text(x0 + wb / 2, y0 + H + 20, `${b}${u}`) + text(x0 + wb + wc / 2, y0 + H + 20, `${c}${u}`) + text(x0 - 8, y0 + H / 2 + 5, `${a}${u}`, "end"),
    x0 + wb + wc + 16, H + 36,
  );
}

/** An L-shape: a W × H rectangle with a w × h corner cut from its top right; four sides marked. */
export function lShape(W: number, H: number, w: number, h: number, unit: string): Pic {
  const s = Math.min(22, 220 / W, 140 / H);
  const [x0, y0] = [60, 24];
  const X = (x: number) => r2(x0 + x * s);
  const Y = (y: number) => r2(y0 + y * s);
  const pts = [[0, 0], [W - w, 0], [W - w, h], [W, h], [W, H], [0, H]].map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");
  return pic(
    `<polygon points="${pts}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` +
      text(x0 + (W * s) / 2, y0 + H * s + 20, `${W} ${unit}`) + text(x0 - 8, y0 + (H * s) / 2 + 5, `${H} ${unit}`, "end") +
      text(x0 + ((W - w) * s) / 2, y0 - 8, `${W - w} ${unit}`) + text(x0 + W * s + 8, y0 + ((h + H) / 2) * s + 5, `${H - h} ${unit}`, "start"),
    x0 + W * s + 70, y0 + H * s + 32,
  );
}

/** A polygon with n sides, drawn regular, each side marked with its label. */
export function polygonPic(labels: string[]): Pic {
  const n = labels.length;
  const [cx, cy, R] = [130, 100, 72];
  const pt = (i: number) => [cx + R * Math.cos(-Math.PI / 2 + Math.PI / n + (2 * Math.PI * i) / n), cy + R * Math.sin(-Math.PI / 2 + Math.PI / n + (2 * Math.PI * i) / n)];
  const out = [`<polygon points="${labels.map((_, i) => pt(i).map(r2).join(",")).join(" ")}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>`];
  labels.forEach((l, i) => {
    const [a, b] = [pt(i), pt((i + 1) % n)];
    const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const k = 1 + 24 / Math.hypot(mx - cx, my - cy);
    out.push(text(cx + (mx - cx) * k, cy + (my - cy) * k + 5, l, "middle", l === "?" ? C.red : C.ink));
  });
  return pic(out.join(""), 260, 200);
}

/**
 * A triangle on its base b, its top above the point d short of the right end: the height h dashed down from the top,
 * the right side (of length s) marked as well. Labels as given ("h" for an unknown height).
 */
export function slantTriangle(b: number, h: number, d: number, labels: { b: string; h: string; s: string }): Pic {
  const k = Math.min(200 / b, 130 / h, 24);
  const [x0, y0] = [40, 10];
  const [W, H] = [b * k, h * k];
  const fx = x0 + (b - d) * k;
  return pic(
    `<polygon points="${x0},${r2(y0 + H)} ${r2(x0 + W)},${r2(y0 + H)} ${r2(fx)},${y0}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` +
      `<line x1="${r2(fx)}" y1="${y0}" x2="${r2(fx)}" y2="${r2(y0 + H)}" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="5 4"/>` +
      `<path d="M ${r2(fx - 10)} ${r2(y0 + H)} v -10 h 10" fill="none" stroke="${C.ink}" stroke-width="1.2"/>` +
      text(x0 + W / 2, y0 + H + 20, labels.b) + text(fx - 6, y0 + H / 2 + 5, labels.h, "end", C.red) +
      text((fx + x0 + W) / 2 + 10, y0 + H / 2, labels.s, "start"),
    x0 + W + 70, H + 36,
  );
}

/** A parallelogram on base b, its top slid d to the right: the height h dashed from the top left corner, the left side s. */
export function parallelogramPic(b: number, h: number, d: number, labels: { b: string; h: string; s: string }): Pic {
  const k = Math.min(200 / (b + d), 120 / h, 24);
  const [x0, y0] = [70, 10];
  const [W, H, D] = [b * k, h * k, d * k];
  const pts = `${x0},${r2(y0 + H)} ${r2(x0 + W)},${r2(y0 + H)} ${r2(x0 + W + D)},${y0} ${r2(x0 + D)},${y0}`;
  return pic(
    `<polygon points="${pts}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` +
      `<line x1="${r2(x0 + D)}" y1="${y0}" x2="${r2(x0 + D)}" y2="${r2(y0 + H)}" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="5 4"/>` +
      `<path d="M ${r2(x0 + D)} ${r2(y0 + H - 10)} h 10 v 10" fill="none" stroke="${C.ink}" stroke-width="1.2"/>` +
      text(x0 + W / 2, y0 + H + 20, labels.b) + text(x0 + D + 6, y0 + H / 2 + 5, labels.h, "start", C.red) +
      text(x0 + D / 2 - 8, y0 + H / 2, labels.s, "end"),
    x0 + W + D + 20, H + 36,
  );
}

/** A house: a rectangle w wide and hh high with a triangle roof t high on it, the roof's height dashed. */
export function housePic(w: number, hh: number, t: number, unit: string): Pic {
  const k = Math.min(180 / w, 150 / (hh + t), 22);
  const [x0, y0] = [70, 10];
  const [W, T, H] = [w * k, t * k, hh * k];
  return pic(
    `<rect x="${x0}" y="${r2(y0 + T)}" width="${r2(W)}" height="${r2(H)}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` +
      `<polygon points="${x0},${r2(y0 + T)} ${r2(x0 + W)},${r2(y0 + T)} ${r2(x0 + W / 2)},${y0}" fill="${FILL2}" stroke="${C.ink}" stroke-width="2"/>` +
      `<line x1="${r2(x0 + W / 2)}" y1="${y0}" x2="${r2(x0 + W / 2)}" y2="${r2(y0 + T)}" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="5 4"/>` +
      text(x0 + W / 2 + 6, y0 + T / 2 + 8, `${t} ${unit}`, "start", C.red) + text(x0 + W / 2, y0 + T + H + 20, `${w} ${unit}`) +
      text(x0 - 8, y0 + T + H / 2 + 5, `${hh} ${unit}`, "end"),
    x0 + W + 20, T + H + 36,
  );
}

/** Half a circle on its diameter (marked), or a quarter circle with its two radii (one marked). */
export function circlePart(half: boolean, label: string): Pic {
  const R = 70;
  if (half) {
    const [cx, cy] = [R + 16, R + 10];
    return pic(
      `<path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} Z" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` +
        `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${C.red}" stroke-width="2"/>` + text(cx, cy + 20, label, "middle", C.red),
      2 * R + 32, R + 36,
    );
  }
  const [cx, cy] = [20, R + 10];
  return pic(
    `<path d="M ${cx} ${cy} L ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${cx} ${cy - R} Z" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` +
      `<line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${C.red}" stroke-width="2"/>` +
      `<path d="M ${cx} ${cy - 10} h 10 v 10" fill="none" stroke="${C.ink}" stroke-width="1.2"/>` + text(cx + R / 2, cy + 20, label, "middle", C.red),
    R + 60, R + 36,
  );
}

/** A circle that just fits in a square of side s; the corners outside the circle shaded. */
export function circleInSquare(label: string): Pic {
  const S = 140;
  const [x0, y0] = [20, 10];
  return pic(
    `<rect x="${x0}" y="${y0}" width="${S}" height="${S}" fill="${SHADE}" stroke="${C.ink}" stroke-width="2"/>` +
      `<circle cx="${x0 + S / 2}" cy="${y0 + S / 2}" r="${S / 2}" fill="#ffffff" stroke="${C.ink}" stroke-width="2"/>` + text(x0 + S / 2, y0 + S + 20, label),
    S + 40, S + 32,
  );
}

/** A pool a × b with a path p wide all round it, the path shaded. */
export function pathPic(a: number, b: number, p: number, unit: string): Pic {
  const k = Math.min(200 / (a + 2 * p), 130 / (b + 2 * p), 20);
  const [x0, y0] = [50, 10];
  const [W, H, P] = [(a + 2 * p) * k, (b + 2 * p) * k, p * k];
  return pic(
    `<rect x="${x0}" y="${y0}" width="${r2(W)}" height="${r2(H)}" fill="${SHADE}" stroke="${C.ink}" stroke-width="2"/>` +
      `<rect x="${r2(x0 + P)}" y="${r2(y0 + P)}" width="${r2(a * k)}" height="${r2(b * k)}" fill="#d0ebff" stroke="${C.ink}" stroke-width="2"/>` +
      text(x0 + W / 2, y0 + P + (b * k) / 2 + 5, `${a} ${unit} × ${b} ${unit}`, "middle", C.blue, 13) +
      // The path's width: a red line across its right-hand strip, marked outside.
      `<line x1="${r2(x0 + W - P)}" y1="${r2(y0 + H / 2)}" x2="${r2(x0 + W)}" y2="${r2(y0 + H / 2)}" stroke="${C.red}" stroke-width="2"/>` +
      text(x0 + W + 8, y0 + H / 2 + 5, `${p} ${unit}`, "start", C.red),
    x0 + W + 60, H + 20,
  );
}
