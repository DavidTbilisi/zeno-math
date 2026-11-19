// Practice: Overfitting.
import { fill } from "../chart";
import { errTable, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const r1 = (v: number) => Math.round(v * 10) / 10;
  if (L === 1) {
    // Three models: one fits (both errors low, close), one overfits (train lowest, test high), one underfits (both high).
    const good = r1(r.int(30, 60) / 10);
    const goodTest = r1(good + r.int(5, 15) / 10);
    const overTrain = r1(r.int(2, 15) / 10);
    const overTest = r1(goodTest + r.int(20, 60) / 10);
    const underTrain = r1(goodTest + r.int(30, 60) / 10);
    const underTest = r1(underTrain + r.int(0, 15) / 10);
    const models = [[good, goodTest], [overTrain, overTest], [underTrain, underTest]];
    const order = [0, 1, 2];
    for (let i = 2; i > 0; i--) {
      const j = r.int(0, i);
      [order[i], order[j]] = [order[j], order[i]];
    }
    const ask = r.pick(["over", "under"] as const);
    const names = ["A", "B", "C"];
    const right = order.indexOf(ask === "over" ? 1 : 2);
    const cols = order.map((m) => models[m]);
    const options = names.map((n) => ({ text: n, plain: n, tex: "" }));
    return {
      prompt: ask === "over" ? w.prompts.fitOver : w.prompts.fitUnder,
      q: errTable("", names.map((n) => `\\mathrm{${n}}`), [["E_{\\mathrm{train}}", cols.map((c) => c[0])], ["E_{\\mathrm{test}}", cols.map((c) => c[1])]]),
      answer: { k: "pick", options, right },
      show: `\\mathrm{${names[right]}}: \\ E_{\\mathrm{train}} = ${cols[right][0]}, \\ E_{\\mathrm{test}} = ${cols[right][1]}`,
      plain: names[right],
      format: "pick",
      steps: cols.map((c, j) => `\\mathrm{${names[j]}}: \\ ${c[1]} - ${c[0]} = ${r1(c[1] - c[0])}`),
    };
  }
  if (L === 2) {
    // Validation error is lowest at d*, training error keeps falling: choose d*, not the last degree.
    const n = r.pick([6, 7] as const);
    const best = r.int(2, n - 2);
    const m = r.int(20, 40) / 10;
    const s = r.pick([0.6, 0.8, 1, 1.2] as const);
    const degrees = Array.from({ length: n }, (_, i) => i + 1);
    const val = degrees.map((dg) => r1(m + (dg - best) ** 2 * s + r.int(0, 3) / 10));
    const train = degrees.map((dg) => Math.round(m * 1.05 * 0.62 ** (dg - 1) * 100) / 100);
    return {
      prompt: fill(w.prompts.fitDegree, { n }),
      q: errTable("d", degrees, [["E_{\\mathrm{train}}", train], ["E_{\\mathrm{val}}", val]]),
      answer: { ...num(best), traps: [{ id: "trainError", a: num(n), vars: { d: n } }] },
      show: `d = ${best}`,
      plain: String(best),
      format: "number",
      steps: [`E_{\\mathrm{val}}(${best}) = ${val[best - 1]} = \\min E_{\\mathrm{val}}`],
    };
  }
  // Early stopping: training stops after `pat` epochs in a row without a new lowest validation loss.
  const pat = r.pick([2, 3] as const);
  const best = r.int(4, 10 - pat - 1);
  const vals: number[] = [];
  let low = r.int(150, 250) / 100;
  vals.push(low);
  // A bump shorter than the patience before the best, so it doesn't stop there.
  const bumpAt = r.int(2, best - 2);
  const bumpLen = r.int(1, pat - 1);
  for (let ep = 2; ep <= best; ep++) {
    if (ep >= bumpAt && ep < bumpAt + bumpLen && ep < best) vals.push(Math.round((low + r.int(1, 8) / 100) * 100) / 100);
    else vals.push((low = Math.round((low - r.int(3, 15) / 100) * 100) / 100));
  }
  for (let ep = best + 1; ep <= 10; ep++) vals.push(Math.round((low + r.int(1, 9) / 100) * 100) / 100);
  // Lower again after it stopped: what it never sees.
  vals[9] = Math.round((low - r.int(1, 5) / 100) * 100) / 100;
  let stop = 0;
  let since = 0;
  let min = Infinity;
  for (let ep = 1; ep <= 10 && !stop; ep++) {
    if (vals[ep - 1] < min) (min = vals[ep - 1]), (since = 0);
    else if (++since === pat) stop = ep;
  }
  const at = vals.indexOf(min) + 1;
  return {
    prompt: fill(w.prompts.fitStop, { p: pat }),
    q: errTable("t", vals.map((_, i) => i + 1), [["E_{\\mathrm{val}}", vals]]),
    answer: { ...num(stop), traps: [{ id: "bestEpoch", a: num(at), vars: { b: at, p: pat } }] },
    show: `t = ${stop}`,
    plain: String(stop),
    format: "number",
    steps: [`\\min E_{\\mathrm{val}} = ${min} \\ (t = ${at})`, `t = ${at} + ${pat} = ${stop}`],
  };
};

export default gen;
