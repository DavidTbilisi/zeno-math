// The student's side of the practice study: the code they joined a class with, the record of the question they are
// on, and an outbox that keeps finished questions in this browser until the server has them (classroom Wi-Fi drops).
import type { Exercise, Verdict } from "./math/practice";

export type Condition = "adaptive" | "fixed";
export type Student = { code: string; class: string; condition: Condition };
/** correct; close (nearly); wrong; form (right idea, wrong form: sent back without counting as a miss). */
export type AnswerVerdict = "correct" | "close" | "wrong" | "form";
export type Outcome = "solved" | "revealed" | "skipped";
export type LoggedAnswer = { input: string; verdict: AnswerVerdict; ms: number };

/** What the server stores for one question (see server/research.ts, which works out the summary columns). */
export type Attempt = {
  clientId: string;
  student: string;
  skill: Exercise["skill"];
  level: Exercise["level"];
  seed: number;
  review: boolean;
  outcome: Outcome;
  solutionViewed: boolean;
  msTotal: number;
  answers: LoggedAnswer[];
  shownAt: number;
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
};

export const startLog = (shownAt = Date.now(), t0 = performance.now()): QuestionLog =>
  ({ shownAt, t0, answers: [], outcome: null, msTotal: null, solutionViewed: false });

export const verdictOf = (v: Verdict): AnswerVerdict => (v.ok ? "correct" : v.why ? "form" : v.close ? "close" : "wrong");

const ms = (log: QuestionLog, now: number) => Math.max(0, Math.round(now - log.t0));
export const logAnswer = (log: QuestionLog, input: string, v: Verdict, now = performance.now()) =>
  log.answers.push({ input: input.trim().slice(0, 200), verdict: verdictOf(v), ms: ms(log, now) });
export function finish(log: QuestionLog, outcome: Exclude<Outcome, "skipped">, now = performance.now()) {
  if (log.outcome) return;
  log.outcome = outcome;
  log.msTotal = ms(log, now);
}

const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

/** The record of a question the student is leaving, or null when there is nothing to learn from it (never tried). */
export function toAttempt(log: QuestionLog, ex: Exercise, review: boolean, student: Student, now = performance.now(), id = newId()): Attempt | null {
  if (!log.outcome && !log.answers.length) return null;
  return {
    clientId: id,
    student: student.code,
    skill: ex.skill,
    level: ex.level,
    seed: ex.seed,
    review,
    outcome: log.outcome ?? "skipped",
    solutionViewed: log.solutionViewed,
    msTotal: log.msTotal ?? ms(log, now),
    answers: log.answers,
    shownAt: log.shownAt,
  };
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

/** Attempts waiting for the server, oldest first. Kept in a slot so a closed tab or a dropped connection loses nothing. */
export class Outbox {
  private chain: Promise<unknown> = Promise.resolve();
  private slot: Slot;
  private send: (a: Attempt, keepalive: boolean) => Promise<SendResult>;
  constructor(slot: Slot, send: (a: Attempt, keepalive: boolean) => Promise<SendResult>) {
    this.slot = slot;
    this.send = send;
  }

  items(): Attempt[] {
    try {
      const list = JSON.parse(this.slot.get() ?? "[]");
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  private write(list: Attempt[]) {
    this.slot.set(list.length ? JSON.stringify(list) : null);
  }
  add(a: Attempt) {
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
