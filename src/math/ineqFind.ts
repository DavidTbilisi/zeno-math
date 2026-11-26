// Inequalities on a number line, found by testing points (#723). Each round gives an inequality in x; a number on
// the line is tapped to put it in, and it turns green when the inequality holds there, red when it does not. Only
// once points on both sides and the point where it changes have been tested does the right set count, so the end
// point (left out by < and >, taken in by ≤ and ≥) and the sign turned round by a negative x are found by looking
// before they are said. src/live/IneqFind.tsx draws it; everything here is plain data.

export type IneqRel = "<" | "<=" | ">" | ">=";

/** One round: a·x + b rel c. */
export type IneqRound = { a: number; b: number; rel: IneqRel; c: number };

export const INEQ_LADDER: IneqRound[] = [
  { a: 1, b: 2, rel: "<", c: 5 },
  { a: 1, b: -1, rel: ">=", c: 2 },
  { a: -2, b: 0, rel: "<", c: 6 },
  { a: -1, b: 3, rel: "<=", c: 1 },
];

/** The numbers on the line. */
export const LO = -6;
export const HI = 6;

export type LiveIneqFind = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** The numbers tested this round, the last one tested last. */
  tested: number[];
  /** The tile tapped last in this round, and whether it was right. */
  said: { v: IneqRel; ok: boolean } | null;
};

export const INEQ_FIND_START: LiveIneqFind = { round: 0, tested: [], said: null };

export const roundOf = (s: LiveIneqFind) => INEQ_LADDER[s.round] ?? null;

export const holdsRel = (u: number, rel: IneqRel, v: number) => (rel === "<" ? u < v : rel === "<=" ? u <= v : rel === ">" ? u > v : u >= v);
/** Whether the round's inequality holds at x. */
export const holds = (r: IneqRound, x: number) => holdsRel(r.a * x + r.b, r.rel, r.c);

const FLIP: Record<IneqRel, IneqRel> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=" };
const TOGGLE: Record<IneqRel, IneqRel> = { "<": "<=", "<=": "<", ">": ">=", ">=": ">" };

/** The set the round's inequality holds on: x rel t (dividing by a negative a turns the sign round). */
export function solution(r: IneqRound): { rel: IneqRel; t: number } {
  return { rel: r.a < 0 ? FLIP[r.rel] : r.rel, t: (r.c - r.b) / r.a };
}

/** A number tested: put on the line (or moved to the end of the list when it was tested before). */
export function test(s: LiveIneqFind, x: number): LiveIneqFind {
  if (!roundOf(s)) return s;
  const v = Math.max(LO, Math.min(HI, Math.round(x)));
  return { ...s, tested: [...s.tested.filter((k) => k !== v), v] };
}

/** Enough tested for the set to count: the end point itself, and points where it holds and where it does not. */
export function ready(s: LiveIneqFind): boolean {
  const r = roundOf(s);
  if (!r) return false;
  const { t } = solution(r);
  return s.tested.includes(t) && s.tested.some((x) => x !== t && holds(r, x)) && s.tested.some((x) => x !== t && !holds(r, x));
}

/**
 * The round's tiles: the right set, the slip (the end point taken the other way in the first two rounds, the sign
 * not turned round in the last two), and the two others.
 */
export function tiles(s: LiveIneqFind): { right: IneqRel; slip: IneqRel } | null {
  const r = roundOf(s);
  if (!r) return null;
  const { rel } = solution(r);
  return { right: rel, slip: r.a < 0 ? FLIP[rel] : TOGGLE[rel] };
}

/** The four sets, in the same order every round. */
export const ORDER: IneqRel[] = ["<", "<=", ">", ">="];

/** A tile tapped: right only once enough has been tested. A right answer stands until Next. */
export function tap(s: LiveIneqFind, v: IneqRel): LiveIneqFind {
  const t = tiles(s);
  if (!t || s.said?.ok) return s;
  return { ...s, said: { v, ok: v === t.right && ready(s) } };
}

