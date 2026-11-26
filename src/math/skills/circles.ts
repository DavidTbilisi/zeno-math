// Practice: Circle theorems. #715 added arcs and tangents, worked in steps with a figure. Easy: the third arc round the
// circle, arcs given by expressions in x, the major arc from the angle at the centre, an angle at the circle from its
// arc and the arc from the angle. Medium: a tangent's length or the radius from triangle OTP, two tangents from one
// point given by expressions in x, the angle between two tangents. Hard: an inscribed quadrilateral's angles given by
// expressions in x, the circle round a right triangle and, in a new setting, how far the horizon is. Arcs taken to make
// 180°, the minor arc for the major, the arc for the angle at the circle and the angle for the arc, OT taken from OP,
// the squares added, x for the length, the angle outside halved, opposite angles taken to make 360° and the diameter
// for the radius are slips.
import { C, fill, r2 } from "../chart";
import { circleFigure } from "../euclid";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { figurePic, type Figure, type P2 } from "../simPics";

const R = 5;
const on = (deg: number, rad = R): P2 => [rad * Math.cos((deg * Math.PI) / 180), rad * Math.sin((deg * Math.PI) / 180)];
const ex = (p: number, u: number) => `${p === 1 ? "" : p}x${u ? ` ${u < 0 ? "−" : "+"} ${Math.abs(u)}` : ""}`;
/** An angle or arc in degrees written as an expression: brackets only round a sum. */
const deg = (e: string) => (/[+−]/.test(e) ? `(${e})°` : `${e}°`);
const TRIPLES = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [9, 12, 15]] as const;
const EARTH = 6371;

function numPart(prompt: string, v: number, traps: (Trap | false)[], steps: string[], f: Figure | null, unit = "°", tol = 1e-6): Part {
  const ok = traps.filter((t): t is Trap => !!t && t.a.k === "num" && t.a.v > 0 && Math.abs(t.a.v - v) > 1e-6);
  const kept = ok.filter((t, i) => !ok.slice(0, i).some((u) => Math.abs((u.a as { v: number }).v - (t.a as { v: number }).v) < 1e-6));
  return {
    prompt, q: "", answer: { ...num(v, tol), traps: kept }, show: unit === "°" ? `${v}^\\circ` : String(v), plain: String(v), format: "number", steps,
    pic: f ? figurePic(f, 220, 200) : undefined,
  };
}
const slip = (id: Trap["id"], v: number, vars: Record<string, string | number>): Trap => ({ id, a: num(r2(v)), vars: { x: r2(v), ...vars } });

