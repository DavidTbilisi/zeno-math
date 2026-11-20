// Practice: Pointwise and uniform convergence. Easy finds the pointwise limit at a point (the value on the other side
// of the jump, 1 to the power n taken to stay 1, named); medium finds the sup-norm distance ‖fₙ − 0‖ for a given n (the
// value at the endpoint taken for the supremum, named); hard says whether the convergence is uniform (pointwise taken
// for uniform, a continuous limit taken to make it uniform, a supremum going to 0 not checked, named).
import { exact, numTraps, pickOf, word } from "../calculusTwo";
import type { MistakeId } from "../mistakes";
import { num } from "../practiceKit";
import { F } from "../realAnalysis";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** lim fₙ(x) at one point: xⁿ, nx/(1 + nx), x^(1/n), or (1 + x/n)ⁿ → eˣ. */
function pointwisePart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 3);
  if (kind === 3) {
    const x = r.pick([1, 2, 3, -1]);
    const v = Math.exp(x);
    return {
      prompt: fill(w.real.prompt.pointwise, { x }),
      q: `f_n(x) = \\left(1 + \\frac{x}{n}\\right)^{n}, \\quad x \\in \\mathbb{R}`,
      answer: { ...num(v), traps: numTraps(v, [["oneToInfinity", 1]]) },
      show: `e^{${x}}`,
      plain: `e^${x < 0 ? `(${x})` : x}`,
      format: "exact",
      steps: [`\\left(1 + \\frac{${x}}{n}\\right)^{n} \\to e^{${x}}`],
    };
  }
  const forms = [
    { q: "x^{n}, \\quad x \\in [0, 1]", at: [F(1), F(1, 2), F(1, 3), F(0)], lim: (x: Frac) => (x.isOne() ? 1 : 0), at1: (t: string) => `${t}^{n}` },
    { q: "\\frac{nx}{1 + nx}, \\quad x \\in [0, \\infty)", at: [F(0), F(1), F(2), F(1, 2)], lim: (x: Frac) => (x.isZero() ? 0 : 1), at1: (t: string) => `\\frac{n \\cdot ${t}}{1 + n \\cdot ${t}}` },
    { q: "x^{1/n}, \\quad x \\in [0, \\infty)", at: [F(0), F(0), F(2), F(1, 4)], lim: (x: Frac) => (x.isZero() ? 0 : 1), at1: (t: string) => `${t}^{1/n}` },
  ];
  const f = forms[kind];
  const x = r.pick(f.at);
  const v = f.lim(x);
  const slips: [MistakeId, number][] = kind === 2 && !x.isZero() ? [] : [["pointwiseLimitJump", 1 - v]];
  const xT = x.tex();
  return {
    prompt: fill(w.real.prompt.pointwise, { x: x.d === 1 ? x.n : `${x.n}/${x.d}` }),
    q: `f_n(x) = ${f.q}`,
    ...exact(F(v), slips),
    steps: [`f_n(${xT}) = ${f.at1(x.d === 1 ? xT : `\\left(${xT}\\right)`)} \\to ${v}`],
  };
}

