// Linking cubes: cubes that snap into trains. A train is a row of cubes, each a colour (an index into the piece's
// palette). Trains are joined end to end, broken at a joint, painted cube by cube, and all of them can be shared
// out into trains of one length to see a division (or a multiplication) with what is left over. The words under the
// picture come from what the trains are: their lengths added, two compared, equal ones as a product, the colours
// of one train as its parts.
// src/live/Cubes.tsx draws them; everything here is plain data.

export type LiveCubes = {
  trains: number[][];
  /** The colour a click paints (and a new cube gets). */
  color: number;
  /** Numbers on the cubes, counting along each train. */
  numbers: boolean;
  /** The length "share into trains of" uses. */
  k: number;
};

export const CUBE_COLORS = 6;
export const MAX_TRAINS = 10;
export const MAX_LEN = 20;
export const K_RANGE: [number, number] = [1, 10];

export const CUBES_START: LiveCubes = { trains: [[0, 0, 0, 0, 1, 1, 1], [2, 2, 2, 2, 2]], color: 0, numbers: false, k: 3 };

const total = (trains: number[][]) => trains.reduce((s, t) => s + t.length, 0);
export { total as cubeTotal };

/** Drops empty trains and caps the count and lengths, so every action leaves a drawable mat. */
export function tidy(trains: number[][]): number[][] {
  return trains.filter((t) => t.length).slice(0, MAX_TRAINS).map((t) => t.slice(0, MAX_LEN));
}

/** Train `from` joined onto the end of train `to` (when the result is not too long). */
export function join(trains: number[][], from: number, to: number): number[][] {
  if (from === to || !trains[from] || !trains[to] || trains[from].length + trains[to].length > MAX_LEN) return trains;
  const next = trains.map((t, i) => (i === to ? [...t, ...trains[from]] : t));
  return tidy(next.filter((_, i) => i !== from));
}

/** Train `t` broken after its first `at` cubes; the rest becomes a new train just under it. */
export function breakAt(trains: number[][], t: number, at: number): number[][] {
  const train = trains[t];
  if (!train || at <= 0 || at >= train.length || trains.length >= MAX_TRAINS) return trains;
  return [...trains.slice(0, t), train.slice(0, at), train.slice(at), ...trains.slice(t + 1)];
}

/**
 * The cubes of train `t` from cube `i` on, taken off and put on the end of train `to`, laid as a new train under the
 * others ("new"), or put away (null): a hand lifting the end of a train. A move that would not fit leaves the trains
 * as they were.
 */
export function moveTail(trains: number[][], t: number, i: number, to: number | "new" | null): number[][] {
  const train = trains[t];
  if (!train || i < 0 || i >= train.length || to === t) return trains;
  const tail = train.slice(i);
  if (typeof to === "number" && (!trains[to] || trains[to].length + tail.length > MAX_LEN)) return trains;
  if (to === "new" && i > 0 && trains.length >= MAX_TRAINS) return trains;
  const next = trains.map((tr, j) => (j === t ? tr.slice(0, i) : j === to ? [...tr, ...tail] : tr));
  return tidy(to === "new" ? [...next, tail] : next);
}

export function paint(trains: number[][], t: number, i: number, color: number): number[][] {
  return trains.map((train, j) => (j === t ? train.map((c, k) => (k === i ? color : c)) : train));
}

export function addCube(trains: number[][], t: number, color: number): number[][] {
  return trains.map((train, j) => (j === t && train.length < MAX_LEN ? [...train, color] : train));
}

export function removeCube(trains: number[][], t: number): number[][] {
  return tidy(trains.map((train, j) => (j === t ? train.slice(0, -1) : train)));
}

export function newTrain(trains: number[][], color: number): number[][] {
  return trains.length >= MAX_TRAINS ? trains : [...trains, [color]];
}

/** Every cube in one train, in order; the trains as they were when they wouldn't fit in one. */
export function joinAll(trains: number[][]): number[][] {
  const all = trains.flat();
  return trains.length < 2 || all.length > MAX_LEN ? trains : [all];
}

/**
 * All the cubes shared out into trains of `k`, in order, with any left over in a last, shorter train. Fewer trains
 * than that would need (MAX_TRAINS) leaves the mat as it was.
 */
export function shareInto(trains: number[][], k: number): number[][] {
  const all = trains.flat();
  const n = Math.ceil(all.length / k);
  if (!all.length || k < 1 || n > MAX_TRAINS || k > MAX_LEN) return trains;
  return Array.from({ length: n }, (_, i) => all.slice(i * k, (i + 1) * k));
}

/** Longest first; equal lengths keep their order. */
export function sortByLength(trains: number[][]): number[][] {
  return trains.map((t, i) => [t, i] as const).sort((a, b) => b[0].length - a[0].length || a[1] - b[1]).map(([t]) => t);
}

/** How many cubes of each colour a train has, in the order the colours first come. */
export function colourParts(train: number[]): { color: number; n: number }[] {
  const out: { color: number; n: number }[] = [];
  for (const c of train) {
    const p = out.find((q) => q.color === c);
    if (p) p.n++;
    else out.push({ color: c, n: 1 });
  }
  return out;
}

/** What the trains say, as sentences to fill in: kinds with their numbers. */
export type CubeSay =
  | { kind: "empty" }
  | { kind: "one"; n: number }
  | { kind: "parts"; parts: number[]; n: number }
  | { kind: "sum"; lengths: number[]; n: number }
  | { kind: "equal"; trains: number; k: number; n: number }
  | { kind: "share"; trains: number; k: number; left: number; n: number }
  | { kind: "compare"; a: number; b: number }
  | { kind: "same"; a: number };

/** The first line sums things up; the second (when there is one) compares or shares. */
export function says(trains: number[][]): CubeSay[] {
  const lengths = trains.map((t) => t.length);
  const n = total(trains);
  if (!n) return [{ kind: "empty" }];
  if (trains.length === 1) {
    const parts = colourParts(trains[0]).map((p) => p.n);
    return [parts.length > 1 ? { kind: "parts", parts, n } : { kind: "one", n }];
  }
  const out: CubeSay[] = [];
  const k = lengths[0];
  const rest = lengths.slice(0, -1);
  const last = lengths[lengths.length - 1];
  if (lengths.every((l) => l === k)) out.push({ kind: "equal", trains: lengths.length, k, n });
  else if (rest.every((l) => l === k) && last < k && rest.length >= 2) out.push({ kind: "share", trains: rest.length, k, left: last, n });
  else out.push({ kind: "sum", lengths, n });
  if (trains.length === 2) {
    const [a, b] = lengths;
    out.push(a === b ? { kind: "same", a } : { kind: "compare", a: Math.max(a, b), b: Math.min(a, b) });
  }
  return out;
}
