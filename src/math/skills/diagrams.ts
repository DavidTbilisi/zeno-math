// Practice: Picture, line and pie graphs.
import { fill, r2 } from "../chart";
import { diagramPic, type DiagramSolution, hourText, lineQuestion, lineSteps, lineTraps, pictoQuestion, pictoSteps, pictoTraps, pieCount, pieQuestion, pieSteps, pieTraps, stemQuestion, stemSteps, stemTraps } from "../dataGraphs";
import type { MistakeId } from "../mistakes";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // The other data diagrams (src/math/dataGraphs.ts): a picture graph (P2), a line graph of the temperature (P4), a
  // pie chart or a stem-and-leaf plot (P6). The answer is a number; the worked solution marks what was read.
  const ask = (prompt: string, spec: DiagramSolution, v: number, traps: { id: MistakeId; v: number; vars: Record<string, string | number> }[], steps: string[], units?: readonly string[]): ReturnType<Gen> => {
    const pic = diagramPic(spec);
    return {
      prompt,
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { k: "num", v, tol: 1e-9, units, traps: traps.map((t) => ({ id: t.id, a: num(t.v), vars: t.vars })) },
      show: String(v),
      plain: String(v),
      format: "number",
      solution: { kind: "diagram", spec: { ...spec, steps } },
    };
  };
  if (L === 1) {
    const q = pictoQuestion(r.next);
    const [a, b] = q.at.map((k) => q.task.rows[k].icon);
    return ask(fill(q.ask === "one" ? w.prompts.chartOne : w.prompts.chartMore, { a, b }), { kind: "picto", q }, q.v, pictoTraps(q), pictoSteps(q));
  }
  if (L === 2) {
    const q = lineQuestion(r.next);
    const t = hourText(q.task.from + q.at, q.ask === "half");
    const prompt = q.ask === "read" ? w.prompts.lineRead : q.ask === "half" ? w.prompts.lineHalf : w.prompts.lineRise;
    return ask(fill(prompt, { t }), { kind: "line", q }, q.v, lineTraps(q), lineSteps(q), ["°C", "°"]);
  }
  if (r.next() < 0.5) {
    const q = pieQuestion(r.next);
    const a = q.task.slices[q.at].icon;
    const prompt = q.ask === "count" ? w.prompts.pieCount : w.prompts.pieAngle;
    return ask(fill(prompt, { n: q.task.n, a, k: pieCount(q) }), { kind: "pie", q }, q.v, pieTraps(q), pieSteps(q), q.ask === "angle" ? ["°"] : undefined);
  }
  const q = stemQuestion(r.next);
  const prompt = q.ask === "median" ? w.prompts.stemMedian : w.prompts.stemRange;
  return ask(fill(prompt, { n: q.task.marks.length }), { kind: "stem", q, words: w.stemLeaf }, q.v, stemTraps(q), stemSteps(q));
};

export default gen;
