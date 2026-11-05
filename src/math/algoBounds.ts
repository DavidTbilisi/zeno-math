// Asymptotic notation for the Algorithms tool (Growth → Big O & co.): is f(n) = O, Ω, Θ, o or ω of g(n)? The two
// functions are formulas in n. Their ratio f/g, followed far out, settles the question (→ 0, → a constant, → ∞);
// then the definition is shown with its witnesses: for O, Ω and Θ the constant c and the n₀ from which f stays under
// (over, between) c·g, drawn on the graph; for o and ω, which must work for every c, the ratio itself against a few
// c's, each with its own n₀. A relation that fails is drawn too, with the place where f breaks out.
import { compile } from "mathjs";
import type { AlgoWords, GrowthSpec } from "./algo";
import { parseNum, table } from "./algoArrays";
import { axes, C, compose, curve, fill, lbl, makeFrame, nt, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

export type Bound = "O" | "Omega" | "Theta" | "o" | "omega";
export const BOUNDS: Bound[] = ["O", "Omega", "Theta", "o", "omega"];
/** How f compares with g for large n: f/g → 0, → a positive constant, or → ∞. */
export type Trend = "less" | "same" | "more";

export const BOUND_TEX: Record<Bound, string> = { O: "O", Omega: "\\Omega", Theta: "\\Theta", o: "o", omega: "\\omega" };
export const BOUND_SIGN: Record<Bound, string> = { O: "O", Omega: "Ω", Theta: "Θ", o: "o", omega: "ω" };
const HOLDS: Record<Trend, Bound[]> = { less: ["O", "o"], same: ["O", "Omega", "Theta"], more: ["Omega", "omega"] };

export const DEFAULT_BOUND = { f: "3n^2 + 5n + 20", g: "n^2", rel: "O" as Bound, c: "" };

/**
 * A formula in n as a function, the way algorithms books write them: log n is log₂ n (lg too), ln is the natural log,
 * n! the factorial, 3n² is 3·n², √n is sqrt(n).
 */
export function fnOf(src: string, bad: string): (n: number) => number {
  const s = src
    .replace(/²/g, "^2").replace(/³/g, "^3").replace(/·|×/g, "*").replace(/√\s*\(/g, "sqrt(").replace(/√\s*([a-z0-9.]+)/g, "sqrt($1)")
    .replace(/\blog\s*_?\s*2\s*\(/g, "log2(").replace(/\b(?:lg|log)\s*\(/g, "log2(").replace(/\b(?:lg|log)\s+([a-z0-9.]+)/g, "log2($1)")
    .replace(/\bln\s*\(/g, "log(").replace(/\bln\s+([a-z0-9.]+)/g, "log($1)");
  let code;
  try {
    code = compile(s);
    const v = code.evaluate({ n: 7.5 });
    if (typeof v !== "number") throw new Error(bad);
  } catch {
    throw new Error(fill(bad, { s: src }));
  }
  return (n: number) => {
    try {
      const v = code.evaluate({ n });
      return typeof v === "number" ? v : NaN;
    } catch {
      return NaN;
    }
  };
}

/** f/g followed out along n = 16, 32, 64, … while both are finite numbers. */
export function trendOf(f: (n: number) => number, g: (n: number) => number): { trend: Trend; limit: number } {
  const pts: { n: number; r: number }[] = [];
  let over: Trend | null = null;
  for (let k = 4; k <= 40; k++) {
    const n = 2 ** k;
    const [fv, gv] = [f(n), g(n)];
    // One side too big for a number while the other is still finite says which way the ratio goes.
    if (!Number.isFinite(fv) || !Number.isFinite(gv)) {
      if (Number.isFinite(gv)) over = "more";
      else if (Number.isFinite(fv)) over = "less";
      break;
    }
    if (gv > 0 && fv >= 0) pts.push({ n, r: fv / gv });
  }
  // One side past what a number holds while the other is not: that settles it (n¹⁰⁰ is huge at n = 512, yet 2ⁿ is
  // the one to overflow first).
  if (over) return { trend: over, limit: over === "more" ? Infinity : 0 };
  if (pts.length < 2) return { trend: "same", limit: pts[0]?.r ?? 1 };
  // The ratio far out against the ratio at √(that n): by then lower-order terms (−3n beside n²/2) have died away, while
  // log n, the slowest growth that counts here, still doubles from √n to n.
  const last = pts[pts.length - 1];
  const half = Math.log2(last.n) / 2;
  const mid = pts.reduce((best, p) => (Math.abs(Math.log2(p.n) - half) < Math.abs(Math.log2(best.n) - half) ? p : best), pts[0]);
  const near = mid.r;
  const far = last.r;
  if (over === "more" || far > near * 1.5 || (near === 0 && far > 0)) return { trend: "more", limit: Infinity };
  if (over === "less" || far < near / 1.5) return { trend: "less", limit: 0 };
  return { trend: "same", limit: far };
}

/** A round number at or above (up) or at or below (down) v: 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10 × a power of ten. */
export function roundC(v: number, up: boolean): number {
  if (!(v > 0) || !Number.isFinite(v)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const m = v / p;
  const pick = up ? steps.find((s) => s >= m - 1e-9)! : [...steps].reverse().find((s) => s <= m + 1e-9)!;
  return pick * p;
}

const SCAN = 4096;
/**
 * The least n₀ from which ok(n) holds for every whole n ≥ n₀ (checked one by one up to 4096, then at doubling n);
 * null when it still fails far out.
 */
export function firstFrom(ok: (n: number) => boolean): number | null {
  // Far out first: failing at the far end means never; failing only part-way, the next doubling n is an n₀.
  let farFail = 0;
  for (let k = 13; k <= 40; k++) if (!ok(2 ** k)) farFail = k;
  if (farFail === 40) return null;
  if (farFail) return 2 ** (farFail + 1);
  let last = 0;
  for (let n = 1; n <= SCAN; n++) if (!ok(n)) last = n;
  return last + 1;
}

export function renderBounds(spec: GrowthSpec, w: AlgoWords): RenderedSvg {
  const b = w.bounds;
  const fSrc = (spec.f ?? DEFAULT_BOUND.f).trim();
  const gSrc = (spec.g ?? DEFAULT_BOUND.g).trim();
  const rel = spec.rel ?? DEFAULT_BOUND.rel;
  const f = fnOf(fSrc, b.badFormula);
  const g = fnOf(gSrc, b.badFormula);
  for (const [h, src] of [[f, fSrc], [g, gSrc]] as const) {
    const far = [64, 256, 1024].map(h).filter(Number.isFinite);
    if (!far.length || far.some((v) => v <= 0)) throw new Error(fill(b.notPositive, { s: src }));
  }
  const { trend, limit } = trendOf(f, g);
  const holds = HOLDS[trend].includes(rel);
  const userC = spec.c?.trim() ? parseNum(spec.c, w, (v) => v > 0) : null;
  const want = spec.n?.trim() ? parseNum(spec.n, w, (v) => Number.isInteger(v) && v >= 4 && v <= 10000) : 20;
  const fTex = texOf(fSrc);
  const gTex = texOf(gSrc);
  const sign = BOUND_SIGN[rel];
  const caps: Caption[] = [];
  const lim = trend === "same" ? nt(limit, 3) : trend === "less" ? "0" : "∞";
  const all = HOLDS[trend].map((x) => `${BOUND_SIGN[x]}(g)`).join(", ");
  let body = "";
  let h = 0;

  if (rel === "o" || rel === "omega") {
    // For every c: the ratio f/g against three c's, each crossing marked with its n₀.
    const small = rel === "o";
    const base = trendAt(f, g, 16);
    // Near the ratio at n = 16, so even a slow one (log n) gets past them within reach.
    const cs = [...new Set((small ? [0.8, 0.6, 0.4] : [1.25, 1.5, 2]).map((k) => roundC(Math.max(base, 1e-9) * k, !small)))];
    const n0s = cs.map((c) => firstFrom((n) => (small ? f(n) < c * g(n) : f(n) > c * g(n))));
    const reach = Math.max(...n0s.map((x) => x ?? 0));
    const N = Math.min(Math.max(want, Math.ceil(reach * 1.4) + 2), 4096);
    const ratio = (n: number) => f(n) / g(n);
    const top = Math.max(...cs) * 1.6;
    const yMax = Math.max(top, ...sampleMax(ratio, 1, N, Infinity).filter((v) => v < top * 4));
    const fr = makeFrame("bound-ratio", 56, 8, W - 56 - 20, 260, [1, N], [0, yMax]);
    body += axes(fr, { integerX: true, xAtBottom: true });
    const tones = [C.orange, C.purple, C.green];
    cs.forEach((c, i) => {
      body += `<line x1="${fr.left}" y1="${r2(fr.sy(c))}" x2="${fr.right}" y2="${r2(fr.sy(c))}" stroke="${tones[i]}" stroke-width="1.6" stroke-dasharray="6 4"/>`;
      body += lbl(fr.left + 6, fr.sy(c) - 5, `c = ${nt(c, 3)}`, tones[i], "start", 12, false);
      const n0 = n0s[i];
      if (holds && n0 !== null && n0 <= N) {
        body += `<line x1="${r2(fr.sx(n0))}" y1="${r2(fr.sy(c))}" x2="${r2(fr.sx(n0))}" y2="${fr.bottom}" stroke="${tones[i]}" stroke-width="1.2" stroke-dasharray="2 3"/>`;
        body += `<circle cx="${r2(fr.sx(n0))}" cy="${r2(fr.sy(c))}" r="4" fill="${tones[i]}"/>`;
      }
    });
    body += curve(fr, ratio, C.blue, 2.6);
    body += lbl(fr.right - 6, fr.top + 16, `f(n) / g(n)`, C.blue, "end", 13, false);
    h = fr.bottom + 22;
    const tb = table(16, h, [{ head: "c", w: 120 }, { head: "n₀", w: 140 }, { head: small ? b.cols.below : b.cols.above, w: W - 32 - 260 }],
      cs.map((c, i) => ({ cells: [nt(c, 3), n0s[i] === null ? "—" : nt(n0s[i]!), n0s[i] === null ? b.never : fill(small ? b.belowFrom : b.aboveFrom, { c: nt(c, 3), n: nt(n0s[i]!) })], colors: [tones[i], tones[i], n0s[i] === null ? C.red : C.ink] })), 22);
    body += tb.svg;
    h += tb.h + 4;
    caps.push(holds ? { text: fill(small ? b.oHolds : b.omegaHolds, { s: sign }), color: C.green } : { text: fill(b.fails[rel], { s: sign, L: lim }), color: C.red });
  } else {
    // O, Ω, Θ: f against c·g (two of them for Θ), from n₀ on.
    const up = rel === "O";
    const L = trend === "same" ? limit : trend === "less" ? 0 : Infinity;
    // The constants: the one asked for, or a round one past the limit of f/g (where there is a limit).
    // f/g → 0 (for O) or → ∞ (for Ω): c = 1 does, as the textbooks take it; failing, c near f/g at n = 16 shows
    // where f breaks out.
    const at16 = Math.max(trendAt(f, g, 16), 1e-9);
    const autoHi = trend === "same" ? roundC(L * 1.25, true) : trend === "less" ? 1 : roundC(at16 * 1.25, true);
    const autoLo = trend === "same" ? roundC(L * 0.8, false) : trend === "more" ? 1 : roundC(at16 * 0.8, false);
    const lines: { c: number; above: boolean; color: string }[] =
      rel === "Theta" ? [{ c: autoLo, above: false, color: C.green }, { c: autoHi, above: true, color: C.orange }]
      : [{ c: userC ?? (up ? autoHi : autoLo), above: up, color: up ? C.orange : C.green }];
    const okAt = (n: number) => lines.every((l) => (l.above ? f(n) <= l.c * g(n) : f(n) >= l.c * g(n)));
    const n0 = firstFrom(okAt);
    // Where it fails: the n from which f is out of bounds for good, so the graph reaches it and shows the break.
    const out = n0 === null ? firstFrom((n) => !okAt(n)) : null;
    const reach = n0 ?? out ?? 0;
    const N = Math.min(Math.max(want, Math.ceil(reach * 1.6) + 2), 4096);
    const yMax = Math.max(...sampleMax(f, 1, N, Infinity), ...lines.flatMap((l) => sampleMax((n) => l.c * g(n), 1, N, Infinity))) * 1.08;
    const fr = makeFrame("bound-fg", 56, 8, W - 56 - 20, 260, [1, N], [0, yMax || 1]);
    body += axes(fr, { integerX: true, xAtBottom: true });
    if (n0 !== null && n0 <= N) {
      // From n₀ on the relation holds: shaded, with the n₀ line.
      body += `<rect x="${r2(fr.sx(n0))}" y="${fr.top}" width="${r2(fr.right - fr.sx(n0))}" height="${fr.bottom - fr.top}" fill="#d3f9d8" opacity="0.45"/>`;
      body += `<line x1="${r2(fr.sx(n0))}" y1="${fr.top}" x2="${r2(fr.sx(n0))}" y2="${fr.bottom}" stroke="${C.green}" stroke-width="1.6" stroke-dasharray="5 4"/>`;
      body += lbl(fr.sx(n0) + 5, fr.top + 14, `n₀ = ${nt(n0)}`, C.green, "start", 13, false);
    }
    if (out !== null && out <= N) {
      // From here on f is out of bounds for good: shaded red, with a line.
      body += `<rect x="${r2(fr.sx(out))}" y="${fr.top}" width="${r2(fr.right - fr.sx(out))}" height="${fr.bottom - fr.top}" fill="#ffe3e3" opacity="0.5"/>`;
      body += `<line x1="${r2(fr.sx(out))}" y1="${fr.top}" x2="${r2(fr.sx(out))}" y2="${fr.bottom}" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="5 4"/>`;
      body += lbl(fr.sx(out) + 5, fr.top + 14, fill(b.outFrom, { n: nt(out) }), C.red, "start", 13, false);
    }
    if (rel === "Theta") {
      // The band between c₁·g and c₂·g.
      const pts = (c: number) => Array.from({ length: 121 }, (_, i) => 1 + ((N - 1) * i) / 120).map((n) => [fr.sx(n), fr.sy(Math.min(c * g(n), yMax * 3))]);
      const lo = pts(lines[0].c);
      const hi = pts(lines[1].c).reverse();
      body += `<g clip-path="url(#${fr.id})"><polygon points="${[...lo, ...hi].map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ")}" fill="#fff3bf" opacity="0.7"/></g>`;
    }
    for (const l of lines) body += curve(fr, (n) => l.c * g(n), l.color, 2.2, `stroke-dasharray="7 4"`);
    body += curve(fr, f, C.blue, 2.6);
    // Labels at the right edge, spread apart.
    const tags = [{ y: f(N), text: "f(n)", color: C.blue }, ...lines.map((l) => ({ y: l.c * g(N), text: `${nt(l.c, 3)}·g(n)`, color: l.color }))]
      .map((t) => ({ ...t, py: Math.max(fr.top + 12, Math.min(fr.sy(Math.min(t.y, yMax)), fr.bottom - 4)) }))
      .sort((p, q) => q.py - p.py);
    let prev = Infinity;
    for (const t of tags) {
      t.py = Math.min(t.py, prev - 15);
      prev = t.py;
      body += lbl(fr.right - 6, t.py - 4, t.text, t.color, "end", 13, false);
    }
    h = fr.bottom + 22;
    // A few values, around n₀.
    const at = [...new Set([1, 2, Math.max(1, reach - 1) || 3, reach || 5, N].filter((n) => n >= 1 && n <= N))].sort((x, y) => x - y).slice(0, 5);
    const tb = table(16, h, [{ head: "n", w: 70 }, { head: "f(n)", w: 140 }, ...lines.map((l) => ({ head: `${nt(l.c, 3)}·g(n)`, w: 140 })), { head: "", w: W - 32 - 70 - 140 - 140 * lines.length }],
      at.map((n) => {
        const ok = okAt(n);
        // Big values whole, small ones to a few places.
        const show = (v: number) => nt(Math.abs(v) >= 100 ? Math.round(v) : v, 4);
        return { cells: [nt(n), show(f(n)), ...lines.map((l) => show(l.c * g(n))), ok ? "✓" : "✗"], colors: [C.grey, C.blue, ...lines.map((l) => l.color), ok ? C.green : C.red] };
      }), 22);
    body += tb.svg;
    h += tb.h + 4;
    const cText = rel === "Theta" ? `c₁ = ${nt(lines[0].c, 3)}, c₂ = ${nt(lines[1].c, 3)}` : `c = ${nt(lines[0].c, 3)}`;
    if (holds && n0 !== null) caps.push({ text: fill(b.holds[rel], { c: cText, n: nt(n0), c1: nt(lines[0].c, 3), c2: nt(lines[lines.length - 1].c, 3) }), color: C.green });
    else if (holds) caps.push({ text: fill(b.tooSmall, { c: cText }), color: C.orange });
    else caps.push({ text: fill(b.fails[rel], { s: sign, L: lim }), color: C.red });
  }
  caps.push({ text: fill(b.limit, { L: lim, all }), color: C.blue });
  caps.push({ text: b.info[rel], color: "#495057" });
  const R = BOUND_TEX[rel];
  const def: Record<Bound, string> = {
    O: `\\exists\\, c > 0,\\ n_0:\\ f(n) \\le c\\, g(n)\\ \\ \\forall n \\ge n_0`,
    Omega: `\\exists\\, c > 0,\\ n_0:\\ f(n) \\ge c\\, g(n)\\ \\ \\forall n \\ge n_0`,
    Theta: `\\exists\\, c_1, c_2 > 0,\\ n_0:\\ c_1 g(n) \\le f(n) \\le c_2\\, g(n)\\ \\ \\forall n \\ge n_0`,
    o: `\\forall\\, c > 0\\ \\exists\\, n_0:\\ f(n) < c\\, g(n)\\ \\ \\forall n \\ge n_0`,
    omega: `\\forall\\, c > 0\\ \\exists\\, n_0:\\ f(n) > c\\, g(n)\\ \\ \\forall n \\ge n_0`,
  };
  const tex = `${fTex} ${holds ? "=" : "\\ne"} ${R}\\!\\left(${gTex}\\right) \\qquad ${def[rel]}`;
  return compose(tex, body, h, caps);
}

/** f/g at one n (or at 1 if that isn't a number). */
function trendAt(f: (n: number) => number, g: (n: number) => number, n: number): number {
  const r = f(n) / g(n);
  return Number.isFinite(r) ? r : f(1) / g(1);
}

/** The values of h over [a, b], sampled, finite ones only (at most cap). */
function sampleMax(h: (n: number) => number, a: number, b: number, cap: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= 200; i++) {
    const v = h(a + ((b - a) * i) / 200);
    if (Number.isFinite(v) && v < cap) out.push(v);
  }
  return out.length ? [Math.max(...out)] : [1];
}

/** The formula as TeX, near enough for the heading: powers raised, log n as \log n, n! kept. */
function texOf(src: string): string {
  return src
    .replace(/²/g, "^2").replace(/³/g, "^3").replace(/\*\*/g, "^").replace(/\*|·|×/g, " \\cdot ")
    .replace(/\^\(([^()]*)\)/g, "^{$1}").replace(/\^([a-z0-9.]+)/g, "^{$1}")
    .replace(/sqrt\(([^()]*)\)|√\s*\(([^()]*)\)/g, (_, a, b2) => `\\sqrt{${a ?? b2}}`).replace(/√\s*([a-z0-9]+)/g, "\\sqrt{$1}")
    .replace(/\b(log2|lg|log|ln)\b/g, (m) => (m === "ln" ? "\\ln " : "\\log "))
    .replace(/\s+/g, " ")
    .trim();
}
