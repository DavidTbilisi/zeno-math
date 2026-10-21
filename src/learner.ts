// The student's side of the practice study: the code they joined a class with, the record of the question they are
// on, and an outbox that keeps finished questions in this browser until the server has them (classroom Wi-Fi drops).
import { en } from "./locales/en";
import { check, exercise, stepsOf, type Exercise, type PracticeWords, type Verdict } from "./math/practice";
import type { SkillId } from "./math/practiceSkills";
import { EloModel, type ModelState } from "./model/elo";
import { evidence } from "./model/evaluate";
import type { FractionsNode } from "./model/conceptGraph";
import { asksWhatWasHard, bearing, hasIdeas, learnIdeas, usesOf, type IdeaState } from "./model/ideaState";
import { RECENT, type Choice } from "./model/policy";
import type { Form, TestPhase } from "./model/testForms";

export type Condition = "adaptive" | "fixed";
export type Student = { code: string; class: string; condition: Condition };
/** correct; close (nearly); wrong; form (right idea, wrong form: sent back without counting as a miss). */
export type AnswerVerdict = "correct" | "close" | "wrong" | "form";
export type Outcome = "solved" | "revealed" | "skipped";
/** Who chose the question: the student's condition (class practice), the student (free practice), or the review of misses. */
export type ChosenBy = Condition | "free" | "review";
/** How a question came to be asked, recorded with it. */
export type Origin = { policy: ChosenBy; review: boolean; predicted: number | null };
/** What the class is doing, set by the teacher (see server/protocol.ts). */
export type Phase = "open" | "pretest" | "session" | "posttest" | "closed";
/** Where the student is with the class's protocol: its phase, a timed session's end, and their two tests. */
export type Protocol = {
  class: string;
  phase: Phase;
  sessionEnds: number | null;
  testLength: number;
  tests: Record<TestPhase, { form: Form; answered: number[] }>;
};
/** What the server sends for class practice (GET /api/students/:code/plan); the student's ratings are under "me", their ideas under "ideas". */
export type Plan = Protocol & { condition: Condition; skills: SkillId[]; position: number; recent: SkillId[]; state: ModelState; ideas: IdeaState };
export type LoggedAnswer = { input: string; verdict: AnswerVerdict; ms: number };
/** One step of a question worked in steps (stepsOf in practice.ts), in the steps' order: the answers to it, and whether its answer was shown. */
export type StepLog = { answers: LoggedAnswer[]; shown: boolean };

/** What the server stores for one question (see server/research.ts, which works out the summary columns). */
export type Attempt = {
  clientId: string;
  student: string;
  skill: Exercise["skill"];
  level: Exercise["level"];
  seed: number;
  review: boolean;
  outcome: Outcome;
  policy: ChosenBy;
  /** The learner model's chance of a right first answer when the question was shown (null without a model). */
  predicted: number | null;
  solutionViewed: boolean;
  msTotal: number;
  answers: LoggedAnswer[];
  shownAt: number;
  /** The ideas the student ticked as hard after a wrong answer (whatWasHard), when they ticked any. */
  hard?: string[];
  /** The steps the student worked after a wrong answer, when the question was worked in steps. */
  steps?: StepLog[];
};

/** One question as the student works on it. Times are from performance.now(), so a clock change doesn't skew them. */
export type QuestionLog = {
  shownAt: number;
  t0: number;
  answers: LoggedAnswer[];
  outcome: Exclude<Outcome, "skipped"> | null;
  /** When the question was finished; a solution looked at afterwards still counts, but not the time spent on it. */
  msTotal: number | null;
  solutionViewed: boolean;
  /** The ideas ticked as hard, in the order the list shows them. */
  hard: string[];
  /** The steps worked so far, when the question is being worked in steps. */
  steps: StepLog[];
};

export const startLog = (shownAt = Date.now(), t0 = performance.now()): QuestionLog =>
  ({ shownAt, t0, answers: [], outcome: null, msTotal: null, solutionViewed: false, hard: [], steps: [] });

export const verdictOf = (v: Verdict): AnswerVerdict => (v.ok ? "correct" : v.why ? "form" : v.close ? "close" : "wrong");

const ms = (log: QuestionLog, now: number) => Math.max(0, Math.round(now - log.t0));
export const logAnswer = (log: QuestionLog, input: string, v: Verdict, now = performance.now()) =>
  log.answers.push({ input: input.trim().slice(0, 200), verdict: verdictOf(v), ms: ms(log, now) });
