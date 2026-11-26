// Practice: Missing angles. #710 added, at the hard level, angles written in x: the equation that finds x picked, x
// found on a straight line, in a right angle or from the whole angle, and two lines crossing with their opposite angles
// in x. The angle given for x, x given for the angle, the wrong total and opposite angles taken to add up to 180° are
// the slips.
import { armsPic } from "../anglePics";
import { fill, r2 } from "../chart";
import { huntSteps, huntSvg, huntTask, huntTraps } from "../missingAngle";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { opt, pickOf } from "../signedKit";

/** ax + b, as text (with a real minus) and as TeX. */
const ex = (a: number, b: number) => {
  const t = `${a === 1 ? "" : a}x${b > 0 ? ` + ${b}` : b < 0 ? ` - ${-b}` : ""}`;
  return { tex: t, text: t.replace("-", "−") };
};

function more(r: Rng, kind: number, w: PracticeWords): Part {
  const A = w.angP;
  const number = (prompt: string, p: Part["pic"], v: number, traps: Trap[], steps: string[]): Part => ({ prompt, q: "", pic: p, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps });
  if (kind === 4) {
    // Two lines cross: the opposite angles are equal.
    for (;;) {
      const x = r.int(5, 40);
      const [a1, a2] = [r.int(2, 6), r.int(1, 6)];
      const ang = r.int(30, 150);
      const [b1, b2] = [ang - a1 * x, ang - a2 * x];
      if (a1 === a2 || Math.abs(ang - 90) < 8 || Math.abs(b1) > 80 || Math.abs(b2) > 80) continue;
      const [e1, e2] = [ex(a1, b1), ex(a2, b2)];
      const xs = (180 - b1 - b2) / (a1 + a2);
      const big = a1 > a2;
      const steps = [`${e1.tex} = ${e2.tex}`, `${big ? a1 - a2 : a2 - a1}x = ${big ? b2 - b1 : b1 - b2}`, `x = ${x}`];
      const p = armsPic(r.int(0, 30), [ang, 180 - ang, ang, 180 - ang], [`(${e1.text})°`, null, `(${e2.text})°`, null], { kind: "cross" });
      if (r.next() < 0.6) {
        const traps: Trap[] = [{ id: "angleForX", a: num(ang), vars: { a: ang, v: x } }];
        if (Number.isInteger(xs) && xs > 0 && xs !== x) traps.push({ id: "verticalAsSupplementary", a: num(xs), vars: { e1: e1.text, e2: e2.text, v: x } });
        return number(A.crossX, p, x, traps, steps);
      }
      return number(fill(A.crossAngle, { e: e1.text }), p, ang, [{ id: "xForAngle", a: num(x), vars: { x, e: e1.text, v: ang } }], [...steps, `${a1} \\times ${x}${b1 >= 0 ? " + " + b1 : " - " + -b1} = ${ang}^\\circ`]);
    }
  }
  // An angle ax + b beside angles given: on a straight line, in a right angle, around a point, or the whole angle given.
  const form = kind === 2 ? r.pick(["line", "right", "point"] as const) : r.pick(["line", "right", "whole"] as const);
  for (;;) {
    const T = form === "line" ? 180 : form === "right" ? 90 : form === "point" ? 360 : 5 * r.int(20, 34);
    const x = r.int(5, 40);
    const a = r.int(2, 5);
    const b = r.pick([0, r.int(-15, 30)]);
    const ang = a * x + b;
    const known = form === "point" ? [r.int(40, 150), 0] : [T - ang];
    if (form === "point") known[1] = T - ang - known[0];
    if (ang < 15 || known.some((k) => k < (form === "point" ? 40 : 15)) || (form === "point" && ang > 170)) continue;
    const e = ex(a, b);
    const first = r.next() < 0.5;
    const parts = first ? [ang, ...known] : [...known, ang];
    const labels = parts.map((p, i) => (i === (first ? 0 : parts.length - 1) ? `(${e.text})°` : `${p}°`));
    const p = armsPic(form === "line" ? 0 : r.int(0, 20), parts, labels, { kind: form, whole: `${T}°` });
    const k = known.reduce((s, v) => s + v, 0);
    const eq = (t: number) => `${e.tex} + ${known.join(" + ")} = ${t}`;
    if (kind === 2) {
      const totals = [90, 180, 360];
      return pickOf(
        r,
        A.eqPick,
        opt(eq(T)),
        totals.filter((t) => t !== T).map((u) => ({ o: opt(eq(u)), id: "equationWrongTotal" as const, vars: { t: T, u, e: opt(eq(T)).text } })),
        [opt(`${e.tex} = ${k}`)],
        { pic: p, steps: [eq(T)] },
      );
    }
    const U = form === "line" ? 360 : 180;
    const xw = (U - k - b) / a;
    const traps: Trap[] = [{ id: "angleForX", a: num(ang), vars: { a: ang, v: x } }];
    if (Number.isInteger(xw) && xw > 0 && xw !== x) traps.push({ id: "equationWrongTotal", a: num(xw), vars: { t: T, u: U, e: opt(eq(T)).text } });
    return number(form === "whole" ? fill(A.wholeX, { t: T }) : A.solveX, p, x, traps, [eq(T), `${a}x = ${T - k - b}`, `x = ${x}`]);
  }
}

const gen: Gen = (r, L, w) => {
  if (L === 3) {
    const extra = r.int(0, 4);
    if (extra > 1) return more(r, extra, w);
  }
  // An angle to find from the others, the figure drawn to size (src/math/missingAngle.ts): on a line, in a right
  // angle, around a point, in a triangle, an isosceles triangle or a quadrilateral.
  const t = huntTask(L, r.next);
  const pic = huntSvg(t.fig);
  const traps: Trap[] = huntTraps(t).map((x) => ({ id: x.id, a: num(x.v), vars: x.vars }));
  return {
    prompt: w.prompts.missingAngle,
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { ...num(t.v), traps },
    show: `? = ${t.v}^\\circ`,
    plain: String(t.v),
    format: "number",
    solution: { kind: "angles", spec: { task: t, steps: huntSteps(t) } },
  };
};

export default gen;
