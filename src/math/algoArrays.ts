// Array-shaped pictures for the Algorithms tool: sorting traces, binary/linear search, stacks,
// queues and hash tables, dynamic-programming tables with traceback, and complexity (master
// theorem recursion tree, growth-rate chart and running-time table). Also the shared cell,
// table and legend helpers that the graph and tree pictures use.
import type { AlgoWords, DpSpec, DsSpec, GrowthSpec, SearchSpec, SortSpec } from "./algo";
import { axes, C, compose, curve, esc, fill, FONT, lbl, makeFrame, nf, nt, r2, texAt, tn, W, wrap, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

// ---------- parsing ----------

const minus = (s: string) => s.replace(/[−–]/g, "-");

export function parseNums(s: string, w: AlgoWords, max: number, integer = false): number[] {
  const parts = minus(s).split(/[,;\s]+/).filter(Boolean);
  if (!parts.length) throw new Error(fill(w.badList, { s }));
  const vals = parts.map((p) => {
    const v = Number(p);
    if (p === "" || !Number.isFinite(v) || (integer && !Number.isInteger(v))) throw new Error(fill(w.badNumber, { s: p }));
    return v;
  });
  if (vals.length > max) throw new Error(fill(w.tooMany, { n: max }));
  return vals;
}

export function parseNum(s: string, w: AlgoWords, check: (v: number) => boolean = () => true): number {
  const v = Number(minus(s.trim()));
  if (s.trim() === "" || !Number.isFinite(v) || !check(v)) throw new Error(fill(w.badNumber, { s }));
  return v;
}

// ---------- drawing ----------

export type Role = "plain" | "compare" | "sorted" | "pivot" | "key" | "min" | "idle";
export const ROLES: Record<Role, { fill: string; stroke: string; text: string }> = {
  plain: { fill: "#ffffff", stroke: "#868e96", text: C.ink },
  compare: { fill: "#ffe8cc", stroke: C.orange, text: C.ink },
  sorted: { fill: "#d3f9d8", stroke: C.green, text: C.ink },
  pivot: { fill: "#f3d9fa", stroke: C.purple, text: C.ink },
  key: { fill: "#d0ebff", stroke: C.blue, text: C.ink },
  min: { fill: "#ffe3e3", stroke: C.red, text: C.ink },
  idle: { fill: "#f8f9fa", stroke: "#dee2e6", text: "#adb5bd" },
};

export function txt(x: number, y: number, text: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; italic?: boolean } = {}): string {
  return `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${o.size ?? 13}" fill="${o.color ?? C.ink}" text-anchor="${o.anchor ?? "start"}"${o.bold ? ` font-weight="700"` : ""}${o.italic ? ` font-style="italic"` : ""}>${esc(text)}</text>`;
}

export function cell(x: number, y: number, w: number, h: number, text: string, role: Role = "plain", size = 14, bold = false): string {
  const r = ROLES[role];
  return (
    `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="3" fill="${r.fill}" stroke="${r.stroke}" stroke-width="1.3"/>` +
    txt(x + w / 2, y + h / 2 + size * 0.36, text, { size, color: r.text, anchor: "middle", bold })
  );
}

/** Coloured swatches with their meaning, wrapped onto more lines when needed. */
export function legendRow(items: { role: Role; text: string }[], y: number, x0 = 16): { svg: string; h: number } {
  let x = x0;
  let yy = y;
  const parts: string[] = [];
  for (const it of items) {
    const width = 22 + it.text.length * 7.6 + 18;
    if (x + width > W - 8 && x > x0) (x = x0), (yy += 22);
    const r = ROLES[it.role];
    parts.push(`<rect x="${x}" y="${yy}" width="14" height="14" rx="3" fill="${r.fill}" stroke="${r.stroke}" stroke-width="1.3"/>`, txt(x + 20, yy + 11.5, it.text, { size: 12.5, color: "#495057" }));
    x += width;
  }
  return { svg: parts.join(""), h: items.length ? yy - y + 22 : 0 };
}

export type TCol = { head: string; w: number };
export type TRow = { cells: string[]; colors?: (string | undefined)[]; fills?: (string | undefined)[]; bold?: boolean[] };

/** A plain table: grey header row, one line per row. */
export function table(x: number, y: number, cols: TCol[], rows: TRow[], rowH = 23): { svg: string; h: number; w: number } {
  const parts: string[] = [];
  const width = cols.reduce((s, c) => s + c.w, 0);
  parts.push(`<rect x="${x}" y="${y}" width="${width}" height="24" fill="#f1f3f5"/>`);
  let cx = x;
  for (const c of cols) {
    parts.push(txt(cx + c.w / 2, y + 16.5, c.head, { size: 12, anchor: "middle", bold: true, color: "#495057" }));
    cx += c.w;
  }
  rows.forEach((row, i) => {
    const ry = y + 24 + i * rowH;
    cx = x;
    row.cells.forEach((text, j) => {
      const c = cols[j];
      const f = row.fills?.[j];
      if (f) parts.push(`<rect x="${r2(cx + 1)}" y="${r2(ry + 1)}" width="${r2(c.w - 2)}" height="${rowH - 2}" rx="3" fill="${f}"/>`);
      parts.push(txt(cx + c.w / 2, ry + rowH / 2 + 4.5, text, { size: 12.5, anchor: "middle", color: row.colors?.[j] ?? C.ink, bold: row.bold?.[j] }));
      cx += c.w;
    });
    parts.push(`<line x1="${x}" y1="${ry + rowH}" x2="${x + width}" y2="${ry + rowH}" stroke="#e9ecef"/>`);
  });
  const h = 24 + rows.length * rowH;
  parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${h}" fill="none" stroke="#dee2e6"/>`);
  return { svg: parts.join(""), h, w: width };
}

// ---------- array rows (sorting, searching) ----------

/**
 * One array state. moves: [from, to] pairs — a value at index `from` in the previous row is at `to` here
 * (drawn as arrows between the rows). range: the part of the array being worked on (a bracket under it).
 */
export type Row = {
  vals: (number | string)[];
  roles: Role[];
  note: string;
  gaps?: Set<number>;
  marks?: string[];
  noteColor?: string;
  moves?: [number, number][];
  range?: [number, number];
};
const show = (v: number | string) => (typeof v === "number" ? nt(v) : v);

/** Where values went from one row to the next, given which original item sits at each index. */
export function movesBetween(before: number[], after: number[]): [number, number][] {
  const at = new Map(before.map((id, i) => [id, i]));
  return after.flatMap((id, j): [number, number][] => (at.get(id) !== j && at.has(id) ? [[at.get(id)!, j]] : []));
}

