// Practice: Order of operations. The hard level also has (#706) negative numbers put in for the letters, and fractions
// with powers, a fraction bar holding its two numbers together.
import { orderApply, type OrderNode, orderTree, orderValue } from "../orderOps";
import { num } from "../practiceKit";
import type { Gen, Level, Part, Rng, Trap } from "../practiceTypes";
import { q, qPlain, qTex, type Q } from "../signedKit";

/** One operation done, the leftmost of those that can be: the next line of working. */
export function orderStep(n: OrderNode): OrderNode {
  if ("v" in n) return n;
  if ("op" in n.l) return { ...n, l: orderStep(n.l) };
  if ("op" in n.r) return { ...n, r: orderStep(n.r) };
  return { v: orderApply(n.l.v, n.op, n.r.v) };
}

/**
 * In LaTeX; a negative number inside the working keeps brackets, so 4 × (−3)² isn't read as 4 × −3². A number is
 * written by `leaf` (a fraction as a fraction, #706), in brackets when it is negative or a fraction under a power.
 */
export function orderTex(n: OrderNode, whole = true, leaf?: (v: number) => string, base = false): string {
  if ("v" in n) {
    if (!leaf) return n.v < 0 && !whole ? `(${n.v})` : String(n.v);
    const t = leaf(n.v);
    return (n.v < 0 && !whole) || (base && !Number.isInteger(n.v)) ? `\\left(${t}\\right)` : t;
  }
  const sym: Record<string, string> = { "+": "+", "-": "-", "*": "\\times", "/": "\\div" };
  const inner = n.op === "^" ? `${orderTex(n.l, false, leaf, true)}^{${orderTex(n.r, false, leaf)}}` : `${orderTex(n.l, false, leaf)} ${sym[n.op]} ${orderTex(n.r, false, leaf)}`;
  return n.par ? `(${inner})` : inner;
}

/** The shapes of question at each level: never a ÷ b(c + d), whose meaning people disagree on. */
const ORDER_FORMS: Record<Level, string[]> = {
  1: ["a + b * c", "a - b * c", "a * b - c", "a + b / c", "a - b - c", "a * b + c * d", "a / b * c", "a - b + c"],
  2: ["(a + b) * c", "a * (b - c)", "a + b ^ 2", "c * a ^ 2", "a - (b - c)", "a ^ 2 - b * c", "(a + b) ^ 2 / c"],
  3: ["a * (b + c * d)", "(a + b) ^ 2 - c * d", "a - 2 * (b - c) ^ 2", "(a - (b + c)) * d", "a + b * (c - d) ^ 2", "(a * b - c) / d"],
};

/** The hard level's forms with negative numbers put in for the letters (#706). */
const NEG_FORMS = ["a * (b - c)", "a - b * c", "(a + b) * c", "a ^ 2 - b * c", "a * b - c ^ 2", "(a - b) / c", "a + b * c ^ 2"];
/** The forms with fractions for the letters and whole numbers as written (#706). */
const FRAC_FORMS = ["a ^ 2 + b * 2", "a - b ^ 2 * 4", "(a - b) ^ 2 * 3", "2 * a ^ 2 - b", "a + b / 2", "(a + b) / 2 ^ 2"];

/** The tree with each fraction in brackets, (1 / 2), taken as one number: a fraction bar holds its numbers together. */
function fractionsAsNumbers(n: OrderNode): OrderNode {
  if ("v" in n) return n;
  if (n.op === "/" && n.par && "v" in n.l && "v" in n.r) return { v: n.l.v / n.r.v };
  return { ...n, l: fractionsAsNumbers(n.l), r: fractionsAsNumbers(n.r) };
}
/** A number as the rational it is: a fraction with a bottom up to 2000. */
function asQ(v: number): Q {
  for (let d = 1; d <= 2000; d++) if (Math.abs(v * d - Math.round(v * d)) < 1e-7) return q(Math.round(v * d), d);
  return q(Math.round(v * 1000), 1000);
}
const fracLeaf = (v: number) => qTex(asQ(v));

