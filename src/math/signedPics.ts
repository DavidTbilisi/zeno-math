// Pictures for signed numbers (#706): a number line over negatives and positives, marked in equal parts between the
// whole numbers, with a dot, lettered points, or a jump drawn as an arrow from one number to another. Whole numbers
// are labelled under the line; the answer is never written.
import { r2 } from "./chart";
import type { Exercise } from "./practiceTypes";

const INK = "#1e1e1e";
const ASK = "#e8590c";
const text = (x: number, y: number, s: string, o: { size?: number; color?: string; bold?: boolean } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.size ?? 15}" text-anchor="middle" fill="${o.color ?? INK}"${o.bold ? ' font-weight="700"' : ""}>${s}</text>`;
const minus = (v: number) => String(v).replace("-", "−");

export type SignedLineOpts = {
  /** The whole numbers the line runs from and to, and the equal parts each step of one is cut into. */
  lo: number;
  hi: number;
  d: number;
  /** A dot on the line, as a number. */
  dot?: number;
  /** Lettered points above the line. */
  letters?: [number, string][];
  /** A jump: an arrow from one number to another, above the line, the start marked with a dot. */
  jump?: [number, number];
};

/** A number line from lo to hi, a mark at every part and the whole numbers labelled. */
export function signedLine(o: SignedLineOpts): Exercise["pic"] {
  const unit = Math.min(90, 560 / (o.hi - o.lo));
  const x0 = 26;
  const at = (v: number) => x0 + (v - o.lo) * unit;
  const top = o.jump ? 64 : o.letters ? 34 : 14;
  const w = (o.hi - o.lo) * unit;
  const out: string[] = [
    `<line x1="${x0 - 14}" y1="${top}" x2="${r2(x0 + w + 14)}" y2="${top}" stroke="${INK}" stroke-width="2"/>`,
    `<path d="M ${r2(x0 + w + 16)} ${top} l -8 -5 v 10 z" fill="${INK}"/><path d="M ${x0 - 16} ${top} l 8 -5 v 10 z" fill="${INK}"/>`,
  ];
  for (let i = 0; i <= (o.hi - o.lo) * o.d; i++) {
    const whole = i % o.d === 0;
    const x = at(o.lo + i / o.d);
    out.push(`<line x1="${r2(x)}" y1="${top - (whole ? 9 : 5)}" x2="${r2(x)}" y2="${top + (whole ? 9 : 5)}" stroke="${INK}" stroke-width="${whole ? 2 : 1.2}"/>`);
    if (whole) out.push(text(x, top + 27, minus(o.lo + i / o.d)));
  }
  for (const [v, s] of o.letters ?? []) out.push(`<circle cx="${r2(at(v))}" cy="${top}" r="5" fill="${ASK}"/>${text(at(v), top - 12, s, { color: ASK, bold: true })}`);
  if (o.jump) {
    const [a, b] = o.jump.map(at);
    const dir = b > a ? -1 : 1;
    out.push(`<circle cx="${r2(a)}" cy="${top}" r="5.5" fill="${ASK}"/>`);
    out.push(`<path d="M ${r2(a)} ${top - 6} Q ${r2((a + b) / 2)} ${top - 58} ${r2(b)} ${top - 6}" fill="none" stroke="${ASK}" stroke-width="2.5"/>`);
    out.push(`<path d="M ${r2(b)} ${top - 4} l ${dir * 9} -8 l ${dir * -1} 10 z" fill="${ASK}"/>`);
  }
  if (o.dot !== undefined) out.push(`<circle cx="${r2(at(o.dot))}" cy="${top}" r="7" fill="${ASK}" stroke="#ffffff" stroke-width="1.5"/>`);
  return { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${out.join("")}</g>`, w: x0 + w + 30, h: top + 36 };
}
