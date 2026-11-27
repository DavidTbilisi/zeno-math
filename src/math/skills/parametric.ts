// Practice: parametric equations and polar coordinates (#665). Easy: a point at t, the parameter removed, a polar
// point in x. Medium: dy/dx from dy/dt and dx/dt, speed, naming a polar curve. Hard: arc length, a cardioid's area, an
// acceleration component, and, in a new setting, where a thrown ball lands. x given for y, t solved with the wrong
// sign, cos and sin swapped, dy/dx upside down, the speed not rooted or its parts added, a polar curve misnamed, arc
// length without the root, the chord for the arc, the half forgotten in ½∫r² dθ, velocity for acceleration and the top
// for the landing are slips. Since #750 half the seeds ask the rest of the unit: d²y/dx² of a curve, a vector-valued
// function's velocity and acceleration (L2); a particle's position from its velocity, dx/dθ and a tangent's slope on a
// polar curve, the area between two polar curves and a polar arc length (L3).
import { exact, F } from "../calculusTwo";
import { fill } from "../chart";
import { vecOf } from "../linearAlgebra";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
import { pickPart } from "../tTails";

const r2 = (v: number) => Math.round(v * 100) / 100;
const m = (v: number) => String(v).replace("-", "−");
const plus = (c: number, v = "") => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}${v}`);
const ANGLES = [30, 45, 60, 120, 135, 150, 210, 240, 300, 330];

const tPow = (c: number, v: string) => (c === 1 ? v : c === -1 ? `-${v}` : `${c}${v}`);
const vec = (a: string, b: string) => `\\left\\langle ${a}, \\ ${b} \\right\\rangle`;
const pm = (c: number, v = "") => (c === 0 ? "" : ` ${c < 0 ? "-" : "+"} ${Math.abs(c) === 1 && v ? "" : Math.abs(c)}${v}`);

/** The rest of the unit (#750): second derivatives, vector-valued functions (L2); motion and polar calculus (L3). */
function more(r: Rng, L: 2 | 3, w: PracticeWords): Part {
  const K = w.pvK;
  if (L === 2) {
    const kind = r.int(0, 2);
    if (kind === 0) {
      // x = t², y = t³ + bt: dy/dx = (3t² + b)/(2t), and d²y/dx² = (3t² − b)/(4t³).
      const b = r.nz(-4, 6);
      const k = r.int(1, 3);
      const v = F(3 * k * k - b, 4 * k ** 3);
      return {
        prompt: fill(K.secondQ, { k }),
        q: `x = t^{2}, \\quad y = t^{3}${pm(b, "t")}`,
        ...exact(v, [["secondDerivNotDivided", F(3 * k * k - b, 2 * k * k)], ["secondDerivRatio", 3 * k]]),
        steps: [`\\frac{dy}{dx} = \\frac{3t^{2}${pm(b)}}{2t}`, `\\frac{d}{dt}\\left(\\frac{dy}{dx}\\right) = \\frac{3t^{2}${pm(-b)}}{2t^{2}}`, `\\frac{d^{2}y}{dx^{2}} = \\frac{3t^{2}${pm(-b)}}{2t^{2}} \\div 2t = \\frac{3t^{2}${pm(-b)}}{4t^{3}} = ${v.tex()}`],
      };
    }
    // r(t) = ⟨t³ + pt, qt²⟩: r′ = ⟨3t² + p, 2qt⟩, r″ = ⟨6t, 2q⟩.
    const p = r.int(-3, 4);
    const q = r.nz(-3, 3);
    const k = r.int(1, 3);
    const rt = vec(`t^{3}${pm(p, "t")}`, tPow(q, "t^{2}"));
    const at = [F(k ** 3 + p * k), F(q * k * k)];
    const vel = [F(3 * k * k + p), F(2 * q * k)];
    if (kind === 1)
      return { prompt: fill(K.vecVelQ, { k }), q: `\\vec r(t) = ${rt}`, ...vecOf(vel, [["vecPositionForVelocity", at.map((x) => x.toNumber())]]), steps: [`\\vec r\\,'(t) = ${vec(`3t^{2}${pm(p)}`, tPow(2 * q, "t"))}`, `\\vec r\\,'(${k}) = ${vec(String(vel[0].n), String(vel[1].n))}`] };
    const acc = [F(6 * k), F(2 * q)];
    return { prompt: fill(K.vecAccQ, { k }), q: `\\vec r(t) = ${rt}`, ...vecOf(acc, [["velocityForAcceleration", vel.map((x) => x.toNumber())]]), steps: [`\\vec r\\,'(t) = ${vec(`3t^{2}${pm(p)}`, tPow(2 * q, "t"))}`, `\\vec r\\,''(t) = ${vec("6t", String(2 * q))}`, `\\vec r\\,''(${k}) = ${vec(String(6 * k), String(2 * q))}`] };
  }
  const kind = r.int(0, 4);
  if (kind === 0) {
    // v(t) = ⟨pt, qt²⟩ from (x0, y0): the position at T is the start plus the integral of v.
    const [p, q] = [r.int(1, 4), r.int(1, 3)];
    const [x0, y0] = [r.int(-5, 5), r.int(-5, 5)];
    const T = r.int(1, 3);
    const dx = F(p * T * T, 2);
    const dy = F(q * T ** 3, 3);
    return {
      prompt: fill(K.motionQ, { x0: String(x0).replace("-", "−"), y0: String(y0).replace("-", "−"), T }),
      q: `\\vec v(t) = ${vec(tPow(p, "t"), tPow(q, "t^{2}"))}`,
      ...vecOf([dx.add(F(x0)), dy.add(F(y0))], [["startPointLeftOut", [dx.toNumber(), dy.toNumber()]], ["velocityForPosition", [p * T, q * T * T]]]),
      steps: [`\\int_{0}^{${T}} \\vec v\\,dt = ${vec(dx.tex(), dy.tex())}`, `${vec(String(x0), String(y0))} + ${vec(dx.tex(), dy.tex())} = ${vec(dx.add(F(x0)).tex(), dy.add(F(y0)).tex())}`],
    };
  }
  const a = r.int(2, 6);
  const b = r.int(1, a - 1);
  if (kind === 1) {
    // x = r cos θ, so dx/dθ = r′cos θ − r sin θ; at θ = π/2 that is −r(π/2).
    const sin = r.next() < 0.5;
    const v = sin ? -(a + b) : -a;
    return {
      prompt: K.polarDxQ,
      q: `r = ${a} + ${b === 1 ? "" : b}\\${sin ? "sin" : "cos"}\\theta`,
      ...exact(F(v), [["polarProductDropped", 0], ["polarSinSignSlip", -v]]),
      steps: [`\\frac{dx}{d\\theta} = r'\\cos\\theta - r\\sin\\theta`, `\\theta = \\tfrac{\\pi}{2}: \\ r = ${-v}, \\ \\cos\\theta = 0, \\ \\sin\\theta = 1`, `\\frac{dx}{d\\theta} = ${v}`],
    };
  }
  if (kind === 2) {
    // r = a + b cos θ at θ = π/2: dy/dθ = −b, dx/dθ = −a, so the slope is b/a.
    const v = F(b, a);
    return {
      prompt: K.polarSlopeQ,
      q: `r = ${a} + ${b === 1 ? "" : b}\\cos\\theta`,
      ...exact(v, [["polarSlopeAsDrDtheta", -b], ["polarSlopeUpsideDown", F(a, b)]]),
      steps: [`\\frac{dy}{d\\theta} = r'\\sin\\theta + r\\cos\\theta = ${-b}`, `\\frac{dx}{d\\theta} = r'\\cos\\theta - r\\sin\\theta = ${-a}`, `\\frac{dy}{dx} = \\frac{${-b}}{${-a}} = ${v.tex()}`],
    };
  }
  const c = r.int(1, 3);
  const cc = c === 1 ? "" : c;
  const card = c === 1 ? "1 + \\cos\\theta" : `${c}(1 + \\cos\\theta)`;
  if (kind === 3) {
    // Inside r = c(1 + cos θ), outside r = c: they meet at ±π/2, and the area is c²(2 + π/4).
    const v = r2(c * c * (2 + Math.PI / 4));
    return {
      prompt: K.polarAreaQ,
      q: `r = ${card}, \\quad r = ${c}`,
      ...{ answer: { ...num(v, 0.005), traps: [{ id: "areaHalfForgotten" as const, a: num(r2(2 * c * c * (2 + Math.PI / 4))) }, { id: "polarRadiiSubtracted" as const, a: num(r2((c * c * Math.PI) / 4)) }] }, show: String(v), plain: String(v), format: "number" as const },
      steps: [`\\theta = \\pm\\tfrac{\\pi}{2}`, `\\tfrac{1}{2}\\int_{-\\pi/2}^{\\pi/2} ${c * c === 1 ? "" : c * c}\\left((1 + \\cos\\theta)^{2} - 1\\right) d\\theta = ${c * c === 1 ? "" : c * c}\\left(2 + \\tfrac{\\pi}{4}\\right) = ${v}`],
    };
  }
  if (r.next() < 0.5) {
    // r = c·e^θ on [0, T]: r² + r′² = 2c²e^{2θ}, so L = √2·c·(e^T − 1).
    const T = r.int(1, 2);
    const v = r2(Math.SQRT2 * c * (Math.exp(T) - 1));
    return {
      prompt: K.polarArcQ,
      q: `r = ${cc}e^{\\theta}, \\quad 0 \\le \\theta \\le ${T}`,
      ...{ answer: { ...num(v, 0.005), traps: [{ id: "polarArcRadiusOnly" as const, a: num(r2(c * (Math.exp(T) - 1))) }, { id: "polarArcNotRooted" as const, a: num(r2(c * c * (Math.exp(2 * T) - 1))) }] }, show: String(v), plain: String(v), format: "number" as const },
      steps: [`r^{2} + \\left(\\tfrac{dr}{d\\theta}\\right)^{2} = ${2 * c * c}e^{2\\theta}`, `L = \\int_{0}^{${T}} ${cc}\\sqrt{2}\\,e^{\\theta}\\,d\\theta = ${cc}\\sqrt{2}\\left(e^{${T}} - 1\\right) = ${v}`],
    };
  }
  // The cardioid r = c(1 + cos θ): r² + r′² = 2c²(1 + cos θ) = 4c²cos²(θ/2), so the whole length is 8c.
  return {
    prompt: K.polarArcQ,
    q: `r = ${card}, \\quad 0 \\le \\theta \\le 2\\pi`,
    ...exact(F(8 * c), [["polarArcRadiusOnly", r2(2 * Math.PI * c)], ["polarArcNotRooted", r2(4 * Math.PI * c * c)]]),
    steps: [`r^{2} + \\left(\\tfrac{dr}{d\\theta}\\right)^{2} = ${2 * c * c}(1 + \\cos\\theta) = ${4 * c * c}\\cos^{2}\\tfrac{\\theta}{2}`, `L = 2\\int_{0}^{\\pi} ${2 * c}\\cos\\tfrac{\\theta}{2}\\,d\\theta = ${8 * c}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (L > 1 && r.int(0, 9) >= 5) return more(r, L as 2 | 3, w);
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
