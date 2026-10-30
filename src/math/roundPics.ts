// The worked pictures for rounding and estimation.
// Rounding: the number's digits, the ones kept blue and the digit that decides orange (5 or more: up), the rounded
// number under them in the same columns (zeros that hold places orange); then a zoom on the number line from the
// rounded-down value to the rounded-up one, cut in ten, the halfway mark dashed, the number pinned and a green arrow
// to the nearer end. Estimating a product: that line for each number, to 1 significant figure. Bounds: the band of
// lengths that round to x, shaded, its lower end in (a dot) and its upper end out (a ring), the one asked green; a
// total's upper bound is that for one, n times over. Standard form: the point hops to just after the first digit that
// isn't 0, the hops counted: the power of ten. Multiplying in standard form: the numbers together, the powers together.
import { C, FONT, r2, texAt } from "./chart";

export type RoundSolution =
  /** m/10^p rounded to k decimal places (k < 0: tens, hundreds…). */
  | { pic: "round"; m: number; p: number; k: number }
  | { pic: "estimate"; x: number; y: number; x1: number; y1: number }
  /** A length x correct to unit: the lower or upper bound. */
  | { pic: "bound"; x: number; unit: number; low: boolean }
  /** n lengths each x to the nearest whole: the upper bound of the total. */
  | { pic: "boundTotal"; n: number; x: number }
  /** The number as written (text), and its power of ten in standard form. */
  | { pic: "std"; text: string; e: number }
  /** (a × 10^m1) × (b × 10^m2) = prod × 10^(m1 + m2) = mant × 10^e. */
  | { pic: "stdMul"; a: string; m1: number; b: string; m2: number; prod: string; mant: string; e: number };

type Block = { body: string; w: number; h: number };
const BLUE = { fill: "#a5d8ff", stroke: C.blue };
const ORANGE = { fill: "#ffd8a8", stroke: C.orange };
/** A number without floating dust. */
const tidy = (v: number) => String(Number(v.toPrecision(12)));

function text(x: number, y: number, s: string, size: number, color: string = C.ink, bold = false, anchor = "middle") {
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}"${bold ? ' font-weight="700"' : ""}>${s}</text>`;
}
/** An arrowhead at (x, y) pointing along (ux, uy). */
const head = (x: number, y: number, ux: number, uy: number, color: string) =>
  `<path d="M ${r2(x)} ${r2(y)} L ${r2(x - 10 * ux - 5 * uy)} ${r2(y - 10 * uy + 5 * ux)} L ${r2(x - 10 * ux + 5 * uy)} ${r2(y - 10 * uy - 5 * ux)} Z" fill="${color}"/>`;

export type RoundWork = {
  lo: number;
  hi: number;
  /** The rounded value, and the digit that decides (the first one dropped). */
  want: number;
  decider: number;
};

/** The two values either side at the rounding place (mantissas at p places), the answer and the deciding digit. */
export function roundWork(m: number, p: number, k: number): RoundWork {
  const step = 10 ** (p - k);
  const lo = Math.floor(m / step) * step;
  const decider = Math.floor((m - lo) / (step / 10));
  return { lo, hi: lo + step, want: decider >= 5 ? lo + step : lo, decider };
}

/**
 * The zoomed line from lo to hi, cut in ten, the halfway mark dashed, v pinned with its label above, a green arrow
 * from v to the nearer end, whose label is green. `left` labels the line (the estimate's "4.37 ≈ 4").
 */
function zoomLine(v: number, lo: number, hi: number, labels: { lo: string; hi: string; mid: string; v: string }, left = ""): Block {
  const [x0, len, y] = [left ? 150 : 40, 420, 46];
  const X = (t: number) => x0 + ((t - lo) / (hi - lo)) * len;
  const up = v - lo >= (hi - lo) / 2;
  const out: string[] = [];
  if (left) out.push(texAt(left, x0 - 24, y, "end", 0.85).svg);
  out.push(`<line x1="${x0 - 14}" y1="${y}" x2="${x0 + len + 14}" y2="${y}" stroke="${C.ink}" stroke-width="2"/>`);
  for (let j = 0; j <= 10; j++) {
    const x = x0 + (j * len) / 10;
    const big = j === 0 || j === 10;
    if (j === 5) out.push(`<line x1="${r2(x)}" y1="${y - 16}" x2="${r2(x)}" y2="${y + 16}" stroke="${C.purple}" stroke-width="1.6" stroke-dasharray="4 3"/>`);
    else out.push(`<line x1="${r2(x)}" y1="${y - (big ? 9 : 5)}" x2="${r2(x)}" y2="${y + (big ? 9 : 5)}" stroke="${C.ink}" stroke-width="${big ? 2 : 1.2}"/>`);
  }
  out.push(text(x0, y + 28, labels.lo, 15, up ? C.ink : C.green, true));
  out.push(text(x0 + len, y + 28, labels.hi, 15, up ? C.green : C.ink, true));
  out.push(text(x0 + len / 2, y + 30, labels.mid, 12, C.purple));
  const xv = X(v);
  out.push(`<line x1="${r2(xv)}" y1="${y - 26}" x2="${r2(xv)}" y2="${y}" stroke="${C.orange}" stroke-width="1.6"/>`);
  out.push(`<circle cx="${r2(xv)}" cy="${y}" r="5" fill="${C.orange}"/>`);
  out.push(text(xv, y - 32, labels.v, 15, C.orange, true));
  // To the nearer end, just under the line.
  const xe = up ? x0 + len : x0;
  const dir = up ? 1 : -1;
  if (Math.abs(xe - xv) > 14) {
    out.push(`<line x1="${r2(xv + dir * 6)}" y1="${y + 12}" x2="${r2(xe - dir * 10)}" y2="${y + 12}" stroke="${C.green}" stroke-width="2.4"/>`);
    out.push(head(xe, y + 12, dir, 0, C.green));
  }
  return { body: out.join(""), w: x0 + len + 50, h: y + 40 };
}