/** What a wrong tile got wrong: the end point only, the side only, or both. */
export function missOf(s: LiveIneqFind, v: IneqRel): "end" | "side" | "both" | null {
  const t = tiles(s);
  if (!t || v === t.right) return null;
  const side = (k: IneqRel) => k[0];
  if (side(v) === side(t.right)) return "end";
  return v.length === t.right.length ? "side" : "both";
}

/** The next round, nothing tested yet. */
export const next = (s: LiveIneqFind): LiveIneqFind => ({ round: Math.min(INEQ_LADDER.length, s.round + 1), tested: [], said: null });

/** The ladder started again. */
export const again = (): LiveIneqFind => INEQ_FIND_START;

/** A number as read, with a true minus. */
export const say = (v: number) => String(v).replace(/^-/, "−");
const inner = (x: number) => (x < 0 ? `(${say(x)})` : say(x));
export const REL_SAY: Record<IneqRel, string> = { "<": "<", "<=": "≤", ">": ">", ">=": "≥" };

/** The round's left side as written: "x + 2", "−2x", "3 − x". */
export function lhs(r: IneqRound): string {
  const ax = r.a === 1 ? "x" : r.a === -1 ? "−x" : `${say(r.a)}x`;
  if (!r.b) return ax;
  return r.a === -1 ? `${say(r.b)} − x` : `${ax} ${r.b < 0 ? "−" : "+"} ${Math.abs(r.b)}`;
}

/** The left side with x put in: "1 + 2", "−2 × (−3)", "3 − 4". */
export function lhsAt(r: IneqRound, x: number): string {
  if (r.a === -1 && r.b) return `${say(r.b)} − ${inner(x)}`;
  const ax = r.a === 1 ? say(x) : `${say(r.a)} × ${inner(x)}`;
  return r.b ? `${ax} ${r.b < 0 ? "−" : "+"} ${Math.abs(r.b)}` : ax;
}

/** One end of a set drawn on a line: at v, filled when v itself is in. */
export type LineEnd = { v: number; closed: boolean };

/**
 * A number line from lo to hi with sets drawn on it, each from its lower end to its upper one (a missing end runs off
 * the line with an arrow): an open dot when the end is left out, a filled one when it is in. Used by practice.
 */
export function ineqLineSvg(lo: number, hi: number, sets: { lo: LineEnd | null; hi: LineEnd | null }[]): { body: string; w: number; h: number } {
  const [U, PAD, y] = [36, 30, 30];
  const X = (v: number) => PAD + (v - lo) * U;
  const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', Sylfaen, sans-serif"`;
  const out: string[] = [];
  for (const s of sets) {
    const [a, b] = [s.lo ? X(s.lo.v) : X(lo) - 22, s.hi ? X(s.hi.v) : X(hi) + 22];
    out.push(`<line x1="${a}" y1="${y}" x2="${b}" y2="${y}" stroke="#2f9e44" stroke-width="7" stroke-opacity="0.5"/>`);
    if (!s.lo) out.push(`<path d="M${a - 6} ${y} l12 -8 v16 z" fill="#2f9e44"/>`);
    if (!s.hi) out.push(`<path d="M${b + 6} ${y} l-12 -8 v16 z" fill="#2f9e44"/>`);
  }
  out.push(`<line x1="${X(lo) - 16}" y1="${y}" x2="${X(hi) + 16}" y2="${y}" stroke="#1e1e1e" stroke-width="1.5"/>`);
  for (let v = lo; v <= hi; v++)
    out.push(`<line x1="${X(v)}" y1="${y - 5}" x2="${X(v)}" y2="${y + 5}" stroke="#1e1e1e"/><text x="${X(v)}" y="${y + 22}" font-size="12" text-anchor="middle" ${font} fill="${v === 0 ? "#1e1e1e" : "#868e96"}" font-weight="${v === 0 ? 700 : 400}">${say(v)}</text>`);
  for (const s of sets)
    for (const e of [s.lo, s.hi])
      if (e) out.push(`<circle cx="${X(e.v)}" cy="${y}" r="6.5" fill="${e.closed ? "#2f9e44" : "#fff"}" stroke="#2f9e44" stroke-width="2.5"/>`);
  return { body: out.join(""), w: (hi - lo) * U + 2 * PAD, h: y + 34 };
}
