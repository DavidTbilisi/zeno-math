// A 2×2 matrix as a linear transformation of the plane, rendered to SVG:
// the grid bends, the unit square becomes a parallelogram of area |det|,
// î and ĵ land on the matrix columns, and an "F" shows orientation (flips when det < 0).
import type { RenderedSvg } from "./latex";

export type TransformSpec = {
  type: "transform";
  m: [number, number, number, number]; // [a, b, c, d] = ((a b) (c d))
  t: number; // 0 = identity, 1 = full transformation
  grid: boolean;
  shape: boolean;
};

export const DEFAULT_TRANSFORM: TransformSpec = { type: "transform", m: [2, 1, 1, 2], t: 1, grid: true, shape: true };

export const TRANSFORM_PRESETS: { key: string; m: TransformSpec["m"] }[] = [
  { key: "identity", m: [1, 0, 0, 1] },
  { key: "scale", m: [2, 0, 0, 2] },
  { key: "stretch", m: [2, 0, 0, 1] },
  { key: "rotate90", m: [0, -1, 1, 0] },
  { key: "rotate45", m: [0.71, -0.71, 0.71, 0.71] },
  { key: "shear", m: [1, 1, 0, 1] },
  { key: "reflect", m: [1, 0, 0, -1] },
  { key: "project", m: [1, 0, 0, 0] },
];

const S = 460; // plot size
const PAD = 16;
const HEAD = 70; // room for the matrix + det caption on top

const r2 = (v: number) => Math.round(v * 100) / 100;
const fmt = (v: number) => String(r2(v)).replace("-", "−");
/** Formatted, parenthesized when negative (for products). */
const fp = (v: number) => (r2(v) < 0 ? `(${fmt(v)})` : fmt(v));

