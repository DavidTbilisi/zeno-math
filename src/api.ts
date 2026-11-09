import type { Dashboard } from "../server/dashboard";
import { loadStudent, type Attempt, type Phase, type Plan, type SendResult, type Student, type TestAnswer } from "./learner";
import type { SkillId } from "./math/practiceSkills";
import type { Feature } from "./model/arms";
import type { Form, TestPhase } from "./model/testForms";
import { TEACHER_KEY } from "./teacherMode";

export type BoardSummary = { id: string; title: string; createdAt: number; updatedAt: number };
export type BoardScene = { elements?: readonly unknown[]; files?: Record<string, unknown>; appState?: Record<string, unknown> };
/** readOnly: a student's board opened by a teacher, who may look but not change it. */
export type Board = { id: string; title: string; updatedAt: number; scene: BoardScene; shareToken?: string | null; readOnly?: boolean };
/** A student's board in a teacher's list of a class's boards: whose it is, as the teacher's page names students. */
export type ClassBoard = BoardSummary & { student: string; number: number | null };
/** A board seen through its read-only link: no id, so nothing that could edit it. */
export type SharedBoard = { title: string; updatedAt: number; scene: BoardScene };

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function req<T>(method: string, url: string, body?: unknown, keepalive = false, headers: Record<string, string> = {}): Promise<T> {
  const json = body === undefined ? undefined : JSON.stringify(body);
  const res = await fetch(url, {
    method,
    // Browsers refuse keepalive requests over 64 KB; a bigger one goes out normally and may not finish.
    keepalive: keepalive && (json?.length ?? 0) < 60000,
    headers: json === undefined ? headers : { "Content-Type": "application/json", ...headers },
    body: json,
  });
  if (!res.ok) throw new ApiError(`${method} ${url}: ${res.status}`, res.status);
  return res.status === 204 ? (undefined as T) : res.json();
}

/**
 * Whose boards these calls are about (server/research.ts boardUser): the teachers' in a tab signed in on the teacher's
 * page, else this browser's student's, else nobody's (the server then refuses, unless it asks for no teacher password).
 */
export function boardOwner(): Record<string, string> {
  try {
    const password = sessionStorage.getItem(TEACHER_KEY);
    if (password !== null) return password ? { "X-Teacher-Password": password } : {};
  } catch {
    // no session storage: not a teacher's tab
  }
  const student = loadStudent();
  return student ? { "X-Student-Code": student.code } : {};
}

export const api = {
  list: () => req<BoardSummary[]>("GET", "/api/boards", undefined, false, boardOwner()),
  create: (title: string) => req<BoardSummary>("POST", "/api/boards", { title }, false, boardOwner()),
  get: (id: string) => req<Board>("GET", `/api/boards/${id}`, undefined, false, boardOwner()),
  /** With baseUpdatedAt, fails with status 409 if the board was saved elsewhere since. keepalive: the request may outlive the page. */
  save: (id: string, data: { title?: string; scene?: BoardScene; baseUpdatedAt?: number }, keepalive = false) =>
    req<{ updatedAt: number; previous: number }>("PUT", `/api/boards/${id}`, data, keepalive, boardOwner()),
  remove: (id: string) => req<void>("DELETE", `/api/boards/${id}`, undefined, false, boardOwner()),
  /** The board's read-only link (made the first time), and taking it away. */
  share: (id: string) => req<{ token: string }>("POST", `/api/boards/${id}/share`, {}, false, boardOwner()),
  unshare: (id: string) => req<void>("DELETE", `/api/boards/${id}/share`, undefined, false, boardOwner()),
  /** Every board, the teachers' and the students', as one file to save (a teacher's only). */
  backup: async (): Promise<Blob> => {
    const res = await fetch("/api/export", { headers: boardOwner() });
    if (!res.ok) throw new ApiError(`GET /api/export: ${res.status}`, res.status);
    return res.blob();
  },
  /** A shared board; with the etag of the copy in hand, null while it is still the latest (the scene isn't sent again). */
  shared: async (token: string, etag?: string): Promise<{ board: SharedBoard; etag: string } | null> => {
    const url = `/api/shared/${encodeURIComponent(token)}`;
    const res = await fetch(url, { headers: etag ? { "If-None-Match": etag } : {} });
    if (res.status === 304) return null;
    if (!res.ok) throw new ApiError(`GET ${url}: ${res.status}`, res.status);
    return { board: await res.json(), etag: res.headers.get("ETag") ?? "" };
  },
};

/** The practice study (server/research.ts): joining a class, signing back in, and uploading finished questions. */
export const study = {
  /** number: the student's number in the class list; again: join though someone in the class already gave it (409). */
  join: (classCode: string, number?: number, again = false) =>
    req<Student>("POST", "/api/students", { class: classCode, number, again: again || undefined }),
  student: (code: string) => req<Student & { answered: number }>("GET", `/api/students/${encodeURIComponent(code)}`),
  plan: (code: string) => req<Plan>("GET", `/api/students/${encodeURIComponent(code)}/plan`),
  forget: (code: string) => req<void>("DELETE", `/api/students/${encodeURIComponent(code)}`),
  send: (a: Attempt, keepalive: boolean) => upload("/api/attempts", a, keepalive),
  sendTest: (a: TestAnswer, keepalive: boolean) => upload("/api/tests", a, keepalive),
};

