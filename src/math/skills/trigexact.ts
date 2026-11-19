// Practice: Exact trig values.
import { gcd, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // sin and cos of the reference angles, exactly.
  const REF: Record<number, [string, number, string, number]> = {
    0: ["0", 0, "1", 1],
    30: ["\\frac{1}{2}", 0.5, "\\frac{\\sqrt{3}}{2}", Math.sqrt(3) / 2],
    45: ["\\frac{\\sqrt{2}}{2}", Math.SQRT1_2, "\\frac{\\sqrt{2}}{2}", Math.SQRT1_2],
    60: ["\\frac{\\sqrt{3}}{2}", Math.sqrt(3) / 2, "\\frac{1}{2}", 0.5],
    90: ["1", 1, "0", 0],
  };
  const TAN: Record<number, [string, number]> = { 0: ["0", 0], 30: ["\\frac{\\sqrt{3}}{3}", Math.sqrt(3) / 3], 45: ["1", 1], 60: ["\\sqrt{3}", Math.sqrt(3)] };
  const f = r.pick(["sin", "cos", "tan"] as const);
  let deg: number;
  do deg = L === 1 ? r.pick([30, 45, 60]) : r.pick([0, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]);
  while (f === "tan" && deg % 180 === 90);
  const rad = (deg * Math.PI) / 180;
  const ref = [0, 30, 45, 60, 90].find((a) => [deg, 180 - deg, deg - 180, 360 - deg].includes(a))!;
  const v0 = f === "sin" ? Math.sin(rad) : f === "cos" ? Math.cos(rad) : Math.tan(rad);
  const v = Math.abs(v0) < 1e-12 ? 0 : v0;
  const mag = f === "sin" ? REF[ref][0] : f === "cos" ? REF[ref][2] : TAN[ref][0];
  const show = v === 0 ? "0" : `${v < 0 ? "-" : ""}${mag}`;
  let angleTex = `${deg}^\\circ`;
  if (L === 3) {
    const g = gcd(deg, 180);
    const [n, d] = [deg / g, 180 / g];
    angleTex = deg === 0 ? "0" : d === 1 ? `${n === 1 ? "" : n}\\pi` : `\\frac{${n === 1 ? "" : n}\\pi}{${d}}`;
  }
  const plain = show.replace(/\\sqrt\{(\d+)\}/g, "sqrt($1)").replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");
  return { prompt: w.prompts.trigexact, q: `\\${f} ${angleTex}`, answer: num(v), show, plain, format: "exact", solution: { kind: "trig", spec: { topic: "circle", angle: deg, unit: "deg" } } };
};

export default gen;
