// Practice: Reading bar charts.
import { chartQuestion, chartSteps, chartSvg, chartTraps } from "../barChart";
import { fill, r2 } from "../chart";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // A bar chart to read against its scale (src/math/barChart.ts): how many, how many more, or how many altogether.
  const q = chartQuestion(L, r.next);
  const [a, b] = q.at.map((k) => q.task.items[k].icon);
  const pic = chartSvg(q.task, { gap: 22 });
  const prompt = q.ask === "one" ? w.prompts.chartOne : q.ask === "more" ? w.prompts.chartMore : w.prompts.chartTotal;
  return {
    prompt: fill(prompt, { a, b }),
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { ...num(q.v), traps: chartTraps(q).map((t) => ({ id: t.id, a: num(t.v), vars: t.vars })) },
    show: String(q.v),
    plain: String(q.v),
    format: "number",
    solution: { kind: "chart", spec: { q, steps: chartSteps(q) } },
  };
};

export default gen;
