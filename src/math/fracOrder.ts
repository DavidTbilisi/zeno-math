// Fractions in order: four or five fractions to put on a number line (the board's game) or to write smallest first
// (practice). Easy: unit fractions, or fractions with the same bottom, on 0 to 1; medium: any bottoms up to twelfths
// on 0 to 1; hard: five on 0 to 2, with some past 1 (5/4, 1 1/3) and some nearly 1 (7/8, 9/10). No two are so close
// that placing them is a guess. Unit fractions put in order of their bottoms is the slip "a bigger bottom is bigger".
import { rng } from "./random";

export type OrderLevel = 1 | 2 | 3;
/** A fraction to order: n/d, as written (5/4 or 1 1/4 at hard), and its value. */
export type OrderItem = { n: number; d: number; text: string; tex: string; v: number };
export type OrderTask = { level: OrderLevel; to: 1 | 2; items: OrderItem[] };

export const itemOf = (n: number, d: number, mixed = false): OrderItem => {
  const whole = Math.floor(n / d);
  const asMixed = mixed && whole > 0 && n % d !== 0;
  return {
    n,
    d,
    v: n / d,
    text: asMixed ? `${whole} ${n % d}/${d}` : `${n}/${d}`,
    tex: asMixed ? `${whole}\\frac{${n % d}}{${d}}` : `\\frac{${n}}{${d}}`,
  };
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export function orderTask(level: OrderLevel, next: () => number): OrderTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const to = level === 3 ? 2 : 1;
  const count = level === 3 ? 5 : 4;
  for (;;) {
    const items: OrderItem[] = [];
    const sameBottom = level === 1 && next() < 0.5 ? int(5, 12) : 0;
    for (let tries = 0; items.length < count && tries < 200; tries++) {
      let n: number;
      let d: number;
      if (level === 1) [n, d] = sameBottom ? [int(1, sameBottom - 1), sameBottom] : [1, int(2, 12)];
      else if (level === 2) {
        d = int(2, 12);
        n = int(1, d - 1);
      }
      // Hard: one in three past 1, one in three nearly 1, the rest anywhere below 1.
      else {
        const kind = int(0, 2);
        d = int(2, 10);
        n = kind === 0 ? int(d + 1, 2 * d - 1) : kind === 1 ? d - 1 : int(1, d - 2);
        if (n < 1) continue;
      }
      if (gcd(n, d) !== 1) continue;
      const it = itemOf(n, d, level === 3 && next() < 0.5);
      // Apart by a twentieth of the line, so placing them isn't a guess.
      if (items.every((o) => Math.abs(o.v - it.v) >= 0.05 * to)) items.push(it);
    }
    if (items.length === count && (level < 3 || items.some((i) => i.v > 1))) return { level, to, items };
  }
}

/** The order, smallest first, as places in the list. */
export const rightOrder = (items: OrderItem[]) => items.map((_, i) => i).sort((a, b) => items[a].v - items[b].v);
/** The order a reader of bottoms gives (unit fractions by their bottoms: ½, ⅓, ⅕), when it isn't the right one. */
export function bottomsOrder(items: OrderItem[]): number[] | null {
  if (!items.every((i) => i.n === 1)) return null;
  return items.map((_, i) => i).sort((a, b) => items[a].d - items[b].d);
}

// ---------- reading an order ----------

/** A fraction typed in a list: 3/4, 1 1/3, 2, or a decimal. */
export function readItem(src: string): number | null {
  const s = src.trim().replace(/\s+/g, " ").replace(/\s*\/\s*/, "/");
  const mixed = s.match(/^(\d+) (\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[3]) ? Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]) : null;
  const f = s.match(/^(\d+)\/(\d+)$/);
  if (f) return Number(f[2]) ? Number(f[1]) / Number(f[2]) : null;
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
export type OrderProblem = "unreadable" | "count" | "other";
export type OrderVerdict = { ok: true } | { ok: false; problem: OrderProblem } | { ok: false; seq: number[] };
/** The list typed (separated by , ; or <), each matched to one of the items by its value: the order it gives, or why not. */
export function readOrder(items: OrderItem[], src: string): { seq: number[] } | { problem: OrderProblem } {
  const parts = src.split(/[,;<]/).map((p) => p.trim()).filter(Boolean);
  const vs = parts.map(readItem);
  if (!parts.length || vs.some((v) => v === null)) return { problem: "unreadable" };
  if (vs.length !== items.length) return { problem: "count" };
  const left = items.map((_, i) => i);
  const seq: number[] = [];
  for (const v of vs) {
    const k = left.findIndex((i) => Math.abs(items[i].v - v!) < 1e-9);
    if (k < 0) return { problem: "other" };
    seq.push(left.splice(k, 1)[0]);
  }
  return { seq };
}
/** The list against an order expected (the right one, or a slip's). */
export function judgeOrder(items: OrderItem[], expected: number[], src: string): OrderVerdict {
  const r = readOrder(items, src);
  if ("problem" in r) return { ok: false, problem: r.problem };
  return r.seq.every((i, k) => i === expected[k]) ? { ok: true } : { ok: false, seq: r.seq };
}

