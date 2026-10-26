// The Rubik's cube behind the live cube on the board: its 54 stickers, the six face turns as permutations of them
// (worked out from the geometry, by turning each sticker's position and direction a quarter turn), move sequences
// read and written in the usual letters (R U R′ U′), the order of a sequence (the lcm of its sticker cycles), random
// scrambles, and where each sticker is drawn: on the ball (three bands of circles round a sphere, one band per axis),
// in the circle picture (the same bands flat, as Borromean rings), and in the net.
// Kept free of React so it can be tested on its own.

export type Face = "U" | "R" | "F" | "D" | "L" | "B";
/** Opposite faces are three apart. */
export const FACES: Face[] = ["U", "R", "F", "D", "L", "B"];
/** A face turn: 1 is a quarter turn clockwise (looking at the face), 2 a half turn, 3 a quarter turn anticlockwise. */
export type Move = { face: Face; turns: 1 | 2 | 3 };

export type V3 = [number, number, number];
export const NORMAL: Record<Face, V3> = { U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] };
// Each face's rows and columns as seen from outside it (U with F at the bottom, D with F at the top).
const RIGHT: Record<Face, V3> = { U: [1, 0, 0], D: [1, 0, 0], R: [0, 0, -1], L: [0, 0, 1], F: [1, 0, 0], B: [-1, 0, 0] };
const UP: Record<Face, V3> = { U: [0, 0, -1], D: [0, 0, 1], R: [0, 1, 0], L: [0, 1, 0], F: [0, 1, 0], B: [0, 1, 0] };

const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const plus = (a: V3, b: V3, k = 1): V3 => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];

/** A sticker: the cubie it is on (coordinates −1, 0 or 1) and the way it faces. Sticker i is on face FACES[i / 9]. */
export type Sticker = { face: Face; pos: V3; normal: V3; row: number; col: number };
export const STICKERS: Sticker[] = FACES.flatMap((face) =>
  Array.from({ length: 9 }, (_, i) => {
    const [row, col] = [Math.floor(i / 3), i % 3];
    return { face, pos: plus(plus(NORMAL[face], RIGHT[face], col - 1), UP[face], 1 - row), normal: NORMAL[face], row, col };
  }),
);
const key = (p: V3, n: V3) => `${p.join(",")}|${n.join(",")}`;
const INDEX = new Map(STICKERS.map((s, i) => [key(s.pos, s.normal), i]));
/** The sticker on the cubie at `pos` facing `normal`, if there is one. */
export const stickerAt = (pos: V3, normal: V3) => INDEX.get(key(pos, normal));

/** A quarter turn clockwise seen from the end of `axis`: v ↦ −(a × v) + a(a·v). */
export const quarter = (axis: V3, v: V3): V3 => plus(cross(axis, v).map((c) => -c) as V3, axis, dot3(axis, v));

/** `to[i]`: where sticker i goes. */
export type Perm = number[];
const IDENTITY: Perm = STICKERS.map((_, i) => i);

/** The quarter turn of a face: the nine stickers of the face and the twelve round it move. */
const QUARTER: Record<Face, Perm> = Object.fromEntries(
  FACES.map((f) => {
    const a = NORMAL[f];
    return [f, STICKERS.map((s, i) => (dot3(s.pos, a) === 1 ? INDEX.get(key(quarter(a, s.pos), quarter(a, s.normal)))! : i))];
  }),
) as Record<Face, Perm>;

/** First p, then q. */
export const then = (p: Perm, q: Perm): Perm => p.map((j) => q[j]);

export function movePerm(m: Move): Perm {
  let p = IDENTITY;
  for (let k = 0; k < m.turns; k++) p = then(p, QUARTER[m.face]);
  return p;
}

export const seqPerm = (moves: Move[]): Perm => moves.reduce((p, m) => then(p, movePerm(m)), IDENTITY);

/** Colours (the face each sticker's colour belongs to) after the moves, starting from the solved cube. */
export function colorsAfter(moves: Move[], from: Face[] = STICKERS.map((s) => s.face)): Face[] {
  const p = seqPerm(moves);
  const out = [...from];
  p.forEach((j, i) => (out[j] = from[i]));
  return out;
}

/** Is sticker i on the layer a turn of the face moves? */
export const onLayer = (face: Face, i: number) => dot3(STICKERS[i].pos, NORMAL[face]) === 1;

