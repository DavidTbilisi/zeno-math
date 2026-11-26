// Practice: Measuring.
// #705 adds, at P2: ribbons compared and put in order on squared paper (the one reaching farthest is not always the
// longest), a length compared through a third, the unit chosen for a length, the same length counted in a longer and
// a shorter unit, and a length estimated from one given beside it; at P3: masses, volumes and lengths estimated (mm
// to km), a measure written in a smaller unit (cm to mm too), and stories with × and ÷ (apples, glasses, a jug poured
// out, a ribbon cut, rice put in bags).
import { fill, r2 } from "../chart";
import { dialPic, jugPic, rulerPic, stripsPic, type Strip } from "../measurePics";
import { pickText, shuffled } from "../mulDivKit";
import { num } from "../practiceKit";
import type { Answer, Gen, MeasurePair, MeasureUnit, Part, Trap } from "../practiceTypes";

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
  const M = w.measTime;
  /** "15 cm" as an option. */
  const amount = (n: number, u: MeasureUnit) => `${n} ${U[u]}`;
  /**
   * About how much is a thing: the right amount, the same number in a unit far too big or small (the slip), and ten
   * times the right one.
   */
  const estimate = (prompt: string, thing: string, n: number, u: MeasureUnit, wrong: MeasureUnit): Part =>
    pickText(r, fill(prompt, { thing }), amount(n, u), [{ text: amount(n, wrong), id: "unitOutOfScale", vars: { thing, v: amount(n, u) } }], [amount(10 * n, u)], {
      steps: [`\\text{${thing}} \\approx ${n}\\text{ ${U[u]}}`],
    });
  const RIBBONS = ["#ffc9c9", "#a5d8ff", "#b2f2bb", "#ffec99"];

  /** Three ribbons on squared paper, the longest not the one reaching farthest: which is longest or shortest, or their order. */
  const ribbons = (): Part => {
    let strips: Strip[];
    let lens: number[];
    const ask = r.int(0, 2);
    const ends = (ss: Strip[]) => ss.map((x) => x.a + x.n);
    for (;;) {
      lens = shuffled(r, [r.int(3, 4), r.int(5, 6), r.int(7, 8)]);
      strips = lens.map((n, i) => ({ a: r.int(0, 4), n, letter: "ABC"[i], fill: RIBBONS[i] }));
      const e = ends(strips);
      if (new Set(e).size < 3) continue;
      const far = e.indexOf(Math.max(...e)), near = e.indexOf(Math.min(...e));
      const [long, short] = [lens.indexOf(Math.max(...lens)), lens.indexOf(Math.min(...lens))];
      if (ask === 0 ? far !== long : ask === 1 ? near !== short : far !== long || near !== short) break;
    }
    const pic = stripsPic(strips, true);
    const counts = strips.map((x) => `${x.letter} ${x.n}`).join(", ");
    const steps = [`\\text{${strips.map((x) => `${x.letter}: ${x.n}`).join(", ")}}`];
    const byEnd = [0, 1, 2].sort((i, j) => ends(strips)[i] - ends(strips)[j]);
    const byLen = [0, 1, 2].sort((i, j) => lens[i] - lens[j]);
    if (ask === 2) {
      const order = (o: number[]) => o.map((i) => "ABC"[i]).join(", ");
      const others = [[0, 1, 2], [2, 1, 0], [1, 0, 2], [0, 2, 1]].map(order).filter((o) => o !== order(byLen) && o !== order(byEnd));
      return pickText(r, M.ribbonsOrder, order(byLen), [{ text: order(byEnd), id: "endFarthest", vars: { x: "ABC"[byEnd[2]], v: counts } }], others.slice(0, 2), { pic: picOf(pic), steps });
    }
    const [right, slip] = ask === 0 ? [byLen[2], byEnd[2]] : [byLen[0], byEnd[0]];
    const third = [0, 1, 2].find((i) => i !== right && i !== slip)!;
    return pickText(r, ask === 0 ? M.ribbonsLong : M.ribbonsShort, "ABC"[right], [{ text: "ABC"[slip], id: "endFarthest", vars: { x: "ABC"[slip], v: counts } }], ["ABC"[third]], { pic: picOf(pic), steps });
  };
  if (L === 1) {
    // The instrument's reading. On a scale or a jug the small marks are worth more than 1: counting each as 1 is the trap.
    const kind = r.int(0, 6);
    if (kind === 3) return ribbons();
    if (kind === 4) {
      // Taller than through a third: a > b and b > c, so a > c.
      const [a, b, c] = shuffled(r, M.names).slice(0, 3);
      return pickText(r, fill(M.taller, { a, b, c }), a, [], [c, M.same], { steps: [`\\text{${a}} > \\text{${b}} > \\text{${c}}`] });
    }
    if (kind === 5) {
      // The unit for a length: the same number in the other unit is the slip (a pencil 15 m long).
      const [thing, n, u] = r.pick([["pencil", 15, "cm"], ["book", 25, "cm"], ["shoe", 20, "cm"], ["crayon", 8, "cm"], ["door", 2, "m"], ["bus", 12, "m"], ["classroom", 8, "m"]] as const);
      return estimate(M.aboutLong, M.things[thing], n, u, u === "cm" ? "m" : "cm");
    }
    if (kind === 6 && r.next() < 0.5) {
      // The same length in a longer and a shorter unit: more of the shorter fit. Counting more of the longer is the slip.
      const [story, short, long] = r.pick([[M.handFoot, M.hands, M.feet], [M.clipPencil, M.clips, M.pencils]] as const);
      return pickText(r, story, short, [{ text: long, id: "biggerUnitMore", vars: { v: short } }], [M.sameCount], { steps: [`\\text{${M.fewerFit}}`] });
    }
    if (kind === 6) {
      // A length estimated from one given beside it: B is about k times A.
      const [g, k] = [r.pick([2, 3, 4, 5]), r.int(2, 4)];
      const pic = stripsPic([{ a: 0, n: g, letter: "A", fill: RIBBONS[1], label: amount(g, "cm") }, { a: 0, n: g * k, letter: "B", fill: RIBBONS[0], label: "?" }], false);
      const others = [...new Set([g + k, g * k + 10 * g, g])].filter((x) => x !== g * k).slice(0, 2);
      return pickText(r, M.aboutB, amount(g * k, "cm"), [], others.map((x) => amount(x, "cm")), { pic: picOf(pic), steps: [`${g} \\times ${k} = ${g * k}`] });
    }
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
    const kind = r.int(0, 5);
    if (kind === 4) {
      // About how heavy, how much it holds, how long: the same number in a unit far off is the slip.
      const t = r.int(0, 2);
      if (t === 0) {
        const [thing, n, u, x] = r.pick([["apple", 150, "g", "kg"], ["clip", 1, "g", "kg"], ["flour", 1, "kg", "g"], ["dog", 20, "kg", "g"], ["melon", 5, "kg", "g"], ["egg", 60, "g", "kg"]] as const);
        return estimate(M.aboutHeavy, M.things[thing], n, u, x);
      }
      if (t === 1) {
        const [thing, n, u, x] = r.pick([["spoon", 5, "ml", "l"], ["cup", 250, "ml", "l"], ["bath", 200, "l", "ml"], ["bucket", 10, "l", "ml"], ["bottle", 1, "l", "ml"]] as const);
        return estimate(M.aboutHolds, M.things[thing], n, u, x);
      }
      const [thing, n, u, x] = r.pick([["ant", 5, "mm", "cm"], ["rice", 6, "mm", "cm"], ["towns", 30, "km", "m"], ["marathon", 42, "km", "m"], ["pitch", 100, "m", "km"], ["finger", 6, "cm", "m"]] as const);
      return estimate(M.aboutLong, M.things[thing], n, u, x);
    }
    if (kind === 5) {
      // A whole number of the larger unit in the smaller: the factor of another pair of units is the slip (6 m = 60 cm).
      const q = r.pick([{ big: "cm", small: "mm", f: 10 }, LENGTH, KM, { big: "m", small: "mm", f: 1000 }, MASS, VOLUME] as MeasurePair[]);
      const n = r.int(2, 9);
      const g = q.f === 100 ? 10 : q.f === 10 ? 100 : 100;
      const traps: Trap[] = [{ id: "unitFactor", a: meas(n * g, q, false), vars: { big: U[q.big], small: U[q.small], f: q.f, g, work: `${n} × ${q.f} = ${n * q.f}` } }];
      return { prompt: fill(w.prompts.measToSmall, { a: one(n, q.big).text, u: U[q.small] }), q: "", answer: meas(n * q.f, q, false, traps), show: one(n * q.f, q.small).tex, plain: String(n * q.f), format: "measure", steps: [`1\\text{ ${U[q.big]}} = ${q.f}\\text{ ${U[q.small]}}`, `${n} \\times ${q.f} = ${n * q.f}`] };
    }
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
  if (r.int(0, 2) === 0) {
    // × and ÷ stories: so many of an amount (adding the two numbers is the slip), or how many parts fit once both are
    // in the same unit.
    const t = r.int(0, 4);
    if (t <= 1) {
      const [a, n] = t === 0 ? [r.pick([120, 150, 180, 200, 250]), r.int(3, 8)] : [r.pick([150, 200, 250, 300]), r.int(3, 6)];
      const q = t === 0 ? MASS : VOLUME;
      return {
        prompt: fill(t === 0 ? M.apples : M.glasses, { a, n }), q: "", answer: meas(a * n, q, false, [{ id: "addedNotTimes", a: meas(a + n, q, false), vars: { a: n, b: a, x: a + n, v: a * n } }]),
        show: one(a * n, q.small).tex, plain: String(a * n), format: "measure", steps: [`${n} \\times ${a} = ${a * n}`],
      };
    }
    const [story, big, small, f, parts] = ([
      [M.jug, "l", "ml", 1000, [200, 250, 500]],
      [M.ribbonCut, "m", "cm", 100, [20, 25, 50]],
      [M.rice, "kg", "g", 1000, [100, 200, 250, 500]],
    ] as const)[t - 2];
    const [L0, a] = [r.int(1, 3), r.pick(parts)];
    const v = (L0 * f) / a;
    return { prompt: fill(story, { L: L0, a }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", steps: [`${L0}\\text{ ${U[big]}} = ${L0 * f}\\text{ ${U[small]}}`, `${L0 * f} \\div ${a} = ${v}`] };
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