export function transformToSvg(spec: TransformSpec): RenderedSvg {
  const [a0, b0, c0, d0] = spec.m;
  const t = Math.min(1, Math.max(0, spec.t));
  // Interpolate from the identity so the slider "animates" the transformation.
  const a = 1 + (a0 - 1) * t, b = b0 * t, c = c0 * t, d = 1 + (d0 - 1) * t;
  const apply = (x: number, y: number): [number, number] => [a * x + b * y, c * x + d * y];
  const det = a * d - b * c;

  // View range: fit the transformed unit square and basis vectors, at least ±3.
  const reach = Math.max(3, ...[a, b, c, d, a + b, c + d].map((v) => Math.abs(v) + 1));
  const R = Math.min(10, Math.ceil(reach));
  const px = (x: number) => PAD + ((x + R) / (2 * R)) * S;
  const py = (y: number) => HEAD + PAD + ((R - y) / (2 * R)) * S;
  const P = (p: [number, number]) => `${r2(px(p[0]))},${r2(py(p[1]))}`;

  const out: string[] = [];
  out.push(`<rect x="${PAD}" y="${HEAD + PAD}" width="${S}" height="${S}" fill="#ffffff" stroke="#dee2e6"/>`);
  out.push(`<clipPath id="v"><rect x="${PAD}" y="${HEAD + PAD}" width="${S}" height="${S}"/></clipPath><g clip-path="url(#v)">`);

  // Original grid (faint) and axes.
  for (let k = -R; k <= R; k++) {
    out.push(`<line x1="${px(k)}" y1="${py(-R)}" x2="${px(k)}" y2="${py(R)}" stroke="#f1f3f5"/>`);
    out.push(`<line x1="${px(-R)}" y1="${py(k)}" x2="${px(R)}" y2="${py(k)}" stroke="#f1f3f5"/>`);
  }
  out.push(`<line x1="${px(-R)}" y1="${py(0)}" x2="${px(R)}" y2="${py(0)}" stroke="#adb5bd" stroke-width="1.2"/>`);
  out.push(`<line x1="${px(0)}" y1="${py(-R)}" x2="${px(0)}" y2="${py(R)}" stroke="#adb5bd" stroke-width="1.2"/>`);

  // Transformed grid.
  if (spec.grid) {
    const L = R * 3;
    const seg = (p: [number, number], q: [number, number]) =>
      `<line x1="${r2(px(p[0]))}" y1="${r2(py(p[1]))}" x2="${r2(px(q[0]))}" y2="${r2(py(q[1]))}" stroke="#a5d8ff" stroke-width="1"/>`;
    for (let k = -L; k <= L; k++) out.push(seg(apply(k, -L), apply(k, L)), seg(apply(-L, k), apply(L, k)));
  }

  // Unit square → parallelogram (area = |det|).
  out.push(
    `<polygon points="${P([0, 0])} ${P(apply(1, 0))} ${P(apply(1, 1))} ${P(apply(0, 1))}" fill="#ffd8a8" fill-opacity="0.75" stroke="#e8590c" stroke-width="2"/>`,
  );
  const [cx, cy] = apply(0.5, 0.5);
  out.push(
    `<text x="${r2(px(cx))}" y="${r2(py(cy) + 5)}" text-anchor="middle" font-size="14" font-weight="600" fill="#1e1e1e">${Math.abs(det) < 1e-9 ? "0" : fmt(Math.abs(det))}</text>`,
  );

  // Orientation marker: an "F" (mirror-image when det < 0).
  if (spec.shape) {
    const F: [number, number][] = [[-2.6, -2.6], [-2.6, -0.6], [-1.4, -0.6], [-1.4, -1], [-2.2, -1], [-2.2, -1.4], [-1.6, -1.4], [-1.6, -1.8], [-2.2, -1.8], [-2.2, -2.6]];
    out.push(`<polygon points="${F.map((p) => P(p)).join(" ")}" fill="none" stroke="#868e96" stroke-width="1.5" stroke-dasharray="4 3"/>`);
    out.push(`<polygon points="${F.map((p) => P(apply(p[0], p[1]))).join(" ")}" fill="#eebefa" fill-opacity="0.8" stroke="#9c36b5" stroke-width="2"/>`);
  }

  // Basis vectors î → (a, c), ĵ → (b, d).
  out.push(
    `<defs><marker id="ag" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#2f9e44"/></marker>` +
      `<marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#e03131"/></marker></defs>`,
  );
  const arrow = (to: [number, number], color: string, marker: string) =>
    `<line x1="${px(0)}" y1="${py(0)}" x2="${r2(px(to[0]))}" y2="${r2(py(to[1]))}" stroke="${color}" stroke-width="3" marker-end="url(#${marker})"/>`;
  out.push(arrow(apply(1, 0), "#2f9e44", "ag"), arrow(apply(0, 1), "#e03131", "ar"));
  out.push("</g>");

  // Header: the matrix (columns colored like the basis vectors) and its determinant.
  const mx = PAD + 34;
  const cell = (x: number, y: number, v: number, color: string) =>
    `<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-weight="600">${fmt(v)}</text>`;
  out.push(
    `<g font-family="Segoe UI, Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif" font-size="18">` +
      `<text x="${PAD}" y="${PAD + 30}" font-style="italic" font-weight="600" fill="#1e1e1e">M =</text>` +
      `<path d="M${mx + 8},${PAD + 4} q-8,0 -8,8 v36 q0,8 8,8" fill="none" stroke="#1e1e1e" stroke-width="1.6"/>` +
      cell(mx + 26, PAD + 22, a, "#2f9e44") + cell(mx + 26, PAD + 46, c, "#2f9e44") +
      cell(mx + 70, PAD + 22, b, "#e03131") + cell(mx + 70, PAD + 46, d, "#e03131") +
      `<path d="M${mx + 88},${PAD + 4} q8,0 8,8 v36 q0,8 -8,8" fill="none" stroke="#1e1e1e" stroke-width="1.6"/>` +
      `<text x="${mx + 118}" y="${PAD + 36}" fill="#1e1e1e">det M = ${fp(a)}·${fp(d)} − ${fp(b)}·${fp(c)} = <tspan font-weight="700" fill="#e8590c">${fmt(det)}</tspan></text>` +
      `</g>`,
  );

  const W = S + 2 * PAD;
  const H = HEAD + S + 2 * PAD;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join("")}</svg>`,
    width: W,
    height: H,
  };
}
