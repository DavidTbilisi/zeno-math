// Practice: options over several periods. Easy prices a two-period European call or put by backward induction
// (discounted once, the payoff of the average price, named); medium a put from the call by put–call parity (the
// strike not discounted, the sign of S₀ swapped, named); hard a two-period American put, exercised early where that is
// worth more (the European price, the payoff now, named).
import { exact, F } from "../calculusTwo";
import { callPay, expectation, MODELS, pow, price, putPay, riskNeutral, value, type Model } from "../finance";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const modelTex = (m: Model) => `S_0 = ${m.S0}, \\ u = ${m.u.tex()}, \\ d = ${m.d.tex()}, \\ r = ${m.r.tex()}`;
const set = (xs: Frac[]) => `\\{${xs.map((x) => x.tex()).join(", ")}\\}`;

/** The backward induction of a two-period tree, written out. */
function treeSteps(m: Model, pay: (S: Frac) => Frac, american: boolean): string[] {
  const p = riskNeutral(m);
  const q = F(1).sub(p);
  const R = F(1).add(m.r);
  const S2 = [price(m, 2, 0), price(m, 1, 1), price(m, 0, 2)];
  const V2 = S2.map(pay);
  const hold = [0, 1].map((j) => p.mul(V2[j]).add(q.mul(V2[j + 1])).div(R));
  const now = [price(m, 1, 0), price(m, 0, 1)].map(pay);
  const V1 = hold.map((h, j) => (american && now[j].toNumber() > h.toNumber() ? now[j] : h));
  const V0 = value(m, 2, pay, american);
  return [
    `S_2 \\in ${set(S2)}, \\quad V_2 \\in ${set(V2)}, \\quad \\tilde p = ${p.tex()}`,
    american
      ? `V_1(H) = \\max(${now[0].tex()}, ${hold[0].tex()}) = ${V1[0].tex()}, \\quad V_1(T) = \\max(${now[1].tex()}, ${hold[1].tex()}) = ${V1[1].tex()}`
      : `V_1(H) = ${V1[0].tex()}, \\quad V_1(T) = ${V1[1].tex()}`,
    `V_0 = ${american ? `\\max\\left(${pay(F(m.S0)).tex()}, ` : ""}\\frac{\\tilde p V_1(H) + \\tilde q V_1(T)}{1 + r}${american ? "\\right)" : ""} = ${V0.tex()}`,
  ];
}

/** A strike strictly between the lowest and highest prices after two periods, so the option can pay or not. */
const strike2 = (r: Rng, m: Model) => r.int(Math.floor(price(m, 0, 2).toNumber()) + 1, Math.ceil(price(m, 2, 0).toNumber()) - 1);

function europeanPart(r: Rng, w: PracticeWords): Part {
  const m = r.pick(MODELS);
  const K = strike2(r, m);
  const call = r.next() < 0.5;
  const pay = call ? callPay(K) : putPay(K);
  const R = F(1).add(m.r);
  const v = value(m, 2, pay);
  return {
    prompt: call ? w.fin.prompt.call2 : w.fin.prompt.put2,
    q: `${modelTex(m)}, \\ K = ${K}`,
    ...exact(v, [["discountedOnce", expectation(m, 2, pay).div(R)], ["expectedPricePayoff", pay(F(m.S0).mul(R).mul(R)).div(R).div(R)]]),
    steps: treeSteps(m, pay, false),
  };
}

function parityPart(r: Rng, w: PracticeWords): Part {
  const m = r.pick(MODELS);
  const n = r.pick([1, 2]);
  const K = n === 1 ? r.int(Math.floor(price(m, 0, 1).toNumber()) + 1, Math.ceil(price(m, 1, 0).toNumber()) - 1) : strike2(r, m);
  const C = value(m, n, callPay(K));
  const disc = F(K).div(pow(F(1).add(m.r), n));
  const P = C.sub(F(m.S0)).add(disc);
  return {
    prompt: w.fin.prompt.parity,
    q: `S_0 = ${m.S0}, \\ r = ${m.r.tex()}, \\ n = ${n}, \\ K = ${K}, \\ C = ${C.tex()}`,
    ...exact(P, [["parityNotDiscounted", C.sub(F(m.S0)).add(F(K))], ["paritySignSwapped", C.add(F(m.S0)).sub(disc)]]),
    steps: [`C - P = S_0 - \\frac{K}{(1 + r)^{n}}`, `P = C - S_0 + \\frac{K}{(1 + r)^{n}} = ${C.tex()} - ${m.S0} + ${disc.tex()} = ${P.tex()}`],
  };
}

/** The models and strikes where the American put is worth more than the European one. */
const EARLY: [Model, number][] = MODELS.flatMap((m) => {
  const out: [Model, number][] = [];
  for (let K = Math.floor(price(m, 0, 2).toNumber()) + 1; K < price(m, 2, 0).toNumber(); K++)
    if (value(m, 2, putPay(K), true).toNumber() > value(m, 2, putPay(K)).toNumber() + 1e-9) out.push([m, K]);
  return out;
});

function americanPart(r: Rng, w: PracticeWords): Part {
  const [m, K] = r.pick(EARLY);
  const pay = putPay(K);
  return {
    prompt: w.fin.prompt.american,
    q: `${modelTex(m)}, \\ K = ${K}`,
    ...exact(value(m, 2, pay, true), [["americanAsEuropean", value(m, 2, pay)], ["intrinsicValueOnly", pay(F(m.S0))]]),
    steps: treeSteps(m, pay, true),
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? europeanPart(r, w) : L === 2 ? parityPart(r, w) : americanPart(r, w));

export default gen;
