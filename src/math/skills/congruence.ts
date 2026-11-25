// Practice: Congruent triangles. Easy: two triangles with the same parts written on them, congruent by SSS, SAS, ASA,
// AAS or RHS, or not necessarily (two sides and an angle not between them, SSA, drawn as the two different triangles
// it allows; or three angles, AAA, drawn in two sizes). Medium: a side or an angle of a triangle from the congruent one,
// the corners matched by the order they are written in. Hard: a proof put in order, a look-alike line left out: the
// base angles of an isosceles triangle, the diagonals of a parallelogram, a point on a perpendicular bisector. SSA or AAA
// taken for a test, corners matched by place instead of by order, and the look-alike line are the slips.
import { fill } from "../chart";
import { pairSvg, type Test } from "../congruence";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { orderLines } from "./proofs";

const gen: Gen = (r, L, w) => {
  const W = w.congr;
  if (L === 1) {
    const test = r.pick(["SSS", "SAS", "ASA", "AAS", "RHS", "SSA", "AAA"] as const satisfies readonly Test[]);
    // Angles that make a triangle of the right kind: a right angle for RHS; for SSA a small angle opposite the shorter
    // given side and an obtuse one beside it, so that the other triangle with the same parts exists.
    const [A, B] = test === "RHS" ? (([a]) => [a, 90 - a])([r.int(30, 60)]) : test === "SSA" ? [r.int(28, 34), r.int(100, 108)] : [r.int(40, 75), r.int(40, 75)];
    const d = pairSvg(test, A, B, r.int(5, 9), r.pick([30, 60, 120, 160, -40]), r.next() < 0.5);
    const two = test === "AAS" || (test !== "ASA" && r.next() < 0.5) ? "AAS" : "ASA";
    const names = ["SSS", "SAS", two, "RHS", W.notEnough];
    const right = test === "SSA" || test === "AAA" ? 4 : names.indexOf(test);
    const options = names.map((t) => ({ text: t, plain: t, tex: `\\text{${t}}` }));
    const traps: Trap[] =
      test === "SSA" ? [{ id: "ssaIsTest", a: { k: "pick", options, right: 1 }, vars: {} }]
      : test === "AAA" ? [{ id: "aaaIsTest", a: { k: "pick", options, right: 2 }, vars: {} }]
      : [];
    return {
      prompt: W.which, q: "", pic: { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${d.body}</g>`, h: d.h, w: d.w },
      answer: { k: "pick", options, right, traps }, show: options[right].tex, plain: names[right], format: "pick",
      steps: [`\\text{${W.why[test]}}`],
    };
  }

  if (L === 2) {
    // ΔABC ≅ Δ(P, Q, R in some order): each corner of the first pairs with the one written in the same place.
    const order = r.pick([["P", "Q", "R"], ["Q", "R", "P"], ["R", "P", "Q"], ["P", "R", "Q"], ["Q", "P", "R"], ["R", "Q", "P"]]);
    const t = order.join("");
    const mate = (x: string) => "ABC"[order.indexOf(x)];
    const wrongVars = { t, x: order[0], y: order[1], z: order[2] };
    if (r.next() < 0.5) {
      // A side: the two corners it joins, matched back.
      let s: number[];
      do s = [r.int(4, 12), r.int(4, 12), r.int(4, 12)];
      while (new Set(s).size < 3 || Math.max(...s) * 2 >= s[0] + s[1] + s[2]);
      const [ab, bc, ca] = s;
      const sideOf = (p: string, q: string) => {
        const k = [mate(p), mate(q)].sort().join("");
        return k === "AB" ? ab : k === "BC" ? bc : ca;
      };
      const [p, q] = r.pick([["P", "Q"], ["Q", "R"], ["R", "P"]]);
      const v = sideOf(p, q);
      const traps: Trap[] = [ab, bc, ca].filter((x) => x !== v).map((x) => ({ id: "wrongCorrespondence", a: num(x), vars: wrongVars }));
      return ask(fill(W.side, { t, ab, bc, ca, s: p + q }), v, traps, [`${p} \\leftrightarrow ${mate(p)},\\ ${q} \\leftrightarrow ${mate(q)}`, `${p}${q} = ${[mate(p), mate(q)].join("")} = ${v}`]);
    }
    // An angle: matched back, then the angle sum if it is the one not given.
    let a: number, b: number;
    do [a, b] = [r.int(30, 80), r.int(30, 80)];
    while (a === b || 180 - a - b === a || 180 - a - b === b);
    const c = 180 - a - b;
    const x = r.pick(["P", "Q", "R"]);
    const v = { A: a, B: b, C: c }[mate(x) as "A" | "B" | "C"];
    const traps: Trap[] = [a, b, c].filter((y) => y !== v).map((y) => ({ id: "wrongCorrespondence", a: num(y), vars: wrongVars }));
    return ask(fill(W.angle, { t, a, b, x }), v, traps, [`${x} \\leftrightarrow ${mate(x)}`, ...(mate(x) === "C" ? [`\\angle C = 180^\\circ - ${a}^\\circ - ${b}^\\circ = ${c}^\\circ`] : []), `\\angle ${x} = ${v}^\\circ`]);
  }

  // A proof in order, a look-alike line left out.
  const id = r.pick(["iso", "para", "bisector"] as const);
  const p = W.proofs[id];
  return { ...orderLines(p, 2, r), prompt: fill(W.order, { claim: p.claim }) };
};

function ask(prompt: string, v: number, traps: Trap[], steps: string[]): Part {
  return { prompt, q: "", answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps };
}

export default gen;