/** One array state per row, index numbers on top and a short note on the right; optionally as bars. */
export function drawRows(rows: Row[], n: number, y0 = 0, maxW = 380, bars = false): { svg: string; h: number } {
  const cw = Math.min(44, Math.floor(maxW / n));
  const gap = 7;
  const size = Math.min(14, 7 + cw * 0.18);
  const maxGaps = Math.max(0, ...rows.map((r) => r.gaps?.size ?? 0));
  const noteX = 16 + n * cw + maxGaps * gap + 14;
  const noteChars = Math.max(16, Math.floor((W - noteX - 8) / 6.6));
  const parts: string[] = [];
  const xOf = (row: Row, i: number) => {
    let g = 0;
    if (row.gaps) for (const k of row.gaps) if (k < i) g++;
    return 16 + i * cw + g * gap;
  };
  // Bars share one scale: the smallest value (or 0) at the bottom.
  const nums = rows.flatMap((r) => r.vals.filter((v): v is number => typeof v === "number"));
  const lo = Math.min(0, ...nums);
  const hi = Math.max(lo + 1e-9, ...nums);
  const cellH = bars ? 60 : 28;
  const lane = rows.some((r) => r.moves?.length) ? 16 : 0;
  const drawCell = (x: number, y: number, v: number | string, role: Role) => {
    if (!bars || typeof v !== "number") return cell(x, y, cw - 3, cellH, show(v), role, size);
    const r = ROLES[role];
    const bh = 4 + ((v - lo) / (hi - lo)) * (cellH - 20);
    return (
      `<rect x="${r2(x)}" y="${r2(y + cellH - 15 - bh)}" width="${r2(cw - 3)}" height="${r2(bh)}" rx="2" fill="${r.fill}" stroke="${r.stroke}" stroke-width="1.3"/>` +
      txt(x + (cw - 3) / 2, y + cellH - 3, show(v), { size: Math.min(11, size), color: role === "idle" ? "#adb5bd" : C.ink, anchor: "middle" })
    );
  };
  for (let i = 0; i < n; i++) parts.push(txt(xOf(rows[0], i) + cw / 2 - 1, y0 + 10, String(i), { size: 10, color: C.grey, anchor: "middle" }));
  let y = y0 + 16;
  let prev: { row: Row; bottom: number } | null = null;
  for (const row of rows) {
    if (prev && row.moves?.length) {
      // Arrows from where each moved value was to where it is now.
      const y1 = prev.bottom + 1;
      const y2 = y - 1;
      for (const [from, to] of row.moves) {
        const x1 = xOf(prev.row, from) + cw / 2 - 1;
        const x2 = xOf(row, to) + cw / 2 - 1;
        parts.push(
          `<path d="M${r2(x1)},${r2(y1)} C${r2(x1)},${r2((y1 + y2) / 2)} ${r2(x2)},${r2((y1 + y2) / 2)} ${r2(x2)},${r2(y2 - 3)}" fill="none" stroke="${C.orange}" stroke-width="1.3" opacity="0.85"/>` +
            `<path d="M${r2(x2)},${r2(y2)} l-3,-5 h6 z" fill="${C.orange}"/>`,
        );
      }
    }
    for (let i = 0; i < n; i++) parts.push(drawCell(xOf(row, i) + 1, y, row.vals[i], row.roles[i]));
    if (row.range) {
      const [a, b] = row.range;
      const xa = xOf(row, a) + 2;
      const xb = xOf(row, b) + cw - 4;
      const yb = y + cellH + 3;
      parts.push(`<path d="M${r2(xa)},${r2(yb - 2)} V${r2(yb)} H${r2(xb)} V${r2(yb - 2)}" fill="none" stroke="${C.purple}" stroke-width="1.5"/>`);
    }
    const noteLines = wrap(row.note, noteChars);
    noteLines.forEach((l, k) => parts.push(txt(noteX, y + cellH / 2 + 4 + (k - (noteLines.length - 1) / 2) * 15, l, { size: 12.5, color: row.noteColor ?? "#495057" })));
    let h = Math.max(cellH + 8, noteLines.length * 15 + 8);
    if (row.marks) {
      row.marks.forEach((m, i) => m && parts.push(txt(xOf(row, i) + cw / 2 - 1, y + cellH + 14, m, { size: 10.5, color: C.blue, anchor: "middle", bold: true })));
      h += 14;
    }
    prev = { row, bottom: y + cellH + (row.range ? 4 : 0) };
    y += h + lane;
  }
  return { svg: parts.join(""), h: y - lane - y0 };
}

const arrTex = (a: number[]) => `\\left[\\,${a.map(tn).join(",\\ ")}\\,\\right]`;

// ---------- sorting ----------

