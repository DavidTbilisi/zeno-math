// Practice: Backpropagation.
import { fill } from "../chart";
import { num, numPart, par } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const d = (top: string, by: string) => `\\frac{\\partial ${top}}{\\partial ${by}}`;
  const given = (vs: [string, number][]) => vs.map(([k, v]) => `${k} = ${v}`).join(", \\ ");
  // The values on the way back, each a step of its own; the gradient asked for is the question.
  const out = (prompt: string, q: string, v: number, steps: string[], traps: Trap[] = [], worked: [string, number][] = []) => ({
    prompt, q, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number" as const, steps,
    worked: worked.map(([tq, tv]) => numPart(w.prompts.stepWork, tq, tv)),
  });
  if (L === 1) {
    // One node in the middle: f = (x ± y)z goes back through q = x ± y, f = xy + z through p = xy.
    const [x, y, z] = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5)];
    const form = r.int(0, 2);
    if (form < 2) {
      const s = form === 0 ? 1 : -1;
      const qv = x + s * y;
      const by = r.pick(qv === 0 ? (["x", "y"] as const) : (["x", "y", "z"] as const));
      const v = by === "z" ? qv : by === "x" ? z : s * z;
      const head = [`q = x ${s > 0 ? "+" : "-"} y = ${qv}`, `f = q z`];
      const last = by === "z" ? `${d("f", "z")} = q = ${qv}` : `${d("f", by)} = ${d("f", "q")} \\cdot ${d("q", by)} = z \\cdot ${par(by === "x" ? 1 : s)} = ${v}`;
      return out(fill(w.prompts.bpNode, { v: by }), `f = (x ${s > 0 ? "+" : "-"} y)\\, z, \\quad ${given([["x", x], ["y", y], ["z", z]])}`, v, [...head, last], [],
        [[`q = x ${s > 0 ? "+" : "-"} y`, qv]]);
    }
    const by = r.pick(["x", "y", "z"] as const);
    const v = by === "x" ? y : by === "y" ? x : 2 * z;
    const last = by === "z" ? `${d("f", "z")} = 2z = ${v}` : `${d("f", by)} = ${d("f", "p")} \\cdot ${d("p", by)} = 1 \\cdot ${by === "x" ? "y" : "x"} = ${v}`;
    return out(fill(w.prompts.bpNode, { v: by }), `f = x y + z^2, \\quad ${given([["x", x], ["y", y], ["z", z]])}`, v, [`p = x y = ${x * y}`, `f = p + z^2`, last], [],
      [["p = x y", x * y]]);
  }
  if (L === 2) {
    // A squared error L = (wx + b − y)²: ∂L/∂w = 2e·x, ∂L/∂b = 2e for the error e.
    let w0: number, x: number, b: number, y: number, e: number;
    do (w0 = r.nz(-4, 4)), (x = r.nz(-4, 4)), (b = r.int(-4, 4)), (y = r.int(-6, 6)), (e = w0 * x + b - y);
    while (e === 0);
    const by = r.pick(["w", "b"] as const);
    const v = by === "w" ? 2 * e * x : 2 * e;
    const steps = [`\\hat y = w x + b = ${w0 * x + b}`, `e = \\hat y - y = ${e}`, `${d("L", "e")} = 2e = ${2 * e}`, by === "w" ? `${d("L", "w")} = 2e \\cdot x = ${2 * e} \\cdot ${par(x)} = ${v}` : `${d("L", "b")} = 2e \\cdot 1 = ${v}`];
    return out(fill(w.prompts.bpLoss, { v: by }), `L = (w x + b - y)^2, \\quad ${given([["w", w0], ["x", x], ["b", b], ["y", y]])}`, v, steps, [{ id: "noTwo", a: num(v / 2) }],
      [["\\hat y = w x + b", w0 * x + b], ["e = \\hat y - y", e], [`${d("L", "e")} = 2e`, 2 * e]]);
  }
  // h = ReLU(w₁x), ŷ = w₂h: the gradient reaches w₁ only when the ReLU is on (mostly it is).
  let w1: number, x: number, w2: number, y: number, e: number;
  do {
    (w1 = r.nz(-3, 3)), (x = r.nz(-3, 3)), (w2 = r.nz(-3, 3)), (y = r.int(-6, 6));
    if (w1 * x < 0 && r.next() < 0.5) w1 = -w1;
    e = w2 * Math.max(0, w1 * x) - y;
  } while (e === 0);
  const on = w1 * x > 0;
  const v = on ? 2 * e * w2 * x : 0;
  const steps = [
    `w_1 x = ${w1 * x}, \\quad h = \\operatorname{ReLU}(${w1 * x}) = ${Math.max(0, w1 * x)}`,
    `\\hat y = w_2 h = ${w2 * Math.max(0, w1 * x)}, \\quad ${d("L", "\\hat y")} = 2(\\hat y - y) = ${2 * e}`,
    `${d("L", "h")} = ${2 * e} \\cdot w_2 = ${2 * e * w2}`,
    on ? `${d("L", "w_1")} = ${d("L", "h")} \\cdot 1 \\cdot x = ${2 * e * w2} \\cdot ${par(x)} = ${v}` : `w_1 x < 0: \\ ${d("L", "w_1")} = ${d("L", "h")} \\cdot 0 \\cdot x = 0`,
  ];
  const traps: Trap[] = on ? [{ id: "noTwo", a: num(v / 2) }] : [{ id: "reluOff", a: num(2 * e * w2 * x) }];
  return out(w.prompts.bpRelu, given([["w_1", w1], ["x", x], ["w_2", w2], ["y", y]]), v, steps, traps, [
    ["h = \\operatorname{ReLU}(w_1 x)", Math.max(0, w1 * x)],
    [`${d("L", "\\hat y")} = 2(\\hat y - y)`, 2 * e],
    [`${d("L", "h")} = ${d("L", "\\hat y")} \\cdot w_2`, 2 * e * w2],
  ]);
};

export default gen;
