// Practice: Area and perimeter from the measurements (the Area on a grid skill counts squares). A drawn rectangle or
// square with its sides marked and its perimeter or area asked; then a side found from the area or the perimeter and
// the area of a triangle; then the circumference and the area of a circle. The other measure given, two sides for
// four, the triangle's half left out and the diameter used as the radius are the slips.
import { C, fill, FONT, r2 } from "../chart";
import { dp, num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";

type Pic = NonNullable<Part["pic"]>;
const FILL = "#e7f5ff";
const text = (x: number, y: number, s: string, anchor = "middle", color = C.ink) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="15" text-anchor="${anchor}" fill="${color}">${s}</text>`;
const pic = (body: string, w: number, h: number): Pic => ({ svg: (x, y) => `<g transform="translate(${r2(x)} ${r2(y)})" ${FONT}>${body}</g>`, w, h });

/** A rectangle a wide and b high, drawn to scale (within reason), its bottom and its left side marked. */
export function rectPic(a: number, b: number, bottom: string, side: string): Pic {
  const s = Math.min(200 / a, 110 / b, 26);
  const [w, h] = [Math.max(a * s, 60), Math.max(b * s, 36)];
  const x0 = 84;
  return pic(
    `<rect x="${x0}" y="8" width="${r2(w)}" height="${r2(h)}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` + text(x0 + w / 2, h + 28, bottom) + text(x0 - 8, 8 + h / 2 + 5, side, "end"),
    x0 + w + 16, h + 38,
  );
}
/** A triangle on its base b with height h, the top over the point `foot` of the way along (0: a right angle there). */
export function trianglePic(b: number, h: number, foot: number, base: string, height: string): Pic {
  const s = Math.min(200 / b, 110 / h, 26);
  const [w, H] = [Math.max(b * s, 80), Math.max(h * s, 50)];
  const [x0, y0] = [84, 8];
  const fx = x0 + foot * w;
  const mark = `<path d="M ${r2(fx)} ${r2(y0 + H - 10)} h 10 v 10" fill="none" stroke="${C.ink}" stroke-width="1.2"/>`;
  return pic(
    `<polygon points="${x0},${r2(y0 + H)} ${r2(x0 + w)},${r2(y0 + H)} ${r2(fx)},${y0}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` +
      (foot > 0 ? `<line x1="${r2(fx)}" y1="${y0}" x2="${r2(fx)}" y2="${r2(y0 + H)}" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="5 4"/>` : "") +
      mark + text(x0 + w / 2, y0 + H + 20, base) +
      // The height's label beside its dashed line where the triangle is wide enough there, else outside on the left.
      (foot > 0 && ((1 - foot) * w) / 2 >= 54 ? text(fx + 6, y0 + H / 2 + 5, height, "start", C.red) : text(x0 - 8, y0 + H / 2 + 5, height, "end", foot > 0 ? C.red : C.ink)),
    x0 + w + 16, H + 38,
  );
}
/** A circle with its radius, or its diameter, drawn and marked. */
export function circlePic(label: string, diameter: boolean): Pic {
  const R = 58;
  const [cx, cy] = [R + 12, R + 8];
  return pic(
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${FILL}" stroke="${C.ink}" stroke-width="2"/>` +
      `<line x1="${diameter ? cx - R : cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${C.red}" stroke-width="2"/>` +
      `<circle cx="${cx}" cy="${cy}" r="3" fill="${C.ink}"/>` + text(diameter ? cx : cx + R / 2, cy - 8, label, "middle", C.red),
    2 * R + 24, 2 * R + 16,
  );
}

