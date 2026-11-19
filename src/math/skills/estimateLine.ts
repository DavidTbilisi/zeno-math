// Practice: Number line estimation.
import { fill, r2 } from "../chart";
import { encodePin, estimateTask, lineSvg, numText, shareAlong } from "../estimate";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Where a number goes on a line with only its ends labelled; the answer is the pin's place (src/math/estimate.ts).
  const t = estimateTask(L, r.next);
  const { from, to } = t.play;
  const share = shareAlong(t.play, t.v);
  const s3 = Number(share.toFixed(3));
  const eq = s3 === share ? "=" : "\\approx";
  const lines: string[] = [];
  if (from < 0) lines.push(`\\frac{${t.tex} - (${from})}{${to} - (${from})} = \\frac{${t.v - from}}{${to - from}} ${eq} ${s3}`);
  else if (to !== 1) lines.push(`\\frac{${t.tex}}{${to}} ${eq} ${s3}`);
  else if (t.tex.startsWith("\\frac")) lines.push(`${t.tex} ${eq} ${s3}`);
  lines.push(`${s3} ${share < 0.5 ? "<" : share > 0.5 ? ">" : "="} \\frac{1}{2}`);
  const line = lineSvg(t.play);
  return {
    prompt: fill(w.prompts.estimatePlace, { a: numText(from), b: numText(to) }),
    q: t.tex,
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${line.body}</g>`, h: line.h, w: line.w },
    play: { kind: "pin", ...t.play },
    answer: { k: "pin", play: t.play, v: t.v },
    show: lines[0],
    plain: encodePin(t.play, t.v),
    format: "pin",
    solution: { kind: "pin", spec: { play: t.play, v: t.v, text: t.text, steps: lines } },
  };
};

export default gen;
