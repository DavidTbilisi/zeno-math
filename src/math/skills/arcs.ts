// Practice: Arcs, sectors and radians.
import { degreeQuestion, PROMPT_OF as ARC_PROMPT, radianQuestion, sectorQuestion, sectorSvg } from "../arcs";
import { fill, r2 } from "../chart";
import { dp, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Arcs, sectors and radians (src/math/arcs.ts): the arc, area and perimeter of a sector in degrees (easy), radians
  // and s = rθ, A = ½r²θ (medium), the angle from an arc, the radius from an area and a segment's area (hard). The
  // angle is drawn to scale; the worked figure of a segment marks the triangle taken away.
  const u = { cm: w.units.cm, rad: w.arcs.rad };
  const q = L === 1 ? degreeQuestion(r.next, u) : L === 2 ? radianQuestion(r.next, u) : sectorQuestion(r.next, u);
  const pic = q.fig ? sectorSvg(q.fig) : null;
  const shown = q.exact ? String(q.v) : dp(q.v, 2);
  return {
    prompt: fill(w.arcs[ARC_PROMPT[q.kind]], { u: q.unit?.[0] ?? "", ...q.vars }),
    q: q.q,
    pic: pic ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w } : undefined,
    answer: {
      ...num(q.v, q.exact ? 1e-9 : 0.0051),
      units: q.measure === "deg" ? ["°"] : q.unit ? [...new Set(q.unit)] : undefined,
      traps: q.traps.map((t) => ({ id: t.id, a: num(t.v, 0.0051), vars: t.vars })),
    },
    show: `${q.exact ? "" : "\\approx "}${shown}${q.measure === "deg" ? "^\\circ" : ""}${q.unit ? `\\,\\mathrm{${q.unit[1].replace("²", "}^2{")}}` : ""}`,
    plain: shown,
    format: q.exact ? "number" : "dp2",
    solution: { kind: "arc", spec: { fig: q.fig, steps: q.steps } },
  };
};

export default gen;
