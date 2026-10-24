// The recursion problems give the right answers: on their examples, on cases picked to catch a slip (one number, no
// way at all, a report who manages the other, a clicked mine), and on random inputs checked against working it out
// another, slower way (every subset, every interleaving, a forward pass over the hands, a breadth-first reveal); bad
// inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
/** The answer, after checking that no frame says NaN or undefined or leaves a placeholder unfilled. */
const answer = (id: ProblemId, ...input: string[]) => {
  const trace = problemTrace(id, input, w);
  for (const f of trace.frames) assert.doesNotMatch(JSON.stringify(f), /NaN|undefined|Infinity|\{\w+\}/, `${id} ${input}`);
  return trace.answer;
};
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const pick = <T>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const lists = (s: string) => [...s.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1]);
const minus = (s: string) => s.replace(/−/g, "-");

test("nth Fibonacci", () => {
  assert.equal(answer("nthFibonacci", "9"), "Fibonacci number 9 is 21.");
  assert.equal(answer("nthFibonacci", "1"), "Fibonacci number 1 is 0.");
  assert.equal(answer("nthFibonacci", "2"), "Fibonacci number 2 is 1.");
  const slow = (n: number): number => (n === 1 ? 0 : n === 2 ? 1 : slow(n - 1) + slow(n - 2));
  for (let n = 1; n <= 22; n++) assert.equal(answer("nthFibonacci", String(n)), `Fibonacci number ${n} is ${slow(n)}.`);
  assert.equal(answer("nthFibonacci", "30"), "Fibonacci number 30 is 514229.");
  assert.throws(() => answer("nthFibonacci", "0"), /from 1 to 30/);
  assert.throws(() => answer("nthFibonacci", "31"), /from 1 to 30/);
});