/** The digits of m/10^p in columns, kept ones blue, the decider orange; the rounded number under them, aligned. */
function digitsSvg(m: number, p: number, k: number): Block {
  const { want, decider } = roundWork(m, p, k);
  const s = (m / 10 ** p).toFixed(p);
  const r = (want / 10 ** p).toFixed(Math.max(0, Math.min(k, p)));
  /** Each digit of a written number with its place (10^place). */
  const places = (t: string) => {
    const [int, dec = ""] = t.split(".");
    return [...[...int].map((d, i) => ({ d, k: int.length - 1 - i })), ...[...dec].map((d, i) => ({ d, k: -1 - i }))];
  };
  const [ds, dr] = [places(s), places(r)];
  const top = Math.max(ds[0].k, dr[0].k);
  const cols = Array.from({ length: top + p + 1 }, (_, i) => top - i);
  const CW = 34;
  const x0 = 30;
  const colX = new Map<number, number>();
  cols.forEach((c, i) => colX.set(c, x0 + i * CW + (c < 0 ? 14 : 0) + CW / 2));
  const pointX = x0 + (top + 1) * CW + 7;
  const [yA, yB] = [40, 112];
  const out: string[] = [];
  const firstSig = ds.findIndex((x) => x.d !== "0");
  ds.forEach((x, i) => {
    const cx = colX.get(x.k)!;
    const kept = x.k >= -k && i >= firstSig;
    const decide = x.k === -k - 1;
    const c = decide ? ORANGE : kept ? BLUE : null;
    if (c) out.push(`<rect x="${r2(cx - 15)}" y="${yA - 26}" width="30" height="36" rx="5" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.6"/>`);
    out.push(text(cx, yA, x.d, 24, kept || decide ? C.ink : C.grey));
  });
  if (p > 0) out.push(`<circle cx="${r2(pointX)}" cy="${yA}" r="3" fill="${C.ink}"/>`);
  // What the deciding digit says: 5 or more goes up.
  const dx = colX.get(-k - 1)!;
  out.push(text(dx, yA + 30, decider >= 5 ? `${decider} ≥ 5 ↑` : `${decider} &lt; 5`, 14, C.orange, true));
  dr.forEach((x) => {
    const cx = colX.get(x.k)!;
    const held = x.k < -k;
    if (held) out.push(`<rect x="${r2(cx - 12)}" y="${yB - 25}" width="24" height="32" rx="6" fill="none" stroke="${C.orange}" stroke-width="1.5" stroke-dasharray="4 3"/>`);
    out.push(text(cx, yB, x.d, 24, held ? C.orange : C.green, !held));
  });
  if (r.includes(".")) out.push(`<circle cx="${r2(pointX)}" cy="${yB}" r="3" fill="${C.green}"/>`);
  out.push(text(x0 - 12, yB, "≈", 22, C.green, true));
  return { body: out.join(""), w: x0 + cols.length * CW + 30, h: yB + 14 };
}

