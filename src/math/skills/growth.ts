// Practice: growth rates and big-O (#460). Easy picks the fastest-growing of four functions (the biggest power over
// an exponential, a big constant times n over n², named) or counts the steps of two nested loops (the triangle taken
// as the square, the loops added, named); medium the order of a loop: two loops one after the other, a halving loop,
// a halving loop inside a loop (multiplied where they follow each other, log n taken as n, named); hard the order of
// T(n) = aT(n/b) + n^d by comparing a with b^d (the log factor dropped or added, only the top level's work, named),
// or the seconds n^k steps take at 10^R steps a second (the powers added instead of multiplied, named).
import { pickOf, sym, type NumSlip } from "../calculusTwo";
import { shuffled } from "../logicSets";
import type { MistakeId } from "../mistakes";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** The orders the questions choose from, slowest first. */
const ORDERS = {
  one: sym("O(1)", "O(1)"),
  log: sym("O(\\log n)", "O(log n)"),
  n: sym("O(n)", "O(n)"),
  nlog: sym("O(n \\log n)", "O(n log n)"),
  n2: sym("O(n^{2})", "O(n^2)"),
  n2log: sym("O(n^{2} \\log n)", "O(n^2 log n)"),
  n3: sym("O(n^{3})", "O(n^3)"),
};
type Order = keyof typeof ORDERS;

/** A pick among orders, kept slowest first so the list reads as a scale. */
function orderPick(keys: Order[], right: Order, slip: [MistakeId, Order]) {
  const ks = (Object.keys(ORDERS) as Order[]).filter((k) => keys.includes(k));
  return pickOf(
    ks.map((k) => ORDERS[k]),
    ks.indexOf(right),
    [[slip[0], ks.indexOf(slip[1])]],
  );
}

/** Pseudocode, one line each, indented by depth. */
const code = (lines: [number, string][]) => `\\begin{array}{l} ${lines.map(([d, s]) => `${"\\quad ".repeat(d)}${s}`).join(" \\\\ ")} \\end{array}`;
const FOR = (v: string, to: string) => `\\mathbf{for}\\ ${v} = 1 \\ldots ${to}:`;
const STEP = "s \\gets s + 1";

function fastestPart(r: Rng, w: PracticeWords): Part {
  const exp = r.next() < 0.5;
  const k = r.pick([3, 5, 10]);
  const c = r.pick([100, 1000]);
  const right = sym("n^{2}", "n^2");
  // With an exponential in the list it wins over every power; without one, n² wins over any constant times n.
  const base = r.pick([2, 1.5]);
  const winner = exp ? sym(`${base}^{n}`, `${base}^n`) : right;
  const bait = exp ? sym(`n^{${k}}`, `n^${k}`) : sym(`${c}n`, `${c}n`);
  const rest = exp ? [right, sym("n \\log n", "n log n")] : [sym("n \\log n", "n log n"), sym("\\sqrt{n}", "sqrt n")];
  const options = shuffled(r, [winner, bait, ...rest]);
  return {
    prompt: w.dm.prompt.growthFastest,
    q: options.map((o) => o.tex).join(", \\quad "),
    ...pickOf(options, options.indexOf(winner), [[exp ? "polyOverExp" : "constantKept", options.indexOf(bait)]]),
    steps: [exp ? `\\frac{n^{${k}}}{${winner.tex}} \\to 0 \\quad (n \\to \\infty)` : `\\frac{${c}n}{n^{2}} = \\frac{${c}}{n} \\to 0 \\quad (n \\to \\infty)`],
  };
}

function countPart(r: Rng, w: PracticeWords): Part {
  const tri = r.next() < 0.5;
  const n = r.pick([10, 20, 50, 100]);
  const m = r.pick([5, 8, 12, 30].filter((x) => x !== n));
  const v = tri ? (n * (n + 1)) / 2 : n * m;
  const slips: NumSlip[] = tri ? [["triangleAsSquare", n * n]] : [["nestedAdded", n + m]];
  return {
    prompt: w.dm.prompt.growthCount,
    q: `${code([[0, FOR("i", String(n))], [1, FOR("j", tri ? "i" : String(m))], [2, STEP]])}`,
    answer: { ...num(v), traps: slips.map(([id, x]) => ({ id, a: num(x as number) })) },
    show: String(v),
    plain: String(v),
    format: "number",
    steps: [tri ? `1 + 2 + \\cdots + ${n} = \\frac{${n} \\cdot ${n + 1}}{2} = ${v}` : `${n} \\cdot ${m} = ${v}`],
  };
}

