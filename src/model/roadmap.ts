// Roadmaps by goal (#449): an ordered checklist of what to learn for one goal (software engineering, algorithms,
// finance, banking, machine learning, school), in stages. An item is a skill's levels made secure in free practice or
// a game's ladder passed (2★ on every puzzle), so it ticks itself from the learner's own work, and because skills are
// shared, a tick counts on every roadmap that has it. A hand-made roadmap also asks for a topic's intro to be read
// (#450), and a lab to be tried (#461). The machine-learning roadmap is the course map (course.ts), with its labs.
import type { LiveKind } from "../math/live.ts";
import type { SkillId } from "../math/practiceSkills.ts";
import { gradeOf, GRADES, PREREQUISITES, type Grade } from "./curriculum.ts";
import type { Level } from "./elo.ts";
import type { Standing } from "./course.ts";
import type { LearningStage } from "./learningStage.ts";
import { cellKey } from "./placement.ts";
import { GAME_KEYS, type GameId } from "./gameKeys.ts";
import type { TopicId } from "./topics.ts";

export const GOALS = ["software", "algorithms", "finance", "banking", "ml", "school"] as const;
export type GoalId = (typeof GOALS)[number];
export const isGoal = (v: unknown): v is GoalId => GOALS.includes(v as GoalId);

/** The games a roadmap can ask for: any game with a ladder (gameKeys.ts). */
export { GAME_KEYS, type GameId };

/** The labs a roadmap can ask to be tried: tried once the learner has used one on its page (#/library/live/<lab>). */
export const LABS = [
  "tensorLab", "pcaLab", "embedLab", "softmaxLab", "rocLab", "descentLab", "batchLab", "fitLab", "knnLab", "treeLab", "kmeansLab",
  "nnLab", "backpropLab", "convLab", "rnnLab", "attnLab", "rlLab", "geoLab", "circuitLab", "cpuLab", "systemLab", "raidLab", "cacheLab", "ioLab",
] as const satisfies readonly LiveKind[];
export type LabId = (typeof LABS)[number];
export const isLabKind = (k: string): k is LabId => (LABS as readonly string[]).includes(k);

const ALL_LEVELS: readonly Level[] = [1, 2, 3];
export type SkillItem = { skill: SkillId; levels: readonly Level[] };
export type GameItem = { game: GameId };
/** A topic's intro explainer read (#450): "What is geometry?" at the top of its topic page. */
export type ReadItem = { read: TopicId };
/** A lab tried (#461): used at least once on its page. */
export type LabItem = { lab: LabId };
export type Item = SkillItem | GameItem | ReadItem | LabItem;
export type RoadStage = { id: string; items: readonly Item[] };
/**
 * A goal's roadmap. `order` is how Next is found: "list" walks the items in the order written (a roadmap made by hand),
 * "grade" takes the lowest grade first (the course and school, which hold every graded level and follow the syllabus).
 */
export type Roadmap = { id: GoalId; order: "list" | "grade"; stages: readonly RoadStage[] };

export const isSkill = (i: Item): i is SkillItem => "skill" in i;
export const isRead = (i: Item): i is ReadItem => "read" in i;
export const isLab = (i: Item): i is LabItem => "lab" in i;
export const isGame = (i: Item): i is GameItem => "game" in i;
/** Skills with all three levels. */
export const skills = (...ks: SkillId[]): SkillItem[] => ks.map((skill) => ({ skill, levels: ALL_LEVELS }));
export const games = (...gs: GameId[]): GameItem[] => gs.map((game) => ({ game }));
export const reads = (...ts: TopicId[]): ReadItem[] => ts.map((read) => ({ read }));
export const labs = (...ls: LabId[]): LabItem[] => ls.map((lab) => ({ lab }));
/** One id for an item, the same on every roadmap: what its achieved date is kept under. */
export const itemId = (i: Item) =>
  isSkill(i) ? `skill:${i.skill}${i.levels.length === 3 ? "" : `.${i.levels.join("")}`}` : isRead(i) ? `read:${i.read}` : isLab(i) ? `lab:${i.lab}` : `game:${i.game}`;

/**
 * Where an item is: done (every level secure, the game passed, the intro read or the lab tried), behind (every level secure or below the learner's
 * grade, so taken as known), part (some level secure) or open.
 */