/** An answer to step i, or (input null) its answer shown. */
export function logStep(log: QuestionLog, i: number, input: string | null, v?: Verdict, now = performance.now()) {
  while (log.steps.length <= i) log.steps.push({ answers: [], shown: false });
  if (input === null) log.steps[i].shown = true;
  else log.steps[i].answers.push({ input: input.trim().slice(0, 200), verdict: verdictOf(v!), ms: ms(log, now) });
}
export function finish(log: QuestionLog, outcome: Exclude<Outcome, "skipped">, now = performance.now()) {
  if (log.outcome) return;
  log.outcome = outcome;
  log.msTotal = ms(log, now);
}

export const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

/** The record of a question the student is leaving, or null when there is nothing to learn from it (never tried). */
export function toAttempt(log: QuestionLog, ex: Exercise, origin: Origin, student: Student, now = performance.now(), id = newId()): Attempt | null {
  if (!log.outcome && !log.answers.length) return null;
  return {
    clientId: id,
    student: student.code,
    skill: ex.skill,
    level: ex.level,
    seed: ex.seed,
    review: origin.review,
    outcome: log.outcome ?? "skipped",
    policy: origin.policy,
    predicted: origin.predicted,
    solutionViewed: log.solutionViewed,
    msTotal: log.msTotal ?? ms(log, now),
    answers: log.answers,
    shownAt: log.shownAt,
    ...(log.hard.length ? { hard: log.hard } : {}),
    ...(log.steps.length ? { steps: log.steps } : {}),
  };
}

/** The student's own name in the model the browser keeps (the server sends their ratings under it). */
export const ME = "me";
/** Class practice as the browser keeps it: the server's plan, carried forward by every question the student leaves. */
export type ClassPlan = Protocol & { condition: Condition; skills: SkillId[]; position: number; recent: SkillId[]; model: EloModel; ideas: IdeaState };
export const toClassPlan = ({ state, ...rest }: Plan): ClassPlan => ({ ...rest, model: EloModel.fromState(state) });
/** A newer plan's protocol (the teacher may have moved the class on) over the plan the browser has been carrying forward. */
export const withProtocol = (plan: ClassPlan, p: Protocol): ClassPlan =>
  ({ ...plan, class: p.class, phase: p.phase, sessionEnds: p.sessionEnds, testLength: p.testLength, tests: p.tests });

/** One answer on a test. Nothing is shown to the student; the server works out which question it was. */
export type TestAnswer = {
  clientId: string;
  student: string;
  phase: TestPhase;
  item: number;
  input: string;
  verdict: "correct" | "close" | "wrong" | "skipped";
  /** Answers sent back for their form ("lowest terms") before this one. */
  retries: number;
  ms: number;
};
/** What the server will do once it has the attempt: the model and the ideas learn from it, the fixed sequence moves on. */
export function applyAttempt(plan: ClassPlan, a: Attempt) {
  const correct = attemptEvidence(a);
  if (correct !== null) plan.model.update({ student: ME, skill: a.skill, level: a.level, correct });
  learnFromAttempt(plan.ideas, a);
  if (a.policy === "fixed") plan.position++;
  plan.recent = [...plan.recent, a.skill].slice(-RECENT);
}

/** What the attempt tells the learner model, by the same rule the server uses (null: nothing). */
export function attemptEvidence(a: Pick<Attempt, "outcome" | "answers">): boolean | null {
  const counted = a.answers.filter((x) => x.verdict !== "form");
  return evidence(counted.length, a.outcome, counted[0]?.verdict === "correct");
}
/** What a step says, by the same rule: its first counted answer, or wrong when its answer was shown untried. */
const stepEvidence = (s: StepLog) => attemptEvidence({ outcome: s.shown ? "revealed" : "skipped", answers: s.answers });

/** The mistake the checker recognises in the first counted answer, when that answer was wrong. */
const firstMistake = (ex: Exercise, answers: readonly Pick<LoggedAnswer, "input" | "verdict">[]) => {
  const first = answers.find((x) => x.verdict !== "form");
  return first && first.verdict !== "correct" ? check(ex, first.input, en.pracWords).mistake : undefined;
};

/**
 * What the attempt tells the student's ideas (src/model/ideaState.ts), the same on the server and in the browser: the
 * question is rebuilt from its skill, level and seed, the mistake, if the first counted answer made one the checker
 * recognises, is read off that answer, and what the student ticked as hard goes with it. Then each step worked, as a
 * question of its own on the ideas it needs. The words don't matter to either; English rebuilds it everywhere.
 */
