// Practice: Similarity. Easy: a side of a similar triangle. Medium: a triangle cut by a parallel line. Hard: areas
// and volumes of similar shapes.
// #714 added: easy, the side that matches another when the triangles are named in another order, and whether two
// triangles with two angles given are similar; medium, whether two triangles with their sides given are similar, and
// a tree's height from its shadow; hard, the height to the hypotenuse of a right triangle, an angle bisector cutting
// the opposite side, a line parallel to a side, which test proves two triangles similar, and a tower's height seen in
// a mirror on the ground (the new setting). Letters matched in the alphabet's order, the third angle not worked out,
// one equal angle taken as enough, sides compared unsorted, two sides in ratio taken as enough, the same amount added
// instead of multiplied, the mean for the height, half the side for the bisector, the whole side for its part, two
// ratios taken for SSS and an angle not between the sides taken for SAS are the slips.
import { fill } from "../chart";
import { dp, fr, num, plainFrac } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickOf, word, type Opt } from "../signedKit";
import { figurePic, type P2 } from "../simPics";

/** A triangle with its corners named, from its three sides (a opposite the first name, and so on): the base first. */
const fromSides = (a: number, b: number, c: number, [A, B, C]: string[], dx = 0): Record<string, P2> => {
  // A at the origin, B along the base (AB = c), C above: AC = b.
  const x = (b * b + c * c - a * a) / (2 * c);
  return { [A]: [dx, 0], [B]: [dx + c, 0], [C]: [dx + x, Math.sqrt(Math.max(0, b * b - x * x))] };
};
/** A triangle from its base and the angles at its two ends, in degrees. */
const fromAngles = (base: number, p: number, q: number, [A, B, C]: string[], dx = 0): Record<string, P2> => {
  const [tp, tq] = [Math.tan((p * Math.PI) / 180), Math.tan((q * Math.PI) / 180)];
  const x = (base * tq) / (tp + tq);
  return { [A]: [dx, 0], [B]: [dx + base, 0], [C]: [dx + x, x * tp] };
};
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

