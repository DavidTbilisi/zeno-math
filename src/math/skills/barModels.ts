// Practice: Bar-model word problems. The question's structure (src/math/barProblems.ts) is worked in steps, each a
// question of its own, with the bar model drawn as it is built: the bars first with their units, then with the numbers
// found. Posts and trees are drawn as a fence or a pond with its gaps, and leftover and shortage is worked in lines.
import { fill } from "../chart";
import { barLevelQuestion, type BarModelWords, type BarQuestion } from "../barProblems";
import type { BarRow, BarModelSpec } from "../models";
import { money, num } from "../practiceKit";
import type { Exercise, Gen, Part, PracticeWords } from "../practiceTypes";

const MONEY_KEYS = new Set(["a", "b", "d", "t", "g", "u"]);
const plainOf = (v: number) => String(Math.round(v * 100) / 100);

/** The bars at a stage: with units only (`known` false), or with the amounts found. */
function barsOf(q: BarQuestion, W: BarModelWords, known: boolean): BarModelSpec | null {
  const { a, b, c } = W.names;
  const v = q.vars;
  const u = (n: number, size: number) => Array.from({ length: n }, () => `${size}=${known ? plainOf(size) : W.unit}`).join(", ");
  const row = (label: string, segments: string, total = ""): BarRow => ({ label, segments, total });
  const spec = (rows: BarRow[], grandTotal = ""): BarModelSpec => ({ type: "bar", rows, grandTotal, showNumbers: true });
  switch (q.form) {
    case "less":
      return spec([row(a, `${v.a - v.d}=${known ? plainOf(v.a - v.d) : "?"}, ${v.d}`, plainOf(v.a)), row(b, `${v.a - v.d}=${known ? plainOf(q.v) : "?"}`)]);
    case "howMuchMore":
      return spec([row(a, `${v.b}, ${v.a - v.b}=${known ? plainOf(q.v) : "?"}`), row(b, `${v.b}=${known ? plainOf(v.b) : "?"}`)], plainOf(v.t));
    case "sumDiff":
      return spec([row(a, `${u(1, v.b)}, ${v.d}`), row(b, u(1, v.b))], plainOf(v.t));
    case "times":
      return spec([row(a, u(v.k, v.u)), row(b, u(1, v.u))], plainOf(v.t));
    case "give":
      return spec([row(a, `${u(1, v.u)}, [${u(v.k - 1, v.u)}]=${plainOf(v.d)}`), row(b, u(1, v.u))]);
    case "three":
      return spec([row(a, u(2, v.u)), row(b, u(1, v.u)), row(c, `${u(1, v.u)}, ${v.d}`)], plainOf(v.t));
    default:
      return null;
  }
}

/** A straight fence with its posts, or a round pond with its trees, the gap marked. */
function fencePic(q: BarQuestion): Exercise["pic"] {
  const { g, n } = q.vars;
  if (q.form === "posts") {
    const step = Math.min(40, 440 / n);
    const w = step * n + 40;
    const posts = Array.from({ length: n + 1 }, (_, i) => `<rect x="${20 + i * step - 3}" y="20" width="6" height="34" rx="2" fill="#8d6e63"/>`).join("");
    const svg = `<line x1="20" y1="34" x2="${20 + step * n}" y2="34" stroke="#bcaaa4" stroke-width="3"/>${posts}<text x="${20 + step / 2}" y="14" font-size="12" text-anchor="middle" fill="#1971c2">${g} m</text>`;
    return { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${svg}</g>`, h: 62, w };
  }
  const R = 60;
  const trees = Array.from({ length: n }, (_, i) => {
    const t = (2 * Math.PI * i) / n - Math.PI / 2;
    return `<circle cx="${(80 + (R + 10) * Math.cos(t)).toFixed(1)}" cy="${(80 + (R + 10) * Math.sin(t)).toFixed(1)}" r="5" fill="#2f9e44"/>`;
  }).join("");
  const svg = `<circle cx="80" cy="80" r="${R}" fill="#d0ebff" stroke="#1971c2" stroke-width="2"/>${trees}<text x="80" y="84" font-size="12" text-anchor="middle" fill="#1971c2">${g} m</text>`;
  return { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${svg}</g>`, h: 160, w: 160 };
}

/** The working in lines, for the questions no bar model draws. */
function linesOf(q: BarQuestion): string[] {
  const v = q.vars;
  if (q.form === "posts") return [`${v.L} \\div ${v.g} = ${v.n}`, `${v.n} + 1 = ${q.v}`];
  if (q.form === "loop") return [`${v.L} \\div ${v.g} = ${v.n}`];
  if (q.form === "leftShort") return [`${v.l} + ${v.s} = ${v.l + v.s}`, `${v.q} - ${v.p} = ${v.e}`, `${v.l + v.s} \\div ${v.e} = ${q.v}`];
  return [];
}

export function barPart(q: BarQuestion, w: PracticeWords): Part & { worked: Part[] } {
  const W = w.barModels;
  const shown = Object.fromEntries(Object.entries(q.vars).map(([k, v]) => [k, q.money && MONEY_KEYS.has(k) ? money(w, v) : String(v)]));
  const stage = barsOf(q, W, false);
  const final = barsOf(q, W, true);
  const pic = q.form === "posts" || q.form === "loop" ? fencePic(q) : undefined;
  const answer = (v: number) => ({ show: plainOf(v), plain: plainOf(v), format: "number" as const });
  const worked: Part[] = q.steps.map((s) => ({
    prompt: fill(W.step[s.ask], shown),
    q: "",
    answer: num(s.v),
    ...answer(s.v),
    pic,
    ...(stage ? { solution: { kind: "model" as const, spec: stage } } : { steps: linesOf(q) }),
  }));
  return {
    prompt: fill(W.prompt[q.form], shown),
    q: "",
    pic,
    answer: { ...num(q.v), traps: q.trap ? [{ id: q.trap.id, a: num(q.trap.v), vars: q.trap.vars }] : [] },
    ...answer(q.v),
    ...(final ? { solution: { kind: "model" as const, spec: final } } : { steps: linesOf(q) }),
    worked,
  };
}

const gen: Gen = (r, L, w) => {
  // One of the level's three structures: one or two steps (easy), two or three (medium), three or more (hard).
  const part = barPart(barLevelQuestion(L, r.next), w);
  return { ...part, worked: part.worked.length ? part.worked : undefined };
};

export default gen;
