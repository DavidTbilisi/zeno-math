// Solving a Rubik's cube from its colours, as a pupil reads them off a real cube: the 54 sticker colours are read as
// cubies (which corner and edge is in each place, and how it is turned), checked to be a cube that can be solved, and
// solved by Kociemba's two-phase search. Phase 1 turns every piece the right way round and brings the four middle-layer
// edges into the middle layer; what is left can be solved with U, D and half turns of the other faces, and phase 2
// does that. Each phase searches deeper and deeper, cut short by tables of how many turns at least are still needed.
// The cubies and their turns are read from the sticker model in rubik.ts, not written out by hand.
import { colorsAfter, FACES, type Face, type Move, STICKERS, stickerAt, type V3 } from "./rubik";

// ——— Cubies ———

/** Each place's stickers, in the same turning order round every cubie, starting with the U or D sticker (an edge with none: F or B). */
const CORNERS: number[][] = [];
const EDGES: number[][] = [];
{
  const all = [-1, 0, 1].flatMap((x) => [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((z) => [x, y, z] as V3)));
  const side = (p: V3, axis: number) => stickerAt(p, [0, 1, 2].map((k) => (k === axis ? p[k] : 0)) as V3)!;
  for (const p of all) {
    const zeros = p.filter((c) => !c).length;
    // x, y, z normals turn one way round when x·y·z is negative, the other way otherwise: keep one way for all.
    if (zeros === 0) CORNERS.push(p[0] * p[1] * p[2] < 0 ? [side(p, 1), side(p, 0), side(p, 2)] : [side(p, 1), side(p, 2), side(p, 0)]);
    if (zeros === 1) {
      const axes = [0, 1, 2].filter((k) => p[k]);
      EDGES.push(axes.includes(1) ? [side(p, 1), side(p, axes.find((k) => k !== 1)!)] : [side(p, 2), side(p, 0)]);
    }
  }
  // The four middle-layer edges last: phase 1 brings them into places 8 to 11.
  EDGES.sort((a, b) => Number(STICKERS[a[0]].pos[1] === 0) - Number(STICKERS[b[0]].pos[1] === 0));
}
const homeOf = (places: number[][]) => places.map((ids) => ids.map((i) => STICKERS[i].face).join(""));
const CORNER_HOME = homeOf(CORNERS);
const EDGE_HOME = homeOf(EDGES);

/** Which piece is in each place, and how far it is turned from its own place's way round (corners 0–2, edges 0–1). */
export type Cubies = { cp: number[]; co: number[]; ep: number[]; eo: number[] };

export type CubeError = "count" | "centres" | "corner" | "edge" | "twist" | "flip" | "parity";

/** The pieces a cube's colours make, or what is wrong with them. */
export function readCube(colors: Face[]): { cubies: Cubies } | { error: CubeError } {
  if (FACES.some((f) => colors.filter((c) => c === f).length !== 9)) return { error: "count" };
  if (FACES.some((f, k) => colors[9 * k + 4] !== f)) return { error: "centres" };
  const corners = read(colors, CORNERS, CORNER_HOME);
  if (!corners) return { error: "corner" };
  const edges = read(colors, EDGES, EDGE_HOME);
  if (!edges) return { error: "edge" };
  const cubies = { cp: corners.p, co: corners.o, ep: edges.p, eo: edges.o };
  if (sum(cubies.co) % 3) return { error: "twist" };
  if (sum(cubies.eo) % 2) return { error: "flip" };
  if (parity(cubies.cp) !== parity(cubies.ep)) return { error: "parity" };
  return { cubies };
}

/**
 * The piece in each place and how it is turned: which of the place's stickers has the piece's first colour, its U or D
 * colour (an edge with neither: its F or B one). Null if a place's colours are no piece, or a piece is in two places.
 */
function read(colors: Face[], places: number[][], home: string[]) {
  const [p, o] = [[] as number[], [] as number[]];
  for (const ids of places) {
    const cols = ids.map((i) => colors[i]);
    const ud = cols.findIndex((c) => c === "U" || c === "D");
    const turn = ud >= 0 ? ud : cols.findIndex((c) => c === "F" || c === "B");
    const piece = turn < 0 ? -1 : home.indexOf([...cols.slice(turn), ...cols.slice(0, turn)].join(""));
    if (piece < 0 || p.includes(piece)) return null;
    p.push(piece);
    o.push(turn);
  }
  return { p, o };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** 0 for an even permutation, 1 for an odd one. */
function parity(p: number[]): number {
  let n = 0;
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) n++;
  return n % 2;
}

/** The pieces after `b` is done to `a`: the piece in place s comes from the place b brings to s, turned on by b's turn there. */
function times(a: Cubies, b: Cubies): Cubies {
  return {
    cp: b.cp.map((t) => a.cp[t]),
    co: b.cp.map((t, s) => (a.co[t] + b.co[s]) % 3),
    ep: b.ep.map((t) => a.ep[t]),
    eo: b.ep.map((t, s) => (a.eo[t] + b.eo[s]) % 2),
  };
}

