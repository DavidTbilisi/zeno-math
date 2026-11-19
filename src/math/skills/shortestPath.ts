// Practice: Shortest route.
import { fill, r2 } from "../chart";
import { name as vertexName } from "../graphPlay";
import { pathSteps, pathSvg, pathTask, pathTraps } from "../shortestPath";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // The length of the shortest route between two places on a map of roads (src/math/shortestPath.ts).
  const t = pathTask(L, r.next);
  const pic = pathSvg(t, [t.a], { scale: 0.8 });
  return {
    prompt: fill(w.prompts.shortestPath, { a: vertexName(t.a), b: vertexName(t.b) }),
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { ...num(t.best), traps: pathTraps(t).map((x) => ({ id: x.id, a: num(x.v), vars: x.vars })) },
    show: String(t.best),
    plain: String(t.best),
    format: "number",
    solution: { kind: "route", spec: { task: t, steps: pathSteps(t) } },
  };
};

export default gen;
