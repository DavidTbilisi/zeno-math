// The worked pictures for the decimal questions, all on place-value columns headed 10, 1, 0.1, 0.01 with the point
// a red dashed line that never moves.
// Adding or subtracting: the two numbers with their points in one line, the zero a shorter number gets drawn orange,
// each carry or borrow marked (a borrowed-from digit crossed out with its new value above), and the answer green. Under
// it an open number line: a sum jumps from a by b's whole part, then by the rest; a difference counts up from b to a
// (to the next whole number, on to a's whole number, then to a), so the gap the jumps add up to is the answer.
// Times or divided by 10, 100, 1000 (and a measurement into the other unit): the number, then the answer, with an
// arrow from each digit to its new place: left for times, right for divided by, as many places as there are zeros.
// The zeros that hold places are orange; a zero at the end after the point is grey, since it can be dropped.
// Times or divided by one digit: equal jumps on a number line from 0, d jumps of x (times) or the whole cut into d
// equal jumps (divided by), the answer green.
import { C, FONT, r2 } from "./chart";

/** a op b, each a whole mantissa at P decimal places (36.5 at P = 2 is 3650), and the places each was written with. */
export type ColumnsSolution = { op: "+" | "-"; a: number; b: number; pa: number; pb: number; P: number };
/** m/10^p times or divided by 10^e, with the units before and after when it is a measurement. */
export type ShiftSolution = { m: number; p: number; e: number; times: boolean; units?: [string, string] };
/** m/10^p times d, or (m × d)/10^p divided by d. */
export type JumpsSolution = { m: number; p: number; d: number; times: boolean };
export type DecimalSolution = ({ pic: "columns" } & ColumnsSolution) | ({ pic: "shift" } & ShiftSolution) | ({ pic: "jumps" } & JumpsSolution);

/** The number a mantissa at P places stands for, written without trailing zeros. */
const tidy = (n: number, P: number) => String(Number((n / 10 ** P).toFixed(10)));
/** The digits before the point (at least 1). */
const intLen = (n: number, P: number) => String(Math.floor(n / 10 ** P)).length;
/** The digit in place 10^k. */
const digit = (n: number, P: number, k: number) => Math.floor(n / 10 ** (k + P)) % 10;

export type ColumnWork = {
  /** The places, left to right, as powers of ten: 1, 0, −1, −2 for tens to hundredths. */
  places: number[];
  result: number;
  /** For each place: the carry into it (a sum) or the top digit after borrowing (a difference), when it changed. */
  marks: Map<number, number>;
};

/** The column working: the answer, and the carries or borrows place by place from the right. */
export function columnWork(s: ColumnsSolution): ColumnWork {
  const result = s.op === "+" ? s.a + s.b : s.a - s.b;
  const I = Math.max(intLen(s.a, s.P), intLen(s.b, s.P), intLen(result, s.P));
  const places = Array.from({ length: I + s.P }, (_, i) => I - 1 - i);
  const marks = new Map<number, number>();
  let carry = 0;
  for (const k of [...places].reverse()) {
    const [t, d] = [digit(s.a, s.P, k), digit(s.b, s.P, k)];
    if (s.op === "+") {
      if (carry) marks.set(k, carry);
      carry = t + d + carry >= 10 ? 1 : 0;
    } else {
      let top = t - carry;
      carry = top < d ? 1 : 0;
      top += 10 * carry;
      if (top !== t) marks.set(k, top);
    }
  }
  return { places, result, marks };
}

/**
 * The stops on the open number line, first to last, and what the picture calls them: a sum goes from a, by b's whole
 * part, then by the rest; a difference counts up from b to the next whole number, to a's whole number, then to a.
 */
export function lineStops(s: ColumnsSolution): number[] {
  const one = 10 ** s.P;
  const [from, to] = s.op === "+" ? [s.a, s.a + s.b] : [s.b, s.a];
  const mids = s.op === "+" ? [s.a + Math.floor(s.b / one) * one] : [Math.ceil(s.b / one) * one, Math.floor(s.a / one) * one];
  const stops = [from];
  for (const m of mids) if (m > stops.at(-1)! && m < to) stops.push(m);
  stops.push(to);
  return stops;
}

const CW = 36;
const PW = 14;
const RH = 40;
const PLACE_TINT: Record<number, string> = { 3: "#f8f0fc", 2: "#f3f0ff", 1: "#e7f5ff", 0: "#ebfbee", [-1]: "#fff4e6", [-2]: "#fff0f6", [-3]: "#f8f9fa" };
type Block = { body: string; w: number; h: number };

