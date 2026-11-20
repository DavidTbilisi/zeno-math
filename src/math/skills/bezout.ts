// Practice: The extended Euclidean algorithm and linear Diophantine equations. Easy finds gcd(a, b) by Euclid's
// algorithm (the last quotient taken for it, named) or says whether ax + by = c has integer solutions (coprime a and b
// thought to be needed, the gcd test left out, named); medium finds Bézout's x and y (the pair that gives −d, named);
// hard counts the solutions in positive integers (x or y = 0 counted, stepping x by b instead of b/d, named).
import { pickOf, word } from "../calculusTwo";
import { gcd, rowOf } from "../groups";
import { euclid, euclidTex, extGcd } from "../numberTheoryTwo";
import { wholeOf } from "../realAnalysis";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** a > b with gcd d, at least three division steps. */
function pairOf(r: Rng, ds: number[], ok: (a: number, b: number) => boolean = () => true): { a: number; b: number; d: number } {
  for (;;) {
    const d = r.pick(ds);
    const [x, y] = [r.int(8, 70), r.int(3, 60)];
    const [a, b] = [d * Math.max(x, y), d * Math.min(x, y)];
    if (x === y || gcd(x, y) !== 1 || a > 999 || euclid(a, b).length < 3 || !ok(a, b)) continue;
    return { a, b, d };
  }
}

function easyPart(r: Rng, w: PracticeWords): Part {
  if (r.int(0, 1) === 0) {
    const { a, b, d } = pairOf(r, [1, 2, 3, 4, 6, 7, 9, 12, 14, 15], (a, b) => euclid(a, b).at(-1)!.q !== gcd(a, b));
    return {
      prompt: w.nt.prompt.gcd,
      q: `\\gcd(${a}, ${b})`,
      ...wholeOf(d, [["lastQuotientAsGcd", euclid(a, b).at(-1)!.q]]),
      steps: [...euclidTex(a, b), `\\gcd(${a}, ${b}) = ${d}`],
    };
  }
  const { a, b, d } = pairOf(r, [2, 3, 4, 5, 6, 8, 9]);
  const solvable = r.int(0, 1) === 0;
  const c = solvable ? d * r.int(2, 40) : d * r.int(2, 40) + r.int(1, d - 1);
  const options = [word(w.nt.yes), word(w.nt.no)];
  const right = solvable ? 0 : 1;
  return {
    prompt: w.nt.prompt.solvable,
    q: `${a}x + ${b}y = ${c}`,
    ...pickOf(options, right, [solvable ? ["coprimeNeeded", 1] : ["solvableWithoutGcd", 0]]),
    steps: [`\\gcd(${a}, ${b}) = ${d}`, solvable ? `${d} \\mid ${c}: \\; ${c} = ${c / d} \\cdot ${d}` : `${d} \\nmid ${c}`, `\\text{${options[right].text}}`],
  };
}

function bezoutPart(r: Rng, w: PracticeWords): Part {
  const { a, b, d } = pairOf(r, [1, 1, 2, 3, 4, 5, 6], (a, b) => b / gcd(a, b) >= 3);
  const m = b / d;
  const e = extGcd(a, b);
  const x = ((e.x % m) + m) % m;
  const y = (d - a * x) / b;
  const [xs, ys] = [m - x, (-d - a * (m - x)) / b];
  const steps = [...euclidTex(a, b), `${d} = ${a} \\cdot (${e.x}) + ${b} \\cdot (${e.y})`];
  if (e.x !== x) steps.push(`x = ${e.x} ${x > e.x ? "+" : "-"} ${m} \\cdot ${Math.abs((x - e.x) / m)} = ${x}, \\quad ${d} = ${a} \\cdot ${x} + ${b} \\cdot (${y})`);
  return {
    prompt: w.nt.prompt.bezout,
    q: `${a}x + ${b}y = \\gcd(${a}, ${b}), \\quad 0 \\le x < ${m}`,
    ...rowOf([x, y], [["bezoutSignSlip", [xs, ys]]], "pair"),
    steps,
  };
}

function countPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const d = r.pick([1, 1, 2, 3]);
    const [a, b] = [d * r.int(2, 9), d * r.int(2, 9)];
    if (a === b || gcd(a / d, b / d) !== 1) continue;
    const c = d * r.int(15, 90);
    const sols: [number, number][] = [];
    for (let x = 0; a * x <= c; x++) if ((c - a * x) % b === 0) sols.push([x, (c - a * x) / b]);
    const pos = sols.filter(([x, y]) => x > 0 && y > 0);
    const n = pos.length;
    const stepped = pos.filter(([x]) => (x - pos[0]?.[0]) % b === 0).length;
    if (n < 2 || n > 9 || (sols.length === n && (d === 1 || stepped === n))) continue;
    const [x1, y1] = pos[0];
    return {
      prompt: w.nt.prompt.positiveCount,
      q: `${a}x + ${b}y = ${c}`,
      ...wholeOf(n, [["nonnegativeCounted", sols.length], ["stepNotDivided", stepped]]),
      steps: [
        `\\gcd(${a}, ${b}) = ${d} \\mid ${c}, \\quad (x, y) = (${x1}, ${y1})`,
        `x = ${x1} + ${b / d}t, \\quad y = ${y1} - ${a / d}t`,
        `x > 0, \\; y > 0 \\iff t = 0, 1, \\dots, ${n - 1}`,
        `${n}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? easyPart(r, w) : L === 2 ? bezoutPart(r, w) : countPart(r, w));

export default gen;
