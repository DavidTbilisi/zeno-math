// Pictures for vector calculus (#753): a field drawn as arrows on a grid (to read divergence and curl by eye), the
// level lines of a linear f with four arrows from one point (to pick the gradient), and plane curves (to tell simple,
// closed and neither apart).
import { C, FONT, r2 } from "./chart";

export type Pic = { body: string; w: number; h: number };

const text = (x: number, y: number, s: string, size = 14, color: string = C.ink) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="middle" ${FONT} fill="${color}" font-weight="700">${s}</text>`;

/** An arrow from (x1, y1) to (x2, y2) in picture units, its head drawn as a filled triangle. */
function arrow(x1: number, y1: number, x2: number, y2: number, color: string, width = 2, head = 7): string {
  const [dx, dy] = [x2 - x1, y2 - y1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return `<circle cx="${r2(x1)}" cy="${r2(y1)}" r="2" fill="${color}"/>`;
  const [ux, uy] = [dx / len, dy / len];
  const [bx, by] = [x2 - ux * head, y2 - uy * head];
  const [px, py] = [-uy * head * 0.5, ux * head * 0.5];
  return `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(bx)}" y2="${r2(by)}" stroke="${color}" stroke-width="${width}"/>` +
    `<path d="M${r2(x2)} ${r2(y2)} L${r2(bx + px)} ${r2(by + py)} L${r2(bx - px)} ${r2(by - py)} Z" fill="${color}"/>`;
}

/** The field (P, Q) on the grid x, y ∈ {−2, …, 2}, arrows scaled so the longest is 26 units; a dot at the origin. */
export function fieldSvg(P: (x: number, y: number) => number, Q: (x: number, y: number) => number): Pic {
  const [S, M] = [44, 30];
  const X = (x: number) => M + (x + 2) * S;
  const Y = (y: number) => M + (2 - y) * S;
  const pts: [number, number][] = [];
  for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) pts.push([x, y]);
  const top = Math.max(...pts.map(([x, y]) => Math.hypot(P(x, y), Q(x, y)))) || 1;
  const out = [`<rect x="${M - 18}" y="${M - 18}" width="${4 * S + 36}" height="${4 * S + 36}" fill="none" stroke="#dee2e6" rx="8"/>`];
  out.push(`<line x1="${M - 18}" y1="${Y(0)}" x2="${M + 4 * S + 18}" y2="${Y(0)}" stroke="#ced4da"/>`, `<line x1="${X(0)}" y1="${M - 18}" x2="${X(0)}" y2="${M + 4 * S + 18}" stroke="#ced4da"/>`);
  for (const [x, y] of pts) {
    const k = 26 / top;
    const [vx, vy] = [P(x, y) * k, -Q(x, y) * k];
    out.push(arrow(X(x) - vx / 2, Y(y) - vy / 2, X(x) + vx / 2, Y(y) + vy / 2, C.blue));
  }
  out.push(`<circle cx="${X(0)}" cy="${Y(0)}" r="5" fill="${C.red}"/>`);
  return { body: out.join(""), w: 2 * M + 4 * S, h: 2 * M + 4 * S };
}

/** Level lines of f = ax + by (values marked), a point at the middle and four arrows labelled in `labels`' order along `dirs`. */
export function gradientSvg(a: number, b: number, dirs: readonly (readonly [number, number])[], labels: readonly string[]): Pic {
  const [W, c] = [260, 130];
  const n = Math.hypot(a, b);
  const [ux, uy] = [a / n, b / n];
  const out = [`<rect x="4" y="4" width="${W - 8}" height="${W - 8}" fill="none" stroke="#dee2e6" rx="8"/>`];
  for (let k = -3; k <= 3; k++) {
    // The line ax + by = const at signed distance 34k from the middle, drawn across the frame.
    const [mx, my] = [c + ux * 34 * k, c - uy * 34 * k];
    const [tx, ty] = [-uy, -ux];
    out.push(`<line x1="${r2(mx - tx * 200)}" y1="${r2(my - ty * 200)}" x2="${r2(mx + tx * 200)}" y2="${r2(my + ty * 200)}" stroke="${k === 0 ? "#adb5bd" : "#dee2e6"}" stroke-width="1.4"/>`);
  }
  out.push(`<clipPath id="gclip"><rect x="4" y="4" width="${W - 8}" height="${W - 8}" rx="8"/></clipPath>`);
  const body = [`<g clip-path="url(#gclip)">${out.slice(1).join("")}</g>`, out[0]];
  // f's value grows along (a, b): mark low and high ends.
  // Set off along the level line, clear of the arrows' labels.
  const [sx, sy] = [uy * 30, ux * 30];
  body.push(text(c - ux * 100 + sx, c + uy * 100 + sy + 5, "f −", 13, C.grey), text(c + ux * 100 + sx, c - uy * 100 + sy + 5, "f +", 13, C.grey));
  dirs.forEach(([dx, dy], i) => {
    const m = Math.hypot(dx, dy);
    const [ex, ey] = [c + (dx / m) * 70, c - (dy / m) * 70];
    body.push(arrow(c, c, ex, ey, C.orange, 2.6, 9), text(c + (dx / m) * 88, c - (dy / m) * 88 + 5, labels[i], 16, C.orange));
  });
  body.push(`<circle cx="${c}" cy="${c}" r="5" fill="${C.ink}"/>`);
  return { body: body.join(""), w: W, h: W };
}

export type CurveKind = "square" | "eight" | "arc" | "circle";

/** A plane curve: a square (corners, but simple and closed), a figure eight (closed, crosses itself), an open arc, or a circle. */
export function curveSvg(kind: CurveKind): Pic {
  const W = 220;
  let d: string;
  if (kind === "square") d = "M60 60 L160 60 L160 160 L60 160 Z";
  else if (kind === "circle") d = "M160 110 A50 50 0 1 1 60 110 A50 50 0 1 1 160 110 Z";
  else {
    const pts: string[] = [];
    const n = 80;
    for (let i = 0; i <= n; i++) {
      const t = kind === "eight" ? (2 * Math.PI * i) / n : 0.3 * Math.PI + (1.4 * Math.PI * i) / n;
      const [x, y] = kind === "eight" ? [110 + 70 * Math.sin(t), 110 + 45 * Math.sin(2 * t)] : [110 + 55 * Math.cos(t), 110 - 55 * Math.sin(t)];
      pts.push(`${r2(x)} ${r2(y)}`);
    }
    d = `M${pts.join(" L")}`;
  }
  return { body: `<rect x="4" y="4" width="${W - 8}" height="${W - 8}" fill="none" stroke="#dee2e6" rx="8"/><path d="${d}" fill="none" stroke="${C.blue}" stroke-width="3"/>`, w: W, h: W };
}

/** A picture as a question's `pic`. */
export const picOf = (p: Pic) => ({ svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${p.body}</g>`, h: p.h, w: p.w });