export function renderSort(spec: SortSpec, w: AlgoWords): RenderedSvg {
  const a0 = parseNums(spec.data, w, 16);
  if (a0.length < 2) throw new Error(fill(w.badList, { s: spec.data }));
  const n = a0.length;
  const m = w.sortMore;
  if (spec.algo === "counting") return renderCounting(spec, a0, w);
  const a = a0.slice();
  // ids[i]: which input item is at index i now — rows compare it with the previous row to draw the moves.
  const ids = a0.map((_, i) => i);
  let shown = ids.slice();
  const rows: Row[] = [{ vals: a0.slice(), roles: Array(n).fill("plain"), note: w.start }];
  const push = (row: Row) => {
    rows.push({ ...row, moves: movesBetween(shown, ids) });
    shown = ids.slice();
  };
  let c = 0;
  let s = 0;
  let stat: keyof AlgoWords["stats"] = "swaps";
  const swap = (i: number, j: number) => {
    [a[i], a[j]] = [a[j], a[i]];
    [ids[i], ids[j]] = [ids[j], ids[i]];
  };
  const roles = (f: (i: number) => Role) => Array.from({ length: n }, (_, i) => f(i));
  let legendItems: { role: Role; text: string }[] = [{ role: "sorted", text: w.legend.sorted }];

  if (spec.algo === "bubble") {
    for (let k = 1; k < n; k++) {
      let swapped = 0;
      for (let j = 0; j < n - k; j++) {
        c++;
        if (a[j] > a[j + 1]) swap(j, j + 1), s++, swapped++;
      }
      const done = swapped === 0 || k === n - 1;
      push({ vals: a.slice(), roles: roles((i) => (done || i >= n - k ? "sorted" : "plain")), note: swapped === 0 ? fill(w.noSwaps, { k }) : fill(w.pass, { k, s: swapped }) });
      if (swapped === 0) break;
    }
  } else if (spec.algo === "insertion" || spec.algo === "shell") {
    stat = "shifts";
    // Shell sort is insertion sort on every gap-th element, with the gap halving down to 1.
    const gaps: number[] = [];
    if (spec.algo === "shell") for (let g = n >> 1; g >= 1; g >>= 1) gaps.push(g);
    else gaps.push(1);
    for (const g of gaps) {
      let passShifts = 0;
      for (let i = g; i < n; i++) {
        const key = a[i];
        const id = ids[i];
        let j = i - g;
        let shifts = 0;
        while (j >= 0) {
          c++;
          if (a[j] > key) (a[j + g] = a[j]), (ids[j + g] = ids[j]), (j -= g), shifts++;
          else break;
        }
        a[j + g] = key;
        ids[j + g] = id;
        s += shifts;
        passShifts += shifts;
        if (spec.algo === "insertion")
          push({ vals: a.slice(), roles: roles((k) => (k === j + 1 ? "key" : i === n - 1 || k <= i ? "sorted" : "plain")), note: fill(w.insert, { v: nt(key), n: shifts }) });
      }
      if (spec.algo === "shell")
        push({
          vals: a.slice(),
          // Colour one gap group (indices 0, g, 2g, …) so the "sorted every g-th element" is visible.
          roles: roles((k) => (g === 1 ? "sorted" : k % g === 0 ? "key" : "plain")),
          note: fill(m.shellGap, { g, s: passShifts }),
        });
    }
    legendItems = spec.algo === "insertion" ? [{ role: "key", text: w.legend.key }, { role: "sorted", text: w.legend.sortedPart }] : [{ role: "key", text: m.gapGroup }, ...legendItems];
  } else if (spec.algo === "selection") {
    for (let i = 0; i < n - 1; i++) {
      let mi = i;
      for (let j = i + 1; j < n; j++) {
        c++;
        if (a[j] < a[mi]) mi = j;
      }
      if (mi !== i) swap(i, mi), s++;
      push({ vals: a.slice(), roles: roles((k) => (k === i ? "min" : k < i || i === n - 2 ? "sorted" : "plain")), note: fill(w.select, { v: nt(a[i]), i }) });
    }
    legendItems = [{ role: "min", text: w.legend.min }, ...legendItems];
  } else if (spec.algo === "heap") {
    // Build a max-heap in place, then move the root to the end and sift down, n − 1 times.
    const sift = (i: number, end: number) => {
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let big = i;
        if (l < end && (c++, a[l] > a[big])) big = l;
        if (r < end && (c++, a[r] > a[big])) big = r;
        if (big === i) return;
        swap(i, big), s++;
        i = big;
      }
    };
    for (let i = (n >> 1) - 1; i >= 0; i--) sift(i, n);
    push({ vals: a.slice(), roles: roles((k) => (k === 0 ? "pivot" : "plain")), note: fill(m.heapBuild, { top: nt(a[0]) }) });
    for (let end = n - 1; end >= 1; end--) {
      const top = a[0];
      swap(0, end), s++;
      sift(0, end);
      push({ vals: a.slice(), roles: roles((k) => (k >= end || end === 1 ? "sorted" : k === 0 ? "pivot" : "plain")), note: fill(m.heapMove, { v: nt(top), i: end }) });
    }
    legendItems = [{ role: "pivot", text: m.heapRoot }, ...legendItems];
  } else if (spec.algo === "merge") {
    stat = "copies";
    legendItems = [{ role: "sorted", text: w.legend.run }];
    type Seg = { lo: number; hi: number; d: number };
    const segs: Seg[] = [];
    const build = (lo: number, hi: number, d: number) => {
      segs.push({ lo, hi, d });
      if (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        build(lo, mid, d + 1);
        build(mid, hi, d + 1);
      }
    };
    build(0, n, 0);
    const D = Math.max(...segs.map((g) => g.d));
    const parts = (d: number) => segs.filter((g) => g.d === d || (g.d < d && g.hi - g.lo === 1));
    const gapsOf = (d: number) => new Set(parts(d).filter((g) => g.hi < n).map((g) => g.hi - 1));
    for (let d = 1; d <= D; d++) push({ vals: a0.slice(), roles: Array(n).fill("plain"), gaps: gapsOf(d), note: fill(w.split, { k: parts(d).length }) });
    for (let d = D - 1; d >= 0; d--) {
      const merged = segs.filter((g) => g.d === d && g.hi - g.lo > 1);
      for (const g of merged) {
        const mid = (g.lo + g.hi) >> 1;
        const out: number[] = [];
        const outIds: number[] = [];
        let i = g.lo;
        let j = mid;
        const take = (k: number) => (out.push(a[k]), outIds.push(ids[k]));
        while (i < mid && j < g.hi) {
          c++;
          if (a[i] <= a[j]) take(i++);
          else take(j++);
        }
        while (i < mid) take(i++);
        while (j < g.hi) take(j++);
        out.forEach((v, k) => ((a[g.lo + k] = v), (ids[g.lo + k] = outIds[k])));
        s += out.length;
      }
      push({ vals: a.slice(), roles: roles((k) => (merged.some((g) => k >= g.lo && k < g.hi) ? "sorted" : "plain")), gaps: gapsOf(d), note: fill(w.merge, { k: parts(d).length }) });
    }
  } else {
    const final = new Set<number>();
    const qs = (lo: number, hi: number) => {
      if (lo > hi) return;
      if (lo === hi) return void final.add(lo);
      const p = a[hi];
      let i = lo;
      for (let j = lo; j < hi; j++) {
        c++;
        if (a[j] < p) {
          if (i !== j) swap(i, j), s++;
          i++;
        }
      }
      if (i !== hi) swap(i, hi), s++;
      final.add(i);
      push({
        vals: a.slice(),
        roles: roles((k) => (k === i ? "pivot" : k >= lo && k <= hi ? "plain" : final.has(k) ? "sorted" : "idle")),
        note: fill(w.pivot, { p: nt(p), i }),
        range: [lo, hi],
      });
      qs(lo, i - 1);
      qs(i + 1, hi);
    };
    qs(0, n - 1);
    push({ vals: a.slice(), roles: Array(n).fill("sorted"), note: w.done });
    legendItems = [{ role: "pivot", text: w.legend.pivot }, ...legendItems, { role: "idle", text: w.legend.idle }];
  }

  const body = drawRows(rows, n, 0, 380, spec.view === "bars");
  const leg = legendRow(legendItems, body.h + 8);
  const sorted = a0.slice().sort((x, y) => x - y);
  const caps: Caption[] = [
    { text: `${w.sortNames[spec.algo]}: ${fill(w.stats[stat], { c, s, n })}`, color: C.blue },
    { text: m.moved, color: C.orange },
    { text: w.sortInfo[spec.algo], color: "#495057" },
  ];
  return compose(`${arrTex(a0)} \\;\\longrightarrow\\; ${arrTex(sorted)}`, body.svg + leg.svg, body.h + 8 + leg.h, caps);
}

/** Counting sort: count each value, turn the counts into end positions, then place right to left (stable). */
function renderCounting(spec: SortSpec, a0: number[], w: AlgoWords): RenderedSvg {
  const m = w.sortMore;
  const n = a0.length;
  const lo = Math.min(...a0);
  const hi = Math.max(...a0);
  if (!a0.every(Number.isInteger) || hi - lo > 24) throw new Error(m.countRange);
  const K = hi - lo + 1;
  const count = Array(K).fill(0);
  for (const v of a0) count[v - lo]++;
  const ends = count.map((_, k) => count.slice(0, k + 1).reduce((x, y) => x + y, 0));
  const pos = ends.slice();
  const out: number[] = Array(n);
  const outIds: number[] = Array(n);
  for (let i = n - 1; i >= 0; i--) {
    const k = a0[i] - lo;
    pos[k]--;
    out[pos[k]] = a0[i];
    outIds[pos[k]] = i;
  }
  const rows: Row[] = [
    { vals: a0.slice(), roles: Array(n).fill("plain"), note: w.start },
    { vals: out, roles: Array(n).fill("sorted"), note: m.countPlace, moves: movesBetween(a0.map((_, i) => i), outIds).concat(outIds.flatMap((id, j): [number, number][] => (id === j ? [[j, j]] : []))) },
  ];
  const body = drawRows(rows, n, 0, 380, spec.view === "bars");
  // The count table under the rows: one column per value from min to max.
  const colW = Math.max(22, Math.min(40, Math.floor((W - 32 - 80) / K)));
  const tb = table(16, body.h + 12, [{ head: "", w: 80 }, ...Array.from({ length: K }, (_, k) => ({ head: nt(lo + k), w: colW }))], [
    { cells: [m.countRow, ...count.map((x) => String(x))], colors: [C.grey, ...count.map((x) => (x ? C.ink : "#ced4da"))] },
    { cells: [m.countEnds, ...ends.map((x) => String(x))], colors: [C.grey, ...count.map((x) => (x ? C.blue : "#ced4da"))], bold: [false, ...count.map((x) => x > 0)] },
  ]);
  const caps: Caption[] = [
    { text: `${w.sortNames.counting}: ${fill(m.countStats, { n, k: K })}`, color: C.blue },
    { text: w.sortInfo.counting, color: "#495057" },
  ];
  const sorted = a0.slice().sort((x, y) => x - y);
  return compose(`${arrTex(a0)} \\;\\longrightarrow\\; ${arrTex(sorted)}`, body.svg + tb.svg, body.h + 12 + tb.h, caps);
}

// ---------- searching ----------