// ---------- the board's game ----------

export const ORDER_LADDER: { level: OrderLevel; seed: number }[] = [
  { level: 1, seed: 191 },
  { level: 1, seed: 192 },
  { level: 1, seed: 193 },
  { level: 2, seed: 201 },
  { level: 2, seed: 202 },
  { level: 2, seed: 203 },
  { level: 3, seed: 211 },
  { level: 3, seed: 212 },
  { level: 3, seed: 213 },
];
/** Whether the places put the items in the right order (left to right, smallest first). */
export const placedInOrder = (items: OrderItem[], placed: number[]) => rightOrder(items).every((i, k, o) => k === 0 || placed[o[k - 1]] < placed[i]);
/** How far each placed item is from its value, as a share of the line. */
export const placeErrors = (t: OrderTask, placed: number[]) => t.items.map((it, i) => Math.abs(placed[i] - it.v) / t.to);
/** Stars: in order with every one within 5 % of the line three, in order two, else one. */
export const orderStars = (t: OrderTask, placed: number[]) => (!placedInOrder(t.items, placed) ? 1 : placeErrors(t, placed).every((e) => e <= 0.05 + 1e-9) ? 3 : 2);

export type OrderNotice = "sharp" | "nearOne" | "pastOne" | "streak10";
export const ORDER_NOTICES: OrderNotice[] = ["sharp", "nearOne", "pastOne", "streak10"];
/** What a checked line shows: all within 3 %, one nearly 1 put just below it, one past 1 put just past it, ten in a row. */
export function orderNotice(t: OrderTask, placed: number[], streak: number): OrderNotice | null {
  if (streak === 10) return "streak10";
  const e = placeErrors(t, placed);
  if (!placedInOrder(t.items, placed)) return null;
  if (e.every((x) => x <= 0.03)) return "sharp";
  if (t.items.some((it, i) => it.v > 1 && placed[i] > 1 && e[i] <= 0.03)) return "pastOne";
  if (t.items.some((it, i) => it.v < 1 && it.n === it.d - 1 && placed[i] < 1 && e[i] <= 0.02)) return "nearOne";
  return null;
}

export type LiveOrder = {
  mode: "puzzle" | "endless";
  stage: number;
  level: OrderLevel;
  seed: number;
  /** Where each card was put on the line (null: not yet), and the card picked up. */
  placed: (number | null)[];
  sel: number | null;
  checked: boolean;
  streak: number;
  said: { kind: "notice"; key: OrderNotice } | null;
};
export const orderNow = (d: Pick<LiveOrder, "mode" | "stage" | "level" | "seed">): OrderTask =>
  d.mode === "puzzle" ? orderTask(ORDER_LADDER[d.stage].level, rng(ORDER_LADDER[d.stage].seed)) : orderTask(d.level, rng(d.seed));

// ---------- pictures ----------

const LABEL = `font-family="Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;
/** The line with the fractions in their places, labelled above and below in turn so they don't run into each other. */
export function orderSvg(t: OrderTask, width = 480): { body: string; w: number; h: number } {
  const [x0, x1, y] = [30, width - 30, 70];
  const X = (v: number) => x0 + (v / t.to) * (x1 - x0);
  let body = `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#1e1e1e" stroke-width="2"/>`;
  for (let k = 0; k <= t.to; k++)
    body += `<line x1="${X(k)}" y1="${y - 10}" x2="${X(k)}" y2="${y + 10}" stroke="#1e1e1e" stroke-width="2"/><text x="${X(k)}" y="${y + 52}" font-size="16" font-weight="700" text-anchor="middle" fill="#1e1e1e" ${LABEL}>${k}</text>`;
  rightOrder(t.items).forEach((i, k) => {
    const it = t.items[i];
    const up = k % 2 === 0;
    body +=
      `<circle cx="${X(it.v)}" cy="${y}" r="5" fill="#2f9e44"/>` +
      `<text x="${X(it.v)}" y="${up ? y - 18 : y + 30}" font-size="15" font-weight="700" text-anchor="middle" fill="#2f9e44" ${LABEL}>${it.text}</text>`;
  });
  return { body, w: width, h: y + 62 };
}
export type OrderSolution = { task: OrderTask };
export function renderOrder(spec: OrderSolution, steps: { svg: string; width: number; height: number } | null) {
  const pic = orderSvg(spec.task);
  const w = Math.max(pic.w, steps?.width ?? 0);
  const h = pic.h + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${pic.h})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/><g transform="translate(${(w - pic.w) / 2} 0)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
