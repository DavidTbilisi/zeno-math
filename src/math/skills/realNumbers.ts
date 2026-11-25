// Practice: Real numbers. Easy: rational or irrational (roots of square numbers, recurring decimals, π), and the two
// whole numbers in a row √n lies between. Medium: a recurring decimal as a fraction in lowest terms, and the largest of
// four mixed reals. Hard: quotients and sums in standard form, and whether a sum or product of rationals and
// irrationals is always rational, always irrational, or can be either. A root always taken for irrational, a recurring
// decimal taken for irrational, π taken for 22/7, √n taken for n/2 or read as n, a recurring decimal cut off, powers
// added in a division, front numbers added across different powers, and two irrationals always irrational are slips.
import { fill } from "../chart";
import { gcd, num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";

const tidy = (v: number) => String(Number(v.toFixed(6)));
const frac = (n: number, d: number) => {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};
const fTex = ({ n, d }: { n: number; d: number }) => (d === 1 ? String(n) : `\\tfrac{${n}}{${d}}`);
const fPlain = ({ n, d }: { n: number; d: number }) => (d === 1 ? String(n) : `${n}/${d}`);
/** a × 10ⁿ with 1 ≤ a < 10. */
const std = (v: number) => {
  let e = Math.floor(Math.log10(Math.abs(v)));
  let m = Number((v / 10 ** e).toFixed(6));
  if (m >= 10) [m, e] = [Number((m / 10).toFixed(6)), e + 1];
  return { m, e };
};
const stdTex = ({ m, e }: { m: number; e: number }) => `${tidy(m)} \\times 10^{${e}}`;
/** A number asked for in standard form. */
const stdAns = ({ m, e }: { m: number; e: number }) => ({ k: "num" as const, v: m * 10 ** e, tol: 1e-9, std: true });

const gen: Gen = (r, L, w) => {
  const W = w.reals;
  const pick2 = (options: string[], right: number, traps: Trap[], q: string, steps: string[], prompt: string): Part => {
    const opts = options.map((t) => ({ text: t, plain: t, tex: `\\text{${t}}` }));
    return { prompt, q, answer: { k: "pick", options: opts, right, traps: traps.map((t) => (t.a.k === "pick" ? { ...t, a: { ...t.a, options: opts } } : t)) }, show: opts[right].tex, plain: options[right], format: "pick", steps };
  };
  const pickAt = (i: number) => ({ k: "pick" as const, options: [], right: i });

  if (L === 1) {
    if (r.next() < 0.55) {
      const kind = r.pick(["square", "root", "recurring", "pi", "fraction", "decimal"] as const);
      const opts = [W.rational, W.irrational];
      if (kind === "square") {
        const k = r.int(2, 12);
        return pick2(opts, 0, [{ id: "rootAlwaysIrrational", a: pickAt(1), vars: { n: k * k, k } }], `\\sqrt{${k * k}}`, [`\\sqrt{${k * k}} = ${k} = \\tfrac{${k}}{1}`], W.classify);
      }
      if (kind === "root") {
        let n: number;
        do n = r.int(2, 99);
        while (Number.isInteger(Math.sqrt(n)));
        return pick2(opts, 1, [], `\\sqrt{${n}}`, [`\\text{${fill(W.rootWhy, { n })}}`], W.classify);
      }
      if (kind === "recurring") {
        const [a, b] = [r.int(1, 9), r.int(0, 9)];
        const q = r.next() < 0.5 ? `0.\\overline{${a}}` : `0.\\overline{${a}${b}}`;
        return pick2(opts, 0, [{ id: "recurringIrrational", a: pickAt(1), vars: {} }], q, [`\\text{${W.recurringWhy}}`], W.classify);
      }
      if (kind === "pi") {
        const q = r.pick(["\\pi", "2\\pi", "\\pi + 1", "\\tfrac{\\pi}{2}"]);
        return pick2(opts, 1, [{ id: "piIsRational", a: pickAt(0), vars: {} }], q, [`\\text{${W.piWhy}}`], W.classify);
      }
      if (kind === "fraction") {
        const [a, b] = [r.int(1, 12), r.int(2, 13)];
        return pick2(opts, 0, [], `-\\tfrac{${a}}{${b}}`, [`\\text{${W.fractionWhy}}`], W.classify);
      }
      const v = r.int(101, 9999) / 1000;
      return pick2(opts, 0, [], tidy(v), [`${tidy(v)} = \\tfrac{${Math.round(v * 1000)}}{1000}`], W.classify);
    }
    // √n between two whole numbers.
    let n: number;
    do n = r.int(5, 150);
    while (Number.isInteger(Math.sqrt(n)));
    const a = Math.floor(Math.sqrt(n));
    const half = Math.floor(n / 2);
    const traps: Trap[] = half !== a && half !== a + 1 ? [{ id: "rootAsHalf", a: num(half), vars: { n, a, b: a + 1, a2: a * a, b2: (a + 1) ** 2 } }] : [];
    return ask(fill(W.between, { n }), a, traps, [`${a}^2 = ${a * a} < ${n} < ${(a + 1) ** 2} = ${a + 1}^2`, `${a} < \\sqrt{${n}} < ${a + 1}`]);
  }

  if (L === 2) {
    if (r.next() < 0.55) {
      // A recurring decimal as a fraction.
      const t = r.pick(["one", "two", "mixed"] as const);
      const [a, b] = [r.int(1, 9), r.int(0, 9)];
      // The fraction as the subtraction gives it, then in lowest terms if it is not already.
      let top: number, den: number, q: string, cut: number, steps: string[];
      if (t === "one") [top, den, q, cut, steps] = [a, 9, `0.\\overline{${a}}`, a / 10, [`10x - x = ${a}`]];
      else if (t === "two") {
        const ab = 10 * a + b;
        [top, den, q, cut, steps] = [ab, 99, `0.\\overline{${a}${b}}`, ab / 100, [`100x - x = ${ab}`]];
      } else {
        // The repeating digit is not the one before it, nor 0 or 9 (0.3000… and 0.1999… end).
        const bb = r.pick([1, 2, 3, 4, 5, 6, 7, 8].filter((d) => d !== a));
        [top, den, q, cut, steps] = [10 * a + bb - a, 90, `0.${a}\\overline{${bb}}`, (10 * a + bb) / 100, [`100x - 10x = ${10 * a + bb} - ${a} = ${10 * a + bb - a}`]];
      }
      const f = frac(top, den);
      const lowest = fTex(f);
      steps.push(`x = \\tfrac{${top}}{${den}}${f.d !== den ? ` = ${lowest}` : ""}`);
      return {
        prompt: W.recurring, q: `${q} = \\,?`, answer: { ...num(f.n / f.d, 1e-9, { lowest: true }), traps: [{ id: "recurringAsTerminating", a: num(cut), vars: {} }] },
        show: lowest, plain: fPlain(f), format: "fraction", steps,
      };
    }
    // The largest of four reals between a and a + 1.
    for (;;) {
      const a = r.int(2, 6);
      const m = r.int(a * a + 1, (a + 1) ** 2 - 1);
      const items: { tex: string; plain: string; v: number }[] = [{ tex: `\\sqrt{${m}}`, plain: `√${m}`, v: Math.sqrt(m) }];
      const d1 = a + r.int(1, 9) / 10;
      items.push({ tex: tidy(d1), plain: tidy(d1), v: d1 });
      const den = r.pick([3, 6, 7, 9]);
      let top: number;
      do top = a * den + r.int(1, den - 1);
      while (gcd(top, den) !== 1);
      items.push({ tex: `\\tfrac{${top}}{${den}}`, plain: `${top}/${den}`, v: top / den });
      if (a === 3) items.push({ tex: "\\pi", plain: "π", v: Math.PI });
      else {
        const d2 = a + r.int(11, 99) / 100;
        items.push({ tex: tidy(d2), plain: tidy(d2), v: d2 });
      }
      const vs = items.map((x) => x.v).sort((p, q) => p - q);
      if (vs.some((v, i) => i > 0 && v - vs[i - 1] < 0.02)) continue;
      const order = [...items].sort(() => r.next() - 0.5);
      const right = order.indexOf(order.reduce((p, q) => (q.v > p.v ? q : p)));
      const root = order.findIndex((x) => x.plain.startsWith("√"));
      const traps: Trap[] = root !== right ? [{ id: "rootReadAsNumber", a: { k: "pick", options: [], right: root }, vars: { m, a, b: a + 1 } }] : [];
      const opts = order.map((x) => ({ text: x.plain, plain: x.plain, tex: x.tex }));
      return {
        prompt: W.largest, q: "", answer: { k: "pick", options: opts, right, traps: traps.map((t) => ({ ...t, a: { k: "pick", options: opts, right: root } })) },
        show: opts[right].tex, plain: opts[right].plain, format: "pick",
        steps: [order.map((x) => `${x.tex} \\approx ${x.v.toFixed(3)}`).join(",\\ ")],
      };
    }
  }

  const t = r.pick(["divide", "add", "closed"] as const);
  if (t === "closed") {
    const kind = r.pick(["ratIrr", "irrIrr", "ratRat", "irrTimes", "ratTimesIrr"] as const);
    const opts = [W.alwaysRational, W.alwaysIrrational, W.either];
    const right = { ratIrr: 1, irrIrr: 2, ratRat: 0, irrTimes: 2, ratTimesIrr: 1 }[kind];
    const traps: Trap[] = kind === "irrIrr" || kind === "irrTimes" ? [{ id: "irrationalAlwaysClosed", a: pickAt(1), vars: {} }] : [];
    return pick2(opts, right, traps, "", [`\\text{${W.closedWhy[kind]}}`], W.closed[kind]);
  }
  if (t === "divide") {
    for (;;) {
      const B = r.pick([2, 4, 5, 8]);
      const A = r.int(12, 99) / 10;
      if (Math.round(A * 1000) % B !== 0) continue;
      const [m, n] = [r.int(3, 12), r.int(-6, 9)];
      const v = std((A / B) * 10 ** (m - n));
      const wrong = std((A / B) * 10 ** (m + n));
      const traps: Trap[] = wrong.e !== v.e ? [{ id: "powersAdded", a: stdAns(wrong), vars: { m, n } }] : [];
      return {
        prompt: W.stdDivide, q: `\\dfrac{${tidy(A)} \\times 10^{${m}}}{${B} \\times 10^{${n}}}`, answer: { ...stdAns(v), traps },
        show: stdTex(v), plain: `${tidy(v.m)}*10^${v.e}`, format: "standard",
        steps: [`${tidy(A)} \\div ${B} = ${tidy(A / B)}`, `10^{${m}} \\div 10^{${n}} = 10^{${m - n}}`, `${tidy(A / B)} \\times 10^{${m - n}} = ${stdTex(v)}`],
      };
    }
  }
  const [a, b] = [r.int(11, 99) / 10, r.int(11, 99) / 10];
  const gap = r.pick([1, 2]);
  // Powers of 10⁰ are left out: 1.1 × 10⁰ is standard form, but reads oddly.
  let n: number;
  do n = r.int(-4, 8);
  while (n === 0 || n + gap === 0);
  const v = std(a * 10 ** (n + gap) + b * 10 ** n);
  const wrongV = std((a + b) * 10 ** (n + gap));
  return {
    prompt: W.stdAdd, q: `${tidy(a)} \\times 10^{${n + gap}} + ${tidy(b)} \\times 10^{${n}}`,
    answer: { ...stdAns(v), traps: [{ id: "addedMantissas", a: stdAns(wrongV), vars: {} }] },
    show: stdTex(v), plain: `${tidy(v.m)}*10^${v.e}`, format: "standard",
    steps: [`${tidy(b)} \\times 10^{${n}} = ${tidy(b / 10 ** gap)} \\times 10^{${n + gap}}`, `(${tidy(a)} + ${tidy(b / 10 ** gap)}) \\times 10^{${n + gap}} = ${stdTex(v)}`],
  };
};

function ask(prompt: string, v: number, traps: Trap[], steps: string[]): Part {
  return { prompt, q: "", answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps };
}

export default gen;