/** The kinds #715 added. */
function more(r: Rng, L: 1 | 2 | 3, kind: number, w: PracticeWords): Part {
  const W = w.crcP;
  if (L === 1 && kind <= 6) {
    // Arcs round the circle: they make 360°.
    const x0 = 5 * r.int(8, 30);
    let y0 = 5 * r.int(8, 30);
    while (x0 + y0 > 290) y0 -= 30;
    const [x, y] = [x0, y0];
    // Drawn to scale when the arcs are given; as three like arcs when they are expressions in x.
    const fig = (ab: string, bc: string, ca: string, [x, y] = [x0, y0]): Figure => {
      const [a, b, c] = [90, 90 - x, 90 - x - y];
      return { pts: { A: on(a), B: on(b), C: on(c), O: [0, 0] }, hide: ["O"], rings: [{ at: "O", r: R }], marks: [{ p: on(a - x / 2, 6.6), text: ab }, { p: on(b - y / 2, 6.6), text: bc }, { p: on(c - (360 - x - y) / 2, 6.6), text: ca }] };
    };
    if (kind === 5) {
      const v = 360 - x - y;
      return numPart(fill(W.arcThird, { x, y }), v, [slip("arcsTo180", 180 - x - y, { v })], [`${x}^\\circ + ${y}^\\circ + \\overset{\\frown}{CA} = 360^\\circ`, `\\overset{\\frown}{CA} = ${v}^\\circ`], fig(`${x}°`, `${y}°`, "?"));
    }
    // AB = (p x + u)°, BC = (q x + u2)°, CA = (s x + u3)°, all of them 360° for x = 360 / (p + q + s).
    const T = r.pick([6, 8, 9, 10, 12]);
    const X = 360 / T;
    const p = r.int(1, T - 2);
    const q = r.int(1, T - p - 1);
    const s3 = T - p - q;
    const [u, u2] = [5 * r.int(-2, 2), 5 * r.int(-2, 2)];
    const u3 = -u - u2;
    const [ab, bc, ca] = [p * X + u, q * X + u2, s3 * X + u3];
    if (Math.min(ab, bc, ca) < 15) return more(r, L, 5, w);
    const e = [ex(p, u), ex(q, u2), ex(s3, u3)].map(deg);
    const x180 = (180 - u - u2 - u3) / T;
    return numPart(fill(W.arcAlg, { ab: e[0], bc: e[1], ca: e[2] }), bc, [slip("arcsTo180", q * x180 + u2, { v: bc })],
      [`${T}x = 360 \\Rightarrow x = ${X}`, `\\overset{\\frown}{BC} = ${q === 1 ? "" : `${q} \\times `}${X}${u2 ? ` ${u2 < 0 ? "-" : "+"} ${Math.abs(u2)}` : ""} = ${bc}^\\circ`], fig(e[0], e[1], e[2], [120, 120]));
  }
  if (L === 1 && kind === 7) {
    // The major arc: the rest of the circle.
    const a = 10 * r.int(5, 15);
    const f: Figure = { pts: { A: on(270 - a / 2), B: on(270 + a / 2), C: on(90), O: [0, 0] }, rings: [{ at: "O", r: R }], segs: [{ a: "O", b: "A" }, { a: "O", b: "B" }], angles: [{ at: "O", from: "A", to: "B", text: `${a}°` }] };
    return numPart(fill(W.major, { a }), 360 - a, [slip("minorForMajor", a, { a, v: 360 - a })], [`360^\\circ - ${a}^\\circ = ${360 - a}^\\circ`], f);
  }
  if (L === 1) {
    // An angle at the circle is half its arc.
    const a = r.int(20, 70);
    const f: Figure = { pts: { A: on(270 - a), B: on(270 + a), C: on(r.pick([75, 90, 110])), O: [0, 0] }, hide: ["O"], rings: [{ at: "O", r: R }], segs: [{ a: "C", b: "A" }, { a: "C", b: "B" }], marks: [{ p: on(270, 6.6), text: kind === 8 ? `${2 * a}°` : "?" }], angles: kind === 9 ? [{ at: "C", from: "A", to: "B", text: `${a}°` }] : [] };
    if (kind === 8) return numPart(fill(W.inscFromArc, { m: 2 * a }), a, [slip("arcAsInscribed", 2 * a, { m: 2 * a, v: a })], [`\\angle ACB = \\frac{${2 * a}^\\circ}{2} = ${a}^\\circ`], f);
    return numPart(fill(W.arcFromInsc, { a }), 2 * a, [slip("inscribedAsArc", a, { a, v: 2 * a })], [`\\overset{\\frown}{AB} = 2 \\times ${a}^\\circ = ${2 * a}^\\circ`], f);
  }
  if (L === 2 && (kind <= 6 || kind === 8)) {
    // A tangent meets the radius at a right angle: OP is the hypotenuse of OTP.
    const [rr, t, d] = r.pick(TRIPLES);
    const askT = kind !== 8;
    const f: Figure = {
      pts: { O: [0, 0], T: [0, rr], P: [t, rr] }, rings: [{ at: "O", r: rr }], segs: [{ a: "O", b: "T" }, { a: "T", b: "P" }, { a: "O", b: "P", dash: true }], rights: [{ at: "T", from: "O", to: "P" }],
      sides: [{ a: "O", b: "T", text: askT ? String(rr) : "?" }, { a: "T", b: "P", text: askT ? "?" : String(t) }, { a: "O", b: "P", text: String(d) }],
    };
    const [v, o] = askT ? [t, rr] : [rr, t];
    return numPart(fill(askT ? W.tangentLen : W.tangentRad, { r: rr, t, d }), v, [slip("tangentSubtracted", d - o, { v }), slip("shorterAsHypotenuse", Math.hypot(d, o), { c: d, a: o, n: v * v })],
      [`OT \\perp PT`, `${askT ? "PT" : "OT"}^2 = ${d}^2 - ${o}^2 = ${v * v}`, `${askT ? "PT" : "OT"} = ${v}`], f, "");
  }
  const twoTangents = (angle?: string): Figure => ({
    pts: { O: [0, 0], A: on(127, 3), B: on(233, 3), P: [-5, 0] }, rings: [{ at: "O", r: 3 }], segs: [{ a: "P", b: "A" }, { a: "P", b: "B" }, { a: "O", b: "A" }, { a: "O", b: "B" }],
    rights: [{ at: "A", from: "O", to: "P" }, { at: "B", from: "O", to: "P" }], angles: angle ? [{ at: "O", from: "A", to: "B", text: angle }] : [],
  });
  if (L === 2 && kind === 7) {
    // Two tangents from one point are equal: p x + u = q x + u2.
    for (;;) {
      const [p, q] = [r.int(2, 6), r.int(2, 6)];
      const x = r.int(2, 9);
      const u = r.int(-9, 12);
      const u2 = (p - q) * x + u;
      if (p === q || u2 === 0 || u === 0 || Math.abs(u2) > 30 || p * x + u <= 0 || p * x + u === x) continue;
      const v = p * x + u;
      const f = twoTangents();
      f.sides = [{ a: "P", b: "A", text: ex(p, u) }, { a: "P", b: "B", text: ex(q, u2) }];
      return numPart(fill(W.tangentsEq, { a: ex(p, u), b: ex(q, u2) }), v, [slip("tangentPartOnly", x, { v })], [`${ex(p, u)} = ${ex(q, u2)}`.replace(/−/g, "-"), `x = ${x}`, `PA = ${v}`], f, "");
    }
  }
  if (L === 2) {
    // The angle between two tangents: the quadrilateral OAPB has two right angles.
    const a = 10 * r.int(6, 16);
    return numPart(fill(W.tangentsAngle, { a }), 180 - a, [slip("halvedOutside", a / 2, { a, v: 180 - a })], [`\\angle OAP = \\angle OBP = 90^\\circ`, `360^\\circ - 90^\\circ - 90^\\circ - ${a}^\\circ = ${180 - a}^\\circ`], twoTangents(`${a}°`));
  }
  if (kind === 5) {
    // An inscribed quadrilateral: opposite angles make 180°.
    for (;;) {
      const [p, q] = [r.int(1, 4), r.int(1, 4)];
      const x = r.int(10, 30);
      const u = 5 * r.int(-2, 4);
      const u2 = 180 - (p + q) * x - u;
      const [A, Cc] = [p * x + u, q * x + u2];
      if (Math.abs(u2) > 40 || u2 === 0 || u === 0 || A < 30 || Cc < 30) continue;
      const x360 = (360 - u - u2) / (p + q);
      const f: Figure = {
        pts: { A: on(160), B: on(75), C: on(-20), D: on(235), O: [0, 0] }, hide: ["O"], rings: [{ at: "O", r: R }], polys: [["A", "B", "C", "D"]],
        angles: [{ at: "A", from: "B", to: "D", text: deg(ex(p, u)) }, { at: "C", from: "D", to: "B", text: deg(ex(q, u2)) }],
      };
      return numPart(fill(W.quad, { a: deg(ex(p, u)), c: deg(ex(q, u2)) }), A, [slip("oppositeTo360", p * x360 + u, { v: A })],
        [`${ex(p, u)} + ${ex(q, u2)} = 180`.replace(/−/g, "-"), `x = ${x}`, `\\angle A = ${A}^\\circ`], f);
    }
  }
  if (kind <= 7) {
    // A right triangle in a circle: its hypotenuse is a diameter.
    const [a, b, c] = r.pick(TRIPLES);
    const th = Math.atan2(b, a);
    const C: P2 = [-R + 2 * R * (a / c) * Math.cos(th), 2 * R * (a / c) * Math.sin(th)];
    const f: Figure = { pts: { A: [-R, 0], B: [R, 0], C, O: [0, 0] }, rings: [{ at: "O", r: R }], polys: [["A", "B", "C"]], rights: [{ at: "C", from: "A", to: "B" }], sides: [{ a: "A", b: "C", text: String(a), inside: true }, { a: "B", b: "C", text: String(b), inside: true }] };
    return numPart(fill(W.rightIn, { a, b }), c / 2, [slip("diameterForRadius", c, { d: c, r: c / 2, v: c / 2 })], [`AB^2 = ${a}^2 + ${b}^2 = ${c * c}`, `AB = ${c} \\text{ is a diameter}`, `r = ${c / 2}`], f, "");
  }
  // A new setting: the horizon. The line of sight touches the Earth, so it meets the radius at a right angle.
  const plane = kind === 9;
  const h = plane ? r.pick([2, 5, 8, 10, 12]) : r.pick([20, 30, 45, 60, 80, 100]);
  const hk = plane ? h : h / 1000;
  const v = Math.round(Math.sqrt((EARTH + hk) ** 2 - EARTH ** 2) * 10) / 10;
  const top = 6.3;
  const phi = Math.acos(R / top);
  const f: Figure = {
    pts: { O: [0, 0], T: [0, top], H: [R * Math.sin(phi), R * Math.cos(phi)], S: [0, R] }, hide: ["S"], rings: [{ at: "O", r: R }],
    segs: [{ a: "T", b: "H" }, { a: "O", b: "H", dash: true }, { a: "O", b: "S", dash: true }, { a: "S", b: "T", color: C.orange }],
    rights: [{ at: "H", from: "O", to: "T" }], notes: [{ at: "T", text: plane ? W.planeNote : W.towerNote, dy: -30 }],
  };
  return numPart(fill(plane ? W.plane : W.horizon, { h, R: EARTH }), v, [slip("tangentSubtracted", hk, { v }), slip("shorterAsHypotenuse", Math.sqrt((EARTH + hk) ** 2 + EARTH ** 2), { c: r2(EARTH + hk), a: EARTH, n: r2(v * v) })],
    [`OT = ${EARTH} + ${hk} = ${r2(EARTH + hk)}`, `TH^2 = ${r2(EARTH + hk)}^2 - ${EARTH}^2`, `TH \\approx ${v}`], f, "", 0.051);
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, 9);
  if (extra >= 5) return more(r, L, extra, w);
  return old(r, L, w);
};

