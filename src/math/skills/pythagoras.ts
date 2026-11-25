// Practice: Pythagoras' theorem. In a right triangle the square on the longest side, the hypotenuse opposite the right
// angle, is the squares on the other two added: a² + b² = c². Easy: the hypotenuse from two whole sides (the triples).
// Medium: a shorter side, answers that are surds or decimals, and whether three lengths make a right angle. Hard: two
// steps or a new setting: the diagonal of a box, a ladder against a wall, the height of an isosceles triangle. The
// sides added instead of their squares, the square root left out, the square of a shorter side added instead of taken
// away, the longest side not checked alone, only the floor's diagonal, and the whole base for its half are the slips.
import { fill, r2 } from "../chart";
import { sqrtSplit } from "../expr";
import { dp, fr, num, surdTex } from "../practiceKit";
import type { Gen, Part, Trap } from "../practiceTypes";
import { boxSvg, isoSvg, ladderSvg, rightSvg } from "../pythagoras";
import type { Drawn } from "../shapeKinds";

/** The Pythagorean triples the easy level is built from. */
export const TRIPLES: readonly [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];

const gen: Gen = (r, L, w) => {
  const W = w.pyth;
  const pic = (d: Drawn) => ({ svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${d.body}</g>`, h: d.h, w: d.w });
  const tilt = () => r.pick([0, 0, 20, -25, 90, 180, 200]);
  /** √n as an answer: whole when n is a square, else simplest surd form or two decimal places. */
  const root = (prompt: string, d: Drawn, n: number, traps: Trap[], steps: string[]): Part => {
    const v = Math.sqrt(n);
    const { out, s } = sqrtSplit(fr(n));
    const whole = s === 1;
    return {
      prompt, q: "", pic: pic(d),
      answer: whole ? { ...num(v), traps } : { ...num(v, 0.0051, { surd: true }), traps },
      show: whole ? String(v) : `${surdTex(fr(0), out, s)} \\approx ${dp(v, 2)}`,
      plain: whole ? String(v) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
      format: whole ? "number" : "exact",
      steps: [...steps, whole ? `\\sqrt{${n}} = ${v}` : out.n === 1 ? `? = \\sqrt{${n}} \\approx ${dp(v, 2)}` : `? = \\sqrt{${n}} = ${surdTex(fr(0), out, s)} \\approx ${dp(v, 2)}`],
    };
  };
  const t = (id: Trap["id"], v: number, vars: Record<string, string | number>): Trap => ({ id, a: num(v, 0.0051), vars });

  if (L === 1) {
    // The hypotenuse of a triple, scaled: the sides added and the root left out are the slips.
    const [p, q, c] = r.pick(TRIPLES.slice(0, 4));
    const k = c >= 17 ? 1 : r.pick([1, 1, 2, 3]);
    const [a, b] = r.next() < 0.5 ? [p * k, q * k] : [q * k, p * k];
    const n = a * a + b * b;
    const d = rightSvg(a, b, [String(a), String(b), "?"], tilt());
    return root(W.find, d, n, [t("sidesAdded", a + b, { a, b, n }), t("rootLeftOut", n, { n })], [`?^2 = ${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${n}`]);
  }

  if (L === 2) {
    const kind = r.int(0, 2);
    if (kind === 0) {
      // A shorter side: the longest side's square, less the other's.
      const [a, c] = r.next() < 0.5 ? (([p, q, h]) => [r.pick([p, q]), h])(r.pick(TRIPLES)) : [r.int(3, 12), 0];
      const hyp = c || a + r.int(2, 8);
      const n = hyp * hyp - a * a;
      const d = rightSvg(a, Math.sqrt(n), [String(a), "?", String(hyp)], tilt());
      const traps = [t("shorterAsHypotenuse", Math.sqrt(hyp * hyp + a * a), { c: hyp, a, n }), t("rootLeftOut", n, { n })];
      return root(W.find, d, n, traps, [`?^2 = ${hyp}^2 - ${a}^2 = ${hyp * hyp} - ${a * a} = ${n}`]);
    }
    if (kind === 1) {
      // The hypotenuse when it is not whole: a surd, or a decimal.
      let a: number, b: number;
      do [a, b] = [r.int(2, 11), r.int(2, 11)];
      while (Number.isInteger(Math.hypot(a, b)));
      const n = a * a + b * b;
      const d = rightSvg(a, b, [String(a), String(b), "?"], tilt());
      return root(W.findExact, d, n, [t("sidesAdded", a + b, { a, b, n }), t("rootLeftOut", n, { n })], [`?^2 = ${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${n}`]);
    }
    // Three lengths: a right angle or not, by the longest side's square against the other two added.
    const right = r.next() < 0.6;
    const [p, q, h] = r.pick(TRIPLES);
    const k = h > 20 ? 1 : r.pick([1, 2]);
    const sides = right ? [p * k, q * k, h * k] : [p * k, q * k, h * k + r.pick([-1, 1, 2])];
    // Listed with the longest side not last, so it has to be found.
    const shown = r.next() < 0.6 ? [sides[0], sides[2], sides[1]] : [sides[2], sides[0], sides[1]];
    const [yes, no] = [W.yes, W.no];
    const options = [yes, no].map((x) => ({ text: x, plain: x, tex: `\\text{${x}}` }));
    const sum = sides[0] ** 2 + sides[1] ** 2;
    const traps: Trap[] = right ? [{ id: "wrongSideAlone", a: { k: "pick", options, right: 1 }, vars: { a: sides[0], b: sides[1], c: sides[2], s: sum } }] : [];
    return {
      prompt: fill(W.isRight, { a: shown[0], b: shown[1], c: shown[2] }), q: "",
      answer: { k: "pick", options, right: right ? 0 : 1, traps }, show: options[right ? 0 : 1].tex, plain: right ? yes : no, format: "pick",
      steps: [`${sides[0]}^2 + ${sides[1]}^2 = ${sum}`, `${sides[2]}^2 = ${sides[2] ** 2}`, right ? `${sum} = ${sides[2] ** 2}` : `${sum} \\ne ${sides[2] ** 2}`],
    };
  }

  const kind = r.int(0, 2);
  if (kind === 0) {
    // The diagonal of a box: the floor's diagonal first, then with the height.
    const [l, wd, h] = [r.int(3, 12), r.int(2, 8), r.int(2, 10)];
    const floor = l * l + wd * wd;
    const n = floor + h * h;
    const d = boxSvg(l, wd, h, [`${l} cm`, `${wd} cm`, `${h} cm`]);
    return root(fill(W.box, { l, w: wd, h }), d, n, [t("floorDiagonalOnly", Math.sqrt(floor), { f: floor, h, n })], [
      `\\text{${W.floorStep}}: ${l}^2 + ${wd}^2 = ${floor}`, `?^2 = ${floor} + ${h}^2 = ${n}`,
    ]);
  }
  if (kind === 1) {
    // A ladder against a wall: the ladder is the longest side.
    const len = r.int(4, 9);
    const foot = r.int(1, 3);
    const n = len * len - foot * foot;
    const d = ladderSvg(len, foot, { ladder: `${len} m`, foot: `${foot} m`, up: "?" });
    return root(fill(W.ladder, { l: len, d: foot }), d, n, [t("shorterAsHypotenuse", Math.sqrt(len * len + foot * foot), { c: len, a: foot, n })], [`?^2 = ${len}^2 - ${foot}^2 = ${n}`]);
  }
  // The height of an isosceles triangle: half the base and a slanting side make the right triangle.
  const half = r.int(2, 8);
  const side = half + r.int(2, 8);
  const n = side * side - half * half;
  const d = isoSvg(side, 2 * half, { side: `${side} cm`, base: `${2 * half} cm`, height: "?" });
  const whole = side * side - 4 * half * half;
  return root(fill(W.iso, { s: side, b: 2 * half }), d, n, whole > 0 ? [t("baseNotHalved", Math.sqrt(whole), { b: 2 * half, h: half })] : [], [
    `\\text{${W.halfStep}}: ${2 * half} \\div 2 = ${half}`, `?^2 = ${side}^2 - ${half}^2 = ${n}`,
  ]);
};

export default gen;
