// Practice: everyday money (#649). Easy: a sale price after a discount, a bill with a tip, a price with sales tax.
// Medium: simple interest, two percentage changes in a row, and a mark-up as a percentage of the cost. Hard (new
// settings): income tax in bands, the cheaper of two loans, and the better value of two packs. The amount off given
// as the price, the add-on alone, the per cent taken as money, one year's interest only, interest compounded, the two
// percentages added, the mark-up over the selling price, the top rate on all the pay, the lower rate taken for the
// cheaper loan, and the bigger pack taken for the better value are slips.
import type { NumSlip } from "../calculusTwo";
import { fill } from "../chart";
import { money } from "../finance";
import { num } from "../practiceKit";
import { cash } from "../moneySense";
import type { Gen, Part, Trap } from "../practiceTypes";

const m2 = (v: number) => v.toFixed(2);

const gen: Gen = (r, L, w) => {
  const W = w.shop;
  const pick = (options: string[], right: number, traps: Trap[], prompt: string, steps: string[]): Part => {
    const opts = options.map((t) => ({ text: t, plain: t, tex: `\\text{${t}}` }));
    return { prompt, q: "", answer: { k: "pick", options: opts, right, traps: traps.map((t) => (t.a.k === "pick" ? { ...t, a: { ...t.a, options: opts } } : t)) }, show: opts[right].tex, plain: options[right], format: "pick", steps };
  };

  if (L === 1) {
    const t = r.pick(["discount", "tip", "tax"] as const);
    const p = r.pick([12, 24, 36, 40, 45, 60, 80, 120, 150, 250]);
    const pc = t === "discount" ? r.pick([10, 15, 20, 25, 30, 40, 50]) : t === "tip" ? r.pick([10, 12, 15, 18, 20]) : r.pick([5, 6, 8, 10, 20]);
    const part = (p * pc) / 100;
    const v = t === "discount" ? p - part : p + part;
    const slips: NumSlip[] = [
      [t === "discount" ? "discountOnly" : "addOnOnly", part, { p: cash(p), r: pc, part: cash(part), v: cash(v) }],
      ...(t === "discount" && pc >= p ? [] : [["percentAsMoney", t === "discount" ? p - pc : p + pc, { r: pc, p: cash(p), part: cash(part) }] as NumSlip]),
    ];
    return {
      prompt: fill(W[t], { p: m2(p), r: pc }), q: "", ...money(v, slips),
      steps: [`${pc}\\% \\times ${cash(p)} = ${m2(part)}`, `${cash(p)} ${t === "discount" ? "-" : "+"} ${m2(part)} = ${m2(v)}`],
    };
  }

  if (L === 2) {
    const t = r.pick(["interest", "twice", "markup"] as const);
    if (t === "interest") {
      const P = r.pick([200, 400, 500, 800, 1000, 1500, 2500]);
      const rate = r.pick([2, 3, 4, 5, 6]);
      const yrs = r.int(2, 6);
      const I = (P * rate * yrs) / 100;
      return {
        prompt: fill(W.interest, { p: m2(P), r: rate, t: yrs }), q: "",
        ...money(I, [
          ["interestOneYear", (P * rate) / 100, { i: cash((P * rate) / 100), t: yrs, v: cash(I) }],
          ["interestCompound", P * ((1 + rate / 100) ** yrs - 1), { t: yrs }],
        ]),
        steps: [`I = P \\times r \\times t = ${P} \\times ${rate}\\% \\times ${yrs}`, `= ${m2(I)}`],
      };
    }
    if (t === "twice") {
      const p = r.pick([40, 60, 80, 120, 200, 250]);
      const up = r.next() < 0.4;
      const a = r.pick([10, 20, 25, 30]);
      const b = up ? r.pick([a, 10, 20]) : r.pick([10, 20, 25].filter((x) => x !== a));
      const p1 = p * (1 + ((up ? 1 : -1) * a) / 100);
      const v = p1 * (1 - b / 100);
      const sum = p * (1 + ((up ? a : -a) - b) / 100);
      return {
        prompt: fill(up ? W.upDown : W.offOff, { p: m2(p), a, b }), q: "",
        ...money(v, [["percentsAdded", sum, { a, b, p1: cash(p1), cut: cash((p1 * b) / 100), p: cash(p) }]]),
        steps: [`${cash(p)} \\times ${1 + ((up ? 1 : -1) * a) / 100} = ${m2(p1)}`, `${m2(p1)} \\times ${1 - b / 100} = ${m2(v)}`],
      };
    }
    const c = r.pick([20, 40, 50, 80, 120, 160, 200]);
    const mk = r.pick([10, 20, 25, 30, 40, 50, 60, 75]);
    const s = (c * (100 + mk)) / 100;
    return {
      prompt: fill(W.markup, { c: m2(c), s: m2(s) }), q: "",
      answer: { ...num(mk), traps: [{ id: "markupOfSelling", a: num(((s - c) / s) * 100, 0.051), vars: { c: cash(c), s: cash(s), g: cash(s - c) } }] },
      show: `${mk}\\%`, plain: String(mk), format: "number",
      steps: [`${m2(s)} - ${m2(c)} = ${m2(s - c)}`, `\\tfrac{${m2(s - c)}}{${m2(c)}} \\times 100\\% = ${mk}\\%`],
    };
  }

  const t = r.pick(["bands", "loans", "packs"] as const);
  if (t === "bands") {
    // A free allowance, then a basic rate up to a limit, then a higher rate.
    const free = r.pick([10000, 12000, 12500]);
    const top = r.pick([40000, 50000]);
    const [r1, r2] = r.pick([[20, 40], [10, 30], [20, 45]]);
    const pay = r.pick([18000, 26000, 34000, 45000, 58000, 64000, 72000]);
    const basic = (Math.min(pay, top) - Math.min(pay, free)) * (r1 / 100);
    const higher = Math.max(0, pay - top) * (r2 / 100);
    const tax = basic + higher;
    const rate = pay > top ? r2 : r1;
    return {
      prompt: fill(W.bands, { pay, free, top, r1, r2 }), q: "",
      ...money(tax, [["bandWholePay", (pay * rate) / 100, { r: rate, pay, free, top }]]),
      steps: [
        `(${Math.min(pay, top)} - ${free}) \\times ${r1}\\% = ${m2(basic)}`,
        ...(pay > top ? [`(${pay} - ${top}) \\times ${r2}\\% = ${m2(higher)}`, `${m2(basic)} + ${m2(higher)} = ${m2(tax)}`] : []),
      ],
    };
  }
  if (t === "loans") {
    // Loan B has the lower rate but a fee: sometimes the fee is more than the rate saves.
    for (;;) {
      const P = r.pick([1000, 2000, 3000, 5000]);
      const yrs = r.int(2, 5);
      const rb = r.int(3, 8);
      const ra = rb + r.int(1, 3);
      const saved = (P * (ra - rb) * yrs) / 100;
      const fee = Math.round((saved * r.pick([0.5, 0.75, 1.25, 1.6])) / 10) * 10;
      const costA = (P * ra * yrs) / 100;
      const costB = (P * rb * yrs) / 100 + fee;
      if (fee === 0 || costA === costB) continue;
      const right = costA < costB ? 0 : 1;
      const traps: Trap[] = right === 0 ? [{ id: "loanRateOnly", a: { k: "pick", options: [], right: 1 }, vars: { a: cash(costA), b: cash(costB), f: fee } }] : [];
      return pick([W.loanA, W.loanB], right, traps, fill(W.loans, { p: P, t: yrs, ra, rb, f: fee }), [
        `A: ${P} \\times ${ra}\\% \\times ${yrs} = ${m2(costA)}`,
        `B: ${P} \\times ${rb}\\% \\times ${yrs} + ${fee} = ${m2(costB)}`,
      ]);
    }
  }
  for (;;) {
    const small = r.pick([200, 250, 400, 500]);
    const big = small * r.pick([2, 3, 4]);
    const ps = r.int(80, 400) / 100;
    const pb = Number((ps * (big / small) * (r.int(80, 120) / 100)).toFixed(2));
    const [us, ub] = [ps / small, pb / big];
    if (Math.abs(us - ub) / Math.min(us, ub) < 0.03) continue;
    const right = us < ub ? 0 : 1;
    const traps: Trap[] = right === 0 ? [{ id: "unitBiggerCheaper", a: { k: "pick", options: [], right: 1 }, vars: { s: cash(us * 100), b: cash(ub * 100) } }] : [];
    return pick([fill(W.packSmall, { g: small }), fill(W.packBig, { g: big })], right, traps, fill(W.packs, { s: small, ps: m2(ps), b: big, pb: m2(pb) }), [
      `${m2(ps)} \\div ${small / 100} = ${m2(us * 100)} \\text{ ${W.per100}}`,
      `${m2(pb)} \\div ${big / 100} = ${m2(ub * 100)} \\text{ ${W.per100}}`,
    ]);
  }
};

export default gen;
