// Practice: one-step methods for y′ = f(x, y). Easy takes one step of Euler's method (the slope not multiplied by h,
// the slope given for the value, named); medium one step of the improved Euler (Heun) method (Euler's value, the two
// slopes not halved, named); hard one step of the classical Runge–Kutta method (the four slopes weighted equally,
// named) or how a method's global error shrinks when the step is cut (as h, as hᵖ⁺¹, named).
import { exact } from "../calculusTwo";
import { F, eulerStep, heunStep, rk4Step, type Slope } from "../numericalAnalysis";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

type Ode = { tex: string; f: Slope };

/** a x + b y + c written out, zero terms left out and 1 not written. */
function linTex(terms: [number, string][]): string {
  let out = "";
  for (const [k, v] of terms) {
    if (k === 0) continue;
    const size = Math.abs(k) === 1 && v ? "" : String(Math.abs(k));
    out += out ? ` ${k < 0 ? "-" : "+"} ${size}${v}` : `${k < 0 ? "-" : ""}${size}${v}`;
  }
  return out || "0";
}

/** y′ = ax + by + c, or y′ = axy. */
function odeOf(r: Rng): Ode {
  const a = r.pick([-2, -1, 1, 2, 3]);
  const b = r.pick([-1, 1, 2]);
  if (r.next() < 0.3) return { tex: `y' = ${a === 1 ? "" : a === -1 ? "-" : a}xy`, f: (x, y) => F(a).mul(x).mul(y) };
  const c = r.int(-3, 3);
  return { tex: `y' = ${linTex([[a, "x"], [b, "y"], [c, ""]])}`, f: (x, y) => F(a).mul(x).add(F(b).mul(y)).add(F(c)) };
}

const start = (r: Rng) => ({ x0: F(r.int(0, 2)), y0: F(r.int(-2, 4)), h: r.pick([F(1, 10), F(1, 5), F(1, 4), F(1, 2)]) });
const given = (ode: Ode, x0: Frac, y0: Frac, h: Frac) =>
  `${ode.tex}, \\quad y(${x0.tex()}) = ${y0.tex()}, \\quad h = ${h.tex()}`;

function eulerPart(r: Rng, w: PracticeWords): Part {
  let ode: Ode;
  let s: ReturnType<typeof start>;
  // Redraw until the slope at the start is neither 0 nor 1, so the slips differ from the answer and each other.
  do [ode, s] = [odeOf(r), start(r)];
  while (ode.f(s.x0, s.y0).isZero() || ode.f(s.x0, s.y0).isOne());
  const { x0, y0, h } = s;
  const k = ode.f(x0, y0);
  const y1 = eulerStep(ode.f, x0, y0, h);
  return {
    prompt: w.na.prompt.euler,
    q: given(ode, x0, y0, h),
    ...exact(y1, [["eulerStepNotScaled", y0.add(k)], ["eulerSlopeOnly", k]]),
    steps: [`f(${x0.tex()}, ${y0.tex()}) = ${k.tex()}`, `y_1 = y_0 + h f(x_0, y_0) = ${y0.tex()} + ${h.tex()} \\cdot ${k.texP()} = ${y1.tex()}`],
  };
}

function heunPart(r: Rng, w: PracticeWords): Part {
  let ode: Ode;
  let s: ReturnType<typeof start>;
  let step: ReturnType<typeof heunStep>;
  // Redraw until the two slopes differ and do not cancel, so Euler's value and the unhalved sum are both wrong.
  do {
    [ode, s] = [odeOf(r), start(r)];
    step = heunStep(ode.f, s.x0, s.y0, s.h);
  } while (step.k1.add(step.k2).isZero() || step.k1.sub(step.k2).isZero());
  const { x0, y0, h } = s;
  const { k1, k2, y1 } = step;
  return {
    prompt: w.na.prompt.heun,
    q: given(ode, x0, y0, h),
    ...exact(y1, [["heunEulerOnly", y0.add(h.mul(k1))], ["heunNotHalved", y0.add(h.mul(k1.add(k2)))]]),
    steps: [
      `k_1 = f(${x0.tex()}, ${y0.tex()}) = ${k1.tex()}`,
      `k_2 = f(x_0 + h, \\; y_0 + h k_1) = f(${x0.add(h).tex()}, ${y0.add(h.mul(k1)).tex()}) = ${k2.tex()}`,
      `y_1 = y_0 + \\frac{h}{2}(k_1 + k_2) = ${y1.tex()}`,
    ],
  };
}

function hardPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const lam = r.pick([-2, -1, 1, 2]);
    const ode: Ode = { tex: `y' = ${lam === 1 ? "" : lam === -1 ? "-" : lam}y`, f: (_x, y) => F(lam).mul(y) };
    const x0 = F(0);
    const y0 = F(r.int(1, 4));
    const h = r.pick([F(1, 10), F(1, 5), F(1, 2)]);
    const { k, y1 } = rk4Step(ode.f, x0, y0, h);
    const flat = y0.add(h.mul(k[0].add(k[1]).add(k[2]).add(k[3])).div(F(4)));
    return {
      prompt: w.na.prompt.rk4,
      q: given(ode, x0, y0, h),
      ...exact(y1, [["rk4WeightsEqual", flat]]),
      steps: [
        `k_1 = ${k[0].tex()}, \\quad k_2 = f\\left(x_0 + \\tfrac{h}{2}, \\; y_0 + \\tfrac{h}{2} k_1\\right) = ${k[1].tex()}`,
        `k_3 = f\\left(x_0 + \\tfrac{h}{2}, \\; y_0 + \\tfrac{h}{2} k_2\\right) = ${k[2].tex()}, \\quad k_4 = f(x_0 + h, \\; y_0 + h k_3) = ${k[3].tex()}`,
        `y_1 = y_0 + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4) = ${y1.tex()}`,
      ],
    };
  }
  const [method, p] = r.pick([["euler", 1], ["heun", 2], ["rk4", 4]] as ["euler" | "heun" | "rk4", number][]);
  const k = r.pick([2, 3, 10]);
  const h = r.pick([F(1, 10), F(1, 5), F(1, 20)]);
  const e = F(r.int(1, 9) * k ** (p + 1), 10 ** r.int(2, 4));
  const shrunk = e.div(F(k ** p));
  return {
    prompt: fill(w.na.prompt.errorScale, { m: w.na.methods[method], k }),
    q: `h = ${h.tex()}, \\quad E(h) = ${e.tex()}, \\quad h' = \\frac{h}{${k}}`,
    ...exact(shrunk, [["errorLinearScaling", e.div(F(k))], ["errorOrderLocal", e.div(F(k ** (p + 1)))]]),
    steps: [`E(h) \\approx C h^{${p}}`, `E\\left(\\frac{h}{${k}}\\right) \\approx \\frac{E(h)}{${k}^{${p}}} = \\frac{${e.tex()}}{${k ** p}} = ${shrunk.tex()}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? eulerPart(r, w) : L === 2 ? heunPart(r, w) : hardPart(r, w));

export default gen;
