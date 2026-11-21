// A board for each stage of the course map or a roadmap, made the first time one of its tools, labs or games is
// opened and kept for this browser, so the things opened from one stage land together.
import { api } from "./api";

function stored(storeKey: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(storeKey) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

/**
 * Opens `path` (such as "live/beSort") on the board kept under `slot`, making one called `name` when there is none or
 * this browser can't change it any more (gone, someone else's, or a student's opened in a teacher's tab).
 * Throws what the server answered when it makes no board.
 */
export async function openOnStageBoard(storeKey: string, slot: string, name: string, path: string) {
  let id: string | undefined = stored(storeKey)[slot];
  if (id) await api.get(id).then((b) => b.readOnly && (id = undefined), () => (id = undefined));
  if (!id) {
    id = (await api.create(name)).id;
    try {
      localStorage.setItem(storeKey, JSON.stringify({ ...stored(storeKey), [slot]: id }));
    } catch {
      /* storage unavailable: the next one opens a new board */
    }
  }
  location.hash = `#/b/${id}/${path}`;
}
