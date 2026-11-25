// Angles on parallel lines: where a line crosses another, the four angles it makes are two pairs, each pair equal
// (vertically opposite) and the two kinds adding to 180°. Two parallel lines crossed by one transversal make the
// same four angles twice, so an angle at one crossing has its twin at the other: corresponding (the same place),
// alternate (between the lines, on opposite sides) and co-interior (between the lines, on the same side, adding to
// 180°). The figures here draw those, a right angle split in two, and a triangle with one side carried on (the
// exterior angle); `positionAngle` says how big the angle in each place is.
import { C } from "./chart";

/** A place at a crossing: above or below the line, left or right of the transversal. */
export type Corner = "tl" | "tr" | "bl" | "br";
/** A place on the figure: the crossing on the top line (p) or the bottom one (q), and the corner there. */
export type Place = { at: "p" | "q"; c: Corner };
export type Pair = "vertical" | "line" | "corresponding" | "alternate" | "coInterior";

/** The angle in a place, the transversal at `theta` degrees to the lines (measured from the right, up). */
export const positionAngle = (theta: number, c: Corner) => (c === "tr" || c === "bl" ? theta : 180 - theta);

/** How two places are related, or null when they are not one of the named pairs. */
export function pairOf(a: Place, b: Place): Pair | null {
  const opp: Record<Corner, Corner> = { tl: "br", tr: "bl", bl: "tr", br: "tl" };
  if (a.at === b.at) return a.c === b.c ? null : opp[a.c] === b.c ? "vertical" : "line";
  if (a.c === b.c) return "corresponding";
  const [p, q] = a.at === "p" ? [a, b] : [b, a];
  // Between the lines: below the top one, above the bottom one.
  if (p.c[0] !== "b" || q.c[0] !== "t") return null;
  return p.c[1] === q.c[1] ? "coInterior" : "alternate";
}
/** Whether a pair's two angles are equal (or else add to 180°). */
export const pairEqual = (p: Pair) => p === "vertical" || p === "corresponding" || p === "alternate";

export type Drawn = { body: string; w: number; h: number };
const rad = (d: number) => (d * Math.PI) / 180;
const f1 = (v: number) => Math.round(v * 10) / 10;
const text = (x: number, y: number, s: string, color: string = C.ink, size = 15, anchor: "start" | "middle" | "end" = "middle") =>
  `<text x="${f1(x)}" y="${f1(y)}" font-size="${size}" font-weight="700" text-anchor="${anchor}" fill="${color}" stroke="#fff" stroke-width="4" paint-order="stroke" font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif">${s}</text>`;
const line = (x1: number, y1: number, x2: number, y2: number, color: string = C.ink, width = 2.5, extra = "") =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${extra}/>`;
/** An arc at (x, y) from one direction to another (degrees, counter-clockwise, y up), radius r. */
const arc = (x: number, y: number, from: number, to: number, r: number, color: string) => {
  const [a, b] = [rad(from), rad(to)];
  const large = (to - from + 360) % 360 > 180 ? 1 : 0;
  return `<path d="M${f1(x + r * Math.cos(a))},${f1(y - r * Math.sin(a))} A${r},${r} 0 ${large} 0 ${f1(x + r * Math.cos(b))},${f1(y - r * Math.sin(b))}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
};
/** The directions (degrees, y up) bounding each corner at a crossing, the transversal at theta. */
const SECTOR = (theta: number): Record<Corner, [number, number]> => ({ tr: [0, theta], tl: [theta, 180], bl: [180, 180 + theta], br: [180 + theta, 360] });
const arrows = (x1: number, y: number, x2: number) => [0.42, 0.58].map((t) => `<path d="M${f1(x1 + (x2 - x1) * t - 7)},${y - 6} L${f1(x1 + (x2 - x1) * t)},${y} L${f1(x1 + (x2 - x1) * t - 7)},${y + 6}" fill="none" stroke="${C.orange}" stroke-width="2"/>`).join("");

/**
 * One or two horizontal lines crossed by a transversal at `theta`, with a label in some places (and an arc marking
 * each labelled angle in its colour). Two lines are drawn parallel, with arrows on them.
 */
