// A solid worked by hand on the board (#564): turned, unfolded into its net, sliced by a plane and, for a cuboid,
// filled with unit cubes layer by layer. Everything here is plain geometry in 3D (no three.js), drawn by the piece as
// an SVG picture: so any number of solids show on one board, and "Copy as a picture" and print need nothing more.
//
// The solid stands on its base with its middle at the origin, z up; the viewer looks from the front (−y), turned
// round by `yaw` and up by `pitch`. Round solids are drawn as many flat facets.

export type V3 = [number, number, number];

export type SolidShape = "cuboid" | "prism" | "pyramid" | "cylinder" | "cone" | "sphere";
export const SOLID_SHAPES: readonly SolidShape[] = ["cuboid", "prism", "pyramid", "cylinder", "cone", "sphere"];
/** What the hand does on the solid: turn it (and change its sizes), open it into its net, slice it, fill it. */
export type SolidMode = "turn" | "open" | "cut" | "fill";

export type LiveSolid = {
  shape: SolidShape;
  /** Cuboid: length; prism and pyramid: the base's side; cylinder, cone and sphere: the radius. Whole units. */
  a: number;
  /** Cuboid: width. */
  b: number;
  /** The height (not the sphere's). */
  c: number;
  /** Prism and pyramid: the sides of the regular base. */
  n: number;
  /** How it is turned, whole degrees: round the upright, and up from level. */
  yaw: number;
  pitch: number;
  mode: SolidMode;
  /** How far the net is open, 0 (folded) to 100 (flat). */
  open: number;
  /** The slicing plane: how far along its normal across the solid (percent), its tilt from level and its turn round
   * the upright, whole degrees. */
  cutAt: number;
  tilt: number;
  spin: number;
  /** The cuboid's unit-cube layers filled so far. */
  layers: number;
};

export const DIM: readonly [number, number] = [1, 8];
export const SIDES: readonly [number, number] = [3, 8];
export const PITCH: readonly [number, number] = [-60, 85];
export const TILT: readonly [number, number] = [0, 90];
export const CUT_AT: readonly [number, number] = [5, 95];
/** A cone's slice within this many degrees of the slant is the parabola itself. */
export const PARABOLA_SNAP = 1.5;

