// Practice: Triangle inequality.
import { fill } from "../chart";
import { hardSidesQuestion, LETTERS as SIDE_LETTERS, pickQuestion, rangeQuestion, type SidesQuestion } from "../sidesAndSecants";
import { ineqPlain, ineqTex, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Trap } from "../practiceTypes";

/** A triangle inequality question as a practice question: a letter picked, an inequality, or a number. */
function sidesPart(q: SidesQuestion, w: PracticeWords): Part {
  const W = w.triangleSides;
  if (q.kind === "pick" || q.kind === "largest") {
    const n = q.kind === "pick" ? 4 : 3;
    const options = SIDE_LETTERS.slice(0, n).map((l) => ({ text: l, plain: l, tex: `\\text{${l}}` }));
    const traps: Trap[] =
      q.kind === "pick"
        ? [{ id: "flatTriangle", a: { k: "pick", options, right: q.flat }, vars: { x: SIDE_LETTERS[q.flat], a: q.sets[q.flat][0], b: q.sets[q.flat][1], c: q.sets[q.flat][2], v: SIDE_LETTERS[q.right] } }]
        : q.beside.map((at) => ({ id: "besideNotOpposite" as const, a: { k: "pick" as const, options, right: at }, vars: { x: SIDE_LETTERS[at], s: q.longest, v: SIDE_LETTERS[q.right] } }));
    const sets = q.kind === "pick" ? q.sets.map((s, i) => `\\text{${SIDE_LETTERS[i]}: } ${s.join(",\\ ")}`) : [];
    return {
      prompt: q.kind === "pick" ? W.pick : fill(W.largest, q.vars),
      q: q.kind === "pick" ? `\\begin{array}{ll} ${sets[0]} & ${sets[1]} \\\\ ${sets[2]} & ${sets[3]} \\end{array}` : "",
      answer: { k: "pick", options, right: q.right, traps },
      show: `\\text{${SIDE_LETTERS[q.right]}}`,
      plain: SIDE_LETTERS[q.right],
      format: "pick",
      steps: q.steps,
    };
  }
  if (q.kind === "range") {
    const [lo, hi] = [{ v: q.range.lo, closed: false }, { v: q.range.hi, closed: false }];
    const closed = [{ ...lo, closed: true }, { ...hi, closed: true }] as const;
    return {
      prompt: fill(W.range, { a: q.a, b: q.b }),
      q: "",
      answer: {
        k: "ineq",
        lo,
        hi,
        traps: [
          { id: "boundary", a: { k: "ineq", lo: closed[0], hi: closed[1] } },
          { id: "noLowerBound", a: { k: "ineq", lo: null, hi }, vars: { x: ineqPlain(null, hi), a: q.a, b: q.b, d: q.range.lo, v: ineqPlain(lo, hi) } },
        ],
      },
      show: ineqTex(lo, hi),
      plain: ineqPlain(lo, hi),
      format: "inequality",
      steps: q.steps,
    };
  }
  return {
    prompt: fill(q.kind === "count" ? W.count : W.isosceles, q.vars),
    q: "",
    answer: { k: "num", v: q.v, tol: 1e-9, units: ["cm"], traps: [{ id: q.trap.id, a: num(q.trap.v), vars: q.trap.vars }] },
    show: String(q.v),
    plain: String(q.v),
    format: "number",
    steps: q.steps,
  };
}

const gen: Gen = (r, L, w) => {
  // The triangle inequality (src/math/sidesAndSecants.ts): which three lengths make a triangle (easy); the third
  // side's range, or how many whole lengths it can be (medium); an isosceles triangle's perimeter, and the largest
  // angle (hard). The worked solution is the working.
  return sidesPart(L === 1 ? pickQuestion(r.next) : L === 2 ? rangeQuestion(r.next) : hardSidesQuestion(r.next), w);
};

export default gen;
