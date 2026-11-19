// Practice: Nets of a cube.
import { r2 } from "../chart";
import { LETTERS, netOptions, netQuestion, netSteps, netSvg } from "../cubeNets";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Which of four shapes folds into a cube, or which face of a net is opposite ★ (src/math/cubeNets.ts); a letter,
  // typed or picked.
  const q = netQuestion(L, r.next);
  const options = netOptions(q);
  const slips = q.level === 3 ? q.beside.map((at) => ({ id: "nextToOpposite" as const, at })) : q.lookalikes.map((at) => ({ id: "sixSquares" as const, at }));
  const pic = netSvg(q);
  return {
    prompt: q.level === 3 ? w.prompts.cubeOpposite : w.prompts.cubeNet,
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { k: "pick", options, right: q.right, traps: slips.map(({ id, at }) => ({ id, a: { k: "pick", options, right: at }, vars: { x: LETTERS[at] } })) },
    show: `\\text{${LETTERS[q.right]}}`,
    plain: LETTERS[q.right],
    format: "pick",
    solution: { kind: "net", spec: { q, steps: netSteps(q) } },
  };
};

export default gen;
