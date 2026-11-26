// Practice: Time.
// #705 adds, at P3: the clock read to the minute, a time read off a number line marked every 5, 10 or 15 minutes, and
// a story worked on such a line; at P4: hours, minutes, seconds and days written in the smaller unit, bare and in
// stories (a film, a song, a school trip), and how long things take estimated.
import { fill, r2 } from "../chart";
import { pickText } from "../mulDivKit";
import { num } from "../practiceKit";
import { clock12, clock24, clockPic, durationTex, durationText, HALF_DAY, hops, hourLinePic, type TimeSolution, timeTex } from "../timePics";
import type { Gen, Part, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const u = { h: w.time.h, min: w.time.min };
  const timePic = (t: number) => {
    const p = clockPic(t);
    return { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${p.body}</g>`, h: p.h + 4, w: p.w };
  };
  const line = (from: number, to: number, h24: boolean, ask: "end" | "start" | "length", steps: string[]) => ({ kind: "time" as const, spec: { pic: "line", from, to, h24, ask, units: u, steps } satisfies TimeSolution });
  const show = (t: number, h24: boolean) => (h24 ? clock24(t) : clock12(t));
  // Taking the later time from the earlier like whole numbers (3:15 − 2:50 = 65): an hour of 100 minutes. With hours
  // left over and 60 or more minutes it is no length of time at all (1 h 65 min), which the checker names itself.
  const decimalTraps = (from: number, to: number, h24: boolean): Trap[] => {
    const hhmm = (t: number) => 100 * Math.floor(t / 60) + (t % 60);
    const D = hhmm(to) - hhmm(from);
    const [dh, dm] = [Math.floor(D / 100), D % 100];
    const next = from + ((60 - (from % 60)) % 60);
    const vars = { a: show(from, h24), b: show(to, h24), n: show(next, h24), x: next - from };
    if (D === to - from) return [];
    if (dh === 0) return [{ id: "timeAsDecimal", a: { k: "dur", m: D }, vars }];
    if (dm >= 60) return [{ id: "minutes100", a: { k: "dur", m: 60 * dh + dm, typed: `${dh} ${u.h} ${dm} ${u.min}` } }];
    return [{ id: "timeAsDecimal", a: { k: "dur", m: 60 * dh + dm }, vars }];
  };
  const hopSteps = (from: number, to: number, h24: boolean, back = false) =>
    (back ? [...hops(from, to)].reverse() : hops(from, to)).map((h) =>
      back ? `${timeTex(show(h.b, h24))} - ${durationTex(h.b - h.a, u)} = ${timeTex(show(h.a, h24))}` : `${timeTex(show(h.a, h24))} + ${durationTex(h.b - h.a, u)} = ${timeTex(show(h.b, h24))}`,
    );
  const lengthSteps = (from: number, to: number) => {
    const hs = hops(from, to);
    return hs.length > 1 ? [`${hs.map((h) => durationTex(h.b - h.a, u)).join(" + ")} = ${durationTex(to - from, u)}`] : [];
  };
  const partOf = (t: number) => {
    const h = Math.floor(t / 60);
    return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : h >= 18 && h < 22 ? "evening" : "night";
  };
  if (L === 1) {
    // A clock with hands (P2): o'clock, half past, then any five minutes. Saying the hour the short hand is nearing,
    // and reading the hands the wrong way round, are the traps.
    const kind = r.int(0, 3);
    const h = r.int(1, 12);
    const mm = kind === 0 ? 0 : kind === 1 ? 30 : 5 * r.int(1, 11);
    const t = (h % 12) * 60 + mm;
    const n = mm / 5 || 12;
    const traps: Trap[] = [];
    if (mm >= 35) traps.push({ id: "hourAhead", a: { k: "clock", t: t + 60, face: true }, vars: { n: (h % 12) + 1, h, v: clock12(t) } });
    const swapped = (n % 12) * 60 + ((h * 5) % 60);
    if (![t, t + 60].some((x) => clock12(x) === clock12(swapped))) traps.push({ id: "handsSwapped", a: { k: "clock", t: swapped, face: true }, vars: { h, n, v: clock12(t) } });
    const steps = [`\\text{${w.time.shortHand}} \\to ${h}`, mm ? `\\text{${w.time.longHand}} \\to ${n} \\times 5 = ${mm}` : `\\text{${w.time.longHand}} \\to 12 \\to 00`, timeTex(clock12(t))];
    return { prompt: w.prompts.timeRead, q: "", pic: timePic(t), answer: { k: "clock", t, face: true, traps }, show: timeTex(clock12(t)), plain: clock12(t), format: "clock", solution: { kind: "time", spec: { pic: "read", t, steps } satisfies TimeSolution } };
  }
  const M = w.measTime;
  const picOf = (p: { body: string; w: number; h: number }) => ({ svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${p.body}</g>`, h: p.h, w: p.w });
  /** The clock read to the minute, a time on a line, or a story on a line (#705). */
  const minute = (kind: number): Part => {
    if (kind === 3) {
      const h = r.int(1, 12);
      let mm: number;
      do mm = r.int(1, 59);
      while (mm % 5 === 0);
      const t = (h % 12) * 60 + mm;
      const traps: Trap[] = mm >= 35 ? [{ id: "hourAhead", a: { k: "clock", t: t + 60, face: true }, vars: { n: (h % 12) + 1, h, v: clock12(t) } }] : [];
      const steps = [`\\text{${w.time.shortHand}} \\to ${h}`, `\\text{${w.time.longHand}} \\to ${Math.floor(mm / 5)} \\times 5 + ${mm % 5} = ${mm}`, timeTex(clock12(t))];
      return { prompt: w.prompts.timeRead, q: "", pic: timePic(t), answer: { k: "clock", t, face: true, traps }, show: timeTex(clock12(t)), plain: clock12(t), format: "clock", solution: { kind: "time", spec: { pic: "read", t, steps } satisfies TimeSolution } };
    }
    const from = 60 * r.int(1, 10);
    if (kind === 4) {
      // A point on a line marked every 5, 10 or 15 minutes; counting each mark as one minute is the slip.
      const step = r.pick([5, 10, 15]);
      const n = 60 / step;
      const k = r.int(1, n - 1);
      const t = from + k * step;
      const traps: Trap[] = [{ id: "markAsOne", a: { k: "clock", t: from + k }, vars: { a: clock12(from), b: clock12(from + 60), k: n, s: step, v: clock12(t) } }];
      return { prompt: M.lineTime, q: "", pic: picOf(hourLinePic(from, 1, step, { dot: t })), answer: { k: "clock", t, traps }, show: timeTex(clock12(t)), plain: clock12(t), format: "clock", solution: line(from, t, false, "end", [`60 \\div ${n} = ${step}`, `${k} \\times ${step} = ${k * step}`, timeTex(clock12(t))]) };
    }
    // A story on a line marked every 5 minutes: when did it end?
    const start = from + 5 * r.int(5, 11);
    let d: number;
    do d = 5 * r.int(3, 11);
    while ((start % 60) + d < 60);
    const to = start + d;
    const name = r.pick(M.names);
    const traps: Trap[] = [
      { id: "hourNotCarried", a: { k: "clock", t: to - 60 }, vars: { v: clock12(to) } },
      { id: "minutes100", a: { k: "clock", t: to, typed: `${Math.floor(start / 60)}:${(start % 60) + d}` } },
    ];
    return { prompt: fill(M.homework, { name, a: clock12(start), d: durationText(d, u) }), q: "", pic: picOf(hourLinePic(from, 2, 5, { start })), answer: { k: "clock", t: to, traps }, show: timeTex(clock12(to)), plain: clock12(to), format: "clock", solution: line(start, to, false, "end", hopSteps(start, to, false)) };
  };
  /** A time in a smaller unit, bare or in a story; or how long a thing takes (#705). */
  const units = (kind: number): Part => {
    const S = { h: w.time.h, min: w.time.min, s: M.sec, d: M.days };
    if (kind === 6) {
      const [act, n, us, x] = r.pick([["blink", 1, "s", "min"], ["shoes", 20, "s", "min"], ["teeth", 2, "min", "h"], ["lunch", 20, "min", "h"], ["match", 90, "min", "s"], ["sleep", 9, "h", "min"], ["cake", 1, "h", "s"]] as const);
      const [right, slip] = [`${n} ${S[us]}`, `${n} ${S[x]}`];
      return pickText(r, fill(M.aboutTime, { thing: M.acts[act] }), right, [{ text: slip, id: "unitOutOfScale", vars: { thing: M.acts[act], v: right } }], [`${n * 10} ${S[us]}`], { steps: [`\\text{${M.acts[act]}} \\approx ${n}\\text{ ${S[us]}}`] });
    }
    const [big, small, f] = r.pick([["h", "min", 60], ["min", "s", 60], ["d", "h", 24]] as const);
    const n = r.int(2, f === 24 ? 7 : 5);
    const s = f === 24 || r.next() < 0.4 ? 0 : r.int(1, 11) * 5;
    const v = n * f + s;
    const work = s ? `${n} × ${f} + ${s} = ${v}` : `${n} × ${f} = ${v}`;
    const traps: Trap[] = f === 60 ? [{ id: "unitFactor", a: num(n * 100 + s), vars: { big: S[big], small: S[small], f, g: 100, work } }] : [];
    const steps = [`1\\text{ ${S[big]}} = ${f}\\text{ ${S[small]}}`, work.replace(/×/g, "\\times")];
    const given = s ? `${n}\\text{ ${S[big]}}\\enspace ${s}\\text{ ${S[small]}}` : `${n}\\text{ ${S[big]}}`;
    if (kind === 5) {
      const story = f === 24 ? M.trip : big === "h" ? M.film : M.song;
      return { prompt: fill(story, { a: s ? `${n} ${S[big]} ${s} ${S[small]}` : `${n} ${S[big]}` }), q: "", answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps };
    }
    return { prompt: w.basics.missing, q: `${given} = \\square\\text{ ${S[small]}}`, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps };
  };
  if (L === 2) {
    const extra = r.int(0, 5);
    if (extra >= 3) return minute(extra);
    // How long, and when (P3), on the 12-hour clock within the morning or the afternoon: always across an o'clock,
    // so the minutes pass 60. Leaving the hour as it was, and counting 100 minutes to the hour, are the traps.
    const [fh, fm] = [r.int(1, 8), 5 * r.int(7, 11)];
    const from = 60 * fh + fm;
    const hours = r.next() < 0.4 ? 1 : 0;
    let d: number;
    do d = 60 * hours + 5 * r.int(1, 11);
    while (fm + (d % 60) < 60);
    const to = from + d;
    const kind = r.int(0, 2);
    if (kind === 0) {
      const traps: Trap[] = [
        { id: "hourNotCarried", a: { k: "clock", t: to - 60 }, vars: { v: clock12(to) } },
        { id: "minutes100", a: { k: "clock", t: to, typed: `${fh + hours}:${fm + (d % 60)}` } },
      ];
      return { prompt: fill(w.prompts.timeEnd, { a: clock12(from), d: durationText(d, u) }), q: "", answer: { k: "clock", t: to, traps }, show: timeTex(clock12(to)), plain: clock12(to), format: "clock", solution: line(from, to, false, "end", hopSteps(from, to, false)) };
    }
    if (kind === 1) {
      // 3:15 − 25 min worked like 315 − 25 = 290 gives 2:90.
      const traps: Trap[] = [
        { id: "hourNotCarried", a: { k: "clock", t: from + 60 }, vars: { v: clock12(from) } },
        { id: "minutes100", a: { k: "clock", t: from, typed: `${fh}:${40 + fm}` } },
      ];
      return { prompt: fill(w.prompts.timeStart, { d: durationText(d, u), b: clock12(to) }), q: "", answer: { k: "clock", t: from, traps }, show: timeTex(clock12(from)), plain: clock12(from), format: "clock", solution: line(from, to, false, "start", hopSteps(from, to, false, true)) };
    }
    return { prompt: fill(w.prompts.timeLength, { a: clock12(from), b: clock12(to) }), q: "", answer: { k: "dur", m: d, traps: decimalTraps(from, to, false) }, show: durationTex(d, u), plain: durationText(d, u), format: "duration", solution: line(from, to, false, "length", [...hopSteps(from, to, false), ...lengthSteps(from, to)]) };
  }
  // The 24-hour clock (P4): from a time said with its part of the day, back to a clock with hands, and trips across
  // noon. Leaving the afternoon's hours as they are, and taking 10 from them in place of 12, are the traps.
  const kind = r.int(0, 6);
  if (kind >= 4) return units(kind);
  if (kind === 0) {
    const pm = r.next() < 0.7;
    const t = 60 * (pm ? r.int(13, 23) : r.int(5, 11)) + 5 * r.int(0, 11);
    const part = w.time.parts[partOf(t)];
    const traps: Trap[] = pm ? [{ id: "not24", a: { k: "clock", t: t - HALF_DAY, h24: true }, vars: { a: clock12(t), part, v: clock24(t) } }] : [];
    const steps = pm ? [`${Math.floor(t / 60) - 12} + 12 = ${Math.floor(t / 60)}`, timeTex(clock24(t))] : [timeTex(clock24(t))];
    return { prompt: fill(w.prompts.time24, { a: clock12(t), part }), q: "", answer: { k: "clock", t, h24: true, traps }, show: timeTex(clock24(t)), plain: clock24(t), format: "clock", solution: { kind: "time", spec: { pic: "read", t, steps } satisfies TimeSolution } };
  }
  if (kind === 1) {
    const H = r.int(13, 23);
    const t = 60 * H + 5 * r.int(0, 11);
    const traps: Trap[] = [{ id: "twelveNotTen", a: { k: "clock", t: t - 600, face: true }, vars: { h: H, k: H - 12, v: clock12(t) } }];
    return { prompt: fill(w.prompts.time12, { a: clock24(t) }), q: "", answer: { k: "clock", t, face: true, traps }, show: timeTex(clock12(t)), plain: clock12(t), format: "clock", solution: { kind: "time", spec: { pic: "read", t, steps: [`${H} - 12 = ${H - 12}`, timeTex(clock12(t))] } satisfies TimeSolution } };
  }
  // A trip across noon on the 24-hour clock: its length, or when it arrives.
  let from: number, to: number;
  do {
    from = 60 * r.int(8, 11) + 5 * r.int(1, 11);
    to = 60 * r.int(12, 16) + 5 * r.int(1, 11);
  } while (to - from < 65 || from % 60 <= to % 60);
  if (kind === 2) {
    const d = to - from;
    return { prompt: fill(w.prompts.timeTrip, { a: clock24(from), b: clock24(to) }), q: "", answer: { k: "dur", m: d, traps: decimalTraps(from, to, true) }, show: durationTex(d, u), plain: durationText(d, u), format: "duration", solution: line(from, to, true, "length", [...hopSteps(from, to, true), ...lengthSteps(from, to)]) };
  }
  const d = to - from;
  const [fh, fm] = [Math.floor(from / 60), from % 60];
  const traps: Trap[] = [
    { id: "hourNotCarried", a: { k: "clock", t: to - 60, h24: true }, vars: { v: clock24(to) } },
    { id: "minutes100", a: { k: "clock", t: to, h24: true, typed: `${fh + Math.floor(d / 60)}:${fm + (d % 60)}` } },
  ];
  if (to >= 13 * 60) traps.push({ id: "not24", a: { k: "clock", t: to - HALF_DAY, h24: true }, vars: { a: clock12(to), part: w.time.parts[partOf(to)], v: clock24(to) } });
  return { prompt: fill(w.prompts.timeTripEnd, { a: clock24(from), d: durationText(d, u) }), q: "", answer: { k: "clock", t: to, h24: true, traps }, show: timeTex(clock24(to)), plain: clock24(to), format: "clock", solution: line(from, to, true, "end", hopSteps(from, to, true)) };
};

export default gen;
