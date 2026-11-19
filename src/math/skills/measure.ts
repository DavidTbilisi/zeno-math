// Practice: Measuring.
import { fill, r2 } from "../chart";
import { dialPic, jugPic, rulerPic } from "../measurePics";
import type { Answer, Gen, MeasurePair, MeasureUnit, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Measuring (P2–P3): reading a ruler, a scale's dial and a jug; a measure in two units and in one; adding and
  // taking away measures in two units.
  const picOf = (p: { body: string; w: number; h: number }) => ({ svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${p.body}</g>`, h: p.h, w: p.w });
  const U = w.units;
  /** A measure in two units, as typed and as TeX (the \enspace keeps the gap after Georgian letters). */
  const both = (v: number, q: MeasurePair) => {
    const [B, s] = [Math.floor(v / q.f), v % q.f];
    return { text: `${B} ${U[q.big]} ${s} ${U[q.small]}`, tex: `${B}\\text{ ${U[q.big]}}\\enspace ${s}\\text{ ${U[q.small]}}` };
  };
  const one = (v: number, u: MeasureUnit) => ({ text: `${v} ${U[u]}`, tex: `${v}\\text{ ${U[u]}}` });
  const meas = (v: number, q: MeasurePair, whole: boolean, traps: Trap[] = []): Extract<Answer, { k: "meas" }> => ({ k: "meas", v, big: q.big, small: q.small, f: q.f, whole, traps });
  const [LENGTH, MASS, VOLUME, KM]: MeasurePair[] = [
    { big: "m", small: "cm", f: 100 },
    { big: "kg", small: "g", f: 1000 },
    { big: "l", small: "ml", f: 1000 },
    { big: "km", small: "m", f: 1000 },
  ];
  if (L === 1) {
    // The instrument's reading. On a scale or a jug the small marks are worth more than 1: counting each as 1 is the trap.
    const kind = r.int(0, 2);
    if (kind === 0) {
      const b = r.int(3, 14);
      return { prompt: w.prompts.measRuler, q: "", pic: picOf(rulerPic(0, b, 15, U.cm)), answer: meas(b, LENGTH, false), show: one(b, "cm").tex, plain: String(b), format: "measure", steps: [`${b} - 0 = ${b}`] };
    }
    const max = r.pick([500, 1000]);
    const major = max === 500 ? 100 : r.pick([100, 200]);
    // 2, 4 or 5 small spaces to a labelled step, few enough to count; the reading past the first label.
    const minor = r.pick(major === 100 ? [20, 25, 50] : [40, 50]);
    let v: number;
    do v = minor * r.int(major / minor + 1, max / minor - 1);
    while (v % major === 0);
    const [lo, k, n] = [v - (v % major), (v % major) / minor, major / minor];
    const q = kind === 1 ? MASS : VOLUME;
    const traps: Trap[] = [{ id: "markAsOne", a: meas(lo + k, q, false), vars: { a: lo, b: lo + major, k: n, s: minor, v } }];
    const pic = kind === 1 ? dialPic(v, max, major, minor, U.g) : jugPic(v, max, major, minor, U.ml);
    return {
      prompt: kind === 1 ? w.prompts.measScale : w.prompts.measJug,
      q: "",
      pic: picOf(pic),
      answer: meas(v, q, false, traps),
      show: one(v, q.small).tex,
      plain: String(v),
      format: "measure",
      steps: [`${major} \\div ${n} = ${minor}`, `${lo} + ${k} \\times ${minor} = ${v}`],
    };
  }
  if (L === 2) {
    const kind = r.int(0, 3);
    if (kind === 0) {
      // A pencil that doesn't start at 0: reading the end mark is the trap.
      const [a, len] = [r.int(1, 5), r.int(3, 9)];
      const b = a + len;
      const traps: Trap[] = [{ id: "rulerEnd", a: meas(b, LENGTH, false), vars: { a, b, v: len } }];
      return { prompt: w.prompts.measRuler, q: "", pic: picOf(rulerPic(a, b, 15, U.cm)), answer: meas(len, LENGTH, false, traps), show: one(len, "cm").tex, plain: String(len), format: "measure", steps: [`${b} - ${a} = ${len}`] };
    }
    const q = kind === 3 ? r.pick([LENGTH, MASS, VOLUME]) : r.pick([LENGTH, MASS, VOLUME, KM]);
    const B = r.int(1, 9);
    // Half the time few of the smaller unit (2 m 5 cm, 3 kg 40 g): writing them straight after the larger, without
    // the zero that holds their place, is the trap (25 cm, 340 g).
    const few = kind === 3 || r.next() < 0.5;
    const s = q.f === 100 ? (few ? r.int(1, 9) : r.int(11, 99)) : few ? 5 * r.int(1, 19) : 5 * r.int(21, 199);
    const v = B * q.f + s;
    const lost = Number(`${B}${s}`);
    const lostVars = { a: both(v, q).text, b: B, f: q.f, s, v, x: lost, big: U[q.big], small: U[q.small] };
    if (kind === 1) {
      const traps: Trap[] = few ? [{ id: "lostZero", a: meas(lost, q, false), vars: lostVars }] : [];
      return { prompt: fill(w.prompts.measToSmall, { a: both(v, q).text, u: U[q.small] }), q: "", answer: meas(v, q, false, traps), show: one(v, q.small).tex, plain: String(v), format: "measure", steps: [`${B} \\times ${q.f} = ${B * q.f}`, `${B * q.f} + ${s} = ${v}`] };
    }
    if (kind === 2)
      return { prompt: fill(w.prompts.measToWhole, { a: one(v, q.small).text, b: U[q.big], s: U[q.small] }), q: "", answer: meas(v, q, true), show: both(v, q).tex, plain: both(v, q).text, format: "measure", steps: [`${v} = ${B} \\times ${q.f} + ${s}`] };
    // Which is more: the measure in two units against one in the smaller unit between it and its lost-zero reading.
    const step = q.f / 10;
    const c = step * r.int(Math.floor(lost / step) + 1, Math.ceil(v / step) - 1);
    const left = r.next() < 0.5;
    const [x, y] = left ? [v, c] : [c, v];
    const [xt, yt] = left ? [both(v, q).tex, one(c, q.small).tex] : [one(c, q.small).tex, both(v, q).tex];
    const sign = x > y ? ">" : "<";
    const wrongSign = (left ? lost > c : c > lost) ? ">" : "<";
    const traps: Trap[] = [{ id: "lostZero", a: { k: "sign", v: wrongSign }, vars: lostVars }];
    return { prompt: w.prompts.compare, q: `${xt} \\;\\square\\; ${yt}`, answer: { k: "sign", v: sign, traps }, show: `${xt} ${sign} ${yt}`, plain: sign, format: "sign", steps: [`${both(v, q).tex} = ${one(v, q.small).tex}`, `${x} ${sign} ${y}`] };
  }
  // Adding with a new unit made, or taking away with one changed into the smaller unit.
  const kind = r.int(0, 2);
  const q = [LENGTH, MASS, VOLUME][kind];
  const s = () => (q.f === 100 ? 5 * r.int(1, 19) : 50 * r.int(1, 19));
  const [ub, us] = [U[q.big], U[q.small]];
  if (r.next() < 0.5) {
    let B1: number, B2: number, s1: number, s2: number;
    do [B1, B2, s1, s2] = [r.int(1, 6), r.int(1, 6), s(), s()];
    while (s1 + s2 <= q.f);
    const [a, b] = [B1 * q.f + s1, B2 * q.f + s2];
    const t = a + b;
    const traps: Trap[] = [{ id: "notRegrouped", a: { ...meas(t, q, true), typed: `${B1 + B2} ${ub} ${s1 + s2} ${us}` } }];
    return {
      prompt: fill([w.prompts.measAddLength, w.prompts.measAddMass, w.prompts.measAddVolume][kind], { a: both(a, q).text, b: both(b, q).text }),
      q: "",
      answer: meas(t, q, true, traps),
      show: both(t, q).tex,
      plain: both(t, q).text,
      format: "measure",
      steps: [`${s1} + ${s2} = ${s1 + s2}\\text{ ${us}} = 1\\text{ ${ub}}\\enspace ${s1 + s2 - q.f}\\text{ ${us}}`, `${B1} + ${B2} + 1 = ${B1 + B2 + 1}`, both(t, q).tex],
    };
  }
  let B1: number, B2: number, s1: number, s2: number;
  do [B1, B2, s1, s2] = [r.int(3, 9), r.int(1, 7), s(), s()];
  while (B1 - B2 < 2 || s1 >= s2);
  const [a, b] = [B1 * q.f + s1, B2 * q.f + s2];
  const t = a - b;
  const slip = (B1 - B2) * q.f + (s2 - s1);
  const traps: Trap[] = [{ id: "smallerUnitFromLarger", a: { ...meas(slip, q, true), typed: both(slip, q).text }, vars: { a: both(a, q).text, b: both(b, q).text, v: both(t, q).text, big: ub, small: us, f: q.f } }];
  return {
    prompt: fill([w.prompts.measSubLength, w.prompts.measSubMass, w.prompts.measSubVolume][kind], { a: both(a, q).text, b: both(b, q).text }),
    q: "",
    answer: meas(t, q, true, traps),
    show: both(t, q).tex,
    plain: both(t, q).text,
    format: "measure",
    steps: [`${both(a, q).tex} = ${B1 - 1}\\text{ ${ub}}\\enspace ${q.f + s1}\\text{ ${us}}`, `${q.f + s1} - ${s2} = ${q.f + s1 - s2}`, `${B1 - 1} - ${B2} = ${B1 - 1 - B2}`, both(t, q).tex],
  };
};

export default gen;
