// Practice: A first look at Galois groups. Easy finds the order of the Galois group of a splitting field (the
// polynomial's degree, or p for ℚ(ζₚ), named); medium names the group (the Klein group called cyclic, x³ − a's complex
// roots ignored, every permutation of x⁴ − a's roots assumed, named); hard finds the discriminant of x³ + px + q (its
// sign, or 4 and 27 swapped, named) or the Galois group of an irreducible cubic from it (a square discriminant
// ignored, three real roots taken to make it cyclic, named).
import { exact, F, pickOf, sym } from "../calculusTwo";
import { wholeOf } from "../realAnalysis";
import { cubicDiscriminant, isSquare, polyTex } from "../ringsFields";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const Q = "\\mathbb{Q}";

function orderPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 4);
  const a = r.pick([2, 3, 5, 7]);
  if (kind === 0)
    return {
      prompt: w.rf.prompt.galoisOrder,
      q: `f(x) = x^{3} - ${a}`,
      ...wholeOf(6, [["galoisDegreeIsPolyDegree", 3]]),
      steps: [`x^{3} - ${a} = (x - \\sqrt[3]{${a}})(x - \\omega\\sqrt[3]{${a}})(x - \\omega^{2}\\sqrt[3]{${a}})`, `K = ${Q}(\\sqrt[3]{${a}}, \\omega), \\quad [K : ${Q}] = 3 \\cdot 2 = 6`],
    };
  if (kind === 1)
    return {
      prompt: w.rf.prompt.galoisOrder,
      q: `f(x) = x^{4} - ${a}`,
      ...wholeOf(8, [["galoisDegreeIsPolyDegree", 4]]),
      steps: [`x^{4} - ${a} = (x - \\sqrt[4]{${a}})(x + \\sqrt[4]{${a}})(x - i\\sqrt[4]{${a}})(x + i\\sqrt[4]{${a}})`, `K = ${Q}(\\sqrt[4]{${a}}, i), \\quad [K : ${Q}] = 4 \\cdot 2 = 8`],
    };
  if (kind === 2) {
    const p = r.pick([5, 7, 11, 13]);
    return {
      prompt: w.rf.prompt.galoisOrder,
      q: `f(x) = x^{${p}} - 1`,
      ...wholeOf(p - 1, [["cyclotomicDegreeP", p]]),
      steps: [`x^{${p}} - 1 = (x - 1)(x^{${p - 1}} + \\dots + x + 1), \\quad K = ${Q}(\\zeta_{${p}})`, `[K : ${Q}] = ${p} - 1 = ${p - 1}`],
    };
  }
  if (kind === 3) {
    const p = r.pick([3, 5, 7]);
    return {
      prompt: w.rf.prompt.galoisOrder,
      q: `f(x) = x^{${p}} - ${a}`,
      ...wholeOf(p * (p - 1), [["galoisDegreeIsPolyDegree", p]]),
      steps: [`K = ${Q}(\\sqrt[${p}]{${a}}, \\zeta_{${p}})`, `[K : ${Q}] = ${p} \\cdot ${p - 1} = ${p * (p - 1)}`],
    };
  }
  const rest = [2, 3, 5, 7].filter((x) => x !== a);
  const b = r.pick(rest);
  const c = r.pick(rest.filter((x) => x !== b));
  return {
    prompt: w.rf.prompt.galoisOrder,
    q: `f(x) = (x^{2} - ${a})(x^{2} - ${b})(x^{2} - ${c})`,
    ...wholeOf(8, [["galoisDegreeIsPolyDegree", 6]]),
    steps: [`K = ${Q}(\\sqrt{${a}}, \\sqrt{${b}}, \\sqrt{${c}})`, `[K : ${Q}] = 2 \\cdot 2 \\cdot 2 = 8`],
  };
}

/** The groups a question may name, in the order shown. */
const GROUPS = [
  sym("\\mathbb{Z}_{2}", "Z2"),
  sym("\\mathbb{Z}_{3}", "Z3"),
  sym("\\mathbb{Z}_{4}", "Z4"),
  sym("\\mathbb{Z}_{2} \\times \\mathbb{Z}_{2}", "Z2 x Z2"),
  sym("\\mathbb{Z}_{6}", "Z6"),
  sym("S_{3}", "S3"),
  sym("D_{4}", "D4"),
  sym("S_{4}", "S4"),
];
const G = (plain: string) => GROUPS.findIndex((g) => g.plain === plain);

