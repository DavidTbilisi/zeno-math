// Guess the angle: an angle drawn, and how big it is to say in degrees, by eye. Easy: one arm along the bottom and a
// size in fives; medium: any size up to a straight line, turned any way; hard: reflex angles, more than a half turn.
// The board's game takes a typed estimate, then shows the angle measured and the estimate drawn beside it; the practice
// question picks the nearest of a few sizes offered. Reading the wrong scale of a protractor (180° − the angle) and
// measuring the angle on the inside (360° − the angle) are the slips named.
import type { Bench } from "./benchmark";
import type { EndlessGame } from "./ladder";
import { rng } from "./random";

export type AngleLevel = 1 | 2 | 3;
/** An angle: its size in degrees, and the direction of its first arm (degrees anticlockwise from →). */
export type AngleTask = { level: AngleLevel; size: number; turn: number };

export function angleTask(level: AngleLevel, next: () => number): AngleTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  if (level === 1) return { level, size: 5 * int(2, 34), turn: 0 };
  if (level === 2) return { level, size: int(5, 175), turn: 15 * int(0, 23) };
  return { level, size: int(185, 355), turn: 15 * int(0, 23) };
}

// ---------- pictures ----------

const rad = (deg: number) => (deg * Math.PI) / 180;
/** The point r from (cx, cy) in direction deg, anticlockwise from → (SVG's y grows downwards). */
export const toward = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.cos(rad(deg)), cy - r * Math.sin(rad(deg))];
const f1 = (x: number) => Math.round(x * 10) / 10;
/** An arc of radius r from direction a, anticlockwise through `size` degrees, as an SVG path. */
export function arcPath(cx: number, cy: number, r: number, a: number, size: number): string {
  const [x0, y0] = toward(cx, cy, r, a);
  const [x1, y1] = toward(cx, cy, r, a + size);
  return `M${f1(x0)},${f1(y0)} A${r},${r} 0 ${size > 180 ? 1 : 0} 0 ${f1(x1)},${f1(y1)}`;
}
export const ANGLE_R = 130;
/**
 * An angle as an SVG body of side 2R + 60, its corner in the middle: the two arms, the arc that marks it, and when
 * `shown`, its size beside the arc; `guess` adds the arm an estimate would make, dashed, with its size. `crop` trims
 * the square to what is drawn (the practice question), where the board keeps it whole so the keypad doesn't jump.
 */
