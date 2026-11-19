// Practice: Money.
import { fill } from "../chart";
import { money, num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

/** Cents as dollars with both places, for the working: 405 → 4.05. */
const dollars = (cents: number) => (cents / 100).toFixed(2);

/**
 * a − b worked column by column taking the smaller digit from the larger and never exchanging (2000 − 1365 → 1365):
 * the classic slip in a subtraction, of whole numbers (amounts in cents).
 */
function smallerFromLarger(a: number, b: number): number {
  const x = String(a);
  const y = String(b).padStart(x.length, "0");
  return Number([...x].map((d, i) => Math.abs(Number(d) - Number(y[i]))).join(""));
}

const gen: Gen = (r, L, w) => {
  if (L === 1) {
    // Dollars and cents in decimal notation, and in cents only (P2). Writing 5 cents as .5 is the trap.
    const [d, c] = [r.int(2, 20), r.next() < 0.5 ? r.int(1, 9) : r.int(10, 95)];
    const cents = 100 * d + c;
    const traps: Trap[] = c < 10 ? [{ id: "centsOneDigit", a: num(d + c / 10), vars: { c, d } }] : [];
    const kind = r.int(0, 2);
    if (kind === 1)
      return { prompt: fill(w.prompts.moneyCents, { a: money(w, cents / 100) }), q: "", answer: num(cents), show: String(cents), plain: String(cents), format: "number", steps: [`${dollars(cents)} \\times 100 = ${cents}`] };
    const prompt = kind === 0 ? fill(w.prompts.moneyDollars, { d, c }) : fill(w.prompts.moneyFromCents, { n: cents });
    const steps = kind === 0 ? [`${c} \\div 100 = ${dollars(c)}`, `${d} + ${dollars(c)} = ${dollars(cents)}`] : [`${cents} \\div 100 = ${dollars(cents)}`];
    return { prompt, q: "", answer: { ...num(cents / 100), traps }, show: dollars(cents), plain: dollars(cents), format: "number", steps };
  }
  if (L === 2) {
    // Adding two amounts, the change from a note, or what is left of an amount after spending some (P3), worked in
    // cents so nothing is lost to rounding.
    const kind = r.int(0, 2);
    if (kind === 0) {
      const [a, b] = [r.int(105, 4995), r.int(105, 4995)];
      return { prompt: fill(w.prompts.moneyAdd, { a: money(w, a / 100), b: money(w, b / 100) }), q: "", answer: num((a + b) / 100), show: dollars(a + b), plain: dollars(a + b), format: "number", steps: [`${dollars(a)} + ${dollars(b)} = ${dollars(a + b)}`] };
    }
    if (kind === 1) {
      const note = r.pick([10, 20, 50]);
      let price: number;
      do price = r.int(105, 100 * note - 5);
      while (price % 100 === 0);
      const change = 100 * note - price;
      return { prompt: fill(w.prompts.moneyChange, { a: money(w, price / 100), b: money(w, note) }), q: "", answer: num(change / 100), show: dollars(change), plain: dollars(change), format: "number", steps: [`${dollars(100 * note)} - ${dollars(price)} = ${dollars(change)}`] };
    }
    // Two amounts with an exchange to make: taking the smaller digit from the larger in every column is the trap.
    let a: number, b: number;
    do [a, b] = [r.int(1005, 4995), r.int(105, 2995)];
    while (b >= a || smallerFromLarger(a, b) === a - b);
    const traps: Trap[] = [{ id: "smallerFromLarger", a: num(smallerFromLarger(a, b) / 100), vars: { a: dollars(a), b: dollars(b), v: dollars(a - b) } }];
    return { prompt: fill(w.prompts.moneyLeft, { a: money(w, a / 100), b: money(w, b / 100) }), q: "", answer: { ...num((a - b) / 100), traps }, show: dollars(a - b), plain: dollars(a - b), format: "number", steps: [`${dollars(a)} - ${dollars(b)} = ${dollars(a - b)}`] };
  }
  // A few of one thing and one of another, paid with the smallest note that covers them. Paying for one of each is the trap.
  const [p, b, k] = [5 * r.int(11, 99), 5 * r.int(100, 400), r.int(2, 4)];
  const cost = k * p + b;
  const paid = 100 * [10, 20, 50, 100].find((n) => 100 * n > cost)!;
  const change = paid - cost;
  const traps: Trap[] = [{ id: "oneOfEach", a: num((paid - p - b) / 100), vars: { k, p: money(w, p / 100) } }];
  return {
    prompt: fill(w.prompts.moneyShop, { p: money(w, p / 100), b: money(w, b / 100), k, t: money(w, paid / 100) }),
    q: "",
    answer: { ...num(change / 100), traps },
    show: dollars(change),
    plain: dollars(change),
    format: "number",
    steps: [`${k} \\times ${dollars(p)} = ${dollars(k * p)}`, `${dollars(k * p)} + ${dollars(b)} = ${dollars(cost)}`, `${dollars(paid)} - ${dollars(cost)} = ${dollars(change)}`],
  };
};

export default gen;
