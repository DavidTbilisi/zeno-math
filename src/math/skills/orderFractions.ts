// Practice: Fractions in order.
import { fill } from "../chart";
import { bottomsOrder, orderTask, rightOrder } from "../fracOrder";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Four or five fractions, smallest first (src/math/fracOrder.ts); the answer is the list, typed or tapped.
  const t = orderTask(L, r.next);
  const seq = rightOrder(t.items);
  // Unit fractions put in the order of their bottoms (½, ⅓, ⅕ — a bigger bottom taken as bigger).
  const byBottoms = bottomsOrder(t.items);
  const ds = t.items.map((i) => i.d);
  const traps: Trap[] = byBottoms ? [{ id: "biggerBottom", a: { k: "order", items: t.items, seq: byBottoms }, vars: { n: 1, d: Math.max(...ds), e: Math.min(...ds) } }] : [];
  const dec = (v: number) => Number(v.toFixed(3));
  return {
    prompt: fill(w.prompts.orderFractions, { list: t.items.map((i) => i.text).join(", ") }),
    q: t.items.map((i) => i.tex).join(", \\quad "),
    answer: { k: "order", items: t.items, seq, traps },
    show: seq.map((i) => t.items[i].tex).join(" < "),
    plain: seq.map((i) => t.items[i].text).join(", "),
    format: "order",
    solution: { kind: "orderline", spec: { task: t, steps: [seq.map((i) => `${t.items[i].tex} ${Number.isInteger(t.items[i].v * 1000) ? "=" : "\\approx"} ${dec(t.items[i].v)}`).join(", \\quad ")] } },
  };
};

export default gen;
