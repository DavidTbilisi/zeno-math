// Graph stories: a walk from home told in parts — walks away slowly, runs away, stops, walks or runs back — and its
// graph, the distance from home against the time. Each part takes the same time: walking moves one square, running
// two, a stop none, so the line climbs gently, steeply or not at all. Easy: three parts, walking only; medium: three
// with walking and running; hard: four. The board's game has the graph built part by part; the practice question
// picks the graph of a story from four. A flat line taken for moving (or a stop drawn as moving), and steep taken for
// slow, are the slips named.
import { withSteps } from "./angleGuess";
import { LETTERS } from "./cubeNets";
import { rng } from "./random";

export type StoryLevel = 1 | 2 | 3;
export type Part = "awaySlow" | "awayFast" | "stop" | "backSlow" | "backFast";
export const PARTS: Part[] = ["awaySlow", "awayFast", "stop", "backSlow", "backFast"];
/** How far from home each part goes, in squares. */
export const RISE: Record<Part, number> = { awaySlow: 1, awayFast: 2, stop: 0, backSlow: -1, backFast: -2 };
/** The parts on the easy level: walking only. */
export const SLOW_PARTS: Part[] = ["awaySlow", "stop", "backSlow"];
export type StoryTask = { level: StoryLevel; parts: Part[] };
/** The words for a part: "home" is said when it ends there. */
export type StoryWord = Part | "backSlowHome" | "backFastHome";

/** The distance from home after each part (the walk starts at home), or null if it would go past home. */
export function heights(parts: Part[]): number[] | null {
  const out = [0];
  for (const p of parts) {
    const h = out[out.length - 1] + RISE[p];
    if (h < 0) return null;
    out.push(h);
  }
  return out;
}
export const isFast = (p: Part) => p === "awayFast" || p === "backFast";
export const isMoving = (p: Part) => p !== "stop";
/** Each part as it is told: back home when it ends there. */
export function storyWords(parts: Part[]): StoryWord[] {
  const hs = heights(parts) ?? [];
  return parts.map((p, k) => (p === "backSlow" && hs[k + 1] === 0 ? "backSlowHome" : p === "backFast" && hs[k + 1] === 0 ? "backFastHome" : p));
}

/** A walk: it starts by going away; past the easy level it walks and runs both, and every part of it can be told apart. */
export function storyTask(level: StoryLevel, next: () => number): StoryTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const n = level === 3 ? 4 : 3;
  const pool = level === 1 ? SLOW_PARTS : PARTS;
  for (;;) {
    const first: Part = level === 1 ? "awaySlow" : (["awaySlow", "awayFast"] as const)[int(0, 1)];
    const parts = [first, ...Array.from({ length: n - 1 }, () => pool[int(0, pool.length - 1)])];
    if (!heights(parts)) continue;
    if (level > 1 && !(parts.some(isFast) && parts.some((p) => isMoving(p) && !isFast(p)))) continue;
    // Two stops in a row read as one long one.
    if (parts.some((p, k) => p === "stop" && parts[k + 1] === "stop")) continue;
    return { level, parts };
  }
}

// ---------- pictures ----------

const INK = "#1e1e1e";
/** Each part is two squares of time wide. */
const SPAN = 2;
/**
 * A walk's graph on squares `cell` wide, `high` squares tall: the axes, d up the side (the distance from home) and t
 * along (the time), and the line of each part. `wrong` parts are drawn red; `numbered` puts each part's number above
 * it; `color` is the line's.
 */
