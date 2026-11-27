// Practice: Reading bar charts. Since #735 half the medium and hard questions are new kinds: the medium build a bar
// graph from a table of counts (how many lines of a scale in 2s, 5s or 10s the bar reaches; the count taken for the
// lines is the slip), the hard ask two steps of a bar graph or a picture graph (two together against a third; stopping
// after the first step, adding all three, and pictures counted as ones are the slips).
import { chartQuestion, chartSteps, chartSvg, chartTask, chartTraps, FRUIT } from "../barChart";
import { fill, r2 } from "../chart";
import { pictoSvg } from "../dataGraphs";
import { countTableSvg } from "../displays";
import { num } from "../practiceKit";
import type { Gen, Part, Rng, PracticeWords, Trap } from "../practiceTypes";

const place = (p: { body: string; w: number; h: number }): Part["pic"] => ({ svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${p.body}</g>`, h: p.h, w: p.w });
const trap = (id: Trap["id"], v: number, vars: Record<string, string | number>): Trap => ({ id, a: num(v), vars });
/** A number answer with its slips; a slip equal to the answer, or the same as one before it, is dropped. */
const numWith = (v: number, traps: Trap[]) => ({
  answer: { ...num(v), traps: traps.filter((t, i) => t.a.k === "num" && t.a.v !== v && traps.findIndex((u) => u.a.k === "num" && t.a.k === "num" && u.a.v === t.a.v) === i) },
  show: String(v), plain: String(v), format: "number" as const,
});

function more(r: Rng, L: 2 | 3, w: PracticeWords): Part {
  const W = w.rcK;
  if (L === 2) {
    // A table of counts to draw: the scale goes up in s, so the bar for a count c reaches c ÷ s lines.
    const s = r.pick([2, 5, 10]);
    const icons = [...FRUIT].sort(() => r.next() - 0.5).slice(0, 4);
    const ns = icons.map(() => s * r.int(2, 9));
    if (new Set(ns).size < ns.length) return more(r, L, w);
    const k = r.int(0, 3);
    const v = ns[k] / s;
    return {
      prompt: fill(W.buildQ, { s, a: icons[k] }), q: "", pic: place(countTableSvg([W.fruit, W.count], icons.map((name, i) => ({ name, n: ns[i] })))),
      ...numWith(v, [trap("scaleStepIgnored", ns[k], { s, c: ns[k], v })]),
      steps: [`${ns[k]} \\div ${s} = ${v}`],
    };
  }
  // Two together against a third, on a bar graph or a picture graph.
  const picture = r.next() < 0.5;
  const key = r.pick([2, 5, 10]);
  const task = picture ? null : chartTask(3, r.next);
  const icons = picture ? [...FRUIT].sort(() => r.next() - 0.5).slice(0, 4) : task!.items.map((it) => it.icon);
  const vs = picture ? icons.map(() => key * r.int(1, 7)) : task!.items.map((it) => it.v);
  const idx = vs.map((_, i) => i).sort(() => r.next() - 0.5);
  const [a, b, c] = idx;
  if (vs[a] + vs[b] <= vs[c] || !vs[c]) return more(r, L, w);
  const v = vs[a] + vs[b] - vs[c];
  const traps = [trap("stoppedAtOneStep", vs[a] + vs[b], { a: vs[a], b: vs[b], c: vs[c], v }), trap("allThreeAdded", vs[a] + vs[b] + vs[c], { a: vs[a], b: vs[b], c: vs[c], v })];
  if (picture) traps.unshift(trap("picturesCounted", v / key, { k: key, p: v / key, v }));
  const pic = picture ? pictoSvg({ key, rows: icons.map((icon, i) => ({ icon, v: vs[i] })) }) : chartSvg(task!, { gap: 22 });
  return {
    prompt: fill(picture ? W.pictoQ : W.twoStepQ, { a: icons[a], b: icons[b], c: icons[c] }), q: "", pic: place(pic),
    ...numWith(v, traps),
    steps: [...(picture ? [a, b, c].map((i) => `${vs[i] / key} \\times ${key} = ${vs[i]}`) : []), `${vs[a]} + ${vs[b]} = ${vs[a] + vs[b]}`, `${vs[a] + vs[b]} - ${vs[c]} = ${v}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (L > 1 && r.int(0, 9) >= 5) return more(r, L as 2 | 3, w);
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
