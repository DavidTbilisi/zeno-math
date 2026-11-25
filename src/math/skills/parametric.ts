// Practice: parametric equations and polar coordinates (#665). Easy: a point at t, the parameter removed, a polar
// point in x. Medium: dy/dx from dy/dt and dx/dt, speed, naming a polar curve. Hard: arc length, a cardioid's area, an
// acceleration component, and, in a new setting, where a thrown ball lands. x given for y, t solved with the wrong
// sign, cos and sin swapped, dy/dx upside down, the speed not rooted or its parts added, a polar curve misnamed, arc
// length without the root, the chord for the arc, the half forgotten in ½∫r² dθ, velocity for acceleration and the top
// for the landing are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
import { pickPart } from "../tTails";

const r2 = (v: number) => Math.round(v * 100) / 100;
const m = (v: number) => String(v).replace("-", "−");
const plus = (c: number, v = "") => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}${v}`);
const ANGLES = [30, 45, 60, 120, 135, 150, 210, 240, 300, 330];

const gen: Gen = (r, L, w) => {
  const W = w.qpm;
  // A slip inside the answer's "close" window would be read as close, not as the slip, so it is left out.
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[], tol?: number): Part => ({
    prompt, q: "", answer: { ...num(v, tol), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > Math.max(1e-6, 25 * (tol ?? 0))) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });

  if (L === 1) {
    const t = r.pick(["point", "remove", "polar"] as const);
    if (t === "point") {
      const [a, b, c, d, k] = [r.int(2, 5), r.int(-5, 5), r.int(1, 3), r.int(-6, 6), r.int(1, 4)];
      const xs = `${a}t${plus(b)}`;
      const ys = `${c === 1 ? "" : c}t²${plus(d)}`;
      return numQ(fill(W.pointQ, { x: xs, y: ys, k }), c * k * k + d, [slip("xForY", a * k + b)], [`y = ${c} \\times ${k}^2 ${d < 0 ? "-" : "+"} ${Math.abs(d)} = ${c * k * k + d}`]);
    }
    if (t === "remove") {
      const p = r.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
      return numQ(fill(W.removeQ, { x: `t${plus(p)}` }), p, [slip("tSolvedWrongSign", -p, { p: m(p) })], [`t = x ${p < 0 ? "+" : "-"} ${Math.abs(p)}`, `y = (x ${p < 0 ? "+" : "-"} ${Math.abs(p)})^2`, `h = ${p}`]);
    }
    const [rr, th] = [r.int(2, 8), r.pick(ANGLES)];
    const v = r2(rr * Math.cos((th * Math.PI) / 180));
    return numQ(fill(W.polarQ, { r: rr, th }), v, [slip("polarCosSinSwapped", r2(rr * Math.sin((th * Math.PI) / 180)))], [`x = ${rr}\\cos ${th}° = ${v}`], 0.005);
  }

  if (L === 2) {
    const t = r.pick(["slope", "speed", "name"] as const);
    if (t === "slope") {
      const [b, k] = [r.int(-4, 6), r.int(1, 3)];
      const [dy, dx] = [3 * k * k + b, 2 * k];
      if (dy === 0) return numQ(fill(W.slopeQ, { x: "t² + 1", y: `t³${plus(b, "t")}`, k }), 0, [], [`\\frac{dy}{dx} = \\frac{0}{${dx}} = 0`]);
      return numQ(fill(W.slopeQ, { x: "t² + 1", y: `t³${plus(b, "t")}`, k }), r2(dy / dx), [slip("dydxUpsideDown", r2(dx / dy))],
        [`\\frac{dx}{dt} = ${dx},\\ \\frac{dy}{dt} = ${dy}`, `\\frac{dy}{dx} = \\frac{${dy}}{${dx}} = ${r2(dy / dx)}`], 0.005);
    }
    if (t === "speed") {
      const [vx, vy, s] = r.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]] as const);
      const k = r.int(1, 3);
      // x = vx·t, y = (vy + 10k)t − 5t², so at t = k the velocity is (vx, vy).
      return numQ(fill(W.speedQ, { x: `${vx}t`, y: `${vy + 10 * k}t − 5t²`, k }), s, [slip("speedNotRooted", s * s, { s: s * s }), slip("componentsAdded", vx + vy)],
        [`\\frac{dx}{dt} = ${vx},\\ \\frac{dy}{dt} = ${vy + 10 * k} - 10 \\times ${k} = ${vy}`, `\\sqrt{${vx}^2 + ${vy}^2} = ${s}`]);
    }
    const kind = r.pick(["circle", "line", "spiral"] as const);
    const eq = kind === "circle" ? `r = ${r.int(2, 6)}` : kind === "line" ? `θ = ${r.pick([30, 45, 60, 120])}°` : `r = ${r.int(2, 4)}θ`;
    const at = { circle: 0, line: 1, spiral: 2 }[kind];
    return pickPart(r, [W.circle, W.line, W.spiral], at, [{ id: "polarCurveMisnamed", at: kind === "circle" ? 1 : kind === "line" ? 0 : 0 }], fill(W.nameQ, { eq }), [`\\text{${kind}}`]);
  }

  const t = r.pick(["arc", "area", "accel", "ball"] as const);
  if (t === "arc") {
    // x = 3t², y = 2t³: speed 6t√(1 + t²), so the length from 0 to a is 2((1 + a²)^{3/2} − 1).
    const a = r.int(1, 3);
    const v = r2(2 * ((1 + a * a) ** 1.5 - 1));
    return numQ(fill(W.arcQ, { a }), v, [slip("arcLengthNotRooted", r2(12 * a ** 3 + 7.2 * a ** 5)), slip("chordForArc", r2(Math.hypot(3 * a * a, 2 * a ** 3)))],
      [`\\sqrt{(6t)^2 + (6t^2)^2} = 6t\\sqrt{1 + t^2}`, `\\int_0^{${a}} 6t\\sqrt{1 + t^2}\\,dt = 2\\left[(1 + t^2)^{3/2}\\right]_0^{${a}} = ${v}`], 0.005);
  }
  if (t === "area") {
    const a = r.int(1, 3);
    const v = r2(1.5 * Math.PI * a * a);
    return numQ(fill(W.areaQ, { a }), v, [slip("areaHalfForgotten", r2(3 * Math.PI * a * a))], [`\\frac{1}{2}\\int_0^{2\\pi} ${a * a}(1 + \\cos\\theta)^2\\,d\\theta = \\frac{3}{2}\\pi \\times ${a * a} = ${v}`], 0.005);
  }
  if (t === "accel") {
    const k = r.int(1, 4);
    return numQ(fill(W.accelQ, { k }), 6 * k, [slip("accelerationAsVelocity", 3 * k * k, { k })], [`x' = 3t^2,\\ x'' = 6t`, `6 \\times ${k} = ${6 * k}`]);
  }
  // A new setting: a ball at x = ut, y = vt − 5t² lands when y = 0 again, at t = v ÷ 5.
  const [u, v] = [r.pick([8, 10, 12, 15]), r.pick([10, 15, 20, 25])];
  return numQ(fill(W.ballQ, { u, v }), (u * v) / 5, [slip("topForLanding", (u * v) / 10, { t: v / 10 })], [`${v}t - 5t^2 = 0 \\Rightarrow t = ${v / 5}`, `x = ${u} \\times ${v / 5} = ${(u * v) / 5}`]);
};

export default gen;
