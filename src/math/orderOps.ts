// Order of operations: an expression of whole numbers worked out the right way, or as a known mistake would. Kept
// apart from the generators so the ideas a question needs can be read off it (src/model/conceptGraph.ts) on the server.

/** How an expression is worked out: the right way, or as a known mistake would. */
export type OrderMode = "right" | "leftToRight" | "mulBeforePow" | "grouped";
export type OrderNode = { v: number } | { op: string; l: OrderNode; r: OrderNode; par: boolean };

const PREC: Record<OrderMode, Record<string, number>> = {
  right: { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 },
  // + − × ÷ all alike, from left to right.
  leftToRight: { "+": 1, "-": 1, "*": 1, "/": 1, "^": 3 },
  // multiplying before the power: 3·2² as (3·2)² (only asked where a × stands in front of a power).
  mulBeforePow: { "+": 1, "-": 1, "*": 3, "/": 2, "^": 2.5 },
  // the right order, but a chain of the same kind grouped from the right (a − b − c as a − (b − c)): see rightAssoc.
  grouped: { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 },
};
/** "a + b * (c - d) ^ 2" with numbers for the letters, as a tree. */
export function orderTree(src: string, mode: OrderMode): OrderNode {
  const toks = src.match(/\d+|[-+*/^()]/g) ?? [];
  let i = 0;
  const prec = PREC[mode];
  const rightAssoc = (op: string) => op === "^" || mode === "grouped";
  const atom = (): OrderNode => {
    const t = toks[i++];
    if (t !== "(") return { v: Number(t) };
    const inner = expr(0);
    i++;
    return "op" in inner ? { ...inner, par: true } : inner;
  };
  const expr = (min: number): OrderNode => {
    let lhs = atom();
    for (;;) {
      const op = toks[i];
      if (op === undefined || op === ")" || prec[op] < min) return lhs;
      i++;
      lhs = { op, l: lhs, r: expr(rightAssoc(op) ? prec[op] : prec[op] + 1), par: false };
    }
  };
  return expr(0);
}
export const orderApply = (a: number, op: string, b: number) => (op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : op === "/" ? a / b : a ** b);
export const orderValue = (n: OrderNode): number => ("v" in n ? n.v : orderApply(orderValue(n.l), n.op, orderValue(n.r)));
