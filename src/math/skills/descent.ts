// Practice: Gradient descent.
import { fill } from "../chart";
import { parseE } from "../expr";
import type { Frac } from "../fraction";
import { exprPart, fr, num, numPart, par, polyStr } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

/** A decimal as written: to 6 places at most, so no float noise shows. */
const dec6 = (v: number) => String(Math.round(v * 1e6) / 1e6);

/** One step of gradient descent on ax² + bx + c from x (uphill: the step taken up the slope instead). */
const gdStep = (x: Frac, a: number, b: number, eta: Frac, uphill = false) => {
  const s = eta.mul(x.mul(fr(2 * a)).add(fr(b)));
  return uphill ? x.add(s) : x.sub(s);
};

const gen: Gen = (r, L, w) => {
  if (L === 3) {
    // f = ax²: every step multiplies x by q = 1 − 2aη, so 0 < q < 1 settles, −1 < q < 0 zig-zags in, q < −1 out.
    const a = r.pick([1, 2, 4, 5] as const);
    const fate = r.pick(["steady", "zigzag", "diverge"] as const);
    const qOf = (eta: number) => Math.round((1 - 2 * a * eta) * 1000) / 1000;
    const eta = r.pick([0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.6, 0.75, 1.25, 1.5].filter((e) => {
      const q = qOf(e);
      return fate === "steady" ? q > 0 && q < 1 : fate === "zigzag" ? q < 0 && q > -1 : q < -1;
    }));
    const q = qOf(eta);
    const fates = ["steady", "zigzag", "diverge"] as const;
    const options = fates.map((k) => ({ text: w.fates[k].text, plain: w.fates[k].plain, tex: "" }));
    const show = `x_{n+1} = x_n - ${eta} \\cdot ${2 * a} x_n = ${q}\\, x_n`;
    return {
      prompt: fill(w.prompts.gdRate, { eta }),
      q: `f(x) = ${polyStr([0, 0, a])}`,
      answer: { k: "pick", options, right: fates.indexOf(fate) },
      show,
      plain: options[fates.indexOf(fate)].plain,
      format: "pick",
      steps: [`f'(x) = ${polyStr([0, 2 * a])}`, show, `|${q}| ${Math.abs(q) < 1 ? "<" : ">"} 1`],
      // f′(x), then what every step multiplies x by.
      worked: [
        exprPart(w.prompts.stepDiff, `f'(x)`, parseE(polyStr([0, 2 * a]))),
        numPart(w.prompts.stepWork, `x_{n+1} = x_n - ${eta} f'(x_n) = q\\, x_n: \\quad q`, q),
      ],
    };
  }
  // f = ax² + bx + c from a whole x₀ ≠ 0, η a simple fraction, so every step is an exact decimal.
  const [a, b, c] = [r.int(1, 3), r.nz(-8, 8), r.int(0, 9)];
  const eta = r.pick(L === 1 ? [fr(1, 10), fr(1, 5), fr(1, 4), fr(1, 20)] : [fr(1, 10), fr(1, 5), fr(1, 4)]);
  let x0: number;
  do x0 = r.nz(-5, 5);
  while (2 * a * x0 + b === 0);
  const xs = [fr(x0)];
  const ups = [fr(x0)];
  for (let i = 0; i < L; i++) (xs.push(gdStep(xs[i], a, b, eta)), ups.push(gdStep(ups[i], a, b, eta, true)));
  const v = xs[L].toNumber();
  const up = ups[L].toNumber();
  const traps: Trap[] = Math.abs(up - v) > 1e-9 && Math.abs(up + v) > 1e-9 ? [{ id: "uphill", a: num(up) }] : [];
  const e = dec6(eta.toNumber());
  const steps = [`f'(x) = ${polyStr([b, 2 * a])}`];
  for (let i = 0; i < L; i++) {
    const g = xs[i].mul(fr(2 * a)).add(fr(b));
    steps.push(`x_${i + 1} = x_${i} - \\eta f'(x_${i}) = ${dec6(xs[i].toNumber())} - ${e} \\cdot ${par(dec6(g.toNumber()))} = ${dec6(xs[i + 1].toNumber())}`);
  }
  return {
    prompt: fill(L === 1 ? w.prompts.gdStep : w.prompts.gdTwo, { x: x0, eta: e }),
    q: `f(x) = ${polyStr([c, b, a])}`,
    answer: { ...num(v), traps },
    show: `x_${L} = ${dec6(v)}`,
    plain: dec6(v),
    format: "number",
    steps,
    // f′(x); then one step's slope at x₀, or two steps' first.
    worked: [
      exprPart(w.prompts.stepDiff, `f'(x)`, parseE(polyStr([b, 2 * a]))),
      L === 1
        ? numPart(w.prompts.stepWork, `f'(${x0})`, 2 * a * x0 + b)
        : numPart(w.prompts.stepWork, `x_1 = x_0 - ${e} \\cdot f'(x_0)`, xs[1].toNumber()),
    ],
  };
};

export default gen;
