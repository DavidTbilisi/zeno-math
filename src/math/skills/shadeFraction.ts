// Practice: Shade the fraction.
// A fraction of a shape cut into equal pieces, shaded by tapping; first, which of three circles or rectangles is cut
// into equal parts (#702), the one cut into as many parts of different sizes named.
import { fill, r2 } from "../chart";
import { type CutShape, cutShapes } from "../fracLinePics";
import { pickText, shuffled } from "../mulDivKit";
import { encodeShade, shadeSvg, shadeTask } from "../shadeFrac";
import type { Gen, Trap } from "../practiceTypes";

/** Cuts that make n parts not all the same size, for a rectangle (inner cuts) and a circle (cuts round from the top). */
const UNEQUAL: Record<number, { rect: number[]; circle: number[] }> = {
  2: { rect: [0.32], circle: [0, 0.32] },
  3: { rect: [0.2, 0.58], circle: [0, 0.22, 0.6] },
  4: { rect: [0.14, 0.44, 0.8], circle: [0, 0.16, 0.5, 0.66] },
};
const equalCuts = (kind: CutShape["kind"], n: number) => (kind === "rect" ? Array.from({ length: n - 1 }, (_, i) => (i + 1) / n) : Array.from({ length: n }, (_, i) => i / n));

const gen: Gen = (r, L, w) => {
  if (L === 1 && r.int(0, 2) === 0) {
    // Which shape is cut into n equal parts (P2, #702): beside it one cut into n parts not the same size, and one cut
    // into equal parts of another number. The parts counted without checking they are equal is the slip.
    const n = r.int(2, 4);
    const kind = r.next() < 0.5 ? "circle" : "rect";
    const m = n === 4 ? 3 : n + 1;
    const shapes: { s: CutShape; role: "right" | "unequal" | "other" }[] = shuffled(r, [
      { s: { kind, cuts: equalCuts(kind, n) }, role: "right" as const },
      { s: { kind, cuts: UNEQUAL[n][kind] }, role: "unequal" as const },
      { s: { kind, cuts: equalCuts(kind, m) }, role: "other" as const },
    ]);
    const letter = (role: string) => ["A", "B", "C"][shapes.findIndex((x) => x.role === role)];
    return pickText(r, fill(w.fracLine.equalParts, { n }), letter("right"), [{ text: letter("unequal"), id: "unequalParts", vars: { n, right: letter("right") } }], [letter("other")], {
      pic: cutShapes(shapes.map((x) => x.s), ["A", "B", "C"]),
      steps: [`1 = ${Array(n).fill(`\\frac{1}{${n}}`).join(" + ")}`],
    });
  }
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