/** The 18 turns, U U2 U′ R …, and the 10 that phase 2 uses (U, D any way, the others only twice). */
const MOVES: Move[] = FACES.flatMap((face) => ([1, 2, 3] as const).map((turns) => ({ face, turns })));
const P2: number[] = MOVES.flatMap((m, k) => (m.face === "U" || m.face === "D" || m.turns === 2 ? [k] : []));
const MOVE_CUBIES: Cubies[] = MOVES.map((m) => (readCube(colorsAfter([m])) as { cubies: Cubies }).cubies);

// ——— Coordinates: the parts of a position each phase looks at, as numbers ———

export const SOLVED: Cubies = { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: Array(8).fill(0), ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], eo: Array(12).fill(0) };

const twist = (c: Cubies) => c.co.slice(0, 7).reduce((n, o) => 3 * n + o, 0);
const flip = (c: Cubies) => c.eo.slice(0, 11).reduce((n, o) => 2 * n + o, 0);
function withTwist(n: number): Cubies {
  const co = Array(8).fill(0);
  for (let s = 6; s >= 0; s--, n = Math.floor(n / 3)) co[s] = n % 3;
  co[7] = (3 - (sum(co) % 3)) % 3;
  return { ...SOLVED, co };
}
function withFlip(n: number): Cubies {
  const eo = Array(12).fill(0);
  for (let s = 10; s >= 0; s--, n >>= 1) eo[s] = n & 1;
  eo[11] = sum(eo) % 2;
  return { ...SOLVED, eo };
}

const choose = (n: number, k: number): number => (k < 0 || k > n ? 0 : k === 0 ? 1 : (choose(n - 1, k - 1) * n) / k);
/** Which four places the middle-layer edges are in (one of 495). */
function slice(c: Cubies): number {
  let [n, k] = [0, 4];
  for (let s = 11; s >= 0 && k > 0; s--) if (c.ep[s] >= 8) n += choose(s, k--);
  return n;
}
function withSlice(n: number): Cubies {
  const ep = Array(12).fill(-1);
  let [k, next] = [4, 8];
  for (let s = 11; s >= 0 && k > 0; s--)
    if (n >= choose(s, k)) {
      n -= choose(s, k--);
      ep[s] = next++;
    }
  let other = 0;
  return { ...SOLVED, ep: ep.map((p) => (p < 0 ? other++ : p)) };
}

/** A permutation of 0…n−1 as a number below n! (its Lehmer code), and back. */
function rank(p: number[]): number {
  let n = 0;
  for (let i = 0; i < p.length; i++) {
    let smaller = 0;
    for (let j = i + 1; j < p.length; j++) if (p[j] < p[i]) smaller++;
    n = n * (p.length - i) + smaller;
  }
  return n;
}
function unrank(n: number, size: number): number[] {
  const digits: number[] = [];
  for (let i = 1; i <= size; i++) {
    digits.unshift(n % i);
    n = Math.floor(n / i);
  }
  const left = Array.from({ length: size }, (_, i) => i);
  return digits.map((d) => left.splice(d, 1)[0]);
}
/** Phase 2's three permutations: the corners, the eight edges of the U and D layers, and the four of the middle layer. */
const cperm = (c: Cubies) => rank(c.cp);
const eperm = (c: Cubies) => rank(c.ep.slice(0, 8));
const sperm = (c: Cubies) => rank(c.ep.slice(8).map((p) => p - 8));
const PERMS = {
  cp: { size: 8, places: (m: Cubies) => m.cp },
  ep: { size: 8, places: (m: Cubies) => m.ep.slice(0, 8) },
  sp: { size: 4, places: (m: Cubies) => m.ep.slice(8).map((t) => t - 8) },
};

// ——— Tables, made the first time a cube is solved ———

/** table[n * moves + k]: the coordinate after move k from n. */
function moveTable(size: number, moves: number[], make: (n: number) => Cubies, read: (c: Cubies) => number): Uint16Array {
  const out = new Uint16Array(size * moves.length);
  for (let n = 0; n < size; n++) {
    const c = make(n);
    moves.forEach((m, k) => (out[n * moves.length + k] = read(times(c, MOVE_CUBIES[m]))));
  }
  return out;
}

/** The same for a phase 2 permutation, turned directly: the piece in place s after the move comes from the place it brings to s. */
function permTable({ size, places }: (typeof PERMS)[keyof typeof PERMS]): Uint16Array {
  const from = P2.map((m) => places(MOVE_CUBIES[m]));
  let count = 1;
  for (let i = 2; i <= size; i++) count *= i;
  const out = new Uint16Array(count * P2.length);
  for (let n = 0; n < count; n++) {
    const p = unrank(n, size);
    from.forEach((f, k) => (out[n * P2.length + k] = rank(f.map((t) => p[t]))));
  }
  return out;
}

