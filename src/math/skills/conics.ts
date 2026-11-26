// Practice: conic sections (#664). Easy: a circle's radius and centre, also after completing two squares. Medium: a
// parabola's focus from its equation and its equation from the focus, an ellipse's foci and axis. Hard: a hyperbola's
// asymptotes and foci, which conic an equation is, and, in a new setting, the foci of a whispering gallery. The radius
// not rooted, the centre's sign kept, the squares not added, the focus not quartered, 4p forgotten, the foci by
// adding or subtracting the wrong way, the half-axis for the axis, the asymptote slope upside down, an ellipse called
// a circle, a hyperbola called an ellipse and half the distance between the foci are slips.
// #715 added equations from features and graphs. Easy: a circle's equation from its centre and radius, or from its
// graph; the centre from the expanded equation; whether a point is inside, on or outside a circle. Medium: an
// ellipse's radii and centre from its equation, and its equation from its features or its graph. Hard: which way a
// hyperbola opens, a vertex, and its equation from its vertices and foci. The radius not squared, the centre not
// halved, a point's squared distance compared with the radius, the radii swapped, the bigger number taken for the
// direction, the other half-axis for the vertex and the focus taken for b are the slips.
import { C, fill } from "../chart";
import type { MistakeId } from "../mistakes";
import { planeSvg, type P2 } from "../moveShape";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
import { pickOf, word, type Opt } from "../signedKit";
import { pickPart } from "../tTails";

/** (A, B, C) with A² = B² + C², C the focal distance of an ellipse x²/A² + y²/B² = 1. */
const ELLIPSES = [[5, 4, 3], [5, 3, 4], [10, 8, 6], [10, 6, 8], [13, 12, 5], [13, 5, 12], [17, 15, 8], [17, 8, 15]] as const;
/** (A, B, C) with C² = A² + B², the focal distance of a hyperbola x²/A² − y²/B² = 1. */
const HYPERBOLAS = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17]] as const;
const r2 = (v: number) => Math.round(v * 100) / 100;
const sq = (z: number, v: string) => (z === 0 ? `${v}²` : `(${v} ${z > 0 ? "−" : "+"} ${Math.abs(z)})²`);
const lin = (c: number, v: string) => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}${v}`);

const sqT = (z: number, v: string) => (z === 0 ? `${v}^2` : `(${v} ${z > 0 ? "-" : "+"} ${Math.abs(z)})^2`);
const eqOpt = (text: string, tex: string): Opt => ({ text, plain: text, tex });
const circleOpt = (h: number, k: number, R: number) => eqOpt(`${sq(h, "x")} + ${sq(k, "y")} = ${R}`, `${sqT(h, "x")} + ${sqT(k, "y")} = ${R}`);
const ellipseOpt = (h: number, k: number, A: number, B: number) => eqOpt(`${sq(h, "x")}/${A} + ${sq(k, "y")}/${B} = 1`, `\\frac{${sqT(h, "x")}}{${A}} + \\frac{${sqT(k, "y")}}{${B}} = 1`);
const hyperOpt = (xFirst: boolean, A: number, B: number) =>
  xFirst ? eqOpt(`x²/${A} − y²/${B} = 1`, `\\frac{x^2}{${A}} - \\frac{y^2}{${B}} = 1`) : eqOpt(`y²/${A} − x²/${B} = 1`, `\\frac{y^2}{${A}} - \\frac{x^2}{${B}} = 1`);
const pt = ([x, y]: P2) => `(${sgn(x)}, ${sgn(y)})`.replace(/-/g, "−");
/** An ellipse (a circle when a = b) round (h, k) on a grid big enough to hold it. */
function ovalPic(h: number, k: number, a: number, b: number): Part["pic"] {
  const ring: P2[] = Array.from({ length: 72 }, (_, i) => [h + a * Math.cos((i * Math.PI) / 36), k + b * Math.sin((i * Math.PI) / 36)]);
  const n = Math.max(6, Math.abs(h) + a + 1, Math.abs(k) + b + 1);
  const d = planeSvg(n, [{ pts: ring, color: C.blue, dashed: true }, { pts: [[h, k]], color: C.blue }], undefined, n > 8 ? 13 : 16);
  return { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${d.body}</g>`, w: d.w, h: d.h };
}
type Slip = { o: Opt; id: MistakeId; vars: Record<string, string | number> };