export function angleSvg(t: Pick<AngleTask, "size" | "turn">, o: { shown?: boolean; guess?: number; R?: number; crop?: boolean } = {}): { body: string; w: number; h: number } {
  const R = o.R ?? ANGLE_R;
  const side = 2 * R + 60;
  const [cx, cy] = [side / 2, side / 2];
  const arm = (deg: number, color = "#1e1e1e", dash = "") => {
    const [x, y] = toward(cx, cy, R, deg);
    return `<line x1="${cx}" y1="${cy}" x2="${f1(x)}" y2="${f1(y)}" stroke="${color}" stroke-width="4" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  };
  const label = (deg: number, r: number, text: string, color: string) => {
    const [x, y] = toward(cx, cy, r, deg);
    return `<text x="${f1(x)}" y="${f1(y + 7)}" font-size="20" font-weight="700" text-anchor="middle" fill="${color}">${text}</text>`;
  };
  const mid = t.turn + t.size / 2;
  let body = `<path d="${arcPath(cx, cy, 36, t.turn, t.size)}" fill="none" stroke="#2f9e44" stroke-width="3"/>`;
  if (o.guess !== undefined) {
    body += `<path d="${arcPath(cx, cy, 58, t.turn, o.guess)}" fill="none" stroke="#1971c2" stroke-width="2" stroke-dasharray="5 4"/>`;
    body += arm(t.turn + o.guess, "#1971c2", "9 7");
    body += label(t.turn + o.guess, R + 20, `${o.guess}°`, "#1971c2");
  }
  body += arm(t.turn) + arm(t.turn + t.size);
  body += `<circle cx="${cx}" cy="${cy}" r="4" fill="#1e1e1e"/>`;
  if (o.shown) body += label(mid, t.size < 40 ? 84 : 66, `${t.size}°`, "#2f9e44");
  if (!o.crop) return { body, w: side, h: side };
  // Cropped to what is drawn: the corner, the arms' ends, and the arc and its label all the way round.
  const pts = [[cx, cy], toward(cx, cy, R, t.turn), toward(cx, cy, R, t.turn + t.size), ...Array.from({ length: 13 }, (_, k) => toward(cx, cy, 90, t.turn + (t.size * k) / 12))];
  const m = 16;
  const [x0, x1] = [Math.min(...pts.map((p) => p[0])) - m, Math.max(...pts.map((p) => p[0])) + m];
  const [y0, y1] = [Math.min(...pts.map((p) => p[1])) - m, Math.max(...pts.map((p) => p[1])) + m];
  return { body: `<g transform="translate(${f1(-x0)} ${f1(-y0)})">${body}</g>`, w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) };
}

// ---------- the practice question ----------

const deg = (v: number): Bench => ({ v, text: `${v}°`, plain: String(v), tex: `${v}^\\circ` });
export type AngleMistake = "acuteObtuse" | "insideAngle";
/** A size to pick from a few, nearest the angle, with the option a slip would pick when it is another one. */
export type AngleQuestion = { task: AngleTask; options: Bench[]; right: number; trap: { id: AngleMistake; at: number } | null };

/**
 * About how big is it: easy, 30°, 90° or 150°; medium, four sizes in 30s; hard, four sizes in 45s. The angle is never
 * near half-way between two of them. The wrong ones include the size nearest 180° − the angle (medium and easy) or
 * 360° − the angle (hard), when that is another one.
 */
export function angleQuestion(level: AngleLevel, next: () => number): AngleQuestion {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const step = level === 1 ? 60 : level === 2 ? 30 : 45;
  const nearest = (v: number) => Math.round(v / step) * step;
  for (;;) {
    const task = angleTask(level, next);
    const v = task.size;
    const best = level === 1 ? 30 + 60 * Math.min(2, Math.max(0, Math.round((v - 30) / 60))) : nearest(v);
    // Clearly nearest: at least a quarter of a step from half-way.
    if (Math.abs(v - best) > step / 4 + (level === 1 ? 5 : 0)) continue;
    const slip = level === 3 ? nearest(360 - v) : level === 1 ? 30 + 60 * Math.min(2, Math.max(0, Math.round((150 - v) / 60))) : nearest(180 - v);
    let pool: number[];
    if (level === 1) pool = [30, 90, 150];
    else {
      const all = Array.from({ length: Math.floor(355 / step) }, (_, k) => (k + 1) * step).filter((x) => (level === 2 ? x <= 180 : x <= 315));
      if (!all.includes(best)) continue;
      pool = [best];
      if (slip !== best && all.includes(slip)) pool.push(slip);
      while (pool.length < 4) {
        const x = all[int(0, all.length - 1)];
        if (!pool.includes(x)) pool.push(x);
      }
      pool.sort((a, b) => a - b);
    }
    const options = pool.map(deg);
    const at = pool.indexOf(slip);
    const id: AngleMistake = level === 3 ? "insideAngle" : "acuteObtuse";
    return { task, options, right: pool.indexOf(best), trap: at >= 0 && slip !== best ? { id, at } : null };
  }
}
/** The working: the angle against a right angle (or a half turn), and the size it is nearest. */
export function angleSteps(q: AngleQuestion): string[] {
  const v = q.task.size;
  const right = q.options[q.right];
  const against = v < 90 ? `${v}^\\circ < 90^\\circ` : v === 90 ? `${v}^\\circ = 90^\\circ` : v < 180 ? `90^\\circ < ${v}^\\circ < 180^\\circ` : `180^\\circ < ${v}^\\circ < 360^\\circ`;
  return v === right.v ? [against] : [against, `${v}^\\circ \\approx ${right.tex}`];
}

// ---------- the board's game ----------

export const ROUND = 5;
export const GUESS_LADDER: { level: AngleLevel; seed: number }[] = [
  { level: 1, seed: 701 },
  { level: 1, seed: 702 },
  { level: 1, seed: 703 },
  { level: 2, seed: 711 },
  { level: 2, seed: 712 },
  { level: 2, seed: 713 },
  { level: 3, seed: 721 },
  { level: 3, seed: 722 },
  { level: 3, seed: 723 },
];
/** Five angles of a level, no two the same size. */
export function guessRound(level: AngleLevel, seed: number): AngleTask[] {
  const next = rng(seed);
  const out: AngleTask[] = [];
  while (out.length < ROUND) {
    const t = angleTask(level, next);
    if (!out.some((o) => Math.abs(o.size - t.size) < 10)) out.push(t);
  }
  return out;
}
/** An estimate counts as good within 10°. */
export const GOOD = 10;
/** Stars for a round: off by 5° or less on average three, 10° or less two, else one. */
export function guessStars(errors: number[]): number {
  const mean = errors.reduce((s, e) => s + e, 0) / errors.length;
  return mean <= 5 ? 3 : mean <= GOOD ? 2 : 1;
}
export type GuessNotice = "spotOn" | "rightAngle" | "reflex" | "streak10";
export const GUESS_NOTICES: GuessNotice[] = ["spotOn", "rightAngle", "reflex", "streak10"];
/** What an estimate shows: exactly right, a right angle seen for what it is, a reflex angle within 5°, ten good ones in a row. */
export function guessNotice(t: AngleTask, guess: number, streak: number): GuessNotice | null {
  if (streak === 10) return "streak10";
  if (guess === t.size) return t.size === 90 ? "rightAngle" : "spotOn";
  if (t.size > 180 && Math.abs(guess - t.size) <= 5) return "reflex";
  return null;
}
/** The game's state: the shared shape, and which angle of the round, how far off each estimate so far was, the estimate being typed and the last one made (a round is done once the fifth is). */
export type LiveAngleGuess = EndlessGame<GuessNotice, AngleLevel> & { i: number; errors: number[]; typed: string; guess: number | null };
export const guessNow = (d: Pick<LiveAngleGuess, "mode" | "stage" | "level" | "seed" | "i">): AngleTask =>
  d.mode === "puzzle" ? guessRound(GUESS_LADDER[d.stage].level, GUESS_LADDER[d.stage].seed)[d.i] : angleTask(d.level, rng(d.seed));

/** The worked solution: the angle with its size, and the working beneath. */
export type AngleSolution = { task: AngleTask };
export function renderAngle(spec: AngleSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(angleSvg(spec.task, { shown: true, R: 100, crop: true }), steps);
}

/** A picture with the working beneath it, as one SVG. */
export function withSteps(pic: { body: string; w: number; h: number }, steps: { svg: string; width: number; height: number } | null) {
  const w = Math.max(pic.w + 20, steps?.width ?? 0);
  const h = pic.h + 16 + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${pic.h + 16})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/><g transform="translate(${(w - pic.w) / 2} 10)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
