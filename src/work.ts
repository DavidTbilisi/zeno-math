// What the learner has done in this browser, read once for a page: their standing in free practice (secure levels and
// the grade they found), the games whose ladders they have passed, the topic intros they have read, the labs they
// have tried and each skill's learning stage. The roadmaps, the topics and My progress all tick from this one reading,
// so they always agree.
import { ladderPassedHere, loadAchieved } from "./achieved";
import { standing } from "./model/course";
import { learningStageOf } from "./model/learningStage";
import { GAME_KEYS, type Work } from "./model/roadmap";
import { loadProgress } from "./practiceProgress";

export function readWork(): Work {
  const p = loadProgress();
  const dates = loadAchieved();
  return {
    s: standing(p.cells ?? {}, p.placed ?? null),
    passed: (g) => ladderPassedHere(GAME_KEYS[g]),
    read: (topic) => dates[`read:${topic}`] !== undefined,
    tried: (lab) => dates[`lab:${lab}`] !== undefined,
    stage: (skill) => learningStageOf(p.stages, skill),
  };
}
