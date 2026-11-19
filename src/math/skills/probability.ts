// Practice: Probability.
import { fill } from "../chart";
import { fr, num, plainFrac } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  if (L === 1) {
    const kind = r.pick(["even", "greater", "prime", "mult3"] as const);
    const k = r.int(2, 5);
    const good = kind === "even" ? [2, 4, 6] : kind === "greater" ? [1, 2, 3, 4, 5, 6].filter((x) => x > k) : kind === "prime" ? [2, 3, 5] : [3, 6];
    const p = fr(good.length, 6);
    return {
      prompt: fill(w.prompts.die, { event: fill(w.events[kind], { k }) }),
      q: "",
      answer: num(p.toNumber(), 1e-9, { lowest: true }),
      show: p.tex(),
      plain: plainFrac(p),
      format: "fraction",
      steps: [`\\{${good.join(", ")}\\}: \\quad P = \\frac{${good.length}}{6} = ${p.tex()}`],
    };
  }
  if (L === 2) {
    const k = r.int(2, 12);
    const pairs: string[] = [];
    for (let a = 1; a <= 6; a++) if (k - a >= 1 && k - a <= 6) pairs.push(`(${a}, ${k - a})`);
    const p = fr(pairs.length, 36);
    return {
      prompt: fill(w.prompts.dice, { k }),
      q: "",
      answer: num(p.toNumber(), 1e-9, { lowest: true }),
      show: p.tex(),
      plain: plainFrac(p),
      format: "fraction",
      steps: [`${pairs.join(",\\ ")}`, `P = \\frac{${pairs.length}}{36} = ${p.tex()}`],
    };
  }
  const [red, blue] = [r.int(3, 8), r.int(2, 7)];
  const n = red + blue;
  const p = fr(red * (red - 1), n * (n - 1));
  return {
    prompt: fill(w.prompts.marbles, { r: red, b: blue }),
    q: "",
    answer: num(p.toNumber(), 1e-9, { lowest: true }),
    show: p.tex(),
    plain: plainFrac(p),
    format: "fraction",
    steps: [`P = \\frac{${red}}{${n}} \\cdot \\frac{${red - 1}}{${n - 1}} = \\frac{${red * (red - 1)}}{${n * (n - 1)}} = ${p.tex()}`],
    solution: { kind: "statistics", spec: { topic: "tree", pA: `${red}/${n}`, pBA: `${red - 1}/${n - 1}`, pBnotA: `${red}/${n - 1}`, nameA: w.marbleNames.first, nameB: w.marbleNames.second } },
  };
};

export default gen;
