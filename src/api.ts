import type { Dashboard } from "../server/dashboard";
import type { UsageReport } from "../server/usage";
import { loadStudent, type Attempt, type Phase, type Plan, type SendResult, type Student, type TestAnswer } from "./learner";
import type { GoalId } from "./model/roadmap";
import type { GameId } from "./model/gameKeys";
import type { SkillId } from "./math/practiceSkills";
import type { Feature } from "./model/arms";
import type { Form, TestPhase } from "./model/testForms";
import { isTeacher } from "./teacherMode";
import type { Role } from "./account";
import { seen } from "./usage";

export type BoardSummary = { id: string; title: string; createdAt: number; updatedAt: number };
export type BoardScene = { elements?: readonly unknown[]; files?: Record<string, unknown>; appState?: Record<string, unknown> };
/** readOnly: a student's board opened by a teacher, who may look but not change it. */
export type Board = { id: string; title: string; updatedAt: number; scene: BoardScene; shareToken?: string | null; lessonToken?: string | null; readOnly?: boolean };
/** A student's board in a teacher's list of a class's boards: whose it is, as the teacher's page names students. */
export type ClassBoard = BoardSummary & { student: string; number: number | null; name: string | null };
/** A board seen through its read-only link: no id, so nothing that could edit it. */
export type SharedBoard = { title: string; updatedAt: number; scene: BoardScene };

/** A guest's board in a lesson, as its host is told of it: whose it is only for a teacher (as on the class page). */
export type LessonGuest = { board: string; updatedAt: number; number: number | null; name: string | null };
/**
 * A lesson as this browser stands in it (server/lessons.ts): its host, with the guests' boards to follow; a guest, with
 * a board of their own (`made` the time it is first made); or a viewer, who only watches the host's board.
 */
