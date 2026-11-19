// Practice: One stroke (Euler).
import { r2 } from "../chart";
import { LETTERS } from "../cubeNets";
import { evenCount, strokeQuestion, strokeQuestionSvg, strokeSteps } from "../oneStroke";
import { num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Euler trails (src/math/oneStroke.ts): how many vertices have an odd degree, or which of four graphs can be drawn
  // in one stroke.
  const q = strokeQuestion(L, r.next);
  const pic = strokeQuestionSvg(q);
  const picture = { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w };
  const solution = { kind: "stroke" as const, spec: { q, steps: strokeSteps(q) } };
  if (q.level === 3) {
    const options = LETTERS.slice(0, 4).map((l) => ({ text: l, plain: l, tex: `\\text{${l}}` }));
    const traps: Trap[] = [0, 1, 2, 3].filter((i) => i !== q.right).map((at) => ({ id: "fourOdd", a: { k: "pick", options, right: at }, vars: { x: LETTERS[at] } }));
    return { prompt: w.prompts.oneStroke, q: "", pic: picture, answer: { k: "pick", options, right: q.right, traps }, show: `\\text{${LETTERS[q.right]}}`, plain: LETTERS[q.right], format: "pick", solution };
  }
  const even = evenCount(q as { g: import("../graphPlay").Graph; odd: number });
  const odd = (q as { odd: number }).odd;
  return {
    prompt: w.prompts.oddVertices,
    q: "",
    pic: picture,
    answer: { ...num(odd), traps: even !== odd ? [{ id: "countedEven", a: num(even), vars: { v: odd } }] : [] },
    show: String(odd),
    plain: String(odd),
    format: "number",
    solution,
  };
};

export default gen;