/**
 * The fewest moves from each pair (a, b) of coordinates to (0, b0), found by spreading out from there a move at a time.
 * Once most pairs are reached it looks the other way, from each pair not yet reached for one a move away that is (the
 * moves come with their inverses, so that is the same thing, and far fewer pairs are left to look from).
 */
function pruneTable(a: Uint16Array, sizeA: number, b: Uint16Array, sizeB: number, b0: number, moves: number): Int8Array {
  const depth = new Int8Array(sizeA * sizeB).fill(-1);
  depth[b0] = 0;
  for (let d = 0, done = 1; done < depth.length; d++) {
    const back = done > depth.length / 2;
    for (let x = 0, n = 0; x < sizeA; x++)
      for (let y = 0; y < sizeB; y++, n++) {
        if (depth[n] !== (back ? -1 : d)) continue;
        for (let k = 0; k < moves; k++) {
          const m = a[x * moves + k] * sizeB + b[y * moves + k];
          if (back && depth[m] === d) {
            depth[n] = d + 1;
            done++;
            break;
          }
          if (!back && depth[m] < 0) {
            depth[m] = d + 1;
            done++;
          }
        }
      }
  }
  return depth;
}

type Tables = ReturnType<typeof makeTables>;
let tables: Tables | null = null;
const ALL = MOVES.map((_, k) => k);
const SOLVED_SLICE = slice(SOLVED);
function makeTables() {
  const tw = moveTable(2187, ALL, withTwist, twist);
  const fl = moveTable(2048, ALL, withFlip, flip);
  const sl = moveTable(495, ALL, withSlice, slice);
  const [cp, ep, sp] = [permTable(PERMS.cp), permTable(PERMS.ep), permTable(PERMS.sp)];
  return {
    tw, fl, sl, cp, ep, sp,
    twSl: pruneTable(tw, 2187, sl, 495, SOLVED_SLICE, 18),
    flSl: pruneTable(fl, 2048, sl, 495, SOLVED_SLICE, 18),
    cpSp: pruneTable(cp, 40320, sp, 24, 0, P2.length),
    epSp: pruneTable(ep, 40320, sp, 24, 0, P2.length),
  };
}

// ——— The search ———

const axis = (k: number) => Math.floor(k / 3) % 3;
/** Never the same face twice running, and of two opposite faces turned in a row, U before D, R before L, F before B. */
const follows = (last: number, k: number) => last < 0 || (Math.floor(k / 3) !== Math.floor(last / 3) && !(axis(k) === axis(last) && k < last));

/**
 * Turns that solve the cube: the shortest found within `ms` milliseconds (at least one is always found; most cubes
 * come out at 18 to 22 turns). The first call takes a moment longer, making the tables.
 */
export function solve(cubies: Cubies, ms = 1000): Move[] {
  const t = (tables ??= makeTables());
  const deadline = performance.now() + ms;
  const found: { best: number[] | null } = { best: null };
  const path: number[] = [];

  const phase2 = (c: number, e: number, s: number, left: number, last: number): boolean => {
    if (c === 0 && e === 0 && s === 0) return true;
    if (left === 0 || Math.max(t.cpSp[c * 24 + s], t.epSp[e * 24 + s]) > left) return false;
    for (let j = 0; j < P2.length; j++) {
      const k = P2[j];
      if (!follows(last, k)) continue;
      path.push(k);
      if (phase2(t.cp[c * 10 + j], t.ep[e * 10 + j], t.sp[s * 10 + j], left - 1, k)) return true;
      path.pop();
    }
    return false;
  };

  const startPhase2 = () => {
    const c = path.reduce((x, k) => times(x, MOVE_CUBIES[k]), cubies);
    const [n1, limit] = [path.length, (found.best ? found.best.length - 1 : 30) - path.length];
    const last = path.length ? path[path.length - 1] : -1;
    for (let d = 0; d <= limit; d++) {
      if (phase2(cperm(c), eperm(c), sperm(c), d, last)) {
        found.best = [...path];
        path.length = n1;
        return;
      }
    }
  };

  const phase1 = (tw: number, fl: number, sl: number, left: number, last: number): boolean => {
    if (left === 0) {
      // Done with phase 1 only now, not a move earlier: so the last move is one phase 2 does not have.
      if (tw === 0 && fl === 0 && sl === SOLVED_SLICE && (last < 0 || !P2.includes(last))) startPhase2();
      return found.best !== null && performance.now() > deadline;
    }
    if (Math.max(t.twSl[tw * 495 + sl], t.flSl[fl * 495 + sl]) > left) return false;
    for (let k = 0; k < 18; k++) {
      if (!follows(last, k)) continue;
      path.push(k);
      const stop = phase1(t.tw[tw * 18 + k], t.fl[fl * 18 + k], t.sl[sl * 18 + k], left - 1, k);
      path.pop();
      if (stop) return true;
    }
    return false;
  };

  for (let d = 0; d <= 12; d++) {
    if (found.best && d >= found.best.length) break;
    if (phase1(twist(cubies), flip(cubies), slice(cubies), d, -1)) break;
  }
  return found.best!.map((k) => MOVES[k]);
}