export type ItemState = "done" | "behind" | "part" | "open";
/** What the learner has done, read once: their standing in free practice, whether a game's ladder is passed, whether
 * a topic's intro has been read and whether a lab has been tried, and each skill's learning stage (learningStage.ts;
 * none: 0 for every skill). */
export type Work = {
  s: Standing; passed: (game: GameId) => boolean; read: (topic: TopicId) => boolean; tried: (lab: LabId) => boolean;
  stage?: (skill: SkillId) => LearningStage;
};

export function itemState(i: Item, w: Work): ItemState {
  if (isRead(i)) return w.read(i.read) ? "done" : "open";
  if (isLab(i)) return w.tried(i.lab) ? "done" : "open";
  if (!isSkill(i)) return w.passed(i.game) ? "done" : "open";
  const st = i.levels.map((L) => w.s.level(i.skill, L));
  if (st.every((x) => x === "secure")) return "done";
  if (st.every((x) => x !== "open")) return "behind";
  return st.includes("secure") ? "part" : "open";
}
const settled = (x: ItemState) => x === "done" || x === "behind";

/** A stage's items or a whole roadmap's: how many done, how many behind the learner, of how many. */
export function progressOf(items: readonly Item[], w: Work) {
  const st = items.map((i) => itemState(i, w));
  return { done: st.filter((x) => x === "done").length, behind: st.filter((x) => x === "behind").length, total: st.length };
}
export const itemsOf = (r: Pick<Roadmap, "stages">) => r.stages.flatMap((s) => s.items);

const rank = (g: Grade | null) => (g === null ? Infinity : GRADES.indexOf(g));

/**
 * The open level to do first so that a level can be done: the level itself when its prerequisites are met, otherwise
 * (depth first, through the prerequisites the skill builds on) the first open one they wait for that is ready.
 */
export function unblock(skill: SkillId, L: Level, s: Standing): { skill: SkillId; level: Level } {
  if (s.ready(skill, L)) return { skill, level: L };
  const by = rank(gradeOf(skill, L));
  for (const pre of PREREQUISITES[skill] ?? [])
    for (const M of ALL_LEVELS) if (rank(gradeOf(pre, M)) <= by && s.level(pre, M) === "open") return unblock(pre, M, s);
  return { skill, level: L };
}

/**
 * What to do next on a roadmap: the item, and for a skill its level and the practice that opens it (`via`, the level
 * itself when nothing is in the way). A "list" roadmap takes its first item not done or behind; a "grade" roadmap, of
 * its open levels whose prerequisites are met, those of the lowest grade, and of those the first on the map (as the
 * course's nextStep). Null once every item is done or behind.
 */
export type Next = { item: Item; level?: Level; via?: { skill: SkillId; level: Level } };
export function roadNext(r: Pick<Roadmap, "order" | "stages">, w: Work): Next | null {
  const items = itemsOf(r);
  if (r.order === "grade") {
    let best: (Next & { key: number }) | null = null;
    items.forEach((item, n) => {
      if (!isSkill(item)) return;
      for (const level of item.levels) {
        const g = gradeOf(item.skill, level);
        if (g === null || w.s.level(item.skill, level) !== "open" || !w.s.ready(item.skill, level)) continue;
        const key = rank(g) * 1e5 + n * 10 + level;
        if (!best || key < best.key) best = { item, level, via: { skill: item.skill, level }, key };
      }
    });
    if (best) {
      const { item, level, via } = best as Next & { key: number };
      return { item, level, via };
    }
  }
  const item = items.find((i) => !settled(itemState(i, w)));
  if (!item) return null;
  if (!isSkill(item)) return { item };
  const level = item.levels.find((L) => w.s.level(item.skill, L) === "open")!;
  return { item, level, via: unblock(item.skill, level, w.s) };
}

/**
 * When an item was achieved, from the dates kept as levels were secured and ladders passed (achieved.ts): for a skill
 * the day its last level was secured; for an intro, the day it was read; for a lab, the day it was first tried. Undefined when it isn't done, or was done
 * before dates were kept.
 */
export function achievedAt(i: Item, dates: Readonly<Record<string, number>>): number | undefined {
  if (isRead(i) || isLab(i)) return dates[itemId(i)];
  if (!isSkill(i)) return dates[`ladder:${GAME_KEYS[i.game]}`];
  const ds = i.levels.map((L) => dates[`cell:${cellKey({ skill: i.skill, level: L })}`]);
  return ds.every((d) => d !== undefined) ? Math.max(...(ds as number[])) : undefined;
}
