// The Rubik's cube behind the live cube on the board: its 54 stickers, the six face turns as permutations of them
// (worked out from the geometry, by turning each sticker's position and direction a quarter turn), move sequences
// read and written in the usual letters (R U R′ U′), the order of a sequence (the lcm of its sticker cycles), random
// scrambles, and where each sticker sits in the circle picture, the cube drawn on three bands of circles (Borromean
// rings), one per axis.
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

// ——— The circle picture: the cube on three rings ———

/**
 * The picture of "A permutation representation of Rubik's cube on Borromean rings": one band of three circles per
 * axis (R–L, U–D, F–B), the bands' middles at the corners of a triangle. Two bands cross twice, and the two crossings
 * are the two faces of the third axis: a sticker of F, in the layer x of the R–L axis and y of the U–D axis, is where
 * circle x of the R–L band meets circle y of the U–D band near F's crossing. So the twelve stickers a turn of R carries
 * round all lie on one circle, the R circle of the R–L band, and the turn slides them along it.
 *
 * With `lean` below 1 each band leans its own way, as rings in space do: its circles are squashed to `lean` along the
 * line from the middle of the picture to the band's middle, and turned by `skew`. Everything is found first on the
 * round picture and then followed as the bands lean, so the crossings stay the same ones.
 */
export type Layout = { cx: number; cy: number; d: number; rho: number; step: number; lean?: number; skew?: number };
export type Axis = 0 | 1 | 2;
type P = [number, number];
/** x for R and L, y for U and D, z for F and B (the index of the coordinate a face's normal points along). */
export const axisOf = (f: Face): Axis => NORMAL[f].findIndex((c) => c !== 0) as Axis;
/** R, U and B sit at the inner crossings, L, D and F at the outer ones, as in the paper's picture. */
const INNER: Record<Face, boolean> = { R: true, U: true, B: true, L: false, D: false, F: false };

/** The direction a band's middle is in, from the middle of the picture. */
const bandAngle = (axis: Axis) => (axis * 2 * Math.PI) / 3;

/** The middle of an axis's band: the R–L band's at the top, U–D's lower right, F–B's lower left. */
export function bandCentre(axis: Axis, { cx, cy, d }: Layout): P {
  const a = bandAngle(axis);
  return [cx + d * Math.sin(a), cy - d * Math.cos(a)];
}

/** The way a band's circles are squashed: the long axis of its ellipses (as an angle on the screen) and how much. */
export function bandTilt(axis: Axis, l: Layout): { angle: number; lean: number } {
  return { angle: bandAngle(axis) + (l.skew ?? 0), lean: l.lean ?? 1 };
}

/** A point of the round picture of a band, where it is once the band leans, and back. */
function leanBy(axis: Axis, p: P, l: Layout, back = false): P {
  const { angle, lean } = bandTilt(axis, l);
  if (lean === 1) return p;
  const [cx, cy] = bandCentre(axis, l);
  // Squash along the short axis (perpendicular to the long one).
  const [ux, uy] = [-Math.sin(angle), Math.cos(angle)];
  const [dx, dy] = [p[0] - cx, p[1] - cy];
  const along = (dx * ux + dy * uy) * ((back ? 1 / lean : lean) - 1);
  return [p[0] + along * ux, p[1] + along * uy];
}
/** A point on a leaning band, taken back to where it is on the band's round circles. */
export const unlean = (axis: Axis, p: P, l: Layout): P => leanBy(axis, p, l, true);

/** The point at angle t of circle r of a band, once the band leans. */
const onBand = (axis: Axis, r: number, t: number, l: Layout): P => {
  const [cx, cy] = bandCentre(axis, l);
  return leanBy(axis, [cx + r * Math.cos(t), cy + r * Math.sin(t)], l);
};

/** Where two circles meet (none: an empty list). */
function meet([x1, y1]: P, r1: number, [x2, y2]: P, r2: number): P[] {
  const D = Math.hypot(x2 - x1, y2 - y1);
  const a = (r1 * r1 - r2 * r2 + D * D) / (2 * D);
  const h2 = r1 * r1 - a * a;
  if (!(h2 >= 0)) return [];
  const [ux, uy] = [(x2 - x1) / D, (y2 - y1) / D];
  const [mx, my, h] = [x1 + a * ux, y1 + a * uy, Math.sqrt(h2)];
  return [[mx - h * uy, my + h * ux], [mx + h * uy, my - h * ux]];
}

const nearest = (points: P[], [x, y]: P) =>
  points.reduce((best, p) => (Math.hypot(p[0] - x, p[1] - y) < Math.hypot(best[0] - x, best[1] - y) ? p : best));

const LEAN_STEPS = 12;
const crossings = new WeakMap<Layout, Map<string, P>>();

/**
 * Where circle rb of band b meets circle rc of band c, the crossing picked on the round picture by `pick`: found
 * there, then followed a little at a time (Newton's method on the two angles) as the bands lean.
 */