test("product sum", () => {
  assert.equal(answer("productSum", "[3, [4, -2], 1, [[5, 6], -7]]"), "The product sum is 60.");
  assert.equal(answer("productSum", "[5, 2, [7, -1], 3, [6, [-13, 8], 4]]"), "The product sum is 12.");
  assert.equal(answer("productSum", "[]"), "The product sum is 0.");
  assert.equal(answer("productSum", "1, 2, [3]"), "The product sum is 9.");
  assert.equal(answer("productSum", "[[[−2]]]"), "The product sum is −12.");
  type N = (number | N)[];
  const slow = (a: N, d = 1): number => d * a.reduce<number>((s, x) => s + (typeof x === "number" ? x : slow(x, d + 1)), 0);
  const r = rng(21);
  for (let k = 0; k < 150; k++) {
    let budget = 1 + Math.floor(r() * 13);
    const make = (d: number): N => {
      const out: N = [];
      while (budget > 0 && r() < 0.8) {
        budget--;
        out.push(d < 4 && r() < 0.3 ? make(d + 1) : randInts(r, 1, -9, 9)[0]);
      }
      return out;
    };
    const a = make(1);
    const v = slow(a);
    assert.equal(answer("productSum", JSON.stringify(a)), `The product sum is ${v < 0 ? `−${-v}` : v}.`, JSON.stringify(a));
  }
  assert.throws(() => answer("productSum", "[1, [2]"), /doesn't fit/);
  assert.throws(() => answer("productSum", "[1,, 2]"), /doesn't fit/);
  assert.throws(() => answer("productSum", "[1, x]"), /“x” doesn't fit/);
  assert.throws(() => answer("productSum", "[[[[[1]]]]]"), /at most 4 deep/);
  assert.throws(() => answer("productSum", Array(17).fill(1).join(", ")), /At most 16/);
});

test("permutations", () => {
  assert.equal(answer("permutations", "1, 2, 3"), "Permutations (6): [1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 2, 1], [3, 1, 2]");
  assert.equal(answer("permutations", "-4"), "Permutations (1): [−4]");
  const all = (xs: number[]): number[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => all(xs.filter((_, j) => j !== i)).map((p) => [x, ...p])));
  const r = rng(22);
  for (let k = 0; k < 60; k++) {
    const xs = [...new Set(randInts(r, 1 + (k % 4), -9, 9))];
    const got = lists(minus(answer("permutations", xs.join(", "))));
    const want = all(xs).map((p) => p.join(", "));
    assert.equal(got.length, want.length, `${xs}`);
    assert.deepEqual([...got].sort(), [...want].sort(), `${xs}`);
  }
  assert.throws(() => answer("permutations", "1, 1"), /all different/);
  assert.throws(() => answer("permutations", "1, 2, 3, 4, 5"), /At most 4/);
});

test("powerset", () => {
  assert.equal(answer("powerset", "4, -1, 7"), "Subsets (8): [], [4], [−1], [4, −1], [7], [4, 7], [−1, 7], [4, −1, 7]");
  assert.equal(answer("powerset", "2"), "Subsets (2): [], [2]");
  const r = rng(23);
  for (let k = 0; k < 60; k++) {
    const xs = [...new Set(randInts(r, 1 + (k % 5), -9, 9))];
    // The slow way: every bit mask, which counts in the order the doubling builds them.
    const want = Array.from({ length: 2 ** xs.length }, (_, m) => xs.filter((_, i) => m & (1 << i)).join(", "));
    assert.deepEqual(lists(minus(answer("powerset", xs.join(", ")))), want, `${xs}`);
  }
  assert.throws(() => answer("powerset", "3, 3"), /all different/);
  assert.throws(() => answer("powerset", "1, 2, 3, 4, 5, 6"), /At most 5/);
});

test("phone number mnemonics", () => {
  assert.equal(answer("phoneNumberMnemonics", "1905"), "Mnemonics (12): 1w0j, 1w0k, 1w0l, 1x0j, 1x0k, 1x0l, 1y0j, 1y0k, 1y0l, 1z0j, 1z0k, 1z0l");
  assert.equal(answer("phoneNumberMnemonics", "0"), "Mnemonics (1): 0");
  assert.equal(answer("phoneNumberMnemonics", "23"), "Mnemonics (9): ad, ae, af, bd, be, bf, cd, ce, cf");
  const keys = ["0", "1", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"];
  const r = rng(24);
  for (let k = 0; k < 120; k++) {
    const digits = randInts(r, 1 + (k % 4), 0, 9);
    let want = [""];
    for (const d of digits) want = want.flatMap((p) => [...keys[d]].map((c) => p + c));
    if (want.length > 36) {
      assert.throws(() => answer("phoneNumberMnemonics", digits.join("")), /at most 36/);
      continue;
    }
    assert.equal(answer("phoneNumberMnemonics", digits.join("")), `Mnemonics (${want.length}): ${want.join(", ")}`, `${digits}`);
  }
  assert.throws(() => answer("phoneNumberMnemonics", "12a"), /Only the digits/);
  assert.throws(() => answer("phoneNumberMnemonics", "7979"), /256 letter strings/);
});

test("staircase traversal", () => {
  assert.equal(answer("staircaseTraversal", "7", "3"), "Ways to climb a staircase of height 7: 44.");
  assert.equal(answer("staircaseTraversal", "4", "2"), "Ways to climb a staircase of height 4: 5.");
  assert.equal(answer("staircaseTraversal", "1", "1"), "Ways to climb a staircase of height 1: 1.");
  assert.equal(answer("staircaseTraversal", "5", "1"), "Ways to climb a staircase of height 5: 1.");
  const slow = (h: number, k: number): number => (h === 0 ? 1 : Array.from({ length: Math.min(h, k) }, (_, s) => slow(h - s - 1, k)).reduce((a, b) => a + b, 0));
  for (let h = 1; h <= 13; h++) for (let k = 1; k <= 13; k += 2) assert.equal(answer("staircaseTraversal", String(h), String(k)), `Ways to climb a staircase of height ${h}: ${slow(h, k)}.`);
  assert.throws(() => answer("staircaseTraversal", "14", "2"), /from 1 to 13/);
  assert.throws(() => answer("staircaseTraversal", "3", "0"), /from 1 to 13/);
});

test("blackjack probability", () => {
  assert.equal(answer("blackjackProbability", "21", "15"), "The chance of busting is 0.45.");
  assert.equal(answer("blackjackProbability", "21", "12"), "The chance of busting is 0.268.");
  assert.equal(answer("blackjackProbability", "21", "22"), "The chance of busting is 1.");
  assert.equal(answer("blackjackProbability", "21", "17"), "The chance of busting is 0.");
  // The slow way: push the chance of every hand forward, card by card, and add up what ends over the target.
  const forward = (t: number, s: number) => {
    const mass = new Map<number, number>([[s, 1]]);
    let bust = 0;
    for (let h = s; h <= t + 10; h++) {
      const m = mass.get(h) ?? 0;
      if (!m) continue;
      if (h > t) bust += m;
      else if (h < t - 4) for (let d = 1; d <= 10; d++) mass.set(h + d, (mass.get(h + d) ?? 0) + m / 10);
    }
    return Math.round(bust * 1000) / 1000;
  };
  for (let t = 4; t <= 40; t += 3) for (let s = Math.max(0, t - 14); s <= Math.min(40, t + 2); s++) assert.equal(answer("blackjackProbability", String(t), String(s)), `The chance of busting is ${forward(t, s)}.`, `${t} / ${s}`);
  assert.throws(() => answer("blackjackProbability", "21", "3"), /from 7 to 40/);
  assert.throws(() => answer("blackjackProbability", "3", "1"), /from 4 to 40/);
});

test("reveal minesweeper", () => {
  assert.equal(answer("revealMinesweeper", "HHHHHH; HMHHHH; HHHHHH; HHHHMH; HHHHHH", "0, 5"), "The board after the click: HH1000; HM1000; HH1111; HHHHMH; HHHHHH");
  assert.equal(answer("revealMinesweeper", "HM; HH", "0, 1"), "The board after the click: HX; HH");
  assert.equal(answer("revealMinesweeper", "HHH; HHH", "1, 1"), "The board after the click: 000; 000");
  assert.equal(answer("revealMinesweeper", "mh; hh", "1, 1"), "The board after the click: MH; H1");
  const r = rng(25);
  for (let k = 0; k < 150; k++) {
    const [R, C] = [1 + Math.floor(r() * 6), 1 + Math.floor(r() * 6)];
    const board = Array.from({ length: R }, () => Array.from({ length: C }, (): string => (r() < 0.15 ? "M" : "H")));
    const [y0, x0] = [Math.floor(r() * R), Math.floor(r() * C)];
    // The slow way: a queue instead of recursion; the squares revealed don't depend on the order.
    const b = board.map((line) => [...line]);
    if (b[y0][x0] === "M") b[y0][x0] = "X";
    else {
      const queue = [[y0, x0]];
      while (queue.length) {
        const [y, x] = queue.shift()!;
        if (b[y][x] !== "H") continue;
        const near: number[][] = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dy || dx) && b[y + dy]?.[x + dx] !== undefined) near.push([y + dy, x + dx]);
        const mines = near.filter(([p, q]) => b[p][q] === "M").length;
        b[y][x] = String(mines);
        if (!mines) queue.push(...near);
      }
    }
    const input = board.map((line) => line.join("")).join("; ");
    assert.equal(answer("revealMinesweeper", input, `${y0}, ${x0}`), `The board after the click: ${b.map((line) => line.join("")).join("; ")}`, `${input} @ ${y0}, ${x0}`);
  }
  assert.throws(() => answer("revealMinesweeper", "HQ; HH", "0, 0"), /“Q” doesn't fit/);
  assert.throws(() => answer("revealMinesweeper", "HH; HH", "2, 0"), /from 0 to 1/);
  assert.throws(() => answer("revealMinesweeper", "HH; HH", "1"), /row, column/);
  assert.throws(() => answer("revealMinesweeper", "HHH; HH", "0, 0"), /as many entries/);
});

test("lowest common manager", () => {
  const chart = "A>B, A>C, B>D, B>E, C>F, C>G, E>H, E>I";
  assert.equal(answer("lowestCommonManager", chart, "A", "H", "D"), "The lowest common manager is B.");
  assert.equal(answer("lowestCommonManager", chart, "A", "H", "I"), "The lowest common manager is E.");
  assert.equal(answer("lowestCommonManager", chart, "A", "H", "G"), "The lowest common manager is A.");
  assert.equal(answer("lowestCommonManager", chart, "A", "B", "I"), "The lowest common manager is B.");
  assert.equal(answer("lowestCommonManager", chart, "A", "F", "F"), "The lowest common manager is F.");
  const r = rng(26);
  for (let k = 0; k < 150; k++) {
    const n = 2 + Math.floor(r() * 13);
    const boss = [-1, ...Array.from({ length: n - 1 }, (_, i) => Math.floor(r() * (i + 1)))];
    const name = (i: number) => String.fromCharCode(65 + i);
    const chartText = boss.flatMap((b, i) => (b < 0 ? [] : [`${name(b)}>${name(i)}`])).join(", ");
    const [x, y] = [Math.floor(r() * n), Math.floor(r() * n)];
    // The slow way: everyone above x, then the first of y's managers (or y) among them.
    const above = new Set<number>();
    for (let v = x; v >= 0; v = boss[v]) above.add(v);
    let v = y;
    while (!above.has(v)) v = boss[v];
    assert.equal(answer("lowestCommonManager", chartText, "A", name(x), name(y)), `The lowest common manager is ${name(v)}.`, `${chartText}: ${name(x)}, ${name(y)}`);
  }
  assert.throws(() => answer("lowestCommonManager", chart, "A", "Z", "D"), /“Z” isn't in the chart/);
  assert.throws(() => answer("lowestCommonManager", "A>B, C>B", "A", "B", "C"), /exactly one manager/);
  assert.throws(() => answer("lowestCommonManager", "A>B, C>D", "A", "B", "D"), /exactly one manager/);
  assert.throws(() => answer("lowestCommonManager", "A>B, B>A", "A", "A", "B"), /exactly one manager/);
});

test("interweaving strings", () => {
  assert.equal(answer("interweavingStrings", "baa", "aab", "baaaba"), "Yes: baaaba interweaves baa and aab.");
  assert.equal(answer("interweavingStrings", "ab", "cd", "acbd"), "Yes: acbd interweaves ab and cd.");
  assert.equal(answer("interweavingStrings", "ab", "cd", "abdc"), "No: abdc can't be made by interweaving ab and cd.");
  assert.equal(answer("interweavingStrings", "ab", "cd", "abc"), "No: abc can't be made by interweaving ab and cd.");
  const slow = (a: string, b: string, s: string): boolean =>
    !s ? !a && !b : (!!a && a[0] === s[0] && slow(a.slice(1), b, s.slice(1))) || (!!b && b[0] === s[0] && slow(a, b.slice(1), s.slice(1)));
  const word = (r: () => number, n: number) => Array.from({ length: n }, () => pick(r, ["a", "b"])).join("");
  const r = rng(27);
  let yes = 0;
  for (let k = 0; k < 200; k++) {
    const [a, b] = [word(r, 1 + (k % 5)), word(r, 1 + ((k >> 2) % 5))];
    const s = r() < 0.5 ? word(r, a.length + b.length) : [...a + b].sort(() => r() - 0.5).join("");
    const want = slow(a, b, s);
    if (want) yes++;
    assert.equal(answer("interweavingStrings", a, b, s).startsWith("Yes"), want, `${a} ${b} ${s}`);
  }
  assert.ok(yes > 20, "enough yes cases");
  assert.throws(() => answer("interweavingStrings", "abcdefgh", "a", "abcdefgha"), /At most 7 characters/);
});

test("solve sudoku", () => {
  const puzzle = "000060290; 032780061; 610203004; 126930040; 058612900; 309805602; 560129078; 001308056; 783450120";
  const got = answer("solveSudoku", puzzle);
  assert.equal(got, "Solved after 34 tries: 847561293; 932784561; 615293784; 126937845; 458612937; 379845612; 564129378; 291378456; 783456129");
  const solved = got.split(": ")[1].split("; ").map((r) => [...r].map(Number));
  // Every row, column and box holds 1 to 9, and the givens are kept.
  const all = (xs: number[]) => [...xs].sort().join("") === "123456789";
  for (let i = 0; i < 9; i++) {
    assert.ok(all(solved[i]));
    assert.ok(all(solved.map((r) => r[i])));
    assert.ok(all(Array.from({ length: 9 }, (_, k) => solved[3 * Math.floor(i / 3) + Math.floor(k / 3)][3 * (i % 3) + (k % 3)])));
  }
  puzzle.split("; ").forEach((r, i) => [...r].forEach((d, j) => d !== "0" && assert.equal(solved[i][j], Number(d))));
  // A harder one (few givens) still solves, with the steps after the first 60 summed up in one note.
  const hard = "530070000; 600195000; 098000060; 800060003; 400803001; 700020006; 060000280; 000419005; 000080079";
  const trace = problemTrace("solveSudoku", [hard], w);
  assert.match(trace.answer, /^Solved after \d+ tries: 534678912;/);
  assert.match(trace.frames[trace.frames.length - 2].note, /more steps/);
  const empty = (k: number) => Array(k).fill("000000000");
  // Row 0 leaves only 9 for its last square, and the 9 below it rules that out.
  assert.equal(answer("solveSudoku", ["123456780", "000000009", ...empty(7)].join("; ")), "No solution: after 0 tries every way runs into a clash.");
  assert.match(answer("solveSudoku", ["1........", ...empty(8)].join("; ")), /^Solved after \d+ tries: 123456789; 456789123; 789123456; /);
  assert.throws(() => answer("solveSudoku", "123"), /9 rows of 9 digits/);
  assert.throws(() => answer("solveSudoku", ["110000000", ...empty(8)].join("; ")), /1 twice/);
  assert.throws(() => answer("solveSudoku", ["100000000", "000000000", "001000000", ...empty(6)].join("; ")), /1 twice/);
});

test("generate div tags", () => {
  assert.equal(answer("generateDivTags", "1"), "Strings (1): <div></div>");
  assert.equal(answer("generateDivTags", "2"), "Strings (2): <div><div></div></div>, <div></div><div></div>");
  for (let n = 1; n <= 4; n++) {
    // The slow way: every string of n opening and n closing tags, kept when no prefix closes more than it opened,
    // in the order where an opening tag comes before a closing one.
    const want: string[] = [];
    for (let m = 0; m < 2 ** (2 * n); m++) {
      const bits = Array.from({ length: 2 * n }, (_, i) => (m >> (2 * n - 1 - i)) & 1);
      let depth = 0;
      if (bits.every((b) => (depth += b ? -1 : 1) >= 0) && depth === 0) want.push(bits.map((b) => (b ? "</div>" : "<div>")).join(""));
    }
    assert.equal(answer("generateDivTags", String(n)), `Strings (${want.length}): ${want.join(", ")}`);
  }
  assert.throws(() => answer("generateDivTags", "5"), /from 1 to 4/);
  assert.throws(() => answer("generateDivTags", "0"), /from 1 to 4/);
});

test("ambiguous measurements", () => {
  assert.equal(answer("ambiguousMeasurements", "[4, 6], [9, 10]", "17, 21"), "Yes: the cups can measure surely inside [17, 21].");
  assert.equal(answer("ambiguousMeasurements", "[4, 6]", "13, 17"), "No: no pours land surely inside [13, 17].");
  assert.equal(answer("ambiguousMeasurements", "[4, 6]", "12-18"), "Yes: the cups can measure surely inside [12, 18].");
  assert.equal(answer("ambiguousMeasurements", "[3, 3]", "[0, 2]"), "No: no pours land surely inside [0, 2].");
  const r = rng(28);
  let yes = 0;
  for (let k = 0; k < 150; k++) {
    const cups = Array.from({ length: 1 + (k % 3) }, () => {
      const a = 1 + Math.floor(r() * 8);
      return [a, a + Math.floor(r() * 4)];
    });
    const L = Math.floor(r() * 30);
    const H = L + Math.floor(r() * 10);
    // The slow way: every pair (sum of lows, sum of highs) that some cups poured can give, with the highs at most H.
    const seen = new Set<string>();
    const queue = [[0, 0]];
    let want = false;
    while (queue.length) {
      const [lo, hi] = queue.pop()!;
      for (const [a, b] of cups) {
        const [x, y] = [lo + a, hi + b];
        if (y > H || seen.has(`${x}:${y}`)) continue;
        seen.add(`${x}:${y}`);
        if (x >= L) want = true;
        queue.push([x, y]);
      }
    }
    if (want) yes++;
    const input = cups.map(([a, b]) => `[${a}, ${b}]`).join(", ");
    assert.equal(answer("ambiguousMeasurements", input, `${L}, ${H}`).startsWith("Yes"), want, `${input} → [${L}, ${H}]`);
  }
  assert.ok(yes > 20 && yes < 130, `a mix of yes and no (${yes})`);
  assert.throws(() => answer("ambiguousMeasurements", "[0, 2]", "3, 4"), /at least 1/);
  assert.throws(() => answer("ambiguousMeasurements", "[2, 1]", "3, 4"), /isn't an interval/);
  assert.throws(() => answer("ambiguousMeasurements", "[1, 2]", "3, 1000"), /from 0 to 999/);
});

test("number of binary tree topologies", () => {
  assert.equal(answer("numberOfBinaryTreeTopologies", "5"), "Binary tree shapes for n = 5: 42.");
  assert.equal(answer("numberOfBinaryTreeTopologies", "0"), "Binary tree shapes for n = 0: 1.");
  // The slow way: the Catalan numbers from their closed form, (2n)! / ((n + 1)! n!).
  let c = 1;
  for (let n = 0; n <= 13; n++) {
    assert.equal(answer("numberOfBinaryTreeTopologies", String(n)), `Binary tree shapes for n = ${n}: ${c}.`);
    c = (c * 2 * (2 * n + 1)) / (n + 2);
  }
  assert.throws(() => answer("numberOfBinaryTreeTopologies", "14"), /from 0 to 13/);
});

test("non-attacking queens", () => {
  const known = [1, 0, 0, 2, 10, 4, 40, 92];
  for (let n = 1; n <= 8; n++) assert.equal(answer("nonAttackingQueens", String(n)), `Ways to place the queens on a ${n} × ${n} board: ${known[n - 1]}.`);
  // And the slow way for the small boards: every permutation of columns, kept when no two share a diagonal.
  const perms = (xs: number[]): number[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms(xs.filter((_, j) => j !== i)).map((p) => [x, ...p])));
  for (let n = 1; n <= 6; n++) {
    const ways = perms(Array.from({ length: n }, (_, i) => i)).filter((p) => p.every((c, r) => p.every((d, s) => s === r || Math.abs(c - d) !== Math.abs(r - s)))).length;
    assert.equal(ways, known[n - 1]);
  }
  const trace = problemTrace("nonAttackingQueens", ["8"], w);
  assert.match(trace.frames[trace.frames.length - 2].note, /more steps not shown/);
  assert.throws(() => answer("nonAttackingQueens", "9"), /from 1 to 8/);
});
