// Practice: the one-period binomial model. Easy finds the risk-neutral probability p̃ = (1 + r − d)/(u − d) (the
// rate left out, the down chance given, named); medium prices a one-period call or put (not discounted, the
// real-world p used, named); hard the shares Δ₀ of the replicating portfolio (inverted, over S₀, named) or whether a
// model has an arbitrage and which (the direction swapped, a boundary case let through, named).
import { exact, F, pickOf, word } from "../calculusTwo";
import { callPay, expectation, MODELS, price, putPay, riskNeutral, STEPS, type Model } from "../finance";
import type { Frac } from "../fraction";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const modelTex = (m: Pick<Model, "u" | "d" | "r">) => `u = ${m.u.tex()}, \\ d = ${m.d.tex()}, \\ r = ${m.r.tex()}`;

function neutralPart(r: Rng, w: PracticeWords): Part {
  const m = r.pick([...MODELS.filter((x) => x.S0 === 4 || x.S0 === 25), ...STEPS]);
  const p = riskNeutral(m);
  return {
    prompt: w.fin.prompt.riskNeutral,
    q: modelTex(m),
    ...exact(p, [["riskNeutralNoRate", F(1).sub(m.d).div(m.u.sub(m.d))], ["riskNeutralDownMove", F(1).sub(p)]]),
    steps: [`\\tilde p = \\frac{1 + r - d}{u - d} = \\frac{${F(1).add(m.r).tex()} - ${m.d.tex()}}{${m.u.tex()} - ${m.d.tex()}}`, `\\tilde p = ${p.tex()}`],
  };
}

/** A strike strictly between the two prices after one period. */
const strike1 = (r: Rng, m: Model) => r.int(Math.floor(price(m, 0, 1).toNumber()) + 1, Math.ceil(price(m, 1, 0).toNumber()) - 1);
const REAL: Frac[] = [F(1, 3), F(1, 2), F(2, 3), F(3, 5)];

function pricePart(r: Rng, w: PracticeWords): Part {
  const m = r.pick(MODELS);
  const K = strike1(r, m);
  const call = r.next() < 0.5;
  const pay = call ? callPay(K) : putPay(K);
  const p = riskNeutral(m);
  const real = r.pick(REAL.filter((x) => x.toNumber() !== p.toNumber()));
  const [Su, Sd] = [price(m, 1, 0), price(m, 0, 1)];
  const [Vu, Vd] = [pay(Su), pay(Sd)];
  const R = F(1).add(m.r);
  const v = expectation(m, 1, pay).div(R);
  return {
    prompt: call ? w.fin.prompt.call1 : w.fin.prompt.put1,
    q: `S_0 = ${m.S0}, \\ ${modelTex(m)}, \\ p = ${real.tex()}, \\ K = ${K}`,
    ...exact(v, [["priceNotDiscounted", expectation(m, 1, pay)], ["realWorldProbability", real.mul(Vu).add(F(1).sub(real).mul(Vd)).div(R)]]),
    steps: [
      `S_1(H) = ${Su.tex()}, \\ S_1(T) = ${Sd.tex()}, \\quad V_1(H) = ${Vu.tex()}, \\ V_1(T) = ${Vd.tex()}`,
      `\\tilde p = \\frac{1 + r - d}{u - d} = ${p.tex()} \\quad (p \\text{ plays no part})`,
      `V_0 = \\frac{\\tilde p V_1(H) + \\tilde q V_1(T)}{1 + r} = ${v.tex()}`,
    ],
  };
}

function deltaPart(r: Rng, w: PracticeWords): Part {
  const m = r.pick(MODELS);
  const K = strike1(r, m);
  const pay = callPay(K);
  const [Su, Sd] = [price(m, 1, 0), price(m, 0, 1)];
  const [Vu, Vd] = [pay(Su), pay(Sd)];
  const v = Vu.sub(Vd).div(Su.sub(Sd));
  return {
    prompt: w.fin.prompt.delta,
    q: `S_0 = ${m.S0}, \\ ${modelTex(m)}, \\ K = ${K}`,
    ...exact(v, [["deltaInverted", Su.sub(Sd).div(Vu.sub(Vd))], ["deltaOverStockPrice", Vu.sub(Vd).div(F(m.S0))]]),
    steps: [`S_1(H) = ${Su.tex()}, \\ S_1(T) = ${Sd.tex()}, \\quad V_1(H) = ${Vu.tex()}, \\ V_1(T) = ${Vd.tex()}`, `\\Delta_0 = \\frac{V_1(H) - V_1(T)}{S_1(H) - S_1(T)} = ${v.tex()}`],
  };
}

/** u, d, r and which arbitrage it allows: none when d < 1 + r < u, else borrow-and-buy or short-and-lend. */
const ARB: [Frac, Frac, Frac, 0 | 1 | 2][] = [
  [F(2), F(1, 2), F(1, 4), 0], [F(3, 2), F(1, 2), F(1, 4), 0], [F(6, 5), F(4, 5), F(1, 10), 0],
  [F(2), F(5, 4), F(1, 4), 1], [F(3, 2), F(6, 5), F(1, 10), 1], [F(2), F(11, 10), F(1, 10), 1],
  [F(5, 4), F(1, 2), F(1, 4), 2], [F(11, 10), F(4, 5), F(1, 5), 2], [F(6, 5), F(1, 2), F(1, 4), 2],
];

function arbitragePart(r: Rng, w: PracticeWords): Part {
  const [u, d, rate, right] = r.pick(ARB);
  const options = [word(w.fin.arb.none), word(w.fin.arb.buy), word(w.fin.arb.short)];
  const slips: [MistakeId, number][] = right === 0 ? [] : [["arbitrageDirectionSwapped", 3 - right], ["arbitrageMissed", 0]];
  const R = F(1).add(rate);
  const rel = right === 0 ? `${d.tex()} < ${R.tex()} < ${u.tex()}` : right === 1 ? `1 + r = ${R.tex()} \\le d = ${d.tex()}` : `1 + r = ${R.tex()} \\ge u = ${u.tex()}`;
  return {
    prompt: w.fin.prompt.arbitrage,
    q: `S_0 = 4, \\ u = ${u.tex()}, \\ d = ${d.tex()}, \\ r = ${rate.tex()}`,
    ...pickOf(options, right, slips),
    steps: [`\\text{no arbitrage} \\iff d < 1 + r < u`, rel, `\\text{${options[right].text}}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? neutralPart(r, w) : L === 2 ? pricePart(r, w) : r.next() < 0.5 ? deltaPart(r, w) : arbitragePart(r, w));

export default gen;