/** Two pointers on a sorted array (a pair with sum t), or a sliding window (the best sum of k neighbours). */
function renderScan(spec: SearchSpec, w: AlgoWords): RenderedSvg {
  const m = w.searchMore;
  const input = parseNums(spec.data, w, 16);
  const n = input.length;
  const rows: Row[] = [];
  const caps: Caption[] = [];
  let tex: string;
  if (spec.algo === "twoptr") {
    const t = parseNum(spec.target, w);
    const a = input.slice().sort((x, y) => x - y);
    if (!a.every((v, i) => v === input[i])) caps.push({ text: w.sortedFirst, color: C.orange });
    let [l, r] = [0, n - 1];
    let k = 0;
    let hit = false;
    while (l < r) {
      k++;
      const sum = a[l] + a[r];
      const marks = Array(n).fill("");
      marks[l] = "L";
      marks[r] = "R";
      hit = sum === t;
      const roles = Array.from({ length: n }, (_, i): Role => (i === l || i === r ? (hit ? "sorted" : "compare") : i < l || i > r ? "idle" : "plain"));
      const head = `${nt(a[l])} + ${nt(a[r])} = ${nt(sum)}`;
      if (hit) {
        rows.push({ vals: a, roles, marks, note: `${head}  ✓`, noteColor: C.green });
        caps.push({ text: fill(m.pairFound, { x: nt(a[l]), y: nt(a[r]), t: nt(t), i: l, j: r, k }), color: C.green });
        break;
      }
      rows.push({ vals: a, roles, marks, note: sum < t ? `${head} < ${nt(t)}  →  L + 1` : `${head} > ${nt(t)}  →  R − 1` });
      if (sum < t) l++;
      else r--;
    }
    if (!hit) caps.push({ text: fill(m.pairNone, { t: nt(t), k }), color: C.red });
    caps.push({ text: fill(m.twoptrInfo, { n, pairs: (n * (n - 1)) / 2 }), color: "#495057" });
    tex = `a_L + a_R \\overset{?}{=} ${tn(t)}`;
  } else {
    const k = parseNum(spec.target, w, (v) => Number.isInteger(v) && v >= 1 && v <= n);
    let sum = input.slice(0, k).reduce((x, y) => x + y, 0);
    let best = { i: 0, s: sum };
    let adds = k - 1;
    for (let i = 0; i + k <= n; i++) {
      if (i > 0) {
        const s0 = sum;
        sum += input[i + k - 1] - input[i - 1];
        adds += 2;
        if (sum > best.s) best = { i, s: sum };
        rows.push({
          vals: input,
          roles: Array.from({ length: n }, (_, j): Role => (j >= i && j < i + k ? (j === i + k - 1 ? "compare" : "key") : j === i - 1 ? "idle" : "plain")),
          note: `${nt(s0)} − ${nt(input[i - 1])} + ${nt(input[i + k - 1])} = ${nt(sum)}${best.i === i ? `  ★ ${m.best}` : ""}`,
          noteColor: best.i === i ? C.green : undefined,
        });
      } else rows.push({ vals: input, roles: Array.from({ length: n }, (_, j): Role => (j < k ? "key" : "plain")), note: `${fill(m.windowSum, { s: nt(sum) })}  ★`, noteColor: C.green });
    }
    rows.push({ vals: input, roles: Array.from({ length: n }, (_, j): Role => (j >= best.i && j < best.i + k ? "sorted" : "idle")), note: `max = ${nt(best.s)}`, noteColor: C.green });
    caps.push({ text: fill(m.windowBest, { i: best.i, j: best.i + k - 1, s: nt(best.s) }), color: C.green });
    caps.push({ text: fill(m.windowInfo, { adds, naive: (n - k + 1) * (k - 1) }), color: "#495057" });
    tex = `k = ${k},\\qquad S_{i+1} = S_i - a_i + a_{i+k}`;
  }
  const body = drawRows(rows, n);
  const leg = legendRow(
    spec.algo === "twoptr"
      ? [{ role: "compare", text: w.legend.compared }, { role: "sorted", text: w.legend.found }, { role: "idle", text: w.legend.ruledOut }]
      : [{ role: "key", text: m.window }, { role: "compare", text: m.entering }, { role: "idle", text: m.leaving }],
    body.h + 8,
  );
  return compose(tex, body.svg + leg.svg, body.h + 8 + leg.h, caps);
}

export function renderSearch(spec: SearchSpec, w: AlgoWords): RenderedSvg {
  if (spec.algo === "twoptr" || spec.algo === "window") return renderScan(spec, w);
  const input = parseNums(spec.data, w, 16);
  const t = parseNum(spec.target, w);
  const binary = spec.algo === "binary";
  const a = binary ? input.slice().sort((x, y) => x - y) : input;
  const wasSorted = a.every((v, i) => v === input[i]);
  const n = a.length;
  const rows: Row[] = [];
  let k = 0;
  let at = -1;
  const T = nt(t);
  if (binary) {
    let lo = 0;
    let hi = n - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      k++;
      const marks = Array(n).fill("");
      const add = (i: number, m: string) => (marks[i] = marks[i] ? `${marks[i]}/${m}` : m);
      add(lo, "lo");
      add(mid, "mid");
      add(hi, "hi");
      const hit = a[mid] === t;
      const roles = Array.from({ length: n }, (_, i): Role => (i === mid ? (hit ? "sorted" : "compare") : i < lo || i > hi ? "idle" : "plain"));
      const head = `a[${mid}] = ${nt(a[mid])}`;
      if (hit) {
        rows.push({ vals: a, roles, marks, note: `${head} = ${T}  ✓`, noteColor: C.green });
        at = mid;
        break;
      }
      if (a[mid] < t) {
        rows.push({ vals: a, roles, marks, note: `${head} < ${T}  →  lo = ${mid + 1}` });
        lo = mid + 1;
      } else {
        rows.push({ vals: a, roles, marks, note: `${head} > ${T}  →  hi = ${mid - 1}` });
        hi = mid - 1;
      }
    }
    if (at < 0) rows.push({ vals: a, roles: Array(n).fill("idle"), note: `lo = ${lo} > hi = ${hi}  ✗`, noteColor: C.red });
  } else {
    for (let i = 0; i < n; i++) {
      k++;
      const hit = a[i] === t;
      rows.push({
        vals: a,
        roles: Array.from({ length: n }, (_, j): Role => (j === i ? (hit ? "sorted" : "compare") : j < i ? "idle" : "plain")),
        note: `a[${i}] = ${nt(a[i])} ${hit ? "=" : "≠"} ${T}${hit ? "  ✓" : ""}`,
        noteColor: hit ? C.green : undefined,
      });
      if (hit) {
        at = i;
        break;
      }
    }
  }
  const body = drawRows(rows, n);
  const leg = legendRow(
    [
      { role: "compare", text: w.legend.compared },
      { role: "sorted", text: w.legend.found },
      { role: "idle", text: w.legend.ruledOut },
    ],
    body.h + 8,
  );
  const caps: Caption[] = [];
  if (binary && !wasSorted) caps.push({ text: w.sortedFirst, color: C.orange });
  caps.push(at >= 0 ? { text: fill(w.found, { t: T, i: at, k }), color: C.green } : { text: fill(w.notFound, { t: T, k }), color: C.red });
  caps.push({ text: binary ? fill(w.binaryInfo, { b: Math.floor(Math.log2(n)) + 1, n }) : w.linearInfo, color: "#495057" });
  const tex = binary ? `\\mathit{mid} = \\left\\lfloor \\frac{\\mathit{lo} + \\mathit{hi}}{2} \\right\\rfloor, \\qquad t = ${tn(t)}` : `t = ${tn(t)}`;
  return compose(tex, body.svg + leg.svg, body.h + 8 + leg.h, caps);
}

// ---------- stacks, queues, hash tables ----------