/** The kinds #714 added. */
function more(r: Rng, L: 1 | 2 | 3, kind: number, w: PracticeWords): Part {
  const A = w.simP;
  const Y = word(A.yes);
  const N = word(A.no);
  const number = (prompt: string, v: number, traps: Trap[], steps: string[], pic?: Part["pic"]): Part => ({ prompt, q: "", pic, answer: { ...num(v, 1e-6), traps: traps.filter((t) => (t.a as { v: number }).v !== v) }, show: dp(v, 3), plain: dp(v, 3), format: "number", steps });
  const added = (a: number, b: number, v: number): Trap => ({ id: "addedNotScaled", a: num(v, 1e-6), vars: { a, b, k: plainFrac(fr(b, a)) } });
  if (L === 1 && kind <= 6) {
    // The side that matches, when the second triangle is named in another order.
    const order = r.pick(["QRP", "RPQ", "PRQ", "RQP", "QPR"]);
    const map: Record<string, string> = { A: order[0], B: order[1], C: order[2] };
    const side = r.pick(["AB", "BC", "AC"]);
    const of = (s: string, m: Record<string, string>) => [...s].map((c) => m[c]).sort().join("");
    const right = of(side, map);
    const abc = of(side, { A: "P", B: "Q", C: "R" });
    const all = ["PQ", "QR", "PR"];
    const slips = abc !== right ? [{ o: word(abc), id: "alphabetMatched" as const, vars: { p: map.A, q: map.B, r: map.C, s: side, v: right } }] : [];
    const pts = { ...fromSides(4, 3.2, 3.6, ["A", "B", "C"]), ...fromSides(6, 4.8, 5.4, [map.A, map.B, map.C], 6) };
    return pickOf(r, fill(A.corresp, { t: order, s: side }), word(right), slips, all.filter((x) => x !== right && x !== abc).map(word), {
      pic: figurePic({ pts, polys: [["A", "B", "C"], [map.A, map.B, map.C]] }, 330, 110),
      steps: [`A \\to ${map.A}, \\; B \\to ${map.B}, \\; C \\to ${map.C}`, `${side} \\to ${right}`],
    });
  }
  if (L === 1) {
    // Two angles of each: similar when the third angles make the same three.
    const a = r.pick([30, 35, 40, 45, 50, 55, 60]);
    const b = r.pick([50, 60, 65, 70, 75, 80].filter((x) => x !== a));
    const e = 180 - a - b;
    const yes = r.next() < 0.5;
    let c = e;
    if (!yes) {
      c = e + r.pick([-10, 10, 15, -15]);
      if (c === a) c += 5;
    }
    const f = 180 - b - c;
    const [p, q] = r.next() < 0.5 ? [b, c] : [c, b];
    const prompt = fill(A.aa, { a, b, c: p, d: q });
    const pic = figurePic({ pts: { ...fromAngles(4, a, b, ["A", "B", "C"]), ...fromAngles(4, p, q, ["D", "E", "F"], 5) }, polys: [["A", "B", "C"], ["D", "E", "F"]], angles: [
      { at: "A", from: "B", to: "C", text: `${a}°` }, { at: "B", from: "C", to: "A", text: `${b}°` }, { at: "D", from: "E", to: "F", text: `${p}°` }, { at: "E", from: "F", to: "D", text: `${q}°` },
    ] }, 330, 130);
    const steps = [`180^\\circ - ${a}^\\circ - ${b}^\\circ = ${e}^\\circ`, `180^\\circ - ${b}^\\circ - ${c}^\\circ = ${f}^\\circ`];
    if (yes) return pickOf(r, prompt, Y, [{ o: N, id: "thirdAngleMissed", vars: { a, b, c: e } }], [], { pic, steps });
    return pickOf(r, prompt, N, [{ o: Y, id: "oneAngleEnough", vars: { a, b, c, d: b, e, f } }], [], { pic, steps });
  }
  if (L === 2 && kind <= 7) {
    // Three sides of each: similar when the sorted sides all have one ratio.
    const [x, y, z] = r.pick([[3, 4, 6], [2, 3, 4], [4, 5, 7], [3, 5, 6], [2, 4, 5], [5, 6, 8], [4, 6, 9]]);
    const k = r.pick([2, 3, 1.5, 2.5]);
    const yes = r.next() < 0.5;
    const big = [x * k, y * k, yes ? z * k : z * k + r.pick([1, 2, -1])];
    const shown = r.next() < 0.5 ? [big[1], big[2], big[0]] : [big[2], big[0], big[1]];
    const prompt = fill(A.sss, { a: x, b: y, c: z, d: dp(shown[0], 3), e: dp(shown[1], 3), f: dp(shown[2], 3) });
    const [d, e, f] = sorted(big);
    const pic = figurePic({ pts: { ...fromSides(x, y, z, ["A", "B", "C"]), ...fromSides(d, e, f, ["D", "E", "F"], z + 2) }, polys: [["A", "B", "C"], ["D", "E", "F"]], hide: ["A", "B", "C", "D", "E", "F"],
      sides: [{ a: "B", b: "C", text: String(x) }, { a: "A", b: "C", text: String(y) }, { a: "A", b: "B", text: String(z) }, { a: "E", b: "F", text: dp(d, 3) }, { a: "D", b: "F", text: dp(e, 3) }, { a: "D", b: "E", text: dp(f, 3) }] }, 330, 120);
    const steps = [`\\tfrac{${dp(d, 3)}}{${x}} = ${dp(d / x, 3)}, \\; \\tfrac{${dp(e, 3)}}{${y}} = ${dp(e / y, 3)}, \\; \\tfrac{${dp(f, 3)}}{${z}} = ${dp(f / z, 3)}`];
    if (yes) return pickOf(r, prompt, Y, [{ o: N, id: "sidesUnsorted", vars: { a: x, b: y, c: z, d: dp(d, 3), e: dp(e, 3), f: dp(f, 3), k: dp(k, 3) } }], [], { pic, steps });
    return pickOf(r, prompt, N, [{ o: Y, id: "twoSidesEnough", vars: { c: z, f: dp(f, 3), k: dp(k, 3) } }], [], { pic, steps });
  }
  if (L === 2) {
    // A tree's height from its shadow and a pole's.
    const [p, s] = r.pick([[2, 3], [1, 2], [2, 5], [3, 4], [1.5, 2], [2, 1], [3, 2]] as const);
    const m = r.pick([2, 3, 4, 5, 6]);
    const t = s * m;
    const v = p * m;
    const pic = figurePic({ pts: { P: [0, p], Q: [0, 0], S: [s, 0], T: [s + 1.5, v], U: [s + 1.5, 0], V: [s + 1.5 + t, 0] }, hide: ["P", "Q", "S", "T", "U", "V"],
      segs: [{ a: "Q", b: "P", color: "#2f9e44" }, { a: "U", b: "T", color: "#2f9e44" }, { a: "Q", b: "V" }, { a: "P", b: "S", dash: true, color: "#e8590c" }, { a: "T", b: "V", dash: true, color: "#e8590c" }],
      sides: [{ a: "Q", b: "P", text: `${p} m` }, { a: "Q", b: "S", text: `${s} m` }, { a: "U", b: "V", text: `${t} m` }, { a: "U", b: "T", text: "?" }],
      notes: [{ at: "Q", text: A.pole, dy: 36 }, { at: "U", text: A.tree, dy: 36 }] }, 300, 140);
    return number(fill(A.shadow, { p, s, t }), v, [added(s, t, p + t - s)], [`\\tfrac{${t}}{${s}} = ${m}`, `${p} \\times ${m} = ${dp(v, 3)}`], pic);
  }
  if (kind === 5) {
    // The height to the hypotenuse: the two small triangles are similar, so h² = p q.
    const [p, q] = r.pick([[4, 9], [1, 16], [2, 8], [3, 12], [4, 16], [9, 16], [1, 9], [2, 18], [1, 4]] as const);
    const v = Math.sqrt(p * q);
    const pic = figurePic({ pts: { A: [0, 0], B: [p + q, 0], C: [p, v], D: [p, 0] }, polys: [["A", "B", "C"]], segs: [{ a: "C", b: "D", dash: true, color: "#e03131" }],
      rights: [{ at: "D", from: "B", to: "C" }, { at: "C", from: "A", to: "B" }], sides: [{ a: "A", b: "D", text: String(p) }, { a: "D", b: "B", text: String(q) }] }, 300, 120);
    return number(fill(A.altitude, { p, q }), v, [{ id: "altitudeAsMean", a: num((p + q) / 2, 1e-6), vars: { p, q, pq: p * q, v } }], [`\\tfrac{h}{${p}} = \\tfrac{${q}}{h}`, `h^2 = ${p} \\times ${q} = ${p * q}`, `h = ${v}`], pic);
  }
  if (kind === 6) {
    // An angle bisector cuts the opposite side in the ratio of the sides beside it.
    const [x, y] = r.pick([[2, 3], [3, 4], [1, 2], [2, 5], [3, 5]] as const);
    const s = r.int(2, 4);
    const ns = Array.from({ length: s - 1 }, (_, i) => i + 1).filter((n) => n * (x + y) > s * (y - x));
    const n = ns.length ? r.pick(ns) : s - 1;
    const [b, c, a] = [s * x, s * y, n * (x + y)];
    const v = n * x;
    const pts = fromSides(a, c, b, ["B", "C", "A"]);
    const D: P2 = [pts.B[0] + ((pts.C[0] - pts.B[0]) * x) / (x + y), pts.B[1] + ((pts.C[1] - pts.B[1]) * x) / (x + y)];
    const pic = figurePic({ pts: { ...pts, D }, polys: [["A", "B", "C"]], segs: [{ a: "A", b: "D", dash: true, color: "#e03131" }],
      sides: [{ a: "A", b: "B", text: String(b) }, { a: "A", b: "C", text: String(c) }] }, 300, 120);
    return number(fill(A.bisector, { a, b, c }), v, [{ id: "bisectorHalves", a: num(a / 2, 1e-6), vars: { a, b, c, s: b + c, v } }], [`BD : DC = AB : AC = ${b} : ${c}`, `BD = ${a} \\times \\tfrac{${b}}{${b + c}} = ${v}`], pic);
  }
  if (kind === 7) {
    // A line parallel to a side: AE : EC = AD : DB.
    const a = r.int(2, 6);
    const j = r.int(1, 3);
    let b = r.int(2, 9);
    while (b === a) b = r.int(2, 9);
    const c = a * j;
    const v = b * j;
    const pts: Record<string, P2> = { A: [1.5, 3], B: [0, 0], C: [4, 0] };
    const t = a / (a + b);
    const on = (P: P2): P2 => [pts.A[0] + (P[0] - pts.A[0]) * t, pts.A[1] + (P[1] - pts.A[1]) * t];
    const pic = figurePic({ pts: { ...pts, D: on(pts.B), E: on(pts.C) }, polys: [["A", "B", "C"]], segs: [{ a: "D", b: "E", color: "#1971c2" }],
      sides: [{ a: "A", b: "D", text: String(a) }, { a: "D", b: "B", text: String(b) }, { a: "A", b: "E", text: String(c) }, { a: "E", b: "C", text: "?" }] }, 240, 150);
    return number(fill(A.splitter, { a, b, c }), v, [added(a, b, c + b - a), { id: "wholeForPart", a: num(c + v, 1e-6), vars: { a, b, c, v } }], [`\\tfrac{EC}{${c}} = \\tfrac{${b}}{${a}}`, `EC = ${c} \\times ${b} \\div ${a} = ${v}`], pic);
  }
  if (kind === 8) {
    // Which test proves the triangles similar.
    const t = r.pick(["AA", "SAS", "SSS", "none"] as const);
    const given = { AA: "∠A = ∠D, ∠B = ∠E", SAS: "AB : DE = AC : DF, ∠A = ∠D", SSS: "AB : DE = BC : EF = AC : DF", none: "AB : DE = AC : DF, ∠B = ∠E" }[t];
    const os: Record<string, Opt> = { AA: word("AA"), SAS: word("SAS"), SSS: word("SSS"), none: word(A.notEnough) };
    const slips = t === "SAS" ? [{ o: os.SSS, id: "twoRatiosSSS" as const, vars: {} }] : t === "none" ? [{ o: os.SAS, id: "angleNotBetween" as const, vars: {} }] : [];
    const right = os[t];
    return pickOf(r, fill(A.reason, { g: given }), right, slips, Object.values(os).filter((o) => o !== right && !slips.some((x) => x.o === o)), { steps: [`\\text{${given}} \\Rightarrow \\text{${right.text}}`] });
  }
  // A tower seen in a mirror on the ground: the two right triangles are similar (equal angles at the mirror).
  const [h, d] = r.pick([[1.5, 2], [1.6, 2], [1.5, 3], [1.8, 3], [1.2, 2], [1.6, 4]] as const);
  const m = r.pick([5, 8, 10, 12, 15]);
  const e = d * m;
  const v = h * m;
  // A sketch, not to scale: Nino and the mirror would be too close to see.
  const pic = figurePic({ pts: { E: [0, 2], F: [0, 0], M: [3, 0], G: [10, 0], T: [10, 14 / 3] }, hide: ["E", "F", "M", "G", "T"],
    segs: [{ a: "F", b: "E", color: "#2f9e44" }, { a: "G", b: "T", color: "#2f9e44" }, { a: "F", b: "G" }, { a: "E", b: "M", dash: true, color: "#e8590c" }, { a: "M", b: "T", dash: true, color: "#e8590c" }],
    sides: [{ a: "F", b: "E", text: `${h} m` }, { a: "F", b: "M", text: `${d} m` }, { a: "M", b: "G", text: `${e} m` }, { a: "G", b: "T", text: "?" }],
    notes: [{ at: "F", text: A.eye, dy: 36 }, { at: "M", text: A.mirror, dy: 36 }, { at: "G", text: A.tower, dy: 36 }] }, 320, 140);
  return number(fill(A.mirrorTower, { h, d, e }), v, [added(d, e, h + e - d)], [`\\tfrac{${e}}{${d}} = ${m}`, `${h} \\times ${m} = ${dp(v, 3)}`], pic);
}