export function storySvg(parts: Part[], o: { cell?: number; high?: number; slots?: number; wrong?: number[]; numbered?: boolean; color?: string } = {}): { body: string; w: number; h: number } {
  const cell = o.cell ?? 30;
  const hs = heights(parts) ?? parts.reduce((a, p) => [...a, a[a.length - 1] + RISE[p]], [0]);
  const high = o.high ?? Math.max(3, ...hs);
  const slots = o.slots ?? parts.length;
  // Room above the highest line for its number.
  const [left, top, bottom] = [22, o.numbered ? 26 : 14, 22];
  const [W, H] = [slots * SPAN * cell, high * cell];
  const at = (k: number, h: number) => [left + k * SPAN * cell, top + H - h * cell];
  let body = "";
  for (let i = 0; i <= slots * SPAN; i++) body += `<line x1="${left + i * cell}" y1="${top}" x2="${left + i * cell}" y2="${top + H}" stroke="#e9ecef" stroke-width="1"/>`;
  for (let j = 0; j <= high; j++) body += `<line x1="${left}" y1="${top + j * cell}" x2="${left + W}" y2="${top + j * cell}" stroke="#e9ecef" stroke-width="1"/>`;
  body += `<path d="M${left},${top - 6} V${top + H} H${left + W + 8}" fill="none" stroke="${INK}" stroke-width="2"/>`;
  body += `<text x="${left - 7}" y="${top + 8}" font-size="14" font-style="italic" font-weight="700" text-anchor="end" fill="${INK}">d</text>`;
  body += `<text x="${left + W + 4}" y="${top + H + 17}" font-size="14" font-style="italic" font-weight="700" text-anchor="end" fill="${INK}">t</text>`;
  body += `<text x="${left - 7}" y="${top + H + 4}" font-size="12" text-anchor="end" fill="#495057">🏠</text>`;
  parts.forEach((p, k) => {
    const [x1, y1] = at(k, hs[k]);
    const [x2, y2] = at(k + 1, hs[k + 1]);
    const color = o.wrong?.includes(k) ? "#e03131" : (o.color ?? "#1971c2");
    body += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${cell > 20 ? 4 : 3}" stroke-linecap="round"/>`;
    if (o.numbered) body += `<text x="${(x1 + x2) / 2}" y="${Math.min(y1, y2) - 8}" font-size="14" font-weight="700" text-anchor="middle" fill="${color}">${k + 1}</text>`;
  });
  body += `<circle cx="${at(0, 0)[0]}" cy="${at(0, 0)[1]}" r="4" fill="${INK}"/>`;
  return { body, w: left + W + 12, h: top + H + bottom };
}
/** A part's shape as a small icon: its slope in a square. */
export function partIcon(p: Part, size = 34): string {
  const [x1, x2] = [4, size - 4];
  const mid = size / 2;
  const d = (RISE[p] * (size - 8)) / 4;
  return `<line x1="${x1}" y1="${mid + d}" x2="${x2}" y2="${mid - d}" stroke="#1971c2" stroke-width="4" stroke-linecap="round"/>`;
}

// ---------- the practice question ----------

export type StoryMistake = "flatMoving" | "steepSlow";
/** A story and four graphs to pick from, with the slips that would pick a wrong one. */
export type StoryQuestion = { task: StoryTask; options: Part[][]; right: number; traps: { id: StoryMistake; at: number }[] };

const key = (parts: Part[]) => parts.join(" ");
/** The stop drawn as walking away, or (with no stop) a walk drawn as a stop: still a walk that never passes home. */
export function flatSwapped(parts: Part[]): Part[] | null {
  const s = parts.indexOf("stop");
  if (s >= 0) return parts.map((p, k) => (k === s ? "awaySlow" : p));
  for (let k = 0; k < parts.length; k++) {
    const alt = parts.map((p, j) => (j === k ? "stop" : p));
    if (heights(alt)) return alt;
  }
  return null;
}
const SPEED_SWAP: Record<Part, Part> = { awaySlow: "awayFast", awayFast: "awaySlow", stop: "stop", backSlow: "backFast", backFast: "backSlow" };
/** Walking and running the other way round. */
export function speedSwapped(parts: Part[]): Part[] | null {
  const alt = parts.map((p) => SPEED_SWAP[p]);
  return heights(alt) ? alt : null;
}
/** One part that goes away drawn coming back, or the other way round. */
function wayTurned(parts: Part[], next: () => number): Part[] | null {
  const TURN: Record<Part, Part> = { awaySlow: "backSlow", awayFast: "backFast", stop: "stop", backSlow: "awaySlow", backFast: "awayFast" };
  const ks = parts.flatMap((p, k) => (isMoving(p) ? [k] : []));
  for (let tries = 0; tries < 8; tries++) {
    const k = ks[Math.floor(next() * ks.length)];
    const alt = parts.map((p, j) => (j === k ? TURN[p] : p));
    if (heights(alt)) return alt;
  }
  return null;
}

/**
 * Which graph is the story's: the stop and a walk swapped (flatMoving), walking and running swapped (steepSlow, past
 * the easy level), a part going the other way, and any other walk of the level to make four.
 */
