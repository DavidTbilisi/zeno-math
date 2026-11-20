// Practice: Inclusion–exclusion. Easy finds |A ∪ B ∪ C| from the sizes and overlaps (the triple overlap left out, or
// the overlaps not subtracted, named); medium counts the numbers up to N divisible by one of two or three divisors,
// or by none of them (the overlaps not taken off, the complement not taken, named); hard counts derangements, or the
// permutations with exactly k fixed points (Dₙ guessed as n!/2, the rest not deranged, named).
import { choose, derangements, divisibleCount, factorial } from "../discrete";
import { wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function unionPart(r: Rng, w: PracticeWords): Part {
  const abc = r.int(1, 4);
  const [ab, ac, bc] = [abc + r.int(1, 5), abc + r.int(1, 5), abc + r.int(1, 5)];
  const [a, b, c] = [ab + ac - abc + r.int(3, 12), ab + bc - abc + r.int(3, 12), ac + bc - abc + r.int(3, 12)];
  const v = a + b + c - ab - ac - bc + abc;
  return {
    prompt: w.dm.prompt.union,
    q: `|A| = ${a}, \\; |B| = ${b}, \\; |C| = ${c}, \\quad |A \\cap B| = ${ab}, \\; |A \\cap C| = ${ac}, \\; |B \\cap C| = ${bc}, \\quad |A \\cap B \\cap C| = ${abc}`,
    ...wholeOf(v, [["tripleNotAdded", v - abc], ["intersectionsNotSubtracted", a + b + c]]),
    steps: [`|A \\cup B \\cup C| = |A| + |B| + |C| - |A \\cap B| - |A \\cap C| - |B \\cap C| + |A \\cap B \\cap C|`, `${a} + ${b} + ${c} - ${ab} - ${ac} - ${bc} + ${abc} = ${v}`],
  };
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const fl = (N: number, d: number) => `\\left\\lfloor \\frac{${N}}{${d}} \\right\\rfloor`;

function divisiblePart(r: Rng, w: PracticeWords): Part {
  const three = r.next() < 0.5;
  const ds = three ? r.pick([[2, 3, 5], [2, 3, 7], [3, 5, 7], [2, 5, 7]]) : r.pick([[2, 3], [3, 5], [4, 6], [2, 5], [3, 7], [6, 10]]);
  const N = r.pick([60, 100, 120, 150, 200, 210, 300]);
  const any = divisibleCount(N, ds);
  const none = r.next() < 0.5;
  const singles = ds.map((d) => Math.floor(N / d));
  const pairs = ds.flatMap((d, i) => ds.slice(i + 1).map((e) => lcm(d, e)));
  const sumSingles = singles.reduce((s, x) => s + x, 0);
  const v = none ? N - any : any;
  const slips: [MistakeId, number][] = [["overlapNotSubtracted", none ? N - sumSingles : sumSingles]];
  if (none) slips.push(["complementNotTaken", any]);
  const all = ds.reduce(lcm);
  const count = `${ds.map((d) => fl(N, d)).join(" + ")} - ${pairs.map((l) => fl(N, l)).join(" - ")}${three ? ` + ${fl(N, all)}` : ""}`;
  const nums = `${singles.join(" + ")} - ${pairs.map((l) => Math.floor(N / l)).join(" - ")}${three ? ` + ${Math.floor(N / all)}` : ""}`;
  return {
    prompt: fill(none ? w.dm.prompt.divisibleNone : w.dm.prompt.divisibleAny, { n: N, ds: ds.join(", ") }),
    q: `1, 2, \\dots, ${N}; \\quad ${ds.join(", \\; ")}`,
    ...wholeOf(v, slips),
    steps: [`${count} = ${nums} = ${any}`, ...(none ? [`${N} - ${any} = ${v}`] : [])],
  };
}

function derangementPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const n = r.int(4, 7);
    const v = derangements(n);
    const terms = Array.from({ length: n + 1 }, (_, k) => `${k % 2 ? "-" : k ? "+" : ""} \\frac{1}{${k}!}`).join(" ");
    return {
      prompt: fill(w.dm.prompt.derangement, { n }),
      q: `D_{${n}} = ${n}! \\left(${terms}\\right)`,
      ...wholeOf(v, [["derangementTruncated", factorial(n) / 2]]),
      steps: [`D_n = (n - 1)(D_{n-1} + D_{n-2}), \\quad D_1 = 0, \\; D_2 = 1`, Array.from({ length: n - 2 }, (_, i) => `D_{${i + 3}} = ${derangements(i + 3)}`).join(", \\; ")],
    };
  }
  const n = r.int(5, 7);
  const k = r.int(1, 3);
  const d = derangements(n - k);
  const c = choose(n, k);
  return {
    prompt: fill(w.dm.prompt.fixedPoints, { n, k }),
    q: `\\binom{${n}}{${k}} \\cdot D_{${n - k}}`,
    ...wholeOf(c * d, [["fixedChosenNotDeranged", c * factorial(n - k)]]),
    steps: [`\\binom{${n}}{${k}} = ${c}, \\quad D_{${n - k}} = ${d}`, `${c} \\cdot ${d} = ${c * d}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? unionPart(r, w) : L === 2 ? divisiblePart(r, w) : derangementPart(r, w));

export default gen;
