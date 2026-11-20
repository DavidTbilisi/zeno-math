// Practice: normal forms. Easy counts the rows of P, Q, R that make a statement true (an "if … then" false when its
// first part is false, "or" read as one but not both, named); medium counts the terms of its full disjunctive or the
// clauses of its full conjunctive normal form (the one for the other, named); hard sorts a statement into tautology,
// satisfiable or unsatisfiable (satisfiable called a tautology after one true row, named), or picks the resolvent of
// two clauses (the two clauses joined with "and", the variable resolved on kept, named).
import { exact, F, pickOf, sym, word, type NumSlip } from "../calculusTwo";
import { shuffled } from "../logicSets";
import {
  CLASS_FORMULAS,
  COUNT_FORMULAS,
  ROWS3,
  clauseTex,
  clauseText,
  f3Tex,
  kindOf,
  litText,
  models,
  resolvent,
  value,
  type F3,
  type Kind,
  type Lit,
} from "../foundations";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const rowTex = (row: readonly boolean[]) => row.map((b) => (b ? "T" : "F")).join("");
/** The rows that make f true and those that make it false, written out. */
const rowSteps = (f: F3) => {
  const t = ROWS3.filter((row) => value(f, row));
  const n = ROWS3.filter((row) => !value(f, row));
  return [`PQR \\text{ true: } ${t.map(rowTex).join(", ") || "\\text{none}"}`, `PQR \\text{ false: } ${n.map(rowTex).join(", ") || "\\text{none}"}`];
};
const slipsOf = (f: F3): NumSlip[] => [["vacuousTruth", models(f, "vacuous")], ["exclusiveOr", models(f, "exclusive")]];

function modelsPart(r: Rng, w: PracticeWords): Part {
  const f = r.pick(COUNT_FORMULAS);
  const v = models(f);
  return { prompt: w.fo.prompt.models, q: f3Tex(f), ...exact(F(v), slipsOf(f)), steps: [...rowSteps(f), `${v} \\text{ of } 8`] };
}

function normalFormPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const f = r.pick(COUNT_FORMULAS);
    const m = models(f);
    if (m === 4) continue;
    const dnf = r.next() < 0.5;
    const v = dnf ? m : 8 - m;
    return {
      prompt: dnf ? w.fo.prompt.dnf : w.fo.prompt.cnf,
      q: f3Tex(f),
      ...exact(F(v), [["dnfCnfSwapped", 8 - v], ...slipsOf(f).map(([id, x]): NumSlip => [id, dnf ? x : 8 - (x as number)])]),
      steps: [
        ...rowSteps(f),
        dnf ? `\\text{one term per true row: } ${m}` : `\\text{one clause per false row: } 8 - ${m} = ${8 - m}`,
      ],
    };
  }
}

const KINDS: readonly Kind[] = ["tautology", "satisfiable", "unsatisfiable"];

function classifyPart(r: Rng, w: PracticeWords): Part {
  const f = r.pick(CLASS_FORMULAS);
  const kind = kindOf(f);
  const m = models(f);
  return {
    prompt: w.fo.prompt.classify,
    q: f3Tex(f),
    ...pickOf(KINDS.map((k) => word(w.fo.classes[k])), KINDS.indexOf(kind), [["satisfiableAsTautology", kind === "satisfiable" ? 0 : 1]]),
    steps: [...rowSteps(f), `${m} \\text{ of } 8 \\text{ rows true}`],
  };
}

function resolvePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const v = r.int(0, 2) as 0 | 1 | 2;
    const rest = ([0, 1, 2] as const).filter((x) => x !== v);
    const side = (): Lit[] => shuffled(r, rest).slice(0, r.int(1, 2)).map((x) => ({ v: x, neg: r.next() < 0.5 }));
    const [ra, rb] = [side(), side()];
    if (ra.some((l) => rb.some((m) => m.v === l.v && m.neg !== l.neg))) continue;
    const a: Lit[] = shuffled(r, [{ v, neg: false }, ...ra]);
    const b: Lit[] = shuffled(r, [{ v, neg: true }, ...rb]);
    const res = resolvent(a, b, v);
    if (res.length < 2) continue;
    const all = [{ v, neg: false }, { v, neg: true }, ...res];
    const texts = [clauseText(res), clauseText(res, "∧"), clauseText(all), clauseText(ra)];
    if (new Set(texts).size < 4) continue;
    const opts = [sym(clauseTex(res), texts[0]), sym(clauseTex(res, "\\land"), texts[1]), sym(clauseTex(all), texts[2]), sym(clauseTex(ra), texts[3])];
    const order = shuffled(r, [0, 1, 2, 3]);
    const pivot = litText({ v, neg: false });
    return {
      prompt: fill(w.fo.prompt.resolve, { v: pivot }),
      q: `C_1 = ${clauseTex(a)}, \\quad C_2 = ${clauseTex(b)}`,
      ...pickOf(order.map((i) => opts[i]), order.indexOf(0), [["resolventConjoined", order.indexOf(1)], ["pivotKept", order.indexOf(2)]]),
      steps: [
        `C_1 \\text{ has } ${pivot}, \\ C_2 \\text{ has } \\lnot ${pivot}: \\text{ one of } ${clauseTex(ra)}, \\ ${clauseTex(rb)} \\text{ must hold}`,
        `${clauseTex(ra)} \\lor ${clauseTex(rb)} = ${clauseTex(res)}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? modelsPart(r, w) : L === 2 ? normalFormPart(r, w) : r.next() < 0.5 ? classifyPart(r, w) : resolvePart(r, w));

export default gen;
