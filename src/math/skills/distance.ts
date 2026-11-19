// Practice: Distance and midpoint.
import { fill } from "../chart";
import { sqrtSplit } from "../expr";
import { dp, fr, num, plainFrac, surdTex } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const [x1, y1] = [r.int(-6, 6), r.int(-6, 6)];
  let dx: number, dy: number;
  if (L === 2) {
    const [a, b] = r.pick([[3, 4], [5, 12], [6, 8], [8, 15], [4, 3], [12, 5], [8, 6]] as const);
    [dx, dy] = [a * r.sign(), b * r.sign()];
  } else {
    do [dx, dy] = [r.int(-7, 7), r.int(-7, 7)];
    while (!dx || !dy || (L === 3 && Number.isInteger(Math.hypot(dx, dy))));
  }
  const [x2, y2] = [x1 + dx, y1 + dy];
  const A = `A(${x1}, ${y1})`;
  const B = `B(${x2}, ${y2})`;
  const solution = { kind: "coord" as const, spec: { topic: "points", src: `${A}, ${B}` } };
  if (L === 1) {
    const mx = fr(x1 + x2, 2);
    const my = fr(y1 + y2, 2);
    return { prompt: fill(w.prompts.midpoint, { a: A, b: B }), q: "", answer: { k: "tuple", vs: [mx.toNumber(), my.toNumber()], tol: 1e-9 }, show: `\\left(${mx.tex()}, \\; ${my.tex()}\\right)`, plain: `(${plainFrac(mx)}; ${plainFrac(my)})`, format: "point", solution };
  }
  const d2 = dx * dx + dy * dy;
  const { out, s } = sqrtSplit(fr(d2));
  const v = Math.sqrt(d2);
  return {
    prompt: fill(w.prompts.distance, { a: A, b: B }),
    q: "",
    answer: num(v, L === 2 ? 1e-9 : 0.0051, { surd: true }),
    show: s === 1 ? String(out.n) : `${surdTex(fr(0), out, s)} \\approx ${dp(v, 2)}`,
    plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
    format: L === 2 ? "number" : "exact",
    solution,
  };
};

export default gen;
