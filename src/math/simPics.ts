// The pictures for the similarity and scale questions #714 added: shapes on squared paper to compare as scale copies,
// and a figure of named points (triangles, a line inside one, an altitude, a bisector, a pole and its shadow) with its
// sides and angles labelled. Plain SVG; drawn to scale only as far as the question needs.
import { C, FONT, r2 } from "./chart";
import type { Part } from "./practiceTypes";

type Pic = NonNullable<Part["pic"]>;
export type P2 = [number, number];
const FILL = "#e7f5ff";
const FILL2 = "#fff4e6";
const text = (x: number, y: number, s: string, anchor = "middle", color: string = C.ink, size = 15) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}">${s}</text>`;
const round = (v: number) => Math.round(v * 100) / 100;
const pic = (body: string, w: number, h: number): Pic => ({ svg: (x, y) => `<g transform="translate(${r2(x)} ${r2(y)})" ${FONT}>${body}</g>`, w: round(w), h: round(h) });

/** Shapes on squared paper side by side, each under its name: the first blue, the rest orange. */
export function gridShapes(shapes: { pts: P2[]; name: string }[], cell = 16): Pic {
  const out: string[] = [];
  const tall = Math.max(...shapes.map((s) => Math.max(...s.pts.map((p) => p[1]))));
  let x = 12;
  for (const [i, s] of shapes.entries()) {
    const w = Math.max(...s.pts.map((p) => p[0]));
    const [gw, gh] = [w + 2, tall + 2];
    const top = 26;
    for (let c = 0; c <= gw; c++) out.push(`<line x1="${r2(x + c * cell)}" y1="${top}" x2="${r2(x + c * cell)}" y2="${r2(top + gh * cell)}" stroke="#dee2e6" stroke-width="1"/>`);
    for (let r = 0; r <= gh; r++) out.push(`<line x1="${r2(x)}" y1="${r2(top + r * cell)}" x2="${r2(x + gw * cell)}" y2="${r2(top + r * cell)}" stroke="#dee2e6" stroke-width="1"/>`);
    const pts = s.pts.map(([a, b]) => `${r2(x + (a + 1) * cell)},${r2(top + (gh - 1 - b) * cell)}`).join(" ");
    out.push(`<polygon points="${pts}" fill="${i ? FILL2 : FILL}" stroke="${i ? C.orange : C.blue}" stroke-width="2"/>`);
    out.push(text(x + (gw * cell) / 2, 18, s.name, "middle", i ? C.orange : C.blue, 16));
    x += gw * cell + 22;
  }
  return pic(out.join(""), x - 10, 26 + (tall + 2) * cell + 6);
}

export type Figure = {
  /** The named points, in plain coordinates (y up). */
  pts: Record<string, P2>;
  /** Filled shapes, by their corners' names; the first blue, the rest orange. */
  polys?: string[][];
  /** Lines between named points; dashed when asked. */
  segs?: { a: string; b: string; dash?: boolean; color?: string }[];
  /** Labels at the middle of a side, pushed away from the shape the side belongs to. */
  sides?: { a: string; b: string; text: string; color?: string; inside?: boolean }[];
  /** Labels in the corner at a point, between two others. */
  angles?: { at: string; from: string; to: string; text: string; color?: string }[];
  /** A right-angle mark at a point, between two others. */
  rights?: { at: string; from: string; to: string }[];
  /** Points not to name (helpers such as a shadow's tip). */
  hide?: string[];
  /** Words under a point, such as "pole" or "tree". */
  notes?: { at: string; text: string; dy?: number }[];
  /** Circles round a named point, of a radius in plain units (#715). */
  rings?: { at: string; r: number }[];
  /** Free labels at plain coordinates, such as an arc's measure (#715). */
  marks?: { p: P2; text: string; color?: string }[];
};

