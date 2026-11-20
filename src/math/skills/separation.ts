// Practice: separation of variables. Easy finds the decay rate k(nπ/L)² of a heat-equation mode (not squared, k left
// out, named) or the angular frequency cnπ/L of a wave-equation mode (squared, c left out, named); medium evaluates a
// plucked string u = Σ aₙ sin(nx) cos(nt) at a point (the time factor dropped, every mode given the frequency 1,
// named) or the steady state of a rod with fixed end temperatures (the average of the ends, decay to 0, named); hard
// evaluates the solution of Laplace's equation in the unit disc, a + b rᵐ cos mθ + c rⁿ sin nθ, inside it (r for every
// power of r, the boundary value, named).
import { exact } from "../calculusTwo";
import { F, coefTex, piPow, sumTex, trig, waveAt } from "../pdes";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const nonzero = (r: Rng, lo: number, hi: number) => {
  let v: number;
  do v = r.int(lo, hi);
  while (v === 0);
  return v;
};
/** nπ/L reduced, as TeX, with an optional factor after π: 2π, \\frac{3\\pi}{4}, \\frac{\\pi x}{2}. */
const nPiOver = (n: number, L: number, after = "") => {
  const q = F(n, L);
  const top = `${q.n === 1 ? "" : q.n}\\pi${after}`;
  return q.d === 1 ? top : `\\frac{${top}}{${q.d}}`;
};

function modePart(r: Rng, w: PracticeWords): Part {
  const n = r.int(1, 4);
  const L = r.int(1, 4);
  const mode = F(n, L).d === 1 ? `\\sin(${nPiOver(n, L, " x")})` : `\\sin\\left(${nPiOver(n, L, " x")}\\right)`;
  const nPiL = nPiOver(n, L);
  if (r.next() < 0.5) {
    const k = r.int(2, 4);
    return {
      prompt: fill(w.pde.prompt.heatRate, { n, L }),
      q: `u_{t} = ${k} u_{xx}, \\quad 0 < x < ${L}, \\quad u(0, t) = u(${L}, t) = 0, \\quad X(x) = ${mode}`,
      ...piPow(F(k * n * n, L * L), 2, [["heatRateNotSquared", (k * n * Math.PI) / L], ["heatRateNoK", (n * n * Math.PI ** 2) / (L * L)]]),
      steps: [`X'' = -\\left(${nPiL}\\right)^{2} X, \\quad T' = -${k}\\left(${nPiL}\\right)^{2} T`, `\\lambda = ${k}\\left(${nPiL}\\right)^{2} = ${piPow(F(k * n * n, L * L), 2).show}`],
    };
  }
  const c = r.int(2, 4);
  return {
    prompt: fill(w.pde.prompt.waveFrequency, { n, L }),
    q: `u_{tt} = ${c * c} u_{xx}, \\quad 0 < x < ${L}, \\quad u(0, t) = u(${L}, t) = 0, \\quad X(x) = ${mode}`,
    ...piPow(F(c * n, L), 1, [["waveFrequencySquared", ((c * n * Math.PI) / L) ** 2], ["waveFrequencyNoC", (n * Math.PI) / L]]),
    steps: [`c = \\sqrt{${c * c}} = ${c}`, `T'' = -${c * c}\\left(${nPiL}\\right)^{2} T`, `\\omega = ${c} \\cdot ${nPiL} = ${piPow(F(c * n, L), 1).show}`],
  };
}

const piTex = (p: Frac) => (p.n === 1 && p.d === 1 ? "\\pi" : p.d === 1 ? `${p.n}\\pi` : `\\frac{${p.n === 1 ? "" : p.n}\\pi}{${p.d}}`);
const piPlain = (p: Frac) => (p.d === 1 ? (p.n === 1 ? "π" : `${p.n}π`) : `${p.n === 1 ? "" : p.n}π/${p.d}`);