type Op = { op: "push" | "pop" | "peek"; v?: string };

function parseOps(s: string, w: AlgoWords): Op[] {
  const toks = s.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
  if (!toks.length) throw new Error(fill(w.badOp, { s }));
  if (toks.length > 20) throw new Error(fill(w.tooMany, { n: 20 }));
  return toks.map((tok): Op => {
    const t = tok.toLowerCase().replace(/\s+/g, " ");
    let m = t.match(/^(?:push|enqueue|enq|add|insert|put)\s*\(?\s*([^\s()]{1,6})\s*\)?$/);
    if (m) return { op: "push", v: m[1] };
    if (/^[+]?-?\d+(\.\d+)?$/.test(t)) return { op: "push", v: t.replace(/^\+/, "") };
    if (/^(pop|dequeue|deq|remove|get|-)(\(\))?$/.test(t)) return { op: "pop" };
    m = t.match(/^(peek|top|front)(\(\))?$/);
    if (m) return { op: "peek" };
    throw new Error(fill(w.badOp, { s: tok }));
  });
}

export function renderDs(spec: DsSpec, w: AlgoWords): RenderedSvg {
  if (spec.kind === "stack" || spec.kind === "queue") return renderLinear(spec, w);
  return renderHash(spec, w);
}

function renderLinear(spec: DsSpec, w: AlgoWords): RenderedSvg {
  const ops = parseOps(spec.ops, w);
  const stack = spec.kind === "stack";
  const items: string[] = [];
  const outs: string[] = [];
  const steps: { label: string; items: string[]; out: string; bad?: boolean }[] = [];
  for (const o of ops) {
    const name = stack ? { push: "push", pop: "pop", peek: "peek" }[o.op] : { push: "enqueue", pop: "dequeue", peek: "peek" }[o.op];
    const label = `${name}(${o.v ?? ""})`;
    if (o.op === "push") {
      items.push(o.v!);
      steps.push({ label, items: items.slice(), out: "" });
      continue;
    }
    if (!items.length) {
      steps.push({ label, items: [], out: w.empty, bad: true });
      continue;
    }
    const v = stack ? items[items.length - 1] : items[0];
    if (o.op === "pop") {
      if (stack) items.pop();
      else items.shift();
      outs.push(v);
    }
    steps.push({ label, items: items.slice(), out: `→ ${v}` });
  }
  const most = Math.max(1, ...steps.map((s) => s.items.length));
  const cw = Math.min(42, Math.floor(330 / most));
  const x0 = 150;
  const outX = x0 + most * cw + 24;
  const parts: string[] = [];
  steps.forEach((st, i) => {
    const y = i * 36;
    parts.push(txt(16, y + 19, st.label, { size: 13, color: C.ink, bold: true }));
    if (!st.items.length) parts.push(`<rect x="${x0}" y="${y}" width="${cw * 1.5}" height="28" rx="3" fill="none" stroke="#dee2e6" stroke-dasharray="4 3"/>`);
    st.items.forEach((v, j) => {
      const last = j === st.items.length - 1;
      const role: Role = stack ? (last ? "key" : "plain") : j === 0 ? "compare" : last ? "key" : "plain";
      parts.push(cell(x0 + j * cw + 1, y, cw - 3, 28, v, role, Math.min(14, 6 + cw * 0.2)));
    });
    if (st.out) parts.push(txt(outX, y + 19, st.out, { size: 13.5, color: st.bad ? C.red : C.green, bold: true }));
  });
  const h = steps.length * 36;
  const leg = legendRow(stack ? [{ role: "key", text: w.top }] : [{ role: "compare", text: w.front }, { role: "key", text: w.back }], h + 6);
  const caps: Caption[] = [
    { text: fill(w.outputs, { list: outs.join(", ") || "—" }), color: C.blue },
    { text: w.dsInfo[spec.kind], color: "#495057" },
  ];
  const tex = stack ? `\\mathrm{push},\\ \\mathrm{pop},\\ \\mathrm{peek}:\\ O(1)` : `\\mathrm{enqueue},\\ \\mathrm{dequeue},\\ \\mathrm{peek}:\\ O(1)`;
  return compose(tex, parts.join("") + leg.svg, h + 6 + leg.h, caps);
}

function renderHash(spec: DsSpec, w: AlgoWords): RenderedSvg {
  const keys = parseNums(spec.ops, w, 24, true);
  const m = parseNum(spec.m, w, (v) => Number.isInteger(v) && v >= 2 && v <= 23);
  const h = (k: number) => ((k % m) + m) % m;
  const alpha = `\\alpha = \\frac{n}{m} = \\frac{${keys.length}}{${m}} \\approx ${tn(keys.length / m, 2)}`;
  const tex = `h(k) = k \\bmod ${m}, \\qquad ${alpha}`;
  const parts: string[] = [];
  const caps: Caption[] = [];
  let bodyH: number;

  if (spec.kind === "chaining") {
    const chains: number[][] = Array.from({ length: m }, () => []);
    let collisions = 0;
    for (const k of keys) {
      if (chains[h(k)].length) collisions++;
      chains[h(k)].push(k);
    }
    const longest = Math.max(...chains.map((c) => c.length));
    const bw = Math.min(46, Math.floor((W - 90) / Math.max(1, longest)) - 14);
    chains.forEach((chain, i) => {
      const y = i * 32;
      parts.push(cell(16, y, 34, 26, String(i), "idle", 12));
      if (!chain.length) parts.push(txt(60, y + 17.5, "∅", { size: 13, color: C.grey }));
      chain.forEach((k, j) => {
        const x = 64 + j * (bw + 14);
        parts.push(`<line x1="${x - 13}" y1="${y + 13}" x2="${x - 3}" y2="${y + 13}" stroke="${C.grey}" stroke-width="1.4" marker-end="url(#hash-ah)"/>`);
        parts.push(cell(x, y, bw, 26, nt(k), chain.length > 1 ? "compare" : "key", 13));
      });
    });
    parts.unshift(`<defs><marker id="hash-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="${C.grey}"/></marker></defs>`);
    bodyH = m * 32;
    caps.push({ text: fill(w.chainStats, { n: keys.length, m, a: nt(keys.length / m, 2), c: collisions, l: longest }), color: C.blue });
  } else {
    const slots: (number | null)[] = Array(m).fill(null);
    const moved = new Set<number>();
    const rows: TRow[] = [];
    let total = 0;
    let collided = 0;
    let fullAt: number | null = null;
    for (const k of keys) {
      const seq: number[] = [];
      let placed = -1;
      for (let p = 0; p < m; p++) {
        const idx = (h(k) + p) % m;
        seq.push(idx);
        if (slots[idx] === null) {
          placed = idx;
          break;
        }
      }
      total += seq.length;
      if (placed < 0) {
        fullAt = k;
        break;
      }
      slots[placed] = k;
      if (seq.length > 1) collided++, moved.add(placed);
      rows.push({
        cells: [nt(k), String(h(k)), seq.join(" → "), String(placed)],
        colors: [undefined, undefined, seq.length > 1 ? C.orange : undefined, seq.length > 1 ? C.orange : C.blue],
        bold: [true, false, false, true],
      });
    }
    const tb = table(16, 0, [{ head: w.cols.key, w: 90 }, { head: "h(k)", w: 80 }, { head: w.cols.probes, w: 300 }, { head: w.cols.slot, w: 90 }], rows);
    parts.push(tb.svg);
    const cw = Math.min(48, Math.floor((W - 32) / m));
    const y = tb.h + 20;
    for (let i = 0; i < m; i++) {
      parts.push(txt(16 + i * cw + cw / 2 - 1, y + 10, String(i), { size: 10, color: C.grey, anchor: "middle" }));
      const v = slots[i];
      parts.push(cell(16 + i * cw + 1, y + 16, cw - 3, 28, v === null ? "" : nt(v), v === null ? "idle" : moved.has(i) ? "compare" : "key", Math.min(13, 6 + cw * 0.2)));
    }
    bodyH = y + 50;
    caps.push({ text: fill(w.hashStats, { n: keys.length, m, a: nt(keys.length / m, 2), c: collided, p: total, avg: nt(total / Math.max(1, rows.length + (fullAt === null ? 0 : 1)), 2) }), color: C.blue });
    if (fullAt !== null) caps.push({ text: fill(w.full, { k: nt(fullAt) }), color: C.red });
  }
  caps.push({ text: w.dsInfo[spec.kind], color: "#495057" });
  return compose(tex, parts.join(""), bodyH, caps);
}