export const SOLID_START: LiveSolid = {
  shape: "cuboid", a: 4, b: 3, c: 5, n: 4, yaw: 30, pitch: 24, mode: "turn", open: 0, cutAt: 50, tilt: 0, spin: 0, layers: 2,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const clampDim = (v: number) => clamp(Math.round(v), DIM[0], DIM[1]);

/** What the hand can do with a shape: a sphere has no net, and only a cuboid fills with unit cubes. */
export function modesOf(shape: SolidShape): SolidMode[] {
  if (shape === "sphere") return ["turn", "cut"];
  return shape === "cuboid" ? ["turn", "open", "cut", "fill"] : ["turn", "open", "cut"];
}

/** Another solid from the tray, keeping the sizes and, where it has one, what the hand was doing. */
export function pickShape(s: LiveSolid, shape: SolidShape): LiveSolid {
  const n = shape === "pyramid" ? 4 : shape === "prism" ? 3 : s.n;
  return { ...s, shape, n, mode: modesOf(shape).includes(s.mode) ? s.mode : "turn", open: 0, layers: Math.min(s.layers, s.c) };
}

/** A change of a size, keeping the cube layers inside the cuboid. */
export function resize(s: LiveSolid, key: "a" | "b" | "c", v: number): LiveSolid {
  const next = { ...s, [key]: clampDim(v) };
  return { ...next, layers: Math.min(next.layers, next.c) };
}

// ---- vectors -------------------------------------------------------------------------------------------------------

export const add = (p: V3, q: V3): V3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
export const sub = (p: V3, q: V3): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
export const scale = (p: V3, k: number): V3 => [p[0] * k, p[1] * k, p[2] * k];
export const dot = (p: V3, q: V3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
export const cross = (p: V3, q: V3): V3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
export const len = (p: V3) => Math.hypot(p[0], p[1], p[2]);
export const unit = (p: V3): V3 => scale(p, 1 / (len(p) || 1));
export const mean = (ps: V3[]): V3 => scale(ps.reduce(add, [0, 0, 0] as V3), 1 / Math.max(1, ps.length));
const rad = (deg: number) => (deg * Math.PI) / 180;
/** Turned round the upright by φ (radians). */
const turnZ = (p: V3, phi: number): V3 => [p[0] * Math.cos(phi) - p[1] * Math.sin(phi), p[0] * Math.sin(phi) + p[1] * Math.cos(phi), p[2]];

/** A flat polygon's area. */
export const polyArea = (pts: V3[]) => len(pts.reduce((s, p, i) => add(s, cross(p, pts[(i + 1) % pts.length])), [0, 0, 0] as V3)) / 2;

// ---- the solid as faces --------------------------------------------------------------------------------------------

export type FaceTag = "base" | "top" | "side" | "curved" | "cut" | "cube";
/** A flat face: its corners, the way out of the solid, and the face (or curved surface) of the solid it is part of. */
export type Face = { pts: V3[]; n: V3; tag: FaceTag; group: number };

/** Facets round a cylinder or cone, and round and up a sphere. */
export const ROUND = 64;
const SPHERE_ROWS = 14;

/** The way out of a face of a convex solid round the origin. */
function outward(pts: V3[]): V3 {
  const n = unit(pts.reduce((s, p, i) => add(s, cross(p, pts[(i + 1) % pts.length])), [0, 0, 0] as V3));
  return dot(n, mean(pts)) < 0 ? scale(n, -1) : n;
}
const face = (pts: V3[], tag: FaceTag, group: number): Face => ({ pts, n: outward(pts), tag, group });

/** k corners of a regular polygon of circumradius r at height z, its first side facing the viewer. */
function ring(k: number, r: number, z: number): V3[] {
  const phase = -Math.PI / 2 - Math.PI / k;
  return Array.from({ length: k }, (_, i) => [r * Math.cos(phase + (2 * Math.PI * i) / k), r * Math.sin(phase + (2 * Math.PI * i) / k), z] as V3);
}

/** How tall the solid stands. */
export const heightOf = (s: LiveSolid) => (s.shape === "sphere" ? 2 * s.a : s.c);
/** The circumradius of a regular n-gon of side a. */
const circumradius = (n: number, a: number) => a / (2 * Math.sin(Math.PI / n));

/**
 * The closed solid's faces, and for each the face it hangs from in the net (−1 for the base, which stays put). Round
 * surfaces unroll as a chain of facets both ways from the one at the front, so the net opens out evenly.
 */
export function solidFaces(s: LiveSolid): { faces: Face[]; parent: number[] } {
  const { a, b, c } = s;
  const [lo, hi] = [-c / 2, c / 2];
  switch (s.shape) {
    case "cuboid": {
      const [x, y] = [a / 2, b / 2];
      const faces = [
        face([[-x, -y, lo], [x, -y, lo], [x, y, lo], [-x, y, lo]], "base", 0),
        face([[-x, -y, hi], [x, -y, hi], [x, y, hi], [-x, y, hi]], "top", 1),
        face([[-x, -y, lo], [x, -y, lo], [x, -y, hi], [-x, -y, hi]], "side", 2),
        face([[-x, y, lo], [x, y, lo], [x, y, hi], [-x, y, hi]], "side", 3),
        face([[-x, -y, lo], [-x, y, lo], [-x, y, hi], [-x, -y, hi]], "side", 4),
        face([[x, -y, lo], [x, y, lo], [x, y, hi], [x, -y, hi]], "side", 5),
      ];
      return { faces, parent: [-1, 3, 0, 0, 0, 0] };
    }
    case "prism": {
      const r = circumradius(s.n, a);
      const [bot, top] = [ring(s.n, r, lo), ring(s.n, r, hi)];
      const sides = bot.map((p, i) => face([p, bot[(i + 1) % s.n], top[(i + 1) % s.n], top[i]], "side", 2 + i));
      return { faces: [face(bot, "base", 0), face(top, "top", 1), ...sides], parent: [-1, 2, ...sides.map(() => 0)] };
    }
    case "pyramid": {
      const bot = ring(s.n, circumradius(s.n, a), lo);
      const apex: V3 = [0, 0, hi];
      const sides = bot.map((p, i) => face([p, bot[(i + 1) % s.n], apex], "side", 1 + i));
      return { faces: [face(bot, "base", 0), ...sides], parent: [-1, ...sides.map(() => 0)] };
    }
    case "cylinder": {
      const [bot, top] = [ring(ROUND, a, lo), ring(ROUND, a, hi)];
      const strips = bot.map((p, i) => face([p, bot[(i + 1) % ROUND], top[(i + 1) % ROUND], top[i]], "curved", 2));
      // Strip i sits at faces[2 + i]; the first hangs from the base, the rest from their neighbour nearer the front.
      const chain = strips.map((_, i) => (i === 0 ? 0 : 2 + (i <= ROUND / 2 ? i - 1 : (i + 1) % ROUND)));
      return { faces: [face(bot, "base", 0), face(top, "top", 1), ...strips], parent: [-1, 2, ...chain] };
    }
    case "cone": {
      const bot = ring(ROUND, a, lo);
      const apex: V3 = [0, 0, hi];
      const tris = bot.map((p, i) => face([p, bot[(i + 1) % ROUND], apex], "curved", 1));
      const chain = tris.map((_, i) => (i === 0 ? 0 : 1 + (i <= ROUND / 2 ? i - 1 : (i + 1) % ROUND)));
      return { faces: [face(bot, "base", 0), ...tris], parent: [-1, ...chain] };
    }
    case "sphere": {
      const cols = 2 * SPHERE_ROWS;
      const at = (i: number, j: number): V3 => {
        const [th, ph] = [(Math.PI * i) / SPHERE_ROWS, (2 * Math.PI * j) / cols];
        return [a * Math.sin(th) * Math.cos(ph), a * Math.sin(th) * Math.sin(ph), a * Math.cos(th)];
      };
      const faces: Face[] = [];
      for (let i = 0; i < SPHERE_ROWS; i++) {
        for (let j = 0; j < cols; j++) {
          const pts = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
          // At the poles two corners are one point.
          faces.push(face(i === 0 ? pts.slice(0, 3) : i === SPHERE_ROWS - 1 ? [pts[0], pts[1], pts[3]] : pts, "curved", 0));
        }
      }
      return { faces, parent: faces.map(() => -1) };
    }
  }
}

// ---- the net -------------------------------------------------------------------------------------------------------

type Turn = { m: number[]; t: V3 };
const ID: Turn = { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
const mulM = (m: number[], p: V3): V3 => [m[0] * p[0] + m[1] * p[1] + m[2] * p[2], m[3] * p[0] + m[4] * p[1] + m[5] * p[2], m[6] * p[0] + m[7] * p[1] + m[8] * p[2]];
const apply = (T: Turn, p: V3) => add(mulM(T.m, p), T.t);
/** T after U: first U, then T. */
function after(T: Turn, U: Turn): Turn {
  const m = Array.from({ length: 9 }, (_, k) => {
    const [r, c] = [Math.floor(k / 3), k % 3];
    return T.m[3 * r] * U.m[c] + T.m[3 * r + 1] * U.m[3 + c] + T.m[3 * r + 2] * U.m[6 + c];
  });
  return { m, t: apply(T, U.t) };
}
/** A turn by θ about the line through h along the unit u (Rodrigues). */
function turnAbout(h: V3, u: V3, th: number): Turn {
  const [x, y, z] = u;
  const [c, s, k] = [Math.cos(th), Math.sin(th), 1 - Math.cos(th)];
  const m = [c + x * x * k, x * y * k - z * s, x * z * k + y * s, y * x * k + z * s, c + y * y * k, y * z * k - x * s, z * x * k - y * s, z * y * k + x * s, c + z * z * k];
  return { m, t: sub(h, mulM(m, h)) };
}

const key = (p: V3) => p.map((v) => v.toFixed(5)).join(",");

/** The edge a face shares with the face it hangs from. */
function hinge(f: Face, p: Face): [V3, V3] {
  const on = new Set(p.pts.map(key));
  for (let i = 0; i < f.pts.length; i++) {
    const [q, r] = [f.pts[i], f.pts[(i + 1) % f.pts.length]];
    if (on.has(key(q)) && on.has(key(r))) return [q, r];
  }
  throw new Error("a net face shares no edge with its parent");
}

/**
 * The solid opened `t` of the way (0 folded, 1 flat): each face turns about the edge it shares with the face it hangs
 * from, by t of the angle that lays it flat beside it, and carries the faces that hang from it along.
 */
export function netFaces(s: LiveSolid, t: number): Face[] {
  const { faces, parent } = solidFaces(s);
  const turns = new Map<number, Turn>();
  const turnOf = (i: number): Turn => {
    const known = turns.get(i);
    if (known) return known;
    const p = parent[i];
    let T = ID;
    if (p >= 0 && t > 0) {
      const [h0, h1] = hinge(faces[i], faces[p]);
      const u = unit(sub(h1, h0));
      const [nc, np] = [faces[i].n, faces[p].n];
      const full = Math.acos(clamp(dot(nc, np), -1, 1));
      // Whichever way lays the face's outside on its parent's outside: open, not folded in.
      const way = dot(mulM(turnAbout([0, 0, 0], u, full).m, nc), np) >= dot(mulM(turnAbout([0, 0, 0], u, -full).m, nc), np) ? 1 : -1;
      T = after(turnOf(p), turnAbout(h0, u, way * full * t));
    }
    turns.set(i, T);
    return T;
  };
  return faces.map((f, i) => {
    const T = turnOf(i);
    return { ...f, pts: f.pts.map((q) => apply(T, q)), n: mulM(T.m, f.n) };
  });
}

// ---- measures ------------------------------------------------------------------------------------------------------

/** A number as written beside the solid: whole when it is, otherwise to two places. */
export const fmt = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return (Number.isInteger(r) ? String(r) : r.toFixed(2)).replace("-", "−");
};
const isWhole = (v: number) => Math.abs(v - Math.round(v)) < 1e-9;
const eq = (v: number) => (isWhole(v) ? "=" : "≈");

/** A regular n-gon's area from its side. */
export const ngonArea = (n: number, a: number) => (n * a * a) / (4 * Math.tan(Math.PI / n));

/** The net's pieces, each with its area: one per flat face, one for each round surface. */
export function netParts(s: LiveSolid): { group: number; area: number; tag: FaceTag }[] {
  const { a, b, c } = s;
  switch (s.shape) {
    case "cuboid":
      return [a * b, a * b, a * c, a * c, b * c, b * c].map((area, group) => ({ group, area, tag: group === 0 ? "base" : group === 1 ? "top" : "side" }));
    case "prism": {
      const B = ngonArea(s.n, a);
      return [{ group: 0, area: B, tag: "base" }, { group: 1, area: B, tag: "top" }, ...Array.from({ length: s.n }, (_, i) => ({ group: 2 + i, area: a * c, tag: "side" as const }))];
    }
    case "pyramid": {
      const slant = Math.hypot(a / (2 * Math.tan(Math.PI / s.n)), c);
      return [{ group: 0, area: ngonArea(s.n, a), tag: "base" }, ...Array.from({ length: s.n }, (_, i) => ({ group: 1 + i, area: (a * slant) / 2, tag: "side" as const }))];
    }
    case "cylinder":
      return [{ group: 0, area: Math.PI * a * a, tag: "base" }, { group: 1, area: Math.PI * a * a, tag: "top" }, { group: 2, area: 2 * Math.PI * a * c, tag: "curved" }];
    case "cone":
      return [{ group: 0, area: Math.PI * a * a, tag: "base" }, { group: 1, area: Math.PI * a * Math.hypot(a, c), tag: "curved" }];
    case "sphere":
      return [{ group: 0, area: 4 * Math.PI * a * a, tag: "curved" }];
  }
}

/** The volume and surface area, and how each is worked out with the solid's own numbers. */
export function measures(s: LiveSolid): { V: number; S: number; lines: string[] } {
  const { a, b, c, n } = s;
  const S = netParts(s).reduce((t, p) => t + p.area, 0);
  const PI = Math.PI;
  switch (s.shape) {
    case "cuboid": {
      const V = a * b * c;
      return { V, S, lines: [`V = ${a} × ${b} × ${c} = ${V}`, `S = 2 × (${a * b} + ${b * c} + ${a * c}) = ${S}`] };
    }
    case "prism": {
      const B = ngonArea(n, a);
      return { V: B * c, S, lines: [`V = B × h ${eq(B)} ${fmt(B)} × ${c} ${eq(B * c)} ${fmt(B * c)}`, `S = 2B + ${n} × ${a} × ${c} ${eq(S)} ${fmt(S)}`] };
    }
    case "pyramid": {
      const B = ngonArea(n, a);
      const V = (B * c) / 3;
      return { V, S, lines: [`V = ⅓ × B × h ${eq(V)} ⅓ × ${fmt(B)} × ${c} ${eq(V)} ${fmt(V)}`, `S = B + ${n} × ½ × ${a} × l ${eq(S)} ${fmt(S)}`] };
    }
    case "cylinder": {
      const V = PI * a * a * c;
      return { V, S, lines: [`V = π × ${a}² × ${c} = ${a * a * c}π ≈ ${fmt(V)}`, `S = 2π × ${a}² + 2π × ${a} × ${c} = ${2 * a * a + 2 * a * c}π ≈ ${fmt(S)}`] };
    }
    case "cone": {
      const V = (PI * a * a * c) / 3;
      const l = Math.hypot(a, c);
      return { V, S, lines: [`V = ⅓ × π × ${a}² × ${c} ≈ ${fmt(V)}`, `S = π × ${a}² + π × ${a} × l ≈ ${fmt(S)}   (l = √(${a}² + ${c}²) ${eq(l)} ${fmt(l)})`] };
    }
    case "sphere": {
      const V = (4 / 3) * PI * a ** 3;
      return { V, S, lines: [`V = ⁴⁄₃ × π × ${a}³ ≈ ${fmt(V)}`, `S = 4π × ${a}² = ${4 * a * a}π ≈ ${fmt(S)}`] };
    }
  }
}

/** The net's area as the sum of its pieces. */
export function netSum(s: LiveSolid): string {
  const parts = netParts(s);
  const S = parts.reduce((t, p) => t + p.area, 0);
  const exact = parts.every((p) => isWhole(p.area));
  return `S ${exact ? "=" : "≈"} ${parts.map((p) => fmt(p.area)).join(" + ")} ${exact ? "=" : "≈"} ${fmt(S)}`;
}

// ---- the slice -----------------------------------------------------------------------------------------------------

export type Plane = {
  /** The way up out of the plane, and its distance from the middle of the solid along it. */
  n: V3;
  d: number;
  /** The point of the plane nearest the middle, and two ways along the plane: level, and down its slope. */
  c0: V3;
  e1: V3;
  e2: V3;
  /** The tilt used, and the plane's range across the solid (what cutAt runs over). */
  tilt: number;
  lo: number;
  hi: number;
  /** A cone's slice laid exactly along its slant: the parabola. */
  slant: boolean;
};

/** A cone's slant, in degrees up from its base. */
export const coneSlant = (s: LiveSolid) => (Math.atan2(s.c, s.a) * 180) / Math.PI;

export function cutPlane(s: LiveSolid): Plane {
  let tilt = s.tilt;
  let slant = false;
  if (s.shape === "cone" && Math.abs(tilt - coneSlant(s)) <= PARABOLA_SNAP) {
    tilt = coneSlant(s);
    slant = true;
  }
  const [tau, phi] = [rad(tilt), rad(s.spin)];
  const n = turnZ([0, Math.sin(tau), Math.cos(tau)], phi);
  const e1 = turnZ([1, 0, 0], phi);
  const e2 = turnZ([0, Math.cos(tau), -Math.sin(tau)], phi);
  const along = solidFaces(s).faces.flatMap((f) => f.pts.map((p) => dot(n, p)));
  const [lo, hi] = [Math.min(...along), Math.max(...along)];
  const d = lo + ((hi - lo) * s.cutAt) / 100;
  return { n, d, c0: scale(n, d), e1, e2, tilt, lo, hi, slant };
}

/** The point where the edge pq crosses the plane, worked the same way from either end so both faces agree. */
function crossing(p: V3, q: V3, n: V3, d: number): V3 {
  const [u, v] = key(p) < key(q) ? [p, q] : [q, p];
  const [su, sv] = [dot(n, u) - d, dot(n, v) - d];
  return add(u, scale(sub(v, u), su / (su - sv)));
}

const EPS = 1e-9;
/** The part of a face on one side of the plane (below: n·p ≤ d), and the points where it meets the plane. */
function clip(pts: V3[], n: V3, d: number, below: boolean, met: V3[]): V3[] {
  const side = (p: V3) => (below ? 1 : -1) * (dot(n, p) - d);
  const out: V3[] = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const [sp, sq] = [side(p), side(q)];
    if (sp <= EPS) out.push(p);
    if (Math.abs(sp) <= EPS) met.push(p);
    if ((sp < -EPS && sq > EPS) || (sp > EPS && sq < -EPS)) {
      const x = crossing(p, q, n, d);
      out.push(x);
      met.push(x);
    }
  });
  return out;
}