/** ‖fₙ‖ = sup over [0, 1] for one n, where fₙ → 0 pointwise. */
function supNormPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  if (kind === 0) {
    const m = r.int(2, 6);
    const n = m * m;
    const v = F(1, 2 * m);
    return {
      prompt: fill(w.real.prompt.supNorm, { n }),
      q: `f_n(x) = \\frac{x}{1 + nx^{2}}, \\quad n = ${n}`,
      ...exact(v, [["supAtEndpoint", F(1, 1 + n)]]),
      steps: [`f_n'(x) = \\frac{1 - nx^{2}}{(1 + nx^{2})^{2}} = 0 \\iff x = \\frac{1}{\\sqrt{n}} = \\frac{1}{${m}}`, `\\|f_n\\| = f_n\\left(\\frac{1}{${m}}\\right) = ${v.tex()}`],
    };
  }
  const n = r.int(2, 9);
  if (kind === 1)
    return {
      prompt: fill(w.real.prompt.supNorm, { n }),
      q: `f_n(x) = \\frac{nx}{1 + n^{2}x^{2}}, \\quad n = ${n}`,
      ...exact(F(1, 2), [["supAtEndpoint", F(n, 1 + n * n)]]),
      steps: [`f_n'(x) = 0 \\iff nx = 1 \\iff x = \\frac{1}{${n}}`, `\\|f_n\\| = f_n\\left(\\frac{1}{${n}}\\right) = \\frac{1}{1 + 1} = \\frac{1}{2}`],
    };
  return {
    prompt: fill(w.real.prompt.supNorm, { n }),
    q: `f_n(x) = x^{n} - x^{2n}, \\quad n = ${n}`,
    ...exact(F(1, 4), [["supAtEndpoint", F(0)]]),
    steps: [`t = x^{${n}} \\in [0, 1]: \\quad t - t^{2} \\le \\frac{1}{4}, \\; t = \\frac{1}{2}`, `\\|f_n\\| = \\frac{1}{4}`],
  };
}

/** Uniform on the set, or only pointwise? */
function uniformPart(r: Rng, w: PracticeWords): Part {
  const all: { f: string; dom: string; yes: boolean; slip: MistakeId; step: string }[] = [
    { f: "x^{n}", dom: "[0, 1]", yes: false, slip: "pointwiseMeansUniform", step: "f = 0 \\; (x < 1), \\; f(1) = 1: \\quad \\sup_{[0,1)} |x^{n} - 0| = 1" },
    { f: "x^{n}", dom: "\\left[0, \\frac{1}{2}\\right]", yes: true, slip: "supNotComputed", step: "\\sup |x^{n} - 0| = 2^{-n} \\to 0" },
    { f: "\\frac{nx}{1 + n^{2}x^{2}}", dom: "[0, 1]", yes: false, slip: "continuousLimitMeansUniform", step: "f = 0, \\quad f_n\\left(\\frac{1}{n}\\right) = \\frac{1}{2}" },
    { f: "nx\\,e^{-nx}", dom: "[0, \\infty)", yes: false, slip: "continuousLimitMeansUniform", step: "f = 0, \\quad f_n\\left(\\frac{1}{n}\\right) = e^{-1}" },
    { f: "\\frac{x}{1 + nx^{2}}", dom: "\\mathbb{R}", yes: true, slip: "supNotComputed", step: "\\sup |f_n - 0| = \\frac{1}{2\\sqrt{n}} \\to 0" },
    { f: "\\frac{\\sin nx}{n}", dom: "\\mathbb{R}", yes: true, slip: "supNotComputed", step: "\\sup |f_n - 0| = \\frac{1}{n} \\to 0" },
    { f: "\\sum_{k=1}^{n} \\frac{x^{k}}{k^{2}}", dom: "[-1, 1]", yes: true, slip: "supNotComputed", step: "\\left|\\frac{x^{k}}{k^{2}}\\right| \\le \\frac{1}{k^{2}}, \\quad \\sum \\frac{1}{k^{2}} < \\infty" },
    { f: "\\sum_{k=0}^{n} x^{k}", dom: "(-1, 1)", yes: false, slip: "pointwiseMeansUniform", step: "\\sup_{(-1, 1)} \\left|\\frac{1}{1 - x} - f_n(x)\\right| = \\sup \\frac{|x|^{n+1}}{1 - x} = \\infty" },
  ];
  const c = r.pick(all);
  const options = [word(w.real.convergesUniformly), word(w.real.notUniformly)];
  const right = c.yes ? 0 : 1;
  return {
    prompt: w.real.prompt.uniform,
    q: `f_n(x) = ${c.f}, \\quad x \\in ${c.dom}`,
    ...pickOf(options, right, [[c.slip, 1 - right]]),
    steps: [c.step, `\\text{${options[right].text}}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? pointwisePart(r, w) : L === 2 ? supNormPart(r, w) : uniformPart(r, w));

export default gen;