// ---------- dynamic programming ----------

/** A DP table with row and column headings; cells coloured by role. */
function grid(x0: number, y0: number, cs: number, headW: number, rowHeads: string[], colHeads: string[], vals: string[][], roles: Role[][], arrows?: string[][]) {
  const parts: string[] = [];
  const size = Math.min(14, 6 + cs * 0.24);
  colHeads.forEach((hd, j) => parts.push(txt(x0 + headW + j * cs + cs / 2, y0 + 16, hd, { size, color: C.blue, anchor: "middle", bold: true })));
  rowHeads.forEach((hd, i) => {
    const y = y0 + 24 + i * cs;
    parts.push(txt(x0 + headW - 8, y + cs / 2 + 4.5, hd, { size: Math.min(13, size), color: C.blue, anchor: "end", bold: true }));
    vals[i].forEach((v, j) => {
      const x = x0 + headW + j * cs;
      parts.push(cell(x + 1, y + 1, cs - 2, cs - 2, v, roles[i][j], size, roles[i][j] !== "plain" && roles[i][j] !== "idle"));
      const ar = arrows?.[i]?.[j];
      if (ar) parts.push(txt(x + 4, y + 11, ar, { size: 9.5, color: C.orange, bold: true }));
    });
  });
  return { svg: parts.join(""), h: 24 + rowHeads.length * cs, w: headW + colHeads.length * cs };
}

export function renderDp(spec: DpSpec, w: AlgoWords): RenderedSvg {
  switch (spec.problem) {
    case "lcs":
    case "edit":
      return renderStrings(spec, w);
    case "knapsack":
      return renderKnapsack(spec, w);
    case "coins":
      return renderCoins(spec, w);
  }
}

function renderStrings(spec: DpSpec, w: AlgoWords): RenderedSvg {
  const X = [...spec.a.trim()];
  const Y = [...spec.b.trim()];
  if (!X.length || !Y.length) throw new Error(fill(w.badList, { s: spec.a.trim() ? spec.b : spec.a }));
  if (X.length > 12 || Y.length > 12) throw new Error(fill(w.tooLong, { n: 12 }));
  const n = X.length;
  const m = Y.length;
  const T = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  const lcs = spec.problem === "lcs";
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= m; j++) {
      if (lcs) T[i][j] = i && j ? (X[i - 1] === Y[j - 1] ? T[i - 1][j - 1] + 1 : Math.max(T[i - 1][j], T[i][j - 1])) : 0;
      else T[i][j] = !i ? j : !j ? i : Math.min(T[i - 1][j] + 1, T[i][j - 1] + 1, T[i - 1][j - 1] + (X[i - 1] === Y[j - 1] ? 0 : 1));
    }
  const roles: Role[][] = T.map((r) => r.map((): Role => "plain"));
  const arrows: string[][] = T.map((r) => r.map(() => ""));
  let i = n;
  let j = m;
  const out: string[] = [];
  const ops: string[] = [];
  roles[i][j] = "compare";
  while (i > 0 || j > 0) {
    if (lcs) {
      if (!i || !j) break;
      if (X[i - 1] === Y[j - 1]) {
        roles[i][j] = "sorted";
        arrows[i][j] = "↖";
        out.unshift(X[i - 1]);
        i--, j--;
      } else if (T[i - 1][j] >= T[i][j - 1]) (arrows[i][j] = "↑"), i--;
      else (arrows[i][j] = "←"), j--;
    } else {
      const same = i && j && X[i - 1] === Y[j - 1];
      if (i && j && T[i][j] === T[i - 1][j - 1] + (same ? 0 : 1)) {
        arrows[i][j] = "↖";
        if (same) roles[i][j] = "sorted";
        else ops.unshift(fill(w.editOps.sub, { a: X[i - 1], b: Y[j - 1] }));
        i--, j--;
      } else if (i && T[i][j] === T[i - 1][j] + 1) {
        arrows[i][j] = "↑";
        ops.unshift(fill(w.editOps.del, { a: X[i - 1] }));
        i--;
      } else {
        arrows[i][j] = "←";
        ops.unshift(fill(w.editOps.ins, { b: Y[j - 1] }));
        j--;
      }
    }
    if (roles[i][j] === "plain") roles[i][j] = "compare";
  }
  const cs = Math.min(38, Math.floor((W - 32 - 40) / (m + 1)));
  const g = grid(16 + Math.max(0, (W - 32 - 40 - cs * (m + 1)) / 2), 0, cs, 40, ["ε", ...X], ["ε", ...Y], T.map((r) => r.map(String)), roles, arrows);
  const leg = legendRow(
    [
      { role: "compare", text: w.legend.path },
      { role: "sorted", text: w.legend.match },
    ],
    g.h + 10,
  );
  const tex = lcs
    ? `L_{i,j} = \\begin{cases} L_{i-1,j-1} + 1, & x_i = y_j \\\\ \\max\\left(L_{i-1,j},\\ L_{i,j-1}\\right), & x_i \\neq y_j \\end{cases}`
    : `D_{i,j} = \\min\\left(D_{i-1,j} + 1,\\ D_{i,j-1} + 1,\\ D_{i-1,j-1} + [x_i \\neq y_j]\\right)`;
  const caps: Caption[] = [
    lcs
      ? { text: fill(w.lcsResult, { s: out.join(""), n: T[n][m] }), color: C.green }
      : { text: fill(w.editResult, { d: T[n][m], a: X.join(""), b: Y.join(""), ops: ops.join(", ") || "—" }), color: C.green },
    { text: w.dpInfo[spec.problem], color: "#495057" },
  ];
  return compose(tex, g.svg + leg.svg, g.h + 10 + leg.h, caps);
}