/** Points in order round their middle, as seen along the plane; the same point met twice is kept once. */
function around(pts: V3[], pl: Plane): V3[] {
  const seen = new Map<string, V3>();
  for (const p of pts) seen.set(key(p), p);
  const uniq = [...seen.values()];
  const m = mean(uniq);
  const ang = (p: V3) => Math.atan2(dot(sub(p, m), pl.e2), dot(sub(p, m), pl.e1));
  return uniq.sort((p, q) => ang(p) - ang(q));
}

/** Corners where the outline really turns: points on a straight side are left out. */
export function corners(pts: V3[]): V3[] {
  const k = pts.length;
  return pts.filter((p, i) => {
    const [u, v] = [unit(sub(p, pts[(i + k - 1) % k])), unit(sub(pts[(i + 1) % k], p))];
    return len(cross(u, v)) > 1e-6;
  });
}

/** The group number the slice's own face takes. */
export const CUT_GROUP = 1000;

/** The solid cut by its plane: the part below, the part above (to be lifted off) and the cut face itself. */
export function cutFaces(s: LiveSolid, pl = cutPlane(s)): { below: Face[]; above: Face[]; cut: V3[] } {
  const { faces } = solidFaces(s);
  const met: V3[] = [];
  const below: Face[] = [];
  const above: Face[] = [];
  for (const f of faces) {
    const lo = clip(f.pts, pl.n, pl.d, true, met);
    if (lo.length >= 3) below.push({ ...f, pts: lo });
    const hi = clip(f.pts, pl.n, pl.d, false, []);
    if (hi.length >= 3) above.push({ ...f, pts: hi });
  }
  const cut = around(met, pl);
  if (cut.length >= 3) {
    below.push({ pts: cut, n: pl.n, tag: "cut", group: CUT_GROUP });
    above.push({ pts: [...cut].reverse(), n: scale(pl.n, -1), tag: "cut", group: CUT_GROUP });
  }
  return { below, above, cut };
}

