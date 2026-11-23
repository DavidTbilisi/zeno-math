// Today (issue #585): one short session built from the learner's own state, in the order of the four learning stages
// (learningStage.ts, #576). 1 the reviews that have fallen due (spacing.ts), each opening with its idea card where the
// skill is made of ideas (#579); 2 one new idea, the course's next step, through its topic's "predict, then reveal"
// when one is still to be guessed (#578); 3 one drill, the top level timed on the skill nearest to gold (a green skill,
// else a blue one at the edge of what is secure); 4 one problem that puts a green or gold skill in a new setting (a
// word problem, or a "Which tool?" game, #581/#582). Each part is left out when there is nothing for it.
//
// A pure function of the state, so the same state always gives the same session and it can be tested without a page.
import type { Level } from "./elo.ts";
import type { Standing } from "./course.ts";
import { nextStep } from "./course.ts";
import { hasIdeas } from "./ideaState.ts";
import { learningStageOf, TOP_LEVEL, type LearningStage, type Stages } from "./learningStage.ts";
import { isDue, type Spacing } from "./spacing.ts";
import { TOPICS, type TopicId } from "./topics.ts";
import type { SkillId } from "../math/practiceSkills.ts";
import { CURRICULUM } from "./curriculum.ts";

/** At most this many reviews in one session: the rest wait for tomorrow. */
export const TODAY_REVIEWS = 3;

/** Where a green or gold skill meets something new: a practice skill that hides it in words, or a game. */
export type Setting = { via: "words"; skill: SkillId; level: Level } | { via: "game"; game: string };

/**
 * New settings for a skill. Word problems (bar models and proportion) put number skills in words; the order in each
 * list is the order tried. Games join as they land (#581's "Which tool?" sets, #583's crux).
 */
export const SETTINGS: Partial<Record<SkillId, readonly Setting[]>> = {
  times: [{ via: "words", skill: "barModels", level: 1 }],
  fractions: [{ via: "words", skill: "barModels", level: 2 }],
  ratio: [{ via: "words", skill: "proportion", level: 1 }, { via: "words", skill: "barModels", level: 3 }],
  rate: [{ via: "words", skill: "proportion", level: 1 }],
  percent: [{ via: "words", skill: "barModels", level: 3 }],
  linear: [{ via: "words", skill: "barModels", level: 3 }],
};

export type TodayPart =
  | { part: "review"; skill: SkillId; level: Level; card: boolean }
  /** predict: the topic whose page asks a prediction still to be made, to open first; null for none. */
  | { part: "idea"; skill: SkillId; level: Level; predict: TopicId | null }
  | { part: "drill"; skill: SkillId; level: Level }
  | { part: "problem"; skill: SkillId; setting: Setting };

export type TodayInput = {
  now: number;
  standing: Standing;
  /** Free practice's review schedule, by level ("fractions.2"). */
  spacing: Spacing;
  stages: Stages;
  /** The topics whose page still asks a prediction ("predict, then reveal", #578). */
  toPredict: readonly TopicId[];
};

const ORDER = new Map(CURRICULUM.map((k, i) => [k, i]));
const inOrder = (a: SkillId, b: SkillId) => (ORDER.get(a) ?? 1e9) - (ORDER.get(b) ?? 1e9);

export function buildToday(input: TodayInput): TodayPart[] {
  const { now, standing, spacing, stages, toPredict } = input;
  const parts: TodayPart[] = [];
  const stage = (k: SkillId): LearningStage => learningStageOf(stages, k);

  // 1 Reviews due, the longest overdue first, each skill once.
  const due = Object.entries(spacing)
    .filter(([, d]) => isDue(d, now))
    .sort(([a, x], [b, y]) => x!.due - y!.due || a.localeCompare(b))
    .map(([key]) => {
      const [skill, L] = key.split(".");
      return { skill: skill as SkillId, level: Number(L) as Level };
    })
    .filter((c, i, all) => all.findIndex((d) => d.skill === c.skill) === i && ORDER.has(c.skill));
  for (const c of due.slice(0, TODAY_REVIEWS)) parts.push({ part: "review", ...c, card: hasIdeas(c.skill) });
  const busy = new Set<SkillId>(parts.map((p) => p.skill));

  // 2 One new idea: the course's next step, with its topic's prediction if it is still to be made.
  const next = nextStep(standing);
  if (next && !busy.has(next.skill)) {
    const predict = TOPICS.find((t) => t.skills.includes(next.skill) && toPredict.includes(t.id))?.id ?? null;
    parts.push({ part: "idea", ...next, predict });
    busy.add(next.skill);
  }

  // 3 One drill on the skill nearest to gold: a green one on its top level against the clock of its own pace, else a
  // blue one at the edge of what is secure.
  const started = Object.keys(stages).filter((k): k is SkillId => ORDER.has(k as SkillId) && !busy.has(k as SkillId)).sort(inOrder);
  const green = started.find((k) => stage(k) === 2);
  const blue = started.find((k) => stage(k) === 1);
  if (green) parts.push({ part: "drill", skill: green, level: TOP_LEVEL });
  else if (blue) {
    const edge = ([1, 2, 3] as const).find((L) => standing.level(blue, L) === "open") ?? TOP_LEVEL;
    parts.push({ part: "drill", skill: blue, level: edge });
  }
  const drilled = parts.at(-1)?.part === "drill" ? parts.at(-1)!.skill : null;

  // 4 One problem: a green or gold skill in a new setting, the furthest on first (gold before green).
  const ready = started.filter((k) => k !== drilled && (stage(k) === 3 || stage(k) === 2) && SETTINGS[k]?.length);
  const use = ready.find((k) => stage(k) === 3) ?? ready[0];
  if (use) parts.push({ part: "problem", skill: use, setting: SETTINGS[use]![0] });

  return parts;
}

/** The skills a session works on, for the picture of what moved at its end. */
export const todaySkills = (parts: readonly TodayPart[]): SkillId[] => [...new Set(parts.map((p) => p.skill))];
