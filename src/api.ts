import type { Dashboard } from "../server/dashboard";
import type { Attempt, Plan, SendResult, Student } from "./learner";
import type { SkillId } from "./math/practiceSkills";

export type BoardSummary = { id: string; title: string; createdAt: number; updatedAt: number };
export type BoardScene = { elements?: readonly unknown[]; files?: Record<string, unknown>; appState?: Record<string, unknown> };
export type Board = { id: string; title: string; updatedAt: number; scene: BoardScene };

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
};

/** The practice study (server/research.ts): joining a class, signing back in, and uploading finished questions. */
export const study = {
  join: (classCode: string) => req<Student>("POST", "/api/students", { class: classCode }),
  student: (code: string) => req<Student & { answered: number }>("GET", `/api/students/${encodeURIComponent(code)}`),
  plan: (code: string) => req<Plan>("GET", `/api/students/${encodeURIComponent(code)}/plan`),
  forget: (code: string) => req<void>("DELETE", `/api/students/${encodeURIComponent(code)}`),
  async send(a: Attempt, keepalive: boolean): Promise<SendResult> {
    try {
      await req("POST", "/api/attempts", a, keepalive);
      return "stored";
    } catch (e) {
      // Unknown student (their record was deleted) or a refused record: sending it again won't help.
      if (e instanceof ApiError && (e.status === 400 || e.status === 404 || e.status === 413)) {
        console.warn("practice attempt not stored:", e.message);
        return "drop";
      }
      return "retry";
    }
  },
};

export type ClassSummary = {
  code: string;
  name: string;
  skills: SkillId[];
  createdAt: number;
  students: number;
  adaptive: number;
  fixed: number;
  attempts: number;
};
export type { Dashboard };

/** The teacher's side of the study. The password goes in a header (empty when the server doesn't ask for one). */
export function teacherApi(password: string) {
  const headers: Record<string, string> = password ? { "X-Teacher-Password": password } : {};
  return {
    classes: () => req<ClassSummary[]>("GET", "/api/classes", undefined, false, headers),
    create: (name: string, skills?: string[]) => req<ClassSummary>("POST", "/api/classes", { name, skills }, false, headers),
    dashboard: (code: string) => req<Dashboard>("GET", `/api/research/dashboard?class=${encodeURIComponent(code)}`, undefined, false, headers),
    /** The CSV export as a file to save (a plain link can't send the password header). */
    async csv(code?: string): Promise<Blob> {
      const res = await fetch(`/api/research/attempts.csv${code ? `?class=${encodeURIComponent(code)}` : ""}`, { headers });
      if (!res.ok) throw new ApiError(`GET attempts.csv: ${res.status}`, res.status);
      return res.blob();
    },
  };
}
