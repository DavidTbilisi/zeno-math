// Combinatorics: counting (permutations, combinations, with repetition, anagrams) with the
// order/repetition decision grid and full listings when small; Pascal's triangle (rows and the
// binomial theorem, the addition rule, hockey stick, parity = Sierpiński, Fibonacci diagonals);
// stars and bars; inclusion–exclusion on Venn diagrams; and special numbers (Catalan with Dyck
// paths, derangements, Stirling numbers of the second kind with Bell numbers, integer partitions
// with Ferrers diagrams). All counts are exact (BigInt) and checked against the listings.
import { cell, table, txt, type TRow } from "./algoArrays";
import { C, compose, esc, fill, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

export type CountKind = "perm" | "comb" | "permRep" | "combRep" | "word";
export type PascalMode = "row" | "entry" | "hockey" | "parity" | "diagonals";
export type InclMode = "venn" | "divisible";
export type NumberKind = "catalan" | "derange" | "stirling" | "partitions";
export const COUNT_KINDS: CountKind[] = ["perm", "comb", "permRep", "combRep", "word"];
export const PASCAL_MODES: PascalMode[] = ["row", "entry", "hockey", "parity", "diagonals"];
export const INCL_MODES: InclMode[] = ["venn", "divisible"];
export const NUMBER_KINDS: NumberKind[] = ["catalan", "derange", "stirling", "partitions"];

export type CountSpec = { topic: "count"; kind: CountKind; n: string; r: string; word: string };
export type PascalSpec = { topic: "pascal"; mode: PascalMode; rows: string; n: string; k: string };
/** k identical balls into n boxes; empty: boxes may stay empty. */
export type StarsSpec = { topic: "stars"; k: string; n: string; empty: boolean };
/** venn: sizes "|A|, |B|, |A∩B|" or 7 numbers for three sets · divisible: how many of 1…n are divisible by divs. */
export type InclSpec = { topic: "incl"; mode: InclMode; sizes: string; n: string; divs: string };
export type NumbersSpec = { topic: "numbers"; kind: NumberKind; n: string };

export type CombSpec = CountSpec | PascalSpec | StarsSpec | InclSpec | NumbersSpec;
export type CombTopic = CombSpec["topic"];
export type CombSpecOf<K extends CombTopic> = Extract<CombSpec, { topic: K }>;
export const COMB_TOPICS: CombTopic[] = ["count", "pascal", "stars", "incl", "numbers"];

export type CombWords = {
  badInt: string;
  badWord: string;
  rTooBig: string;
  order: string;
  noOrder: string;
  rep: string;
  noRep: string;
  countNames: Record<CountKind, string>;
  countInfo: Record<CountKind, string>;
  permGroups: string;
  listed: string;
  tooManyToList: string;
  pascalRow: string;
  pascalEntry: string;
  hockey: string;
  parity: string;
  diagonals: string;
  symmetric: string;
  starsEmpty: string;
  starsFull: string;
  starsInfo: string;
  starsFullInfo: string;
  starsNone: string;
  more: string;
  inclResult: string;
  inclNone: string;
  inclInfo: string;
  inclInfo2: string;
  inconsistent: string;
  badSizes: string;
  divisibleBy: string;
  catalanInfo: string;
  catalanShown: string;
  derangeInfo: string;
  derangeShown: string;
  stirlingInfo: string;
  setPartitions: string;
  partitionsInfo: string;
  partitionsShown: string;
};

export const COMB_PRESETS: { [K in CombTopic]: { label: string; spec: CombSpecOf<K> }[] } = {
  count: [
    { label: "P(5, 3)", spec: { topic: "count", kind: "perm", n: "5", r: "3", word: "MISSISSIPPI" } },
    { label: "C(5, 3)", spec: { topic: "count", kind: "comb", n: "5", r: "3", word: "MISSISSIPPI" } },
    { label: "3² (ordered, repeats)", spec: { topic: "count", kind: "permRep", n: "3", r: "2", word: "MISSISSIPPI" } },
    { label: "multisets of 3 from 3", spec: { topic: "count", kind: "combRep", n: "3", r: "3", word: "MISSISSIPPI" } },
    { label: "C(49, 6) lottery", spec: { topic: "count", kind: "comb", n: "49", r: "6", word: "MISSISSIPPI" } },
    { label: "Anagrams of BANANA", spec: { topic: "count", kind: "word", n: "5", r: "3", word: "BANANA" } },
    { label: "MISSISSIPPI", spec: { topic: "count", kind: "word", n: "5", r: "3", word: "MISSISSIPPI" } },
  ],
  pascal: [
    { label: "(a + b)⁵", spec: { topic: "pascal", mode: "row", rows: "8", n: "5", k: "2" } },
    { label: "C(6, 2) = C(5, 1) + C(5, 2)", spec: { topic: "pascal", mode: "entry", rows: "8", n: "6", k: "2" } },
    { label: "Hockey stick", spec: { topic: "pascal", mode: "hockey", rows: "9", n: "6", k: "2" } },
    { label: "Odd entries (Sierpiński)", spec: { topic: "pascal", mode: "parity", rows: "32", n: "5", k: "2" } },
    { label: "Fibonacci diagonals", spec: { topic: "pascal", mode: "diagonals", rows: "9", n: "5", k: "2" } },
  ],
  stars: [
    { label: "5 balls, 3 boxes", spec: { topic: "stars", k: "5", n: "3", empty: true } },
    { label: "5 balls, 3 boxes, none empty", spec: { topic: "stars", k: "5", n: "3", empty: false } },
    { label: "x + y + z = 10", spec: { topic: "stars", k: "10", n: "3", empty: true } },
    { label: "12 sweets, 4 children, ≥ 1 each", spec: { topic: "stars", k: "12", n: "4", empty: false } },
  ],
  incl: [
    { label: "1 … 100 ÷ 2, 3, 5", spec: { topic: "incl", mode: "divisible", sizes: "", n: "100", divs: "2, 3, 5" } },
    { label: "1 … 1000 ÷ 3, 7", spec: { topic: "incl", mode: "divisible", sizes: "", n: "1000", divs: "3, 7" } },
    { label: "Two sets: 25, 18, 7", spec: { topic: "incl", mode: "venn", sizes: "25, 18, 7", n: "100", divs: "2, 3" } },
    { label: "Three sets (languages)", spec: { topic: "incl", mode: "venn", sizes: "20, 15, 12, 6, 5, 4, 2", n: "100", divs: "2, 3" } },
  ],
  numbers: [
    { label: "Catalan C₄ = 14", spec: { topic: "numbers", kind: "catalan", n: "4" } },
    { label: "Catalan C₃ = 5", spec: { topic: "numbers", kind: "catalan", n: "3" } },
    { label: "Derangements of 4", spec: { topic: "numbers", kind: "derange", n: "4" } },
    { label: "Stirling S(n, k), n = 4", spec: { topic: "numbers", kind: "stirling", n: "4" } },
    { label: "Partitions of 7", spec: { topic: "numbers", kind: "partitions", n: "7" } },
  ],
};

// ---------- exact arithmetic ----------

function intOf(s: string, w: CombWords, lo: number, hi: number): number {
  const t = s.trim().replace(/[−–]/g, "-");
  const v = Number(t);
  if (!/^-?\d+$/.test(t) || v < lo || v > hi) throw new Error(fill(w.badInt, { s, lo, hi }));
  return v;
}

const factB = (n: number) => {
  let p = 1n;
  for (let i = 2; i <= n; i++) p *= BigInt(i);
  return p;
};
export function binom(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  k = Math.min(k, n - k);
  let r = 1n;
  for (let i = 1; i <= k; i++) r = (r * BigInt(n - k + i)) / BigInt(i);
  return r;
}
/** Big numbers in full when short, otherwise as m × 10^e (text and LaTeX). */
function big(b: bigint): { text: string; tex: string } {
  const s = b.toString();
  if (s.length <= 24) return { text: s.replace(/\B(?=(\d{3})+(?!\d))/g, " "), tex: s.replace(/\B(?=(\d{3})+(?!\d))/g, "\\,") };
  const m = `${s[0]}.${s.slice(1, 4)}`;
  return { text: `≈ ${m} × 10^${s.length - 1}`, tex: `\\approx ${m} \\cdot 10^{${s.length - 1}}` };
}
const LET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Rounded chips placed left to right, wrapping at the page width. */
function flow(items: { text: string; color?: string; fill?: string }[], y0: number, size = 13, gap = 6) {
  const parts: string[] = [];
  const cw = size * 0.62;
  let x = 16;
  let y = y0;
  const h = size + 12;
  const widths = items.map((it) => Math.max(26, it.text.length * cw + 14));
  // Centre each line.
  const lines: number[][] = [[]];
  let lx = 0;
  widths.forEach((wd, i) => {
    if (lx + wd > W - 32 && lines[lines.length - 1].length) (lines.push([]), (lx = 0));
    lines[lines.length - 1].push(i);
    lx += wd + gap;
  });
  for (const line of lines) {
    const total = line.reduce((s, i) => s + widths[i] + gap, -gap);
    x = (W - total) / 2;
    for (const i of line) {
      const it = items[i];
      parts.push(
        `<rect x="${r2(x)}" y="${y}" width="${r2(widths[i])}" height="${h}" rx="5" fill="${it.fill ?? "#f1f3f5"}" stroke="${it.color ?? "#adb5bd"}" stroke-width="1.2"/>`,
        `<text x="${r2(x + widths[i] / 2)}" y="${r2(y + h / 2 + size * 0.36)}" font-family="Consolas, Menlo, monospace" font-size="${size}" font-weight="600" fill="${it.color ?? C.ink}" text-anchor="middle">${esc(it.text)}</text>`,
      );
      x += widths[i] + gap;
    }
    y += h + gap;
  }
  return { svg: parts.join(""), h: items.length ? y - y0 - gap : 0 };
}

// ---------- counting ----------

function renderCount(spec: CountSpec, w: CombWords): RenderedSvg {
  const caps: Caption[] = [];
  const parts: string[] = [];
  let y = 0;
  if (spec.kind === "word") {
    const word = spec.word.trim().toUpperCase().replace(/\s+/g, "");
    if (!word || word.length > 16 || !/^\p{L}+$/u.test(word)) throw new Error(w.badWord);
    const counts = new Map<string, number>();
    for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const groups = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const total = factB(word.length) / groups.reduce((p, [, c]) => p * factB(c), 1n);
    const chips = flow(groups.map(([ch, c]) => ({ text: `${ch} × ${c}`, color: c > 1 ? C.orange : C.blue, fill: c > 1 ? "#ffe8cc" : "#d0ebff" })), 0, 15);
    parts.push(chips.svg);
    y = chips.h + 16;
    if (total <= 120n) {
      const out: string[] = [];
      const letters = [...word].sort();
      const used = Array(letters.length).fill(false);
      const rec = (cur: string) => {
        if (cur.length === letters.length) return void out.push(cur);
        for (let i = 0; i < letters.length; i++) {
          if (used[i] || (i > 0 && letters[i] === letters[i - 1] && !used[i - 1])) continue;
          used[i] = true;
          rec(cur + letters[i]);
          used[i] = false;
        }
      };
      rec("");
      const list = flow(out.map((t) => ({ text: t })), y, 12);
      parts.push(list.svg);
      y += list.h + 6;
      caps.push({ text: fill(w.listed, { c: out.length }), color: C.green });
    } else caps.push({ text: fill(w.tooManyToList, { c: big(total).text }), color: C.grey });
    caps.push({ text: fill(w.countInfo.word, { total: word.length }), color: "#495057" });
    const tex = `\\frac{${word.length}!}{${groups.map(([, c]) => `${c}!`).join("\\,")}} = ${big(total).tex}`;
    return compose(tex, parts.join(""), y, caps);
  }
  const n = intOf(spec.n, w, 1, spec.kind === "permRep" || spec.kind === "combRep" ? 100 : 200);
  const r = intOf(spec.r, w, 0, spec.kind === "permRep" ? 40 : spec.kind === "combRep" ? 100 : 200);
  if ((spec.kind === "perm" || spec.kind === "comb") && r > n) throw new Error(fill(w.rTooBig, { r, n }));
  // The decision grid: does order matter, is repetition allowed?
  const gx = Math.min(210, Math.max(110, 16 + 7.2 * Math.max(w.order.length, w.noOrder.length)));
  const gw = (W - 32 - gx) / 2;
  const gh = 58;
  const grid: [CountKind, string][] = [
    ["perm", "n!/(n − r)!"],
    ["permRep", "nʳ"],
    ["comb", "C(n, r)"],
    ["combRep", "C(n + r − 1, r)"],
  ];
  parts.push(txt(16 + gx + gw / 2, 14, w.noRep, { size: 12.5, anchor: "middle", bold: true, color: "#495057" }), txt(16 + gx + gw * 1.5, 14, w.rep, { size: 12.5, anchor: "middle", bold: true, color: "#495057" }));
  parts.push(txt(16 + gx - 10, 22 + gh / 2 + 4, w.order, { size: 12.5, anchor: "end", bold: true, color: "#495057" }), txt(16 + gx - 10, 22 + gh * 1.5 + 4, w.noOrder, { size: 12.5, anchor: "end", bold: true, color: "#495057" }));
  grid.forEach(([k, f], i) => {
    const x = 16 + gx + (i % 2) * gw;
    const yy = 22 + Math.floor(i / 2) * gh;
    const on = k === spec.kind;
    parts.push(cell(x + 3, yy + 3, gw - 6, gh - 6, "", on ? "sorted" : "plain"));
    parts.push(txt(x + gw / 2, yy + 23, w.countNames[k], { size: 12.5, anchor: "middle", bold: on, color: on ? C.green : "#495057" }));
    parts.push(txt(x + gw / 2, yy + 42, f, { size: 13.5, anchor: "middle", italic: true, bold: true, color: on ? C.green : C.grey }));
  });
  y = 22 + 2 * gh + 16;
  let total: bigint;
  let tex: string;
  const prodTex = (from: number, count: number) =>
    count <= 8 ? Array.from({ length: count }, (_, i) => from - i).join(" \\cdot ") : `${from} \\cdot ${from - 1} \\cdots ${from - count + 1}`;
  if (spec.kind === "perm") {
    total = factB(n) / factB(n - r);
    tex = `P(${n}, ${r}) = \\frac{${n}!}{${n - r}!}${r ? ` = ${prodTex(n, r)}` : ""} = ${big(total).tex}`;
  } else if (spec.kind === "comb") {
    total = binom(n, r);
    tex = `\\binom{${n}}{${r}} = \\frac{${n}!}{${r}!\\,${n - r}!}${r && r <= 8 ? ` = \\frac{${prodTex(n, r)}}{${prodTex(r, r)}}` : ""} = ${big(total).tex}`;
  } else if (spec.kind === "permRep") {
    total = BigInt(n) ** BigInt(r);
    tex = `${n}^{${r}} = ${big(total).tex}`;
  } else {
    total = binom(n + r - 1, r);
    tex = `\\binom{${n} + ${r} - 1}{${r}} = \\binom{${n + r - 1}}{${r}} = ${big(total).tex}`;
  }
  // List everything when small, using the letters A, B, C, … as the n items.
  if (total <= 120n && n <= 26) {
    const out: string[][] = [];
    const rec = (cur: number[], start: number) => {
      if (cur.length === r) return void out.push(cur.map((i) => LET[i]));
      for (let i = spec.kind === "comb" ? start : spec.kind === "combRep" ? start : 0; i < n; i++) {
        if ((spec.kind === "perm" || spec.kind === "comb") && cur.includes(i)) continue;
        rec([...cur, i], spec.kind === "comb" ? i + 1 : i);
      }
    };
    rec([], 0);
    if (spec.kind === "perm" && r > 1) {
      // One row per combination: its r! orderings — P = C · r!.
      const byGroup = new Map<string, string[]>();
      for (const o of out) {
        const key = [...o].sort().join("");
        byGroup.set(key, [...(byGroup.get(key) ?? []), o.join("")]);
      }
      for (const [key, list] of byGroup) {
        const row = flow(list.map((t) => ({ text: t, color: t === key ? C.green : undefined, fill: t === key ? "#d3f9d8" : undefined })), y, 12, 5);
        parts.push(row.svg);
        y += row.h + 7;
      }
      caps.push({ text: fill(w.permGroups, { c: byGroup.size, r, f: String(factB(r)) }), color: C.blue });
    } else {
      const list = flow(out.map((o) => ({ text: spec.kind === "comb" || spec.kind === "combRep" ? `{${o.join(",")}}` : o.join("") || "∅" })), y, 12);
      parts.push(list.svg);
      y += list.h + 6;
    }
    caps.push({ text: fill(w.listed, { c: out.length }), color: C.green });
  } else caps.push({ text: fill(w.tooManyToList, { c: big(total).text }), color: C.grey });
  caps.push({ text: w.countInfo[spec.kind], color: "#495057" });
  return compose(tex, parts.join(""), y, caps);
}

// ---------- Pascal's triangle ----------

function renderPascal(spec: PascalSpec, w: CombWords): RenderedSvg {
  const parity = spec.mode === "parity";
  const N = intOf(spec.rows, w, 1, parity ? 64 : 16);
  const n = intOf(spec.n, w, 0, N - 1);
  const k = intOf(spec.k, w, 0, spec.mode === "row" || parity || spec.mode === "diagonals" ? 64 : n);
  const rows = Array.from({ length: N }, (_, i) => Array.from({ length: i + 1 }, (_, j) => binom(i, j)));
  const cw = Math.min(48, (W - 32) / N);
  const ch = parity ? Math.min(28, cw * 0.87) : Math.min(34, Math.max(22, cw * 0.75));
  const showNums = !parity || cw >= 22;
  const role = (i: number, j: number): { fill: string; stroke: string; bold?: boolean } | null => {
    if (parity) return rows[i][j] % 2n === 1n ? { fill: "#d0ebff", stroke: C.blue } : null;
    if (spec.mode === "row") return i === n ? { fill: "#d3f9d8", stroke: C.green, bold: true } : null;
    if (spec.mode === "entry") {
      if (i === n && j === k) return { fill: "#d3f9d8", stroke: C.green, bold: true };
      if (i === n - 1 && (j === k - 1 || j === k)) return { fill: "#ffe8cc", stroke: C.orange, bold: true };
      return null;
    }
    if (spec.mode === "hockey") {
      if (j === k && i >= k && i <= n) return { fill: "#ffe8cc", stroke: C.orange, bold: true };
      if (i === n + 1 && j === k + 1) return { fill: "#d3f9d8", stroke: C.green, bold: true };
      return null;
    }
    // diagonals: alternate colours along the shallow diagonals i + j = d
    const d = i + j;
    return d % 2 ? { fill: "#f3d9fa", stroke: C.purple } : { fill: "#fff3bf", stroke: "#f08c00" };
  };
  const parts: string[] = [];
  for (let i = 0; i < N; i++)
    for (let j = 0; j <= i; j++) {
      const x = W / 2 + (j - i / 2) * cw - cw / 2;
      const y = i * ch;
      const rl = role(i, j);
      const text = rows[i][j].toString();
      parts.push(`<rect x="${r2(x + 1)}" y="${r2(y + 1)}" width="${r2(cw - 2)}" height="${r2(ch - 2)}" rx="${Math.min(5, cw / 5)}" fill="${rl?.fill ?? "#ffffff"}" stroke="${rl?.stroke ?? "#dee2e6"}" stroke-width="1.2"/>`);
      if (showNums) parts.push(txt(x + cw / 2, y + ch / 2 + 4.5, text, { size: Math.min(13.5, (cw - 4) / Math.max(1.6, text.length * 0.62)), anchor: "middle", bold: rl?.bold, color: C.ink }));
    }
  let bodyH = N * ch + 6;
  const caps: Caption[] = [];
  let tex: string;
  if (spec.mode === "row") {
    const terms = rows[n].map((c, j) => {
      const coef = c === 1n ? "" : c.toString();
      const a = n - j ? `a${n - j > 1 ? `^{${n - j}}` : ""}` : "";
      const b = j ? `b${j > 1 ? `^{${j}}` : ""}` : "";
      return coef + a + b || "1";
    });
    tex = `(a + b)^{${n}} = ${terms.join(" + ")}`;
    caps.push({ text: fill(w.pascalRow, { n, p: `2${String(n).replace(/d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)])}`, s: String(2n ** BigInt(n)) }), color: C.green });
    caps.push({ text: w.symmetric, color: "#495057" });
  } else if (spec.mode === "entry") {
    if (n < 1 || k < 1 || k >= n) {
      tex = `\\binom{${n}}{${k}} = 1`;
    } else tex = `\\binom{${n}}{${k}} = \\binom{${n - 1}}{${k - 1}} + \\binom{${n - 1}}{${k}} = ${binom(n - 1, k - 1)} + ${binom(n - 1, k)} = ${binom(n, k)}`;
    caps.push({ text: w.pascalEntry, color: C.blue });
  } else if (spec.mode === "hockey") {
    const kk = Math.min(k, n);
    const m = Math.min(n, N - 2);
    const terms = Array.from({ length: m - kk + 1 }, (_, i) => binom(kk + i, kk).toString());
    tex = `\\sum_{i=${kk}}^{${m}} \\binom{i}{${kk}} = ${terms.join(" + ")} = ${binom(m + 1, kk + 1)} = \\binom{${m + 1}}{${kk + 1}}`;
    caps.push({ text: w.hockey, color: C.orange });
  } else if (parity) {
    const odd = rows.reduce((s, r) => s + r.filter((c) => c % 2n === 1n).length, 0);
    tex = `\\binom{n}{k} \\bmod 2, \\quad n < ${N}: \\quad ${odd} \\,/\\, ${(N * (N + 1)) / 2}`;
    caps.push({ text: w.parity, color: C.blue });
  } else {
    const fib: string[] = [];
    for (let d = 0; d < N; d++) {
      let s = 0n;
      for (let j = 0; 2 * j <= d; j++) s += binom(d - j, j);
      fib.push(s.toString());
    }
    // Sums of the shallow diagonals at the left.
    for (let d = 0; d < N; d++) parts.push(txt(W / 2 - (d / 2) * cw - cw / 2 - 10, d * ch + ch / 2 + 4.5, fib[d], { size: 12.5, anchor: "end", bold: true, color: d % 2 ? C.purple : "#f08c00" }));
    tex = `F_{n+1} = \\sum_{j} \\binom{n - j}{j}`;
    caps.push({ text: fill(w.diagonals, { list: fib.join(", ") }), color: C.purple });
    bodyH += 0;
  }
  return compose(tex, parts.join(""), bodyH, caps);
}

// ---------- stars and bars ----------

function renderStars(spec: StarsSpec, w: CombWords): RenderedSvg {
  const k = intOf(spec.k, w, 0, 60);
  const n = intOf(spec.n, w, 1, 12);
  const caps: Caption[] = [];
  const rest = spec.empty ? k : k - n;
  const total = rest < 0 ? 0n : binom(rest + n - 1, n - 1);
  const tex = spec.empty
    ? `x_1 + \\dots + x_{${n}} = ${k},\\ x_i \\ge 0: \\quad \\binom{${k} + ${n} - 1}{${n} - 1} = \\binom{${k + n - 1}}{${n - 1}} = ${total}`
    : `x_1 + \\dots + x_{${n}} = ${k},\\ x_i \\ge 1: \\quad \\binom{${k} - 1}{${n} - 1} = \\binom{${k - 1}}{${n - 1}} = ${total}`;
  if (rest < 0) {
    caps.push({ text: w.starsNone, color: C.red });
    return compose(tex, "", 0, caps);
  }
  // The first few compositions, largest first box first.
  const shown: number[][] = [];
  const LIMIT = 10;
  const rec = (cur: number[], left: number) => {
    if (shown.length >= LIMIT) return;
    if (cur.length === n - 1) return void shown.push([...cur, left].map((x) => x + (spec.empty ? 0 : 1)));
    for (let x = left; x >= 0; x--) rec([...cur, x], left - x);
  };
  rec([], rest);
  const parts: string[] = [];
  const step = Math.min(24, (W - 190) / (k + n - 1 || 1));
  shown.forEach((tuple, row) => {
    const y = row * 38 + 18;
    parts.push(txt(16, y + 5, `(${tuple.join(", ")})`, { size: 13, color: C.blue, bold: true }));
    let x = 170;
    tuple.forEach((c, i) => {
      for (let s = 0; s < c; s++, x += step) parts.push(`<circle cx="${r2(x)}" cy="${y}" r="${Math.min(8, step / 2.4)}" fill="${C.orange}"/>`);
      if (i < tuple.length - 1) {
        parts.push(`<line x1="${r2(x)}" y1="${y - 14}" x2="${r2(x)}" y2="${y + 14}" stroke="${C.blue}" stroke-width="3" stroke-linecap="round"/>`);
        x += step;
      }
    });
  });
  let h = shown.length * 38 + 4;
  if (total > BigInt(shown.length)) {
    parts.push(txt(W / 2, h + 12, fill(w.more, { c: String(total - BigInt(shown.length)) }), { size: 13, anchor: "middle", color: C.grey, italic: true }));
    h += 22;
  }
  caps.push({ text: fill(spec.empty ? w.starsEmpty : w.starsFull, { c: String(total), k, n }), color: C.green });
  caps.push({ text: fill(w.starsInfo, { k: rest, bars: n - 1, slots: rest + n - 1 }), color: "#495057" });
  if (!spec.empty) caps.push({ text: fill(w.starsFullInfo, { rest, n }), color: "#495057" });
  return compose(tex, parts.join(""), h, caps);
}

// ---------- inclusion–exclusion ----------

const gcdN = (a: number, b: number): number => (b ? gcdN(b, a % b) : a);
const lcmN = (a: number, b: number) => (a / gcdN(a, b)) * b;

function renderIncl(spec: InclSpec, w: CombWords): RenderedSvg {
  let names: string[];
  let sizes: number[]; // |A|, |B|, (|C|), |AB|, (|AC|, |BC|, |ABC|)
  let universe: number | null = null;
  if (spec.mode === "divisible") {
    const N = intOf(spec.n, w, 1, 1e9);
    const ds = spec.divs.split(/[,;\s]+/).filter(Boolean).map((d) => intOf(d, w, 2, 1e6));
    if (ds.length < 2 || ds.length > 3) throw new Error(w.badSizes);
    universe = N;
    names = ds.map((d) => fill(w.divisibleBy, { d }));
    const c = (...xs: number[]) => Math.floor(N / xs.reduce(lcmN, 1));
    sizes = ds.length === 2 ? [c(ds[0]), c(ds[1]), c(ds[0], ds[1])] : [c(ds[0]), c(ds[1]), c(ds[2]), c(ds[0], ds[1]), c(ds[0], ds[2]), c(ds[1], ds[2]), c(ds[0], ds[1], ds[2])];
  } else {
    sizes = spec.sizes.split(/[,;\s]+/).filter(Boolean).map((d) => intOf(d, w, 0, 1e9));
    if (sizes.length !== 3 && sizes.length !== 7) throw new Error(w.badSizes);
    names = sizes.length === 3 ? ["A", "B"] : ["A", "B", "C"];
  }
  const three = sizes.length === 7;
  // Exclusive regions.
  let regions: Record<string, number>;
  if (!three) {
    const [a, b, ab] = sizes;
    regions = { A: a - ab, B: b - ab, AB: ab };
  } else {
    const [a, b, c, ab, ac, bc, abc] = sizes;
    regions = { ABC: abc, AB: ab - abc, AC: ac - abc, BC: bc - abc, A: a - ab - ac + abc, B: b - ab - bc + abc, C: c - ac - bc + abc };
  }
  if (Object.values(regions).some((v) => v < 0)) throw new Error(w.inconsistent);
  const union = Object.values(regions).reduce((s, v) => s + v, 0);
  const parts: string[] = [];
  const cols = [
    { s: C.blue, f: "#1971c2" },
    { s: C.orange, f: "#e8590c" },
    { s: C.purple, f: "#9c36b5" },
  ];
  const R = three ? 105 : 115;
  const centres: [number, number][] = three
    ? [
        [W / 2 - 68, 120],
        [W / 2 + 68, 120],
        [W / 2, 232],
      ]
    : [
        [W / 2 - 75, 135],
        [W / 2 + 75, 135],
      ];
  if (universe !== null) parts.push(`<rect x="40" y="4" width="${W - 80}" height="${three ? 360 : 262}" rx="10" fill="#f8f9fa" stroke="#adb5bd"/>`);
  centres.forEach(([x, y], i) => parts.push(`<circle cx="${x}" cy="${y}" r="${R}" fill="${cols[i].f}" fill-opacity="0.12" stroke="${cols[i].s}" stroke-width="2.2"/>`));
  const label = (x: number, y: number, v: number, bold = false) => parts.push(txt(x, y + 6, String(v), { size: bold ? 19 : 17, anchor: "middle", bold: true, color: C.ink }));
  if (three) {
    const [[ax, ay], [bx, by], [cx, cy]] = centres;
    label(ax - 50, ay - 30, regions.A);
    label(bx + 50, by - 30, regions.B);
    label(cx, cy + 55, regions.C);
    label(W / 2, ay - 40, regions.AB);
    label(ax - 18, ay + 78, regions.AC);
    label(bx + 18, by + 78, regions.BC);
    label(W / 2, 162, regions.ABC, true);
    parts.push(txt(ax - R + 4, ay - R + 18, names[0], { size: 14, bold: true, color: cols[0].s, anchor: "start" }));
    parts.push(txt(bx + R - 4, by - R + 18, names[1], { size: 14, bold: true, color: cols[1].s, anchor: "end" }));
    parts.push(txt(cx, cy + R + 20, names[2], { size: 14, bold: true, color: cols[2].s, anchor: "middle" }));
  } else {
    const [[ax, ay], [bx, by]] = centres;
    label(ax - 55, ay, regions.A);
    label(bx + 55, by, regions.B);
    label(W / 2, ay, regions.AB, true);
    parts.push(txt(ax - R + 10, ay - R + 8, names[0], { size: 14, bold: true, color: cols[0].s }));
    parts.push(txt(bx + R - 10, by - R + 8, names[1], { size: 14, bold: true, color: cols[1].s, anchor: "end" }));
  }
  if (universe !== null) parts.push(txt(W - 50, three ? 356 : 258, `${universe - union}`, { size: 17, anchor: "end", bold: true, color: C.grey }));
  const bodyH = three ? 372 : 272;
  const S = (...xs: string[]) => `|${xs.join(" \\cap ")}|`;
  const tex = three
    ? `|A \\cup B \\cup C| = ${sizes[0]} + ${sizes[1]} + ${sizes[2]} - ${sizes[3]} - ${sizes[4]} - ${sizes[5]} + ${sizes[6]} = ${union}`
    : `|A \\cup B| = ${S("A")} + ${S("B")} - ${S("A", "B")} = ${sizes[0]} + ${sizes[1]} - ${sizes[2]} = ${union}`;
  const caps: Caption[] = [{ text: fill(w.inclResult, { u: union }), color: C.green }];
  if (universe !== null) caps.push({ text: fill(w.inclNone, { n: universe, u: union, rest: universe - union }), color: C.grey });
  caps.push({ text: three ? w.inclInfo : w.inclInfo2, color: "#495057" });
  return compose(tex, parts.join(""), bodyH, caps);
}

// ---------- special numbers ----------

function renderNumbers(spec: NumbersSpec, w: CombWords): RenderedSvg {
  const caps: Caption[] = [];
  const parts: string[] = [];
  let y = 0;
  if (spec.kind === "catalan") {
    const n = intOf(spec.n, w, 0, 30);
    const cat = (m: number) => binom(2 * m, m) / BigInt(m + 1);
    const tex = `C_{${n}} = \\frac{1}{${n} + 1}\\binom{${2 * n}}{${n}} = ${big(cat(n)).tex}`;
    if (n >= 1 && n <= 5) {
      const words: string[] = [];
      const rec = (s: string, open: number, close: number) => {
        if (s.length === 2 * n) return void words.push(s);
        if (open < n) rec(s + "(", open + 1, close);
        if (close < open) rec(s + ")", open, close + 1);
      };
      rec("", 0, 0);
      const cellPx = n <= 3 ? 18 : n === 4 ? 14 : 9;
      const box = n * cellPx;
      const bw = box + 22;
      const bh = box + 34;
      const perRow = Math.max(1, Math.floor((W - 32) / bw));
      words.forEach((wd, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const inRow = Math.min(perRow, words.length - row * perRow);
        const x0 = (W - inRow * bw) / 2 + col * bw + 11;
        const y0 = row * bh + 4;
        const sx = (x: number) => x0 + x * cellPx;
        const sy = (yy: number) => y0 + box - yy * cellPx;
        for (let g = 0; g <= n; g++)
          parts.push(`<line x1="${sx(g)}" y1="${sy(0)}" x2="${sx(g)}" y2="${sy(n)}" stroke="#e9ecef"/><line x1="${sx(0)}" y1="${sy(g)}" x2="${sx(n)}" y2="${sy(g)}" stroke="#e9ecef"/>`);
        parts.push(`<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(n)}" y2="${sy(n)}" stroke="${C.red}" stroke-dasharray="3 3"/>`);
        let px = 0;
        let py = 0;
        const pts = [`${sx(0)},${sy(0)}`];
        for (const ch of wd) {
          if (ch === "(") px++;
          else py++;
          pts.push(`${sx(px)},${sy(py)}`);
        }
        parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${C.blue}" stroke-width="2.4" stroke-linejoin="round"/>`);
        parts.push(`<text x="${r2(x0 + box / 2)}" y="${y0 + box + 17}" font-family="Consolas, Menlo, monospace" font-size="${n === 5 ? 9.5 : 12}" fill="${C.ink}" text-anchor="middle">${wd}</text>`);
      });
      y = Math.ceil(words.length / perRow) * bh + 8;
      caps.push({ text: fill(w.catalanShown, { c: words.length, n }), color: C.blue });
    }
    const first = Math.max(0, Math.max(n, 8) - 11);
    const vals = Array.from({ length: Math.max(n, 8) - first + 1 }, (_, j) => j + first).map((i) => ({ text: `C${sub(i)} = ${cat(i)}`, color: i === n ? C.green : undefined, fill: i === n ? "#d3f9d8" : undefined }));
    const f = flow(vals, y, 12);
    parts.push(f.svg);
    y += f.h;
    caps.push({ text: w.catalanInfo, color: "#495057" });
    return compose(tex, parts.join(""), y, caps);
  }
  if (spec.kind === "derange") {
    const n = intOf(spec.n, w, 1, 20);
    const D: bigint[] = [1n, 0n];
    for (let i = 2; i <= Math.max(n, 10); i++) D.push(BigInt(i - 1) * (D[i - 1] + D[i - 2]));
    if (n <= 5) {
      const out: string[] = [];
      const rec = (cur: number[]) => {
        if (cur.length === n) return void out.push(cur.map((v) => v + 1).join(""));
        for (let v = 0; v < n; v++) if (v !== cur.length && !cur.includes(v)) rec([...cur, v]);
      };
      rec([]);
      parts.push(txt(W / 2, 14, fill(w.derangeShown, { c: out.length, n }), { size: 12.5, anchor: "middle", color: C.blue, bold: true }));
      const f = flow(out.map((t) => ({ text: t })), 24, 13);
      parts.push(f.svg);
      y = 24 + f.h + 16;
    }
    const upTo = Math.max(n, 8);
    const rows: TRow[] = Array.from({ length: upTo }, (_, i) => {
      const m = i + 1;
      const on = m === n;
      return {
        cells: [String(m), D[m].toString(), factB(m).toString(), (Number(D[m]) / Number(factB(m))).toFixed(6)],
        colors: [C.grey, on ? C.green : C.ink, C.ink, C.blue],
        bold: [false, on, false, on],
        fills: on ? [undefined, "#d3f9d8", undefined, undefined] : undefined,
      };
    });
    const tb = table((W - 440) / 2, y, [{ head: "n", w: 60 }, { head: "D(n)", w: 150 }, { head: "n!", w: 130 }, { head: "D(n) / n!", w: 100 }], rows, 22);
    parts.push(tb.svg);
    y += tb.h + 4;
    caps.push({ text: w.derangeInfo, color: "#495057" });
    return compose(`D_{${n}} = ${n}! \\sum_{k=0}^{${n}} \\frac{(-1)^k}{k!} = ${D[n]}, \\qquad D_n = (n - 1)(D_{n-1} + D_{n-2})`, parts.join(""), y, caps);
  }
  if (spec.kind === "stirling") {
    const n = intOf(spec.n, w, 0, 10);
    const N = Math.max(n, 6);
    const S: bigint[][] = [[1n]];
    for (let i = 1; i <= N; i++) {
      S.push([0n]);
      for (let j = 1; j <= i; j++) S[i].push(BigInt(j) * (S[i - 1][j] ?? 0n) + S[i - 1][j - 1]);
    }
    const rows: TRow[] = S.map((row, i) => {
      const on = i === n;
      const bell = row.reduce((s, v) => s + v, 0n);
      return {
        cells: [String(i), ...Array.from({ length: N + 1 }, (_, j) => (j <= i ? row[j].toString() : "")), bell.toString()],
        colors: [C.grey, ...Array(N + 1).fill(on ? C.green : C.ink), C.purple],
        bold: [false, ...Array(N + 1).fill(on), true],
        fills: on ? [undefined, ...Array.from({ length: N + 1 }, (_, j) => (j <= i ? "#d3f9d8" : undefined)), undefined] : undefined,
      };
    });
    const cw = Math.min(56, Math.floor((W - 32 - 40 - 70) / (N + 1)));
    const cols = [{ head: "n \\ k", w: 40 }, ...Array.from({ length: N + 1 }, (_, j) => ({ head: String(j), w: cw })), { head: "B(n)", w: 70 }];
    const tw = cols.reduce((s, c) => s + c.w, 0);
    const tb = table((W - tw) / 2, 0, cols, rows, 22);
    parts.push(tb.svg);
    y = tb.h + 16;
    if (n >= 1 && n <= 4) {
      const out: string[] = [];
      const rec = (i: number, blocks: number[][]) => {
        if (i > n) return void out.push(blocks.map((b) => `{${b.join(",")}}`).join(""));
        blocks.forEach((_, bi) => rec(i + 1, blocks.map((b, j) => (j === bi ? [...b, i] : b))));
        rec(i + 1, [...blocks, [i]]);
      };
      rec(1, []);
      out.sort((a, b) => (a.match(/\{/g)!.length - b.match(/\{/g)!.length) || a.localeCompare(b));
      parts.push(txt(W / 2, y + 4, fill(w.setPartitions, { c: out.length, n }), { size: 12.5, anchor: "middle", color: C.blue, bold: true }));
      const f = flow(out.map((t) => ({ text: t, color: PBLOCK[(t.match(/\{/g)!.length - 1) % PBLOCK.length].s, fill: PBLOCK[(t.match(/\{/g)!.length - 1) % PBLOCK.length].f })), y + 14, 12);
      parts.push(f.svg);
      y += 14 + f.h + 6;
    }
    caps.push({ text: w.stirlingInfo, color: "#495057" });
    return compose(`S(n, k) = k\\,S(n - 1, k) + S(n - 1, k - 1), \\qquad B(${n}) = ${S[n].reduce((s, v) => s + v, 0n)}`, parts.join(""), y, caps);
  }
  // partitions
  const n = intOf(spec.n, w, 1, 60);
  const p = Array(n + 1).fill(0n);
  p[0] = 1n;
  for (let part = 1; part <= n; part++) for (let s = part; s <= n; s++) p[s] += p[s - part];
  let distinct = 0n;
  let odd = 0n;
  {
    const d = Array(n + 1).fill(0n);
    d[0] = 1n;
    for (let part = 1; part <= n; part++) for (let s = n; s >= part; s--) d[s] += d[s - part];
    distinct = d[n];
    const o = Array(n + 1).fill(0n);
    o[0] = 1n;
    for (let part = 1; part <= n; part += 2) for (let s = part; s <= n; s++) o[s] += o[s - part];
    odd = o[n];
  }
  if (n <= 12) {
    const all: number[][] = [];
    const rec = (left: number, max: number, cur: number[]) => {
      if (!left) return void all.push(cur);
      for (let k = Math.min(left, max); k >= 1; k--) rec(left - k, k, [...cur, k]);
    };
    rec(n, n, []);
    const dot = n <= 7 ? 8 : 6;
    const items = all.map((parts) => ({ parts, w: Math.max(parts[0] * dot + 14, parts.join("+").length * 6.5 + 8), h: parts.length * dot + 26 }));
    // Lay out line by line so every label in a line sits on the same baseline.
    const lines: (typeof items)[] = [[]];
    let lw = 0;
    for (const it of items) {
      if (lw + it.w > W - 32 && lines[lines.length - 1].length) lines.push([]), (lw = 0);
      lines[lines.length - 1].push(it);
      lw += it.w + 8;
    }
    let rowY = 0;
    for (const line of lines) {
      const rowH = Math.max(...line.map((it) => it.h));
      let x = 16;
      for (const it of line) {
        const distinctParts = new Set(it.parts).size === it.parts.length;
        it.parts.forEach((len, r) => {
          for (let c = 0; c < len; c++) parts.push(`<circle cx="${r2(x + 7 + c * dot + dot / 2)}" cy="${r2(rowY + 6 + r * dot + dot / 2)}" r="${dot / 2 - 1}" fill="${distinctParts ? C.green : C.blue}"/>`);
        });
        parts.push(txt(x + 7, rowY + rowH - 4, it.parts.join("+"), { size: 11, color: C.ink }));
        x += it.w + 8;
      }
      rowY += rowH + 8;
    }
    y = rowY;
    caps.push({ text: fill(w.partitionsShown, { c: all.length }), color: C.blue });
  }
  caps.push({ text: fill(w.partitionsInfo, { n, p: String(p[n]), d: String(distinct), o: String(odd) }), color: "#495057" });
  return compose(`p(${n}) = ${p[n]}`, parts.join(""), y, caps);
}

const PBLOCK = [
  { s: C.blue, f: "#d0ebff" },
  { s: C.orange, f: "#ffe8cc" },
  { s: C.purple, f: "#f3d9fa" },
  { s: C.green, f: "#d3f9d8" },
  { s: C.red, f: "#ffe3e3" },
];
const SUBD = "₀₁₂₃₄₅₆₇₈₉";
const sub = (i: number) => String(i).replace(/\d/g, (d) => SUBD[Number(d)]);

export function renderComb(spec: CombSpec, words: CombWords): RenderedSvg {
  switch (spec.topic) {
    case "count":
      return renderCount(spec, words);
    case "pascal":
      return renderPascal(spec, words);
    case "stars":
      return renderStars(spec, words);
    case "incl":
      return renderIncl(spec, words);
    case "numbers":
      return renderNumbers(spec, words);
  }
}
