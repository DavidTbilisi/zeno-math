// Practice: Make a whole.
import { fill, r2 } from "../chart";
import { acrossGap, lcm, sumOf, wallSvg, wallTask } from "../fractionWall";
import { num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Unit-fraction tiles in a bar and the fraction missing to make the target (src/math/fractionWall.ts).
  const t = wallTask(L, r.next);
  const unit = (d: number) => `\\frac{1}{${d}}`;
  const den = lcm([...t.fixed, t.target.d]);
  const have = sumOf(t.fixed);
  const lines = [
    ...(t.fixed.length > 1 ? [`${t.fixed.map(unit).join(" + ")} = ${t.fixed.map((d) => `\\frac{${den / d}}{${den}}`).join(" + ")} = ${have.tex()}`] : []),
    `${t.target.tex()} - ${have.tex()} = ${t.gap.tex()}`,
  ];
  // Tops added and bottoms added (½ + ⅓ as 2/5): the gap that gives.
  const across = acrossGap(t);
  const traps: Trap[] = across ? [{ id: "addAcross", a: num(across.gap.toNumber()), vars: { r: `${across.across.n}/${across.across.d}`, big: `1/${across.big}` } }] : [];
  const pic = wallSvg(t, null);
  return {
    prompt: fill(w.prompts.makeWhole, { t: t.target.isInt() ? String(t.target.n) : `${t.target.n}/${t.target.d}` }),
    q: `${t.fixed.map(unit).join(" + ")} + \\square = ${t.target.tex()}`,
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { ...num(t.gap.toNumber(), 1e-9, { lowest: true }), traps },
    show: t.gap.tex(),
    plain: `${t.gap.n}/${t.gap.d}`,
    format: "fraction",
    solution: { kind: "wall", spec: { task: t, steps: lines } },
  };
};

export default gen;