function renderKnapsack(spec: DpSpec, w: AlgoWords): RenderedSvg {
  const ws = parseNums(spec.a, w, 8, true);
  const vs = parseNums(spec.b, w, 8);
  if (ws.length !== vs.length) throw new Error(fill(w.badList, { s: spec.b }));
  if (ws.some((x) => x <= 0)) throw new Error(fill(w.badNumber, { s: spec.a }));
  const cap = parseNum(spec.c, w, (v) => Number.isInteger(v) && v >= 1 && v <= 24);
  const n = ws.length;
  const V = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let c = 0; c <= cap; c++) V[i][c] = Math.max(V[i - 1][c], c >= ws[i - 1] ? V[i - 1][c - ws[i - 1]] + vs[i - 1] : -Infinity);
  const roles: Role[][] = V.map((r) => r.map((): Role => "plain"));
  const take: number[] = [];
  let c = cap;
  for (let i = n; i >= 1; i--) {
    if (V[i][c] !== V[i - 1][c]) {
      roles[i][c] = "sorted";
      take.unshift(i);
      c -= ws[i - 1];
    } else roles[i][c] = "compare";
  }
  roles[0][c] = "compare";
  const headW = 70;
  const cs = Math.min(36, Math.floor((W - 32 - headW) / (cap + 1)));
  const g = grid(16, 0, cs, headW, ["∅", ...ws.map((x, i) => `(${nt(x)}, ${nt(vs[i])})`)], Array.from({ length: cap + 1 }, (_, k) => String(k)), V.map((r) => r.map((x) => nt(x))), roles);
  const leg = legendRow(
    [
      { role: "compare", text: w.legend.path },
      { role: "sorted", text: w.legend.taken },
    ],
    g.h + 10,
  );
  const tw = take.reduce((s, i) => s + ws[i - 1], 0);
  const caps: Caption[] = [
    take.length
      ? { text: fill(w.knapResult, { items: take.map((i) => `#${i}`).join(", "), w: nt(tw), c: cap, v: nt(V[n][cap]) }), color: C.green }
      : { text: w.knapNothing, color: C.red },
    { text: w.dpInfo.knapsack, color: "#495057" },
  ];
  return compose(`V_{i,c} = \\max\\left(V_{i-1,c},\\ V_{i-1,\\,c-w_i} + v_i\\right)`, g.svg + leg.svg, g.h + 10 + leg.h, caps);
}

function renderCoins(spec: DpSpec, w: AlgoWords): RenderedSvg {
  const coins = [...new Set(parseNums(spec.a, w, 8, true))].sort((x, y) => x - y);
  if (coins.some((x) => x <= 0)) throw new Error(fill(w.badNumber, { s: spec.a }));
  const A = parseNum(spec.c, w, (v) => Number.isInteger(v) && v >= 1 && v <= 40);
  const best = Array(A + 1).fill(Infinity);
  const last = Array(A + 1).fill(0);
  best[0] = 0;
  for (let x = 1; x <= A; x++)
    for (const c of coins)
      if (c <= x && best[x - c] + 1 < best[x]) (best[x] = best[x - c] + 1), (last[x] = c);
  const path = new Set<number>();
  const used: number[] = [];
  if (Number.isFinite(best[A]))
    for (let x = A; ; x -= last[x]) {
      path.add(x);
      if (x === 0) break;
      used.push(last[x]);
    }
  const headW = Math.min(150, Math.max(70, 16 + 7.5 * Math.max(w.coinsRow.length, w.lastCoin.length, w.amount.length)));
  const per = Math.min(A + 1, 14);
  const cs = Math.min(36, Math.floor((W - 32 - headW) / per));
  const parts: string[] = [];
  let y = 0;
  for (let from = 0; from <= A; from += per) {
    const xs = Array.from({ length: Math.min(per, A + 1 - from) }, (_, k) => from + k);
    const g = grid(
      16,
      y,
      cs,
      headW,
      [w.coinsRow, w.lastCoin],
      xs.map(String),
      [xs.map((x) => (Number.isFinite(best[x]) ? String(best[x]) : "∞")), xs.map((x) => (x && last[x] ? String(last[x]) : "–"))],
      [xs.map((x): Role => (path.has(x) ? (x === A ? "sorted" : "compare") : "plain")), xs.map((x): Role => (path.has(x) && x ? "compare" : "idle"))],
    );
    parts.push(txt(16 + headW - 8, y + 16, w.amount, { size: 12, color: C.grey, anchor: "end" }), g.svg);
    y += g.h + 14;
  }
  const leg = legendRow([{ role: "compare", text: w.legend.path }], y);
  parts.push(leg.svg);
  y += leg.h + 14;
  // Greedy: always take the largest coin that fits.
  const greedy: number[] = [];
  let rest = A;
  for (const c of coins.slice().reverse()) while (c <= rest) greedy.push(c), (rest -= c);
  const caps: Caption[] = [];
  if (used.length) caps.push({ text: fill(w.coinResult, { n: used.length, a: A, coins: used.slice().sort((x, y) => y - x).join(" + ") }), color: C.green });
  else caps.push({ text: fill(w.coinNone, { a: A }), color: C.red });
  if (used.length && rest === 0 && greedy.length > used.length) caps.push({ text: fill(w.greedyFails, { g: greedy.join(" + "), n: greedy.length }), color: C.orange });
  else if (used.length && rest === 0) caps.push({ text: fill(w.greedy, { g: greedy.join(" + ") }), color: "#495057" });
  else if (used.length) caps.push({ text: fill(w.greedyStuck, { g: greedy.join(" + ") || "0", r: rest }), color: C.orange });
  caps.push({ text: w.dpInfo.coins, color: "#495057" });
  return compose(`C(x) = 1 + \\min_{c \\,\\le\\, x} C(x - c), \\qquad C(0) = 0`, parts.join(""), y - 14, caps);
}

// ---------- complexity ----------

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => String(n).replace(/\d/g, (d) => SUP[Number(d)]);

export function renderGrowth(spec: GrowthSpec, w: AlgoWords): RenderedSvg {
  return spec.mode === "master" ? renderMaster(spec, w) : renderCompare(spec, w);
}

function renderMaster(spec: GrowthSpec, w: AlgoWords): RenderedSvg {
  const a = parseNum(spec.a, w, (v) => v >= 1 && v <= 64);
  const b = parseNum(spec.b, w, (v) => v > 1 && v <= 64);
  const d = parseNum(spec.d, w, (v) => v >= 0 && v <= 10);
  const crit = Math.log(a) / Math.log(b);
  const r = a / b ** d;
  const near = (x: number) => Math.abs(x - Math.round(x)) < 1e-9;
  const pw = (e: number, t = tn(e, 3)) => (Math.abs(e) < 1e-12 ? "1" : Math.abs(e - 1) < 1e-12 ? "n" : `n^{${t}}`);
  const critTex = near(crit) ? tn(Math.round(crit)) : `\\log_{${tn(b)}} ${tn(a)}`;
  const kase = Math.abs(d - crit) < 1e-9 ? "equal" : d < crit ? "smaller" : "larger";
  let result: string;
  if (kase === "equal") result = d < 1e-12 ? `\\Theta(\\log n)` : `\\Theta(${pw(d)} \\log n)`;
  else if (kase === "smaller") result = near(crit) ? `\\Theta(${pw(Math.round(crit))})` : `\\Theta(n^{${critTex}}) \\approx \\Theta(n^{${tn(crit, 3)}})`;
  else result = `\\Theta(${pw(d)})`;
  const tex = `T(n) = ${a === 1 ? "" : `${tn(a)}\\,`}T\\!\\left(\\frac{n}{${tn(b)}}\\right) + \\Theta(${pw(d)}) \\;\\Longrightarrow\\; T(n) = ${result}`;

  // Recursion tree, levels 0–3, with the work per level on the right.
  const parts: string[] = [];
  const treeW = 330;
  const levelY = (i: number) => 26 + i * 62;
  const intA = Number.isInteger(a) && a <= 6;
  let prevXs: number[] = [16 + treeW / 2];
  for (let i = 0; i <= 3; i++) {
    const count = intA ? a ** i : NaN;
    const y = levelY(i);
    const size = i === 0 ? "n" : `n/${nf(b ** i, 3)}`;
    if (intA && count <= 27) {
      const xs = Array.from({ length: count }, (_, k) => 16 + ((k + 0.5) * treeW) / count);
      if (i > 0) xs.forEach((x, k) => parts.push(`<line x1="${r2(prevXs[Math.floor(k / a)])}" y1="${levelY(i - 1) + 10}" x2="${r2(x)}" y2="${y - 10}" stroke="#adb5bd" stroke-width="1.2"/>`));
      const spacing = treeW / count;
      xs.forEach((x) =>
        parts.push(
          spacing >= 40
            ? cell(x - Math.min(40, spacing - 6) / 2, y - 11, Math.min(40, spacing - 6), 22, size, "key", 11)
            : `<circle cx="${r2(x)}" cy="${y}" r="${Math.min(6, spacing / 2 - 1)}" fill="${ROLES.key.fill}" stroke="${C.blue}"/>`,
        ),
      );
      prevXs = xs;
    } else {
      parts.push(txt(16 + treeW / 2, y + 5, i === 0 ? size : `${nf(a ** i, 3)} × ${size}`, { size: 13, anchor: "middle", color: C.blue, bold: true }));
      prevXs = [16 + treeW / 2];
    }
    const work = i === 0 ? pw(d) : `${tn(a ** i, 3)} \\cdot \\left(\\frac{n}{${tn(b ** i, 3)}}\\right)${Math.abs(d - 1) < 1e-12 ? "" : `^{${tn(d)}}`} = ${Math.abs(r ** i - 1) < 1e-12 ? "" : tn(r ** i, 3)}\\,${pw(d)}`;
    parts.push(texAt(work, 372, y, "start", 0.95).svg);
  }
  const yDots = levelY(3) + 40;
  parts.push(txt(16 + treeW / 2, yDots, "⋮", { size: 18, anchor: "middle", color: C.grey }));
  const yLeaf = yDots + 34;
  parts.push(txt(16 + treeW / 2, yLeaf + 5, w.leaves, { size: 13, anchor: "middle", color: C.purple, bold: true }));
  parts.push(texAt(`${tn(a)}^{\\log_{${tn(b)}} n} = ${near(crit) ? pw(Math.round(crit)) : `n^{${critTex}}`}`, 372, yLeaf, "start", 0.95, C.purple).svg);
  parts.push(txt(372, 8, w.levelWork, { size: 12, color: C.grey, bold: true }));
  const bodyH = yLeaf + 24;
  const caps: Caption[] = [
    { text: fill(w.master[kase], { r: nt(r, 3), c: nt(crit, 3) }), color: C.blue },
    { text: `log${sub2(b)} a = ${nt(crit, 3)},  d = ${nt(d)}`, color: "#495057" },
  ];
  return compose(tex, parts.join(""), bodyH, caps);
}

