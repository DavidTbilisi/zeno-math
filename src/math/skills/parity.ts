// Practice: Plus or minus (parity).
import { fill } from "../chart";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Parity (src/math/tactics.ts): ±1 ±2 … ±n makes t exactly when t is at most 1 + … + n = S in size and differs
  // from S by an even number, since turning +k into −k lowers the total by 2k. Four totals are offered, one of them
  // makeable; one of the wrong parity, and (above easy) one of the right parity but out of reach, are the slips.
  const n = L === 1 ? r.int(3, 5) : L === 2 ? r.int(6, 9) : r.int(10, 14);
  const S = (n * (n + 1)) / 2;
  const lo = L === 3 ? -S : 0;
  let t: number;
  do t = r.int(lo, S);
  while ((S - t) % 2);
  const taken = new Set([t]);
  const fresh = (make: () => number) => {
    let x: number;
    do x = make();
    while (taken.has(x));
    taken.add(x);
    return x;
  };
  const odd = Array.from({ length: L === 1 ? 3 : 2 }, () => fresh(() => {
    let x: number;
    do x = r.int(lo, S);
    while ((S - x) % 2 === 0);
    return x;
  }));
  const far = L === 1 ? [] : [fresh(() => (L === 3 && r.next() < 0.5 ? -1 : 1) * (S + 2 * r.int(1, 3)))];
  const values = [t, ...odd, ...far].sort((a, b) => a - b);
  const options = values.map((v) => ({ v, text: String(v).replace("-", "−"), plain: String(v), tex: String(v) }));
  const at = (v: number) => values.indexOf(v);
  const traps: Trap[] = [
    ...odd.map((x): Trap => ({ id: "parityIgnored", a: { k: "near", options, right: at(x) }, vars: { t: String(x).replace("-", "−"), s: S, n } })),
    ...far.map((x): Trap => ({ id: "beyondReach", a: { k: "near", options, right: at(x) }, vars: { t: String(x).replace("-", "−"), s: S } })),
  ];
  // The signs: the numbers whose sign is turned to − add up to (S − t) / 2, picked greedily from the top.
  const minus = new Set<number>();
  let rest = (S - t) / 2;
  for (let k = n; k >= 1; k--)
    if (k <= rest) {
      minus.add(k);
      rest -= k;
    }
  const signed = Array.from({ length: n }, (_, i) => (minus.has(i + 1) ? `- ${i + 1}` : i ? `+ ${i + 1}` : "1")).join(" ").replace(/^- 1/, "-1");
  return {
    prompt: fill(w.prompts.parity, { n }),
    q: options.map((o) => o.tex).join(", \\quad "),
    answer: { k: "near", options, right: at(t), traps },
    show: `${signed} = ${t}`,
    plain: String(t),
    format: "near",
    steps: [`1 + 2 + \\dots + ${n} = ${S}`, `${S} - ${t < 0 ? `(${t})` : t} = ${S - t} = 2 \\cdot ${(S - t) / 2}`, `${signed} = ${t}`],
  };
};

export default gen;
