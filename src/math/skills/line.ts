// Practice: Equation of a line.
import { fill } from "../chart";
import { fromPoly, tex } from "../expr";
import { fr, plainFrac, polyStr } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const pt = (x: number, y: number) => `(${x}, ${y})`;
  if (L < 3) {
    const x1 = r.int(-5, 5);
    const y1 = r.int(-5, 5);
    let dx = r.int(1, 4);
    let dy = L === 1 ? r.nz(-4, 4) * dx : r.nz(-7, 7);
    if (L === 2 && dy % dx === 0) dx = dx === 1 ? 2 : dx + 1;
    if (L === 2 && dy % dx === 0) dy += 1;
    const [x2, y2] = [x1 + dx, y1 + dy];
    const m = fr(dy, dx);
    const c = fr(y1).sub(m.mul(fr(x1)));
    const e = fromPoly([c, m]);
    return {
      prompt: fill(w.prompts.line, { a: pt(x1, y1), b: pt(x2, y2) }),
      q: "",
      answer: { k: "expr", e, mode: "line" },
      show: `y = ${tex(e)}`,
      plain: `y = (${plainFrac(m)})x + (${plainFrac(c)})`,
      format: "line",
      solution: { kind: "coord", spec: { topic: "line", src: `${pt(x1, y1)}, ${pt(x2, y2)}` } },
    };
  }
  const m0 = fr(r.nz(-4, 4), r.pick([1, 1, 2, 3]));
  const c0 = r.int(-6, 6);
  const [px, py] = [r.int(-5, 5), r.int(-5, 5)];
  const m = fr(-1).div(m0);
  const c = fr(py).sub(m.mul(fr(px)));
  const given = fromPoly([fr(c0), m0]);
  const givenSrc = `y = ${m0.d === 1 ? polyStr([c0, m0.n]) : `${m0.n}/${m0.d}x ${c0 < 0 ? "-" : "+"} ${Math.abs(c0)}`}`;
  const e = fromPoly([c, m]);
  return {
    prompt: fill(w.prompts.perp, { p: pt(px, py) }),
    q: `y = ${tex(given)}`,
    answer: { k: "expr", e, mode: "line" },
    show: `y = ${tex(e)}`,
    plain: `y = (${plainFrac(m)})x + (${plainFrac(c)})`,
    format: "line",
    solution: { kind: "coord", spec: { topic: "perp", src: `${givenSrc}; P${pt(px, py)}` } },
  };
};

export default gen;
