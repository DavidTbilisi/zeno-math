// Practice: The pigeonhole principle. Easy finds how many socks (or people) guarantee k of one colour (or month)
// (the + 1 left out, named); medium the least the fullest box must hold, ⌈N/m⌉ (the floor taken, named); hard how many
// numbers from 1..2n guarantee two summing to 2n + 1, or how many whole numbers guarantee two with a difference
// divisible by k (the + 1 left out, named).
import { wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function guaranteePart(r: Rng, w: PracticeWords): Part {
  const months = r.next() < 0.4;
  const m = months ? 12 : r.int(3, 6);
  const k = r.int(2, 5);
  const v = m * (k - 1) + 1;
  return {
    prompt: fill(months ? w.dm.prompt.months : w.dm.prompt.socks, { m, k }),
    q: `m = ${m}, \\quad k = ${k}`,
    ...wholeOf(v, [["pigeonholeNoPlusOne", m * (k - 1)]]),
    steps: [`${m} \\cdot (${k} - 1) = ${m * (k - 1)}`, `${m * (k - 1)} + 1 = ${v}`],
  };
}

function fullestPart(r: Rng, w: PracticeWords): Part {
  const m = r.int(4, 12);
  const N = m * r.int(2, 9) + r.int(1, m - 1);
  const v = Math.ceil(N / m);
  return {
    prompt: fill(w.dm.prompt.fullest, { n: N, m }),
    q: `\\left\\lceil \\frac{${N}}{${m}} \\right\\rceil`,
    ...wholeOf(v, [["floorForCeiling", Math.floor(N / m)]]),
    steps: [`\\frac{${N}}{${m}} = ${Math.floor(N / m)} + \\frac{${N % m}}{${m}}`, `\\left\\lceil \\frac{${N}}{${m}} \\right\\rceil = ${v}`],
  };
}

function pairsPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const n = r.int(5, 15);
    return {
      prompt: fill(w.dm.prompt.sumPair, { top: 2 * n, s: 2 * n + 1 }),
      q: `\\{1, ${2 * n}\\}, \\{2, ${2 * n - 1}\\}, \\dots, \\{${n}, ${n + 1}\\}`,
      ...wholeOf(n + 1, [["pigeonholeNoPlusOne", n]]),
      steps: [`a + b = ${2 * n + 1}: \\quad ${n}`, `${n} + 1 = ${n + 1}`],
    };
  }
  const k = r.int(4, 12);
  return {
    prompt: fill(w.dm.prompt.difference, { k }),
    q: `a \\bmod ${k} \\in \\{0, 1, \\dots, ${k - 1}\\}`,
    ...wholeOf(k + 1, [["pigeonholeNoPlusOne", k]]),
    steps: [`a \\equiv b \\pmod{${k}} \\iff ${k} \\mid a - b`, `${k} + 1 = ${k + 1}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? guaranteePart(r, w) : L === 2 ? fullestPart(r, w) : pairsPart(r, w));

export default gen;