const gen: Gen = (r, L, w) => {
  const W = w.basics;
  const u = w.units[r.pick(["cm", "m"] as const)];
  const len = (n: number | string) => `${n} ${u}`;
  /** A length (sq false) or an area: the unit may be typed after it, with ² or 2 on an area. */
  const out = (prompt: string, picture: Pic, v: number, sq: boolean, steps: string[], traps: Trap[] = []): ReturnType<Gen> => {
    const whole = Math.abs(v - Math.round(v)) < 1e-9;
    const shown = whole ? String(Math.round(v)) : dp(v, 2);
    return {
      prompt, q: "", pic: picture,
      answer: { k: "num", v, tol: whole ? 1e-9 : 0.0051, units: sq ? [`${u}²`, `${u}^2`, `${u}2`, u] : [u], traps },
      show: `${shown}\\ \\text{${u}}${sq ? "^2" : ""}`, plain: shown, format: whole ? "number" : "dp2", steps,
    };
  };
  if (L === 1) {
    const kind = r.int(0, 2);
    if (kind === 2) {
      // A square: one side marked.
      const s = r.int(2, 12);
      const p = rectPic(s, s, len(s), len(s));
      if (r.next() < 0.5) return out(W.perimeter, p, 4 * s, false, [`4 \\times ${s} = ${4 * s}`], s !== 4 ? [{ id: "areaNotPerimeter", a: num(s * s), vars: { x: s * s, v: 4 * s } }] : []);
      return out(W.area, p, s * s, true, [`${s} \\times ${s} = ${s * s}`], s !== 4 ? [{ id: "perimeterNotArea", a: num(4 * s), vars: { x: 4 * s, v: s * s } }] : []);
    }
    const b = r.int(2, 9);
    let a = r.int(3, 12);
    if (a === b) a++;
    const [P, A] = [2 * (a + b), a * b];
    const p = rectPic(a, b, len(a), len(b));
    if (kind === 0) {
      const traps: Trap[] = [...(A !== P ? [{ id: "areaNotPerimeter" as const, a: num(A), vars: { x: A, v: P } }] : []), ...(a + b !== A ? [{ id: "twoSidesOnly" as const, a: num(a + b), vars: { x: a + b, a, b, v: P } }] : [])];
      return out(W.perimeter, p, P, false, [`2 \\times (${a} + ${b}) = 2 \\times ${a + b} = ${P}`], traps);
    }
    return out(W.area, p, A, true, [`${a} \\times ${b} = ${A}`], A !== P ? [{ id: "perimeterNotArea", a: num(P), vars: { x: P, v: A } }] : []);
  }
  if (L === 2) {
    const kind = r.int(0, 2);
    if (kind === 2) {
      // A triangle: half of base × height, the height dashed unless it is a side.
      const b = r.int(3, 12);
      let h = r.int(2, 10);
      if ((b * h) % 2) h++;
      const v = (b * h) / 2;
      const p = trianglePic(b, h, r.pick([0, 0.3, 0.6]), len(b), len(h));
      return out(W.area, p, v, true, [`\\frac{1}{2} \\times ${b} \\times ${h} = \\frac{${b * h}}{2} = ${v}`], [{ id: "noHalf", a: num(b * h), vars: { x: b * h, v } }]);
    }
    const [a, b] = [r.int(3, 12), r.int(2, 9)];
    const [P, A] = [2 * (a + b), a * b];
    const p = rectPic(a, b, len(a), "x");
    if (kind === 0) return out(fill(W.sideFromArea, { v: `${A} ${u}²` }), p, b, false, [`x = ${A} \\div ${a} = ${b}`]);
    return out(fill(W.sideFromPerimeter, { v: len(P) }), p, b, false, [`${P} \\div 2 = ${a + b}`, `x = ${a + b} - ${a} = ${b}`], [{ id: "pairNotHalved", a: num(2 * b), vars: { x: 2 * b, v: b } }]);
  }
  // A circle, from its radius or its diameter.
  const rad = r.int(2, 12);
  const [given, area] = [r.next() < 0.5, r.next() < 0.5];
  const d = 2 * rad;
  const p = circlePic(len(given ? d : rad), given);
  const [circ, A] = [2 * Math.PI * rad, Math.PI * rad * rad];
  const v = area ? A : circ;
  const trap = (id: "diameterForRadius" | "circleFormulaSwapped", x: number): Trap[] =>
    Math.abs(x - v) > 0.2 ? [{ id, a: num(x, 0.0051), vars: { x: dp(x, 2), d, r: rad, v: dp(v, 2) } }] : [];
  const traps = given ? trap("diameterForRadius", area ? Math.PI * d * d : 2 * Math.PI * d) : trap("circleFormulaSwapped", area ? circ : A);
  const half = given ? [`r = ${d} \\div 2 = ${rad}`] : [];
  if (area) return out(W.circleArea, p, A, true, [...half, `\\pi r^2 = \\pi \\times ${rad}^2 = ${rad * rad}\\pi \\approx ${dp(A, 2)}`], traps);
  return out(W.circumference, p, circ, false, [given ? `\\pi d = \\pi \\times ${d} \\approx ${dp(circ, 2)}` : `2\\pi r = 2 \\times \\pi \\times ${rad} = ${d}\\pi \\approx ${dp(circ, 2)}`], traps);
};

export default gen;
