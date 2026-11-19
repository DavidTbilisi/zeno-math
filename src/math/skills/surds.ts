// Practice: Surds.
import { fr, num, plainFrac, surdTex } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const M = [2, 3, 5, 6, 7, 10, 11];
  if (L === 1) {
    const [k, m] = [r.int(2, 6), r.pick(M)];
    const n = k * k * m;
    return { prompt: w.prompts.surds, q: `\\sqrt{${n}}`, answer: num(k * Math.sqrt(m), 1e-9, { surd: true }), show: `${k}\\sqrt{${m}}`, plain: `${k}sqrt(${m})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src: `√${n}` } } };
  }
  if (L === 2) {
    const m = r.pick(M.slice(0, 4));
    let c: number[];
    do c = [r.int(1, 5), r.int(1, 5), r.int(1, 5)];
    while (c[0] + c[1] - c[2] === 0 || c[0] === c[1] || c[1] === c[2] || c[0] === c[2]);
    const k = c[0] + c[1] - c[2];
    const ns = c.map((x) => x * x * m);
    const src = `√${ns[0]} + √${ns[1]} - √${ns[2]}`;
    return { prompt: w.prompts.surds, q: `\\sqrt{${ns[0]}} + \\sqrt{${ns[1]}} - \\sqrt{${ns[2]}}`, answer: num(k * Math.sqrt(m), 1e-9, { surd: true }), show: surdTex(fr(0), fr(k), m), plain: `${k}sqrt(${m})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src } } };
  }
  if (r.next() < 0.5) {
    const [a, b] = [r.int(1, 12), r.pick([2, 3, 5, 6, 7])];
    if (a % b === 0 && a / b === 1) return gen(r, 3, w);
    const coef = fr(a, b);
    return { prompt: w.prompts.rationalise, q: `\\frac{${a}}{\\sqrt{${b}}}`, answer: num(a / Math.sqrt(b), 1e-9, { surd: true }), show: surdTex(fr(0), coef, b), plain: `(${a}/${b})sqrt(${b})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src: `${a} / √${b}` } } };
  }
  const [a, b, c] = [r.int(1, 6), r.int(2, 5), r.pick([2, 3, 5, 7])];
  const den = b * b - c;
  const p = fr(a * b, den);
  const q = fr(a, den);
  return {
    prompt: w.prompts.rationalise,
    q: `\\frac{${a}}{${b} - \\sqrt{${c}}}`,
    answer: num(a / (b - Math.sqrt(c)), 1e-9, { surd: true }),
    show: surdTex(p, q, c),
    plain: `${plainFrac(p).replace(/^(.*)$/, "($1)")} + (${plainFrac(q)})sqrt(${c})`,
    format: "exact",
    solution: { kind: "powers", spec: { topic: "surds", src: `${a} / (${b} - √${c})` } },
  };
};

export default gen;
