// Practice: trigonometric equations (#663). Easy: the larger solution of sin, cos or tan x = an exact value between 0°
// and 360°. Medium: how many solutions when the angle is doubled or tripled, and the inverse functions' values. Hard:
// a quadratic in sin x, a solution in radians, and, in a new setting, when the tide reaches a depth the second time.
// Only one solution, the wrong quarter, a negative angle kept, the period change ignored, an inverse outside its
// range, arccos treated as odd, one factor only and degrees for radians are slips.
import { fill } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { sgn } from "../readFunction";

const VALUES: readonly { fn: "sin" | "cos" | "tan"; text: string; al: number }[] = [
  { fn: "sin", text: "1/2", al: 30 }, { fn: "sin", text: "√3/2", al: 60 }, { fn: "sin", text: "√2/2", al: 45 },
  { fn: "cos", text: "1/2", al: 60 }, { fn: "cos", text: "√2/2", al: 45 }, { fn: "cos", text: "√3/2", al: 30 },
  { fn: "tan", text: "1", al: 45 }, { fn: "tan", text: "√3", al: 60 },
];
/** The two solutions from 0° to 360° of fn x = the value whose first-quarter angle is al, sign s. */
function pair(fn: "sin" | "cos" | "tan", al: number, s: number): [number, number] {
  const n = (x: number) => ((x % 360) + 360) % 360;
  if (fn === "sin") return s > 0 ? [al, 180 - al] : [180 + al, 360 - al];
  if (fn === "cos") return s > 0 ? [al, 360 - al] : [180 - al, 180 + al];
  return [n(s > 0 ? al : 180 - al), n(s > 0 ? 180 + al : 360 - al)];
}

const gen: Gen = (r, L, w) => {
  const W = w.qte;
  const numQ = (prompt: string, v: number, traps: (Trap | false)[], steps: string[], tol?: number): Part => ({
    prompt, q: "", answer: { ...num(v, tol), traps: traps.filter((t): t is Trap => !!t && t.a.k === "num" && Math.abs(t.a.v - v) > 1e-6) }, show: sgn(v), plain: String(v), format: "number", steps,
  });
  const slip = (id: Trap["id"], v: number, vars?: Record<string, string | number>): Trap => ({ id, a: num(v), vars });
  const rule = { sin: W.sinRule, cos: W.cosRule, tan: W.tanRule };

  if (L === 1) {
    const { fn, text, al } = r.pick(VALUES);
    const s = r.pick([1, -1]);
    const [x1, x2] = pair(fn, al, s);
    const v = Math.max(x1, x2);
    const wrong = fn === "sin" ? (s > 0 ? 360 - al : 180 - al) : fn === "cos" ? (s > 0 ? 180 - al : 360 - al) : s > 0 ? 180 - al : 180 + al;
    const eq = `${fn} x = ${s < 0 ? "−" : ""}${text}`;
    return numQ(fill(W.largerQ, { eq }), v, [
      // A calculator's angle: −α for a negative sine or tangent, otherwise the smaller solution.
      s < 0 && fn !== "cos" ? slip("negativeAngleKept", -al, { a: al }) : slip("oneSolutionOnly", Math.min(x1, x2)),
      ![x1, x2].includes(wrong) && slip("wrongQuadrant", wrong, { r: rule[fn] }),
    ], [`\\alpha = ${al}°`, `x = ${x1}°,\\ ${x2}°`]);
  }

  if (L === 2) {
    const t = r.pick(["count", "arcsin", "arccos"] as const);
    if (t === "count") {
      const k = r.pick([2, 3]);
      const { fn, text } = r.pick(VALUES.filter((v) => v.fn !== "tan"));
      return numQ(fill(W.countQ, { eq: `${fn} ${k}x = ${text}` }), 2 * k, [slip("periodChangeIgnored", 2, { k })], [`0° \\le ${k}x < ${360 * k}°`, `2 \\times ${k} = ${2 * k}`]);
    }
    const { text, al } = r.pick(VALUES.filter((v) => v.fn === (t === "arcsin" ? "sin" : "cos")));
    if (t === "arcsin") return numQ(fill(W.inverseQ, { e: `arcsin(−${text})` }), -al, [slip("inverseRangeIgnored", 360 - al, { a: al }), slip("inverseRangeIgnored", 180 + al, { a: al })], [`\\arcsin \\in [-90°, 90°]`, `-${al}°`]);
    return numQ(fill(W.inverseQ, { e: `arccos(−${text})` }), 180 - al, [slip("arccosNegated", -al, { a: al, v: 180 - al })], [`\\arccos \\in [0°, 180°]`, `180° - ${al}° = ${180 - al}°`]);
  }

  const t = r.pick(["quadratic", "radians", "tide"] as const);
  if (t === "quadratic") {
    // 2s² + Bs + C = 0 with roots p and q among ½, −½, 1 and −1, written in sin x, or with cos²x for 1 − sin²x.
    const roots = [[0.5, -1], [-0.5, 1], [0.5, 1], [-0.5, -1], [1, -1]][r.int(0, 4)];
    const [p, q] = roots;
    const [B, C] = [-2 * (p + q), 2 * p * q];
    const count = (v: number) => (Math.abs(v) === 1 ? 1 : 2);
    const viaCos = r.next() < 0.5;
    const term = (c: number, x: string) => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}${x}`);
    const eq = viaCos ? `2cos²x${term(-B, "sin x")} = ${2 + C}`.replace("= -", "= −") : `2sin²x${term(B, "sin x")}${term(C, "")} = 0`;
    return numQ(fill(W.countAllQ, { eq }), count(p) + count(q), [slip("oneFactorOnly", count(p), { p: String(p).replace("-", "−"), q: String(q).replace("-", "−") })],
      [...(viaCos ? [`\\cos^2 x = 1 - \\sin^2 x`] : []), `\\sin x = ${p} \\text{ or } ${q}`, `${count(p)} + ${count(q)} = ${count(p) + count(q)}`]);
  }
  if (t === "radians") {
    const { fn, text, al } = r.pick(VALUES.filter((v) => v.fn !== "tan"));
    const big = Math.max(...pair(fn, al, 1));
    const v = Math.round(((big * Math.PI) / 180) * 100) / 100;
    return numQ(fill(W.radiansQ, { eq: `${fn} x = ${text}` }), v, [slip("degreesForRadians", big, { d: big })], [`x = ${big}°`, `${big} \\times \\frac{\\pi}{180} = ${v}`], 0.005);
  }
  // A new setting: a harbour 5 + 2·sin(30t)° metres deep reaches 6 m at t = 1 and t = 5.
  const [mean, amp] = [r.pick([4, 5, 6]), r.pick([2, 4])];
  return numQ(fill(W.tideQ, { m: mean, a: amp, h: mean + amp / 2 }), 5, [slip("oneSolutionOnly", 1)],
    [`\\sin(30t) = \\frac{1}{2}`, `30t = 30° \\text{ or } 150°`, `t = 1 \\text{ or } 5`]);
};

export default gen;
