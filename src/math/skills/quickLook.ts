// Practice: Quick look: how many?.
import { r2 } from "../chart";
import { dotsHeight, dotsSvg, FLASH_MS, LOOK_W, lookSteps, lookTask } from "../quickLook";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Dots shown for a moment, then hidden (src/math/quickLook.ts); the answer is how many, typed.
  const t = lookTask(L, r.next);
  const body = dotsSvg(t);
  const h = dotsHeight(t);
  const steps = lookSteps(t);
  return {
    prompt: w.prompts.quickLook,
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`, h, w: LOOK_W },
    play: { kind: "flash", ms: FLASH_MS[L], body, h },
    answer: num(t.n),
    show: steps,
    plain: String(t.n),
    format: "number",
    solution: { kind: "dots", spec: { task: t, steps: [steps] } },
  };
};

export default gen;
