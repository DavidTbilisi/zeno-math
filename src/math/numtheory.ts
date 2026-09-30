// Number theory: the sieve of Eratosthenes, prime factorization (factor tree or division ladder) with
// d(n), σ(n), φ(n), Euclid's algorithm (with the squares-in-a-rectangle picture), extended Euclid and
// linear Diophantine equations, modular arithmetic (clock, tables, fast powers, inverses), linear
// congruences and the Chinese remainder theorem, and base conversion. Everything is exact
// (BigInt where products could overflow) and every answer is checked.
import { cell, legendRow, ROLES, table, txt, type Role, type TRow } from "./algoArrays";
import { axes, C, compose, curve, dot, fill, lbl, makeFrame, nt, r2, texAt, W, yRange, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

export type GcdMode = "euclid" | "extended" | "diophantine";
export type ModOp = "clock" | "add" | "mul" | "power" | "inverse";
export type CrtMode = "linear" | "system";
export const GCD_MODES: GcdMode[] = ["euclid", "extended", "diophantine"];
export const MOD_OPS: ModOp[] = ["clock", "add", "mul", "power", "inverse"];
export const CRT_MODES: CrtMode[] = ["linear", "system"];

/** step: how many sieving primes have had their multiples crossed out (clamped; large = all). */
export type SieveSpec = { topic: "sieve"; n: string; step: number };
export type FactorSpec = { topic: "factor"; n: string };
/** diophantine: a·x + b·y = c. */
export type GcdSpec = { topic: "gcd"; mode: GcdMode; a: string; b: string; c: string };
/** clock: a mod m · add/mul: tables of ℤ_m · power: a^k mod m · inverse: a⁻¹ mod m. */
export type ModSpec = { topic: "mod"; op: ModOp; a: string; k: string; m: string };
/** linear: a·x ≡ b (mod m) · system: "2 mod 3, 3 mod 5, 2 mod 7". */
export type CrtSpec = { topic: "crt"; mode: CrtMode; a: string; b: string; m: string; system: string };
export type BaseSpec = { topic: "bases"; n: string; from: string; to: string };

export type NtSpec = SieveSpec | FactorSpec | GcdSpec | ModSpec | CrtSpec | BaseSpec;
export type NtTopic = NtSpec["topic"];
export type NtSpecOf<K extends NtTopic> = Extract<NtSpec, { topic: K }>;
export const NT_TOPICS: NtTopic[] = ["sieve", "factor", "gcd", "mod", "crt", "bases"];

export type NtWords = {
  badInt: string;
  badDigits: string;
  tooBig: string;
  prime: string;
  one: string;
  multiplesOf: string;
  sieveStart: string;
  sieveStep: string;
  sieveDone: string;
  sieveInfo: string;
  isPrime: string;
  divisors: string;
  perfect: string;
  abundant: string;
  deficient: string;
  factorInfo: string;
  ladderInfo: string;
  gcdResult: string;
  coprime: string;
  euclidInfo: string;
  bezout: string;
  dioSolvable: string;
  dioNone: string;
  nonneg: string;
  nonnegNone: string;
  cols: { step: string; i: string; bit: string; square: string; result: string; quotient: string; remainder: string; digit: string };
  clockInfo: string;
  clockClass: string;
  units: string;
  zeroDiv: string;
  field: string;
  addInfo: string;
  powerHow: string;
  fermat: string;
  euler: string;
  inverseOk: string;
  noInverse: string;
  inverseInfo: string;
  linNone: string;
  linSolutions: string;
  linInfo: string;
  badCongruence: string;
  crtNone: string;
  crtResult: string;
  crtInfo: string;
  readUp: string;
  baseResult: string;
  baseResultShort: string;
  baseInfo10: string;
  baseInfo: string;
  grouping: string;
};

export const NT_PRESETS: { [K in NtTopic]: { label: string; spec: NtSpecOf<K> }[] } = {
  sieve: [
    { label: "up to 100", spec: { topic: "sieve", n: "100", step: 99 } },
    { label: "up to 100 · after 2", spec: { topic: "sieve", n: "100", step: 1 } },
    { label: "up to 100 · after 2, 3", spec: { topic: "sieve", n: "100", step: 2 } },
    { label: "up to 50 · start", spec: { topic: "sieve", n: "50", step: 0 } },
    { label: "up to 200", spec: { topic: "sieve", n: "200", step: 99 } },
  ],
  factor: [
    { label: "360", spec: { topic: "factor", n: "360" } },
    { label: "84", spec: { topic: "factor", n: "84" } },
    { label: "28 (perfect)", spec: { topic: "factor", n: "28" } },
    { label: "1001", spec: { topic: "factor", n: "1001" } },
    { label: "97 (prime)", spec: { topic: "factor", n: "97" } },
    { label: "2¹⁶ = 65536", spec: { topic: "factor", n: "65536" } },
    { label: "600851475143", spec: { topic: "factor", n: "600851475143" } },
  ],
  gcd: [
    { label: "gcd(252, 198)", spec: { topic: "gcd", mode: "euclid", a: "252", b: "198", c: "" } },
    { label: "gcd(1071, 462)", spec: { topic: "gcd", mode: "euclid", a: "1071", b: "462", c: "" } },
    { label: "gcd(89, 55) — Fibonacci", spec: { topic: "gcd", mode: "euclid", a: "89", b: "55", c: "" } },
    { label: "Bézout: 240, 46", spec: { topic: "gcd", mode: "extended", a: "240", b: "46", c: "" } },
    { label: "3x + 5y = 22", spec: { topic: "gcd", mode: "diophantine", a: "3", b: "5", c: "22" } },
    { label: "12x + 18y = 30", spec: { topic: "gcd", mode: "diophantine", a: "12", b: "18", c: "30" } },
    { label: "6x + 9y = 20 (none)", spec: { topic: "gcd", mode: "diophantine", a: "6", b: "9", c: "20" } },
  ],
  mod: [
    { label: "38 mod 12 (clock)", spec: { topic: "mod", op: "clock", a: "38", k: "3", m: "12" } },
    { label: "−5 mod 7", spec: { topic: "mod", op: "clock", a: "-5", k: "3", m: "7" } },
    { label: "× table mod 7", spec: { topic: "mod", op: "mul", a: "3", k: "3", m: "7" } },
    { label: "× table mod 12", spec: { topic: "mod", op: "mul", a: "3", k: "3", m: "12" } },
    { label: "+ table mod 6", spec: { topic: "mod", op: "add", a: "3", k: "3", m: "6" } },
    { label: "3²⁰⁰ mod 13", spec: { topic: "mod", op: "power", a: "3", k: "200", m: "13" } },
    { label: "7¹²⁸ mod 100", spec: { topic: "mod", op: "power", a: "7", k: "128", m: "100" } },
    { label: "17⁻¹ mod 43", spec: { topic: "mod", op: "inverse", a: "17", k: "3", m: "43" } },
    { label: "4⁻¹ mod 10 (none)", spec: { topic: "mod", op: "inverse", a: "4", k: "3", m: "10" } },
  ],
  crt: [
    { label: "x ≡ 2, 3, 2 (mod 3, 5, 7)", spec: { topic: "crt", mode: "system", a: "3", b: "2", m: "7", system: "2 mod 3, 3 mod 5, 2 mod 7" } },
    { label: "x ≡ 1, 2, 3 (mod 4, 5, 7)", spec: { topic: "crt", mode: "system", a: "3", b: "2", m: "7", system: "1 mod 4, 2 mod 5, 3 mod 7" } },
    { label: "x ≡ 3 (mod 6), x ≡ 5 (mod 8)", spec: { topic: "crt", mode: "system", a: "3", b: "2", m: "7", system: "3 mod 6, 5 mod 8" } },
    { label: "3x ≡ 4 (mod 7)", spec: { topic: "crt", mode: "linear", a: "3", b: "4", m: "7", system: "2 mod 3, 3 mod 5" } },
    { label: "6x ≡ 9 (mod 15)", spec: { topic: "crt", mode: "linear", a: "6", b: "9", m: "15", system: "2 mod 3, 3 mod 5" } },
    { label: "4x ≡ 3 (mod 10) (none)", spec: { topic: "crt", mode: "linear", a: "4", b: "3", m: "10", system: "2 mod 3, 3 mod 5" } },
  ],
  bases: [
    { label: "45 → base 2", spec: { topic: "bases", n: "45", from: "10", to: "2" } },
    { label: "101101₂ → base 10", spec: { topic: "bases", n: "101101", from: "2", to: "10" } },
    { label: "255 → base 16", spec: { topic: "bases", n: "255", from: "10", to: "16" } },
    { label: "1011011₂ → base 8", spec: { topic: "bases", n: "1011011", from: "2", to: "8" } },
    { label: "2024 → base 5", spec: { topic: "bases", n: "2024", from: "10", to: "5" } },
    { label: "7B₁₆ → base 3", spec: { topic: "bases", n: "7B", from: "16", to: "3" } },
  ],
};

// ---------- arithmetic ----------

function intOf(s: string, w: NtWords, lo: number, hi: number): number {
  const t = s.trim().replace(/[−–]/g, "-").replace(/\s+/g, "");
  const v = Number(t);
  if (!/^-?\d+$/.test(t) || !Number.isSafeInteger(v) || v < lo || v > hi) throw new Error(fill(w.badInt, { s, lo: String(lo).replace("-", "−"), hi: String(hi) }));
  return v;
}

export const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
const mod = (a: number, m: number) => ((a % m) + m) % m;

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return false;
  return true;
}

