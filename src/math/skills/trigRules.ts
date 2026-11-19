// Practice: Sine and cosine rules, bearings.
import { fill, r2 } from "../chart";
import { appliedQuestion, figureSvg, obtuseQuestion, PROMPT_OF, sineCosineQuestion, three } from "../trigRules";
import { dp, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Trigonometry beyond the right angle (src/math/trigRules.ts): the sine and cosine of an obtuse angle (easy), the
  // sine rule, the cosine rule and the area ½bc sin A (medium), the ambiguous case, bearings and angles of elevation
  // and depression (hard). The figure is drawn to scale; the worked solution marks the mirror angle, the back bearing
  // or the angle inside the triangle.
  const u = { cm: w.units.cm, km: w.units.km, m: w.units.m };
  const q = L === 1 ? obtuseQuestion(r.next) : L === 2 ? sineCosineQuestion(r.next, u.cm) : appliedQuestion(r.next, u);
  const pic = figureSvg(q.fig);
  const tol = q.exact ? 1e-9 : 0.0051;
  const shown = q.exact ? (q.kind === "back" ? three(q.v) : String(q.v)) : dp(q.v, 2);
  const deg = q.measure === "deg" ? "^\\circ" : "";
  return {
    prompt: fill(w.trigRules[PROMPT_OF[q.kind]], { u: q.unit?.[0] ?? "", ...q.vars }),
    q: q.q,
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: {
      ...num(q.v, tol),
      units: q.measure === "deg" ? ["°"] : q.unit ? [...new Set(q.unit)] : undefined,
      traps: q.traps.map((t) => ({ id: t.id, a: num(t.v, tol), vars: t.vars })),
    },
    show: `${q.exact ? "" : "\\approx "}${shown}${deg}${q.unit ? `\\,\\mathrm{${q.unit[1].replace("²", "}^2{")}}` : ""}`,
    plain: shown,
    format: q.exact ? "number" : "dp2",
    solution: { kind: "trigRule", spec: { fig: q.fig, steps: q.steps } },
  };
};

export default gen;
