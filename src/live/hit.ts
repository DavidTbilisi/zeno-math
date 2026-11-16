// Which board item is under the pointer: for the right-click panel, which only cares about the items it can change
// (a tool's picture or a live piece), so anything else drawn over one doesn't hide it. Pure, so it is tested alone.

export type HitElement = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Radians, clockwise, about the element's centre (as Excalidraw keeps it). */
  angle: number;
  isDeleted?: boolean;
  locked?: boolean;
};

/** Whether the scene point (px, py) is inside the element, turned as it is. */
export function contains(el: HitElement, px: number, py: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  // Turn the point back by the element's angle, so the test is against the unturned box.
  const [c, s] = [Math.cos(-el.angle), Math.sin(-el.angle)];
  const [dx, dy] = [px - cx, py - cy];
  const [ux, uy] = [cx + dx * c - dy * s, cy + dx * s + dy * c];
  return ux >= el.x && ux <= el.x + el.width && uy >= el.y && uy <= el.y + el.height;
}

/** The topmost element under (x, y) that `wanted` accepts; the last in the list is drawn on top. */
export function itemAt<E extends HitElement>(elements: readonly E[], x: number, y: number, wanted: (el: E) => boolean): E | undefined {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (!el.isDeleted && !el.locked && wanted(el) && contains(el, x, y)) return el;
  }
  return undefined;
}

/** Where the panel goes on screen: right of the item if there is room, else left of it, else over its right side;
 *  kept inside the window. `box` is the item's screen rectangle. */
export function panelPlace(box: { left: number; top: number; right: number; bottom: number }, panel: { w: number; h: number }, view: { w: number; h: number }, gap = 12): { left: number; top: number } {
  const room = (left: number) => left >= 8 && left + panel.w <= view.w - 8;
  const left = room(box.right + gap) ? box.right + gap : room(box.left - gap - panel.w) ? box.left - gap - panel.w : Math.max(8, view.w - 8 - panel.w);
  const top = Math.min(Math.max(8, box.top), Math.max(8, view.h - 8 - panel.h));
  return { left, top };
}