function groupPart(r: Rng, w: PracticeWords): Part {
  const a = r.pick([2, 3, 5, 7]);
  const b = r.pick([2, 3, 5, 7].filter((x) => x !== a));
  const cases: { prompt: string; q: string; right: number; slip?: [MistakeId, number]; steps: string[] }[] = [
    {
      prompt: w.rf.prompt.galoisGroupOf,
      q: `f(x) = (x^{2} - ${a})(x^{2} - ${b})`,
      right: G("Z2 x Z2"),
      slip: ["kleinCalledCyclic", G("Z4")],
      steps: [`\\sigma(\\sqrt{${a}}) = \\pm\\sqrt{${a}}, \\quad \\sigma(\\sqrt{${b}}) = \\pm\\sqrt{${b}}`, `\\sigma^{2} = \\mathrm{id} \\; (\\sigma \\in G), \\quad |G| = 4`],
    },
    {
      prompt: w.rf.prompt.galoisGroup,
      q: `\\operatorname{Gal}(${Q}(\\zeta_{8}) / ${Q})`,
      right: G("Z2 x Z2"),
      slip: ["kleinCalledCyclic", G("Z4")],
      steps: [`G \\cong \\mathbb{Z}_{8}^{\\times} = \\{1, 3, 5, 7\\}`, `3^{2} \\equiv 5^{2} \\equiv 7^{2} \\equiv 1 \\pmod{8}`],
    },
    {
      prompt: w.rf.prompt.galoisGroup,
      q: `\\operatorname{Gal}(${Q}(\\zeta_{5}) / ${Q})`,
      right: G("Z4"),
      steps: [`G \\cong \\mathbb{Z}_{5}^{\\times} = \\{1, 2, 3, 4\\}`, `2^{1}, 2^{2}, 2^{3}, 2^{4} \\equiv 2, 4, 3, 1 \\pmod{5}`],
    },
    {
      prompt: w.rf.prompt.galoisGroup,
      q: `\\operatorname{Gal}(${Q}(\\zeta_{7}) / ${Q})`,
      right: G("Z6"),
      steps: [`G \\cong \\mathbb{Z}_{7}^{\\times} = \\{1, \\dots, 6\\}`, `3^{1}, \\dots, 3^{6} \\equiv 3, 2, 6, 4, 5, 1 \\pmod{7}`],
    },
    {
      prompt: w.rf.prompt.galoisGroupOf,
      q: `f(x) = x^{3} - ${a}`,
      right: G("S3"),
      slip: ["complexRootsIgnored", G("Z3")],
      steps: [`K = ${Q}(\\sqrt[3]{${a}}, \\omega), \\quad [K : ${Q}] = 6`, `\\sigma(\\sqrt[3]{${a}}) = \\omega\\sqrt[3]{${a}}, \\; \\tau(\\omega) = \\omega^{2}: \\; \\sigma\\tau \\ne \\tau\\sigma`],
    },
    {
      prompt: w.rf.prompt.galoisGroupOf,
      q: `f(x) = x^{4} - ${a}`,
      right: G("D4"),
      slip: ["allPermutationsAssumed", G("S4")],
      steps: [`K = ${Q}(\\sqrt[4]{${a}}, i), \\quad [K : ${Q}] = 8 \\ne 24`, `\\sigma(\\sqrt[4]{${a}}) = i\\sqrt[4]{${a}}, \\; \\tau(i) = -i: \\; |\\sigma| = 4, \\; \\tau\\sigma\\tau = \\sigma^{-1}`],
    },
    {
      prompt: w.rf.prompt.galoisGroup,
      q: `\\operatorname{Gal}(GF(${a}^{4}) / GF(${a}))`,
      right: G("Z4"),
      slip: ["frobeniusNotCyclic", G("Z2 x Z2")],
      steps: [`\\phi(x) = x^{${a}}, \\quad [GF(${a}^{4}) : GF(${a})] = 4`, `G = \\{\\mathrm{id}, \\phi, \\phi^{2}, \\phi^{3}\\} = \\langle \\phi \\rangle`],
    },
  ];
  const c = r.pick(cases);
  return { prompt: c.prompt, q: c.q, ...pickOf(GROUPS, c.right, c.slip ? [c.slip] : []), steps: c.steps };
}

/** Irreducible cubics x³ + px + q: [p, q]. Square discriminants give A₃ ≅ ℤ₃, the rest S₃. */
const CUBICS: [number, number][] = [[-3, 1], [-3, -1], [-7, 7], [-7, -7], [-21, 7], [-21, -7], [-4, 2], [-6, 2], [-5, 1], [-6, 3], [0, -2], [-1, -1], [1, 1], [2, 2], [-3, 3], [3, 1]];

function cubicPart(r: Rng, w: PracticeWords): Part {
  const paren = (x: number) => (x < 0 ? `(${x})` : String(x));
  if (r.int(0, 1) === 0) {
    for (;;) {
      const p = r.nz(-6, 6);
      const q = r.nz(-5, 5);
      const D = cubicDiscriminant(p, q);
      if (D === 0) continue;
      return {
        prompt: w.rf.prompt.discriminant,
        q: `f(x) = ${polyTex([q, p, 0, 1])}`,
        ...exact(F(D), [["discriminantSignSlip", -D], ["discriminantCoefficientsSwapped", -27 * p ** 3 - 4 * q * q]]),
        steps: [`D = -4p^{3} - 27q^{2}`, `= -4 \\cdot ${paren(p)}^{3} - 27 \\cdot ${paren(q)}^{2} = ${D}`],
      };
    }
  }
  const [p, q] = r.pick(CUBICS);
  const D = cubicDiscriminant(p, q);
  const square = isSquare(D);
  const options = [GROUPS[G("Z3")], GROUPS[G("S3")]];
  const slip: [MistakeId, number][] = square ? [["discriminantIgnored", 1]] : D > 0 ? [["realRootsMeansCyclic", 0]] : [];
  return {
    prompt: w.rf.prompt.cubicGroup,
    q: `f(x) = ${polyTex([q, p, 0, 1])}`,
    ...pickOf(options, square ? 0 : 1, slip),
    steps: [
      `D = -4 \\cdot ${paren(p)}^{3} - 27 \\cdot ${paren(q)}^{2} = ${D}`,
      square ? `\\sqrt{${D}} = ${Math.round(Math.sqrt(D))} \\in ${Q} \\Rightarrow G = A_{3} \\cong \\mathbb{Z}_{3}` : `\\sqrt{${D}} \\notin ${Q} \\Rightarrow G = S_{3}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? orderPart(r, w) : L === 2 ? groupPart(r, w) : cubicPart(r, w));

export default gen;