/** The band of lengths that round to x (unit wide), its ends, the asked one green. */
function boundSvg(x: number, unit: number, low: boolean | null): Block {
  const [x0, len, y] = [40, 440, 54];
  const X = (v: number) => x0 + ((v - (x - unit)) / (2 * unit)) * len;
  const [a, b] = [x - unit / 2, x + unit / 2];
  const out: string[] = [];
  out.push(`<rect x="${r2(X(a))}" y="${y - 14}" width="${r2(X(b) - X(a))}" height="28" fill="${BLUE.fill}" opacity="0.7"/>`);
  out.push(`<line x1="${x0 - 14}" y1="${y}" x2="${x0 + len + 14}" y2="${y}" stroke="${C.ink}" stroke-width="2"/>`);
  for (const v of [x - unit, x + unit]) out.push(`<line x1="${r2(X(v))}" y1="${y - 6}" x2="${r2(X(v))}" y2="${y + 6}" stroke="${C.grey}" stroke-width="1.4"/>`, text(X(v), y + 28, tidy(v), 12, C.grey));
  out.push(`<line x1="${r2(X(x))}" y1="${y - 10}" x2="${r2(X(x))}" y2="${y + 10}" stroke="${C.blue}" stroke-width="2.4"/>`, text(X(x), y - 22, tidy(x), 17, C.blue, true));
  // Half a unit either side of x.
  for (const v of [a, b]) {
    const [x1, x2] = [X(x), X(v)];
    out.push(`<line x1="${r2(x1)}" y1="${y + 22}" x2="${r2(x2)}" y2="${y + 22}" stroke="${C.grey}" stroke-width="1.2"/>`, text((x1 + x2) / 2, y + 36, tidy(unit / 2), 11, C.grey));
  }
  const end = (v: number, isLow: boolean) => {
    const asked = low === isLow;
    const color = asked ? C.green : C.ink;
    out.push(`<circle cx="${r2(X(v))}" cy="${y}" r="6" fill="${isLow ? color : "#ffffff"}" stroke="${color}" stroke-width="2.4"/>`);
    out.push(text(X(v), y - 22, tidy(v), asked ? 17 : 14, color, true));
  };
  end(a, true);
  end(b, false);
  return { body: out.join(""), w: x0 + len + 40, h: y + 46 };
}

/** The point hopping to just after the first digit that isn't 0; the hops counted are the power of ten. */
function stdSvg(t: string, e: number): Block {
  const digits = t.replace(".", "");
  const from = t.includes(".") ? t.indexOf(".") : t.length;
  const first = [...digits].findIndex((d) => d !== "0");
  const to = first + 1;
  const last = digits.length - 1 - [...digits].reverse().findIndex((d) => d !== "0");
  const CW = 30;
  const x0 = 30;
  const [y, out] = [76, [] as string[]];
  const bx = (b: number) => x0 + b * CW;
  [...digits].forEach((d, i) => {
    const sig = i >= first && i <= last;
    if (sig) out.push(`<rect x="${r2(bx(i) + 2)}" y="${y - 26}" width="${CW - 4}" height="36" rx="5" fill="${BLUE.fill}" stroke="${BLUE.stroke}" stroke-width="1.4"/>`);
    out.push(text(bx(i) + CW / 2, y, d, 22, sig ? C.ink : C.grey));
  });
  // The hops, one place at a time, numbered.
  const dir = to < from ? -1 : 1;
  for (let h = 0; h < Math.abs(from - to); h++) {
    const [a, b] = [bx(from + dir * h), bx(from + dir * (h + 1))];
    const mid = (a + b) / 2;
    out.push(`<path d="M ${r2(a)} ${y - 30} Q ${r2(mid)} ${y - 52} ${r2(b)} ${y - 30}" fill="none" stroke="${C.purple}" stroke-width="1.8"/>`);
    out.push(text(mid, y - 46, String(h + 1), 11, C.purple, true));
  }
  out.push(`<circle cx="${r2(bx(from))}" cy="${y + 4}" r="4" fill="#ffffff" stroke="${C.grey}" stroke-width="2"/>`);
  out.push(`<circle cx="${r2(bx(to))}" cy="${y + 4}" r="4" fill="${C.green}"/>`);
  out.push(texAt(`\\times 10^{${e}}`, bx(digits.length) + 16, y - 8, "start", 1, C.green).svg);
  return { body: out.join(""), w: bx(digits.length) + 110, h: y + 18 };
}