export type CutName =
  | "triangle" | "square" | "rectangle" | "parallelogram" | "trapezium" | "quadrilateral" | "pentagon" | "hexagon" | "heptagon" | "octagon"
  | "circle" | "ellipse" | "ellipsePart" | "parabola" | "hyperbola";

const parallel = (p: V3, q: V3) => len(cross(unit(p), unit(q))) < 1e-6;

/** What shape the cut face is. */
export function cutName(s: LiveSolid, pl: Plane, cut: V3[]): CutName {
  const level = pl.tilt === 0;
  const upright = pl.tilt === 90;
  const onEnd = (z: number) => cut.some((p) => Math.abs(p[2] - z) < 1e-6);
  switch (s.shape) {
    case "sphere":
      return "circle";
    case "cylinder":
      if (level) return "circle";
      if (upright) return "rectangle";
      return onEnd(-s.c / 2) || onEnd(s.c / 2) ? "ellipsePart" : "ellipse";
    case "cone": {
      if (level) return "circle";
      if (pl.slant) return "parabola";
      if (pl.tilt > coneSlant(s)) {
        // Through the tip, the two straight sides of the cone: a hyperbola squashed flat.
        return Math.abs(dot(pl.n, [0, 0, s.c / 2]) - pl.d) < 1e-6 ? "triangle" : "hyperbola";
      }
      return onEnd(-s.c / 2) ? "ellipsePart" : "ellipse";
    }
    default: {
      const k = corners(cut);
      if (k.length === 3) return "triangle";
      if (k.length === 4) {
        const side = (i: number) => sub(k[(i + 1) % 4], k[i]);
        const pairs = [parallel(side(0), side(2)), parallel(side(1), side(3))];
        if (pairs[0] && pairs[1]) {
          const right = Math.abs(dot(unit(side(0)), unit(side(1)))) < 1e-6;
          if (!right) return "parallelogram";
          return Math.abs(len(side(0)) - len(side(1))) < 1e-6 ? "square" : "rectangle";
        }
        return pairs[0] || pairs[1] ? "trapezium" : "quadrilateral";
      }
      return (["pentagon", "hexagon", "heptagon", "octagon"] as const)[k.length - 5] ?? "octagon";
    }
  }
}

