// Practice: Series and sums. Since #729, four medium questions in ten are a finite geometric series in a story:
// shares of a post over n days, where the last day's shares alone and a day too many are slips. Since #751 half the
// easy seeds read Σ notation (a sum's value, the top term left out or the start moved, named; which Σ writes a sum,
// the last term taken for the top, named) and four hard seeds in ten are a bouncing ball, a setting the easier levels
// did not show (the distance up counted once, or the first drop twice, named).
import { exact, F, shuffled, sym } from "../calculusTwo";
import { fill } from "../chart";
import type { MistakeId } from "../mistakes";
import { fr, num, plainFrac, polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const lin = (p: number, q: number, v: string) => `${p === 1 ? "" : p}${v}${q ? ` ${q < 0 ? "-" : "+"} ${Math.abs(q)}` : ""}`;
const sumTex = (xs: number[]) => xs.join(" + ").replace(/\+ -/g, "- ");

/** Σ notation read (#751): a sum's value, or which Σ writes a sum out. */
function sigma(r: Rng, w: PracticeWords): Part {
  const K = w.seK;
  const p = r.int(1, 4);
  // k alone would make its last term its top, and the slip the answer.
  const q = p === 1 ? r.nz(-3, 5) : r.int(-3, 5);
  const f = (k: number) => p * k + q;
  const total = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => f(a + i)).reduce((x, y) => x + y, 0);
  if (r.next() < 0.5) {
    const a = r.int(0, 2);
    const b = a + r.int(3, 6);
    const v = total(a, b);
    const terms = Array.from({ length: b - a + 1 }, (_, i) => f(a + i));
    return {
      prompt: K.evalQ,
      q: `\\sum_{k=${a}}^{${b}} (${lin(p, q, "k")})`,
      ...exact(F(v), [["sigmaTopLeftOut", total(a, b - 1), { b }], ...(a !== 1 ? [["sigmaStartAtOne", total(1, b), { a }] as [MistakeId, number, { a: number }]] : [])]),
      steps: [`k = ${a}, \\dots, ${b}: \\quad ${sumTex(terms)}`, `= ${v}`],
    };
  }
  const n = r.int(5, 12);
  const last = f(n);
  const body = `(${lin(p, q, "k")})`;
  const c1 = f(1) - 1;
  const opts = [
    sym(`\\sum_{k=1}^{${n}} ${body}`, `sum k=1..${n} ${body}`),
    sym(`\\sum_{k=1}^{${last}} ${body}`, `sum k=1..${last} ${body}`),
    sym(`\\sum_{k=0}^{${n}} ${body}`, `sum k=0..${n} ${body}`),
    sym(`\\sum_{k=1}^{${n}} (${lin(1, c1, "k")})`, `sum k=1..${n} (${lin(1, c1, "k")})`),
  ];
  const keep = p === 1 ? [0, 1, 2] : [0, 1, 2, 3];
  return {
    prompt: K.whichQ,
    q: `${sumTex([f(1), f(2), f(3)])} + \\dots + ${last}`.replace(/\+ -/g, "- "),
    ...shuffled(r, keep.map((i) => opts[i]), 0, [["sigmaTopAsLastTerm", 1], ["sigmaStartShifted", 2], ...(p > 1 ? [["sigmaStepLeftOut", 3] as [MistakeId, number]] : [])]),
    steps: [`${lin(p, q, "k")}: \\ k = 1 \\to ${f(1)}`, `${lin(p, q, "k")} = ${last} \\Rightarrow k = ${n}`],
  };
}

