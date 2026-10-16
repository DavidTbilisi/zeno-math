// Number line estimation: where does 37 go on a line from 0 to 100 with nothing on it but its ends? The pin's place is
// the answer, written as text ("pin:36.8") so a practice answer is stored and marked again on the server like a typed
// one. Within 5 % of the line's length is right, within 10 % close (the measure used in number-sense research, the
// error as a share of the line). Easy: 0 to 10 or 20; medium: 0 to 100 or 1000; hard: fractions and decimals on 0 to 1,
// or negative numbers. The board's game plays rounds of five, with stars for how close they came, and an endless run.
import { rng } from "./random";

export type EstimateLevel = 1 | 2 | 3;
/** A line from `from` to `to` (only its ends labelled); what the pin is asked for is in the question. */
export type PinPlay = { from: number; to: number };
/** A number to place: its value, as typed text (3/8, −7, 0.45) and in LaTeX. */
export type EstimateTask = { level: EstimateLevel; play: PinPlay; v: number; text: string; tex: string };

/** Right within this share of the line, close within twice it. */
export const PIN_TOL = 0.05;
export const ROUND = 5;

const minus = (s: string) => s.replace(/^-/, "−");
/** A number as it is written on the line and in the question (a minus sign, not a hyphen). */
export const numText = (v: number) => minus(String(v));

export function estimateTask(level: EstimateLevel, next: () => number): EstimateTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const whole = (from: number, to: number, v: number): EstimateTask => ({ level, play: { from, to }, v, text: numText(v), tex: String(v) });
  if (level === 1) {
    const to = next() < 0.6 ? 10 : 20;
    return whole(0, to, int(1, to - 1));
  }
  if (level === 2) {
    if (next() < 0.6) return whole(0, 100, int(2, 98));
    return whole(0, 1000, int(2, 98) * 10 + int(0, 9));
  }
  const kind = int(0, 2);
  if (kind === 0) {
    const d = int(3, 10);
    const n = int(1, d - 1);
    return { level, play: { from: 0, to: 1 }, v: n / d, text: `${n}/${d}`, tex: `\\frac{${n}}{${d}}` };
  }
  if (kind === 1) {
    const h = int(1, 99);
    const v = h / 100;
    return { level, play: { from: 0, to: 1 }, v, text: String(v), tex: String(v) };
  }
  const to = next() < 0.5 ? 10 : 20;
  const v = int(1, to - 1) * (next() < 0.7 ? -1 : 1);
  return whole(-to, to, v);
}

// ---------- the pin as text ----------

/** The pin's place, to a thousandth of the line. */
export function encodePin(play: PinPlay, x: number) {
  const step = (play.to - play.from) / 1000;
  const places = Math.max(0, -Math.floor(Math.log10(step)));
  return `pin:${Number((Math.round(x / step) * step).toFixed(places))}`;
}
/** The number a pin was put at ("pin:36.8", or the number alone), or null. */
export function decodePin(src: string): number | null {
  const m = src.trim().replace(/[−–]/g, "-").replace(",", ".").match(/^(?:pin\s*:)?\s*(-?\d+(?:\.\d+)?)$/i);
  return m ? Number(m[1]) : null;
}

/** How far the pin is from the number, as a share of the line. */
export const pinError = (play: PinPlay, v: number, x: number) => Math.abs(x - v) / (play.to - play.from);

export type PinVerdict = { ok: true } | { ok: false; problem: "unreadable" | "offLine" } | { ok: false; close: boolean; side: "left" | "right" };
export function judgePin(play: PinPlay, v: number, src: string): PinVerdict {
  const x = decodePin(src);
  if (x === null) return { ok: false, problem: "unreadable" };
  if (x < play.from || x > play.to) return { ok: false, problem: "offLine" };
  const e = pinError(play, v, x);
  // A hair's margin, so a pin the tolerance away isn't lost to rounding.
  if (e <= PIN_TOL + 1e-9) return { ok: true };
  return { ok: false, close: e <= 2 * PIN_TOL + 1e-9, side: x < v ? "left" : "right" };
}

/** How far a pin was off, in the line's own units: whole numbers on long lines, tenths or hundredths on short ones. */
export function offText(play: PinPlay, v: number, x: number) {
  const span = play.to - play.from;
  const places = span >= 100 ? 0 : span >= 10 ? 1 : 2;
  return String(Number(Math.abs(x - v).toFixed(places)));
}

/** How far along the line the number is, for the worked solution: (v − from) / (to − from). */
export const shareAlong = (play: PinPlay, v: number) => (v - play.from) / (play.to - play.from);

// ---------- the board's game ----------

