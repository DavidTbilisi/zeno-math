// The worked picture for the rate questions: a double number line. Units on top (kilograms, or minutes as a clock),
// the amount underneath (the currency or litres), a tick for each unit, the same tick on both lines lined up. The
// stretch for one unit is green between the lines: that is the rate. Arrows over the top line and under the bottom
// one do the same to both: ÷ n back to one unit, × n (or × m) on from it. The answer is green.
import { C, FONT, r2 } from "./chart";

export type RateSolution = {
  ask: "rate" | "total" | "units" | "two";
  /** The rate (amount for one unit), n units for t; for two steps, m units for v. */
  u: number;
  n: number;
  t: number;
  m?: number;
  v?: number;
  /** Money (written with both places when it has cents) or litres. */
  cost: boolean;
  /** What the lines are labelled with: the unit on top ("" for minutes: a clock), the amount's symbol underneath. */
  top: string;
  bottom: string;
};

/** An amount as the working writes it. */
export const rateAmount = (s: Pick<RateSolution, "cost">, v: number) => (s.cost && !Number.isInteger(Number(v.toFixed(6))) ? v.toFixed(2) : String(Number(v.toFixed(6))));

function text(x: number, y: number, s: string, size: number, color: string = C.ink, bold = false, anchor = "middle") {
  return `<text x="${r2(x)}" y="${r2(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}"${bold ? ' font-weight="700"' : ""}>${s}</text>`;
}

/** An arrow from x1 to x2 bulging away from a line at y (up when dir is −1, down when 1), its label at the far side. */
function arc(x1: number, x2: number, y: number, dir: 1 | -1, height: number, label: string, color: string) {
  const mid = (x1 + x2) / 2;
  const cy = y + dir * 2 * height;
  // The arrowhead along the curve's last direction (from the control point to the end).
  const [dx, dy] = [x2 - mid, y - cy];
  const len = Math.hypot(dx, dy);
  const [ux, uy] = [dx / len, dy / len];
  const [bx, by] = [x2 - 10 * ux, y - 10 * uy];
  return (
    `<path d="M ${r2(x1)} ${r2(y)} Q ${r2(mid)} ${r2(cy)} ${r2(x2)} ${r2(y)}" fill="none" stroke="${color}" stroke-width="2"/>` +
    `<path d="M ${r2(x2)} ${r2(y)} L ${r2(bx - 5 * uy)} ${r2(by + 5 * ux)} L ${r2(bx + 5 * uy)} ${r2(by - 5 * ux)} Z" fill="${color}"/>` +
    text(mid, y + dir * (height + 8) + (dir < 0 ? -4 : 14), label, 16, color, true)
  );
}

/** A small clock: minutes. */
const clock = (x: number, y: number) =>
  `<circle cx="${x}" cy="${y}" r="11" fill="#ffffff" stroke="${C.ink}" stroke-width="2"/><path d="M ${x} ${y} V ${y - 7} M ${x} ${y} L ${x + 5} ${y + 3}" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`;

export function rateSvg(s: RateSolution): { body: string; w: number; h: number } {
  const most = Math.max(s.n, s.m ?? 0);
  const x0 = 64;
  const step = Math.min(64, 440 / most);
  const X = (i: number) => x0 + i * step;
  const [yTop, yBot] = [76, 166];
  const out: string[] = [];
  // The stretch for one unit, green between the lines: the rate.
  out.push(`<rect x="${r2(X(0))}" y="${yTop}" width="${r2(step)}" height="${yBot - yTop}" fill="#ebfbee"/>`);
  for (const y of [yTop, yBot]) out.push(`<line x1="${r2(X(0))}" y1="${y}" x2="${r2(X(most) + 18)}" y2="${y}" stroke="${C.ink}" stroke-width="2"/>`);
  // What each line counts.
  out.push(s.top ? text(x0 - 16, yTop + 6, s.top, 16, C.ink, true, "end") : clock(x0 - 26, yTop));
  out.push(text(x0 - 16, yBot + 6, s.bottom, 16, C.ink, true, "end"));
  // Which ticks the question is about: the amount there, and whether it is the answer.
  const amounts = new Map<number, { v: number; color: string }>([[0, { v: 0, color: C.grey }]]);
  const mark = (k: number, v: number, answer: boolean) => amounts.set(k, { v, color: answer ? C.green : C.ink });
  mark(1, s.u, s.ask === "rate");
  mark(s.n, s.t, s.ask === "total");
  if (s.ask === "two") mark(s.m!, s.v!, true);
  const keyTicks = new Set(amounts.keys());
  for (let i = 0; i <= most; i++) {
    const key = keyTicks.has(i);
    for (const y of [yTop, yBot]) out.push(`<line x1="${r2(X(i))}" y1="${y - 6}" x2="${r2(X(i))}" y2="${y + 6}" stroke="${C.ink}" stroke-width="${key ? 2 : 1.4}"/>`);
    if (key && i > 0) out.push(`<line x1="${r2(X(i))}" y1="${yTop + 8}" x2="${r2(X(i))}" y2="${yBot - 8}" stroke="${C.grey}" stroke-dasharray="4 4"/>`);
    // Units on top, under the line: every one when there is room, else the ones the question is about.
    if (key || step >= 22) {
      const answer = s.ask === "units" && i === s.n;
      out.push(text(X(i), yTop + 24, String(i), key ? 15 : 12, answer ? C.green : key ? C.ink : C.grey, key));
    }
  }
  for (const [k, { v, color }] of amounts) out.push(text(X(k), yBot - 12, rateAmount(s, v), k === 0 ? 12 : 15, color, k > 0));
  // The steps, done to both lines alike.
  const span = (a: number, b: number) => 14 + (22 * Math.abs(b - a)) / Math.max(1, most);
  const both = (a: number, b: number, label: string, color: string) => {
    out.push(arc(X(a), X(b), yTop - 8, -1, span(a, b), label, color));
    out.push(arc(X(a), X(b), yBot + 8, 1, span(a, b), label, color));
  };
  if (s.ask === "rate") both(s.n, 1, `÷ ${s.n}`, C.purple);
  else if (s.ask === "two") {
    both(s.n, 1, `÷ ${s.n}`, C.purple);
    both(1, s.m!, `× ${s.m}`, C.green);
  } else both(1, s.n, `× ${s.n}`, s.ask === "units" ? C.green : C.purple);
  return { body: out.join(""), w: X(most) + 40, h: yBot + 64 };
}

export function renderRate(spec: RateSolution, steps: { svg: string; width: number; height: number } | null) {
  const pic = rateSvg(spec);
  const w = Math.max(pic.w + 20, steps?.width ?? 0);
  const ph = pic.h + 10;
  const h = ph + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${r2(ph)})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${r2(h)}" viewBox="0 0 ${w} ${r2(h)}"><rect width="${w}" height="${r2(h)}" fill="#ffffff"/><g ${FONT} transform="translate(${r2((w - pic.w) / 2)} 0)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