export type LessonState = { title: string; handoutAt: number } & (
  | { role: "host"; board: string; guests: LessonGuest[] }
  | { role: "guest"; board: string; made?: boolean }
  | { role: "viewer" }
);
/** What following a board gives: the board and the etag to send next time, or null while the copy in hand is the latest. */
export type Followed = { board: SharedBoard; etag: string } | null;

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function req<T>(method: string, url: string, body?: unknown, keepalive = false, headers: Record<string, string> = {}): Promise<T> {
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
 * Whose boards these calls are about (server/research.ts boardUser): this browser's student's, by their code, or the
 * account's when it is signed in (#608). A teacher's account sends no code (#687): its session says whose boards, and
 * lets it read its classes' students' boards. With neither, the server refuses, unless it is an open one.
 */
export function boardOwner(): Record<string, string> {
  if (isTeacher()) return {};
  const student = loadStudent();
  return student ? { "X-Student-Code": student.code } : {};
}

export const api = {
  list: () => req<BoardSummary[]>("GET", "/api/boards", undefined, false, boardOwner()),
  create: async (title: string) => {
    const board = await req<BoardSummary>("POST", "/api/boards", { title }, false, boardOwner());
    seen("step", "board made");
    return board;
  },
  get: (id: string) => req<Board>("GET", `/api/boards/${id}`, undefined, false, boardOwner()),
  /** With baseUpdatedAt, fails with status 409 if the board was saved elsewhere since. keepalive: the request may outlive the page. */
  save: (id: string, data: { title?: string; scene?: BoardScene; baseUpdatedAt?: number }, keepalive = false) =>
    req<{ updatedAt: number; previous: number }>("PUT", `/api/boards/${id}`, data, keepalive, boardOwner()),
  remove: (id: string) => req<void>("DELETE", `/api/boards/${id}`, undefined, false, boardOwner()),
  /** The board's read-only link (made the first time), and taking it away. */
  share: (id: string) => req<{ token: string }>("POST", `/api/boards/${id}/share`, {}, false, boardOwner()),
  unshare: (id: string) => req<void>("DELETE", `/api/boards/${id}/share`, undefined, false, boardOwner()),
  /** Every board, the teachers' and the students', as one file to save (an admin's only). */
  backup: async (): Promise<Blob> => {
    const res = await fetch("/api/export", { headers: boardOwner() });
    if (!res.ok) throw new ApiError(`GET /api/export: ${res.status}`, res.status);
    return res.blob();
  },
  /** A shared board; with the etag of the copy in hand, null while it is still the latest (the scene isn't sent again). */
  shared: (token: string, etag?: string) => follow(`/api/shared/${encodeURIComponent(token)}`, etag),
};

/** A board to follow: with the etag of the copy in hand, the scene is sent again only once it has changed. */
async function follow(url: string, etag?: string, headers: Record<string, string> = {}): Promise<Followed> {
  const res = await fetch(url, { headers: etag ? { ...headers, "If-None-Match": etag } : headers });
  if (res.status === 304) return null;
  if (!res.ok) throw new ApiError(`GET ${url}: ${res.status}`, res.status);
  return { board: await res.json(), etag: res.headers.get("ETag") ?? "" };
}

/** Lessons (server/lessons.ts): two boards side by side, each written by its owner and followed by the other. */
export const lessons = {
  /** The lesson a board hosts (made the first time), and ending it. */
  start: async (id: string) => {
    const made = await req<{ token: string }>("POST", `/api/boards/${id}/lesson`, {}, false, boardOwner());
    seen("step", "lesson started");
    return made;
  },
  end: (id: string) => req<void>("DELETE", `/api/boards/${id}/lesson`, undefined, false, boardOwner()),
  /** Coming to a lesson by its link: a learner gets a board of their own for it the first time. */
  enter: (token: string) => req<LessonState>("POST", `/api/lessons/${encodeURIComponent(token)}`, {}, false, boardOwner()),
  state: (token: string) => req<LessonState>("GET", `/api/lessons/${encodeURIComponent(token)}`, undefined, false, boardOwner()),
  /** The host's mark for the guests' pages to copy the host's board into their own. */
  handOut: (token: string) => req<{ handoutAt: number }>("POST", `/api/lessons/${encodeURIComponent(token)}/handout`, {}, false, boardOwner()),
  /** The host's board, for anyone with the link; and one guest's, for the host. */
  board: (token: string, etag?: string) => follow(`/api/lessons/${encodeURIComponent(token)}/board`, etag),
  guest: (token: string, board: string, etag?: string) =>
    follow(`/api/lessons/${encodeURIComponent(token)}/guest?board=${encodeURIComponent(board)}`, etag, boardOwner()),
};

/** The practice study (server/research.ts): joining a class, signing back in, and uploading finished questions. */
export const study = {
  /** number: the student's number in the class list; again: join though someone in the class already gave it (409). */
  /**
   * number: the student's number in the class list; again: join though someone in the class already gave it (409).
   * Signed in to an account, the record is the account's, and joining the same class again gives the same one.
   */
  join: async (classCode: string, number?: number, again = false) => {
    const student = await req<Student>("POST", "/api/students", { class: classCode, number, again: again || undefined });
    seen("step", "class joined");
    return student;
  },
  /** The student, the goal their teacher picked for the class (#461, null for none) and the games assigned to it. */
  student: (code: string) => req<Student & { answered: number; goal: GoalId | null; games: GameId[] }>("GET", `/api/students/${encodeURIComponent(code)}`),
  /** The stars of an assigned game's ladder, as this browser has them; the server keeps the best of each puzzle. */
  stars: (code: string, game: GameId, stars: number[]) =>
    req<{ stars: number[]; passed: boolean }>("POST", `/api/students/${encodeURIComponent(code)}/games`, { game, stars }, true),
  /** The first guess on a topic page's "predict, then reveal" (#578). */
  predict: (code: string, kind: string, pick: string) =>
    req<{ pick: string; right: boolean }>("POST", `/api/students/${encodeURIComponent(code)}/predictions`, { kind, pick }, true),
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
  /** The teacher whose class it is (#687): an account id, null for nobody (only admins see it). */
  owner: number | null;
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
  /** The roadmap the teacher picked for the class (#461), null for none. */
  goal: GoalId | null;
};
export type { Dashboard };

/** What the teacher page knows a student by: their number in the class list and the name on their account, when they gave either. */
export type Who = { number: number | null; name?: string | null };
/**
 * How the teacher page names a student: by their number in the class list when they gave one ("№ 14") and the name on
 * their account when they joined with one ("№ 14 · Nino K.", #606), else by their number in the study ("s12"); with
 * the student code after it when the teacher asks for codes.
 */
export const studentName = (id: string, who: Who | null | undefined, code?: string) =>
  [who?.number ? `№ ${who.number}` : who?.name ? null : id, who?.name, code].filter(Boolean).join(" · ");

/** What came of a paper test typed in (server/protocol.ts recordPaperTest): each question's verdict, null where the
 * student had answered it online; reordered when the student's form order was swapped to fit the form they wrote. */
export type PaperResult = { form: Form; stored: number; kept: number; verdicts: (string | null)[]; reordered: boolean };

/** An account as an admin sees it (#687): fixed, an admin named in the server's ADMIN_EMAILS; classes, how many it has. */
export type Person = { id: number; email: string; name: string; verified: boolean; role: Role; fixed: boolean; classes: number };
/** The accounts, the classes with their teachers (owner: an account id, null for nobody), and the admin's own id. */
export type People = { accounts: Person[]; classes: { code: string; name: string; owner: number | null }[]; me: number | null };

/** The teacher's side of the study: the account's session says who the teacher is (#687), so no header goes with it. */
export function teacherApi() {
  const headers: Record<string, string> = {};
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
    /** Picks the class's roadmap goal (#461), or null for none. */
    goal: (code: string, goal: GoalId | null) =>
      req<{ goal: GoalId | null }>("POST", `/api/classes/${encodeURIComponent(code)}/goal`, { goal }, false, headers),
    /** The games assigned to the class ([] for none; 409 before games open, as homework does). */
    games: (code: string, games: GameId[]) =>
      req<{ games: GameId[] }>("POST", `/api/classes/${encodeURIComponent(code)}/games`, { games }, false, headers),
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
    /** The accounts and their roles, and the classes' teachers (an admin's, #687). */
    people: () => req<People>("GET", "/api/people", undefined, false, headers),
    /** Sets an account's role (an admin's). */
    setRole: (id: number, role: Role) => req<{ role: Role }>("POST", `/api/people/${id}`, { role }, false, headers),
    /** Gives a class to a teacher, or to nobody (an admin's). */
    setOwner: (code: string, owner: number | null) =>
      req<{ owner: number | null }>("POST", `/api/classes/${encodeURIComponent(code)}/owner`, { owner }, false, headers),
    /** The anonymous usage counts of the last `days` days (#615). */
    usage: (days: number) => req<UsageReport>("GET", `/api/usage?days=${days}`, undefined, false, headers),
    /** A CSV export as a file to save. */
    async csv(kind: "attempts" | "tests", code?: string): Promise<Blob> {
      const res = await fetch(`/api/research/${kind}.csv${code ? `?class=${encodeURIComponent(code)}` : ""}`, { headers });
      if (!res.ok) throw new ApiError(`GET ${kind}.csv: ${res.status}`, res.status);
      return res.blob();
    },
  };
}
