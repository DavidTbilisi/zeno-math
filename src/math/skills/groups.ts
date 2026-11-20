// Practice: Groups. Easy finds an inverse in (ℤₙ, +) or U(n) (the inverse of the other operation, −a left unreduced,
// 1/a, named) or counts the symmetries of a regular polygon (the rotations only, named); medium finds the identity
// and inverses of a made-up operation (the usual 0 or 1, the usual −a or 1/a, solving a ∗ b = 0 or 1, named); hard
// says whether a set with an operation is a group, and if not which axiom fails first (each unchecked axiom named).
import { exact, pickOf, word } from "../calculusTwo";
import { F } from "../realAnalysis";
import { invMod, Zn } from "../groups";
import type { MistakeId } from "../mistakes";
import { plainFrac } from "../practiceKit";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** The inverse of a in (ℤₙ, +) or in U(n), or |Dₙ|. */
function inversePart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  if (kind === 2) {
    const n = r.int(3, 12);
    return {
      prompt: fill(w.group.prompt.dihedral, { n }),
      q: `|D_{${n}}|`,
      ...exact(F(2 * n), [["onlyRotations", n]]),
      steps: [`D_{${n}} = \\{e, r, \\dots, r^{${n - 1}}\\} \\cup \\{s, sr, \\dots, sr^{${n - 1}}\\}`, `|D_{${n}}| = ${n} + ${n} = ${2 * n}`],
    };
  }
  // Moduli where some unit a has a⁻¹ ≠ a and a⁻¹ ≠ n − a, so the slips differ from the answer.
  const n = r.pick([7, 9, 11, 13, 14, 15]);
  const units = Array.from({ length: n - 2 }, (_, i) => i + 2).filter((a) => !Number.isNaN(invMod(a, n)) && invMod(a, n) !== a && n - a !== invMod(a, n));
  const a = r.pick(units);
  if (kind === 0) {
    const v = n - a;
    return {
      prompt: w.group.prompt.addInverse,
      q: `${a} \\in (${Zn(n)}, +)`,
      ...exact(F(v), [["inverseWrongOperation", invMod(a, n)], ["notReducedMod", -a]]),
      steps: [`${a} + b \\equiv 0 \\pmod{${n}}`, `b = ${n} - ${a} = ${v}`, `${a} + ${v} = ${n} \\equiv 0`],
    };
  }
  const v = invMod(a, n);
  return {
    prompt: w.group.prompt.mulInverse,
    q: `${a} \\in U(${n}) = (${Zn(n)}^{\\times}, \\cdot)`,
    ...exact(F(v), [["inverseWrongOperation", n - a], ["reciprocalNotMod", F(1, a)]]),
    steps: [`${a} \\cdot b \\equiv 1 \\pmod{${n}}`, `${a} \\cdot ${v} = ${a * v} = ${Math.floor((a * v) / n)} \\cdot ${n} + 1`, `${a}^{-1} = ${v}`],
  };
}

/** The identity and inverses of a ∗ b = a + b + k on ℤ, a + b + ab on ℚ ∖ {−1}, or ab/k on ℚ⁺. */
function operationPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  const askIdentity = kind !== 1 && r.int(0, 1) === 0;
  if (kind === 0) {
    const k = r.nz(-5, 5);
    const op = `a \\ast b = a + b ${k > 0 ? "+" : "-"} ${Math.abs(k)}, \\quad a, b \\in \\mathbb{Z}`;
    if (askIdentity)
      return {
        prompt: w.group.prompt.identity,
        q: op,
        ...exact(F(-k), [["identityIsUsual", 0]]),
        steps: [`a \\ast e = a + e ${k > 0 ? "+" : "-"} ${Math.abs(k)} = a`, `e = ${-k}`],
      };
    const a = r.nz(-6, 9);
    const v = -a - 2 * k;
    return {
      prompt: fill(w.group.prompt.inverse, { a }),
      q: op,
      ...exact(F(v), [["inverseIsUsual", -a], ["inverseOfUsualIdentity", -a - k]]),
      steps: [`e = ${-k}`, `${a} \\ast b = ${a} + b ${k > 0 ? "+" : "-"} ${Math.abs(k)} = ${-k}`, `b = ${v}`],
    };
  }
  if (kind === 1) {
    const aF = r.pick([F(1), F(2), F(3), F(4), F(5), F(-3), F(-4), F(1, 2), F(1, 3)]);
    const v = aF.neg().div(aF.add(F(1)));
    return {
      prompt: fill(w.group.prompt.inverse, { a: plainFrac(aF) }),
      q: `a \\ast b = a + b + ab, \\quad a, b \\in \\mathbb{Q} \\setminus \\{-1\\}`,
      ...exact(v, [["inverseIsUsual", aF.neg()], ["inverseOfUsualIdentity", F(1).sub(aF).div(aF.add(F(1)))]]),
      steps: [`a \\ast 0 = a + 0 + 0 = a, \\quad e = 0`, `${aF.tex()} + b + ${aF.tex()}\\,b = 0`, `b = \\frac{-${paren(aF.tex())}}{1 + ${paren(aF.tex())}} = ${v.tex()}`],
    };
  }
  const k = r.pick([2, 3, 4, 5, 6]);
  const op = `a \\ast b = \\frac{ab}{${k}}, \\quad a, b \\in \\mathbb{Q}^{+}`;
  if (askIdentity)
    return {
      prompt: w.group.prompt.identity,
      q: op,
      ...exact(F(k), [["identityIsUsual", 1]]),
      steps: [`a \\ast e = \\frac{ae}{${k}} = a`, `e = ${k}`],
    };
  const a = r.pick([1, 2, 3, 4, 5, 6, 8, 9].filter((x) => x !== k));
  const v = F(k * k, a);
  return {
    prompt: fill(w.group.prompt.inverse, { a }),
    q: op,
    ...exact(v, [["inverseIsUsual", F(1, a)], ["inverseOfUsualIdentity", F(k, a)]]),
    steps: [`e = ${k}`, `\\frac{${a}\\,b}{${k}} = ${k}`, `b = \\frac{${k * k}}{${a}} = ${v.tex()}`],
  };
}

