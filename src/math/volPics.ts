// The pictures for the volume and surface-area questions #711 added: solids of unit cubes (or boxes with their edges
// labelled) drawn in isometric view, and nets: a box's, a triangular prism's, a square pyramid's and a triangular
// pyramid's, with lengths written on them. Plain SVG strings.
import { C, FONT, r2 } from "./chart";
import type { Part } from "./practiceTypes";

type Pic = NonNullable<Part["pic"]>;
type P3 = [number, number, number];
const r1 = (v: number) => Math.round(v * 10) / 10;
const COS = Math.cos(Math.PI / 6);

/** Points in any coordinates, framed with a margin when done. */
class Sketch {
  out: string[] = [];
  xs: number[] = [];
  ys: number[] = [];
  see(x: number, y: number) {
    this.xs.push(x);
    this.ys.push(y);
  }
  poly(pts: [number, number][], fill: string, stroke: string = C.ink, width = 1.6) {
    pts.forEach((p) => this.see(...p));
    this.out.push(`<polygon points="${pts.map((p) => `${r1(p[0])},${r1(p[1])}`).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`);
  }
  line(a: [number, number], b: [number, number], color: string, width = 1, dash = "") {
    this.out.push(`<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
  }
  text(p: [number, number], s: string, color: string = C.ink, size = 14, anchor = "middle") {
    const half = (s.length * size) / 3.6;
    const left = anchor === "start" ? 0 : anchor === "end" ? 2 * half : half;
    this.see(p[0] - left, p[1] - size);
    this.see(p[0] - left + 2 * half, p[1] + 4);
    this.out.push(`<text x="${r1(p[0])}" y="${r1(p[1])}" font-size="${size}" font-weight="700" text-anchor="${anchor}" fill="${color}" paint-order="stroke" stroke="#ffffff" stroke-width="3" stroke-linejoin="round">${s}</text>`);
  }
  done(m = 12): Pic {
    const [x0, x1, y0, y1] = [Math.min(...this.xs) - m, Math.max(...this.xs) + m, Math.min(...this.ys) - m, Math.max(...this.ys) + m];
    const body = this.out.join("");
    return { svg: (x, y) => `<g transform="translate(${r2(x - x0)} ${r2(y - y0)})" ${FONT}>${body}</g>`, w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) };
  }
}

export type Box = { at: P3; size: P3 };
const FACE = { top: "#d0ebff", x: "#a5d8ff", y: "#74c0fc" };

/**
 * Boxes in isometric view, x to the right and down, y to the left and down, z up; `grid` draws the unit cubes on the
 * faces that show. `labels` write a length beside an edge, from one corner to another, on the side of it that is
 * outside the solid: below left, below right, left, right or above right.
 */
export type Label = { a: P3; b: P3; text: string; side: "bl" | "br" | "l" | "r" | "tr" };
const SIDE: Record<Label["side"], [number, number, string]> = { bl: [-6, 17, "end"], br: [6, 17, "start"], l: [-8, 5, "end"], r: [8, 5, "start"], tr: [8, -6, "start"] };
export function isoBoxes(boxes: Box[], o: { s?: number; grid?: boolean; labels?: Label[]; names?: { at: P3; text: string; color: string }[] } = {}): Pic {
  const s = o.s ?? 26;
  const P = ([x, y, z]: P3): [number, number] => [(x - y) * COS * s, (x + y) * 0.5 * s - z * s];
  const k = new Sketch();
  // Back to front: further boxes (smaller x + y, lower) first.
  const order = [...boxes].sort((a, b) => a.at[0] + a.at[1] + a.at[2] - (b.at[0] + b.at[1] + b.at[2]));
  for (const { at: [x, y, z], size: [l, w, h] } of order) {
    const [X, Y, Z] = [x + l, y + w, z + h];
    const faces: [P3[], string, (t: number) => [P3, P3], number][] = [
      [[[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]], FACE.top, (t) => [[x + t, y, Z], [x + t, Y, Z]], l],
      [[[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]], FACE.x, (t) => [[X, y + t, z], [X, y + t, Z]], w],
      [[[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]], FACE.y, (t) => [[x + t, Y, z], [x + t, Y, Z]], l],
    ];
    for (const [pts, fill] of faces) k.poly(pts.map(P), fill);
    if (o.grid) {
      const lines: [P3, P3][] = [];
      for (let t = 1; t < l; t++) lines.push([[x + t, y, Z], [x + t, Y, Z]], [[x + t, Y, z], [x + t, Y, Z]]);
      for (let t = 1; t < w; t++) lines.push([[x, y + t, Z], [X, y + t, Z]], [[X, y + t, z], [X, y + t, Z]]);
      for (let t = 1; t < h; t++) lines.push([[X, y, z + t], [X, Y, z + t]], [[x, Y, z + t], [X, Y, z + t]]);
      for (const [a, b] of lines) k.line(P(a), P(b), C.ink, 1);
    }
  }
  for (const lb of o.labels ?? []) {
    const [a, b] = [P(lb.a), P(lb.b)];
    const [dx, dy, anchor] = SIDE[lb.side];
    k.text([(a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy], lb.text, C.ink, 14, anchor);
  }
  for (const n of o.names ?? []) k.text(P(n.at), n.text, n.color, 18);
  return k.done();
}

/** A box l × w × h, its three edges labelled. */
export function boxPic(size: P3, labels: [string, string, string], s?: number): Pic {
  const [l, w, h] = size;
  return isoBoxes([{ at: [0, 0, 0], size }], {
    s: s ?? Math.min(26, 150 / Math.max(l + w, h * 1.6)),
    labels: [
      { a: [0, w, 0], b: [l, w, 0], text: labels[0], side: "bl" },
      { a: [l, 0, 0], b: [l, w, 0], text: labels[1], side: "br" },
      { a: [0, w, 0], b: [0, w, h], text: labels[2], side: "l" },
    ],
  });
}

/** Two solids of unit cubes side by side, A and B. */
export function twoStacks(a: P3, b: P3): Pic {
  const gap = a[0] + 3;
  return isoBoxes(
    [{ at: [0, 0, 0], size: a }, { at: [gap, 0, 0], size: b }],
    { s: 20, grid: true, names: [{ at: [a[0] / 2, a[1] / 2, a[2] + 1.4], text: "A", color: C.blue }, { at: [gap + b[0] / 2, b[1] / 2, b[2] + 1.4], text: "B", color: C.orange }] },
  );
}

/**
 * A step-shaped solid: a box a1 × w × h1 with a box a2 × w × h2 beside it (h2 < h1). Of unit cubes (`grid`), or with
 * its edges labelled.
 */
export function stepSolid(a1: number, a2: number, w: number, h1: number, h2: number, grid: boolean, unit = ""): Pic {
  const u = (v: number) => (unit ? `${v} ${unit}` : String(v));
  const s = Math.min(grid ? 22 : 26, 220 / (a1 + a2 + w));
  return isoBoxes([{ at: [0, 0, 0], size: [a1, w, h1] }, { at: [a1, 0, 0], size: [a2, w, h2] }], {
    s,
    grid,
    labels: grid
      ? []
      : [
          { a: [0, 0, h1], b: [a1, 0, h1], text: u(a1), side: "tr" },
          { a: [a1, w, 0], b: [a1 + a2, w, 0], text: u(a2), side: "bl" },
          { a: [a1 + a2, 0, 0], b: [a1 + a2, w, 0], text: u(w), side: "br" },
          { a: [0, w, 0], b: [0, w, h1], text: u(h1), side: "l" },
          { a: [a1 + a2, 0, 0], b: [a1 + a2, 0, h2], text: u(h2), side: "r" },
        ],
  });
}

export type NetKind = "cuboid" | "cube" | "triPrism" | "sqPyramid" | "triPyramid";
/**
 * A net on the page. A box's: the four sides in a row with the top and the bottom on the second; labels l, w, h on
 * three edges. A triangular prism's: three rectangles in a row with a triangle on each end of the middle one. A
 * square pyramid's: a square with a triangle on each side. A triangular pyramid's: a triangle with a triangle on each
 * side. Lengths only where the question needs them.
 */
export function netPic(kind: NetKind, dims: number[], labels: string[] = []): Pic {
  const k = new Sketch();
  const S = kind === "cuboid" ? Math.min(26, 260 / (2 * dims[0] + 2 * dims[1]), 220 / (2 * dims[1] + dims[2])) : kind === "cube" ? Math.min(26, 220 / (4 * dims[0])) : 34;
  const rect = (x: number, y: number, w: number, h: number, fill = "#d0ebff") => k.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, C.blue, 2);
  const tri = (pts: [number, number][]) => k.poly(pts, "#fff3bf", C.blue, 2);
  if (kind === "cuboid" || kind === "cube") {
    const [l, w, h] = kind === "cube" ? [dims[0], dims[0], dims[0]] : dims;
    // Row: w, l, w, l wide, h tall; top and bottom (l × w) above and below the second.
    const xs = [0, w, w + l, 2 * w + l];
    [w, l, w, l].forEach((d, i) => rect(xs[i] * S, w * S, d * S, h * S, i % 2 ? "#d0ebff" : "#e7f5ff"));
    rect(w * S, 0, l * S, w * S, "#a5d8ff");
    rect(w * S, (w + h) * S, l * S, w * S, "#a5d8ff");
    if (labels.length) {
      k.text([(w + l / 2) * S, (2 * w + h) * S + 18], labels[0]);
      k.text([(w + l) * S + 8, (w + h + w / 2) * S + 5], labels[1], C.ink, 14, "start");
      k.text([-8, (w + h / 2) * S + 5], labels[2], C.ink, 14, "end");
    }
    return k.done();
  }
  if (kind === "triPrism") {
    // A right triangle with legs a and b and slope c; the prism L long. Three strips a, c and b tall; a triangle on
    // each end of the c strip, its right angle away from the strip.
    const [a, b, c, L] = dims;
    const s = Math.min(30, 260 / (a + b + c));
    const ys = [0, a, a + c, a + c + b].map((v) => v * s);
    [a, c, b].forEach((d, i) => rect(0, ys[i], L * s, d * s, i === 1 ? "#d0ebff" : "#e7f5ff"));
    const [along, off] = [((a * a) / c) * s, ((a * b) / c) * s];
    tri([[0, ys[1]], [0, ys[2]], [-off, ys[1] + along]]);
    tri([[L * s, ys[1]], [L * s, ys[2]], [L * s + off, ys[1] + along]]);
    if (labels.length) {
      k.text([(L * s) / 2, ys[3] + 18], labels[0]);
      k.text([-6, ys[0] + (a * s) / 2 + 5], labels[1], C.ink, 14, "end");
      k.text([-6, ys[2] + (b * s) / 2 + 5], labels[2], C.ink, 14, "end");
      k.text([(L * s) / 2, (ys[1] + ys[2]) / 2 + 5], labels[3]);
    }
    return k.done();
  }
  if (kind === "sqPyramid") {
    const a = 3 * S;
    const t = 2.4 * S;
    rect(0, 0, a, a);
    tri([[0, 0], [a, 0], [a / 2, -t]]);
    tri([[a, 0], [a, a], [a + t, a / 2]]);
    tri([[0, a], [a, a], [a / 2, a + t]]);
    tri([[0, 0], [0, a], [-t, a / 2]]);
    return k.done();
  }
  // A triangular pyramid: an equilateral triangle with one on each side.
  const a = 3.4 * S;
  const H = (a * Math.sqrt(3)) / 2;
  tri([[0, 0], [a, 0], [a / 2, -H]]);
  tri([[0, 0], [a, 0], [a / 2, H]]);
  tri([[0, 0], [a / 2, -H], [-a / 2, -H]]);
  tri([[a, 0], [a / 2, -H], [(3 * a) / 2, -H]]);
  return k.done();
}