const gen: Gen = (r, L, w) => {
  const extra = r.int(0, 9);
  if (extra >= 5) return more(r, L, extra, w);
  return old(r, L, w);
};

/** The kinds the skill had before #714. */
const old: Gen = (r, L, w) => {
  const sol = (src: string) => ({ kind: "euclid" as const, spec: { topic: "similar", src } });
  const out = (prompt: string, q: string, v: number, src: string) => ({
    prompt,
    q,
    answer: num(v, 1e-6),
    show: dp(v, 3),
    plain: dp(v, 3),
    format: "number" as const,
    solution: sol(src),
  });
  if (L === 1) {
    const a = 2 * r.int(1, 5);
    const k = r.pick([2, 3, 1.5, 0.5, 2.5]);
    const b = r.int(3, 9);
    const [de, ef] = [a * k, b * k];
    return out(fill(w.prompts.similarSide, { a: "ABC", b: "DEF", s: "EF" }), `AB = ${a},\\quad BC = ${b},\\quad DE = ${dp(de, 3)}`, ef, `ABC ~ DEF; AB = ${a}; BC = ${b}; DE = ${dp(de, 3)}; find EF`);
  }
  if (L === 2) {
    const [a, b, m] = [r.int(2, 6), r.int(2, 8), r.int(1, 3)];
    return out(w.prompts.similarA, `AD = ${a},\\quad DB = ${b},\\quad DE = ${a * m}`, m * (a + b), `ADE ~ ABC; AD = ${a}; DB = ${b}; DE = ${a * m}; find BC`);
  }
  const [a, b] = r.pick([[2, 3], [3, 4], [2, 5], [3, 5], [1, 2], [1, 3], [4, 5]] as const);
  const m = r.int(1, 4);
  const kind = r.int(0, 2);
  if (kind === 0) return out(fill(w.prompts.scaleArea, { a, b, A: a * a * m }), "", b * b * m, `lengths ${a} : ${b}; area ${a * a * m} : ?`);
  if (kind === 1) return out(fill(w.prompts.scaleVolume, { a, b, V: a ** 3 * m }), "", b ** 3 * m, `lengths ${a} : ${b}; volume ${a ** 3 * m} : ?`);
  return out(fill(w.prompts.scaleAreaVolume, { a: a * a, b: b * b, V: a ** 3 * m }), "", b ** 3 * m, `areas ${a * a} : ${b * b}; volume ${a ** 3 * m} : ?`);
};

export default gen;