/** Nine rounds of five: three easy, three medium, three hard. */
export const ESTIMATE_LADDER: { level: EstimateLevel; seed: number }[] = [
  { level: 1, seed: 11 },
  { level: 1, seed: 12 },
  { level: 1, seed: 13 },
  { level: 2, seed: 21 },
  { level: 2, seed: 22 },
  { level: 2, seed: 23 },
  { level: 3, seed: 31 },
  { level: 3, seed: 32 },
  { level: 3, seed: 33 },
];
/** The five numbers of a round, none twice. */
export function roundTasks(level: EstimateLevel, seed: number): EstimateTask[] {
  const next = rng(seed);
  const out: EstimateTask[] = [];
  while (out.length < ROUND) {
    const t = estimateTask(level, next);
    if (!out.some((o) => o.text === t.text && o.play.to === t.play.to)) out.push(t);
  }
  return out;
}
/** Stars for a round from its errors: on average within 3 % three, within 6 % two, else one; a peek caps them at two. */
export function roundStars(errors: number[], peeked: boolean): number {
  // A hair's margin, so an average of exactly 3 % isn't lost to rounding.
  const mean = errors.reduce((s, e) => s + e, 0) / errors.length - 1e-9;
  const s = mean <= 0.03 ? 3 : mean <= 0.06 ? 2 : 1;
  return peeked ? Math.min(2, s) : s;
}

/** Things worth noticing, each said when it happens and kept once found. */
export type EstimateNotice = "bullseye" | "middle" | "sharp" | "streak10";
export const ESTIMATE_NOTICES: EstimateNotice[] = ["bullseye", "middle", "sharp", "streak10"];
/**
 * What one pin shows: a bullseye (within half a percent), or the middle of the line found for a number that is
 * exactly half way; at the end of a round, all five within 3 %; in the endless run, ten right in a row.
 */
export function estimateNotice(t: EstimateTask, x: number, round: number[] | null, streak: number): EstimateNotice | null {
  const e = pinError(t.play, t.v, x);
  if (Math.abs(shareAlong(t.play, t.v) - 0.5) < 1e-9 && e <= 0.01) return "middle";
  if (e <= 0.005) return "bullseye";
  if (round && round.length === ROUND && round.every((r) => r <= 0.03)) return "sharp";
  if (streak === 10) return "streak10";
  return null;
}

/** The estimate game on the board: rounds of the ladder or the endless run, the pin, and what has been done so far. */
export type LiveEstimate = {
  mode: "puzzle" | "endless";
  stage: number;
  /** The endless run's level and the seed of its number. */
  level: EstimateLevel;
  seed: number;
  /** The number of the round being placed, and the errors of the ones placed. */
  i: number;
  errors: number[];
  /** Where the pin was let go, once it has been (then the number's real place shows). */
  pin: number | null;
  half: boolean;
  peeked: boolean;
  streak: number;
  said: { kind: "notice"; key: EstimateNotice } | { kind: "done"; stars: number } | null;
};
/** The number being placed now. */
export const currentTask = (d: Pick<LiveEstimate, "mode" | "stage" | "level" | "seed" | "i">): EstimateTask =>
  d.mode === "puzzle" ? roundTasks(ESTIMATE_LADDER[d.stage].level, ESTIMATE_LADDER[d.stage].seed)[d.i] : estimateTask(d.level, rng(d.seed));

// ---------- pictures ----------

const LINE = { x0: 30, x1: 470, y: 46 };
const LABEL = `font-family="Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;

/** The line with its ends labelled (and, for the solution, the number's place and the half-way mark): body and size. */
export function lineSvg(play: PinPlay, mark?: { v: number; text: string }): { body: string; w: number; h: number } {
  const X = (v: number) => LINE.x0 + shareAlong(play, v) * (LINE.x1 - LINE.x0);
  const end = (v: number) =>
    `<line x1="${X(v)}" y1="${LINE.y - 10}" x2="${X(v)}" y2="${LINE.y + 10}" stroke="#1e1e1e" stroke-width="2"/>` +
    `<text x="${X(v)}" y="${LINE.y + 30}" font-size="16" text-anchor="middle" fill="#1e1e1e" ${LABEL}>${numText(v)}</text>`;
  let body = `<line x1="${LINE.x0}" y1="${LINE.y}" x2="${LINE.x1}" y2="${LINE.y}" stroke="#1e1e1e" stroke-width="2"/>${end(play.from)}${end(play.to)}`;
  if (mark) {
    const mid = (play.from + play.to) / 2;
    body +=
      `<line x1="${X(mid)}" y1="${LINE.y - 7}" x2="${X(mid)}" y2="${LINE.y + 7}" stroke="#868e96" stroke-width="1.5" stroke-dasharray="3 2"/>` +
      `<path d="M${X(mark.v)},${LINE.y - 4} l-7,-14 h14 z" fill="#2f9e44"/>` +
      `<text x="${X(mark.v)}" y="${LINE.y - 24}" font-size="16" font-weight="700" text-anchor="middle" fill="#2f9e44" ${LABEL}>${mark.text}</text>`;
  }
  return { body, w: LINE.x1 + LINE.x0, h: LINE.y + 40 };
}

/** The worked solution: the number on the line, with the written steps beneath. */
export type PinSolution = { play: PinPlay; v: number; text: string };
export function renderPin(spec: PinSolution, steps: { svg: string; width: number; height: number } | null) {
  const pic = lineSvg(spec.play, { v: spec.v, text: spec.text });
  const top = 20;
  const w = Math.max(pic.w, steps?.width ?? 0);
  const h = top + pic.h + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${top + pic.h})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/><g transform="translate(${(w - pic.w) / 2} ${top})">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