const paren = (t: string) => (t.startsWith("-") || t.includes("frac") ? `\\left(${t}\\right)` : t);

/** Is it a group, and if not, the first axiom that fails (closure, associativity, identity, inverses)? */
function axiomsPart(r: Rng, w: PracticeWords): Part {
  const [G, C, A, I, V] = [0, 1, 2, 3, 4];
  const cases: { q: string; right: number; slip: [MistakeId, number]; step: string }[] = [
    { q: "(\\mathbb{Z}, -)", right: A, slip: ["associativityNotChecked", G], step: "(1 - 2) - 3 = -4 \\ne 1 - (2 - 3) = 2" },
    { q: "(\\{0, 1, 2, \\dots\\}, +)", right: V, slip: ["inversesNotChecked", G], step: "1 + b = 0 \\Rightarrow b = -1 \\notin \\{0, 1, 2, \\dots\\}" },
    { q: "(\\mathbb{Z}, \\cdot)", right: V, slip: ["inversesNotChecked", G], step: "2 \\cdot b = 1 \\Rightarrow b = \\tfrac{1}{2} \\notin \\mathbb{Z}" },
    { q: "(M_{2}(\\mathbb{R}), \\cdot)", right: V, slip: ["inversesNotChecked", G], step: "\\det \\begin{pmatrix} 1 & 0 \\\\ 0 & 0 \\end{pmatrix} = 0 \\Rightarrow \\nexists A^{-1}" },
    { q: "(\\{0, 1, \\dots, 6\\}, \\cdot \\bmod 7)", right: V, slip: ["inversesNotChecked", G], step: "0 \\cdot b = 0 \\ne 1 \\quad \\forall b" },
    { q: "(\\{1, 2, 3, 4, 5\\}, \\cdot \\bmod 6)", right: C, slip: ["closureNotChecked", G], step: "2 \\cdot 3 = 6 \\equiv 0 \\notin \\{1, \\dots, 5\\}" },
    { q: "(2\\mathbb{Z} + 1, +)", right: C, slip: ["closureNotChecked", G], step: "1 + 3 = 4 \\notin 2\\mathbb{Z} + 1" },
    { q: "(\\{1, 2, \\dots, 6\\}, \\cdot \\bmod 7)", right: G, slip: ["groupAxiomsHold", V], step: "1 \\cdot 1 = 2 \\cdot 4 = 3 \\cdot 5 = 6 \\cdot 6 \\equiv 1" },
    { q: "(2\\mathbb{Z}, +)", right: G, slip: ["groupAxiomsHold", I], step: "0 \\in 2\\mathbb{Z}, \\quad -2k \\in 2\\mathbb{Z}" },
    { q: "(\\mathbb{Q} \\setminus \\{0\\}, \\cdot)", right: G, slip: ["groupAxiomsHold", V], step: "e = 1, \\quad \\left(\\tfrac{p}{q}\\right)^{-1} = \\tfrac{q}{p}" },
    { q: "(\\{1, -1, i, -i\\}, \\cdot)", right: G, slip: ["groupAxiomsHold", C], step: "i \\cdot i = -1, \\; i \\cdot (-i) = 1, \\; e = 1" },
    { q: "(\\mathbb{Z}, \\ast), \\quad a \\ast b = a + b + 1", right: G, slip: ["identityIsUsual", I], step: "e = -1, \\quad a^{-1} = -a - 2" },
  ];
  const c = r.pick(cases);
  const ax = w.group.axioms;
  const options = [ax.group, ax.closure, ax.associative, ax.identity, ax.inverses].map(word);
  return {
    prompt: w.group.prompt.isGroup,
    q: c.q,
    ...pickOf(options, c.right, [c.slip]),
    steps: [c.step, `\\text{${options[c.right].text}}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? inversePart(r, w) : L === 2 ? operationPart(r, w) : axiomsPart(r, w));

export default gen;
