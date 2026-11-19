// Practice: Sequences.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const sol = (topic: string, src: string) => ({ kind: "sequences" as const, spec: { topic, src } });
  const list = (vs: number[]) => `${vs.join(", ")}, …`.replace(/-/g, "−");
  const listSrc = (vs: number[]) => `${vs.join(", ")}, …`;
  const done = (prompt: string, v: number, spec: { kind: "sequences"; spec: { topic: string; src: string } }) => ({
    prompt, q: "", answer: num(v), show: String(v), plain: String(v), format: "number" as const, solution: spec,
  });
  const sub = (n: number) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
  if (L === 1 || (L === 2 && r.next() < 0.5)) {
    const [a, d] = [r.int(-10, 20), r.nz(-6, 9)];
    const terms = [0, 1, 2, 3].map((i) => a + i * d);
    const n = r.int(10, 40);
    if (L === 1) return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), a + (n - 1) * d, sol("arith", `${listSrc(terms)}; u${n}`));
    let p = r.int(2, 8);
    let q = r.int(p + 2, 15);
    if (r.next() < 0.5) [p, q] = [q, p];
    const [x, y] = [a + (p - 1) * d, a + (q - 1) * d];
    const n2 = r.int(16, 30);
    return done(fill(w.prompts.seqTwo, { a: `u${sub(p)} = ${x}`.replace(/-/g, "−"), b: `u${sub(q)} = ${y}`.replace(/-/g, "−"), c: `u${sub(n2)}` }), a + (n2 - 1) * d, sol("arith", `u${p} = ${x}, u${q} = ${y}; u${n2}`));
  }
  if (L === 2) {
    const [a, ratio] = [r.nz(-4, 5), r.pick([2, 3, -2, -3] as const)];
    const terms = [0, 1, 2, 3].map((i) => a * ratio ** i);
    const n = r.int(6, 9);
    return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), a * ratio ** (n - 1), sol("geom", `${listSrc(terms)}; u${n}`));
  }
  // A quadratic rule an² + bn + c.
  const [a, b, c] = [r.int(1, 3), r.int(-5, 5), r.int(-5, 6)];
  const u = (n: number) => a * n * n + b * n + c;
  const terms = [1, 2, 3, 4, 5].map(u);
  const n = r.int(10, 25);
  return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), u(n), sol("pattern", `${terms.join(", ")}; u${n}`));
};

export default gen;
