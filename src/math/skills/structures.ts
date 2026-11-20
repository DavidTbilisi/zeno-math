// Practice: structures. Easy counts the x in {1, …, n} that make ∀y R(x, y) or ∃y R(x, y) true for a relation given
// by a rule (∀ read as ∃ or the other way, the arguments of R swapped, named); medium picks the free variables of a
// formula (a variable bound in one place taken as bound everywhere, every quantified variable counted free, named);
// hard counts the relations on an n-element set that are models of reflexivity, irreflexivity or symmetry (all 2^(n²)
// relations, the off-diagonal pairs taken in order, the diagonal forgotten, named).
import { exact, F, pickOf, sym, type NumSlip } from "../calculusTwo";
import { shuffled } from "../logicSets";
import { AXIOM_SETS, FREE_ITEMS, FREE_POOL, RULES, countX, type Quant } from "../foundations";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const QTEX: Record<Quant, string> = { all: "\\forall", some: "\\exists" };

function countPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const rule = r.pick(RULES);
    const n = r.int(4, 6);
    const q: Quant = r.next() < 0.5 ? "all" : "some";
    const v = countX(rule, n, q, false);
    const other = countX(rule, n, q === "all" ? "some" : "all", false);
    const swapped = countX(rule, n, q, true);
    if (other === v && swapped === v) continue;
    const ys = (x: number) => Array.from({ length: n }, (_, i) => i + 1).filter((y) => rule.holds(x, y, n));
    return {
      prompt: w.fo.prompt.count,
      q: `D = \\{1, \\dots, ${n}\\}, \\quad R(x, y) \\iff ${rule.tex(n)}, \\quad ${QTEX[q]} y\\, R(x, y)`,
      ...exact(F(v), [["forallForExists", other], ["argumentsSwapped", swapped]]),
      steps: [
        ...Array.from({ length: n }, (_, i) => {
          const x = i + 1;
          const s = ys(x);
          const ok = q === "all" ? s.length === n : s.length > 0;
          return `x = ${x}: \\ \\{y : R(${x}, y)\\} = ${s.length ? `\\{${s.join(", ")}\\}` : "\\varnothing"} \\ ${ok ? "\\checkmark" : "\\times"}`;
        }),
        `${v} \\text{ of } ${n}`,
      ],
    };
  }
}

const setTex = (s: string) => (s === "∅" ? "\\varnothing" : s.replace("{", "\\{").replace("}", "\\}"));

function freePart(r: Rng, w: PracticeWords): Part {
  const item = r.pick(FREE_ITEMS);
  const named = [item.free, item.boundOnce, item.allFree].filter((x): x is string => !!x);
  const others = shuffled(r, FREE_POOL.filter((x) => !named.includes(x))).slice(0, 4 - named.length);
  const texts = shuffled(r, [...named, ...others]);
  const slips: [MistakeIdOf, number][] = [];
  if (item.boundOnce) slips.push(["boundOnceBoundEverywhere", texts.indexOf(item.boundOnce)]);
  if (item.allFree) slips.push(["quantifiedCountedFree", texts.indexOf(item.allFree)]);
  return {
    prompt: w.fo.prompt.free,
    q: item.tex,
    ...pickOf(texts.map((t) => sym(setTex(t), t)), texts.indexOf(item.free), slips),
    steps: [item.why, `\\text{free: } ${setTex(item.free)}`],
  };
}
type MistakeIdOf = "boundOnceBoundEverywhere" | "quantifiedCountedFree";

function relationsPart(r: Rng, w: PracticeWords): Part {
  const ax = r.pick(AXIOM_SETS);
  const n = r.int(2, 4);
  const k = ax.free(n);
  const slips: NumSlip[] = [];
  if (ax.all) slips.push(["allRelationsCounted", 2 ** (n * n)]);
  if (ax.ordered) slips.push(["symmetricPairsOrdered", 2 ** (n * n - n)]);
  if (ax.diagonal) slips.push(["diagonalForgotten", 2 ** ((n * (n - 1)) / 2)]);
  return {
    prompt: fill(w.fo.prompt.relations, { n }),
    q: ax.tex,
    ...exact(F(2 ** k), slips),
    steps: [
      `R \\subseteq D \\times D: \\ ${n}^2 = ${n * n} \\text{ pairs}`,
      `\\text{pairs free to choose: } ${ax.freeTex.replace(/n/g, String(n)).replace(/(\d)\(/g, "$1 \\cdot (")} = ${k}`,
      `2^{${k}} = ${2 ** k}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? countPart(r, w) : L === 2 ? freePart(r, w) : relationsPart(r, w));

export default gen;
