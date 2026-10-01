export type BoardSummary = { id: string; title: string; createdAt: number; updatedAt: number };
export type BoardScene = { elements?: readonly unknown[]; files?: Record<string, unknown>; appState?: Record<string, unknown> };
export type Board = { id: string; title: string; updatedAt: number; scene: BoardScene };

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function req<T>(method: string, url: string, body?: unknown, keepalive = false): Promise<T> {
  const json = body === undefined ? undefined : JSON.stringify(body);
  const res = await fetch(url, {
    method,
    // Browsers refuse keepalive requests over 64 KB; a bigger one goes out normally and may not finish.
    keepalive: keepalive && (json?.length ?? 0) < 60000,
    headers: json === undefined ? undefined : { "Content-Type": "application/json" },
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