/** The kinds the skill had before #715. */
const old: Gen = (r, L, w) => {
  // An angle (or a length) from a circle theorem, with the figure.
  const make = (src: string, given: string, ask: string, v: number, angle = true) => {
    const full = `${src}; find ${ask}`;
    const fig = circleFigure(full);
    return {
      prompt: fill(w.prompts.circleFind, { a: angle ? `∠${ask}` : ask }),
      q: given,
      pic: fig ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${fig.svg}</g>`, h: fig.h, w: fig.w } : undefined,
      answer: num(v, 1e-6),
      show: angle ? `${v}^\\circ` : String(v),
      plain: String(v),
      format: "number" as const,
      solution: { kind: "euclid" as const, spec: { topic: "circle", src: full } },
    };
  };
  const deg = (n: string, v: number) => `\\angle ${n} = ${v}^\\circ`;
  if (L === 1) {
    const kind = r.int(0, 2);
    const a = r.int(25, 70);
    if (kind === 0) return r.next() < 0.5 ? make(`centre; AOB = ${2 * a}`, deg("AOB", 2 * a), "ACB", a) : make(`centre; ACB = ${a}`, deg("ACB", a), "AOB", 2 * a);
    if (kind === 1) return make(`semicircle; CAB = ${a}`, deg("CAB", a), "CBA", 90 - a);
    return make(`segment; ACB = ${a}`, deg("ACB", a), "ADB", a);
  }
  if (L === 2) {
    if (r.next() < 0.5) {
      const [A, B] = [r.int(55, 125), r.int(55, 125)];
      const src = `cyclic; A = ${A}; B = ${B}`;
      const q = `${deg("DAB", A)},\\quad ${deg("ABC", B)}`;
      return r.next() < 0.5 ? make(src, q, "BCD", 180 - A) : make(src, q, "CDA", 180 - B);
    }
    const P = 2 * r.int(15, 50);
    return r.next() < 0.5 ? make(`tangents; APB = ${P}`, deg("APB", P), "AOB", 180 - P) : make(`tangents; APB = ${P}`, deg("APB", P), "PAB", (180 - P) / 2);
  }
  const kind = r.int(0, 2);
  if (kind === 0) {
    const [a, b] = [r.int(40, 75), r.int(40, 75)];
    return make(`alternate; TAB = ${a}; SAC = ${b}`, `${deg("TAB", a)},\\quad ${deg("SAC", b)}`, "BAC", 180 - a - b);
  }
  if (kind === 1) {
    const P = 2 * r.int(15, 50);
    return make(`tangents; APB = ${P}`, deg("APB", P), "OAB", P / 2);
  }
  const [m, h, k] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [9, 12, 15], [12, 16, 20]] as const);
  const [half, om] = r.next() < 0.5 ? [m, h] : [h, m];
  return make(`chord; AB = ${2 * half}; OA = ${k}`, `AB = ${2 * half},\\quad OA = ${k}`, "OM", om, false);
};

export default gen;
