// Practice: Swaps to sort.
import { inversions as countInversions } from "../tactics";
import { num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // A monovariant (src/math/tactics.ts): swapping two neighbours that are out of order puts that pair right and
  // leaves every other pair as it was, so sorting that way takes exactly as many swaps as there are pairs out of
  // order. Counting only the neighbours out of order at the start, or the numbers out of place, are the slips.
  const len = L === 1 ? 4 : L === 2 ? 5 : 7;
  const [least, most] = L === 1 ? [2, 5] : L === 2 ? [4, 8] : [8, 16];
  let a: number[];
  let k: number;
  do {
    const pool = Array.from({ length: len + 5 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    a = pool.slice(0, len);
    k = countInversions(a);
  } while (k < least || k > most);
  const sorted = [...a].sort((x, y) => x - y);
  const neighbours = a.filter((x, i) => i + 1 < a.length && x > a[i + 1]).length;
  const outOfPlace = a.filter((x, i) => x !== sorted[i]).length;
  const traps: Trap[] = [];
  if (neighbours !== k) traps.push({ id: "neighboursOnly", a: num(neighbours), vars: { d: neighbours } });
  if (outOfPlace !== k && outOfPlace !== neighbours) traps.push({ id: "outOfPlace", a: num(outOfPlace), vars: { m: outOfPlace } });
  // The working: for each number, how many smaller ones come after it.
  const after = a.map((x, i) => a.slice(i + 1).filter((y) => y < x).length);
  return {
    prompt: w.prompts.inversions,
    q: a.join(",\\ "),
    answer: { ...num(k), traps },
    show: String(k),
    plain: String(k),
    format: "number",
    steps: [a.map((x, i) => `${x}\\!:\\ ${after[i]}`).join(",\\quad "), `${after.join(" + ")} = ${k}`],
  };
};

export default gen;
