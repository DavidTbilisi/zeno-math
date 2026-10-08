import type { Dashboard } from "../server/dashboard";
import type { Attempt, Phase, Plan, SendResult, Student, TestAnswer } from "./learner";
import type { SkillId } from "./math/practiceSkills";

export type BoardSummary = { id: string; title: string; createdAt: number; updatedAt: number };
export type BoardScene = { elements?: readonly unknown[]; files?: Record<string, unknown>; appState?: Record<string, unknown> };
export type Board = { id: string; title: string; updatedAt: number; scene: BoardScene; shareToken?: string | null };
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

export const api = {
  list: () => req<BoardSummary[]>("GET", "/api/boards"),
  create: (title: string) => req<BoardSummary>("POST", "/api/boards", { title }),
  get: (id: string) => req<Board>("GET", `/api/boards/${id}`),
  /** With baseUpdatedAt, fails with status 409 if the board was saved elsewhere since. keepalive: the request may outlive the page. */
  save: (id: string, data: { title?: string; scene?: BoardScene; baseUpdatedAt?: number }, keepalive = false) =>
    req<{ updatedAt: number; previous: number }>("PUT", `/api/boards/${id}`, data, keepalive),
  remove: (id: string) => req<void>("DELETE", `/api/boards/${id}`),
  /** The board's read-only link (made the first time), and taking it away. */
  share: (id: string) => req<{ token: string }>("POST", `/api/boards/${id}/share`, {}),
  unshare: (id: string) => req<void>("DELETE", `/api/boards/${id}/share`),
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
  join: (classCode: string) => req<Student>("POST", "/api/students", { class: classCode }),
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
  createdAt: number;
  students: number;
  adaptive: number;
  fixed: number;
  attempts: number;
  phase: Phase;
  sessionEnds: number | null;
  testLength: number;
};
export type { Dashboard };

/** The teacher's side of the study. The password goes in a header (empty when the server doesn't ask for one). */
export function teacherApi(password: string) {
  const headers: Record<string, string> = password ? { "X-Teacher-Password": password } : {};
  return {
    classes: () => req<ClassSummary[]>("GET", "/api/classes", undefined, false, headers),
    create: (name: string, skills?: string[], testLength?: number) =>
      req<ClassSummary>("POST", "/api/classes", { name, skills, testLength }, false, headers),
    /** Moves the class on; minutes starts a timed session. */
    setPhase: (code: string, phase: Phase, minutes?: number) =>
      req<{ phase: Phase; sessionEnds: number | null }>("POST", `/api/classes/${encodeURIComponent(code)}/phase`, { phase, minutes }, false, headers),
    dashboard: (code: string) => req<Dashboard>("GET", `/api/research/dashboard?class=${encodeURIComponent(code)}`, undefined, false, headers),
    /** A CSV export as a file to save (a plain link can't send the password header). */
    async csv(kind: "attempts" | "tests", code?: string): Promise<Blob> {
      const res = await fetch(`/api/research/${kind}.csv${code ? `?class=${encodeURIComponent(code)}` : ""}`, { headers });
      if (!res.ok) throw new ApiError(`GET ${kind}.csv: ${res.status}`, res.status);
      return res.blob();
    },
  };
}