function text(x: number, y: number, s: string, size: number, color: string = C.ink, extra = "") {
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="middle" fill="${color}"${extra}>${s}</text>`;
}
const BOLD = ' font-weight="700"';

/**
 * Place-value columns from x0 (places as powers of ten, left to right), tinted from yTop to yBottom, each headed by
 * what one in it is worth, with the gap for the point a red dashed line. Returns where each column's middle is.
 */
function placeColumns(out: string[], places: number[], x0: number, yHead: number, yBottom: number, cw = CW) {
  const colX = new Map<number, number>();
  let x = x0;
  for (const k of places) {
    if (k === -1) x += PW;
    colX.set(k, x + cw / 2);
    x += cw;
  }
  const pointX = x0 + places.filter((k) => k >= 0).length * cw + PW / 2;
  for (const k of places) {
    const cx = colX.get(k)!;
    const label = k >= 0 ? String(10 ** k) : (10 ** k).toFixed(-k);
    out.push(`<rect x="${r2(cx - cw / 2 + 1)}" y="${yHead + 8}" width="${cw - 2}" height="${yBottom - yHead - 8}" rx="4" fill="${PLACE_TINT[Math.max(-3, Math.min(3, k))]}"/>`);
    out.push(text(cx, yHead, label, r2(Math.min(13, (cw - 4) / (label.length * 0.56))), C.grey));
  }
  out.push(`<line x1="${r2(pointX)}" y1="${yHead + 8}" x2="${r2(pointX)}" y2="${yBottom}" stroke="${C.red}" stroke-width="1.5" stroke-dasharray="4 4"/>`);
  return { colX, pointX, right: x };
}

/** A digit in a dashed orange box: a zero put in to hold a place. */
const held = (cx: number, y: number) => `<rect x="${r2(cx - 12)}" y="${y - 25}" width="24" height="32" rx="6" fill="none" stroke="${C.orange}" stroke-width="1.5" stroke-dasharray="4 3"/>`;

/** The columns: headers, the carry or borrow row, a, op b, the rule, the answer. */
function columnsSvg(s: ColumnsSolution): Block {
  const { places, result, marks } = columnWork(s);
  const x0 = 34;
  const [yHead, yMark, yA, yB] = [16, 44, 44 + RH, 44 + 2 * RH];
  const yRule = yB + 12;
  const yRes = yRule + RH;
  const out: string[] = [];
  const { colX, pointX, right } = placeColumns(out, places, x0, yHead, yRes + 10);
  const row = (n: number, places0: number, y: number, color: string, crossed: boolean) => {
    const top = Math.max(intLen(n, s.P), 1) - 1;
    for (const k of places) {
      if (k > top) continue;
      const cx = colX.get(k)!;
      const pad = k < -places0;
      if (pad) out.push(held(cx, y));
      out.push(text(cx, y, String(digit(n, s.P, k)), 26, pad ? C.orange : color));
      if (crossed && marks.has(k)) out.push(`<line x1="${r2(cx - 9)}" y1="${y + 2}" x2="${r2(cx + 9)}" y2="${y - 22}" stroke="${C.red}" stroke-width="2"/>`);
    }
    out.push(`<circle cx="${r2(pointX)}" cy="${y}" r="3" fill="${color}"/>`);
  };
  for (const [k, v] of marks) out.push(text(colX.get(k)!, yMark, String(v), 15, C.red, BOLD));
  row(s.a, s.pa, yA, C.ink, s.op === "-");
  row(s.b, s.pb, yB, C.ink, false);
  out.push(text(x0 - 18, yB, s.op === "+" ? "+" : "−", 26));
  out.push(`<line x1="${x0 - 30}" y1="${yRule}" x2="${r2(right - 4)}" y2="${yRule}" stroke="${C.ink}" stroke-width="2"/>`);
  row(result, s.P, yRes, C.green, false);
  return { body: out.join(""), w: right + 10, h: yRes + 16 };
}

/** A jump from x1 to x2 above a line at y: an arc with its arrowhead, and its label over the top. */
function jump(x1: number, x2: number, y: number, label: string, color: string) {
  const mid = (x1 + x2) / 2;
  // The arrowhead along the curve's last direction (from the control point to the end).
  const [dx, dy] = [x2 - mid, 50];
  const len = Math.hypot(dx, dy);
  const [ux, uy] = [dx / len, dy / len];
  const [bx, by] = [x2 - 10 * ux, y - 2 - 10 * uy];
  return (
    `<path d="M ${r2(x1)} ${y - 2} Q ${r2(mid)} ${y - 52} ${r2(x2)} ${y - 2}" fill="none" stroke="${C.purple}" stroke-width="2"/>` +
    `<path d="M ${r2(x2)} ${y - 2} L ${r2(bx - 5 * uy)} ${r2(by + 5 * ux)} L ${r2(bx + 5 * uy)} ${r2(by - 5 * ux)} Z" fill="${C.purple}"/>` +
    text(mid, y - 34, label, 15, color, BOLD)
  );
}
const tick = (x: number, y: number) => `<line x1="${r2(x)}" y1="${y - 7}" x2="${r2(x)}" y2="${y + 7}" stroke="${C.ink}" stroke-width="2"/>`;
const axis = (x1: number, x2: number, y: number) => `<line x1="${r2(x1 - 16)}" y1="${y}" x2="${r2(x2 + 16)}" y2="${y}" stroke="${C.ink}" stroke-width="2"/>`;

/** The open number line (not to scale: each jump at least wide enough for its label), with the jumps and the total. */
function lineSvg(s: ColumnsSolution, width: number): Block {
  const stops = lineStops(s);
  const jumps = stops.slice(1).map((v, i) => v - stops[i]);
  const total = stops.at(-1)! - stops[0];
  const MIN = 84;
  const span = Math.max(width - 60, MIN * jumps.length);
  const free = span - MIN * jumps.length;
  const xs = [30];
  for (const j of jumps) xs.push(xs.at(-1)! + MIN + (free * j) / total);
  const yLine = 70;
  const out: string[] = [axis(xs[0], xs.at(-1)!, yLine)];
  jumps.forEach((j, i) => out.push(jump(xs[i], xs[i + 1], yLine, `+${tidy(j, s.P)}`, C.purple)));
  stops.forEach((v, i) => {
    out.push(tick(xs[i], yLine));
    const [first, last] = [i === 0, i === stops.length - 1];
    // A sum's answer is where the jumps end: green.
    const color = last && s.op === "+" ? C.green : first || last ? C.ink : C.grey;
    out.push(text(xs[i], yLine + 25, tidy(v, s.P), last && s.op === "+" ? 18 : 15, color, first || last ? BOLD : ""));
  });
  // A difference is the whole gap: a green bracket under it with the answer.
  if (s.op === "-") {
    const yb = yLine + 40;
    out.push(`<path d="M ${r2(xs[0])} ${yb} v 8 H ${r2(xs.at(-1)!)} v -8" fill="none" stroke="${C.green}" stroke-width="2"/>`);
    out.push(text((xs[0] + xs.at(-1)!) / 2, yb + 30, tidy(total, s.P), 18, C.green, BOLD));
    return { body: out.join(""), w: width, h: yb + 42 };
  }
  return { body: out.join(""), w: width, h: yLine + 40 };
}

export type ShiftWork = {
  /** The places, left to right, as powers of ten. */
  places: number[];
  /** The places the digits of m stand in, last digit first, before and after. */
  from: number[];
  to: number[];
  /** The answer's digit in each place it is written in, and how: a digit of m, a zero holding a place, a zero to drop. */
  answer: Map<number, { d: number; how: "moved" | "held" | "dropped" }>;
};

/** Where each digit of m goes: up e places for times, down e for divided by; the zeros that hold places, and those that can go. */
export function shiftWork(s: ShiftSolution): ShiftWork {
  const digits = [...String(s.m)].reverse().map(Number);
  const by = s.times ? s.e : -s.e;
  const from = digits.map((_, i) => i - s.p);
  const to = from.map((k) => k + by);
  const answer: ShiftWork["answer"] = new Map();
  digits.forEach((d, i) => answer.set(to[i], { d, how: "moved" }));
  // Zeros between the digits and the point, either side.
  for (let k = to[0] - 1; k >= 0; k--) answer.set(k, { d: 0, how: "held" });
  for (let k = to.at(-1)! + 1; k <= 0; k++) answer.set(k, { d: 0, how: "held" });
  // Zeros at the end after the point: true, but they can be dropped.
  for (let i = 0; i < digits.length && digits[i] === 0 && to[i] < 0; i++) answer.set(to[i], { d: 0, how: "dropped" });
  const ks = [...from, ...to, 0, -1];
  const places = Array.from({ length: Math.max(...ks) - Math.min(...ks) + 1 }, (_, i) => Math.max(...ks) - i);
  return { places, from, to, answer };
}

/** The number in its columns, the answer in its columns below, an arrow from each digit to its new place. */
function shiftSvg(s: ShiftSolution): Block {
  const { places, from, to, answer } = shiftWork(s);
  const cw = places.length > 7 ? 32 : 40;
  const opLabel = `${s.times ? "×" : "÷"} ${10 ** s.e}`;
  const x0 = 24 + opLabel.length * 10;
  const [yHead, yA, yB] = [16, 58, 158];
  const out: string[] = [];
  const { colX, pointX, right } = placeColumns(out, places, x0, yHead, yB + 12, cw);
  const digits = [...String(s.m)].reverse().map(Number);
  // The number as written: its digits, and zeros before them up to the ones.
  for (let k = from.at(-1)! + 1; k <= 0; k++) out.push(text(colX.get(k)!, yA, "0", 26));
  digits.forEach((d, i) => out.push(text(colX.get(from[i])!, yA, String(d), 26)));
  const hasPoint = (lo: number) => lo < 0;
  out.push(`<circle cx="${r2(pointX)}" cy="${yA}" r="3" fill="${hasPoint(from[0]) ? C.ink : C.grey}"/>`);
  for (const [k, { d, how }] of answer) {
    if (how === "held") out.push(held(colX.get(k)!, yB));
    out.push(text(colX.get(k)!, yB, String(d), 26, how === "moved" ? C.green : how === "held" ? C.orange : C.grey));
  }
  const kept = [...answer].filter(([, v]) => v.how !== "dropped").map(([k]) => k);
  out.push(`<circle cx="${r2(pointX)}" cy="${yB}" r="3" fill="${hasPoint(Math.min(...kept)) ? C.green : C.grey}"/>`);
  // The arrows, each digit to its new place.
  digits.forEach((_, i) => {
    const [xa, xb] = [colX.get(from[i])!, colX.get(to[i])!];
    const [ya, yb] = [yA + 10, yB - 32];
    const len = Math.hypot(xb - xa, yb - ya);
    const [ux, uy] = [(xb - xa) / len, (yb - ya) / len];
    const [bx, by] = [xb - 9 * ux, yb - 9 * uy];
    out.push(`<line x1="${r2(xa)}" y1="${ya}" x2="${r2(bx)}" y2="${r2(by)}" stroke="${C.purple}" stroke-width="2"/>`);
    out.push(`<path d="M ${r2(xb)} ${yb} L ${r2(bx - 5 * uy)} ${r2(by + 5 * ux)} L ${r2(bx + 5 * uy)} ${r2(by - 5 * ux)} Z" fill="${C.purple}"/>`);
  });
  out.push(`<text x="${r2(x0 - 8)}" y="${(yA + yB) / 2}" font-size="18" text-anchor="end" fill="${C.purple}"${BOLD}>${opLabel}</text>`);
  let w = right + 10;
  if (s.units) {
    out.push(`<text x="${r2(right + 10)}" y="${yA}" font-size="18" fill="${C.ink}">${s.units[0]}</text>`);
    out.push(`<text x="${r2(right + 10)}" y="${yB}" font-size="18" fill="${C.green}"${BOLD}>${s.units[1]}</text>`);
    w += 36;
  }
  return { body: out.join(""), w, h: yB + 20 };
}

/** d equal jumps from 0: of x (times, the end is the answer) or cutting the whole into d (divided by, each jump is). */
function jumpsSvg(s: JumpsSolution, width: number): Block {
  const x = tidy(s.m, s.p);
  const total = tidy(s.m * s.d, s.p);
  const yLine = 70;
  const step = (width - 60) / s.d;
  const xs = Array.from({ length: s.d + 1 }, (_, i) => 30 + i * step);
  const out: string[] = [axis(xs[0], xs.at(-1)!, yLine)];
  for (let i = 0; i < s.d; i++) {
    out.push(jump(xs[i], xs[i + 1], yLine, x, s.times ? C.purple : C.green));
    out.push(text((xs[i] + xs[i + 1]) / 2, yLine - 10, String(i + 1), 11, C.grey));
  }
  xs.forEach((v) => out.push(tick(v, yLine)));
  out.push(text(xs[0], yLine + 25, "0", 15, C.ink, BOLD));
  out.push(text(xs.at(-1)!, yLine + 25, total, s.times ? 18 : 15, s.times ? C.green : C.ink, BOLD));
  return { body: out.join(""), w: width, h: yLine + 40 };
}

/** The blocks one under the other, centred, with the written steps beneath. */
function stack(blocks: Block[], steps: { svg: string; width: number; height: number } | null) {
  const w = Math.max(...blocks.map((b) => b.w + 20), steps?.width ?? 0);
  let y = 10;
  const parts = blocks.map((b) => {
    const g = `<g transform="translate(${r2((w - b.w) / 2)} ${r2(y)})">${b.body}</g>`;
    y += b.h + 14;
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

export function renderDecimal(spec: DecimalSolution, steps: { svg: string; width: number; height: number } | null) {
  const lw = Math.max(360, Math.min(560, steps?.width ?? 560));
  if (spec.pic === "shift") return stack([shiftSvg(spec)], steps);
  if (spec.pic === "jumps") return stack([jumpsSvg(spec, lw)], steps);
  return stack([columnsSvg(spec), lineSvg(spec, lw)], steps);
}
