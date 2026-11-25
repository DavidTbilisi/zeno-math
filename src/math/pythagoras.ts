// Pictures for Pythagoras' theorem: a right triangle with its sides labelled, turned any way; a box with the
// diagonal through it; a ladder against a wall; an isosceles triangle with its height. Each is a body of SVG to place.
import { C } from "./chart";
import { polySvg, turn, type Drawn } from "./shapeKinds";

const f1 = (v: number) => Math.round(v * 10) / 10;
const text = (x: number, y: number, s: string, color: string = C.ink, anchor = "middle") =>
  `<text x="${f1(x)}" y="${f1(y)}" font-size="16" font-weight="700" text-anchor="${anchor}" fill="${color}" stroke="#fff" stroke-width="4" paint-order="stroke" font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif">${s}</text>`;
const line = (x1: number, y1: number, x2: number, y2: number, color: string = C.ink, width = 2.5, extra = "") =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${extra}/>`;
const square = (x: number, y: number, sx: number, sy: number) => `<path d="M${f1(x + sx)},${f1(y)} L${f1(x + sx)},${f1(y + sy)} L${f1(x)},${f1(y + sy)}" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`;

/** A right triangle with legs a (along) and b (up), the right angle marked, turned by `tilt` degrees; labels for the
 * two legs and the hypotenuse. */
export function rightSvg(a: number, b: number, labels: [string, string, string], tilt = 0): Drawn {
  return polySvg(turn([[0, 0], [a, 0], [a, b]], tilt), { w: 280, h: 190, marked: true, sideLabels: labels });
}

/** A box l × w × h drawn in oblique view, its edges labelled and the diagonal from a bottom corner to the opposite top
 * one dashed in orange, the floor's diagonal dotted. */
export function boxSvg(l: number, wd: number, h: number, labels: [string, string, string], floor = true): Drawn {
  const k = Math.min(170 / (l + wd * 0.5), 140 / (h + wd * 0.4));
  const [L, D, Hh] = [l * k, wd * k * 0.5, h * k];
  const [x0, y0] = [40, 30 + D * 0.8 + Hh];
  const dx = D, dy = -D * 0.8;
  const P = { a: [x0, y0], b: [x0 + L, y0], c: [x0 + L + dx, y0 + dy], d: [x0 + dx, y0 + dy] };
  const up = (p: number[]) => [p[0], p[1] - Hh];
  const out: string[] = [];
  // Hidden edges first, dashed.
  out.push(line(P.d[0], P.d[1], P.a[0], P.a[1], C.grey, 1.5, ` stroke-dasharray="4 4"`), line(P.d[0], P.d[1], P.c[0], P.c[1], C.grey, 1.5, ` stroke-dasharray="4 4"`), line(P.d[0], P.d[1], up(P.d)[0], up(P.d)[1], C.grey, 1.5, ` stroke-dasharray="4 4"`));
  if (floor) out.push(line(P.a[0], P.a[1], P.c[0], P.c[1], C.green, 2.5, ` stroke-dasharray="2 5"`));
  out.push(line(P.a[0], P.a[1], up(P.c)[0], up(P.c)[1], C.orange, 3, ` stroke-dasharray="8 5"`));
  for (const [p, q] of [[P.a, P.b], [P.b, P.c], [up(P.a), up(P.b)], [up(P.b), up(P.c)], [up(P.c), up(P.d)], [up(P.d), up(P.a)], [P.a, up(P.a)], [P.b, up(P.b)], [P.c, up(P.c)]] as const)
    out.push(line(p[0], p[1], q[0], q[1], C.blue, 2.5));
  out.push(text((P.a[0] + P.b[0]) / 2, P.a[1] + 22, labels[0]), text((P.b[0] + P.c[0]) / 2 + 10, (P.b[1] + P.c[1]) / 2 + 14, labels[1], C.ink, "start"), text(P.c[0] + 8, P.c[1] - Hh / 2 + 5, labels[2], C.ink, "start"));
  return { body: out.join(""), w: f1(P.c[0] + 70), h: f1(y0 + 34) };
}

/** A ladder leaning on a wall: the wall on the right, the ground, the ladder from its foot `foot` out to `up` high. */
export function ladderSvg(len: number, foot: number, labels: { ladder: string; foot: string; up: string }): Drawn {
  const upH = Math.sqrt(Math.max(len * len - foot * foot, 0.01));
  const k = Math.min(200 / foot, 170 / upH, 30);
  const [wx, gy] = [250, 200];
  const [fx, ty] = [wx - foot * k, gy - upH * k];
  const out = [
    `<rect x="${wx}" y="${f1(ty - 20)}" width="18" height="${f1(gy - ty + 20)}" fill="#e9ecef" stroke="${C.grey}"/>`,
    line(fx - 30, gy, wx + 18, gy, C.ink, 2.5),
    square(wx, gy, -14, -14),
    line(fx, gy, wx, ty, "#8d5524", 6), line(fx, gy, wx, ty, "#d9a066", 3),
    text((fx + wx) / 2 - 14, (gy + ty) / 2 - 6, labels.ladder, C.ink, "end"),
    text((fx + wx) / 2, gy + 22, labels.foot),
    text(wx + 26, (gy + ty) / 2 + 5, labels.up, C.orange, "start"),
  ];
  return { body: out.join(""), w: 320, h: 230 };
}

/** An isosceles triangle with two sides `side` and a base `base`, its height dashed down the middle. */
export function isoSvg(side: number, base: number, labels: { side: string; base: string; height: string }): Drawn {
  const ht = Math.sqrt(side * side - (base / 2) ** 2);
  const k = Math.min(240 / base, 160 / ht);
  const [x0, y0] = [40, 190];
  const [B, T] = [base * k, ht * k];
  const top = [x0 + B / 2, y0 - T];
  const out = [
    `<polygon points="${x0},${y0} ${f1(x0 + B)},${y0} ${f1(top[0])},${f1(top[1])}" fill="#e7f5ff" stroke="${C.blue}" stroke-width="2.5" stroke-linejoin="round"/>`,
    line(top[0], top[1], top[0], y0, C.orange, 2.5, ` stroke-dasharray="7 5"`),
    square(top[0], y0, 12, -12),
    text(x0 + B / 4 - 10, y0 - T / 2, labels.side, C.ink, "end"),
    text(x0 + (3 * B) / 4 + 10, y0 - T / 2, labels.side, C.ink, "start"),
    text(top[0], y0 + 22, labels.base),
    text(top[0] + 8, y0 - T / 3, labels.height, C.orange, "start"),
  ];
  return { body: out.join(""), w: f1(x0 * 2 + B), h: 220 };
}
