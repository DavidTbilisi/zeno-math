// Practice: Order of operations.
import { orderApply, type OrderNode, orderTree, orderValue } from "../orderOps";
import { num } from "../practiceKit";
import type { Gen, Level, Trap } from "../practiceTypes";

/** One operation done, the leftmost of those that can be: the next line of working. */
function orderStep(n: OrderNode): OrderNode {
  if ("v" in n) return n;
  if ("op" in n.l) return { ...n, l: orderStep(n.l) };
  if ("op" in n.r) return { ...n, r: orderStep(n.r) };
  return { v: orderApply(n.l.v, n.op, n.r.v) };
}

/** In LaTeX; a negative number inside the working keeps brackets, so 4 × (−3)² isn't read as 4 × −3². */
function orderTex(n: OrderNode, whole = true): string {
  if ("v" in n) return n.v < 0 && !whole ? `(${n.v})` : String(n.v);
  const sym: Record<string, string> = { "+": "+", "-": "-", "*": "\\times", "/": "\\div" };
  const inner = n.op === "^" ? `${orderTex(n.l, false)}^{${orderTex(n.r, false)}}` : `${orderTex(n.l, false)} ${sym[n.op]} ${orderTex(n.r, false)}`;
  return n.par ? `(${inner})` : inner;
}

/** The shapes of question at each level: never a ÷ b(c + d), whose meaning people disagree on. */
const ORDER_FORMS: Record<Level, string[]> = {
  1: ["a + b * c", "a - b * c", "a * b - c", "a + b / c", "a - b - c", "a * b + c * d", "a / b * c", "a - b + c"],
  2: ["(a + b) * c", "a * (b - c)", "a + b ^ 2", "c * a ^ 2", "a - (b - c)", "a ^ 2 - b * c", "(a + b) ^ 2 / c"],
  3: ["a * (b + c * d)", "(a + b) ^ 2 - c * d", "a - 2 * (b - c) ^ 2", "(a - (b + c)) * d", "a + b * (c - d) ^ 2", "(a * b - c) / d"],
};

const gen: Gen = (r, L, w) => {
  const form = r.pick(ORDER_FORMS[L]);
  let src = "";
  let tree: OrderNode = { v: 0 };
  let lines: OrderNode[] = [];
  for (let tries = 0; ; tries++) {
    src = form.replace(/[a-d]/g, () => String(r.int(2, L === 1 ? 12 : 9)));
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
