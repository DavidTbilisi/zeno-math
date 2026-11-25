// Practice: conic sections (#664). Easy: a circle's radius and centre, also after completing two squares. Medium: a
// parabola's focus from its equation and its equation from the focus, an ellipse's foci and axis. Hard: a hyperbola's
// asymptotes and foci, which conic an equation is, and, in a new setting, the foci of a whispering gallery. The radius
// not rooted, the centre's sign kept, the squares not added, the focus not quartered, 4p forgotten, the foci by
// adding or subtracting the wrong way, the half-axis for the axis, the asymptote slope upside down, an ellipse called
// a circle, a hyperbola called an ellipse and half the distance between the foci are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
import { pickPart } from "../tTails";

/** (A, B, C) with A² = B² + C², C the focal distance of an ellipse x²/A² + y²/B² = 1. */
const ELLIPSES = [[5, 4, 3], [5, 3, 4], [10, 8, 6], [10, 6, 8], [13, 12, 5], [13, 5, 12], [17, 15, 8], [17, 8, 15]] as const;
/** (A, B, C) with C² = A² + B², the focal distance of a hyperbola x²/A² − y²/B² = 1. */
const HYPERBOLAS = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17]] as const;
const r2 = (v: number) => Math.round(v * 100) / 100;
const sq = (z: number, v: string) => (z === 0 ? `${v}²` : `(${v} ${z > 0 ? "−" : "+"} ${Math.abs(z)})²`);
const lin = (c: number, v: string) => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}${v}`);

const gen: Gen = (r, L, w) => {
  const W = w.qcn;
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[], tol?: number): Part => ({
    prompt, q: "", answer: { ...num(v, tol), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > 1e-6) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });

  if (L === 1) {
    const [a, b] = [r.int(-6, 6), r.int(-6, 6)];
    const rr = r.int(2, 9);
    const t = r.pick(["radius", "centre", "expanded"] as const);
    if (t === "radius") return numQ(fill(W.radiusQ, { eq: `${sq(a, "x")} + ${sq(b, "y")} = ${rr * rr}` }), rr, [slip("radiusNotRooted", rr * rr, { s: rr * rr, r: rr })], [`r^2 = ${rr * rr}`, `r = ${rr}`]);
    if (t === "centre") {
      const a2 = a === 0 ? 3 : a;
      return numQ(fill(W.centreQ, { eq: `${sq(a2, "x")} + ${sq(b, "y")} = ${rr * rr}` }), a2, [slip("centreSignKept", -a2, { a: sgn(a2).replace("-", "−") })], [`x ${a2 > 0 ? "-" : "+"} ${Math.abs(a2)} = 0 \\Rightarrow x = ${a2}`]);
    }
    // x² + y² + Dx + Ey + F = 0 with D = −2a, E = −2b, F = a² + b² − r².
    const [D, E, F] = [-2 * a, -2 * b, a * a + b * b - rr * rr];
    const eq = `x² + y²${lin(D, "x")}${lin(E, "y")}${lin(F, "")} = 0`;
    return numQ(fill(W.radiusQ, { eq }), rr, [slip("radiusNotRooted", rr * rr, { s: rr * rr, r: rr }), F < 0 && Math.sqrt(-F) % 1 === 0 && slip("circleConstantOnly", Math.sqrt(-F), { a: Math.abs(a), b: Math.abs(b) })],
      [`${sq(a, "x")} + ${sq(b, "y")} = ${-F} + ${a * a} + ${b * b} = ${rr * rr}`, `r = ${rr}`]);
  }

  if (L === 2) {
    const t = r.pick(["focus", "fromFocus", "foci", "axis"] as const);
    const p = r.int(1, 6);
    if (t === "focus") return numQ(fill(W.focusQ, { k: 4 * p }), p, [slip("focusNotQuartered", 4 * p, { k: 4 * p, p })], [`4p = ${4 * p}`, `p = ${p}`]);
    if (t === "fromFocus") return numQ(fill(W.fromFocusQ, { p }), 4 * p, [slip("fourPForgotten", p, { p, k: 4 * p })], [`y = \\frac{x^2}{4p}`, `4 \\times ${p} = ${4 * p}`]);
    const [A, B, C] = r.pick(ELLIPSES);
    const eq = r.next() < 0.5 ? `x²/${A * A} + y²/${B * B} = 1` : `y²/${A * A} + x²/${B * B} = 1`;
    if (t === "foci") return numQ(fill(W.fociQ, { eq }), C, [slip("fociAdded", r2(Math.hypot(A, B)), { a: A * A, b: B * B })], [`c^2 = ${A * A} - ${B * B} = ${C * C}`, `c = ${C}`]);
    return numQ(fill(W.axisQ, { eq }), 2 * A, [slip("semiAxisForAxis", A, { a: A })], [`a = \\sqrt{${A * A}} = ${A}`, `2a = ${2 * A}`]);
  }

  const t = r.pick(["slope", "hfoci", "which", "gallery"] as const);
  const [A, B, C] = r.pick(HYPERBOLAS);
  const heq = `x²/${A * A} − y²/${B * B} = 1`;
  if (t === "slope") return numQ(fill(W.slopeQ, { eq: heq }), r2(B / A), [slip("asymptoteSlopeInverted", r2(A / B), { a: A, b: B })], [`y = \\pm\\frac{${B}}{${A}}x`], 0.005);
  if (t === "hfoci") return numQ(fill(W.fociQ, { eq: heq }), C, [slip("fociSubtracted", r2(Math.sqrt(Math.abs(A * A - B * B))), { a: A * A, b: B * B })], [`c^2 = ${A * A} + ${B * B} = ${C * C}`, `c = ${C}`]);
  if (t === "which") {
    const kind = r.pick(["circle", "ellipse", "parabola", "hyperbola"] as const);
    const [m, n] = [r.pick([2, 3, 4, 5]), r.pick([6, 7, 9])];
    const eq = kind === "circle" ? `${m}x² + ${m}y² = ${m * n}` : kind === "ellipse" ? `${m}x² + ${n}y² = ${m * n}` : kind === "parabola" ? `y = ${m}x² − ${n}x` : `${m}x² − ${n}y² = ${m * n}`;
    const at = { circle: 0, ellipse: 1, parabola: 2, hyperbola: 3 }[kind];
    const trap = kind === "ellipse" ? [{ id: "ellipseAsCircle" as const, at: 0, vars: { m, n } }] : kind === "hyperbola" ? [{ id: "hyperbolaSignIgnored" as const, at: 1 }] : [];
    return pickPart(r, [W.circle, W.ellipse, W.parabola, W.hyperbola], at, trap, fill(W.whichQ, { eq }), [`\\text{${kind}}`]);
  }
  // A new setting: a whispering gallery, an elliptical room 2A long and 2B wide, with two people at the foci.
  const [GA, GB, GC] = r.pick(ELLIPSES);
  return numQ(fill(W.galleryQ, { l: 2 * GA, w: 2 * GB }), 2 * GC, [slip("fociHalfOnly", GC, { c: GC }), slip("fociAdded", r2(2 * Math.hypot(GA, GB)), { a: GA * GA, b: GB * GB })],
    [`c^2 = ${GA}^2 - ${GB}^2 = ${GC * GC}`, `2c = ${2 * GC}`]);
};

export default gen;
