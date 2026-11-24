// A goal's roadmap as a walk through rooms (#584): one room per roadmap stage, its items at fixed places in the order
// they are walked, so a student can learn where each thing lives (what comes before fractions, what sits beside
// percentages) as in a memory palace.
//
// A room's layout is the list of its places, each holding an item's id or nothing (an item taken off the roadmap
// leaves its place empty, so its neighbours stay put). It is made once and stored (ROOM_LAYOUTS in roomLayouts.ts,
// written by `npm run room-layouts -- --write`): laying a roadmap out again over the stored layout keeps every item
// where it was, and an item new to a room takes its first empty place, or the next one after the last. So the first
// layout walks the curriculum's order, and the places never move after that.
//
// Where a place is on the page depends on its number alone: four to a row, walked like a snake (left to right, then
// right to left), so a room growing a row never moves the places it already had.
import { itemId, type Item, type Roadmap } from "./roadmap.ts";

/** A room's places in walking order: an item's id (itemId) or null for a place left empty. */
export type RoomPlaces = readonly (string | null)[];
/** A goal's rooms, by roadmap stage id. */
export type GoalRooms = Readonly<Record<string, RoomPlaces>>;

/**
 * Lays a roadmap's items out in rooms. With a stored layout (`prior`), every item that has a place in its room keeps
 * it, a place whose item left the room is emptied, and an item new to the room takes the first empty place, else the
 * next after the last; without one, each room's items take the places in their order.
 */
export function layOut(r: Pick<Roadmap, "stages">, prior: GoalRooms = {}): Record<string, (string | null)[]> {
  const out: Record<string, (string | null)[]> = {};
  for (const st of r.stages) {
    const ids = st.items.map(itemId);
    const places = (prior[st.id] ?? []).map((id) => (id !== null && ids.includes(id) ? id : null));
    for (const id of ids) {
      if (places.includes(id)) continue;
      const free = places.indexOf(null);
      if (free >= 0) places[free] = id;
      else places.push(id);
    }
    // An empty place at the end holds nothing up: drop it, so the room doesn't keep a row it no longer needs.
    while (places.length && places[places.length - 1] === null) places.pop();
    out[st.id] = places;
  }
  return out;
}

/** A room drawn: its items in their places, by place number. */
export type Room = { id: string; places: (Item | null)[] };

/** A roadmap's rooms as items, from the layout: what the map draws and the walk-it check asks about. */
export function roomsOf(r: Pick<Roadmap, "stages">, stored: GoalRooms = {}): Room[] {
  const rooms = layOut(r, stored);
  return r.stages.map((st) => {
    const byId = new Map(st.items.map((i) => [itemId(i), i]));
    return { id: st.id, places: rooms[st.id].map((id) => (id === null ? null : byId.get(id)!)) };
  });
}

// A room's plan, in the SVG's units: places four to a row, in cells of CELL_W × CELL_H inside a wall.
export const COLS = 4;
export const CELL_W = 86;
export const CELL_H = 88;
export const PAD = 14;
/** Room above the first row: the way in. */
export const TOP = 30;
export const BOTTOM = 18;
export const ROOM_W = PAD * 2 + COLS * CELL_W;
export const roomH = (places: number) => TOP + Math.max(1, Math.ceil(places / COLS)) * CELL_H + BOTTOM;

/** Where place `k` (from 0) is: its row and column and the middle of its cell. The snake turns at the end of each row. */
export function placeAt(k: number) {
  const row = Math.floor(k / COLS);
  const col = row % 2 === 0 ? k % COLS : COLS - 1 - (k % COLS);
  return { row, col, x: PAD + col * CELL_W + CELL_W / 2, y: TOP + row * CELL_H + CELL_H / 2 };
}

/** A walk-it question: in room `room` (its index), place `place` is shown empty, to be filled from `choices`. */
export type WalkQuestion = { room: number; place: number; answer: Item; choices: Item[] };
export const WALK_CHOICES = 3;

/**
 * A "walk it" question on a goal's rooms: a filled place picked at random, and the choices to fill it: its item and
 * WALK_CHOICES − 1 others from the rooms nearest it (the next room and the one before first), so they are plausible
 * but are not seen in the room shown; from the room itself only when the goal has too few others. Shuffled. Nothing
 * here is learner state: the pick counts for nothing, so `random` may be anything.
 */
export function walkQuestion(rooms: readonly Room[], random: () => number = Math.random): WalkQuestion | null {
  const pick = (n: number) => Math.min(n - 1, Math.floor(random() * n));
  const spots = rooms.flatMap((r, room) => r.places.flatMap((i, place) => (i ? [{ room, place, answer: i }] : [])));
  if (!spots.length) return null;
  const { room, place, answer } = spots[pick(spots.length)];
  const choices: Item[] = [answer];
  // Rooms by distance from this one, the next before the one behind at the same distance; this room last.
  const order = rooms.map((_, n) => n).filter((n) => n !== room).sort((a, b) => Math.abs(a - room) - Math.abs(b - room) || b - a);
  for (const n of [...order, room]) {
    const pool = rooms[n].places.filter((i): i is Item => !!i && !choices.includes(i));
    while (choices.length < WALK_CHOICES && pool.length) choices.push(pool.splice(pick(pool.length), 1)[0]);
    if (choices.length >= WALK_CHOICES) break;
  }
  for (let i = choices.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { room, place, answer, choices };
}