const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const sub2 = (v: number) => (Number.isInteger(v) ? String(v).replace(/\d/g, (x) => SUBS[Number(x)]) : `(${nt(v)})`);

function renderCompare(spec: GrowthSpec, w: AlgoWords): RenderedSvg {
  const N = parseNum(spec.n, w, (v) => Number.isInteger(v) && v >= 4 && v <= 100);
  const lg2 = (n: number) => Math.log2(n);
  const lgFact = (n: number) => {
    let s = 0;
    if (n <= 1000) for (let k = 2; k <= n; k++) s += Math.log10(k);
    else s = n * Math.log10(n / Math.E) + 0.5 * Math.log10(2 * Math.PI * n);
    return s;
  };
  const fns: { name: string; color: string; f: (n: number) => number; lg: (n: number) => number }[] = [
    { name: "1", color: C.grey, f: () => 1, lg: () => 0 },
    { name: "log n", color: C.green, f: (n) => lg2(n), lg: (n) => Math.log10(lg2(n)) },
    { name: "n", color: C.blue, f: (n) => n, lg: (n) => Math.log10(n) },
    { name: "n log n", color: C.purple, f: (n) => n * lg2(n), lg: (n) => Math.log10(n * lg2(n)) },
    { name: "n²", color: C.orange, f: (n) => n * n, lg: (n) => 2 * Math.log10(n) },
    { name: "2ⁿ", color: C.red, f: (n) => 2 ** n, lg: (n) => n * Math.log10(2) },
    { name: "n!", color: C.ink, f: (n) => Math.exp(lgFact(n) * Math.LN10), lg: lgFact },
  ];
  const yMax = N * N * 1.25;
  const fr = makeFrame("growth", 48, 6, W - 48 - 18, 300, [1, N], [0, yMax]);
  let body = axes(fr, { integerX: true, xAtBottom: true });
  for (const f of fns) body += curve(fr, (x) => (f.name === "n!" ? gammaFact(x) : f.f(x)), f.color, 2.4);
  const right: { py: number; f: (typeof fns)[number] }[] = [];
  for (const f of fns) {
    // Label each curve where it leaves the frame or at the right edge.
    let x = N;
    if (f.f(N) > yMax) {
      let lo = 1;
      let hi = N;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if ((f.name === "n!" ? gammaFact(mid) : f.f(mid)) > yMax) hi = mid;
        else lo = mid;
      }
      x = lo;
    }
    const y = Math.min(f.name === "n!" ? gammaFact(x) : f.f(x), yMax);
    if (x < N - 1e-6) body += lbl(fr.sx(x) + 4, fr.sy(y) + 14, f.name, f.color, "start", 13, false);
    else right.push({ py: fr.sy(y) - 5, f });
  }
  // Spread the labels at the right edge so they do not overlap.
  right.sort((p, q) => q.py - p.py);
  let prevY = Infinity;
  for (const r of right) {
    r.py = Math.min(r.py, prevY - 14);
    prevY = r.py;
    body += lbl(fr.right - 4, r.py, r.f.name, r.f.color, "end", 13, false);
  }
  // Running times at 10^8 operations per second.
  const ns = [10, 100, 1000, 1e6];
  const time = (lgOps: number) => {
    const lgS = lgOps - 8;
    if (lgS < -6) return `${nf(10 ** (lgS + 9), 2)} ns`;
    if (lgS < -3) return `${nf(10 ** (lgS + 6), 2)} µs`;
    if (lgS < 0) return `${nf(10 ** (lgS + 3), 2)} ms`;
    const s = 10 ** lgS;
    if (s < 60) return `${nf(s, 1)} ${w.units.s}`;
    if (s < 3600) return `${nf(s / 60, 1)} ${w.units.min}`;
    if (s < 86400) return `${nf(s / 3600, 1)} ${w.units.h}`;
    if (s < 3.156e7) return `${nf(s / 86400, 1)} ${w.units.d}`;
    const lgY = lgS - Math.log10(3.156e7);
    if (lgY < 6) return `${nf(10 ** lgY, 0)} ${w.units.y}`;
    return `10${sup(Math.floor(lgY))} ${w.units.y}`;
  };
  const top = fr.bottom + 46;
  const title = txt(W / 2, top - 8, w.timeAt, { size: 12.5, color: "#495057", anchor: "middle", bold: true });
  const tb = table(
    16,
    top,
    [{ head: "f(n)", w: 88 }, ...ns.map((n) => ({ head: n === 1e6 ? "n = 10⁶" : `n = ${n}`, w: 130 }))],
    fns.map((f) => ({ cells: [f.name, ...ns.map((n) => time(f.lg(n)))], colors: [f.color], bold: [true] })),
    22,
  );
  const caps: Caption[] = [{ text: w.growthHint, color: "#495057" }];
  return compose(`1 < \\log n < n < n \\log n < n^2 < 2^n < n!`, body + title + tb.svg, top + tb.h + 4, caps);
}

/** n! for real n (Stirling with a correction term; exact enough for a picture). */
function gammaFact(x: number): number {
  if (x < 1) return 1;
  if (Number.isInteger(x) && x < 20) {
    let p = 1;
    for (let k = 2; k <= x; k++) p *= k;
    return p;
  }
  return Math.sqrt(2 * Math.PI * x) * (x / Math.E) ** x * (1 + 1 / (12 * x));
}

