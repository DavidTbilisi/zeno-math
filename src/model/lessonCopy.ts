// Copying one board's drawing onto another (a lesson's "hand out"): the copies get ids of their own, so the same
// drawing can be handed out twice, and everything that points from one element to another (a label to its box, an
// arrow to what it joins, the members of a group or a frame) points to the copies. On a board that has work on it
// already, the copy is laid to its right, level with its top, so nothing is covered.

/** A drawing's element as far as copying needs to know it; the rest is carried over as it is. */
export type SceneElement = { id: string; x: number; y: number; width?: number; height?: number; isDeleted?: boolean; [key: string]: unknown };

const live = (els: readonly SceneElement[]) => els.filter((e) => !e.isDeleted);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
/** The box round some elements (by their own boxes, turned or not): null for none. */
export function boundsOf(els: readonly SceneElement[]): { left: number; top: number; right: number; bottom: number } | null {
  const shown = live(els);
  if (!shown.length) return null;
  return {
    left: Math.min(...shown.map((e) => num(e.x))),
    top: Math.min(...shown.map((e) => num(e.y))),
    right: Math.max(...shown.map((e) => num(e.x) + Math.max(0, num(e.width)))),
    bottom: Math.max(...shown.map((e) => num(e.y) + Math.max(0, num(e.height)))),
  };
}

/**
 * `source`'s elements (those not deleted) as new elements for a board that holds `own`: where they were when the
 * board is empty, or else to the right of what is there, `gap` away. `newId` gives each element and each group a
 * fresh id.
 */
export function copyElements(source: readonly SceneElement[], own: readonly SceneElement[], newId: () => string, gap = 80): SceneElement[] {
  const from = live(source);
  const [there, here] = [boundsOf(from), boundsOf(own)];
  if (!there) return [];
  const [dx, dy] = here ? [here.right + gap - there.left, here.top - there.top] : [0, 0];
  const ids = new Map(from.map((e) => [e.id, newId()]));
  const groups = new Map<string, string>();
  const group = (g: string) => groups.get(g) ?? (groups.set(g, newId()), groups.get(g)!);
  const to = (id: unknown) => (typeof id === "string" ? (ids.get(id) ?? null) : null);
  const binding = (b: unknown) => {
    const at = b && typeof b === "object" ? to((b as { elementId?: unknown }).elementId) : null;
    return at ? { ...(b as object), elementId: at } : null;
  };
  return from.map((e) => {
    const copy: SceneElement = { ...e, id: ids.get(e.id)!, x: num(e.x) + dx, y: num(e.y) + dy };
    // The board the copy lands on gives it its place in the stack: the source's would clash with what is there.
    delete copy.index;
    if (Array.isArray(e.groupIds)) copy.groupIds = e.groupIds.map((g) => group(String(g)));
    if ("containerId" in e) copy.containerId = to(e.containerId);
    if ("frameId" in e) copy.frameId = to(e.frameId);
    if (Array.isArray(e.boundElements))
      copy.boundElements = (e.boundElements as { id: string; type: string }[]).flatMap((b) => (ids.has(b.id) ? [{ ...b, id: ids.get(b.id)! }] : []));
    if ("startBinding" in e) copy.startBinding = binding(e.startBinding);
    if ("endBinding" in e) copy.endBinding = binding(e.endBinding);
    return copy;
  });
}