/** How much of a circle's area its ROUND-sided polygon covers: a slice of a cylinder or cone is short by as much. */
const FACETED = (ROUND * Math.sin((2 * Math.PI) / ROUND)) / (2 * Math.PI);

/** The cut face's area: a sphere's slice worked exactly, any other from its outline (round ones made up for their
 * facets, which leaves a slice cut off by an end very nearly right). */
export function cutArea(s: LiveSolid, pl: Plane, cut: V3[]): number {
  if (s.shape === "sphere") return Math.PI * Math.max(0, s.a * s.a - pl.d * pl.d);
  if (cut.length < 3) return 0;
  // An upright slice is cut straight across the facets: nothing round in it to make up for.
  return polyArea(cut) / ((s.shape === "cylinder" || s.shape === "cone") && pl.tilt < 90 ? FACETED : 1);
}

// ---- unit cubes ----------------------------------------------------------------------------------------------------

/** The first `k` layers of unit cubes in the cuboid, as the outside squares of the block they make. */
export function cubeFaces(s: LiveSolid, k: number): Face[] {
  const { a, b, c } = s;
  if (k <= 0) return [];
  const [x0, y0, z0] = [-a / 2, -b / 2, -c / 2];
  const faces: Face[] = [];
  let g = 0;
  const sq = (pts: V3[], n: V3) => faces.push({ pts, n, tag: "cube", group: g++ });
  for (let i = 0; i < a; i++) {
    for (let j = 0; j < b; j++) {
      const [x, y] = [x0 + i, y0 + j];
      sq([[x, y, z0 + k], [x + 1, y, z0 + k], [x + 1, y + 1, z0 + k], [x, y + 1, z0 + k]], [0, 0, 1]);
      sq([[x, y, z0], [x + 1, y, z0], [x + 1, y + 1, z0], [x, y + 1, z0]], [0, 0, -1]);
    }
  }
  for (let m = 0; m < k; m++) {
    const z = z0 + m;
    for (let i = 0; i < a; i++) {
      const x = x0 + i;
      sq([[x, y0, z], [x + 1, y0, z], [x + 1, y0, z + 1], [x, y0, z + 1]], [0, -1, 0]);
      sq([[x, -y0, z], [x + 1, -y0, z], [x + 1, -y0, z + 1], [x, -y0, z + 1]], [0, 1, 0]);
    }
    for (let j = 0; j < b; j++) {
      const y = y0 + j;
      sq([[x0, y, z], [x0, y + 1, z], [x0, y + 1, z + 1], [x0, y, z + 1]], [-1, 0, 0]);
      sq([[-x0, y, z], [-x0, y + 1, z], [-x0, y + 1, z + 1], [-x0, y, z + 1]], [1, 0, 0]);
    }
  }
  return faces;
}

// ---- the view ------------------------------------------------------------------------------------------------------

export type View = { yaw: number; pitch: number };
/** Where a point of the solid is seen: across, up, and how near the viewer (bigger is nearer). */
export function seen(p: V3, v: View): [number, number, number] {
  const [y, e] = [rad(v.yaw), rad(v.pitch)];
  const x1 = p[0] * Math.cos(y) - p[1] * Math.sin(y);
  const y1 = p[0] * Math.sin(y) + p[1] * Math.cos(y);
  return [x1, y1 * Math.sin(e) + p[2] * Math.cos(e), -y1 * Math.cos(e) + p[2] * Math.sin(e)];
}
/** A way out of the solid as seen: its last part is how much it faces the viewer. */
export const seenWay = (n: V3, v: View) => sub(seen(n, v), seen([0, 0, 0], v));