export function crossingSvg(theta: number, labels: { place: Place; text: string; color?: string }[], two: boolean, w = 320, h = 230): Drawn {
  const ys = two ? { p: 75, q: 165 } : { p: h / 2, q: h / 2 };
  const cx = w / 2;
  const xAt = (y: number) => cx + (h / 2 - y) / Math.tan(rad(theta));
  const out: string[] = [];
  // The arrows go at the left end, or the right one when the transversal crosses near the left.
  const left = Math.min(xAt(ys.p), xAt(ys.q)) > 110;
  for (const k of two ? (["p", "q"] as const) : (["p"] as const)) {
    out.push(line(16, ys[k], w - 16, ys[k], C.blue, 3));
    if (two) out.push(left ? arrows(16, ys[k], 76) : arrows(w - 76, ys[k], w - 16));
  }
  // The transversal, past both lines but inside the picture.
  const reach = Math.min((h / 2 - 8) / Math.sin(rad(theta)), (w / 2 - 8) / Math.abs(Math.cos(rad(theta)) || 1));
  const [dx, dy] = [Math.cos(rad(theta)) * reach, Math.sin(rad(theta)) * reach];
  out.push(line(cx - dx, h / 2 + dy, cx + dx, h / 2 - dy, C.ink, 3));
  for (const l of labels) {
    const y = ys[l.place.at];
    const x = xAt(y);
    const [a, b] = SECTOR(theta)[l.place.c];
    const color = l.color ?? C.purple;
    const span = b - a;
    out.push(arc(x, y, a, b, span < 50 ? 30 : 20, color));
    const mid = rad((a + b) / 2);
    const k = span < 50 ? 50 : 38;
    if (l.text.length <= 4) {
      out.push(text(x + k * Math.cos(mid), y - k * Math.sin(mid) + 5, l.text, color));
      continue;
    }
    // A long label (an expression in x) is written level, just above or below the line, starting past where the
    // transversal is at that height, so it crosses neither.
    const above = l.place.c[0] === "t";
    const dx = (above ? 24 : -24) / Math.tan(rad(theta));
    const right = l.place.c[1] === "r";
    out.push(text(right ? x + Math.max(0, dx) + 22 : x + Math.min(0, dx) - 22, y + (above ? -24 : 24) + 5, l.text, color, 15, right ? "start" : "end"));
  }
  return { body: out.join(""), w, h };
}

/** A right angle split in two by a ray at `a` degrees, one part labelled `first`, the other `second`. */
export function rightSplitSvg(a: number, first: string, second: string, w = 320, h = 230): Drawn {
  const [ox, oy, L] = [90, 190, 170];
  const out = [
    line(ox, oy, ox + L, oy, C.blue, 3), line(ox, oy, ox, oy - L, C.blue, 3), line(ox, oy, ox + L * Math.cos(rad(a)), oy - L * Math.sin(rad(a)), C.ink, 3),
    `<path d="M${ox + 14},${oy} V${oy - 14} H${ox}" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`,
    arc(ox, oy, 0, a, 46, C.purple), arc(ox, oy, a, 90, 62, C.green),
    text(ox + 78 * Math.cos(rad(a / 2)), oy - 78 * Math.sin(rad(a / 2)) + 5, first, C.purple),
    text(ox + 92 * Math.cos(rad((a + 90) / 2)), oy - 92 * Math.sin(rad((a + 90) / 2)) + 5, second, C.green),
  ];
  return { body: out.join(""), w, h };
}

/**
 * A triangle on a base line carried on past its right corner: angles A (left) and B (top) labelled inside, the
 * exterior angle at the right corner labelled outside.
 */
