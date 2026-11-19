// Practice: Shade the fraction.
import { fill, r2 } from "../chart";
import { encodeShade, shadeSvg, shadeTask } from "../shadeFrac";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // A fraction of a shape cut into equal pieces, shaded by tapping (src/math/shadeFrac.ts); any pieces will do.
  const t = shadeTask(L, r.next);
  const m = t.play.pieces / t.d;
  // The top number of pieces shaded (3 for ¾ of 12), when the shape has more pieces than the bottom.
  const traps: Trap[] = m > 1 ? [{ id: "topAsPieces", a: { k: "shade", play: t.play, count: t.n }, vars: { n: t.n, d: t.d, p: t.play.pieces, g: m, k: t.count } }] : [];
  const f = `\\frac{${t.n}}{${t.d}}`;
  const pic = shadeSvg(t.play, [], 220);
  const steps = [`${t.play.pieces} \\div ${t.d} = ${m}, \\quad ${t.n} \\times ${m} = ${t.count}`];
  return {
    prompt: fill(t.play.shape === "set" ? w.prompts.shadeSet : w.prompts.shadeShape, { f: `${t.n}/${t.d}` }),
    q: f,
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h + 4, w: pic.w },
    play: { kind: "shade", ...t.play },
    answer: { k: "shade", play: t.play, count: t.count, traps },
    show: m > 1 ? `${f} = \\frac{${t.count}}{${t.play.pieces}}` : f,
    plain: encodeShade(Array.from({ length: t.count }, (_, i) => i)),
    format: "shade",
    solution: { kind: "shade", spec: { play: t.play, count: t.count, steps } },
  };
};

export default gen;