/** A ball dropped from H bounces back to q of its height: the distance travelled when it lands for the n-th time. */
function bounce(r: Rng, w: PracticeWords): Part {
  const K = w.seK;
  const [qn, qd] = r.pick([[1, 2], [1, 3], [2, 3], [3, 4]] as const);
  const n = r.int(3, 5);
  const H = qd ** (n - 1) * r.int(1, 2);
  // The heights after each bounce: Hq, Hq², …, Hq^(n−1), each gone up and down.
  const heights = Array.from({ length: n - 1 }, (_, i) => F(H * qn ** (i + 1), qd ** (i + 1)));
  const ups = heights.reduce((x, y) => x.add(y), F(0));
  const v = F(H).add(ups).add(ups);
  return {
    prompt: fill(K.bounceQ, { H, q: `${qn}/${qd}`, n }),
    q: "",
    ...exact(v, [["bounceUpOnlyCounted", F(H).add(ups), { n }], ["bounceDropCountedTwice", F(2 * H).add(ups).add(ups), { H }]]),
    steps: [`${H} + 2\\left(${heights.map((x) => x.tex()).join(" + ")}\\right)`, `= ${H} + 2 \\cdot ${ups.tex()} = ${v.tex()}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1 && r.int(0, 9) >= 5) return sigma(r, w);
  if (L === 3 && r.int(0, 9) >= 6) return bounce(r, w);
  const sol = (topic: string, src: string) => ({ kind: "sequences" as const, spec: { topic, src } });
  const list = (vs: string[]) => `${vs.join(", ")}, …`.replace(/-/g, "−");
  if (L === 1) {
    const [a, d] = [r.int(-5, 15), r.nz(-3, 8)];
    const n = r.int(10, 30);
    const terms = [0, 1, 2, 3].map((i) => String(a + i * d));
    const v = (n * (2 * a + (n - 1) * d)) / 2;
    return { prompt: fill(w.prompts.serSum, { n, list: list(terms) }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol("arith", `${terms.join(", ")}, …; S${n}`) };
  }
  if (L === 2) {
    if (r.int(0, 9) >= 6) return story(r, w);
    if (r.next() < 0.5) {
      const [a, ratio, n] = [r.int(1, 5), r.pick([2, 3] as const), r.int(5, 8)];
      const terms = [0, 1, 2, 3].map((i) => String(a * ratio ** i));
      const v = (a * (ratio ** n - 1)) / (ratio - 1);
      return { prompt: fill(w.prompts.serSum, { n, list: list(terms) }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol("geom", `${terms.join(", ")}, …; S${n}`) };
    }
    const [p, q] = r.pick([[1, 2], [1, 3], [2, 3], [-1, 2], [3, 4], [-1, 3], [-2, 3]] as const);
    const a = r.int(1, 3) * q ** 3;
    const terms = [0, 1, 2, 3].map((i) => (a * p ** i) / q ** i);
    const v = fr(a * q, q - p);
    return {
      prompt: fill(w.prompts.serInf, { list: list(terms.map(String)) }),
      q: "",
      answer: num(v.toNumber(), 1e-9, { lowest: true }),
      show: v.tex(),
      plain: plainFrac(v),
      format: "fraction",
      solution: sol("geom", `${terms.join(", ")}, …; S∞`),
    };
  }
  const N = r.int(10, 30);
  if (r.next() < 0.5) {
    // 1/(k(k + m)) telescopes.
    const m = r.pick([1, 1, 2] as const);
    let v = fr(0);
    for (let k = 1; k <= N; k++) v = v.add(fr(1, k * (k + m)));
    return {
      prompt: w.prompts.serSigma,
      q: `\\sum_{k=1}^{${N}} \\frac{1}{k(k + ${m})}`,
      answer: num(v.toNumber(), 1e-9, { lowest: true }),
      show: v.tex(),
      plain: plainFrac(v),
      format: "fraction",
      solution: sol("sigma", `sum k=1..${N} 1/(k(k + ${m}))`),
    };
  }
  const [p, q, c] = [r.int(0, 3), r.nz(-4, 6), r.int(-5, 5)];
  const f = (k: number) => p * k * k + q * k + c;
  let v = 0;
  for (let k = 1; k <= N; k++) v += f(k);
  const body = polyStr([c, q, p], "k");
  return {
    prompt: w.prompts.serSigma,
    q: `\\sum_{k=1}^{${N}} \\left(${T(polyStr([c, q, p])).replace(/x/g, "k")}\\right)`,
    answer: num(v),
    show: String(v),
    plain: String(v),
    format: "number",
    solution: sol("sigma", `sum k=1..${N} (${body})`),
  };
};

/** Shares of a post: a on day 1, q times as many each day after; all of them over n days. */
function story(r: Rng, w: PracticeWords): Part {
  const W = w.serP;
  const [a, q, n] = [r.pick([2, 3, 5, 10]), r.pick([2, 3]), r.int(5, 8)];
  const sum = (k: number) => (a * (q ** k - 1)) / (q - 1);
  const v = sum(n);
  return {
    prompt: fill(W.storyQ, { a, q: q === 2 ? W.double : W.triple, n }),
    q: "",
    answer: { ...num(v), traps: [
      { id: "lastTermForSum", a: num(a * q ** (n - 1)), vars: { n, v } },
      { id: "seriesOneTooMany", a: num(sum(n + 1)), vars: { k: n + 1, n, v } },
    ] },
    show: String(v),
    plain: String(v),
    format: "number",
    steps: [`a = ${a}, \\quad r = ${q}, \\quad n = ${n}`, `S_{${n}} = \\frac{${a}(${q}^{${n}} - 1)}{${q} - 1} = ${v}`],
  };
}

export default gen;