/** The kinds #715 added. */
function more(r: Rng, L: 1 | 2 | 3, kind: number, w: PracticeWords): Part {
  const A = w.conP;
  const nz = () => r.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
  if (L === 1 && kind <= 6) {
    // A circle's equation from its centre and radius, or from its graph.
    const [h, k, R] = [nz(), nz(), r.int(2, 5)];
    const right = circleOpt(h, k, R * R);
    const slips: Slip[] = [
      { o: circleOpt(-h, -k, R * R), id: "centreSignKept", vars: { a: pt([h, k]) } },
      { o: circleOpt(h, k, R), id: "radiusNotSquared", vars: { r: R, s: R * R } },
    ];
    const prompt = kind === 5 ? fill(A.circleFrom, { c: pt([h, k]), r: R }) : A.circleGraph;
    return pickOf(r, prompt, right, slips, [circleOpt(-h, -k, R)], { pic: kind === 6 ? ovalPic(h, k, R, R) : undefined, steps: [`(x - h)^2 + (y - k)^2 = r^2`, `${sqT(h, "x")} + ${sqT(k, "y")} = ${R * R}`] });
  }
  if (L === 1 && kind === 7) {
    // The centre from the expanded equation: halve the x and y numbers and change their signs.
    const [h, k, R] = [nz(), nz(), r.int(2, 6)];
    const [D, E, F] = [-2 * h, -2 * k, h * h + k * k - R * R];
    const eq = `x² + y²${lin(D, "x")}${lin(E, "y")}${lin(F, "")} = 0`;
    const tr = (v: P2, id: MistakeId, vars: Record<string, string | number>): Trap => ({ id, a: { k: "tuple", vs: v, tol: 1e-9 }, vars });
    return {
      prompt: fill(A.centreOf, { eq }), q: "", answer: { k: "tuple", vs: [h, k], tol: 1e-9, traps: [tr([-D, -E], "centreNotHalved", { d: sgn(D).replace("-", "−"), e: sgn(E).replace("-", "−"), v: pt([h, k]) }), tr([-h, -k], "centreSignKept", { a: pt([h, k]) })] },
      show: `(${h}, \\; ${k})`, plain: `(${h}, ${k})`, format: "point", steps: [`${sqT(h, "x")} + ${sqT(k, "y")} = ${R * R}`, `(${h}, \\; ${k})`],
    };
  }
  if (L === 1) {
    // Inside, on or outside: the squared distance from the centre against r².
    const [h, k] = [nz(), nz()];
    const where = r.pick(["inside", "on", "outside"] as const);
    const [dx, dy] = r.pick(where === "on" ? [[3, 4], [4, 3], [-3, 4], [4, -3], [5, 0], [0, -5]] : where === "inside" ? [[2, 3], [1, 4], [3, 3], [2, 4], [-3, 2], [4, -2]] : [[4, 4], [5, 2], [3, 5], [-4, 4], [5, -3]]);
    const d2 = dx * dx + dy * dy;
    const P: P2 = [h + dx, k + dy];
    const os = { inside: word(A.inside), on: word(A.on), outside: word(A.outside) };
    const slips: Slip[] = where === "inside" ? [{ o: os.outside, id: "pointVsRadius", vars: { d: d2, r: 5, s: 25 } }] : [];
    return pickOf(r, fill(A.pointQ, { eq: `${sq(h, "x")} + ${sq(k, "y")} = 25`, p: pt(P) }), os[where], slips, Object.values(os).filter((o) => o !== os[where] && !slips.some((x) => x.o === o)),
      { steps: [`(${sgn(P[0])} - ${parT(h)})^2 + (${sgn(P[1])} - ${parT(k)})^2 = ${dx * dx} + ${dy * dy} = ${d2}`, `${d2} ${d2 < 25 ? "<" : d2 === 25 ? "=" : ">"} 25`] });
  }
  if (L === 2 && kind <= 6) {
    // An ellipse's radius or centre from its equation.
    const [h, k] = [nz(), nz()];
    let [a, b] = [r.int(2, 6), r.int(2, 6)];
    while (a === b) b = r.int(2, 6);
    const eq = `${sq(h, "x")}/${a * a} + ${sq(k, "y")}/${b * b} = 1`;
    if (kind === 6) {
      return {
        prompt: fill(A.ellipseCentre, { eq }), q: "", answer: { k: "tuple", vs: [h, k], tol: 1e-9, traps: [{ id: "centreSignKept", a: { k: "tuple", vs: [-h, -k], tol: 1e-9 }, vars: { a: pt([h, k]) } }] },
        show: `(${h}, \\; ${k})`, plain: `(${h}, ${k})`, format: "point", steps: [`(${h}, \\; ${k})`],
      };
    }
    const across = r.next() < 0.5;
    const [v, o] = across ? [a, b] : [b, a];
    const traps: Trap[] = [{ id: "radiusNotRooted", a: num(v * v), vars: { s: v * v, r: v } }, { id: "ellipseRadiiSwapped", a: num(o), vars: { x: o, v } }];
    return numPart(fill(across ? A.radiusAcross : A.radiusUp, { eq }), v, traps, [`\\sqrt{${v * v}} = ${v}`]);
  }
  if (L === 2) {
    // An ellipse's equation from its centre and radii, or from its graph.
    const [h, k] = [nz(), nz()];
    let [a, b] = [r.int(2, 5), r.int(2, 5)];
    while (a === b) b = r.int(2, 5);
    const right = ellipseOpt(h, k, a * a, b * b);
    const swapped = ellipseOpt(h, k, b * b, a * a);
    const slips: Slip[] = [{ o: swapped, id: "ellipseRadiiSwapped", vars: { v: right.text } }, { o: ellipseOpt(h, k, a, b), id: "radiusNotSquared", vars: { r: a, s: a * a } }];
    const prompt = kind === 7 ? fill(A.ellipseFrom, { c: pt([h, k]), a, b }) : A.ellipseGraph;
    return pickOf(r, prompt, right, slips, [ellipseOpt(-h, -k, a * a, b * b)], { pic: kind === 7 ? undefined : ovalPic(h, k, a, b), steps: [`a = ${a}, \\; b = ${b}`, right.tex] });
  }
  const [Ah, Bh, Ch] = r.pick(HYPERBOLAS);
  if (kind === 5) {
    // Which way a hyperbola opens: along the positive term, whichever number is bigger.
    const xFirst = r.next() < 0.5;
    const [p, q] = Ah < Bh ? [Ah, Bh] : [Bh, Ah];
    const os = { lr: word(A.leftRight), ud: word(A.upDown) };
    const right = xFirst ? os.lr : os.ud;
    return pickOf(r, fill(A.opens, { eq: hyperOpt(xFirst, p * p, q * q).text }), right, [{ o: xFirst ? os.ud : os.lr, id: "hyperbolaOpensWrongWay", vars: { v: right.text } }], [], { steps: [`\\text{${right.text}}`] });
  }
  if (kind === 6) {
    // A vertex: a along the axis it opens on, from the centre.
    const [h, k] = [nz(), nz()];
    const eq = `${sq(h, "x")}/${Ah * Ah} − ${sq(k, "y")}/${Bh * Bh} = 1`;
    const v: P2 = [h + Ah, k];
    return {
      prompt: fill(A.vertex, { eq }), q: "", answer: { k: "tuple", vs: v, tol: 1e-9, traps: [{ id: "hyperbolaVertexB", a: { k: "tuple", vs: [h + Bh, k], tol: 1e-9 }, vars: { a: Ah, b: Bh, v: pt(v) } }] },
      show: `(${v[0]}, \\; ${v[1]})`, plain: `(${v[0]}, ${v[1]})`, format: "point", steps: [`a = \\sqrt{${Ah * Ah}} = ${Ah}`, `(${h} + ${Ah}, \\; ${k})`],
    };
  }
  // The equation from vertices and foci: b² = c² − a².
  const xFirst = r.next() < 0.5;
  const right = hyperOpt(xFirst, Ah * Ah, Bh * Bh);
  const on = (d: number) => (xFirst ? `(±${d}, 0)` : `(0, ±${d})`);
  const slips: Slip[] = [{ o: hyperOpt(xFirst, Ah * Ah, Ch * Ch), id: "hyperbolaFocusForB", vars: { a: Ah * Ah, c: Ch * Ch, b: Bh * Bh } }];
  const plus = eqOpt(right.text.replace("−", "+"), right.tex.replace(" - ", " + "));
  return pickOf(r, fill(A.hyperFrom, { v: on(Ah), f: on(Ch) }), right, slips, [hyperOpt(!xFirst, Ah * Ah, Bh * Bh), plus], { steps: [`b^2 = ${Ch * Ch} - ${Ah * Ah} = ${Bh * Bh}`, right.tex] });
}
const parT = (v: number) => (v < 0 ? `(${v})` : String(v));
function numPart(prompt: string, v: number, traps: Trap[], steps: string[]): Part {
  return { prompt, q: "", answer: { ...num(v), traps: traps.filter((t, i) => t.a.k === "num" && t.a.v !== v && !traps.slice(0, i).some((u) => u.a.k === "num" && u.a.v === (t.a as { v: number }).v)) }, show: sgn(v), plain: String(v), format: "number", steps };
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, 9);
  if (extra >= 5) return more(r, L, extra, w);
  return old(r, L, w);
};

/** The kinds the skill had before #715. */
const old: Gen = (r, L, w) => {
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
