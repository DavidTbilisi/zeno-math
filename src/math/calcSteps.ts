// How a calculus question comes apart into steps a student can answer one at a time (issue #266, faded worked
// examples). Differentiating: a sum term by term, a product or quotient by its two factors u and v, a function of a
// function by its inside; integrating: a sum term by term, a function of a linear inside by that inside. Anything else
// (a single power of x, √x) has no parts worth a step of its own, and is asked whole.
import { has, isN, mul, pdeg, toPoly, type E } from "./expr";

export type DiffParts = { kind: "sum"; terms: E[] } | { kind: "product" | "quotient"; u: E; v: E } | { kind: "chain"; inner: E };
export type IntParts = { kind: "sum"; terms: E[] } | { kind: "linear"; inner: E };

/** x itself or a power of it: no inside to speak of. */
const isXPower = (e: E) => e.k === "var" || (e.k === "pow" && e.b.k === "var" && e.e.k === "num");

/**
 * The inside of a function of a function (sin of it, e to it, it to a power), when it is more than x: e^(x²) has x²
 * inside, but 1/x² is a power of x, with nothing inside to speak of.
 */
function insideOf(g: E): E | null {
  if (g.k === "pow" && g.b.k !== "e") return g.e.k === "num" && has(g.b) && !isXPower(g.b) ? g.b : null;
  const inner = g.k === "fn" ? g.a : g.k === "pow" ? g.e : null;
  return inner && has(inner) && inner.k !== "var" ? inner : null;
}

/** A term's factors: the numbers in front, and the ones with x in them. */
function factors(f: E) {
  const fs = f.k === "mul" ? f.fs : [f];
  return { consts: fs.filter((x) => !has(x)), xs: fs.filter((x) => has(x)) };
}

/** How the derivative of f splits, or null when it doesn't. */
export function diffParts(f: E): DiffParts | null {
  if (f.k === "add") {
    // A constant term has nothing to differentiate.
    const terms = f.ts.filter((t) => has(t));
    return terms.length >= 2 ? { kind: "sum", terms } : terms.length === 1 ? diffParts(terms[0]) : null;
  }
  const { consts, xs } = factors(f);
  const times = (es: E[]) => {
    const all = [...consts, ...es];
    return all.length === 1 ? all[0] : mul(...all);
  };
  // Over something more than a power of x: a quotient, when there is anything with x on top.
  const below = xs.filter((x) => x.k === "pow" && isN(x.e, -1) && !isXPower(x.b));
  const above = xs.filter((x) => !below.includes(x));
  if (below.length === 1 && above.length) return { kind: "quotient", u: times(above), v: (below[0] as Extract<E, { k: "pow" }>).b };
  if (xs.length >= 2 && !below.length) return { kind: "product", u: times([xs[0]]), v: xs.length === 2 ? xs[1] : mul(...xs.slice(1)) };
  const inner = xs.length === 1 ? insideOf(xs[0]) : null;
  return inner ? { kind: "chain", inner } : null;
}

/** How the integral of f splits, or null when it doesn't. */
export function intParts(f: E): IntParts | null {
  if (f.k === "add") return f.ts.length >= 2 ? { kind: "sum", terms: f.ts } : null;
  const { xs } = factors(f);
  const inner = xs.length === 1 ? insideOf(xs[0]) : null;
  const p = inner && toPoly(inner);
  return inner && p && pdeg(p) === 1 ? { kind: "linear", inner } : null;
}