export const isSolved = (colors: Face[]) => colors.every((c, i) => c === STICKERS[i].face);

export const inverse = (m: Move): Move => ({ face: m.face, turns: (4 - m.turns) as Move["turns"] });
export const inverseSeq = (moves: Move[]) => moves.map(inverse).reverse();

// ——— Writing moves down ———

const PRIME = "′";

/** "R U R′ U′"; also takes R', R’, Ri and R2′ (a half turn either way), with or without spaces. Null if a move is not a face turn. */
export function parseMoves(text: string): Move[] | null {
  const src = text.replace(/[()[\],]/g, " ").trim();
  if (!src) return [];
  const moves: Move[] = [];
  const re = /\s*([UDLRFB])(2|3)?(['’′`i])?\s*/gy;
  let at = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const n = m[2] ? Number(m[2]) : 1;
    moves.push({ face: m[1] as Face, turns: (m[3] ? 4 - n : n) as Move["turns"] });
    at = re.lastIndex;
  }
  return at === src.length ? moves : null;
}

export const moveText = (m: Move) => m.face + (m.turns === 2 ? "2" : m.turns === 3 ? PRIME : "");
export const movesText = (moves: Move[]) => moves.map(moveText).join(" ");

// ——— Order ———

/** The lengths of the cycles of a permutation, longer than 1, longest first. */
export function cycleLengths(p: Perm): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (let i = 0; i < p.length; i++) {
    if (seen.has(i)) continue;
    let n = 0;
    for (let j = i; !seen.has(j); j = p[j]) {
      seen.add(j);
      n++;
    }
    if (n > 1) out.push(n);
  }
  return out.sort((a, b) => b - a);
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/**
 * How many times the moves must be done to bring the cube back: the lcm of the cycles the stickers go round. (The
 * stickers say exactly where every cubie is and how it is turned, so this is the order in the cube group.)
 */
export const order = (moves: Move[]) => cycleLengths(seqPerm(moves)).reduce((a, b) => (a * b) / gcd(a, b), 1);

/** 8!·3⁷·12!·2¹¹ / 2 positions, and every one of them is at most 20 face turns from solved (God's number). */
export const POSITIONS = 43252003274489856000n;
export const GODS_NUMBER = 20;

/** A scramble of `n` random turns, never the same face twice running, nor three turns about one axis. */
export function scramble(n: number, r: () => number): Move[] {
  const out: Move[] = [];
  while (out.length < n) {
    const face = FACES[Math.floor(r() * 6)];
    const [a, b] = [out[out.length - 1], out[out.length - 2]];
    const axis = (f: Face) => FACES.indexOf(f) % 3;
    if (a && (a.face === face || (b && axis(a.face) === axis(face) && axis(b.face) === axis(face)))) continue;
    out.push({ face, turns: (1 + Math.floor(r() * 3)) as Move["turns"] });
  }
  return out;
}

/** How many moves two sequences start with in common. */
export function common(from: Move[], to: Move[]): number {
  let k = 0;
  while (k < from.length && k < to.length && from[k].face === to[k].face && from[k].turns === to[k].turns) k++;
  return k;
}

/**
 * The turns that take the cube shown after `from` to the one after `to`, each with the sequence it leaves shown: back
 * along `from` to where the two part, then on along `to`. A new move is one step; an undo is the last move turned back.
 */
export function path(from: Move[], to: Move[]): { move: Move; after: Move[] }[] {
  const k = common(from, to);
  const back = from.slice(k).map((m, j) => ({ move: inverse(m), after: from.slice(0, k + j) })).reverse();
  const on = to.slice(k).map((m, j) => ({ move: m, after: to.slice(0, k + j + 1) }));
  return [...back, ...on];
}

// ——— The ball: the cube on circles of a sphere ———

/**
 * The cube drawn on a ball, the three bands of circles of the paper's picture ("A permutation representation of
 * Rubik's cube on Borromean rings") made round: for each axis, three parallel circles where the planes of its three
 * layers cut the unit sphere. A sticker of F in layer x of the R–L axis and y of the U–D axis is where circle x of one
 * band meets circle y of another, on the F side. So the twelve stickers a turn of R carries round all lie on one
 * circle, and the turn is a turn of the ball's slice about the axis: the face's own dots go round its pole.
 */
export type Axis = 0 | 1 | 2;
/** x for R and L, y for U and D, z for F and B (the index of the coordinate a face's normal points along). */
export const axisOf = (f: Face): Axis => NORMAL[f].findIndex((c) => c !== 0) as Axis;
/** How far from the middle the outer layers' planes cut the ball: the dots of a face and of neighbouring faces about evenly spaced. */
export const LAYER = 0.45;

/** v turned by `angle` about the unit vector a (right-handed). */
export function rotate(v: V3, a: V3, angle: number): V3 {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const d = dot3(a, v);
  const x = cross(a, v);
  return [0, 1, 2].map((k) => v[k] * c + x[k] * s + a[k] * d * (1 - c)) as V3;
}

/** The angle a move has got to, a fraction t of the way: clockwise seen from the face is negative about its normal. */
export const moveAngle = (m: Move, t: number) => -(m.turns === 3 ? -1 : m.turns) * (Math.PI / 2) * t;

/** The radius of the circle for layer v (−1, 0, 1) of an axis. */
export const circleRadius = (v: number) => Math.sqrt(1 - (v * LAYER) ** 2);

/** Points round the circle for layer v of an axis (n + 1 of them, the last back at the first). */
export function circleOnBall(axis: Axis, v: number, n = 96): V3[] {
  const r = circleRadius(v);
  const [b, c] = ([0, 1, 2] as Axis[]).filter((k) => k !== axis);
  return Array.from({ length: n + 1 }, (_, k) => {
    const p: V3 = [0, 0, 0];
    p[axis] = v * LAYER;
    p[b] = r * Math.cos((2 * Math.PI * k) / n);
    p[c] = r * Math.sin((2 * Math.PI * k) / n);
    return p;
  });
}

/** A sticker's dot: on the planes of its two layers, on its face's side of the ball. */
export function dotOnBall(i: number): V3 {
  const { pos, normal } = STICKERS[i];
  const p = pos.map((c, k) => (normal[k] ? 0 : c * LAYER)) as V3;
  const rest = Math.sqrt(1 - dot3(p, p));
  return p.map((c, k) => c + normal[k] * rest) as V3;
}

/** Where sticker i is a fraction t of the way through a move: the slice it is on turns about the face's axis. */
export const dotOnBallDuring = (i: number, m: Move, t: number): V3 =>
  onLayer(m.face, i) ? rotate(dotOnBall(i), NORMAL[m.face], moveAngle(m, t)) : dotOnBall(i);

// ——— The circle picture: the cube on three rings ———

/**
 * The picture of "A permutation representation of Rubik's cube on Borromean rings": one band of three circles per
 * axis (R–L, U–D, F–B), the bands' middles at the corners of a triangle. Two bands cross twice, and the two crossings
 * are the two faces of the third axis: a sticker of F, in the layer x of the R–L axis and y of the U–D axis, is where
 * circle x of the R–L band meets circle y of the U–D band near F's crossing. So the twelve stickers a turn of R carries
 * round all lie on one circle, the R circle of the R–L band, and the turn slides them along it.
 */
export type Layout = { cx: number; cy: number; d: number; rho: number; step: number };
/** R, U and B sit at the inner crossings, L, D and F at the outer ones, as in the paper's picture. */
const INNER: Record<Face, boolean> = { R: true, U: true, B: true, L: false, D: false, F: false };

/** The middle of an axis's band: the R–L band's at the top, U–D's lower right, F–B's lower left. */
export function bandCentre(axis: Axis, { cx, cy, d }: Layout): [number, number] {
  const a = (axis * 2 * Math.PI) / 3;
  return [cx + d * Math.sin(a), cy - d * Math.cos(a)];
}

/** Where two circles meet (none: an empty list). */
function meet([x1, y1]: [number, number], r1: number, [x2, y2]: [number, number], r2: number): [number, number][] {
  const D = Math.hypot(x2 - x1, y2 - y1);
  const a = (r1 * r1 - r2 * r2 + D * D) / (2 * D);
  const h2 = r1 * r1 - a * a;
  if (!(h2 >= 0)) return [];
  const [ux, uy] = [(x2 - x1) / D, (y2 - y1) / D];
  const [mx, my, h] = [x1 + a * ux, y1 + a * uy, Math.sqrt(h2)];
  return [[mx - h * uy, my + h * ux], [mx + h * uy, my - h * ux]];
}

const nearest = (points: [number, number][], [x, y]: [number, number]) =>
  points.reduce((best, p) => (Math.hypot(p[0] - x, p[1] - y) < Math.hypot(best[0] - x, best[1] - y) ? p : best));

/** The two axes other than a face's own, whose bands cross at the face. */
const across = (f: Face): [Axis, Axis] => ([0, 1, 2] as Axis[]).filter((a) => a !== axisOf(f)) as [Axis, Axis];

/** A face's crossing: where the middle circles of the other two bands meet, nearer the centre or further out. */
export function ringCentre(face: Face, l: Layout): [number, number] {
  const [b, c] = across(face);
  const [p, q] = meet(bandCentre(b, l), l.rho, bandCentre(c, l), l.rho);
  const inner = Math.hypot(p[0] - l.cx, p[1] - l.cy) < Math.hypot(q[0] - l.cx, q[1] - l.cy);
  return INNER[face] === inner ? p : q;
}

/** The radius of the circle for layer v (−1, 0, 1) of an axis: the layer of the face whose crossing is inside the band is the inner circle. */
export function bandRadius(axis: Axis, v: number, l: Layout): number {
  const plus = FACES.find((f) => NORMAL[f][axis] === 1)!;
  const [x, y] = ringCentre(plus, l);
  const [bx, by] = bandCentre(axis, l);
  return l.rho + (Math.hypot(x - bx, y - by) < l.rho ? -1 : 1) * v * l.step;
}

/** A sticker's dot: where the circles of its two layers meet, at its face's crossing. */
export function dotAt(i: number, l: Layout): [number, number] {
  const s = STICKERS[i];
  const [b, c] = across(s.face);
  return nearest(meet(bandCentre(b, l), bandRadius(b, s.pos[b], l), bandCentre(c, l), bandRadius(c, s.pos[c], l)), ringCentre(s.face, l));
}

/**
 * Where sticker i is a fraction t of the way through a move. The twelve stickers beside the face slide along their
 * circle of the face's band; the face's own turn round its crossing. A quarter turn carries the sticker round a cycle
 * of four places back to its own, and all of them go the same way: the way that gets round the circle in one lap. (The
 * shorter way from one place to the next is not always it, as one gap can be more than half the circle.)
 */
export function dotDuring(i: number, m: Move, t: number, l: Layout): [number, number] {
  const p = dotAt(i, l);
  if (!onLayer(m.face, i)) return p;
  const [cx, cy] = STICKERS[i].face === m.face ? ringCentre(m.face, l) : bandCentre(axisOf(m.face), l);
  const q = movePerm(m.turns === 3 ? inverse({ face: m.face, turns: 1 }) : { face: m.face, turns: 1 });
  const angleOf = (k: number) => {
    const [x, y] = dotAt(k, l);
    return Math.atan2(y - cy, x - cx);
  };
  const cycle = [i];
  while (q[cycle[cycle.length - 1]] !== i) cycle.push(q[cycle[cycle.length - 1]]);
  const turn = 2 * Math.PI;
  // Each step's angle going one way round (dir 1) or the other (−1); the right way adds up to a single lap.
  const steps = (dir: number) => cycle.map((k, n) => (((dir * (angleOf(cycle[(n + 1) % cycle.length]) - angleOf(k))) % turn) + turn) % turn);
  const dir = steps(1).reduce((a, b) => a + b, 0) <= steps(-1).reduce((a, b) => a + b, 0) ? 1 : -1;
  const sweep = dir * steps(dir).slice(0, m.turns === 2 ? 2 : 1).reduce((a, b) => a + b, 0);
  const j = m.turns === 2 ? q[q[i]] : q[i];
  const end = dotAt(j, l);
  const [r0, r1] = [Math.hypot(p[0] - cx, p[1] - cy), Math.hypot(end[0] - cx, end[1] - cy)];
  const a = Math.atan2(p[1] - cy, p[0] - cx) + sweep * t;
  const r = r0 + (r1 - r0) * t;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

// ——— The net: the cube unfolded ———

/** Where each face goes in the net, in faces across and down: U above F, then L F R B in a row, D below F. */
const NET: Record<Face, [number, number]> = { U: [1, 0], L: [0, 1], F: [1, 1], R: [2, 1], B: [3, 1], D: [1, 2] };

/** Sticker i's square in the net, in stickers across and down (12 across, 9 down). Each face is seen from outside, as its rows and columns are. */
export function netCell(i: number): [number, number] {
  const s = STICKERS[i];
  const [x, y] = NET[s.face];
  return [3 * x + s.col, 3 * y + s.row];
}
