// Practice: Inequalities.
import { REL_TEX } from "../algebra";
import { fill } from "../chart";
import { FLIP, ineqPlain, ineqTex, num, polyStr, T } from "../practiceKit";
import type { Bound, Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const RELS = ["<", "<=", ">", ">="] as const;
  /** x rel v as ends of the set. */
  const ends = (rel: string, v: number): [Bound | null, Bound | null] => (rel[0] === ">" ? [{ v, closed: rel === ">=" }, null] : [null, { v, closed: rel === "<=" }]);
  const result = (eq: string, q: string, lo: Bound | null, hi: Bound | null, flipped: boolean) => {
    const toggle = (b: Bound | null) => b && { ...b, closed: !b.closed };
    const traps: Trap[] = [{ id: "boundary", a: { k: "ineq", lo: toggle(lo), hi: toggle(hi) } }];
    // Not flipped: the ends swap sides (x > 4 for x < 4), each keeping its own sign.
    if (flipped) traps.unshift({ id: "noFlip", a: { k: "ineq", lo: hi, hi: lo } });
    return { prompt: w.prompts.ineqSolve, q, answer: { k: "ineq" as const, lo, hi, traps }, show: ineqTex(lo, hi), plain: ineqPlain(lo, hi), format: "inequality" as const, solution: { kind: "algebra" as const, spec: { topic: "inequality", eq, method: "factor" } } };
  };
  const side = (s: string) => T(s);
  if (L < 3) {
    const rel = r.pick(RELS);
    const x0 = r.nz(-9, 9);
    let left: string;
    let right: string;
    let coef: number;
    if (L === 1) {
      const a = r.int(2, 9);
      const b = r.nz(-15, 15);
      if (r.next() < 0.5) {
        [left, right, coef] = [polyStr([b, a]), String(a * x0 + b), a];
      } else {
        // ax + b rel cx + d, with c < a: no flip.
        const c = r.int(1, a - 1);
        [left, right, coef] = [polyStr([b, a]), polyStr([(a - c) * x0 + b, c]), a - c];
      }
    } else {
      const a = r.int(2, 9);
      const b = r.int(-12, 15);
      if (r.next() < 0.5) {
        // b − ax rel c
        [left, right, coef] = [polyStr([b, -a]), String(b - a * x0), -a];
      } else {
        const c = a + r.int(1, 5);
        [left, right, coef] = [polyStr([b, a]), polyStr([b + (a - c) * x0, c]), a - c];
      }
    }
    const final = coef < 0 ? FLIP[rel] : rel;
    const [lo, hi] = ends(final, x0);
    return result(`${left} ${rel} ${right}`, `${side(left)} ${REL_TEX[rel]} ${side(right)}`, lo, hi, coef < 0);
  }
  if (r.next() < 0.6) {
    const x1 = r.int(-8, 4);
    const x2 = x1 + r.int(2, 8);
    const a = r.int(2, 5) * (r.next() < 0.35 ? -1 : 1);
    const b = r.int(-9, 9);
    const [r1, r2] = [r.pick(["<", "<="] as const), r.pick(["<", "<="] as const)];
    const [L1, L2] = a > 0 ? [a * x1 + b, a * x2 + b] : [a * x2 + b, a * x1 + b];
    const lo = a > 0 ? { v: x1, closed: r1 === "<=" } : { v: x1, closed: r2 === "<=" };
    const hi = a > 0 ? { v: x2, closed: r2 === "<=" } : { v: x2, closed: r1 === "<=" };
    const mid = polyStr([b, a]);
    return result(`${L1} ${r1} ${mid} ${r2} ${L2}`, `${L1} ${REL_TEX[r1]} ${side(mid)} ${REL_TEX[r2]} ${L2}`, lo, hi, a < 0);
  }
  const [m, p, b] = [50 * r.int(4, 20), r.int(60, 95), r.int(15, 45)];
  const v = Math.floor((m - p) / b);
  return {
    prompt: fill(w.prompts.ineqWord, { m, p, b }),
    q: "",
    answer: num(v),
    show: String(v),
    plain: String(v),
    format: "number",
    solution: { kind: "algebra", spec: { topic: "inequality", eq: `${b}n + ${p} <= ${m}`, method: "factor" } },
  };
};

export default gen;
