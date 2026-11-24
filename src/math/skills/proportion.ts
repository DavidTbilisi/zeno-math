// Practice: Direct and inverse proportion.
import { fill, r2 } from "../chart";
import { algebraQuestion, graphSvg, isWordKind, powerQuestion, wordQuestion, wordSentences, type WordKind } from "../proportion";
import { textOf } from "../wordMarks";
import { fracTex, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Direct and inverse proportion (src/math/proportion.ts): word problems through the amount for one or the product
  // that stays the same (easy); y = kx and y = k/x from a pair, a table or a graph (medium); y in proportion to a
  // power of x, x back from y, and y's factor when x is scaled (hard). The worked solution is the working.
  const q = L === 1 ? wordQuestion(r.next) : L === 2 ? algebraQuestion(r.next) : powerQuestion(r.next);
  const pic = q.graph ? graphSvg(q.graph) : null;
  // A word problem in its sentences, each with its mark (marked first in practice, issue #582).
  const marked = isWordKind(q.kind) ? wordSentences(q, w.proportion, (s) => fill(s, q.vars)) : undefined;
  const [shown, plain] = q.frac ? [fracTex(q.frac[0], q.frac[1]), `${q.frac[0]}/${q.frac[1]}`] : [String(q.v), String(q.v)];
  return {
    prompt: marked ? textOf(marked) : fill(w.proportion[q.kind as Exclude<typeof q.kind, WordKind>], q.vars),
    ...(marked ? { marked } : {}),
    q: q.q,
    pic: pic ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w } : undefined,
    answer: { ...num(q.v, 1e-9, q.frac ? { lowest: true } : {}), traps: q.traps.map((t) => ({ id: t.id, a: num(t.v, 0.0051), vars: t.vars })) },
    show: shown,
    plain,
    format: q.frac ? "fraction" : "number",
    steps: q.steps,
  };
};

export default gen;
