// The data diagrams besides the bar chart (barChart.ts): a picture graph whose one picture stands for 2, 5 or 10, a
// line graph of the temperature through a day, a pie chart of favourite fruit with its angles, and a stem-and-leaf
// plot of test marks. Each comes with the questions the books ask of it and the answers the usual slips give: the
// pictures counted as ones, the highest point given for the biggest rise, an angle taken for a number of children
// (and the other way round), a leaf without its stem, the largest mark given for the range.
import { C, FONT, r2 } from "./chart";
import { withSteps } from "./angleGuess";
import { FRUIT } from "./barChart";

type Next = () => number;
const intOf = (next: Next) => (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
function shuffled<T>(xs: T[], next: Next): T[] {
  const a = [...xs];
  const int = intOf(next);
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export type Pic = { body: string; w: number; h: number };
function text(x: number, y: number, s: string | number, size: number, color: string = C.ink, anchor = "middle", bold = false) {
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}"${bold ? ' font-weight="700"' : ""}>${s}</text>`;
}
export type Trap<Id extends string> = { id: Id; v: number; vars: Record<string, string | number> };

// ---------- picture graphs ----------

/** A picture graph: each picture stands for `key`; a row of pictures for each fruit, half a picture for half of key. */
export type PictoTask = { key: number; rows: { icon: string; v: number }[] };
export type PictoQuestion = { task: PictoTask; ask: "one" | "more"; at: number[]; v: number };

export function pictoQuestion(next: Next): PictoQuestion {
  const int = intOf(next);
  const key = [2, 5, 10][int(0, 2)];
  const icons = shuffled(FRUIT, next).slice(0, 4);
  // Halves only of an even key: half of 2 is 1, half of 10 is 5.
  const halves = key % 2 === 0 && next() < 0.5;
  let vs: number[];
  do vs = icons.map(() => (key * int(2, 16 * (halves ? 1 : 0.5))) / (halves ? 2 : 1));
  while (new Set(vs).size < vs.length || (halves && vs.every((v) => (v / key) % 1 === 0)));
  const task = { key, rows: icons.map((icon, i) => ({ icon, v: vs[i] })) };
  const ask = next() < 0.5 ? "one" : "more";
  const a = int(0, 3);
  if (ask === "one") return { task, ask, at: [a], v: vs[a] };
  const b = (a + int(1, 3)) % 4;
  const [hi, lo] = vs[a] > vs[b] ? [a, b] : [b, a];
  return { task, ask, at: [hi, lo], v: vs[hi] - vs[lo] };
}
/** The slips: the pictures counted, not multiplied by the key; the bigger number given for "how many more". */
export function pictoTraps(q: PictoQuestion): Trap<"picturesCounted" | "notDifference">[] {
  const [a, b] = q.at.map((k) => q.task.rows[k].v);
  const p = q.v / q.task.key;
  const out: Trap<"picturesCounted" | "notDifference">[] = [{ id: "picturesCounted", v: p, vars: { k: q.task.key, p, v: q.v } }];
  if (q.ask === "more") out.push({ id: "notDifference", v: a, vars: { a, b, v: q.v } });
  return out.filter((t) => t.v !== q.v);
}
const half = (v: number) => String(Math.round(v * 10) / 10);
export function pictoSteps(q: PictoQuestion): string[] {
  const { key } = q.task;
  const vs = q.at.map((k) => q.task.rows[k].v);
  const read = vs.map((v) => `${half(v / key)} \\times ${key} = ${v}`);
  return q.ask === "one" ? read : [...read, `${vs[0]} - ${vs[1]} = ${q.v}`];
}
/** One picture: a smiling face, or its left half when it stands for half of the key. */
export function face(x: number, y: number, r: number, halfOnly: boolean): string {
  const eye = (dx: number) => `<circle cx="${r2(x + dx)}" cy="${r2(y - r / 4)}" r="1.8" fill="${C.ink}"/>`;
  if (halfOnly)
    return `<path d="M ${r2(x)} ${r2(y - r)} A ${r} ${r} 0 0 0 ${r2(x)} ${r2(y + r)} Z" fill="#ffd43b" stroke="${C.ink}" stroke-width="1.4"/>${eye(-r / 3)}<path d="M ${r2(x - r / 2)} ${r2(y + r / 4)} Q ${r2(x - r / 4)} ${r2(y + r * 0.6)} ${r2(x)} ${r2(y + r * 0.6)}" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`;
  return `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r}" fill="#ffd43b" stroke="${C.ink}" stroke-width="1.4"/>${eye(-r / 3)}${eye(r / 3)}<path d="M ${r2(x - r / 2)} ${r2(y + r / 4)} Q ${r2(x)} ${r2(y + r * 0.7)} ${r2(x + r / 2)} ${r2(y + r / 4)}" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`;
}
export function pictoSvg(t: PictoTask, marked: number[] = []): Pic {
  const [left, row, r, gap] = [56, 40, 14, 34];
  const most = Math.max(...t.rows.map((x) => Math.ceil(x.v / t.key)));
  const w = left + Math.max(most, 6) * gap + 16;
  const out: string[] = [`<g ${FONT}>`];
  t.rows.forEach((x, i) => {
    const y = 18 + i * row + row / 2;
    if (marked.includes(i)) out.push(`<rect x="4" y="${r2(y - row / 2 + 2)}" width="${r2(w - 8)}" height="${row - 4}" rx="6" fill="#fff3bf"/>`);
    out.push(text(26, y + 9, x.icon, 24));
    const whole = Math.floor(x.v / t.key);
    for (let k = 0; k < Math.ceil(x.v / t.key); k++) out.push(face(left + gap / 2 + k * gap, y, r, k >= whole));
  });
  const foot = 18 + t.rows.length * row;
  out.push(`<line x1="${left - 6}" y1="12" x2="${left - 6}" y2="${foot}" stroke="${C.ink}" stroke-width="1.6"/>`);
  // The key under the rows.
  out.push(face(left + 20, foot + 28, r, false), text(left + 44, foot + 33, `= ${t.key}`, 16, C.ink, "start", true), "</g>");
  return { body: out.join(""), w, h: foot + 50 };
}

// ---------- line graphs ----------

/** The temperature each hour from `from` o'clock, against a scale `step` a line, `lines` lines high. */
export type LineTask = { from: number; step: number; lines: number; vs: number[] };
export type LineAsk = "read" | "half" | "rise";
/** A question about the line: the hour read (half past for "half"), or the two hours of the biggest rise. */
export type LineQuestion = { task: LineTask; ask: LineAsk; at: number; v: number };
export const hourText = (h: number, half = false) => `${h}:${half ? "30" : "00"}`;

export function lineQuestion(next: Next): LineQuestion {
  const int = intOf(next);
  const [step, lines, grain] = next() < 0.5 ? [2, 10, 1] : [5, 8, 5];
  const top = step * lines;
  const from = int(7, 10);
  const ask: LineAsk = (["read", "half", "rise"] as const)[int(0, 2)];
  for (;;) {
    const vs: number[] = [grain * int(Math.ceil(top / 5 / grain), Math.floor(top / 2 / grain))];
    // A day's warming and cooling: at most 3 degrees an hour on a scale in twos, 5 or 10 on one in fives.
    for (let i = 1; i < 7; i++) vs.push(vs[i - 1] + (grain === 1 ? int(-2, 3) : grain * int(-1, 2)));
    if (vs.some((v) => v < 0 || v > top)) continue;
    const rises = vs.slice(1).map((v, i) => v - vs[i]);
    const best = Math.max(...rises);
    // One biggest rise, and never the highest temperature itself (the slip would give the right answer).
    if (best <= 0 || rises.filter((x) => x === best).length > 1) continue;
    const task = { from, step, lines, vs };
    if (ask === "read") {
      // Past the first point, and between two lines when the scale has them.
      const ks = vs.flatMap((v, k) => (k > 0 && (step === 5 || v % step !== 0) ? [k] : []));
      if (!ks.length) continue;
      const k = ks[int(0, ks.length - 1)];
      return { task, ask, at: k, v: vs[k] };
    }
    if (ask === "half") {
      const ks = rises.flatMap((d, k) => (d !== 0 && (vs[k] + vs[k + 1]) % 2 === 0 ? [k] : []));
      if (!ks.length) continue;
      const k = ks[int(0, ks.length - 1)];
      return { task, ask, at: k, v: (vs[k] + vs[k + 1]) / 2 };
    }
    if (Math.max(...vs) === best) continue;
    return { task, ask, at: rises.indexOf(best), v: best };
  }
}
export function lineTraps(q: LineQuestion): Trap<"countedLines" | "valueNotChange">[] {
  const { vs, step, from } = q.task;
  const out: Trap<"countedLines" | "valueNotChange">[] = [];
  if (q.ask !== "rise") out.push({ id: "countedLines", v: q.v / step, vars: { s: step, v: q.v } });
  else {
    const x = Math.max(...vs);
    out.push({ id: "valueNotChange", v: x, vars: { x, a: hourText(from + q.at), b: hourText(from + q.at + 1), v: q.v } });
  }
  return out.filter((t) => t.v !== q.v && Number.isInteger(t.v));
}
export function lineSteps(q: LineQuestion): string[] {
  const { vs } = q.task;
  if (q.ask === "read") return [`${q.v}`];
  if (q.ask === "half") return [`\\frac{${vs[q.at]} + ${vs[q.at + 1]}}{2} = ${q.v}`];
  const rises = vs.slice(1).map((v, i) => `${v} - ${vs[i]} = ${v - vs[i]}`);
  return [rises.join(",\\quad "), `${q.v}`];
}
export function lineSvg(t: LineTask, mark: { at: number; half?: boolean; pair?: boolean } | null = null): Pic {
  const [left, top, gap, col] = [46, 26, 22, 56];
  const foot = top + t.lines * gap;
  const X = (k: number) => left + 24 + k * col;
  const Y = (v: number) => foot - (v / t.step) * gap;
  const w = X(t.vs.length - 1) + 30;
  const out: string[] = [`<g ${FONT}>`];
  for (let k = 0; k <= t.lines; k++) {
    out.push(`<line x1="${left}" y1="${Y(k * t.step)}" x2="${w - 10}" y2="${Y(k * t.step)}" stroke="${k ? "#dee2e6" : C.ink}" stroke-width="${k ? 1 : 2}"/>`);
    out.push(text(left - 8, Y(k * t.step) + 4, k * t.step, 13, "#495057", "end"));
  }
  out.push(`<line x1="${left}" y1="${top - 14}" x2="${left}" y2="${foot}" stroke="${C.ink}" stroke-width="2"/>`, text(left - 8, top - 12, "°C", 13, C.grey, "end", true));
  t.vs.forEach((_, k) => {
    out.push(`<line x1="${X(k)}" y1="${top}" x2="${X(k)}" y2="${foot}" stroke="#f1f3f5"/>`);
    out.push(text(X(k), foot + 20, hourText(t.from + k), 12, "#495057"));
  });
  if (mark?.pair) {
    const [a, b] = [t.vs[mark.at], t.vs[mark.at + 1]];
    out.push(`<path d="M ${X(mark.at)} ${r2(Y(a))} L ${X(mark.at + 1)} ${r2(Y(b))}" stroke="${C.orange}" stroke-width="8" opacity="0.5" stroke-linecap="round"/>`);
    out.push(text(X(mark.at) + col / 2 - 4, Math.min(Y(a), Y(b)) - 8, `+${b - a}`, 14, C.orange, "end", true));
  }
  out.push(`<polyline points="${t.vs.map((v, k) => `${X(k)},${r2(Y(v))}`).join(" ")}" fill="none" stroke="${C.blue}" stroke-width="2.4"/>`);
  for (const [k, v] of t.vs.entries()) out.push(`<circle cx="${X(k)}" cy="${r2(Y(v))}" r="4" fill="${C.blue}"/>`);
  if (mark && !mark.pair) {
    const x = mark.half ? X(mark.at) + col / 2 : X(mark.at);
    const v = mark.half ? (t.vs[mark.at] + t.vs[mark.at + 1]) / 2 : t.vs[mark.at];
    out.push(`<path d="M ${r2(x)} ${foot} V ${r2(Y(v))} H ${left}" fill="none" stroke="${C.orange}" stroke-width="2" stroke-dasharray="5 4"/>`, `<circle cx="${r2(x)}" cy="${r2(Y(v))}" r="5" fill="${C.orange}"/>`);
  }
  out.push("</g>");
  return { body: out.join(""), w, h: foot + 30 };
}

// ---------- pie charts ----------

/** A pie chart of n children's favourite fruit: each fruit with its angle; the angle asked for is hidden. */
export type PieTask = { n: number; slices: { icon: string; deg: number }[] };
export type PieQuestion = { task: PieTask; ask: "count" | "angle"; at: number; v: number };

export function pieQuestion(next: Next): PieQuestion {
  const int = intOf(next);
  // The circle in 8 or 12 equal parts (45° or 30° each), n a whole number of children for each part.
  const parts = next() < 0.5 ? 8 : 12;
  const n = parts * int(2, parts === 8 ? 10 : 6);
  const k = int(3, 4);
  let cut: number[];
  do cut = Array.from({ length: k }, () => int(1, parts - k + 1));
  while (cut.reduce((a, b) => a + b, 0) !== parts || new Set(cut).size < k - 1);
  const icons = shuffled(FRUIT, next).slice(0, k);
  const task = { n, slices: icons.map((icon, i) => ({ icon, deg: (cut[i] * 360) / parts })) };
  const ask = next() < 0.5 ? "count" : "angle";
  const at = int(0, k - 1);
  const deg = task.slices[at].deg;
  return { task, ask, at, v: ask === "count" ? (deg * n) / 360 : deg };
}
/** The count asked of the pie, or given with it: the children who chose the fruit. */
export const pieCount = (q: PieQuestion) => (q.task.slices[q.at].deg * q.task.n) / 360;
export function pieTraps(q: PieQuestion): Trap<"angleAsCount" | "countAsAngle">[] {
  const { n } = q.task;
  const [x, c] = [q.task.slices[q.at].deg, pieCount(q)];
  const t: Trap<"angleAsCount" | "countAsAngle"> = q.ask === "count" ? { id: "angleAsCount", v: x, vars: { x, n, v: c } } : { id: "countAsAngle", v: c, vars: { k: c, n, v: x } };
  return t.v === q.v ? [] : [t];
}
export function pieSteps(q: PieQuestion): string[] {
  const { n } = q.task;
  const [x, c] = [q.task.slices[q.at].deg, pieCount(q)];
  return q.ask === "count" ? [`\\frac{${x}}{360} \\times ${n} = ${c}`] : [`\\frac{${c}}{${n}} \\times 360^\\circ = ${x}^\\circ`];
}
export const PIE = ["#a5d8ff", "#ffd8a8", "#b2f2bb", "#eebefa", "#ffec99"];
/** The pie with each slice's angle written in it (but the one hidden) and its fruit outside. */
export function pieSvg(t: PieTask, hide: number | null, marked: number | null = null): Pic {
  const R = 100;
  const [cx, cy] = [R + 46, R + 40];
  const at = (deg: number, r: number) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
  const out: string[] = [`<g ${FONT}>`];
  let from = 0;
  let ring = "";
  t.slices.forEach((s, i) => {
    const to = from + s.deg;
    const [x0, y0] = at(from, R);
    const [x1, y1] = at(to, R);
    const big = s.deg > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${r2(x0)} ${r2(y0)} A ${R} ${R} 0 ${big} 1 ${r2(x1)} ${r2(y1)} Z`;
    out.push(`<path d="${d}" fill="${PIE[i]}" stroke="${C.ink}" stroke-width="1.6"/>`);
    if (marked === i) ring = `<path d="${d}" fill="none" stroke="${C.orange}" stroke-width="3.5" stroke-linejoin="round"/>`;
    const mid = from + s.deg / 2;
    const [lx, ly] = at(mid, s.deg <= 45 ? R * 0.68 : R * 0.58);
    out.push(text(lx, ly + 5, i === hide ? "?" : `${s.deg}°`, 14, C.ink, "middle", true));
    const [ix, iy] = at(mid, R + 24);
    out.push(text(ix, iy + 9, s.icon, 24));
    from = to;
  });
  out.push(ring, "</g>");
  return { body: out.join(""), w: 2 * cx, h: 2 * cy + 6 };
}

// ---------- stem-and-leaf plots ----------

/** Test marks, in order, shown as a stem-and-leaf plot: the tens in the stem, the units as leaves. */
export type StemTask = { marks: number[] };
export type StemQuestion = { task: StemTask; ask: "median" | "range"; v: number };

export function stemQuestion(next: Next): StemQuestion {
  const int = intOf(next);
  const n = [9, 11, 13, 15][int(0, 3)];
  const lo = int(1, 4);
  const marks = Array.from({ length: n }, () => int(lo * 10, (lo + 3) * 10 + 9)).sort((a, b) => a - b);
  const ask = next() < 0.5 ? "median" : "range";
  return { task: { marks }, ask, v: ask === "median" ? marks[(n - 1) / 2] : marks[n - 1] - marks[0] };
}
export function stemTraps(q: StemQuestion): Trap<"leafOnly" | "largestAsRange">[] {
  const m = q.task.marks;
  const t: Trap<"leafOnly" | "largestAsRange"> =
    q.ask === "median" ? { id: "leafOnly", v: q.v % 10, vars: { x: q.v % 10, s: Math.floor(q.v / 10), v: q.v } } : { id: "largestAsRange", v: m[m.length - 1], vars: { x: m[m.length - 1], m: m[0], v: q.v } };
  return t.v === q.v ? [] : [t];
}
export function stemSteps(q: StemQuestion): string[] {
  const m = q.task.marks;
  if (q.ask === "range") return [`${m[m.length - 1]} - ${m[0]} = ${q.v}`];
  const k = (m.length + 1) / 2;
  return [`\\frac{${m.length} + 1}{2} = ${k}`, `${m.slice(0, k).join(",\\ ")} \\ \\Rightarrow\\ ${q.v}`];
}
/** The plot: a row for each ten from the lowest mark's to the highest's, a key beneath; `marked` mark indices ringed. */
export type StemWords = { stem: string; leaf: string; key: string };
export function stemSvg(t: StemTask, words: StemWords, marked: number[] = []): Pic {
  const tens = t.marks.map((m) => Math.floor(m / 10));
  const [first, last] = [tens[0], tens[tens.length - 1]];
  const [row, sx, lx, gap] = [30, 44, 92, 26];
  const most = Math.max(...Array.from({ length: last - first + 1 }, (_, i) => tens.filter((x) => x === first + i).length));
  const w = Math.max(lx + most * gap + 16, 240);
  const out: string[] = [`<g ${FONT}>`, text(sx + 28, 20, words.stem, 13, C.grey, "end", true), text(lx, 20, words.leaf, 13, C.grey, "start", true)];
  const foot = 30 + (last - first + 1) * row;
  out.push(`<line x1="${sx + 34}" y1="6" x2="${sx + 34}" y2="${foot}" stroke="${C.ink}" stroke-width="2"/>`, `<line x1="12" y1="28" x2="${w - 8}" y2="28" stroke="${C.ink}" stroke-width="1.2"/>`);
  for (let s = first; s <= last; s++) {
    const y = 30 + (s - first) * row + 21;
    out.push(text(sx, y, s, 17, C.ink, "middle", true));
    let j = 0;
    t.marks.forEach((m, i) => {
      if (Math.floor(m / 10) !== s) return;
      const x = lx + 8 + j++ * gap;
      if (marked.includes(i)) out.push(`<circle cx="${x}" cy="${y - 6}" r="11" fill="#fff3bf" stroke="${C.orange}" stroke-width="2"/>`);
      out.push(text(x, y, m % 10, 17));
    });
  }
  const m0 = t.marks[0];
  out.push(text(12, foot + 26, words.key.replace("{s}", String(Math.floor(m0 / 10))).replace("{l}", String(m0 % 10)).replace("{v}", String(m0)), 13, C.grey, "start"), "</g>");
  return { body: out.join(""), w, h: foot + 36 };
}

// ---------- the question's picture and the worked solution ----------

export type DiagramSolution = { kind: "picto"; q: PictoQuestion } | { kind: "line"; q: LineQuestion } | { kind: "pie"; q: PieQuestion } | { kind: "stem"; q: StemQuestion; words: StemWords };
/** The diagram as the question shows it, or (worked) with what was read marked and the hidden angle shown. */
export function diagramPic(s: DiagramSolution, worked = false): Pic {
  if (s.kind === "picto") return pictoSvg(s.q.task, worked ? s.q.at : []);
  if (s.kind === "line") return lineSvg(s.q.task, worked ? { at: s.q.at, half: s.q.ask === "half", pair: s.q.ask === "rise" } : null);
  if (s.kind === "pie") return pieSvg(s.q.task, worked || s.q.ask === "count" ? null : s.q.at, worked ? s.q.at : null);
  const n = s.q.task.marks.length;
  return stemSvg(s.q.task, s.words, !worked ? [] : s.q.ask === "median" ? [(n - 1) / 2] : [0, n - 1]);
}
export function renderDiagram(spec: DiagramSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(diagramPic(spec, true), steps);
}