function crossing(b: Axis, rb: number, c: Axis, rc: number, pick: (ps: P[]) => P, l: Layout): P {
  const round = { ...l, lean: 1 };
  const start = pick(meet(bandCentre(b, l), rb, bandCentre(c, l), rc));
  if ((l.lean ?? 1) === 1) return start;
  const key = `${b} ${rb} ${c} ${rc} ${start.join()}`;
  let cache = crossings.get(l);
  if (!cache) crossings.set(l, (cache = new Map()));
  const known = cache.get(key);
  if (known) return known;
  const angleOn = (a: Axis, p: P) => Math.atan2(p[1] - bandCentre(a, round)[1], p[0] - bandCentre(a, round)[0]);
  let [s, t] = [angleOn(b, start), angleOn(c, start)];
  for (let k = 1; k <= LEAN_STEPS; k++) {
    const lk = { ...l, lean: 1 + ((l.lean! - 1) * k) / LEAN_STEPS };
    for (let it = 0; it < 30; it++) {
      const [p, q] = [onBand(b, rb, s, lk), onBand(c, rc, t, lk)];
      const [fx, fy] = [p[0] - q[0], p[1] - q[1]];
      if (Math.hypot(fx, fy) < 1e-12) break;
      // The derivatives along each circle: the leaning is linear, so it is the lean of the tangent.
      const [p1, q1] = [onBand(b, rb, s + 1e-6, lk), onBand(c, rc, t + 1e-6, lk)];
      const [ax, ay] = [(p1[0] - p[0]) / 1e-6, (p1[1] - p[1]) / 1e-6];
      const [bx, by] = [-(q1[0] - q[0]) / 1e-6, -(q1[1] - q[1]) / 1e-6];
      const det = ax * by - bx * ay;
      s -= (fx * by - bx * fy) / det;
      t -= (ax * fy - fx * ay) / det;
    }
  }
  const out = onBand(b, rb, s, l);
  cache.set(key, out);
  return out;
}

/** The two axes other than a face's own, whose bands cross at the face. */
const across = (f: Face): [Axis, Axis] => ([0, 1, 2] as Axis[]).filter((a) => a !== axisOf(f)) as [Axis, Axis];

/** A face's crossing: where the middle circles of the other two bands meet, nearer the centre or further out. */
export function ringCentre(face: Face, l: Layout): P {
  const [b, c] = across(face);
  const pick = ([p, q]: P[]) => (INNER[face] === Math.hypot(p[0] - l.cx, p[1] - l.cy) < Math.hypot(q[0] - l.cx, q[1] - l.cy) ? p : q);
  return crossing(b, l.rho, c, l.rho, pick, l);
}

/** The radius of the circle for layer v (−1, 0, 1) of an axis: the layer of the face whose crossing is inside the band is the inner circle. */
export function bandRadius(axis: Axis, v: number, l: Layout): number {
  const round = { ...l, lean: 1 };
  const plus = FACES.find((f) => NORMAL[f][axis] === 1)!;
  const [x, y] = ringCentre(plus, round);
  const [bx, by] = bandCentre(axis, l);
  return l.rho + (Math.hypot(x - bx, y - by) < l.rho ? -1 : 1) * v * l.step;
}

/** A sticker's dot: where the circles of its two layers meet, at its face's crossing. */
export function dotAt(i: number, l: Layout): P {
  const s = STICKERS[i];
  const [b, c] = across(s.face);
  const centre = ringCentre(s.face, { ...l, lean: 1 });
  return crossing(b, bandRadius(b, s.pos[b], l), c, bandRadius(c, s.pos[c], l), (ps) => nearest(ps, centre), l);
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Where sticker i is a fraction t of the way through a move. The twelve stickers beside the face slide along their
 * circle of the face's band (worked out on the band's round circle, then leant); the face's own turn round its
 * crossing. The angle is added up a quarter turn at a time (each step is less than half way round, so its direction is
 * never in doubt).
 */
export function dotDuring(i: number, m: Move, t: number, l: Layout): P {
  if (!onLayer(m.face, i)) return dotAt(i, l);
  const own = STICKERS[i].face === m.face;
  const axis = axisOf(m.face);
  // The stickers beside the face move in the band's own round picture; the face's own about its crossing.
  const flat = (p: P): P => (own ? p : unlean(axis, p, l));
  const p = flat(dotAt(i, l));
  const [cx, cy] = own ? ringCentre(m.face, l) : bandCentre(axis, l);
  const q = movePerm(m.turns === 3 ? inverse({ face: m.face, turns: 1 }) : { face: m.face, turns: 1 });
  let [j, sweep] = [i, 0];
  for (let k = 0; k < (m.turns === 2 ? 2 : 1); k++) {
    const [a, b] = [flat(dotAt(j, l)), flat(dotAt(q[j], l))];
    sweep += wrapAngle(Math.atan2(b[1] - cy, b[0] - cx) - Math.atan2(a[1] - cy, a[0] - cx));
    j = q[j];
  }
  const end = flat(dotAt(j, l));
  const [r0, r1] = [Math.hypot(p[0] - cx, p[1] - cy), Math.hypot(end[0] - cx, end[1] - cy)];
  const a = Math.atan2(p[1] - cy, p[0] - cx) + sweep * t;
  const r = r0 + (r1 - r0) * t;
  const at: P = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  return own ? at : leanBy(axis, at, l);
}
