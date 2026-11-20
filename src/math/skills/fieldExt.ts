// Practice: Field extensions. Easy finds the degree [ℚ(α, β) : ℚ] by the tower law (the degrees added, or a root that
// already lies in the other field counted again, named); medium finds the minimal polynomial over ℚ of c + √d, √a + √b
// or ∛a + c (the sign of c, the constant c² + d, or (x² − a − b)² without the cross term, named); hard finds the
// inverse of a + b√d in ℚ(√d) (the conjugate not divided by the norm, or no conjugate taken, named).
import { type NumSlip, numTraps } from "../calculusTwo";
import { num } from "../practiceKit";
import { fnOf } from "../odes";
import { wholeOf } from "../realAnalysis";
import { gcd } from "../groups";
import { mulPoly, polyPlain, polyTex, surdPlain, surdTex } from "../ringsFields";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const rootTex = (n: number, a: number) => (n === 2 ? `\\sqrt{${a}}` : `\\sqrt[${n}]{${a}}`);
const Q = "\\mathbb{Q}";

function degreePart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.6) {
    const [n, m] = r.pick([[2, 3], [3, 2], [2, 2], [3, 3], [2, 5]]);
    const a = r.pick([2, 3, 5, 7]);
    const b = r.pick([2, 3, 5, 7].filter((x) => x !== a));
    const [A, B] = [rootTex(n, a), rootTex(m, b)];
    const v = n * m;
    return {
      prompt: w.rf.prompt.degree,
      q: `[${Q}(${A}, ${B}) : ${Q}]`,
      ...wholeOf(v, [["degreesAdded", n + m]]),
      steps: [
        `[${Q}(${A}) : ${Q}] = ${n}, \\quad [${Q}(${A}, ${B}) : ${Q}(${A})] = ${m}`,
        `[${Q}(${A}, ${B}) : ${Q}] = ${m} \\cdot ${n} = ${v}`,
      ],
    };
  }
  // β already lies in ℚ(α): the degree is α's alone.
  const a = r.pick([2, 3, 5]);
  const k = r.pick([2, 3]);
  const c = r.pick([
    { n: 2, A: `\\sqrt{${a}}`, B: `\\sqrt{${a * k * k}}`, m: 2, why: `\\sqrt{${a * k * k}} = ${k}\\sqrt{${a}}` },
    { n: 4, A: `\\sqrt[4]{${a}}`, B: `\\sqrt{${a}}`, m: 2, why: `\\sqrt{${a}} = (\\sqrt[4]{${a}})^{2}` },
    { n: 6, A: `\\sqrt[6]{${a}}`, B: `\\sqrt[3]{${a}}`, m: 3, why: `\\sqrt[3]{${a}} = (\\sqrt[6]{${a}})^{2}` },
    { n: 6, A: `\\sqrt[6]{${a}}`, B: `\\sqrt{${a}}`, m: 2, why: `\\sqrt{${a}} = (\\sqrt[6]{${a}})^{3}` },
  ]);
  return {
    prompt: w.rf.prompt.degree,
    q: `[${Q}(${c.A}, ${c.B}) : ${Q}]`,
    ...wholeOf(c.n, [["dependentRootsCounted", c.n * c.m]]),
    steps: [`${c.why} \\in ${Q}(${c.A}) \\Rightarrow ${Q}(${c.A}, ${c.B}) = ${Q}(${c.A})`, `[${Q}(${c.A}) : ${Q}] = \\deg(x^{${c.n}} - ${a}) = ${c.n}`],
  };
}

function minimalPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  if (kind === 0) {
    const c = r.nz(-4, 4);
    const d = r.pick([2, 3, 5, 6, 7]);
    const f = [c * c - d, -2 * c, 1];
    return {
      prompt: w.rf.prompt.minimal,
      q: `\\alpha = ${surdTex(c, 1, d)}`,
      ...fnOf(polyPlain(f), [["minimalSignSlip", polyPlain([c * c - d, 2 * c, 1])], ["minimalConstantSlip", polyPlain([c * c + d, -2 * c, 1])]]),
      steps: [`\\alpha ${c < 0 ? "+" : "-"} ${Math.abs(c)} = \\sqrt{${d}} \\Rightarrow (\\alpha ${c < 0 ? "+" : "-"} ${Math.abs(c)})^{2} = ${d}`, `${polyTex(f, "\\alpha")} = 0`],
    };
  }
  if (kind === 1) {
    const a = r.pick([2, 3, 5]);
    const b = r.pick([3, 5, 7].filter((x) => x > a));
    const f = [(a - b) ** 2, 0, -2 * (a + b), 0, 1];
    return {
      prompt: w.rf.prompt.minimal,
      q: `\\alpha = \\sqrt{${a}} + \\sqrt{${b}}`,
      ...fnOf(polyPlain(f), [["minimalSignSlip", polyPlain([(a - b) ** 2, 0, 2 * (a + b), 0, 1])], ["crossTermDropped", polyPlain([(a + b) ** 2, 0, -2 * (a + b), 0, 1])]]),
      steps: [`\\alpha^{2} = ${a + b} + 2\\sqrt{${a * b}}`, `(\\alpha^{2} - ${a + b})^{2} = ${4 * a * b}`, `${polyTex(f, "\\alpha")} = 0`],
    };
  }
  const a = r.pick([2, 3, 5]);
  const c = r.nz(-2, 2);
  // (x − c)³ − a
  const cube = mulPoly(mulPoly([-c, 1], [-c, 1]), [-c, 1]);
  const f = [cube[0] - a, ...cube.slice(1)];
  const cubePlus = mulPoly(mulPoly([c, 1], [c, 1]), [c, 1]);
  return {
    prompt: w.rf.prompt.minimal,
    q: `\\alpha = ${c} + \\sqrt[3]{${a}}`.replace("+ -", "- "),
    ...fnOf(polyPlain(f), [["minimalSignSlip", polyPlain([cubePlus[0] - a, ...cubePlus.slice(1)])]]),
    steps: [`(\\alpha ${c < 0 ? "+" : "-"} ${Math.abs(c)})^{3} = ${a}`, `${polyTex(f, "\\alpha")} = 0`],
  };
}

function inversePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const d = r.pick([2, 3, 5, 6, 7]);
    const a = r.nz(-5, 5);
    const b = r.nz(-3, 3);
    const N = a * a - d * b * b;
    if (Math.abs(N) > 40 || Math.abs(N) === 1) continue;
    // (a − b√d)/N, in lowest terms with a positive denominator
    const g = gcd(gcd(Math.abs(a), Math.abs(b)), Math.abs(N)) * Math.sign(N);
    const [A, B, D] = [a / g, -b / g, N / g];
    const v = (A + B * Math.sqrt(d)) / D;
    const slips: NumSlip[] = [["normNotDivided", a - b * Math.sqrt(d)], ["conjugateNotTaken", (a + b * Math.sqrt(d)) / N]];
    const top = surdTex(A, B, d);
    const show = D === 1 ? top : `\\frac{${top}}{${D}}`;
    const traps = numTraps(v, slips);
    return {
      prompt: fill(w.rf.prompt.inverse, { d }),
      q: `\\alpha = ${surdTex(a, b, d)}`,
      answer: { ...num(v), ...(traps.length ? { traps } : {}) },
      show,
      plain: D === 1 ? surdPlain(A, B, d) : `(${surdPlain(A, B, d)})/${D}`,
      format: "exact",
      steps: [
        `\\frac{1}{${surdTex(a, b, d)}} \\cdot \\frac{${surdTex(a, -b, d)}}{${surdTex(a, -b, d)}}`,
        `= \\frac{${surdTex(a, -b, d)}}{${a < 0 ? `(${a})` : a}^{2} - ${d} \\cdot ${b < 0 ? `(${b})` : b}^{2}} = ${show}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? degreePart(r, w) : L === 2 ? minimalPart(r, w) : inversePart(r, w));

export default gen;