function stringPart(r: Rng, w: PracticeWords): Part {
  // u_tt = u_xx on (0, π), u = 0 at both ends, u_t(x, 0) = 0: u = Σ aₙ sin(nx) cos(nt), modes 1, 3, 5.
  const ns = r.pick([[1, 3], [1, 5], [3, 5], [1, 3, 5]]);
  const modes: [number, number][] = ns.map((n) => [n, nonzero(r, -4, 4)]);
  const x = r.pick([F(1, 2), F(1, 6)]);
  const t = r.pick([F(1, 3), F(2, 3)]);
  const v = waveAt(modes, x, t);
  const initial = waveAt(modes, x, F(0));
  const same = waveAt(modes, x, t, true);
  const sinN = (n: number) => `\\sin(${n === 1 ? "" : n}x)`;
  const cosN = (n: number) => `\\cos(${n === 1 ? "" : n}t)`;
  return {
    prompt: fill(w.pde.prompt.waveValue, { x: piPlain(x), t: piPlain(t) }),
    q: `u(x, 0) = ${sumTex(modes.map(([n, a]) => coefTex(a, sinN(n))))}, \\quad u_{t}(x, 0) = 0`,
    ...exact(v, [["timeFactorDropped", initial], ["modesSameFrequency", same]]),
    steps: [
      `u(x, t) = ${sumTex(modes.map(([n, a]) => coefTex(a, `${sinN(n)}${cosN(n)}`)))}`,
      `u\\left(${piTex(x)}, ${piTex(t)}\\right) = ${sumTex(modes.map(([n, a]) => coefTex(a, `\\left(${trig("sin", x.mul(F(n)))!.tex()}\\right)\\left(${trig("cos", t.mul(F(n)))!.tex()}\\right)`)))} = ${v.tex()}`,
    ],
  };
}

function steadyPart(r: Rng, w: PracticeWords): Part {
  const L = r.int(3, 5);
  let x: number;
  do x = r.int(1, L - 1);
  while (2 * x === L);
  const A = r.int(-10, 10);
  let B: number;
  do B = r.int(-10, 10);
  while (B === A);
  const v = F(A).add(F((B - A) * x, L));
  return {
    prompt: fill(w.pde.prompt.steadyState, { x }),
    q: `u_{t} = u_{xx}, \\quad 0 < x < ${L}, \\quad u(0, t) = ${A}, \\quad u(${L}, t) = ${B}, \\quad u(x, 0) = ${L}x - x^{2}`,
    ...exact(v, [["steadyStateAverage", F(A + B, 2)], ["steadyStateZero", 0]]),
    steps: [`u_{xx} = 0, \\quad u(x) = ${A} + \\frac{${B} - ${A < 0 ? `(${A})` : A}}{${L}} x`, `u(${x}) = ${v.tex()}`],
  };
}

function discPart(r: Rng, w: PracticeWords): Part {
  // u = a + b rᵐ cos mθ + c rⁿ sin nθ, evaluated where every sine and cosine is 0 or ±1.
  const a = r.int(-3, 3);
  let b: number, c: number, m: number, n: number, th: Frac, cm: Frac, sn: Frac;
  do {
    b = nonzero(r, -4, 4);
    c = nonzero(r, -4, 4);
    m = r.int(1, 3);
    n = r.int(1, 3);
    th = r.pick([F(0), F(1, 2), F(1)]);
    cm = trig("cos", th.mul(F(m)))!;
    sn = trig("sin", th.mul(F(n)))!;
  } while ((cm.isZero() || m === 1) && (sn.isZero() || n === 1));
  const rad = r.pick([F(1, 2), F(1, 3), F(2, 3)]);
  const pow = (k: number) => Array.from({ length: k }, () => rad).reduce((p, q) => p.mul(q), F(1));
  const at = (pm: Frac, pn: Frac) => F(a).add(F(b).mul(pm).mul(cm)).add(F(c).mul(pn).mul(sn));
  const v = at(pow(m), pow(n));
  const mt = (k: number) => (k === 1 ? "\\theta" : `${k}\\theta`);
  const rp = (k: number) => (k === 1 ? "r" : `r^{${k}}`);
  return {
    prompt: fill(w.pde.prompt.disc, { r: `${rad.n}/${rad.d}`, theta: th.isZero() ? "0" : piPlain(th) }),
    q: `\\Delta u = 0, \\quad r < 1, \\quad u(1, \\theta) = ${sumTex([a === 0 ? "" : String(a), coefTex(b, `\\cos(${mt(m)})`), coefTex(c, `\\sin(${mt(n)})`)])}`,
    ...exact(v, [["radialPowerOne", at(rad, rad)], ["boundaryValueTaken", at(F(1), F(1))]]),
    steps: [
      `u(r, \\theta) = ${sumTex([a === 0 ? "" : String(a), coefTex(b, `${rp(m)}\\cos(${mt(m)})`), coefTex(c, `${rp(n)}\\sin(${mt(n)})`)])}`,
      `u = ${sumTex([a === 0 ? "" : String(a), coefTex(b, `\\left(${rad.tex()}\\right)^{${m}}(${cm.tex()})`), coefTex(c, `\\left(${rad.tex()}\\right)^{${n}}(${sn.tex()})`)])} = ${v.tex()}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? modePart(r, w) : L === 2 ? (r.next() < 0.5 ? stringPart(r, w) : steadyPart(r, w)) : discPart(r, w));

export default gen;
