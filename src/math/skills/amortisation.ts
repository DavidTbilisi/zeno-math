// Practice: loan amortisation (#455), the schedule behind interestRates' level payment. Easy splits one monthly
// payment R on a balance B at the yearly rate r, charged monthly at r/12, into its interest B·r/12 (the yearly rate
// charged for the month, named) or the principal it repays, R − B·r/12 (the whole payment taken as principal, the
// yearly rate charged, named); medium the balance after k payments, L(1 + i)^k − R((1 + i)^k − 1)/i (the payments
// subtracted with no interest, the first month's interest charged every month, named); hard the total interest over
// the loan, nR − L (simple interest on the whole loan, the total paid, named), or the payments it takes to clear a
// balance, the smallest whole n with R(1 − (1 + i)^{−n})/i ≥ B (no interest, rounded down, named). Money to the cent.
import type { NumSlip } from "../calculusTwo";
import { amortBalance, money, paymentsToClear } from "../finance";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const pc = (r: number) => `${dp(r * 100, 2)}\\%`;
const YEARLY = [0.03, 0.06, 0.09, 0.12];
const MONTHLY = [0.005, 0.0075, 0.01];

function interestPart(r: Rng, w: PracticeWords): Part {
  const B = r.pick([6000, 12000, 18000, 24000, 36000]);
  const y = r.pick(YEARLY);
  const R = r.pick([400, 500, 600, 800]);
  const I = (B * y) / 12;
  return {
    prompt: w.fin.prompt.amortInterest,
    q: `B = ${B}, \\ r = ${pc(y)}, \\ R = ${R}`,
    ...money(I, [["yearlyRateMonthly", B * y]]),
    steps: [`I = B \\cdot \\frac{r}{12} = ${B} \\cdot \\frac{${y}}{12}`, `I = ${I.toFixed(2)}`],
  };
}

function principalPart(r: Rng, w: PracticeWords): Part {
  const B = r.pick([6000, 12000, 18000, 24000, 36000]);
  const y = r.pick(YEARLY);
  const R = r.pick([400, 500, 600, 800]);
  const I = (B * y) / 12;
  const v = R - I;
  const slips: NumSlip[] = [["wholePaymentPrincipal", R]];
  // Charging the yearly rate for a month leaves R − B·r, below zero when that interest is more than R.
  if (R - B * y > 0) slips.push(["yearlyRateMonthly", R - B * y]);
  return {
    prompt: w.fin.prompt.amortPrincipal,
    q: `B = ${B}, \\ r = ${pc(y)}, \\ R = ${R}`,
    ...money(v, slips),
    steps: [`I = B \\cdot \\frac{r}{12} = ${I.toFixed(2)}`, `R - I = ${R} - ${I.toFixed(2)} = ${v.toFixed(2)}`],
  };
}

/** A loan L at the monthly rate i over n months, and its payment to the cent. */
function loan(r: Rng) {
  const L = r.pick([5000, 10000, 20000, 30000]);
  const i = r.pick(MONTHLY);
  const n = r.pick([24, 36, 48, 60]);
  const R = Math.round(((L * i) / (1 - (1 + i) ** -n)) * 100) / 100;
  return { L, i, n, R };
}

function balancePart(r: Rng, w: PracticeWords): Part {
  // The loan's length sets its payment; the question is about the first k payments only.
  const { L, i, R } = loan(r);
  const k = r.pick([6, 12, 18]);
  const v = amortBalance(L, i, R, k);
  return {
    prompt: w.fin.prompt.amortBalance,
    q: `L = ${L}, \\ i = ${pc(i)}, \\ R = ${R.toFixed(2)}, \\ k = ${k}`,
    ...money(v, [["balanceNoInterest", L - k * R], ["balanceFirstInterest", L - k * (R - L * i)]]),
    steps: [
      `B_k = L(1 + i)^{k} - R \\cdot \\frac{(1 + i)^{k} - 1}{i}`,
      `B_{${k}} = ${L} \\cdot ${1 + i}^{${k}} - ${R.toFixed(2)} \\cdot \\frac{${1 + i}^{${k}} - 1}{${i}} \\approx ${v.toFixed(2)}`,
    ],
  };
}

function totalPart(r: Rng, w: PracticeWords): Part {
  const { L, i, n, R } = loan(r);
  const v = n * R - L;
  return {
    prompt: w.fin.prompt.amortTotal,
    q: `L = ${L}, \\ i = ${pc(i)}, \\ n = ${n}, \\ R = ${R.toFixed(2)}`,
    ...money(v, [["interestOnWholeLoan", L * i * n], ["totalPaidForInterest", n * R]]),
    steps: [`nR = ${n} \\cdot ${R.toFixed(2)} = ${(n * R).toFixed(2)}`, `nR - L = ${(n * R).toFixed(2)} - ${L} = ${v.toFixed(2)}`],
  };
}

function paymentsPart(r: Rng, w: PracticeWords): Part {
  const B = r.pick([5000, 8000, 10000, 12000]);
  const i = r.pick(MONTHLY);
  // A payment well above the first month's interest, and one that doesn't clear the balance in a whole number of months.
  const R = r.pick([200, 250, 300, 400, 500].filter((x) => x > 1.5 * B * i && !Number.isInteger(-Math.log(1 - (B * i) / x) / Math.log(1 + i))));
  const exact = -Math.log(1 - (B * i) / R) / Math.log(1 + i);
  const v = paymentsToClear(B, i, R);
  const slips = [Math.ceil(B / R), Math.floor(exact)];
  const traps = (
    [
      ["paymentsNoInterest", slips[0]],
      ["paymentsRoundedDown", slips[1]],
    ] as const
  )
    .filter(([, x], j, all) => x !== v && all.findIndex(([, y]) => y === x) === j)
    .map(([id, x]) => ({ id, a: num(x) }));
  return {
    prompt: w.fin.prompt.amortPayments,
    q: `B = ${B}, \\ i = ${pc(i)}, \\ R = ${R}`,
    answer: { ...num(v), ...(traps.length ? { traps } : {}) },
    show: String(v),
    plain: String(v),
    format: "number",
    steps: [
      `R \\cdot \\frac{1 - (1 + i)^{-n}}{i} \\ge B \\iff n \\ge -\\frac{\\ln(1 - Bi/R)}{\\ln(1 + i)}`,
      `n \\ge -\\frac{\\ln(1 - ${dp((B * i) / R, 4)})}{\\ln ${1 + i}} \\approx ${dp(exact, 2)}, \\quad n = ${v}`,
    ],
  };
}

const gen: Gen = (r, L, w) =>
  L === 1
    ? r.next() < 0.5
      ? interestPart(r, w)
      : principalPart(r, w)
    : L === 2
      ? balancePart(r, w)
      : r.next() < 0.5
        ? totalPart(r, w)
        : paymentsPart(r, w);

export default gen;