export function storyQuestion(level: StoryLevel, next: () => number): StoryQuestion {
  const task = storyTask(level, next);
  const right = task.parts;
  const wrong: { parts: Part[]; id?: StoryMistake }[] = [];
  const add = (parts: Part[] | null, id?: StoryMistake) => {
    if (parts && key(parts) !== key(right) && !wrong.some((x) => key(x.parts) === key(parts))) wrong.push({ parts, id });
  };
  add(flatSwapped(right), "flatMoving");
  if (level > 1) add(speedSwapped(right), "steepSlow");
  add(wayTurned(right, next));
  while (wrong.length < 3) add(storyTask(level, next).parts);
  const options = [right, ...wrong.slice(0, 3).map((x) => x.parts)];
  const ids = [undefined, ...wrong.slice(0, 3).map((x) => x.id)];
  // Shuffled, so the right graph isn't always first.
  const order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    task,
    options: order.map((i) => options[i]),
    right: order.indexOf(0),
    traps: order.flatMap((i, at) => (ids[i] ? [{ id: ids[i]!, at }] : [])),
  };
}
export const storyOptions = () => LETTERS.slice(0, 4).map((l) => ({ text: l, plain: l, tex: `\\text{${l}}` }));
/** The four graphs, two by two, each with its letter, on one scale. */
export function storyChoicesSvg(q: StoryQuestion): { body: string; w: number; h: number } {
  const high = Math.max(3, ...q.options.flatMap((o) => heights(o) ?? [0]));
  const one = storySvg(q.options[0], { cell: 13, high });
  const [cw, ch] = [one.w + 30, one.h + 12];
  const body = q.options
    .map((o, i) => {
      const [x, y] = [(i % 2) * cw, Math.floor(i / 2) * ch];
      return `<g transform="translate(${x} ${y})"><text x="12" y="20" font-size="17" font-weight="700" fill="#1e1e1e">${LETTERS[i]}</text><g transform="translate(22 0)">${storySvg(o, { cell: 13, high }).body}</g></g>`;
    })
    .join("");
  return { body, w: 2 * cw, h: 2 * ch };
}

// ---------- the board's game ----------

export const STORY_LADDER: { level: StoryLevel; seed: number }[] = [
  { level: 1, seed: 961 },
  { level: 1, seed: 962 },
  { level: 1, seed: 963 },
  { level: 2, seed: 971 },
  { level: 2, seed: 972 },
  { level: 2, seed: 973 },
  { level: 3, seed: 981 },
  { level: 3, seed: 982 },
  { level: 3, seed: 983 },
];
/** Stars: right at the first check three, at the second two, else one. */
export const storyStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** The parts drawn wrong. */
export const wrongParts = (t: StoryTask, drawn: Part[]) => t.parts.flatMap((p, k) => (drawn[k] !== p ? [k] : []));
/** Why the first wrong part is wrong: moving drawn flat or a stop drawn moving, the wrong speed, or the wrong way. */
export function partSlip(want: Part, drawn: Part): "flat" | "speed" | "way" {
  if (isMoving(want) !== isMoving(drawn)) return "flat";
  return Math.sign(RISE[want]) === Math.sign(RISE[drawn]) ? "speed" : "way";
}
export type StoryNotice = "speeds" | "home" | "still" | "streak10";
export const STORY_NOTICES: StoryNotice[] = ["still", "speeds", "home", "streak10"];
/** What a graph drawn right first time shows: walking and running both, a walk back home, a stop; ten in a row. */
export function storyNotice(t: StoryTask, misses: number, streak: number): StoryNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (t.parts.some(isFast)) return "speeds";
  if (heights(t.parts)!.at(-1) === 0) return "home";
  if (t.parts.includes("stop")) return "still";
  return null;
}
export type LiveGraphStory = {
  mode: "puzzle" | "endless";
  stage: number;
  level: StoryLevel;
  seed: number;
  /** The parts drawn so far, the ones found wrong at the last check, and whether the graph is right. */
  drawn: Part[];
  wrong: number[];
  misses: number;
  done: boolean;
  streak: number;
  said: { kind: "notice"; key: StoryNotice } | { kind: "wrong"; why: "flat" | "speed" | "way" } | null;
};
export const storyNow = (d: Pick<LiveGraphStory, "mode" | "stage" | "level" | "seed">): StoryTask =>
  d.mode === "puzzle" ? storyTask(STORY_LADDER[d.stage].level, rng(STORY_LADDER[d.stage].seed)) : storyTask(d.level, rng(d.seed));

/** The worked solution: the story's graph with each part numbered. */
export type StorySolution = { task: StoryTask };
export function renderStory(spec: StorySolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(storySvg(spec.task.parts, { cell: 22, numbered: true }), steps);
}