/** Uploads one record from an outbox: stored, dropped (refused, or the student is gone), or to try again later. */
async function upload(url: string, record: unknown, keepalive: boolean): Promise<SendResult> {
  try {
    await req("POST", url, record, keepalive);
    return "stored";
  } catch (e) {
    // Unknown student (their record was deleted) or a refused record: sending it again won't help.
    if (e instanceof ApiError && (e.status === 400 || e.status === 404 || e.status === 413)) {
      console.warn("study record not stored:", e.message);
      return "drop";
    }
    return "retry";
  }
}

export type ClassSummary = {
  code: string;
  name: string;
  skills: SkillId[];
  /** The feature the class tests (arms.ts), and how many students are in each arm. */
  feature: Feature;
  /** Whether the class is in the study (issue #299); one out of it has homework at any time and stays out of the exports. */
  study: boolean;
  createdAt: number;
  students: number;
  on: number;
  off: number;
  attempts: number;
  phase: Phase;
  sessionEnds: number | null;
  testLength: number;
};
export type { Dashboard };

/**
 * How the teacher page names a student: by their number in the class list when they gave one ("№ 14"), else by their
 * number in the study ("s12"); with the student code after it when the teacher asks for codes.
 */
export const studentName = (id: string, number: number | null | undefined, code?: string) =>
  [number ? `№ ${number}` : id, code].filter(Boolean).join(" · ");

/** What came of a paper test typed in (server/protocol.ts recordPaperTest): each question's verdict, null where the
 * student had answered it online; reordered when the student's form order was swapped to fit the form they wrote. */
export type PaperResult = { form: Form; stored: number; kept: number; verdicts: (string | null)[]; reordered: boolean };

/** The teacher's side of the study. The password goes in a header (empty when the server doesn't ask for one). */
export function teacherApi(password: string) {
  const headers: Record<string, string> = password ? { "X-Teacher-Password": password } : {};
  return {
    classes: () => req<ClassSummary[]>("GET", "/api/classes", undefined, false, headers),
    create: (name: string, skills?: string[], testLength?: number, feature?: Feature) =>
      req<ClassSummary>("POST", "/api/classes", { name, skills, testLength, feature }, false, headers),
    /** Moves the class on; minutes starts a timed session. */
    setPhase: (code: string, phase: Phase, minutes?: number) =>
      req<{ phase: Phase; sessionEnds: number | null }>("POST", `/api/classes/${encodeURIComponent(code)}/phase`, { phase, minutes }, false, headers),
    dashboard: (code: string) => req<Dashboard>("GET", `/api/research/dashboard?class=${encodeURIComponent(code)}`, undefined, false, headers),
    /** Homework for every student in the class, each from their own records (409 until the delayed post-test). */
    homework: (code: string, length: number) =>
      req<{ students: number; length: number; createdAt: number }>("POST", `/api/classes/${encodeURIComponent(code)}/homework`, { length }, false, headers),
    /** Deletes a class nobody has joined (409 once someone has: close it instead). */
    remove: (code: string) => req<void>("DELETE", `/api/classes/${encodeURIComponent(code)}`, undefined, false, headers),
    /** Takes the class out of the study or puts it back (409 back in once it has had homework). */
    study: (code: string, study: boolean) =>
      req<{ study: boolean }>("POST", `/api/classes/${encodeURIComponent(code)}/study`, { study }, false, headers),
    /** A test written on paper, typed in: one answer per question in the printout's order, "" for one left blank. */
    paper: (code: string, student: string, phase: TestPhase, form: Form, answers: string[]) =>
      req<PaperResult>("POST", `/api/classes/${encodeURIComponent(code)}/paper`, { student, phase, form, answers }, false, headers),
    /** The class's students' boards, to open read only. */
    boards: (code: string) => req<ClassBoard[]>("GET", `/api/boards?class=${encodeURIComponent(code)}`, undefined, false, headers),
    /** The teacher has seen a stuck student: off the stuck list until ten more questions after attempt `through`. */
    seen: (code: string, student: string, skill: string, through: number) =>
      req<void>("POST", `/api/classes/${encodeURIComponent(code)}/seen`, { student, skill, through }, false, headers),
    /** A CSV export as a file to save (a plain link can't send the password header). */
    async csv(kind: "attempts" | "tests", code?: string): Promise<Blob> {
      const res = await fetch(`/api/research/${kind}.csv${code ? `?class=${encodeURIComponent(code)}` : ""}`, { headers });
      if (!res.ok) throw new ApiError(`GET ${kind}.csv: ${res.status}`, res.status);
      return res.blob();
    },
  };
}
