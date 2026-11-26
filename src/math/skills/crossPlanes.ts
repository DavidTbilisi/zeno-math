// Practice: Cross product, lines and planes (#717). Easy: a × b by its three 2 × 2 determinants, and the area of a
// triangle in space as ½|AB × AC|. Medium: the equation of a plane through a point with a given normal, n · r = n · P,
// and a normal read off a plane's equation. Hard: how far a point is from a plane, |n · P − d| ÷ |n|, and how far
// apart two parallel planes are once both are written with the same normal. The middle component's sign kept, the
// order of a and b swapped, the parallelogram for the triangle, the sign of d swapped, the signs of the normal lost,
// the division by |n| left out, d left out, and the second plane not rescaled are slips.
import { fill } from "../chart";
import { sqrtSplit } from "../expr";
import { colTex, fr, num, plainFrac } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";

type V3 = [number, number, number];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const tup = (v: number[]) => `(${v.join(", ")})`;
const plain = (v: number[]) => `(${v.join("; ")})`;
/** Normals whose length is whole: (1, 2, 2) has length 3, (2, 3, 6) length 7, and so on. */
const NORMALS: readonly [number, number, number, number][] = [[1, 2, 2, 3], [2, 1, 2, 3], [2, 3, 6, 7], [3, 2, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 2, 9, 11]];
/** A plane's left side, ax + by + cz, with 1s, signs and zeros written as usual. */
export function planeText(n: number[], minus = "−"): string {
  const out: string[] = [];
  n.forEach((c, i) => {
    if (!c) return;
    const v = "xyz"[i];
    const k = Math.abs(c) === 1 ? v : `${Math.abs(c)}${v}`;
    out.push(out.length ? `${c < 0 ? ` ${minus} ` : " + "}${k}` : `${c < 0 ? minus : ""}${k}`);
  });
  return out.join("");
}
const exactPart = (prompt: string, v: number, n: number, den: number, traps: Trap[], steps: string[]): Part => {
  // √n ÷ den in its simplest form.
  const { out, s } = sqrtSplit(fr(n));
  const c = fr(out.n, den);
  const show = s === 1 ? c.tex() : `${c.n === 1 ? "" : c.n}\\sqrt{${s}}${c.d === 1 ? "" : ` / ${c.d}`}`;
  const pl = s === 1 ? plainFrac(c) : `${c.n === 1 ? "" : c.n}sqrt(${s})${c.d === 1 ? "" : `/${c.d}`}`;
  const kept = traps.filter((t) => t.a.k === "num" && Math.abs(t.a.v - v) > 1e-6).map((t) => ({ ...t, vars: { v: pl, ...t.vars } }));
  return { prompt, q: "", answer: { ...num(v, 1e-9, { surd: true }), traps: kept }, show, plain: pl, format: "exact", steps };
};
const fracPart = (prompt: string, top: number, den: number, traps: Trap[], steps: string[]): Part => {
  const f = fr(top, den);
  const kept = traps.filter((t, i) => t.a.k === "num" && Math.abs(t.a.v - f.toNumber()) > 1e-9 && !traps.slice(0, i).some((u) => u.a.k === "num" && t.a.k === "num" && Math.abs(u.a.v - t.a.v) < 1e-9));
  return { prompt, q: "", answer: { ...num(f.toNumber(), 1e-9), traps: kept.map((t) => ({ ...t, vars: { v: plainFrac(f), ...t.vars } })) }, show: f.tex(), plain: plainFrac(f), format: f.d === 1 ? "number" : "fraction", steps };
};
const slip = (id: Trap["id"], v: number, vars: Record<string, string | number>): Trap => ({ id, a: num(v, 1e-9), vars });