/** Signed fractions with powers, worked one step at a time, the slips of order those of the whole numbers. */
function fractionPart(r: Rng, w: Parameters<Gen>[2]): Part {
  const FR: Q[] = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5), q(3, 5), q(3, 2), q(5, 4)];
  for (let tries = 0; ; tries++) {
    const form = r.pick(FRAC_FORMS);
    const src = form.replace(/[ab]/g, () => {
      const x = r.pick(FR);
      return `(${r.next() < 0.3 ? "-" : ""}${x.n} / ${x.d})`;
    });
    const tree = fractionsAsNumbers(orderTree(src, "right"));
    const v = orderValue(tree);
    const vq = asQ(v);
    if ((vq.d > 36 || Math.abs(v) > 12 || vq.d === 1) && tries < 400) continue;
    const lines = [tree];
    while ("op" in lines.at(-1)!) lines.push(orderStep(lines.at(-1)!));
    const traps: Trap[] = [];
    for (const mode of ["leftToRight", "mulBeforePow", "grouped"] as const) {
      if (mode === "mulBeforePow" && !/\* (\w|\([^()]*\)) \^/.test(form)) continue;
      const t = orderValue(fractionsAsNumbers(orderTree(src, mode)));
      if (Number.isFinite(t) && Math.abs(t - v) > 1e-9 && !traps.some((x) => x.a.k === "num" && Math.abs(x.a.v - t) < 1e-9)) traps.push({ id: mode, a: num(t) });
    }
    return {
      prompt: w.prompts.times, q: orderTex(tree, true, fracLeaf), answer: { ...num(v), traps }, show: qTex(vq), plain: qPlain(vq), format: "number",
      steps: lines.map((n, i) => (i === 0 ? orderTex(n, true, fracLeaf) : `= ${orderTex(n, true, fracLeaf)}`)), src,
    };
  }
}

const gen: Gen = (r, L, w) => {
  const kind = L === 3 ? r.int(0, 3) : 0;
  if (kind === 3) return fractionPart(r, w);
  const negative = kind === 2;
  const form = r.pick(negative ? NEG_FORMS : ORDER_FORMS[L]);
  let src = "";
  let tree: OrderNode = { v: 0 };
  let lines: OrderNode[] = [];
  for (let tries = 0; ; tries++) {
    src = form.replace(/[a-d]/g, () => String(r.int(2, L === 1 ? 12 : 9) * (negative && r.next() < 0.5 ? -1 : 1)));
    // At least one number below zero: written -3, where taking away is written - with a space.
    if (negative && !/-\d/.test(src) && tries < 400) continue;
    tree = orderTree(src, "right");
    lines = [tree];
    while ("op" in lines.at(-1)!) lines.push(orderStep(lines.at(-1)!));
    // Every number in every line whole (so every ÷ comes out exact) and a modest answer.
    const leaves = (n: OrderNode): number[] => ("v" in n ? [n.v] : [...leaves(n.l), ...leaves(n.r)]);
    const whole = lines.every((n) => leaves(n).every(Number.isInteger));
    if ((whole && Math.abs(orderValue(tree)) <= 999) || tries > 400) break;
  }
  const v = orderValue(tree);
  const traps: Trap[] = [];
  for (const mode of ["leftToRight", "mulBeforePow", "grouped"] as const) {
    if (mode === "mulBeforePow" && !/\* (\w|\([^()]*\)) \^/.test(form)) continue;
    const t = orderValue(orderTree(src, mode));
    if (Number.isFinite(t) && Math.abs(t - v) > 1e-9 && !traps.some((x) => x.a.k === "num" && Math.abs(x.a.v - t) < 1e-9)) traps.push({ id: mode, a: num(t) });
  }
  return {
    prompt: w.prompts.times,
    q: orderTex(tree),
    answer: { ...num(v), traps },
    show: String(v),
    plain: String(v),
    format: "number",
    steps: lines.map((n, i) => (i === 0 ? orderTex(n) : `= ${orderTex(n)}`)),
    src,
  };
};

export default gen;
