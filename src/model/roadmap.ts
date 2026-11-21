// Roadmaps by goal (#449): an ordered checklist of what to learn for one goal (software engineering, algorithms,
// finance, banking, machine learning, school), in stages. An item is a skill's levels made secure in free practice or
// a game's ladder passed (2★ on every puzzle), so it ticks itself from the learner's own work, and because skills are
// shared, a tick counts on every roadmap that has it. The machine-learning roadmap is the course map (course.ts).
import type { LiveKind } from "../math/live.ts";
import type { SkillId } from "../math/practiceSkills.ts";
import { gradeOf, GRADES, PREREQUISITES, type Grade } from "./curriculum.ts";
import type { Level } from "./elo.ts";
import type { Standing } from "./course.ts";
import { cellKey } from "./placement.ts";

export const GOALS = ["software", "algorithms", "finance", "banking", "ml", "school"] as const;
export type GoalId = (typeof GOALS)[number];
export const isGoal = (v: unknown): v is GoalId => GOALS.includes(v as GoalId);

/** The games a roadmap can ask for, with where each keeps its ladder in this browser (its useGame key). */
export const GAME_KEYS = {
  beSort: "zeno.besort.v1", beSearch: "zeno.besearch.v1", beBinary: "zeno.bebinary.v1", bePointers: "zeno.bepointers.v1",
  beWindow: "zeno.bewindow.v1", beStack: "zeno.bestack.v1", beHeap: "zeno.beheap.v1", beTree: "zeno.betree.v1",
  beUnion: "zeno.beunion.v1", beTopo: "zeno.betopo.v1", beDp: "zeno.bedp.v1", beBacktrack: "zeno.bebacktrack.v1", beName: "zeno.bename.v1",
  beCache: "zeno.becache.v1", beBalance: "zeno.bebalance.v1", beRing: "zeno.bering.v1", beLimit: "zeno.belimit.v1",
  beQuorum: "zeno.bequorum.v1", beQueue: "zeno.bequeue.v1", beComp: "zeno.becomp.v1",
  connectTowns: "zeno.connecttowns.v1", shortestPath: "zeno.shortestpath.v1", oneStroke: "zeno.onestroke.v1", colourMap: "zeno.colourmap.v1",
  primeSlice: "zeno.primeSlice.v1", divisible: "zeno.divisible.v1", barChart: "zeno.barchart.v1", makeDiagram: "zeno.makediagram.v1",
  graphStory: "zeno.graphstory.v1", estimate: "zeno.estimate.v1", balance: "zeno.balance.v1", slopeLine: "zeno.slopeline.v1",
} as const satisfies Partial<Record<LiveKind, string>>;
export type GameId = keyof typeof GAME_KEYS;

const ALL_LEVELS: readonly Level[] = [1, 2, 3];
export type SkillItem = { skill: SkillId; levels: readonly Level[] };
export type GameItem = { game: GameId };
export type Item = SkillItem | GameItem;
export type RoadStage = { id: string; items: readonly Item[] };
/**
 * A goal's roadmap. `order` is how Next is found: "list" walks the items in the order written (a roadmap made by hand),
 * "grade" takes the lowest grade first (the course and school, which hold every graded level and follow the syllabus).
 */
export type Roadmap = { id: GoalId; order: "list" | "grade"; stages: readonly RoadStage[] };

export const isSkill = (i: Item): i is SkillItem => "skill" in i;
/** Skills with all three levels. */
export const skills = (...ks: SkillId[]): SkillItem[] => ks.map((skill) => ({ skill, levels: ALL_LEVELS }));
export const games = (...gs: GameId[]): GameItem[] => gs.map((game) => ({ game }));
/** One id for an item, the same on every roadmap: what its achieved date is kept under. */
export const itemId = (i: Item) => (isSkill(i) ? `skill:${i.skill}${i.levels.length === 3 ? "" : `.${i.levels.join("")}`}` : `game:${i.game}`);

/**
 * Where an item is: done (every level secure, or the game passed), behind (every level secure or below the learner's
 * grade, so taken as known), part (some level secure) or open.
 */
export type ItemState = "done" | "behind" | "part" | "open";
/** What the learner has done, read once: their standing in free practice and whether a game's ladder is passed. */
export type Work = { s: Standing; passed: (game: GameId) => boolean };

export function itemState(i: Item, w: Work): ItemState {
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
export const itemsOf = (r: Roadmap) => r.stages.flatMap((s) => s.items);

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
export function roadNext(r: Roadmap, w: Work): Next | null {
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
 * the day its last level was secured. Undefined when it isn't done, or was done before dates were kept.
 */
export function achievedAt(i: Item, dates: Readonly<Record<string, number>>): number | undefined {
  if (!isSkill(i)) return dates[`ladder:${GAME_KEYS[i.game]}`];
  const ds = i.levels.map((L) => dates[`cell:${cellKey({ skill: i.skill, level: L })}`]);
  return ds.every((d) => d !== undefined) ? Math.max(...(ds as number[])) : undefined;
}