export function exteriorSvg(A: number, B: number, labels: { a: string; b: string; ext: string; c?: string }, w = 340, h = 230): Drawn {
  const Cc = 180 - A - B;
  // The base from (40, 190) along the line, the top corner from the law of sines; shrunk to fit if it is tall.
  const base = 190;
  const side = (base * Math.sin(rad(Cc))) / Math.sin(rad(B));
  const [x0, y0] = [40, 190];
  const top = [x0 + side * Math.cos(rad(A)), y0 - side * Math.sin(rad(A))];
  const k = Math.min(1, 150 / (y0 - top[1]));
  const T = [x0 + (top[0] - x0) * k, y0 - (y0 - top[1]) * k];
  const R = [x0 + base * k, y0];
  const out = [
    line(14, y0, w - 14, y0, C.blue, 3),
    `<polygon points="${f1(x0)},${y0} ${f1(R[0])},${y0} ${f1(T[0])},${f1(T[1])}" fill="#e7f5ff" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/>`,
    arc(x0, y0, 0, A, 26, C.purple),
    text(x0 + 44 * Math.cos(rad(A / 2)), y0 - 44 * Math.sin(rad(A / 2)) + 5, labels.a, C.purple),
  ];
  // At the top, between the two sides going down.
  const toL = (Math.atan2(T[1] - y0, x0 - T[0]) * 180) / Math.PI;
  const toR = (Math.atan2(T[1] - y0, R[0] - T[0]) * 180) / Math.PI;
  // Counter-clockwise from the side going down-left to the side going down-right: the angle inside.
  const [d1, d2] = [((toL % 360) + 360) % 360, ((toR % 360) + 360) % 360];
  out.push(arc(T[0], T[1], d1, d2, 22, C.green));
  const midT = rad((d1 + d2) / 2);
  out.push(text(T[0] + 42 * Math.cos(midT), T[1] - 42 * Math.sin(midT) + 5, labels.b, C.green));
  // The exterior angle: from the base carried on (0°) round to the side going up to the top.
  const up = (Math.atan2(y0 - T[1], T[0] - R[0]) * 180) / Math.PI;
  out.push(arc(R[0], y0, 0, up, 26, C.orange));
  out.push(text(R[0] + 48 * Math.cos(rad(up / 2)), y0 - 48 * Math.sin(rad(up / 2)) + 5, labels.ext, C.orange));
  if (labels.c) {
    out.push(arc(R[0], y0, up, 180, 20, C.grey));
    out.push(text(R[0] + 38 * Math.cos(rad((up + 180) / 2)), y0 - 38 * Math.sin(rad((up + 180) / 2)) + 5, labels.c, C.grey));
  }
  return { body: out.join(""), w, h };
}

/**
 * Two parallel lines and a bent line between them, its corner at the middle: the top part meets the top line at `a`
 * degrees, the bottom part meets the bottom line at `b`. The bend is a + b, which a dashed parallel through the
 * corner shows (drawn when `through` is set).
 */
export function bendSvg(a: number, b: number, labels: { a: string; b: string; bend: string }, through = false, w = 340, h = 230): Drawn {
  const [yt, yb, px] = [50, 190, 250];
  const py = (yt + yb) / 2;
  const tx = px - (py - yt) / Math.tan(rad(a));
  const bx = px - (yb - py) / Math.tan(rad(b));
  const out = [
    line(16, yt, w - 16, yt, C.blue, 3), arrows(24, yt, 104),
    line(16, yb, w - 16, yb, C.blue, 3), arrows(24, yb, 104),
    line(tx, yt, px, py, C.ink, 3), line(bx, yb, px, py, C.ink, 3),
    arc(tx, yt, -a, 0, 30, C.purple), text(tx + 54 * Math.cos(rad(a / 2)), yt + 54 * Math.sin(rad(a / 2)) + 5, labels.a, C.purple),
    arc(bx, yb, 0, b, 30, C.green), text(bx + 54 * Math.cos(rad(b / 2)), yb - 54 * Math.sin(rad(b / 2)) + 5, labels.b, C.green),
    // The bend, on its left: from the part going up-left round to the part going down-left.
    arc(px, py, 180 - a, 180 + b, 26, C.orange), text(px - 52 * Math.cos(rad((b - a) / 2)), py + 52 * Math.sin(rad((b - a) / 2)) + 5, labels.bend, C.orange),
  ];
  if (through) out.push(line(px - 90, py, px + 70, py, C.grey, 2, ` stroke-dasharray="6 6"`));
  return { body: out.join(""), w, h };
}

/** The parallel-lines piece: the transversal's slope, the angle tapped (place index), or the triangle's top corner. */
export type LiveParallelLab = { view: "lines" | "triangle"; theta: number; pick: number | null; apex: number };
export const LAB_THETA: readonly [number, number] = [20, 160];
/** Where the triangle's top corner may slide along the top line, in the piece's own drawing. */
export const LAB_APEX: readonly [number, number] = [150, 490];
export const PARALLEL_LAB_START: LiveParallelLab = { view: "lines", theta: 60, pick: null, apex: 260 };
/** The eight places, top crossing first, in the order tl, tr, bl, br. */
export const LAB_PLACES: Place[] = (["p", "q"] as const).flatMap((at) => (["tl", "tr", "bl", "br"] as const).map((c) => ({ at, c })));
export const clampLabTheta = (t: number) => Math.max(LAB_THETA[0], Math.min(LAB_THETA[1], Math.round(t)));
export const clampApex = (x: number) => Math.max(LAB_APEX[0], Math.min(LAB_APEX[1], Math.round(x)));