export function factorize(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2)
    if (n % p === 0) {
      let a = 0;
      while (n % p === 0) (n /= p), a++;
      out.push([p, a]);
    }
  if (n > 1) out.push([n, 1]);
  return out;
}

/** Iterative extended Euclid: rows (r, q, s, t) with r = s·a + t·b; the last row has r = 0. */
function extended(a: number, b: number) {
  const rows: { r: number; q: number | null; s: number; t: number }[] = [
    { r: a, q: null, s: 1, t: 0 },
    { r: b, q: null, s: 0, t: 1 },
  ];
  while (rows[rows.length - 1].r !== 0) {
    const [p, c] = rows.slice(-2);
    const q = Math.floor(p.r / c.r);
    c.q = q;
    rows.push({ r: p.r - q * c.r, q: null, s: p.s - q * c.s, t: p.t - q * c.t });
  }
  const g = rows[rows.length - 2];
  return { rows, g: g.r, s: g.s, t: g.t };
}

const big = BigInt;
const bmod = (a: bigint, m: bigint) => ((a % m) + m) % m;
function bgcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}
/** Inverse of a modulo m (gcd must be 1). */
function binv(a: bigint, m: bigint): bigint {
  let [r0, r1, s0, s1] = [bmod(a, m), m, 1n, 0n];
  while (r1) {
    const q = r0 / r1;
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  return bmod(s0, m);
}

const phiOf = (n: number) => factorize(n).reduce((acc, [p]) => (acc / p) * (p - 1), n);
const paren = (v: number) => (v < 0 ? `(${v})` : String(v));
const signed = (v: number) => (v < 0 ? `- ${-v}` : `+ ${v}`);
const SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sups = (n: number) => String(n).replace(/\d/g, (d) => SUPS[Number(d)]);

/** Stacked LaTeX lines, left-aligned at x (or centred when x is null); returns svg and height. */
function texLines(lines: { tex: string; color?: string }[], x: number | null, y0: number, gap = 34, scale = 1) {
  const parts = lines.map((l, i) => texAt(l.tex, x ?? W / 2, y0 + i * gap, x === null ? "middle" : "start", scale, l.color).svg);
  return { svg: parts.join(""), h: lines.length ? (lines.length - 1) * gap + 24 : 0 };
}

const PCOL = [
  { s: C.blue, f: "#d0ebff" },
  { s: C.orange, f: "#ffe8cc" },
  { s: C.purple, f: "#f3d9fa" },
  { s: C.red, f: "#ffe3e3" },
  { s: "#0c8599", f: "#c5f6fa" },
  { s: "#f08c00", f: "#fff3bf" },
  { s: "#c2255c", f: "#ffdeeb" },
  { s: "#495057", f: "#e9ecef" },
];

// ---------- sieve ----------

/** The primes p with p² ≤ n — the only ones the sieve needs. */
export function sievingPrimes(n: number): number[] {
  const out: number[] = [];
  for (let p = 2; p * p <= n; p++) if (isPrime(p)) out.push(p);
  return out;
}

function renderSieve(spec: SieveSpec, w: NtWords): RenderedSvg {
  const N = intOf(spec.n, w, 2, 400);
  const sievers = sievingPrimes(N);
  const steps = Math.max(0, Math.min(sievers.length, Math.round(spec.step)));
  const done = steps === sievers.length;
  const by = Array(N + 1).fill(0);
  for (let i = 0; i < steps; i++) {
    const p = sievers[i];
    for (let k = p * p; k <= N; k += p) if (!by[k]) by[k] = p;
  }
  const cur = steps ? sievers[steps - 1] : 0;
  const cols = 10;
  const cw = 58;
  const ch = N > 100 ? 27 : 34;
  const x0 = (W - cols * cw) / 2;
  const parts: string[] = [];
  let count = 0;
  for (let k = 1; k <= N; k++) {
    const x = x0 + ((k - 1) % cols) * cw;
    const y = Math.floor((k - 1) / cols) * ch;
    const size = ch > 30 ? 14 : 12.5;
    if (k === 1) {
      parts.push(cell(x + 2, y + 2, cw - 4, ch - 4, "1", "idle", size));
      continue;
    }
    const p = by[k];
    if (p) {
      const c = PCOL[sievers.indexOf(p) % PCOL.length];
      parts.push(
        `<rect x="${x + 2}" y="${y + 2}" width="${cw - 4}" height="${ch - 4}" rx="3" fill="${c.f}" stroke="${c.s}" stroke-width="1.1"/>`,
        txt(x + cw / 2, y + ch / 2 + size * 0.36, String(k), { size, color: "#868e96", anchor: "middle" }),
        `<line x1="${x + 8}" y1="${y + ch - 7}" x2="${x + cw - 8}" y2="${y + 7}" stroke="${c.s}" stroke-width="1.6"/>`,
      );
      continue;
    }
    const prime = isPrime(k);
    if (prime) count++;
    const idx = sievers.indexOf(k);
    const known = prime && (done || (idx >= 0 && idx < steps));
    parts.push(cell(x + 2, y + 2, cw - 4, ch - 4, String(k), known ? "sorted" : "plain", size, known));
    if (k === cur && !done) parts.push(`<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="4" fill="none" stroke="${C.green}" stroke-width="3"/>`);
  }
  const gridH = Math.ceil(N / cols) * ch;
  const leg = legendRow(
    [
      { role: "sorted" as Role, text: w.prime },
      ...sievers.slice(0, steps).map((p) => ({ role: "plain" as Role, text: fill(w.multiplesOf, { p }) })),
      { role: "idle" as Role, text: w.one },
    ],
    gridH + 10,
  );
  // Colour the swatches of the crossed-out groups like the cells.
  let legSvg = leg.svg;
  sievers.slice(0, steps).forEach((p, i) => {
    const c = PCOL[i % PCOL.length];
    const text = fill(w.multiplesOf, { p });
    legSvg = legSvg.replace(new RegExp(`fill="#ffffff" stroke="#868e96" stroke-width="1.3"/>(<text[^>]*>${text.replace(/[()]/g, "\\$&")}<)`), `fill="${c.f}" stroke="${c.s}" stroke-width="1.3"/>$1`);
  });
  const caps: Caption[] = [];
  const root = Math.floor(Math.sqrt(N));
  if (done) caps.push({ text: fill(w.sieveDone, { n: N, c: count, r: root }), color: C.green });
  else if (!steps) caps.push({ text: w.sieveStart, color: C.blue });
  else caps.push({ text: fill(w.sieveStep, { p: cur, sq: cur * cur, next: sievers[steps] }), color: C.blue });
  caps.push({ text: w.sieveInfo, color: "#495057" });
  const tex = done ? `\\pi(${N}) = ${count}` : `\\sqrt{${N}} \\approx ${nt(Math.sqrt(N), 2)} \\;\\Rightarrow\\; p \\in \\{${sievers.join(",\\,")}\\}`;
  return compose(tex, parts.join("") + legSvg, gridH + 10 + leg.h, caps);
}

// ---------- factorization ----------

type FNode = { v: number; kids: FNode[]; depth: number; x: number };

function renderFactor(spec: FactorSpec, w: NtWords): RenderedSvg {
  const n = intOf(spec.n, w, 2, 1e12);
  const fs = factorize(n);
  const parts: string[] = [];
  let y = 0;
  const prime = fs.length === 1 && fs[0][1] === 1;
  const leafCount = fs.reduce((s, [, a]) => s + a, 0);
  if (!prime && leafCount <= 14) {
    // Factor tree: split into the two factors closest to √v.
    const build = (v: number, depth: number): FNode => {
      if (isPrime(v)) return { v, kids: [], depth, x: 0 };
      let d = Math.floor(Math.sqrt(v));
      while (v % d) d--;
      return { v, kids: [build(d, depth + 1), build(v / d, depth + 1)], depth, x: 0 };
    };
    const root = build(n, 0);
    const leaves: FNode[] = [];
    const walk = (t: FNode) => (t.kids.length ? t.kids.forEach(walk) : leaves.push(t));
    walk(root);
    const slot = Math.min(90, (W - 32) / leaves.length);
    const left = (W - slot * leaves.length) / 2;
    leaves.forEach((t, i) => (t.x = left + (i + 0.5) * slot));
    const place = (t: FNode): number => (t.kids.length ? (t.x = t.kids.map(place).reduce((s, x) => s + x, 0) / t.kids.length) : t.x);
    place(root);
    let maxDepth = 0;
    const draw = (t: FNode) => {
      const ty = 18 + t.depth * 56;
      maxDepth = Math.max(maxDepth, t.depth);
      for (const k of t.kids) {
        parts.push(`<line x1="${r2(t.x)}" y1="${ty + 12}" x2="${r2(k.x)}" y2="${ty + 56 - 12}" stroke="#868e96" stroke-width="1.6"/>`);
        draw(k);
      }
      const label = nt(t.v);
      const bw = Math.max(32, label.length * 8.5 + 14);
      parts.push(cell(t.x - bw / 2, ty - 13, bw, 26, label, t.kids.length ? "key" : "sorted", 13.5, !t.kids.length));
    };
    draw(root);
    y = 18 + maxDepth * 56 + 30;
  } else if (!prime) {
    // Division ladder: divide by the smallest prime again and again.
    let v = n;
    const rows: [number, number][] = [];
    for (const [p, a] of fs) for (let i = 0; i < a; i++) rows.push([p, v]), (v /= p);
    const x = W / 2 - 40;
    rows.forEach(([p, val], i) => {
      const ry = i * 26;
      parts.push(
        txt(x - 12, ry + 18, String(p), { size: 14, anchor: "end", color: C.green, bold: true }),
        `<line x1="${x - 4}" y1="${ry + 2}" x2="${x - 4}" y2="${ry + 26}" stroke="${C.ink}" stroke-width="1.4"/>`,
        `<line x1="${x - 4}" y1="${ry + 26}" x2="${x + 150}" y2="${ry + 26}" stroke="${C.ink}" stroke-width="1.4"/>`,
        txt(x + 6, ry + 18, nt(val), { size: 14 }),
      );
    });
    parts.push(txt(x + 6, rows.length * 26 + 18, "1", { size: 14, color: C.grey }));
    y = rows.length * 26 + 34;
  }
  const pw = (p: number, a: number) => (a === 1 ? `${p}` : `${p}^{${a}}`);
  const factTex = fs.map(([p, a]) => pw(p, a)).join(" \\cdot ");
  const d = fs.reduce((s, [, a]) => s * (a + 1), 1);
  const sigmaParts = fs.map(([p, a]) => (p ** (a + 1) - 1) / (p - 1));
  const sigma = sigmaParts.reduce((s, x) => s * x, 1);
  const phi = phiOf(n);
  const lines: { tex: string; color?: string }[] = [];
  if (!prime) {
    lines.push({ tex: `d(${n}) = ${fs.map(([, a]) => `(${a} + 1)`).join("")} = ${d}` });
    const sigmaFactors = fs.map(([p, a]) => (a <= 4 && p ** a < 1e4 ? `(${Array.from({ length: a + 1 }, (_, k) => (k === 0 ? "1" : pw(p, k))).join(" + ")})` : `\\frac{${p}^{${a + 1}} - 1}{${p} - 1}`));
    lines.push({ tex: `\\sigma(${n}) = ${sigmaFactors.join("")}${fs.length > 1 ? ` = ${sigmaParts.join(" \\cdot ")}` : ""} = ${sigma}` });
    lines.push({ tex: `\\varphi(${n}) = ${n}${fs.map(([p]) => `\\left(1 - \\frac{1}{${p}}\\right)`).join("")} = ${phi}` });
  } else {
    lines.push({ tex: `d(${n}) = 2, \\quad \\sigma(${n}) = ${n + 1}, \\quad \\varphi(${n}) = ${n - 1}` });
  }
  const tl = texLines(lines, null, y + 18, 54, 0.95);
  parts.push(tl.svg);
  const bodyH = y + 18 + tl.h + 8;
  const caps: Caption[] = [];
  if (prime) caps.push({ text: fill(w.isPrime, { n }), color: C.green });
  else {
    if (d <= 30) {
      const divs: number[] = [];
      for (let k = 1; k * k <= n; k++) if (n % k === 0) divs.push(k);
      const pairs = divs.map((k) => (k * k === n ? `${k}·${k}` : `${k}·${n / k}`));
      caps.push({ text: fill(w.divisors, { c: d, list: pairs.join(", ") }), color: C.blue });
    }
    const s = sigma - n;
    caps.push({ text: fill(s === n ? w.perfect : s > n ? w.abundant : w.deficient, { s, n }), color: s === n ? C.green : C.ink });
    caps.push({ text: leafCount <= 14 ? w.factorInfo : w.ladderInfo, color: "#495057" });
  }
  return compose(prime ? `${n} \\in \\mathbb{P}` : `${n} = ${factTex}`, parts.join(""), bodyH, caps);
}

// ---------- gcd ----------

function renderGcd(spec: GcdSpec, w: NtWords): RenderedSvg {
  if (spec.mode === "diophantine") return renderDiophantine(spec, w);
  const a = intOf(spec.a, w, 1, 1e12);
  const b = intOf(spec.b, w, 1, 1e12);
  const g = gcd(a, b);
  const l = (a / g) * b;
  const caps: Caption[] = [];
  if (spec.mode === "extended") {
    const ex = extended(a, b);
    const rows: TRow[] = ex.rows.map((r, i) => {
      const last = i === ex.rows.length - 2;
      return {
        cells: [String(i), nt(r.r), r.q === null ? "" : String(r.q), nt(r.s), nt(r.t)],
        colors: [C.grey, last ? C.green : C.ink, C.orange, last ? C.blue : C.ink, last ? C.blue : C.ink],
        bold: [false, last, false, last, last],
        fills: last ? [undefined, ROLES.sorted.fill, undefined, ROLES.key.fill, ROLES.key.fill] : undefined,
      };
    });
    const tb = table((W - 440) / 2, 0, [{ head: w.cols.i, w: 50 }, { head: "r", w: 130 }, { head: "q", w: 80 }, { head: "s", w: 90 }, { head: "t", w: 90 }], rows);
    const check = texAt(`${ex.s} \\cdot ${a} ${ex.t < 0 ? "-" : "+"} ${Math.abs(ex.t)} \\cdot ${b} = ${ex.s * a} ${ex.t * b < 0 ? "-" : "+"} ${Math.abs(ex.t * b)} = ${g}`, W / 2, tb.h + 30, "middle", 1, C.blue);
    const pn = (v: number) => (v < 0 ? `(${nt(v)})` : nt(v));
    caps.push({ text: fill(w.bezout, { g, s: pn(ex.s), t: pn(ex.t), a, b }), color: C.blue });
    if (g === 1) caps.push({ text: fill(w.coprime, { a, b }), color: C.green });
    return compose(`\\gcd(${a}, ${b}) = ${g} = ${paren(ex.s)} \\cdot ${a} + ${paren(ex.t)} \\cdot ${b}`, tb.svg + check.svg, tb.h + 48, caps);
  }
  // Euclid: the division lines on the left, squares cut from the rectangle on the right.
  const steps: { a: number; b: number; q: number; r: number }[] = [];
  for (let x = a, y = b; y; ) {
    const q = Math.floor(x / y);
    steps.push({ a: x, b: y, q, r: x - q * y });
    [x, y] = [y, x - q * y];
  }
  const shown = steps.length > 13 ? [...steps.slice(0, 11), null, steps[steps.length - 1]] : steps;
  const lines = shown.map((s) =>
    s === null ? { tex: "\\vdots" } : { tex: `${s.a} = ${s.q} \\cdot ${s.b} + ${s.r}`, color: s.r === 0 ? C.grey : s === steps[steps.length - 2] ? C.green : undefined },
  );
  const tl = texLines(lines, 16, 14, 30, 0.95);
  const parts = [tl.svg];
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const box = 280;
  const sc = Math.min(box / big, box / small);
  const ox = W - 16 - big * sc;
  const oy = 4;
  parts.push(`<rect x="${r2(ox)}" y="${oy}" width="${r2(big * sc)}" height="${r2(small * sc)}" fill="none" stroke="${C.ink}" stroke-width="1.5"/>`);
  let [x, y, rw, rh] = [0, 0, big, small];
  for (let i = 0; rw > 0 && rh > 0; i++) {
    const side = Math.min(rw, rh);
    if (side * sc < 1.2) break;
    const q = Math.floor(Math.max(rw, rh) / side);
    const c = PCOL[i % PCOL.length];
    for (let k = 0; k < q; k++) {
      const sx = rw >= rh ? x + k * side : x;
      const sy = rw >= rh ? y : y + k * side;
      parts.push(`<rect x="${r2(ox + sx * sc)}" y="${r2(oy + sy * sc)}" width="${r2(side * sc)}" height="${r2(side * sc)}" fill="${c.f}" stroke="${c.s}" stroke-width="1.2"/>`);
      if (side * sc >= 26) parts.push(txt(ox + (sx + side / 2) * sc, oy + (sy + side / 2) * sc + 4.5, nt(side), { size: Math.min(13, side * sc * 0.35), anchor: "middle", color: c.s, bold: true }));
    }
    if (rw >= rh) (x += q * side), (rw -= q * side);
    else (y += q * side), (rh -= q * side);
  }
  const bodyH = Math.max(tl.h + 20, small * sc + 12);
  caps.push({ text: fill(w.gcdResult, { a, b, g, l }), color: C.green });
  if (g === 1) caps.push({ text: fill(w.coprime, { a, b }), color: C.green });
  caps.push({ text: fill(w.euclidInfo, { g }), color: "#495057" });
  return compose(`\\gcd(${a}, ${b}) = ${g}, \\qquad \\operatorname{lcm}(${a}, ${b}) = ${l}`, parts.join(""), bodyH, caps);
}

function renderDiophantine(spec: GcdSpec, w: NtWords): RenderedSvg {
  const a = intOf(spec.a, w, -1e6, 1e6);
  const b = intOf(spec.b, w, -1e6, 1e6);
  const c = intOf(spec.c, w, -1e9, 1e9);
  if (!a || !b) throw new Error(fill(w.badInt, { s: !a ? spec.a : spec.b, lo: "1", hi: nt(1e6) }));
  const g = gcd(a, b);
  const ok = c % g === 0;
  const eq = `${a}x ${signed(b)}y = ${c}`;
  const caps: Caption[] = [];
  const fr0 = { left: 48, top: 6, w: W - 48 - 18, h: 330 };
  let tex = eq;
  let body: string;
  if (ok) {
    const ex = extended(Math.abs(a), Math.abs(b));
    const x0 = ex.s * Math.sign(a) * (c / g);
    const y0 = ex.t * Math.sign(b) * (c / g);
    const dx = b / g;
    const dy = a / g;
    // Choose the solution closest to the origin as the representative.
    let best = { x: x0, y: y0, k: 0 };
    const k0 = Math.round(-x0 / dx);
    for (let k = k0 - 3; k <= k0 + 3; k++) {
      const x = x0 + dx * k;
      const y = y0 - dy * k;
      if (Math.abs(x) + Math.abs(y) < Math.abs(best.x) + Math.abs(best.y)) best = { x, y, k };
    }
    const span = Math.abs(dx) * 2.6;
    const xr: [number, number] = [Math.min(best.x - span, -Math.abs(dx) * 0.5), Math.max(best.x + span, Math.abs(dx) * 0.5)];
    const line = (x: number) => (c - a * x) / b;
    const f = makeFrame("dio", fr0.left, fr0.top, fr0.w, fr0.h, xr, yRange([line(xr[0]), line(xr[1])], [0]));
    body = axes(f) + curve(f, line, C.blue, 2.2);
    for (let k = -40; k <= 40; k++) {
      const x = best.x + dx * k;
      const y = best.y - dy * k;
      if (x >= f.x0 && x <= f.x1 && y >= f.y0 && y <= f.y1) {
        body += dot(f.sx(x), f.sy(y), k === 0 ? C.green : C.orange, k === 0 ? 6 : 4.5);
        if (k === 0 || Math.abs(k) === 1) body += lbl(f.sx(x) + 8, f.sy(y) - 8, `(${nt(x)}, ${nt(y)})`, k === 0 ? C.green : C.orange);
      }
    }
    tex = `${eq}: \\quad x = ${best.x} ${signed(dx)}k, \\;\\; y = ${best.y} ${signed(-dy)}k, \\;\\; k \\in \\mathbb{Z}`;
    caps.push({ text: fill(w.dioSolvable, { a: nt(a), b: nt(b), c: nt(c), g, dx: nt(dx), dy: nt(-dy) }), color: C.green });
    if (a > 0 && b > 0 && c >= 0) {
      const sols: string[] = [];
      for (let k = -Math.ceil(Math.abs(best.x / dx)) - 2; sols.length < 12 && k < 1e6; k++) {
        const x = best.x + dx * k;
        const y = best.y - dy * k;
        if (x > c / a) break;
        if (x >= 0 && y >= 0) sols.push(`(${x}, ${y})`);
      }
      caps.push(sols.length ? { text: fill(w.nonneg, { list: sols.join(", ") }), color: C.blue } : { text: w.nonnegNone, color: C.grey });
    }
  } else {
    const line = (x: number) => (c - a * x) / b;
    const xr: [number, number] = [-Math.abs(b) * 2, Math.abs(b) * 2 + 1];
    const f = makeFrame("dio", fr0.left, fr0.top, fr0.w, fr0.h, xr, yRange([line(xr[0]), line(xr[1])], [0]));
    body = axes(f) + curve(f, line, C.red, 2.2);
    caps.push({ text: fill(w.dioNone, { a: nt(a), b: nt(b), c: nt(c), g }), color: C.red });
  }
  return compose(tex, body, fr0.top + fr0.h + 16, caps);
}

// ---------- modular arithmetic ----------

function renderMod(spec: ModSpec, w: NtWords): RenderedSvg {
  const caps: Caption[] = [];
  if (spec.op === "clock") {
    const m = intOf(spec.m, w, 2, 24);
    const a = intOf(spec.a, w, -1e6, 1e6);
    const r = mod(a, m);
    const q = (a - r) / m;
    const cx = 170;
    const cy = 165;
    const R = 140;
    const ang = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / m;
    const parts = [`<circle cx="${cx}" cy="${cy}" r="${R}" fill="#f8f9fa" stroke="#adb5bd" stroke-width="2"/>`];
    if (r) {
      const rr = R - 30;
      const [x1, y1] = [cx + rr * Math.cos(ang(0)), cy + rr * Math.sin(ang(0))];
      const [x2, y2] = [cx + rr * Math.cos(ang(r)), cy + rr * Math.sin(ang(r))];
      parts.push(
        `<defs><marker id="clk-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="${C.orange}"/></marker></defs>`,
        `<path d="M${r2(x1)} ${r2(y1)} A${rr} ${rr} 0 ${r > m / 2 ? 1 : 0} 1 ${r2(x2)} ${r2(y2)}" fill="none" stroke="${C.orange}" stroke-width="4" marker-end="url(#clk-ah)"/>`,
      );
    }
    for (let i = 0; i < m; i++) {
      const [x, y] = [cx + R * Math.cos(ang(i)), cy + R * Math.sin(ang(i))];
      parts.push(cell(x - 15, y - 13, 30, 26, String(i), i === r ? "sorted" : "plain", 13, i === r));
    }
    parts.push(txt(cx, cy + 5, q === 0 ? "" : `${q > 0 ? "+" : "−"}${Math.abs(q)} × ${m}`, { size: 14, anchor: "middle", color: C.purple, bold: true }));
    const cls = [-1, 0, 1, 2].map((k) => r + k * m);
    const tl = texLines(
      [
        { tex: `${a} = ${paren(q)} \\cdot ${m} + ${r}` },
        { tex: `${a} \\equiv ${r} \\pmod{${m}}`, color: C.green },
        { tex: `\\ldots,\\ ${cls.map((x) => `{${x}}`).join(",\\ ")},\\ \\ldots` },
      ],
      350,
      110,
      50,
    );
    parts.push(tl.svg);
    caps.push({ text: fill(w.clockInfo, { a: nt(a), q: nt(q), m, r }), color: C.blue });
    caps.push({ text: fill(w.clockClass, { r, m, list: `…, ${cls.map((x) => nt(x)).join(", ")}, …` }), color: "#495057" });
    return compose(`${a} \\bmod ${m} = ${r}`, parts.join(""), cy + R + 20, caps);
  }
  if (spec.op === "add" || spec.op === "mul") {
    const m = intOf(spec.m, w, 2, 16);
    const mul = spec.op === "mul";
    const cs = Math.min(34, Math.floor((W - 40) / (m + 1)));
    const x0 = (W - cs * (m + 1)) / 2;
    const parts: string[] = [];
    const units = Array.from({ length: m }, (_, i) => i).filter((i) => gcd(i, m) === 1);
    const zeroDivs = mul ? Array.from({ length: m - 1 }, (_, i) => i + 1).filter((i) => gcd(i, m) > 1) : [];
    parts.push(txt(x0 + cs / 2, 20, mul ? "×" : "+", { size: 16, anchor: "middle", bold: true, color: C.purple }));
    for (let i = 0; i < m; i++) {
      const headRole: Role = mul ? (units.includes(i) ? "key" : "idle") : "key";
      parts.push(cell(x0 + (i + 1) * cs + 1, 1, cs - 2, cs - 2, String(i), headRole, 13, true));
      parts.push(cell(x0 + 1, (i + 1) * cs + 1, cs - 2, cs - 2, String(i), headRole, 13, true));
      for (let j = 0; j < m; j++) {
        const v = mul ? (i * j) % m : (i + j) % m;
        const role: Role = mul ? (v === 1 ? "sorted" : v === 0 && i && j ? "min" : "plain") : v === 0 ? "sorted" : "plain";
        parts.push(cell(x0 + (j + 1) * cs + 1, (i + 1) * cs + 1, cs - 2, cs - 2, String(v), role, 13, role === "sorted"));
      }
    }
    const h = (m + 1) * cs;
    if (mul) {
      caps.push({ text: fill(w.units, { list: units.join(", "), c: units.length, m }), color: C.blue });
      if (zeroDivs.length) caps.push({ text: fill(w.zeroDiv, { list: zeroDivs.join(", ") }), color: C.red });
      else caps.push({ text: fill(w.field, { m }), color: C.green });
    } else caps.push({ text: w.addInfo, color: C.blue });
    return compose(`\\left(\\mathbb{Z}_{${m}},\\ ${mul ? "\\times" : "+"}\\right)`, parts.join(""), h + 4, caps);
  }
  const m = intOf(spec.m, w, 2, 1e12);
  const a = intOf(spec.a, w, 0, 1e12);
  if (spec.op === "power") {
    const k = intOf(spec.k, w, 0, 1e15);
    const M = big(m);
    const bits = k.toString(2);
    const rows: TRow[] = [];
    let sq = bmod(big(a), M);
    let res = 1n % M;
    let muls = 0;
    for (let i = 0; i < bits.length; i++) {
      const bit = bits[bits.length - 1 - i] === "1";
      if (bit) (res = (res * sq) % M), muls++;
      rows.push({
        cells: [String(i), `2${sups(i)} = ${nt(2 ** i)}`, bit ? "1" : "0", String(sq), bit ? String(res) : "—"],
        colors: [C.grey, C.ink, bit ? C.green : C.grey, C.ink, bit ? C.blue : C.grey],
        bold: [false, false, bit, false, bit],
        fills: bit ? [undefined, undefined, ROLES.sorted.fill, undefined, undefined] : undefined,
      });
      sq = (sq * sq) % M;
    }
    const tb = table((W - 500) / 2, 0, [{ head: w.cols.i, w: 50 }, { head: "2ⁱ", w: 150 }, { head: w.cols.bit, w: 60 }, { head: `${a}^(2ⁱ) mod ${m}`, w: 130 }, { head: w.cols.result, w: 110 }], rows);
    caps.push({ text: fill(w.powerHow, { k, bin: bits, sq: Math.max(0, bits.length - 1), mul: muls, naive: Math.max(0, k - 1) }), color: C.blue });
    if (isPrime(m) && a % m !== 0) caps.push({ text: fill(w.fermat, { m, a, p: m - 1 }), color: "#495057" });
    else if (gcd(a, m) === 1 && m <= 1e12) caps.push({ text: fill(w.euler, { a, m, phi: phiOf(m) }), color: "#495057" });
    return compose(`${a}^{${k}} \\equiv ${res} \\pmod{${m}}`, tb.svg, tb.h + 4, caps);
  }
  // inverse
  const ar = mod(a, m);
  const ex = extended(m, ar);
  const rows: TRow[] = ex.rows.map((r, i) => {
    const last = i === ex.rows.length - 2;
    return {
      cells: [String(i), nt(r.r), r.q === null ? "" : String(r.q), nt(r.t)],
      colors: [C.grey, last ? C.green : C.ink, C.orange, last ? C.blue : C.ink],
      bold: [false, last, false, last],
    };
  });
  const tb = table((W - 380) / 2, 0, [{ head: w.cols.i, w: 50 }, { head: "r", w: 130 }, { head: "q", w: 80 }, { head: `s (× ${ar})`, w: 120 }], rows);
  if (ex.g !== 1) {
    caps.push({ text: fill(w.noInverse, { a, m, g: ex.g }), color: C.red });
    caps.push({ text: w.inverseInfo, color: "#495057" });
    return compose(`\\gcd(${a}, ${m}) = ${ex.g} \\ne 1`, tb.svg, tb.h + 4, caps);
  }
  const inv = mod(ex.t, m);
  const prod = big(a) * big(inv);
  caps.push({ text: fill(w.inverseOk, { a, x: inv, p: String(prod), q: String((prod - 1n) / big(m)), m }), color: C.green });
  caps.push({ text: w.inverseInfo, color: "#495057" });
  return compose(`${a}^{-1} \\equiv ${inv} \\pmod{${m}}`, tb.svg, tb.h + 4, caps);
}

// ---------- congruences ----------

function renderCrt(spec: CrtSpec, w: NtWords): RenderedSvg {
  const caps: Caption[] = [];
  if (spec.mode === "linear") {
    const m = intOf(spec.m, w, 2, 1e9);
    const a = mod(intOf(spec.a, w, -1e9, 1e9), m);
    const b = mod(intOf(spec.b, w, -1e9, 1e9), m);
    const g = gcd(a, m);
    const lines: { tex: string; color?: string }[] = [{ tex: `\\gcd(${a}, ${m}) = ${g}` }];
    let sols: number[] = [];
    if (b % g !== 0) {
      lines.push({ tex: `${g} \\nmid ${b}`, color: C.red });
      caps.push({ text: fill(w.linNone, { a, m, g, b }), color: C.red });
    } else {
      const [a1, b1, m1] = [a / g, b / g, m / g];
      if (g > 1) lines.push({ tex: `${a1}x \\equiv ${b1} \\pmod{${m1}}` });
      const inv = m1 === 1 ? 0 : Number(binv(big(a1), big(m1)));
      const x0 = Number(bmod(big(inv) * big(b1), big(m1)));
      if (m1 > 1) lines.push({ tex: `${a1}^{-1} \\equiv ${inv} \\pmod{${m1}} \\;\\Rightarrow\\; x \\equiv ${inv} \\cdot ${b1} \\equiv ${x0} \\pmod{${m1}}` });
      sols = Array.from({ length: Math.min(g, 20) }, (_, k) => x0 + k * m1);
      lines.push({ tex: `x \\equiv ${sols.join(",\\ ")}${g > 20 ? ",\\ \\ldots" : ""} \\pmod{${m}}`, color: C.green });
      caps.push({ text: fill(w.linSolutions, { g, m, list: sols.join(", ") + (g > 20 ? ", …" : "") }), color: C.green });
    }
    caps.push({ text: w.linInfo, color: "#495057" });
    const tl = texLines(lines, null, 14, 40);
    let body = tl.svg;
    let h = tl.h + 14;
    if (m <= 30) {
      // a·x mod m for every x: the hits are the solutions.
      const cw = Math.min(40, Math.floor((W - 80) / m));
      const x0 = (W - 60 - cw * m) / 2 + 60;
      const y = h + 16;
      body += txt(x0 - 8, y + 19, "x", { size: 13, anchor: "end", italic: true, bold: true, color: C.blue });
      body += txt(x0 - 8, y + 49, `${a}x`, { size: 13, anchor: "end", italic: true, bold: true, color: C.blue });
      for (let x = 0; x < m; x++) {
        const v = (a * x) % m;
        body += cell(x0 + x * cw + 1, y + 2, cw - 2, 26, String(x), sols.includes(x) ? "sorted" : "idle", 12);
        body += cell(x0 + x * cw + 1, y + 32, cw - 2, 26, String(v), v === b ? "sorted" : "plain", 12, v === b);
      }
      h = y + 62;
    }
    return compose(`${a}x \\equiv ${b} \\pmod{${m}}`, body, h, caps);
  }
  const parts = spec.system.split(/[,;\n]+|\band\b/).map((t) => t.trim()).filter(Boolean);
  if (!parts.length || parts.length > 5) throw new Error(fill(w.badCongruence, { s: spec.system }));
  const eqs = parts.map((p) => {
    const m = p.replace(/[−–]/g, "-").match(/^(?:x\s*[≡=]\s*)?(-?\d+)\s*(?:\(\s*mod\s*(\d+)\s*\)|mod\s*(\d+)|\(\s*(\d+)\s*\))$/i);
    if (!m) throw new Error(fill(w.badCongruence, { s: p }));
    const mm = Number(m[2] ?? m[3] ?? m[4]);
    if (mm < 2 || mm > 1e9) throw new Error(fill(w.badCongruence, { s: p }));
    return { r: mod(Number(m[1]), mm), m: mm };
  });
  const lines: { tex: string; color?: string }[] = [];
  let r = big(eqs[0].r);
  let M = big(eqs[0].m);
  let fail: string | null = null;
  for (const e of eqs.slice(1)) {
    const mi = big(e.m);
    const ri = big(e.r);
    const g = bgcd(M, mi);
    const lhs = bmod(M, mi);
    const rhs = bmod(ri - r, mi);
    lines.push({ tex: `x = ${r} + ${M}t: \\quad ${r} + ${M}t \\equiv ${ri} \\pmod{${mi}} \\;\\Rightarrow\\; ${lhs === 1n ? "" : lhs}t \\equiv ${rhs} \\pmod{${mi}}` });
    if (rhs % g !== 0n) {
      fail = fill(w.crtNone, { r1: String(r), m1: String(M), r2: String(ri), m2: String(mi) });
      lines.push({ tex: `\\gcd(${lhs}, ${mi}) = ${g} \\nmid ${rhs}`, color: C.red });
      break;
    }
    const m2 = mi / g;
    const t = m2 === 1n ? 0n : bmod((rhs / g) * binv(lhs / g, m2), m2);
    const newM = (M / g) * mi;
    const newR = bmod(r + M * t, newM);
    lines.push({ tex: `t \\equiv ${t} \\pmod{${m2}} \\;\\Rightarrow\\; x \\equiv ${r} + ${M} \\cdot ${t} \\equiv ${newR} \\pmod{${newM}}`, color: C.blue });
    [r, M] = [newR, newM];
  }
  const sys = eqs.map((e) => `x \\equiv ${e.r} \\pmod{${e.m}}`).join(",\\quad ");
  const tl = texLines(lines, null, 14, 38, lines.some((l) => l.tex.length > 110) ? 0.8 : 0.9);
  let body = tl.svg;
  let h = tl.h + 14;
  if (!fail && M <= 240n) {
    // One row per congruence: its numbers in 0 … M − 1, the common one highlighted.
    const Mn = Number(M);
    const rn = Number(r);
    const x0 = 150;
    const span = W - x0 - 24;
    const sx = (x: number) => x0 + (x / (Mn - 1 || 1)) * span;
    const y0 = h + 20;
    body += `<rect x="${r2(sx(rn) - 6)}" y="${y0 - 4}" width="12" height="${eqs.length * 30 + 22}" rx="4" fill="${ROLES.sorted.fill}" stroke="${C.green}"/>`;
    eqs.forEach((e, i) => {
      const y = y0 + i * 30 + 10;
      body += txt(x0 - 14, y + 4, `x ≡ ${e.r} (mod ${e.m})`, { size: 12.5, anchor: "end", color: PCOL[i].s, bold: true });
      body += `<line x1="${x0}" y1="${y}" x2="${x0 + span}" y2="${y}" stroke="#dee2e6"/>`;
      for (let x = e.r; x < Mn; x += e.m) body += `<circle cx="${r2(sx(x))}" cy="${y}" r="${x === rn ? 5 : 3.2}" fill="${PCOL[i].s}"/>`;
    });
    const ya = y0 + eqs.length * 30 + 10;
    body += txt(sx(0), ya + 4, "0", { size: 11, anchor: "middle", color: C.grey }) + txt(sx(Mn - 1), ya + 4, String(Mn - 1), { size: 11, anchor: "middle", color: C.grey });
    body += txt(sx(rn), ya + 4, String(rn), { size: 12, anchor: "middle", color: C.green, bold: true });
    h = ya + 14;
  }
  if (fail) caps.push({ text: fail, color: C.red });
  else caps.push({ text: fill(w.crtResult, { r: String(r), M: String(M) }), color: C.green });
  caps.push({ text: w.crtInfo, color: "#495057" });
  return compose(fail ? sys : `${sys} \\;\\Longrightarrow\\; x \\equiv ${r} \\pmod{${M}}`, body, h, caps);
}

// ---------- bases ----------

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function renderBases(spec: BaseSpec, w: NtWords): RenderedSvg {
  const from = intOf(spec.from, w, 2, 36);
  const to = intOf(spec.to, w, 2, 36);
  const s = spec.n.trim().toUpperCase().replace(/\s+/g, "");
  if (!s || s.length > 40 || [...s].some((ch) => DIGITS.indexOf(ch) < 0 || DIGITS.indexOf(ch) >= from)) throw new Error(fill(w.badDigits, { s: spec.n, b: from }));
  let v = 0n;
  for (const ch of s) v = v * big(from) + big(DIGITS.indexOf(ch));
  if (v > big(Number.MAX_SAFE_INTEGER)) throw new Error(fill(w.tooBig, { max: nt(Number.MAX_SAFE_INTEGER) }));
  const value = Number(v);
  const lines: { tex: string; color?: string }[] = [];
  const mt = (x: string) => `\\mathtt{${x}}`;
  if (from !== 10 && s.length <= 12) {
    const terms = [...s].map((ch, i) => `${DIGITS.indexOf(ch)} \\cdot ${from}^{${s.length - 1 - i}}`);
    lines.push({ tex: `${mt(s)}_{${from}} = ${terms.join(" + ")} = ${value}` });
  }
  // Repeated division by the target base.
  const rows: TRow[] = [];
  const digits: string[] = [];
  for (let x = value; ; ) {
    const q = Math.floor(x / to);
    const r = x - q * to;
    digits.push(DIGITS[r]);
    rows.push({ cells: [`${x} ÷ ${to}`, String(q), String(r), DIGITS[r]], colors: [C.ink, C.ink, C.orange, C.green], bold: [false, false, true, true] });
    x = q;
    if (!x) break;
  }
  const out = digits.slice().reverse().join("");
  const parts: string[] = [];
  let y = 0;
  if (lines.length) {
    const tl = texLines(lines, null, 14, 36, s.length > 8 ? 0.8 : 0.95);
    parts.push(tl.svg);
    y = tl.h + 20;
  }
  if (to !== 10) {
    const cols = [{ head: "n ÷ " + to, w: 170 }, { head: w.cols.quotient, w: 110 }, { head: w.cols.remainder, w: 110 }, { head: w.cols.digit, w: 80 }];
    const tx = (W - 470) / 2 - 20;
    const tb = table(tx, y, cols, rows, 25);
    parts.push(tb.svg);
    // Arrow: read the remainders upwards.
    const ax = tx + 470 + 22;
    parts.push(
      `<defs><marker id="base-ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${C.green}"/></marker></defs>`,
      `<line x1="${ax}" y1="${y + tb.h - 8}" x2="${ax}" y2="${y + 32}" stroke="${C.green}" stroke-width="2.5" marker-end="url(#base-ah)"/>`,
    );
    y += tb.h + 22;
    parts.push(txt(W / 2, y - 6, w.readUp, { size: 12.5, anchor: "middle", color: C.green, italic: true }));
    y += 10;
  }
  // The result's place values.
  const n = out.length;
  const bw = Math.min(64, Math.floor((W - 32) / n));
  const bx = (W - bw * n) / 2;
  for (let i = 0; i < n; i++) {
    const p = n - 1 - i;
    const pv = to ** p;
    parts.push(txt(bx + i * bw + bw / 2, y + 12, bw >= 44 && pv < 1e6 ? `${pv}` : `${to}${sups(p)}`, { size: 10.5, anchor: "middle", color: C.grey }));
    parts.push(cell(bx + i * bw + 2, y + 18, bw - 4, 34, out[i], "sorted", Math.min(17, bw * 0.45), true));
  }
  y += 58;
  const caps: Caption[] = [{ text: fill(from === 10 || to === 10 ? w.baseResultShort : w.baseResult, { n: s, from, v: value, out, to }), color: C.green }, { text: to === 10 ? fill(w.baseInfo10, { from }) : fill(w.baseInfo, { to }), color: "#495057" }];
  const k = (x: number, y2: number) => {
    for (let e = 2; x ** e <= y2; e++) if (x ** e === y2) return e;
    return 0;
  };
  const [small, bigB] = from < to ? [from, to] : [to, from];
  const e = k(small, bigB);
  if (e) caps.push({ text: fill(w.grouping, { big: bigB, small, k: e }), color: C.blue });
  const head = [`${mt(s)}_{${from}}`, ...(from !== 10 && to !== 10 ? [`${value}_{10}`] : []), `${mt(out)}_{${to}}`];
  return compose(head.join(" = "), parts.join(""), y, caps);
}

export function renderNt(spec: NtSpec, words: NtWords): RenderedSvg {
  switch (spec.topic) {
    case "sieve":
      return renderSieve(spec, words);
    case "factor":
      return renderFactor(spec, words);
    case "gcd":
      return renderGcd(spec, words);
    case "mod":
      return renderMod(spec, words);
    case "crt":
      return renderCrt(spec, words);
    case "bases":
      return renderBases(spec, words);
  }
}
