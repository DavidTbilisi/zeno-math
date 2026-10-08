// One simulated study at a time, on a worker thread: scripts/simulate-study.ts hands out (assumption, size, run)
// tasks, each seeded on its own, so a study comes out the same whichever thread runs it and however many there are.
import { isMainThread, parentPort } from "node:worker_threads";
import { ancova } from "../src/model/analysis.ts";
import { runStudy, summarise, type StudyParams, type StudyResult } from "../src/model/simulate.ts";

/** What the study script keeps of a run: the planned analysis on the class tests, and the gains by arm. */
export type Outcome = { ancova: ReturnType<typeof ancova>; summary: ReturnType<typeof summarise> };
export const outcome = (r: StudyResult): Outcome => ({
  ancova: ancova(r.learners.map((l) => ({ treated: l.arm === 0 ? 1 : 0, pre: l.preTest, post: l.postTest }))),
  summary: summarise(r),
});

export type Task = { id: number; params: Partial<StudyParams> };

if (!isMainThread) parentPort!.on("message", (t: Task) => parentPort!.postMessage({ id: t.id, outcome: outcome(runStudy(t.params)) }));
