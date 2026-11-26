// Practice: accumulation and the fundamental theorem (#668). Easy: a left or right sum from a table of rates, whether
// a sum is too much or too little, a midpoint sum. Medium: g′ for g(x) = ∫ f, also with x² as the upper limit, and a
// tank's water from its rate of flow. Hard: an average value, distance against displacement, and, in a new setting,
// where a braking cyclist stops. The other end's sum, the width forgotten, too much and too little swapped, the left
// ends for the middles, g for g′, the chain rule forgotten, the start forgotten, the end rate times the time, the
// integral for the average, net for total and total for net, and a rectangle for a triangle are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";
import { pickPart } from "../tTails";

const r4 = (v: number) => Math.round(v * 10000) / 10000;
const plus = (c: number, v = "") => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}${v}`);

const gen: Gen = (r, L, w) => {
  const W = w.qac;
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[]): Part => ({
    prompt, q: "", answer: { ...num(v), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > 1e-6) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });

  if (L === 1) {
    const t = r.pick(["table", "over", "mid"] as const);
    if (t === "table") {
      const rs = [r.int(1, 6)];
      for (let i = 0; i < 3; i++) rs.push(rs[i] + r.int(1, 5));
      const [left, right] = [2 * (rs[0] + rs[1] + rs[2]), 2 * (rs[1] + rs[2] + rs[3])];
      const isLeft = r.next() < 0.5;
      const vars = { r0: rs[0], r1: rs[1], r2: rs[2], r3: rs[3] };
      return numQ(fill(isLeft ? W.tableLeftQ : W.tableRightQ, vars), isLeft ? left : right,
        [slip("leftForRight", isLeft ? right : left), slip("widthForgotten", (isLeft ? left : right) / 2)],
        [isLeft ? `2(${rs[0]} + ${rs[1]} + ${rs[2]}) = ${left}` : `2(${rs[1]} + ${rs[2]} + ${rs[3]}) = ${right}`]);
    }
    if (t === "over") {
      const [rising, isLeft] = [r.next() < 0.5, r.next() < 0.5];
      const a = r.int(-3, 3);
      const much = rising !== isLeft;
      return pickPart(r, [W.tooMuch, W.tooLittle], much ? 0 : 1, [{ id: "overUnderSwapped", at: much ? 1 : 0 }],
        fill(W.overQ, { mono: rising ? W.increasing : W.decreasing, kind: isLeft ? W.leftKind : W.rightKind, a: String(a).replace("-", "−"), b: a + r.int(2, 6) }),
        [much ? "\\text{each height is the highest in its strip}" : "\\text{each height is the lowest in its strip}"]);
    }
    const [n, c] = [r.int(2, 3), r.int(0, 5)];
    let [mid, left] = [0, 0];
    for (let i = 0; i < n; i++) {
      mid += 2 * ((2 * i + 1) ** 2 + c);
      left += 2 * ((2 * i) ** 2 + c);
    }
    return numQ(fill(W.midQ, { f: `x²${plus(c)}`, b: 2 * n, n }), mid, [slip("midpointMissed", left)], [`x = ${Array.from({ length: n }, (_, i) => 2 * i + 1).join(", ")}`, `2 \\times (${Array.from({ length: n }, (_, i) => (2 * i + 1) ** 2 + c).join(" + ")}) = ${mid}`]);
  }

  if (L === 2) {
    const t = r.pick(["ftc", "chain", "net"] as const);
    if (t === "ftc") {
      const [c, k] = [r.int(1, 6), r.int(1, 5)];
      const g = r4(k ** 3 / 3 - (c * k * k) / 2);
      return numQ(fill(W.ftcQ, { f: `t² − ${c}t`, k }), k * k - c * k, [slip("gForGPrime", g, { k })], [`g'(x) = x^2 - ${c}x`, `g'(${k}) = ${k * k - c * k}`]);
    }
    if (t === "chain") {
      const [c, k] = [r.int(1, 5), r.int(1, 3)];
      return numQ(fill(W.chainQ, { c, k }), 2 * k * (k * k + c), [slip("ftcChainForgotten", k * k + c)], [`g'(x) = (x^2 + ${c}) \\cdot 2x`, `g'(${k}) = ${k * k + c} \\times ${2 * k} = ${2 * k * (k * k + c)}`]);
    }
    const [p, q, k, v] = [r.int(1, 4), r.int(1, 8), 2 * r.int(1, 5), 10 * r.int(1, 9)];
    const change = (p * k * k) / 2 + q * k;
    return numQ(fill(W.netQ, { p, q, v, k }), v + change, [slip("startForgotten", change, { v }), slip("rateTimesTime", v + (p * k + q) * k)],
      [`\\int_0^{${k}} (${p}t + ${q})\\,dt = ${change}`, `${v} + ${change} = ${v + change}`]);
  }

  const t = r.pick(["average", "distance", "brake"] as const);
  if (t === "average") {
    const [b, c] = [r.int(1, 5), r.int(0, 6)];
    return numQ(fill(W.averageQ, { c: plus(c), b }), b * b + c, [slip("averageNotDivided", b ** 3 + c * b, { b })], [`\\int_0^{${b}} (3x^2 ${c ? `+ ${c}` : ""})\\,dx = ${b ** 3 + c * b}`, `${b ** 3 + c * b} \\div ${b} = ${b * b + c}`]);
  }
  if (t === "distance") {
    // v = t − c is negative until t = c: back c²/2, then forward d²/2.
    const [c, d] = [r.int(1, 4), r.int(1, 5)];
    const [net, total] = [(d * d - c * c) / 2, (c * c + d * d) / 2];
    const asked = r.next() < 0.5;
    return asked
      ? numQ(fill(W.distanceQ, { c, b: c + d }), total, [slip("netAsTotal", net, { c, d })], [`\\frac{${c}^2}{2} + \\frac{${d}^2}{2} = ${total}`])
      : numQ(fill(W.displacementQ, { c, b: c + d }), net, [slip("totalAsNet", total)], [`-\\frac{${c}^2}{2} + \\frac{${d}^2}{2} = ${net}`]);
  }
  // A new setting: the speed falls in a straight line to 0, so the distance is a triangle's area.
  const [a, b, f] = [2 * r.int(2, 6), r.int(2, 6), 10 * r.int(1, 9)];
  return numQ(fill(W.brakeQ, { a, b, f }), f + (a * b) / 2, [slip("startForgotten", (a * b) / 2, { v: f }), slip("rectangleForTriangle", f + a * b, { a, b })],
    [`\\tfrac{1}{2} \\times ${b} \\times ${a} = ${(a * b) / 2}`, `${f} + ${(a * b) / 2} = ${f + (a * b) / 2}`]);
};

export default gen;