function loopPart(r: Rng, w: PracticeWords): Part {
  const kind = r.pick(["seq", "halve", "nestedHalve"] as const);
  const HALVE: [number, string][] = [
    [0, "j \\gets n"],
    [0, "\\mathbf{while}\\ j > 1:"],
    [1, "j \\gets \\lfloor j / 2 \\rfloor"],
  ];
  const lines: [number, string][] =
    kind === "seq"
      ? [[0, FOR("i", "n")], [1, STEP], [0, FOR("j", "n")], [1, STEP]]
      : kind === "halve"
        ? HALVE
        : [[0, FOR("i", "n")], ...HALVE.map(([d, s]): [number, string] => [d + 1, s])];
  const keys: Order[] = ["one", "log", "n", "nlog", "n2"];
  const pick =
    kind === "seq"
      ? orderPick(keys, "n", ["loopsMultiplied", "n2"])
      : kind === "halve"
        ? orderPick(keys, "log", ["logAsN", "n"])
        : orderPick(keys, "nlog", ["logAsN", "n2"]);
  return {
    prompt: w.dm.prompt.growthLoop,
    q: code(lines),
    ...pick,
    steps: [kind === "seq" ? `n + n = 2n \\in O(n)` : kind === "halve" ? `n \\to \\tfrac{n}{2} \\to \\tfrac{n}{4} \\to \\cdots \\to 1: \\ \\log_2 n` : `n \\cdot \\log_2 n \\in O(n \\log n)`],
  };
}

/** T(n) = aT(n/b) + n^d: the order, and the slip that goes with its case. */
const RECURRENCES: { a: number; b: number; d: number; right: Order; slip: [MistakeId, Order] }[] = [
  { a: 2, b: 2, d: 1, right: "nlog", slip: ["logFactorDropped", "n"] },
  { a: 3, b: 3, d: 1, right: "nlog", slip: ["logFactorDropped", "n"] },
  { a: 1, b: 2, d: 0, right: "log", slip: ["logFactorDropped", "one"] },
  { a: 4, b: 2, d: 2, right: "n2log", slip: ["logFactorDropped", "n2"] },
  { a: 4, b: 2, d: 1, right: "n2", slip: ["onlyTopWork", "n"] },
  { a: 2, b: 2, d: 0, right: "n", slip: ["onlyTopWork", "one"] },
  { a: 8, b: 2, d: 2, right: "n3", slip: ["onlyTopWork", "n2"] },
  { a: 1, b: 2, d: 1, right: "n", slip: ["logFactorAdded", "nlog"] },
  { a: 2, b: 2, d: 2, right: "n2", slip: ["logFactorAdded", "n2log"] },
];

function recurrencePart(r: Rng, w: PracticeWords): Part {
  const { a, b, d, right, slip } = r.pick(RECURRENCES);
  const work = d === 0 ? "1" : d === 1 ? "n" : `n^{${d}}`;
  const cmp = a === b ** d ? "=" : a > b ** d ? ">" : "<";
  return {
    prompt: w.dm.prompt.growthRecurrence,
    q: `T(n) = ${a === 1 ? "" : a}T(n/${b}) + ${work}`,
    ...orderPick(Object.keys(ORDERS) as Order[], right, slip),
    steps: [`a = ${a}, \\ b^{d} = ${b}^{${d}} = ${b ** d}`, `a ${cmp} b^{d} \\implies T(n) \\in ${ORDERS[right].tex}`],
  };
}

function timePart(r: Rng, w: PracticeWords): Part {
  const f = r.pick([2, 3]);
  const k = f === 2 ? r.pick([4, 5, 6]) : r.pick([3, 4]);
  const R = r.pick([8, 9]);
  const v = 10 ** (f * k - R);
  const slip = 10 ** (k + f - R);
  const s = String(v);
  return {
    prompt: w.dm.prompt.growthTime,
    q: `S(n) = n^{${f}}, \\ n = 10^{${k}}, \\ 10^{${R}} \\ \\mathrm{s}^{-1}`,
    answer: { ...num(v, v * 1e-9), traps: [{ id: "powerAdded" as const, a: num(slip, slip * 1e-9) }] },
    show: s,
    plain: s,
    format: "number",
    steps: [`(10^{${k}})^{${f}} = 10^{${f * k}}`, `\\frac{10^{${f * k}}}{10^{${R}}} = 10^{${f * k - R}} = ${s}`],
  };
}

const gen: Gen = (r, L, w) =>
  L === 1
    ? r.next() < 0.5
      ? fastestPart(r, w)
      : countPart(r, w)
    : L === 2
      ? loopPart(r, w)
      : r.next() < 0.5
        ? recurrencePart(r, w)
        : timePart(r, w);

export default gen;