/** The numbers together, the powers together, and the point moved on when the number reaches 10. */
function stdMulSvg(s: Extract<RoundSolution, { pic: "stdMul" }>): Block {
  const out: string[] = [];
  const tile = (x: number, y: number, w: number, tex: string, c: { fill: string; stroke: string }) => {
    out.push(`<rect x="${r2(x)}" y="${y - 20}" width="${w}" height="40" rx="6" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.6"/>`);
    out.push(texAt(tex, x + w / 2, y, "middle", 0.9).svg);
  };
  const y1 = 30;
  const xs = [30, 150, 270, 390];
  tile(xs[0], y1, 90, s.a, BLUE);
  tile(xs[1], y1, 90, `10^{${s.m1}}`, ORANGE);
  tile(xs[2], y1, 90, s.b, BLUE);
  tile(xs[3], y1, 90, `10^{${s.m2}}`, ORANGE);
  for (const x of [125, 245, 365]) out.push(texAt("\\times", x + 12, y1, "middle", 0.9).svg);
  const y2 = 130;
  const [gx1, gx2] = [30, 290];
  tile(gx1, y2, 230, `${s.a} \\times ${s.b} = ${s.prod}`, BLUE);
  tile(gx2, y2, 230, `10^{${s.m1} + ${s.m2 < 0 ? `(${s.m2})` : s.m2}} = 10^{${s.m1 + s.m2}}`, ORANGE);
  // The regrouping: each number down to the numbers, each power down to the powers.
  for (const [i, gx] of [[0, gx1], [2, gx1], [1, gx2], [3, gx2]] as const) {
    const c = i % 2 ? C.orange : C.blue;
    const [xa, xb] = [xs[i] + 45, gx + 115];
    const [ya, yb] = [y1 + 22, y2 - 22];
    const len = Math.hypot(xb - xa, yb - ya);
    out.push(`<line x1="${xa}" y1="${ya}" x2="${r2(xb - ((xb - xa) / len) * 10)}" y2="${r2(yb - ((yb - ya) / len) * 10)}" stroke="${c}" stroke-width="1.8"/>`, head(xb, yb, (xb - xa) / len, (yb - ya) / len, c));
  }
  const y3 = 200;
  const moved = s.prod !== s.mant;
  out.push(texAt(`${moved ? `${s.prod} \\times 10^{${s.m1 + s.m2}} = ` : ""}${s.mant} \\times 10^{${s.e}}`, 275, y3, "middle", 1.05, C.green).svg);
  return { body: out.join(""), w: 550, h: y3 + 24 };
}

/** The pictures for one question, top to bottom. */
function blocks(s: RoundSolution): Block[] {
  if (s.pic === "round") {
    const { lo, hi } = roundWork(s.m, s.p, s.k);
    const f = (v: number, k: number) => (v / 10 ** s.p).toFixed(Math.max(0, Math.min(k, s.p)));
    const step = hi - lo;
    return [digitsSvg(s.m, s.p, s.k), zoomLine(s.m, lo, hi, { lo: f(lo, s.k), hi: f(hi, s.k), mid: f(lo + step / 2, s.k + 1), v: f(s.m, s.p) })];
  }
  if (s.pic === "estimate") {
    // Each number between its two values to 1 significant figure.
    const line = (v: number, v1: number) => {
      const e = 10 ** Math.floor(Math.log10(v));
      const lo = Math.floor(v / e) * e;
      const hi = lo + e;
      return zoomLine(v, lo, hi, { lo: tidy(lo), hi: tidy(hi), mid: tidy(lo + e / 2), v: tidy(v) }, `${tidy(v)} \\approx ${tidy(v1)}`);
    };
    return [line(s.x, s.x1), line(s.y, s.y1)];
  }
  if (s.pic === "bound") return [boundSvg(s.x, s.unit, s.low)];
  if (s.pic === "boundTotal") {
    // One length's band, then that upper bound n times over.
    const each = s.x + 0.5;
    const pw = Math.min(56, 440 / s.n);
    const out: string[] = [];
    for (let i = 0; i < s.n; i++) {
      out.push(`<rect x="${r2(40 + i * pw)}" y="16" width="${r2(pw)}" height="36" fill="#b2f2bb" stroke="${C.green}" stroke-width="1.4"/>`);
      if (pw >= 30) out.push(text(40 + i * pw + pw / 2, 39, tidy(each), pw >= 40 ? 13 : 11, C.ink));
    }
    const end = 40 + s.n * pw;
    out.push(`<path d="M ${end + 8} 16 h 8 V 52 h -8" fill="none" stroke="${C.green}" stroke-width="2"/>`);
    out.push(text(end + 24, 40, `${s.n} × ${tidy(each)} = ${tidy(s.n * each)}`, 15, C.green, true, "start"));
    return [boundSvg(s.x, 1, false), { body: out.join(""), w: end + 200, h: 64 }];
  }
  if (s.pic === "std") return [stdSvg(s.text, s.e)];
  return [stdMulSvg(s)];
}

export function renderRound(spec: RoundSolution, steps: { svg: string; width: number; height: number } | null) {
  const bs = blocks(spec);
  const w = Math.max(...bs.map((b) => b.w + 20), steps?.width ?? 0);
  let y = 10;
  const parts = bs.map((b) => {
    const g = `<g transform="translate(${r2((w - b.w) / 2)} ${r2(y)})">${b.body}</g>`;
    y += b.h + 12;
    return g;
  });
  const h = y + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${r2(y)})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${r2(h)}" viewBox="0 0 ${w} ${r2(h)}"><rect width="${w}" height="${r2(h)}" fill="#ffffff"/><g ${FONT}>${parts.join("")}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