/** A figure of named points scaled to fit about `fw` × `fh` pixels. */
export function figurePic(f: Figure, fw = 300, fh = 190): Pic {
  const P = [
    ...Object.values(f.pts),
    ...(f.rings ?? []).flatMap(({ at, r }): P2[] => [[f.pts[at][0] - r, f.pts[at][1] - r], [f.pts[at][0] + r, f.pts[at][1] + r]]),
    ...(f.marks ?? []).map((m) => m.p),
  ];
  const [x0, x1] = [Math.min(...P.map((p) => p[0])), Math.max(...P.map((p) => p[0]))];
  const [y0, y1] = [Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[1]))];
  const k = Math.min(fw / Math.max(x1 - x0, 1e-9), fh / Math.max(y1 - y0, 1e-9));
  const M = 34;
  const at = (n: string): P2 => {
    const [x, y] = f.pts[n];
    return [M + (x - x0) * k, M + (y1 - y) * k];
  };
  const mid = (ns: string[]): P2 => {
    const ps = ns.map(at);
    return [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length];
  };
  const all = mid(Object.keys(f.pts));
  const away = ([x, y]: P2, [cx, cy]: P2, d: number): P2 => {
    const [dx, dy] = [x - cx, y - cy];
    const n = Math.hypot(dx, dy) || 1;
    return [x + (dx / n) * d, y + (dy / n) * d];
  };
  const out: string[] = [];
  for (const g of f.rings ?? []) {
    const [cx, cy] = at(g.at);
    out.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(g.r * k)}" fill="none" stroke="${C.ink}" stroke-width="2"/>`);
  }
  for (const [i, poly] of (f.polys ?? []).entries())
    out.push(`<polygon points="${poly.map((n) => at(n).map(r2).join(",")).join(" ")}" fill="${i ? FILL2 : FILL}" stroke="${i ? C.orange : C.ink}" stroke-width="2"/>`);
  for (const s of f.segs ?? []) {
    const [a, b] = [at(s.a), at(s.b)];
    out.push(`<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="${s.color ?? C.ink}" stroke-width="2"${s.dash ? ` stroke-dasharray="6 4"` : ""}/>`);
  }
  for (const m of f.rights ?? []) {
    const [o, a, b] = [at(m.at), at(m.from), at(m.to)];
    const u = (p: P2): P2 => {
      const n = Math.hypot(p[0] - o[0], p[1] - o[1]) || 1;
      return [((p[0] - o[0]) / n) * 11, ((p[1] - o[1]) / n) * 11];
    };
    const [ua, ub] = [u(a), u(b)];
    out.push(`<path d="M ${r2(o[0] + ua[0])} ${r2(o[1] + ua[1])} L ${r2(o[0] + ua[0] + ub[0])} ${r2(o[1] + ua[1] + ub[1])} L ${r2(o[0] + ub[0])} ${r2(o[1] + ub[1])}" fill="none" stroke="${C.ink}" stroke-width="1.2"/>`);
  }
  // A side's label goes outside the shape it belongs to (or inside, when asked).
  const owner = (a: string, b: string) => (f.polys ?? []).find((p) => p.includes(a) && p.includes(b));
  for (const s of f.sides ?? []) {
    const m = mid([s.a, s.b]);
    const poly = owner(s.a, s.b);
    const c = poly ? mid(poly) : all;
    // Along the side's normal, on the side away from the shape (or towards it, when asked).
    const [a, b] = [at(s.a), at(s.b)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    if ((m[0] - c[0]) * nx + (m[1] - c[1]) * ny < 0) [nx, ny] = [-nx, -ny];
    const d = (s.inside ? -1 : 1) * (12 + 8 * Math.abs(nx));
    out.push(text(m[0] + nx * d, m[1] + ny * d + 5, s.text, "middle", s.color ?? C.ink, 14));
  }
  for (const g of f.angles ?? []) {
    const [o, a, b] = [at(g.at), at(g.from), at(g.to)];
    const dir = (p: P2): P2 => {
      const n = Math.hypot(p[0] - o[0], p[1] - o[1]) || 1;
      return [(p[0] - o[0]) / n, (p[1] - o[1]) / n];
    };
    const [da, db] = [dir(a), dir(b)];
    const [bx, by] = [da[0] + db[0], da[1] + db[1]];
    const n = Math.hypot(bx, by) || 1;
    out.push(`<path d="M ${r2(o[0] + da[0] * 16)} ${r2(o[1] + da[1] * 16)} A 16 16 0 0 ${da[0] * db[1] - da[1] * db[0] > 0 ? 1 : 0} ${r2(o[0] + db[0] * 16)} ${r2(o[1] + db[1] * 16)}" fill="none" stroke="${g.color ?? C.red}" stroke-width="1.4"/>`);
    // Long labels (an expression in x) sit further out, clear of the sides.
    const off = 34 + 3.5 * Math.max(0, g.text.length - 4);
    out.push(text(o[0] + (bx / n) * off, o[1] + (by / n) * off + 5, g.text, "middle", g.color ?? C.red, 13));
  }
  for (const n of Object.keys(f.pts)) {
    if (f.hide?.includes(n)) continue;
    const [x, y] = away(at(n), all, 13);
    out.push(text(x, y + 5, n, "middle", C.ink, 15));
  }
  for (const m of f.marks ?? []) out.push(text(M + (m.p[0] - x0) * k, M + (y1 - m.p[1]) * k + 5, m.text, "middle", m.color ?? C.purple, 14));
  for (const t of f.notes ?? []) {
    const [x, y] = at(t.at);
    out.push(text(x, y + (t.dy ?? 20), t.text, "middle", C.grey, 13));
  }
  return pic(out.join(""), fw + 2 * M, fh + 2 * M);
}
