// Practice: Estimating angles. By eye, the nearest of a few sizes. #710 added, at the medium level, a protractor read
// (the other scale is the slip), the arm that makes an angle picked on a protractor, a fraction of a turn in degrees
// (a fraction of 180° is the slip) and which of three angles is about a size; at the hard level, a reflex angle
// measured with a protractor from the angle inside (that angle given is the slip).
import { angleQuestion, angleSteps, angleSvg } from "../angleGuess";
import { benchRow, protractorPic, turnCircle } from "../anglePics";
import { fill, r2 } from "../chart";
import { num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickOf, word } from "../signedKit";

/** A size in fives, at least 20° from a right angle, so the two scales read clearly differently. */
const fives = (r: Rng, lo: number, hi: number): number => {
  for (;;) {
    const v = 5 * r.int(lo / 5, hi / 5);
    if (Math.abs(v - 90) >= 20) return v;
  }
};

function more(r: Rng, L: 2 | 3, kind: number, w: PracticeWords): Part {
  const A = w.angP;
  const number = (prompt: string, p: Part["pic"], v: number, traps: Trap[], steps: string[]): Part => ({ prompt, q: "", pic: p, answer: { ...num(v), traps }, show: `${v}^\\circ`, plain: String(v), format: "number", steps });
  const left = r.next() < 0.5;
  if (L === 3) {
    // The protractor measures the angle inside; the reflex one is the rest of a whole turn.
    const s = fives(r, 20, 160);
    const [a, b] = left ? [180, 180 - s] : [0, s];
    const p = protractorPic([{ dir: a }, { dir: b }], { from: Math.min(a, b), size: s }, { from: Math.max(a, b), size: 360 - s, label: "?" });
    return number(A.reflex, p, 360 - s, [{ id: "insideAngle", a: num(s), vars: { v: s, a: 360 } }], [`360^\\circ - ${s}^\\circ = ${360 - s}^\\circ`]);
  }
  if (kind === 2) {
    // Read from the 0 the arm lies on: the inner scale when it points right, the outer when it points left.
    const v = fives(r, 15, 165);
    const [a, b] = left ? [180, 180 - v] : [0, v];
    const p = protractorPic([{ dir: a }, { dir: b }], { from: Math.min(a, b), size: v });
    return number(A.measure, p, v, [{ id: "wrongScale", a: num(180 - v), vars: { x: 180 - v, v } }], [`0^\\circ \\to ${v}^\\circ`]);
  }
  if (kind === 3) {
    // Which dashed arm makes the angle: the one at 180° − it on the other scale is the slip.
    const v = fives(r, 20, 160);
    let o: number;
    do o = fives(r, 20, 160);
    while (Math.abs(o - v) < 20 || Math.abs(o - (180 - v)) < 20);
    const dir = (x: number) => (left ? 180 - x : x);
    const sizes = [v, 180 - v, o].sort((x, y) => dir(x) - dir(y));
    const name = (x: number) => "ABC"[sizes.indexOf(x)];
    const p = protractorPic([{ dir: left ? 180 : 0 }, ...sizes.map((x) => ({ dir: dir(x), color: "#1e1e1e", dash: true, label: name(x) }))]);
    return pickOf(r, fill(A.drawPick, { a: v }), word(name(v)), [{ o: word(name(180 - v)), id: "wrongScale", vars: { x: 180 - v, v } }], [word(name(o))], { pic: p, steps: [`\\text{${name(v)}}: ${v}^\\circ`] });
  }
  if (kind === 4) {
    // A fraction of a whole turn: of 360°.
    const n = r.pick([4, 5, 6, 8, 9, 10, 12]);
    const k = r.int(1, n - 1);
    const v = (360 * k) / n;
    const half = (180 * k) / n;
    const traps: Trap[] = Number.isInteger(half) ? [{ id: "fractionOf180", a: num(half), vars: { x: half, f: `${k}/${n}`, v } }] : [];
    return number(fill(A.turn, { f: `${k}/${n}` }), turnCircle(n, k), v, traps, [`\\tfrac{${k}}{${n}} \\times 360^\\circ = ${v}^\\circ`]);
  }
  // Which of three is about the size: the one on the other side of a right angle is the slip.
  const t = r.pick([30, 45, 60, 120, 135, 150]);
  const shown = t + r.int(-4, 4);
  const slip = 180 - t + r.int(-4, 4);
  let o: number;
  do o = r.int(15, 170);
  while (Math.abs(o - shown) < 30 || Math.abs(o - slip) < 30);
  const sizes = [shown, slip, o];
  const order = [0, 1, 2];
  for (let i = 2; i > 0; i--) {
    const j = r.int(0, i);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const at = (i: number) => word("ABC"[order.indexOf(i)]);
  return pickOf(r, fill(A.bench, { a: t }), at(0), [{ o: at(1), id: "acuteObtuse", vars: { v: 180 - t, a: 180 } }], [at(2)], {
    pic: benchRow(order.map((i) => sizes[i])),
    steps: [`${shown}^\\circ \\approx ${t}^\\circ`],
  });
}

const gen: Gen = (r, L, w) => {
  if (L === 3 && r.int(0, 2) === 0) return more(r, 3, 0, w);
  if (L === 2) {
    const extra = r.int(0, 5);
    if (extra > 1) return more(r, 2, extra, w);
  }
  // About how big an angle is, by eye (src/math/angleGuess.ts): the nearest of a few sizes, typed or picked.
  const q = angleQuestion(L, r.next);
  const pic = angleSvg(q.task, { R: 100, crop: true });
  const traps: Trap[] = q.trap ? [{ id: q.trap.id, a: { k: "near", options: q.options, right: q.trap.at }, vars: { v: q.options[q.trap.at].v, a: L === 3 ? 360 : 180 } }] : [];
  return {
    prompt: fill(w.prompts.estimateAngle, { opts: q.options.map((o) => o.text).join(", ") }),
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { k: "near", options: q.options, right: q.right, traps },
    show: `${q.task.size}^\\circ \\approx ${q.options[q.right].tex}`,
    plain: q.options[q.right].plain,
    format: "near",
    solution: { kind: "angle", spec: { task: q.task, steps: angleSteps(q) } },
  };
};

export default gen;
