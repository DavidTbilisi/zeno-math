// Practice: Estimating angles.
import { angleQuestion, angleSteps, angleSvg } from "../angleGuess";
import { fill, r2 } from "../chart";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // About how big an angle is, by eye (src/math/angleGuess.ts): the nearest of a few sizes, typed or picked.
  const q = angleQuestion(L, r.next);
  const pic = angleSvg(q.task, { R: 100, crop: true });
  const traps: Trap[] = q.trap ? [{ id: q.trap.id, a: { k: "near", options: q.options, right: q.trap.at }, vars: { v: q.options[q.trap.at].v, a: L === 3 ? 360 : 180 } }] : [];
  return {
    prompt: fill(w.prompts.estimateAngle, { opts: q.options.map((o) => o.text).join(", ") }),
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { k: "near", options: q.options, right: q.right, traps },
    show: `${q.task.size}^\\circ \\approx ${q.options[q.right].tex}`,
    plain: q.options[q.right].plain,
    format: "near",
    solution: { kind: "angle", spec: { task: q.task, steps: angleSteps(q) } },
  };
};

export default gen;