const gen: Gen = (r, L, w) => {
  const W = w.xplP;
  const kind = r.int(0, 9);
  const v3 = (lo: number, hi: number): V3 => [r.int(lo, hi), r.int(lo, hi), r.int(lo, hi)];
  if (L === 1) {
    let a: V3, b: V3, c: V3;
    do [a, b] = [v3(-4, 4), v3(-4, 4)], (c = cross(a, b));
    while (c.filter(Boolean).length < 2 || c[1] === 0);
    if (kind <= 5) {
      const mid: V3 = [c[0], -c[1], c[2]];
      const back = c.map((x) => -x);
      const traps: Trap[] = [
        { id: "crossMiddleSign", a: { k: "tuple", vs: mid, tol: 1e-9 }, vars: { x: tup(mid), v: tup(c) } },
        { id: "crossOrderSwapped", a: { k: "tuple", vs: back, tol: 1e-9 }, vars: { x: tup(back), v: tup(c) } },
      ];
      return {
        prompt: fill(W.cross, { a: tup(a), b: tup(b) }), q: "\\mathbf{a} \\times \\mathbf{b}",
        answer: { k: "tuple", vs: c, tol: 1e-9, traps }, show: colTex(c.map(String)), plain: plain(c), format: "xyz",
        steps: [
          `x: ${a[1]} \\times ${b[2]} - ${a[2]} \\times ${b[1]} = ${c[0]}`, `y: ${a[2]} \\times ${b[0]} - ${a[0]} \\times ${b[2]} = ${c[1]}`,
          `z: ${a[0]} \\times ${b[1]} - ${a[1]} \\times ${b[0]} = ${c[2]}`,
        ],
      };
    }
    // The triangle ABC: half the length of AB × AC.
    const A = v3(-3, 3);
    const [B, C] = [A.map((x, i) => x + a[i]), A.map((x, i) => x + b[i])];
    const n = dot(c, c);
    return exactPart(fill(W.triArea, { a: tup(A), b: tup(B), c: tup(C) }), Math.sqrt(n) / 2, n, 2,
      [slip("crossAreaNotHalved", Math.sqrt(n), { x: Number(Math.sqrt(n).toFixed(2)) })],
      [`\\vec{AB} \\times \\vec{AC} = (${a.join(", ")}) \\times (${b.join(", ")}) = (${c.join(", ")})`, `\\text{area} = \\tfrac{1}{2}\\sqrt{${n}}`]);
  }
  if (L === 2 && kind <= 5) {
    // The plane through P with normal n: n · r = n · P.
    let n: V3;
    do n = v3(-5, 5);
    while (n.filter(Boolean).length < 2);
    let P: V3, d: number;
    do (P = v3(-4, 4)), (d = dot(n, P));
    while (d === 0);
    return {
      prompt: fill(W.planeD, { p: tup(P), n: tup(n), e: planeText(n) }), q: "",
      answer: { ...num(d), traps: [slip("planeDSign", -d, { x: -d, v: d })] }, show: String(d), plain: String(d), format: "number",
      steps: [`d = \\mathbf{n} \\cdot P = ${n.map((x, i) => `(${x})(${P[i]})`).join(" + ")} = ${d}`],
    };
  }
  if (L === 2) {
    // The normal read off the equation: the coefficients of x, y and z, signs and all (any multiple of it will do).
    let n: V3;
    do n = v3(-6, 6);
    while (n.filter(Boolean).length < 2 || !n.some((x) => x < 0) || !n.some((x) => x > 0));
    const d = r.int(-12, 12);
    const abs = n.map(Math.abs);
    return {
      prompt: fill(W.normal, { e: `${planeText(n)} = ${String(d).replace("-", "−")}` }), q: "",
      answer: { k: "dir", vs: n, traps: [{ id: "normalSignsLost", a: { k: "dir", vs: abs }, vars: { x: tup(abs), v: tup(n) } }] },
      show: colTex(n.map(String)), plain: plain(n), format: "xyz", steps: [`\\mathbf{n} = (${n.join(", ")})`],
    };
  }
  const [p, q, s, len] = r.pick(NORMALS);
  const n: V3 = [p * r.pick([1, -1]), q * r.pick([1, -1]), s * r.pick([1, -1])];
  if (kind <= 5) {
    // A point's distance from the plane n · r = d: |n · P − d| ÷ |n|.
    let P: V3, d: number;
    do (P = v3(-5, 5)), (d = r.int(-15, 15));
    while (dot(n, P) === d || dot(n, P) === 0);
    const top = Math.abs(dot(n, P) - d);
    return fracPart(fill(W.pointDist, { p: tup(P), e: `${planeText(n)} = ${String(d).replace("-", "−")}` }), top, len,
      [slip("distNotDivided", top, { x: top, n: len }), slip("distDLeftOut", Math.abs(dot(n, P)) / len, { x: plainFrac(fr(Math.abs(dot(n, P)), len)), d })],
      [`|\\mathbf{n}| = \\sqrt{${p * p} + ${q * q} + ${s * s}} = ${len}`, `\\frac{|${dot(n, P)} - (${d})|}{${len}} = ${fr(top, len).tex()}`]);
  }
  // Two parallel planes, the second written k times over: divide it by k first, then |d₁ − d₂| ÷ |n|.
  const k = r.pick([1, 2, 2, 3]);
  let d1: number, d2: number;
  do [d1, d2] = [r.int(-12, 12), r.int(-12, 12)];
  while (d1 === d2);
  const top = Math.abs(d1 - d2);
  const e1 = `${planeText(n)} = ${String(d1).replace("-", "−")}`;
  const e2 = `${planeText(n.map((x) => k * x))} = ${String(k * d2).replace("-", "−")}`;
  return fracPart(fill(W.planesDist, { e: e1, f: e2 }), top, len,
    [slip("planesNotRescaled", Math.abs(d1 - k * d2) / len, { x: plainFrac(fr(Math.abs(d1 - k * d2), len)), k }), slip("distNotDivided", top, { x: top, n: len })],
    [...(k > 1 ? [`${planeText(n.map((x) => k * x), "-")} = ${k * d2} \\Rightarrow ${planeText(n, "-")} = ${d2}`] : []), `\\frac{|${d1} - (${d2})|}{${len}} = ${fr(top, len).tex()}`]);
};

export default gen;
