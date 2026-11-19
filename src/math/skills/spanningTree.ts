// Practice: Connecting towns.
import { r2 } from "../chart";
import { cheapestRoads, townSteps, townSvg, townTask } from "../connectTowns";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // The least total cost of roads joining every town: a minimum spanning tree (src/math/connectTowns.ts).
  const t = townTask(L, r.next);
  const pic = townSvg(t.g, [], { scale: 0.8 });
  const naive = cheapestRoads(t.g);
  return {
    prompt: w.prompts.spanningTree,
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { ...num(t.best.total), traps: naive !== t.best.total ? [{ id: "cheapestRoads", a: num(naive), vars: { k: t.g.pts.length - 1, v: t.best.total } }] : [] },
    show: String(t.best.total),
    plain: String(t.best.total),
    format: "number",
    solution: { kind: "network", spec: { task: t, steps: townSteps(t) } },
  };
};

export default gen;
