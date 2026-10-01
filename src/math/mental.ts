// Mental math from Vedic speed mathematics and the Major System (after the Neural OS notes):
// multiplication near a base from the generator (B + a)(B + b) = B·(B + a + b) + a·b, the digit-sum
// (casting out nines) check, perfect square and cube roots read from the last digit plus a bracket,
// Anurupya cubing of two-digit numbers, odd magic squares by the directional walk, and the Major
// System (digits ↔ consonants) with words decoded back to check them.
import { cell, table, txt, type Role } from "./algoArrays";
import { C, compose, fill, r2, W, wrap, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

export type MentalTopic = "multiply" | "check" | "sqrt" | "cbrt" | "cube" | "magic" | "major";
export const MENTAL_TOPICS: MentalTopic[] = ["multiply", "check", "sqrt", "cbrt", "cube", "magic", "major"];
export type CheckOp = "+" | "-" | "*" | "/";
export const CHECK_OPS: CheckOp[] = ["+", "-", "*", "/"];
export type MajorSystem = "en" | "ru";
export const MAJOR_SYSTEMS: MajorSystem[] = ["en", "ru"];

/**
 * multiply: a × b near base (blank = the nearest power of 10) · check: a op b = c (c blank = the true result;
 * for ÷, c is "q" or "q r R") · sqrt / cbrt / cube / magic: a · major: a is the number, words the user's words.
 */
export type MentalSpec = { topic: MentalTopic; a: string; b: string; c: string; base: string; op: CheckOp; sys: MajorSystem; words: string };

export type MentalWords = {
  bad: string;
  tooBig: string;
  notSquare: string;
  notCube: string;
  oddN: string;
  info: Record<MentalTopic, string>;
  mul: { deficit: string; surplus: string; cross: string; product: string; carry: string; borrow: string; joined: string; times: string; areaBelow: string; areaAbove: string; scale: string; result: string };
  chk: { sum: string; pass: string; passWrong: string; fail: string; misses: string; correct: string; noMinus: string };
  root: { or: string; ending: string; table: string; bracket: string; closer: string; lower: string; upper: string; one: string; result: string; split: string; key: string };
  cube: { gp: string; doubled: string; sums: string; carries: string; result: string; note: string };
  magic: { constant: string; walk: string; blocked: string };
  major: { sys: Record<MajorSystem, string>; chunk: string; match: string; mismatch: string; missing: string; skeleton: string; legend: Record<MajorSystem, string> };
};

const pretty = (n: number | bigint) => {
  const s = (typeof n === "bigint" ? n : BigInt(Math.round(n))).toString();
  const neg = s.startsWith("-");
  const d = neg ? s.slice(1) : s;
  return (neg ? "−" : "") + d.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
const int = (s: string, w: MentalWords, max = 1e12): number => {
  const t = s.replace(/[\s_,]/g, "").replace(/[−–]/g, "-");
  if (!/^-?\d+$/.test(t)) throw new Error(fill(w.bad, { s }));
  const v = Number(t);
  if (Math.abs(v) > max) throw new Error(fill(w.tooBig, { n: pretty(max) }));
  return v;
};
/** Digital root with 9 for multiples of 9 (0 only for 0). */
const ds = (n: number) => (n === 0 ? 0 : 1 + ((Math.abs(n) - 1) % 9));
const signed = (v: number) => (v < 0 ? `−${-v}` : `+${v}`);

// ---------- multiplication near a base ----------

function renderMultiply(s: MentalSpec, w: MentalWords): RenderedSvg {
  const m = w.mul;
  const A = int(s.a, w, 99999);
  const Bv = int(s.b, w, 99999);
  if (A <= 0 || Bv <= 0) throw new Error(fill(w.bad, { s: A <= 0 ? s.a : s.b }));
  let base: number;
  if (s.base.trim()) {
    base = int(s.base, w, 100000);
    if (base <= 0) throw new Error(fill(w.bad, { s: s.base }));
  } else {
    base = [10, 100, 1000, 10000, 100000].reduce((best, P) => (Math.abs(A - P) + Math.abs(Bv - P) < Math.abs(A - best) + Math.abs(Bv - best) ? P : best), 10);
  }
  const a = A - base;
  const b = Bv - base;
  const cross = A + b; // = Bv + a = base + a + b
  const ab = a * b;
  const k = Math.log10(base);
  const pow10 = Number.isInteger(k) && k >= 1;
  const result = A * Bv;
  const parts: string[] = [];
  const caps: Caption[] = [];

  // The classic layout: numbers and their offsets, the cross line, then left | right.
  const x0 = 30;
  const colL = x0 + 80;
  const colR = colL + 70;
  const ys = [44, 82];
  const offTxt = (v: number) => (v === 0 ? "0" : signed(v));
  parts.push(
    txt(x0 - 6, 18, `B = ${pretty(base)}`, { size: 13, color: C.grey, bold: true }),
    txt(colL, ys[0], pretty(A), { size: 22, anchor: "end", bold: true }),
    txt(colL, ys[1], pretty(Bv), { size: 22, anchor: "end", bold: true }),
    txt(colR, ys[0], offTxt(a), { size: 20, anchor: "end", color: a < 0 ? C.red : C.green, bold: true }),
    txt(colR, ys[1], offTxt(b), { size: 20, anchor: "end", color: b < 0 ? C.red : C.green, bold: true }),
    `<line x1="${colL + 12}" y1="22" x2="${colL + 12}" y2="132" stroke="#adb5bd" stroke-width="1.5"/>`,
    `<line x1="${x0 - 6}" y1="96" x2="${colR + 30}" y2="96" stroke="${C.ink}" stroke-width="1.5"/>`,
    // Cross: the first number with the second's offset.
    `<path d="M${colL + 4},${ys[0] - 4} L${colR - 30},${ys[1] - 10}" stroke="${C.blue}" stroke-width="1.6" stroke-dasharray="4 3" fill="none"/>`,
  );
  let left = cross;
  let right = ab;
  const note: string[] = [];
  if (pow10) {
    const B = base;
    if (right >= B) {
      const carry = Math.floor(right / B);
      note.push(fill(m.carry, { c: carry }));
      left += carry;
      right -= carry * B;
    } else if (right < 0) {
      const t = Math.ceil(-right / B);
      note.push(fill(m.borrow, { t, b: pretty(B) }));
      left -= t;
      right += t * B;
    }
    const rightTxt = String(right).padStart(k, "0");
    parts.push(
      txt(colL, 124, pretty(cross), { size: 22, anchor: "end", bold: true, color: C.blue }),
      txt(colR, 124, String(ab).replace("-", "−").padStart(k, "0"), { size: 22, anchor: "end", bold: true, color: C.purple }),
    );
    if (note.length) parts.push(txt(x0 - 6, 154, note.join(" "), { size: 12, color: C.orange }));
    parts.push(txt(x0 - 6, 184, `= ${pretty(left)} | ${rightTxt} = ${pretty(result)}`, { size: 18, bold: true, color: C.green }));
  } else {
    parts.push(
      txt(colL, 124, pretty(cross), { size: 22, anchor: "end", bold: true, color: C.blue }),
      txt(colR, 124, String(ab).replace("-", "−"), { size: 22, anchor: "end", bold: true, color: C.purple }),
      txt(x0 - 6, 158, `${pretty(cross)} × ${pretty(base)} ${ab < 0 ? "−" : "+"} ${pretty(Math.abs(ab))}`, { size: 15, color: C.ink }),
      txt(x0 - 6, 184, `= ${pretty(cross * base)} ${ab < 0 ? "−" : "+"} ${pretty(Math.abs(ab))} = ${pretty(result)}`, { size: 18, bold: true, color: C.green }),
    );
    caps.push({ text: fill(m.times, { b: pretty(base) }), color: "#495057" });
  }

  // Area picture when both offsets have the same sign (not to scale when they are small).
  let h = 200;
  if (a !== 0 && b !== 0 && Math.sign(a) === Math.sign(b)) {
    const S = 190;
    const X = 360;
    const Y = 16;
    const fa = Math.min(0.42, Math.max(0.16, Math.abs(a) / base));
    const fb = Math.min(0.42, Math.max(0.16, Math.abs(b) / base));
    const scaled = fa !== Math.abs(a) / base || fb !== Math.abs(b) / base;
    const rect = (x: number, y: number, ww: number, hh: number, fillc: string, stroke = "#868e96") =>
      `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(ww)}" height="${r2(hh)}" fill="${fillc}" stroke="${stroke}" stroke-width="1.3"/>`;
    const lab = (x: number, y: number, t: string, color: string, size = 12) => txt(x, y, t, { size, anchor: "middle", color, bold: true });
    if (a < 0) {
      // (B − |a|)(B − |b|): the B×B square minus two strips; their overlap was removed twice.
      const wa = fa * S;
      const hb = fb * S;
      parts.push(
        rect(X, Y, S - wa, S - hb, "#d3f9d8"),
        rect(X + S - wa, Y, wa, S, "#ffe8cc"),
        rect(X, Y + S - hb, S, hb, "#ffe8cc"),
        rect(X + S - wa, Y + S - hb, wa, hb, "#f3d9fa", C.purple),
        lab(X + (S - wa) / 2, Y + (S - hb) / 2 + 4, `${pretty(A)} × ${pretty(Bv)}`, C.green, 13),
        lab(X + S - wa / 2, Y + (S - hb) / 2, `${-a}·B`, C.orange),
        lab(X + (S - wa) / 2, Y + S - hb / 2 + 4, `${-b}·B`, C.orange),
        lab(X + S - wa / 2, Y + S - hb / 2 + 4, `+${ab}`, C.purple),
        lab(X + S / 2, Y + S + 18, `B = ${pretty(base)}`, C.grey),
      );
    } else {
      // (B + a)(B + b): the B×B square, two strips and the corner a·b.
      const wa = fa * S;
      const hb = fb * S;
      const s0 = S - Math.max(wa, hb) * 0.2;
      parts.push(
        rect(X, Y, s0, s0, "#d0ebff"),
        rect(X + s0, Y, wa, s0, "#ffe8cc"),
        rect(X, Y + s0, s0, hb, "#ffe8cc"),
        rect(X + s0, Y + s0, wa, hb, "#f3d9fa", C.purple),
        lab(X + s0 / 2, Y + s0 / 2 + 4, `B·B`, C.blue, 13),
        lab(X + s0 + wa / 2, Y + s0 / 2, `${a}·B`, C.orange),
        lab(X + s0 / 2, Y + s0 + hb / 2 + 4, `${b}·B`, C.orange),
        lab(X + s0 + wa / 2, Y + s0 + hb / 2 + 4, `${ab}`, C.purple),
        lab(X + s0 / 2, Y + s0 + hb + 18, `B = ${pretty(base)}`, C.grey),
      );
    }
    if (scaled) parts.push(txt(X + S / 2, Y + S + 36, m.scale, { size: 11, anchor: "middle", color: C.grey }));
    caps.push({ text: a < 0 ? fill(m.areaBelow, { a: -a, b: -b, ab }) : fill(m.areaAbove, { a, b, ab }), color: C.purple });
    h = Math.max(h, Y + S + 44);
  }

  caps.unshift(
    { text: fill(a <= 0 ? m.deficit : m.surplus, { n: pretty(A), d: Math.abs(a), b: pretty(base) }) + " " + fill(b <= 0 ? m.deficit : m.surplus, { n: pretty(Bv), d: Math.abs(b), b: pretty(base) }), color: "#495057" },
    { text: fill(m.cross, { a: pretty(A), b: `${b < 0 ? "−" : "+"} ${Math.abs(b)}`, c: pretty(cross) }), color: C.blue },
    { text: fill(m.product, { a: offTxt(a), b: offTxt(b), p: String(ab).replace("-", "−") }), color: C.purple },
  );
  if (pow10) caps.push({ text: fill(m.joined, { k, b: pretty(base) }), color: "#495057" });
  caps.push({ text: w.info.multiply, color: "#495057" });
  const tex = `(B ${a < 0 ? "-" : "+"} ${Math.abs(a)})(B ${b < 0 ? "-" : "+"} ${Math.abs(b)}) = B\\,(B ${a + b < 0 ? "-" : "+"} ${Math.abs(a + b)}) ${ab < 0 ? "-" : "+"} ${Math.abs(ab)} \\qquad ${A} \\times ${Bv} = ${result}`;
  return compose(tex, parts.join(""), h, caps);
}

// ---------- digit-sum check ----------

/** One number: its digits (nines and pairs that make 9 struck out) and the chain down to one digit. */
function digitRow(n: number, x: number, y: number, label: string): { svg: string; root: number } {
  const digits = String(Math.abs(n)).split("").map(Number);
  // Strike nines, then greedy pairs adding to 9 — they do not change the digit sum.
  const out = digits.map((d) => d === 9);
  for (let i = 0; i < digits.length; i++)
    for (let j = i + 1; j < digits.length && !out[i]; j++)
      if (!out[j] && digits[i] + digits[j] === 9) out[i] = out[j] = true;
  const parts: string[] = [txt(x, y + 19, label, { size: 13, color: C.grey, bold: true })];
  const cw = 22;
  digits.forEach((d, i) => {
    const cx = x + 30 + i * cw;
    parts.push(cell(cx, y, cw - 3, 26, String(d), out[i] ? "idle" : "plain", 14, true));
    if (out[i]) parts.push(`<line x1="${cx + 3}" y1="${y + 22}" x2="${cx + cw - 6}" y2="${y + 4}" stroke="${C.red}" stroke-width="1.5"/>`);
  });
  // The chain: sum of digits, again, until one digit.
  const chain: number[] = [];
  let v = digits.reduce((s, d) => s + d, 0);
  chain.push(v);
  while (v > 9) chain.push((v = String(v).split("").reduce((s, d) => s + Number(d), 0)));
  const root = ds(n);
  const cx = x + 30 + digits.length * cw + 10;
  parts.push(
    txt(cx, y + 18, `→ ${chain.join(" → ")}`, { size: 13, color: "#495057" }),
    `<circle cx="${cx + 18 + chain.join(" → ").length * 7.4}" cy="${y + 13}" r="13" fill="#d0ebff" stroke="${C.blue}" stroke-width="1.5"/>`,
    txt(cx + 18 + chain.join(" → ").length * 7.4, y + 18, String(root), { size: 14, anchor: "middle", bold: true, color: C.blue }),
  );
  return { svg: parts.join(""), root };
}

function renderCheck(s: MentalSpec, w: MentalWords): RenderedSvg {
  const k = w.chk;
  const A = int(s.a, w);
  const B = int(s.b, w);
  if (A < 0 || B < 0) throw new Error(fill(w.bad, { s: A < 0 ? s.a : s.b }));
  if (s.op === "-" && A < B) throw new Error(k.noMinus);
  if (s.op === "/" && B === 0) throw new Error(fill(w.bad, { s: s.b }));
  const trueQ = s.op === "/" ? Math.floor(A / B) : 0;
  const trueR = s.op === "/" ? A % B : 0;
  const truth = s.op === "+" ? A + B : s.op === "-" ? A - B : s.op === "*" ? A * B : trueQ;
  if (!Number.isSafeInteger(truth)) throw new Error(fill(w.tooBig, { n: pretty(1e12) }));
  // The claimed result (blank = the true one); for ÷ also a remainder: "63210 r 0".
  let Cv = truth;
  let R = trueR;
  if (s.c.trim()) {
    const [q, r] = s.c.split(/r|R|ост|ნაშთ/).map((x) => x.trim());
    Cv = int(q, w);
    R = s.op === "/" ? (r ? int(r, w) : 0) : 0;
  }
  const opSym = { "+": "+", "-": "−", "*": "×", "/": "÷" }[s.op];
  const rows: string[] = [];
  const rA = digitRow(A, 16, 10, "A");
  const rB = digitRow(B, 16, 46, "B");
  const rC = digitRow(Cv, 16, 82, s.op === "/" ? "Q" : "C");
  rows.push(rA.svg, rB.svg, rC.svg);
  let y = 118;
  let rR = 0;
  if (s.op === "/") {
    const r = digitRow(R, 16, y, "R");
    rows.push(r.svg);
    rR = r.root;
    y += 36;
  }
  // The same statement on the digit sums.
  let lhs: string;
  let ok: boolean;
  if (s.op === "/") {
    const v = ds(rB.root * rC.root + rR);
    lhs = `${rB.root} × ${rC.root} + ${rR} = ${rB.root * rC.root + rR} → ${v}`;
    ok = v === rA.root;
    lhs = `${lhs}  ${ok ? "=" : "≠"}  ${rA.root} (A)`;
  } else {
    const raw = s.op === "+" ? rA.root + rB.root : s.op === "-" ? rA.root - rB.root : rA.root * rB.root;
    const v = s.op === "-" ? ds(((raw % 9) + 9) % 9) : ds(raw);
    ok = v === ds(rC.root) || (v === 9 && rC.root === 0) || (v === 0 && rC.root === 9);
    lhs = `${rA.root} ${opSym} ${rB.root} = ${raw} → ${v}  ${ok ? "=" : "≠"}  ${rC.root} (C)`;
  }
  rows.push(
    `<rect x="12" y="${y + 6}" width="${W - 24}" height="36" rx="8" fill="${ok ? "#ebfbee" : "#fff5f5"}" stroke="${ok ? C.green : C.red}"/>`,
    txt(W / 2, y + 29, lhs, { size: 16, anchor: "middle", bold: true, color: ok ? C.green : C.red }),
  );
  const right = Cv === truth && R === trueR;
  const caps: Caption[] = [];
  if (!ok) caps.push({ text: k.fail, color: C.red });
  else if (right) caps.push({ text: k.pass, color: C.green });
  else caps.push({ text: k.passWrong, color: C.orange });
  if (!right) caps.push({ text: fill(k.correct, { v: s.op === "/" ? `${pretty(trueQ)} r ${pretty(trueR)}` : pretty(truth) }), color: C.blue });
  caps.push({ text: k.misses, color: "#495057" }, { text: w.info.check, color: "#495057" });
  const tex = s.op === "/" ? `${A} \\div ${B} = ${Cv}\\ \\text{r}\\ ${R}\\ ?` : `${A} ${opSym === "×" ? "\\times" : opSym === "−" ? "-" : "+"} ${B} = ${Cv}\\ ?`;
  return compose(tex, rows.join(""), y + 48, caps);
}

// ---------- roots ----------

const SQ_END: Record<number, number[]> = { 0: [0], 1: [1, 9], 4: [2, 8], 5: [5], 6: [4, 6], 9: [3, 7] };
const CB_END = [0, 1, 8, 7, 4, 5, 6, 3, 2, 9];

function renderSqrt(s: MentalSpec, w: MentalWords): RenderedSvg {
  const t = w.root;
  const N = int(s.a, w, 1e10);
  const root = Math.round(Math.sqrt(N));
  if (N < 1 || root * root !== N) throw new Error(fill(w.notSquare, { n: pretty(N) }));
  const last = N % 10;
  const ends = SQ_END[last];
  const k = Math.floor(root / 10);
  const lo = (10 * k) ** 2;
  const hi = (10 * k + 10) ** 2;
  const mid = (10 * k + 5) ** 2;
  const cands = ends.map((d) => 10 * k + d);
  const parts: string[] = [];
  // The last-digit table: root ending → square ending, the columns matching N's last digit highlighted.
  const cols = [{ head: "x", w: 96 }, ...Array.from({ length: 10 }, (_, d) => ({ head: String(d), w: 40 }))];
  const hit = (d: number) => (d * d) % 10 === last;
  const tb = table(16, 6, cols, [
    { cells: [t.table, ...Array.from({ length: 10 }, (_, d) => String((d * d) % 10))], colors: [C.grey, ...Array.from({ length: 10 }, (_, d) => (hit(d) ? C.orange : C.ink))], fills: [undefined, ...Array.from({ length: 10 }, (_, d) => (hit(d) ? "#ffe8cc" : undefined))], bold: [false, ...Array.from({ length: 10 }, (_, d) => hit(d))] },
  ], 24);
  parts.push(tb.svg);
  // The bracket on a number line: (10k)² … (10k+5)² … (10k+10)², and N.
  const y = tb.h + 46;
  const [x0, x1] = [60, W - 60];
  const X = (v: number) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
  parts.push(
    `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#495057" stroke-width="2"/>`,
    ...[lo, mid, hi].map((v, i) => `<line x1="${r2(X(v))}" y1="${y - 7}" x2="${r2(X(v))}" y2="${y + 7}" stroke="#495057" stroke-width="2"/>` + txt(X(v), y + 24, `${[10 * k, 10 * k + 5, 10 * k + 10][i]}² = ${pretty(v)}`, { size: 12, anchor: "middle", color: i === 1 ? C.purple : "#495057", bold: i === 1 })),
    `<circle cx="${r2(X(N))}" cy="${y}" r="7" fill="${C.orange}"/>`,
    txt(X(N), y - 14, `N = ${pretty(N)}`, { size: 13, anchor: "middle", color: C.orange, bold: true }),
  );
  const caps: Caption[] = [
    { text: fill(t.ending, { d: last, list: ends.join(t.or) }), color: C.orange },
    { text: fill(t.bracket, { lo: pretty(lo), hi: pretty(hi), a: 10 * k, b: 10 * k + 10, c: cands.join(t.or) }), color: "#495057" },
  ];
  if (cands.length > 1) caps.push({ text: fill(t.closer, { m: pretty(mid), side: N < mid ? t.lower : t.upper, r: root }), color: C.purple });
  caps.push({ text: fill(t.result, { r: root, n: pretty(N), f: "√", p: "²" }), color: C.green }, { text: w.info.sqrt, color: "#495057" });
  return compose(`\\sqrt{${N}} = ${root}`, parts.join(""), y + 36, caps);
}

function renderCbrt(s: MentalSpec, w: MentalWords): RenderedSvg {
  const t = w.root;
  const N = int(s.a, w, 1e12);
  const root = Math.round(Math.cbrt(N));
  if (N < 1 || root ** 3 !== N) throw new Error(fill(w.notCube, { n: pretty(N) }));
  const L = Math.floor(N / 1000);
  const Rr = N % 1000;
  const k = Math.floor(root / 10);
  const d = root % 10;
  const parts: string[] = [];
  // The split: left part | last three digits.
  parts.push(
    txt(24, 30, String(L || ""), { size: 24, bold: true, color: C.blue }),
    txt(24 + String(L || "").length * 14 + 10, 30, "|", { size: 24, color: C.grey }),
    txt(24 + String(L || "").length * 14 + 26, 30, String(Rr).padStart(3, "0"), { size: 24, bold: true, color: C.orange }),
  );
  // The last-digit map, the matching column highlighted.
  const lastN = N % 10;
  const tb = table(16, 48, [{ head: "N", w: 96 }, ...Array.from({ length: 10 }, (_, i) => ({ head: String(i), w: 40 }))], [
    { cells: [t.key, ...CB_END.map(String)], colors: [C.grey, ...CB_END.map((_, i) => (i === lastN ? C.orange : C.ink))], fills: [undefined, ...CB_END.map((_, i) => (i === lastN ? "#ffe8cc" : undefined))], bold: [false, ...CB_END.map((_, i) => i === lastN)] },
  ], 24);
  parts.push(tb.svg);
  // The cubes key around the left part.
  const ks = Array.from({ length: 10 }, (_, i) => i + 1);
  const y = 48 + tb.h + 14;
  const tb2 = table(16, y, [{ head: "n", w: 96 }, ...ks.map((i) => ({ head: String(i), w: 40 }))], [
    { cells: ["n³", ...ks.map((i) => pretty(i ** 3))], colors: [C.grey, ...ks.map((i) => (i === k || i === k + 1 ? C.blue : C.ink))], fills: [undefined, ...ks.map((i) => (i === k ? "#d0ebff" : undefined))], bold: [false, ...ks.map((i) => i === k)] },
  ], 24);
  parts.push(tb2.svg);
  const caps: Caption[] = [
    { text: fill(t.split, { l: pretty(L), r: String(Rr).padStart(3, "0") }), color: "#495057" },
    { text: fill(t.ending, { d: lastN, list: String(d) }), color: C.orange },
    { text: fill(t.one, { k, k3: pretty(k ** 3), l: pretty(L), k1: k + 1, k13: pretty((k + 1) ** 3) }), color: C.blue },
    { text: fill(t.result, { r: root, n: pretty(N), f: "∛", p: "³" }), color: C.green },
    { text: w.info.cbrt, color: "#495057" },
  ];
  return compose(`\\sqrt[3]{${N}} = ${root}`, parts.join(""), y + tb2.h + 6, caps);
}

// ---------- Anurupya cubing ----------

function renderCube(s: MentalSpec, w: MentalWords): RenderedSvg {
  const t = w.cube;
  const n = int(s.a, w, 99);
  if (n < 10) throw new Error(fill(w.bad, { s: s.a }));
  const a = Math.floor(n / 10);
  const b = n % 10;
  const row1 = [a ** 3, a * a * b, a * b * b, b ** 3];
  const row2 = [0, 2 * a * a * b, 2 * a * b * b, 0];
  const sums = row1.map((v, i) => v + row2[i]);
  // Carry from the right: keep one digit in each column, the rest moves left.
  const digits: string[] = Array(4).fill("");
  const carries = [0, 0, 0, 0];
  let carry = 0;
  for (let i = 3; i >= 0; i--) {
    const v = sums[i] + carry;
    carries[i] = carry;
    if (i === 0) digits[i] = String(v);
    else {
      digits[i] = String(v % 10);
      carry = Math.floor(v / 10);
    }
  }
  const cw = 110;
  const x0 = 120;
  const parts: string[] = [];
  const label = (y: number, s2: string, color: string) => txt(16, y, s2, { size: 12.5, color, bold: true });
  const at = (i: number, y: number, v: string, color: string, size = 18) => txt(x0 + i * cw + cw / 2, y, v, { size, anchor: "middle", bold: true, color });
  ["a³", "a²b", "ab²", "b³"].forEach((h, i) => parts.push(at(i, 18, h, C.grey, 12)));
  parts.push(label(48, t.gp, C.blue), label(84, t.doubled, C.purple));
  row1.forEach((v, i) => parts.push(at(i, 48, String(v), C.blue)));
  for (let i = 0; i < 3; i++) parts.push(txt(x0 + (i + 1) * cw, 40, `×${b}/${a}`, { size: 10.5, anchor: "middle", color: C.grey }));
  [1, 2].forEach((i) => parts.push(at(i, 84, String(row2[i]), C.purple)));
  parts.push(`<line x1="${x0}" y1="98" x2="${x0 + 4 * cw}" y2="98" stroke="${C.ink}" stroke-width="1.5"/>`, label(122, t.sums, C.ink));
  sums.forEach((v, i) => parts.push(at(i, 122, String(v), C.ink)));
  parts.push(label(152, t.carries, C.orange));
  carries.forEach((v, i) => v && parts.push(at(i, 152, `+${v}`, C.orange, 14)));
  parts.push(label(186, t.result, C.green));
  digits.forEach((v, i) => parts.push(at(i, 186, v, C.green, 22)));
  const caps: Caption[] = [
    { text: t.note, color: C.blue },
    { text: `${n}³ = ${pretty(n ** 3)}`, color: C.green },
    { text: w.info.cube, color: "#495057" },
  ];
  const tex = `${n}^3 = (10\\cdot${a} + ${b})^3 = ${a}^3\\cdot1000 + 3\\cdot${a}^2\\cdot${b}\\cdot100 + 3\\cdot${a}\\cdot${b}^2\\cdot10 + ${b}^3 = ${n ** 3}`;
  return compose(tex, parts.join(""), 200, caps);
}

// ---------- magic squares ----------

/** Start in the middle of the right column, go south-east (wrapping round), step west when blocked or after the bottom-right corner. */
export function magicSquare(n: number): { grid: number[][]; west: Set<number> } {
  const grid = Array.from({ length: n }, () => Array(n).fill(0));
  const west = new Set<number>();
  let [r, c] = [(n - 1) >> 1, n - 1];
  grid[r][c] = 1;
  for (let k = 2; k <= n * n; k++) {
    let [nr, nc] = [(r + 1) % n, (c + 1) % n];
    if ((r === n - 1 && c === n - 1) || grid[nr][nc]) {
      [nr, nc] = [r, (c - 1 + n) % n];
      west.add(k);
    }
    [r, c] = [nr, nc];
    grid[r][c] = k;
  }
  return { grid, west };
}

function renderMagic(s: MentalSpec, w: MentalWords): RenderedSvg {
  const n = int(s.a, w, 9);
  if (n < 3 || n % 2 === 0) throw new Error(w.oddN);
  const { grid, west } = magicSquare(n);
  const S = Math.min(56, Math.floor(330 / n));
  const x0 = (W - n * S) / 2;
  const y0 = 24;
  const M = (n * (n * n + 1)) / 2;
  const parts: string[] = [];
  grid.forEach((row, i) =>
    row.forEach((v, j) => {
      const role: Role = v === 1 ? "pivot" : west.has(v) ? "compare" : "plain";
      parts.push(cell(x0 + j * S, y0 + i * S, S - 2, S - 2, String(v), role, Math.min(16, S * 0.36), v === 1));
    }),
  );
  // Sums on the edges.
  for (let i = 0; i < n; i++) {
    parts.push(txt(x0 + n * S + 8, y0 + i * S + S / 2 + 4, `= ${grid[i].reduce((x, y) => x + y, 0)}`, { size: 11.5, color: C.green, bold: true }));
    parts.push(txt(x0 + i * S + S / 2 - 1, y0 + n * S + 14, String(grid.reduce((x, row) => x + row[i], 0)), { size: 11.5, color: C.green, bold: true, anchor: "middle" }));
  }
  const d1 = grid.reduce((x, row, i) => x + row[i], 0);
  const d2 = grid.reduce((x, row, i) => x + row[n - 1 - i], 0);
  parts.push(txt(x0 - 4, y0 - 8, `↘ ${d1}`, { size: 11.5, color: C.purple, bold: true, anchor: "end" }), txt(x0 + n * S + 2, y0 - 8, `↙ ${d2}`, { size: 11.5, color: C.purple, bold: true }));
  const caps: Caption[] = [
    { text: fill(w.magic.constant, { n, m: M, c: (n * n + 1) / 2 }), color: C.green },
    { text: w.magic.walk, color: C.blue },
    { text: w.magic.blocked, color: C.orange },
    { text: w.info.magic, color: "#495057" },
  ];
  return compose(`\\frac{n(n^2+1)}{2} = \\frac{${n}\\cdot${n * n + 1}}{2} = ${M}`, parts.join(""), y0 + n * S + 22, caps);
}

// ---------- Major System ----------

const MAJOR: Record<MajorSystem, { letters: string[]; decode: (word: string) => string }> = {
  en: {
    letters: ["s z", "t d", "n", "m", "r", "l", "j sh ch", "k g", "f v", "p b"],
    decode: (word) => {
      let s = word.toLowerCase().replace(/[^a-z]/g, "");
      // Letters, approximating the sounds: digraphs first, doubled consonants once, vowels and w h y silent.
      s = s.replace(/ph/g, "f").replace(/ck/g, "k").replace(/th/g, "t").replace(/(tch|dg|sh|ch)/g, "J").replace(/x/g, "ks");
      s = s.replace(/([b-df-hj-np-tv-z])\1+/g, "$1");
      const map: Record<string, string> = { s: "0", z: "0", t: "1", d: "1", n: "2", m: "3", r: "4", l: "5", j: "6", J: "6", k: "7", g: "7", c: "7", q: "7", f: "8", v: "8", p: "9", b: "9" };
      return [...s].map((ch) => map[ch] ?? "").join("");
    },
  },
  // The Russian БЦК system (after Kozarenko / Löser): every consonant has a digit.
  ru: {
    letters: ["н м", "г ж", "д т", "к х", "ч щ", "п б", "ш л", "с з", "в ф", "р ц"],
    decode: (word) => {
      const map: Record<string, string> = { н: "0", м: "0", г: "1", ж: "1", д: "2", т: "2", к: "3", х: "3", ч: "4", щ: "4", п: "5", б: "5", ш: "6", л: "6", с: "7", з: "7", в: "8", ф: "8", р: "9", ц: "9" };
      return [...word.toLowerCase()].map((ch) => map[ch] ?? "").join("");
    },
  },
};

function renderMajor(s: MentalSpec, w: MentalWords): RenderedSvg {
  const mj = w.major;
  const sys = MAJOR[s.sys];
  const raw = s.a.replace(/\s+/g, "");
  if (!/^[−-]?\d[\d.,]*$/.test(raw) || raw.replace(/\D/g, "").length > 24) throw new Error(fill(w.bad, { s: s.a }));
  const digits = raw.replace(/\D/g, "");
  const chunks = digits.match(/\d{1,2}/g)!;
  const words = s.words.split(/[\s,;]+/).filter(Boolean);
  const parts: string[] = [];
  // The table of the system.
  const tb = table(16, 4, [{ head: "", w: 70 }, ...Array.from({ length: 10 }, (_, d) => ({ head: String(d), w: 53 }))], [{ cells: [mj.sys[s.sys], ...sys.letters], colors: [C.grey, ...sys.letters.map(() => C.blue)], bold: [false, ...sys.letters.map(() => true)] }], 24);
  parts.push(tb.svg);
  // Each chunk of two digits, the word given for it, and what that word decodes to.
  const per = Math.min(8, chunks.length);
  const bw = Math.floor((W - 32) / per);
  let y = tb.h + 18;
  let good = 0;
  chunks.forEach((ch, i) => {
    const col = i % per;
    if (i && col === 0) y += 92;
    const x = 16 + col * bw;
    const word = words[i];
    const dec = word ? sys.decode(word) : "";
    const ok = !!word && dec === ch;
    if (ok) good++;
    const role: Role = !word ? "idle" : ok ? "sorted" : "min";
    parts.push(
      txt(x + bw / 2, y + 16, ch, { size: 20, anchor: "middle", bold: true, color: C.ink }),
      txt(x + bw / 2, y + 32, ch.split("").map((d) => sys.letters[Number(d)].split(" ")[0]).join(" · "), { size: 11, anchor: "middle", color: C.blue }),
      cell(x + 4, y + 40, bw - 10, 26, word ?? "?", role, 13, true),
      txt(x + bw / 2, y + 82, word ? `→ ${dec || "∅"} ${ok ? "✓" : "✗"}` : mj.missing, { size: 11.5, anchor: "middle", color: ok ? C.green : word ? C.red : C.grey, bold: true }),
    );
  });
  const caps: Caption[] = [
    { text: fill(mj.chunk, { n: digits.length, k: chunks.length }), color: "#495057" },
    words.length ? { text: fill(good === chunks.length ? mj.match : mj.mismatch, { g: good, k: chunks.length }), color: good === chunks.length ? C.green : C.orange } : { text: mj.skeleton, color: C.orange },
    { text: mj.legend[s.sys], color: "#495057" },
    { text: w.info.major, color: "#495057" },
  ];
  return compose(`${raw.replace(/-/g, "−")}`, parts.join(""), y + 92, caps);
}

export function renderMental(spec: MentalSpec, words: MentalWords): RenderedSvg {
  switch (spec.topic) {
    case "multiply":
      return renderMultiply(spec, words);
    case "check":
      return renderCheck(spec, words);
    case "sqrt":
      return renderSqrt(spec, words);
    case "cbrt":
      return renderCbrt(spec, words);
    case "cube":
      return renderCube(spec, words);
    case "magic":
      return renderMagic(spec, words);
    case "major":
      return renderMajor(spec, words);
  }
}

const P = (topic: MentalTopic, o: Partial<MentalSpec>): MentalSpec => ({ topic, a: "", b: "", c: "", base: "", op: "*", sys: "en", words: "", ...o });
export const MENTAL_PRESETS: { [K in MentalTopic]: { label: string; spec: MentalSpec }[] } = {
  multiply: [
    { label: "7 × 8", spec: P("multiply", { a: "7", b: "8" }) },
    { label: "97 × 94", spec: P("multiply", { a: "97", b: "94" }) },
    { label: "88 × 88 (carry)", spec: P("multiply", { a: "88", b: "88" }) },
    { label: "103 × 107", spec: P("multiply", { a: "103", b: "107" }) },
    { label: "104 × 97 (mixed)", spec: P("multiply", { a: "104", b: "97" }) },
    { label: "996 × 993", spec: P("multiply", { a: "996", b: "993" }) },
    { label: "48 × 47, B = 50", spec: P("multiply", { a: "48", b: "47", base: "50" }) },
  ],
  check: [
    { label: "467 532 × 107 777", spec: P("check", { a: "467532", b: "107777", op: "*" }) },
    { label: "4 568 + 3 799 = 8 357 ✗", spec: P("check", { a: "4568", b: "3799", op: "+", c: "8357" }) },
    { label: "1 024 vs 1 240 (swap)", spec: P("check", { a: "32", b: "32", op: "*", c: "1240" }) },
    { label: "2 308 682 040 ÷ 36 524", spec: P("check", { a: "2308682040", b: "36524", op: "/" }) },
    { label: "9 000 − 2 718", spec: P("check", { a: "9000", b: "2718", op: "-" }) },
  ],
  sqrt: [
    { label: "√7744", spec: P("sqrt", { a: "7744" }) },
    { label: "√5184", spec: P("sqrt", { a: "5184" }) },
    { label: "√529", spec: P("sqrt", { a: "529" }) },
    { label: "√12 544", spec: P("sqrt", { a: "12544" }) },
    { label: "√25 281", spec: P("sqrt", { a: "25281" }) },
  ],
  cbrt: [
    { label: "∛287 496", spec: P("cbrt", { a: "287496" }) },
    { label: "∛205 379", spec: P("cbrt", { a: "205379" }) },
    { label: "∛830 584", spec: P("cbrt", { a: "830584" }) },
    { label: "∛2 197", spec: P("cbrt", { a: "2197" }) },
  ],
  cube: [
    { label: "12³", spec: P("cube", { a: "12" }) },
    { label: "31³", spec: P("cube", { a: "31" }) },
    { label: "52³", spec: P("cube", { a: "52" }) },
    { label: "99³", spec: P("cube", { a: "99" }) },
  ],
  magic: [
    { label: "3 × 3", spec: P("magic", { a: "3" }) },
    { label: "5 × 5", spec: P("magic", { a: "5" }) },
    { label: "7 × 7", spec: P("magic", { a: "7" }) },
  ],
  major: [
    { label: "π · mat rat lip …", spec: P("major", { a: "3.141592653589793", words: "mat rat lip notch lime lava puck beam" }) },
    { label: "π · кожа чиж пир …", spec: P("major", { a: "3.1415926535", sys: "ru", words: "кожа чиж пир тело бок бой" }) },
    { label: "e · 2.718281828", spec: P("major", { a: "2.718281828", words: "" }) },
    { label: "1789 · tack fob", spec: P("major", { a: "1789", words: "tack fob" }) },
  ],
};