export function learnFromAttempt(state: IdeaState, a: Pick<Attempt, "skill" | "level" | "seed" | "outcome" | "answers" | "hard" | "steps">) {
  if (!hasIdeas(a.skill)) return;
  const correct = attemptEvidence(a);
  if (correct === null) return;
  const ex = exercise(a.skill, a.level, a.seed, en.pracWords);
  learnIdeas(state, ex, correct, correct ? undefined : firstMistake(ex, a.answers), a.hard);
  const steps = a.steps?.length ? stepsOf(ex, en.pracWords) : [];
  a.steps?.forEach((s, i) => {
    const right = stepEvidence(s);
    if (right !== null && steps[i]) learnIdeas(state, steps[i], right, right ? undefined : firstMistake(steps[i], s.answers));
  });
}

/**
 * The ideas to ask about once a question is over ("what exactly was hard?"), or null when there is nothing to ask: the
 * first counted answer was right, or wrong in the shape of a mistake that already names the idea, or the question was
 * worked in steps, which said which idea went wrong, or the skill has no ideas. The question's own ideas, in the
 * graph's order.
 */
export function whatWasHard(ex: Exercise, log: Pick<QuestionLog, "outcome" | "answers" | "steps">): readonly FractionsNode[] | null {
  if (!hasIdeas(ex.skill) || log.steps.length || attemptEvidence({ outcome: log.outcome ?? "skipped", answers: log.answers }) !== false) return null;
  return asksWhatWasHard(ex, firstMistake(ex, log.answers)) ? usesOf(ex) : null;
}

/** Questions tried when aiming at an idea: a form asked in one question of fifteen is missing from all of them once in a thousand. */
export const AIM_TRIES = 100;
/** A question bearing this much on an idea needs it and one other at most (on fractions, the idea and "part"): no question does better. */
const ALONE = 0.5;
/**
 * The question for a choice: a fresh one on its skill and level, or, when the choice names an idea, of up to AIM_TRIES
 * fresh ones the one bearing most on that idea (ideaState.ts): on fractions the form asking for it alone when one exists.
 */
export function exerciseFor(c: Choice, w: PracticeWords, random: () => number = Math.random): Exercise {
  const fresh = () => exercise(c.skill, c.level, Math.floor(random() * 2 ** 31), w);
  if (!c.idea) return fresh();
  let best = fresh(), share = bearing(best, c.idea);
  for (let i = 1; i < AIM_TRIES && share < ALONE; i++) {
    const ex = fresh(), b = bearing(ex, c.idea);
    if (b > share) (best = ex), (share = b);
  }
  return best;
}

// ---------- storage ----------

/** A string slot: localStorage in the browser, a variable in the tests. */
export type Slot = { get(): string | null; set(value: string | null): void };
export const localSlot = (key: string): Slot => ({
  get: () => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (value) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // private mode or full storage: nothing is kept between visits
    }
  },
});

const studentSlot = localSlot("zeno.student.v1");
export function loadStudent(): Student | null {
  try {
    const s = JSON.parse(studentSlot.get() ?? "null") as Student | null;
    return s && typeof s.code === "string" && typeof s.class === "string" ? s : null;
  } catch {
    return null;
  }
}
export const saveStudent = (s: Student | null) => studentSlot.set(s && JSON.stringify(s));

/** stored: the server has it (or had it already); drop: it never will (unknown student, refused); retry: try later. */
export type SendResult = "stored" | "drop" | "retry";

/** Records waiting for the server, oldest first. Kept in a slot so a closed tab or a dropped connection loses nothing. */
export class Outbox<T extends { clientId: string; student: string } = Attempt> {
  private chain: Promise<unknown> = Promise.resolve();
  private slot: Slot;
  private send: (a: T, keepalive: boolean) => Promise<SendResult>;
  constructor(slot: Slot, send: (a: T, keepalive: boolean) => Promise<SendResult>) {
    this.slot = slot;
    this.send = send;
  }

  items(): T[] {
    try {
      const list = JSON.parse(this.slot.get() ?? "[]");
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  private write(list: T[]) {
    this.slot.set(list.length ? JSON.stringify(list) : null);
  }
  add(a: T) {
    this.write([...this.items(), a]);
  }
  /** Drops what a student left behind on this browser (they signed out and asked for their records to be deleted). */
  discard(student: string) {
    this.write(this.items().filter((a) => a.student !== student));
  }

  /** Sends in order, one at a time; stops at the first that has to wait. Resolves to how many are still waiting. */
  flush(keepalive = false): Promise<number> {
    const run = async () => {
      for (const a of this.items()) {
        let result: SendResult;
        try {
          result = await this.send(a, keepalive);
        } catch {
          result = "retry";
        }
        if (result === "retry") break;
        // Re-read: something may have been added while this one was on its way.
        this.write(this.items().filter((x) => x.clientId !== a.clientId));
      }
      return this.items().length;
    };
    const next = this.chain.then(run, run);
    this.chain = next;
    return next;
  }
}
