// PCA by hand, the board's lab: a cloud of points and a line through it, turned by dragging its ends (and in one
// puzzle moved by its middle). Each point's distance from the line is drawn with the square on it, so the error, the
// mean of those squares, is what is left over when the cloud is squashed onto the line; the spread of the points'
// shadows on the line is what is kept, and the two add up to the cloud's whole spread (Pythagoras). Eight puzzles ask
// for the line with the least error (PC1), the widest shadows (the same line), the most error (PC2), the best line
// when it can also move (through the mean), the best line for errors measured straight up (least squares, flatter
// than PC1), a point dragged until PC1 stands upright (an outlier's pull), a point's shadow found on PC1 (its score),
// and points dragged until PC1 keeps 95 % (one number per point is enough). Free play takes any points. Kept free of
// React so it can be tested on its own.
import { nf } from "./text";
import type { GameBase } from "./ladder";

export type Pt = [number, number];
/** How a point's distance from the line is measured: at right angles to it (PCA), or straight up (least squares). */
export type ErrorKind = "perp" | "vertical";

/** What a puzzle asks: for the line with the least error, the widest spread of shadows or the most error (within a
 * hundredth of the cloud's spread of the best); for a point dragged until PC1 is within `tol`° of upright; for the
 * place of point `point`'s shadow along PC1, within `tol`; or for points dragged until PC1 keeps `share` of the
 * spread. */
export type PcaGoal =
  | { kind: "least" }
  | { kind: "most" }
  | { kind: "worst" }
  | { kind: "upright"; tol: number }
  | { kind: "score"; point: number; tol: number }
  | { kind: "keep"; share: number };

export type PcaNotice = "pc1" | "pythagoras" | "pc2" | "mean" | "regression" | "outlier" | "score" | "reduce";
export const PCA_NOTICES: PcaNotice[] = ["pc1", "pythagoras", "pc2", "mean", "regression", "outlier", "score", "reduce"];

/** A puzzle: the points, the line's angle (in degrees, from the x-axis) and, when it can be moved, where its middle
 * starts; how errors are measured; which points can be dragged and which one is marked; where the shadow's mark starts;
 * whether the mean is hidden until it is done; and what doing it shows. */
export type PcaPuzzle = {
  pts: Pt[];
  goal: PcaGoal;
  angle: number;
  c?: Pt;
  errors?: ErrorKind;
  drag?: number[];
  special?: number;
  mark?: number;
  hideMean?: boolean;
  notice: PcaNotice;
};

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
/** An angle of a line, from 0° up to 180°. */
export const lineAngle = (a: number) => ((a % 180) + 180) % 180;
const round2 = (v: number) => Math.round(v * 100) / 100;

/** A cloud: offsets (along, across) from the middle (cx, cy), turned by `angle`°. */
const cloud = (angle: number, cx: number, cy: number, offsets: Pt[]): Pt[] => {
  const [c, s] = [Math.cos(rad(angle)), Math.sin(rad(angle))];
  return offsets.map(([a, b]) => [round2(cx + a * c - b * s), round2(cy + a * s + b * c)]);
};
const LONG: Pt[] = [[-3.2, 0.4], [-2.5, -0.6], [-1.8, 0.2], [-1.1, 0.7], [-0.6, -0.5], [0, 0.1], [0.5, 0.6], [1, -0.4], [1.6, 0.3], [2.2, -0.7], [2.7, 0.5], [3.3, -0.2]];
const WIDE: Pt[] = [[-3, 0.9], [-2.4, -1.4], [-1.7, 0.4], [-1, 1.5], [-0.5, -1.1], [0, 0.3], [0.4, 1.3], [0.9, -1.5], [1.5, 0.6], [2.1, -1.2], [2.6, 1.1], [3.1, -0.3]];
const FLAT: Pt[] = [[-1.5, 0.2], [-1.1, -0.3], [-0.6, 0.25], [-0.2, -0.15], [0.3, 0.3], [0.7, -0.25], [1.1, 0.1], [1.5, -0.2]];

export const PCA_LADDER: PcaPuzzle[] = [
  { pts: cloud(30, 0, 0, LONG), angle: 105, goal: { kind: "least" }, notice: "pc1" },
  { pts: cloud(-40, 0.3, -0.2, LONG), angle: 15, goal: { kind: "most" }, notice: "pythagoras" },
  { pts: cloud(65, -0.2, 0.3, LONG), angle: 70, goal: { kind: "worst" }, notice: "pc2" },
  { pts: cloud(20, 0.8, 0.6, LONG), angle: 0, c: [-2.5, 3], goal: { kind: "least" }, hideMean: true, notice: "mean" },
  { pts: cloud(45, 0, 0, WIDE), angle: 65, errors: "vertical", goal: { kind: "least" }, notice: "regression" },
  { pts: [...cloud(0, 0, -1.5, FLAT), [2.4, -0.6]], angle: 0, drag: [8], special: 8, goal: { kind: "upright", tol: 8 }, notice: "outlier" },
  { pts: cloud(25, 0, 0, LONG), angle: 0, special: 9, mark: -3, goal: { kind: "score", point: 9, tol: 0.15 }, notice: "score" },
  { pts: [[-2, -1.5], [1.8, -1.2], [0.3, 2.2], [-1.6, 1.4], [2.2, 1], [-0.4, -2.4]], angle: 0, drag: [0, 1, 2, 3, 4, 5], goal: { kind: "keep", share: 0.95 }, notice: "reduce" },
];

/** How close to the best a line has to be: a hundredth of the cloud's whole spread. */
export const TOL = 0.01;
/** The view, −5 to 5 both ways, and how far in points and the line's middle are kept. */
export const VIEW = 5;
export const KEEP_IN = 4.8;

export type Moments = { n: number; m: Pt; sxx: number; syy: number; sxy: number };
/** The mean and the spreads about it (divided by n). */
export function moments(ps: Pt[]): Moments {
  const n = ps.length;
  const m: Pt = [ps.reduce((s, p) => s + p[0], 0) / n, ps.reduce((s, p) => s + p[1], 0) / n];
  let [sxx, syy, sxy] = [0, 0, 0];
  for (const [x, y] of ps) {
    sxx += (x - m[0]) ** 2;
    syy += (y - m[1]) ** 2;
    sxy += (x - m[0]) * (y - m[1]);
  }
  return { n, m, sxx: sxx / n, syy: syy / n, sxy: sxy / n };
}

/** The covariance matrix's eigenvalues λ₁ ≥ λ₂ and the angle of PC1, its first eigenvector. */
export function principal(mo: Moments): { l1: number; l2: number; angle: number } {
  const h = (mo.sxx + mo.syy) / 2;
  const r = Math.hypot((mo.sxx - mo.syy) / 2, mo.sxy);
  return { l1: h + r, l2: h - r, angle: lineAngle(deg(Math.atan2(2 * mo.sxy, mo.sxx - mo.syy) / 2)) };
}

/** The whole spread: the mean squared distance from the mean, sxx + syy. */
export const totalSpread = (mo: Moments) => mo.sxx + mo.syy;
const dir = (angle: number): Pt => [Math.cos(rad(angle)), Math.sin(rad(angle))];

/** The error of a line through c at `angle`°: the mean of the squared distances, at right angles or straight up. */
export function lineError(ps: Pt[], c: Pt, angle: number, kind: ErrorKind): number {
  const [ux, uy] = dir(angle);
  if (kind === "vertical" && Math.abs(ux) < 1e-9) return Infinity;
  return ps.reduce((s, [x, y]) => s + (kind === "perp" ? -(x - c[0]) * uy + (y - c[1]) * ux : y - c[1] - (uy / ux) * (x - c[0])) ** 2, 0) / ps.length;
}
/** The spread of the shadows on a line at `angle`°: the mean squared distance of the shadows from their own mean. */
export function shadowSpread(mo: Moments, angle: number): number {
  const [ux, uy] = dir(angle);
  return ux * ux * mo.sxx + 2 * ux * uy * mo.sxy + uy * uy * mo.syy;
}
/** The least error any line has, and its angle: PC1 at right angles (error λ₂), least squares straight up. */
export function bestLine(mo: Moments, kind: ErrorKind): { error: number; angle: number } {
  if (kind === "perp") {
    const { l2, angle } = principal(mo);
    return { error: l2, angle };
  }
  if (mo.sxx < 1e-12) return { error: mo.syy, angle: 0 };
  return { error: mo.syy - mo.sxy ** 2 / mo.sxx, angle: lineAngle(deg(Math.atan(mo.sxy / mo.sxx))) };
}
/** A point's score on PC1: where its shadow falls along PC1, from the mean. */
export function pc1Score(ps: Pt[], i: number): number {
  const mo = moments(ps);
  const [ux, uy] = dir(principal(mo).angle);
  return (ps[i][0] - mo.m[0]) * ux + (ps[i][1] - mo.m[1]) * uy;
}

/** Whether a puzzle's line is the player's (turned and moved by hand) or PC1 (worked out from the points). */
export const ownLine = (p: PcaPuzzle | null) => !p || p.goal.kind === "least" || p.goal.kind === "most" || p.goal.kind === "worst";

export type PcaSlip = "least" | "offMean" | "most" | "worst" | "upright" | "score" | "keep";
/** A try: done, or wrong and why, with what it had and what was wanted. */
export type PcaVerdict = { state: "won" } | { state: "lost"; why: PcaSlip; have: number; want: number };
export type PcaTry = { pts: Pt[]; angle: number; c: Pt; mark: number };

export function judgePca(p: PcaPuzzle, t: PcaTry): PcaVerdict {
  const mo = moments(t.pts);
  const tol = TOL * totalSpread(mo);
  const { l1, l2, angle: a1 } = principal(mo);
  const g = p.goal;
  const lost = (why: PcaSlip, have: number, want: number): PcaVerdict => ({ state: "lost", why, have, want });
  if (g.kind === "least") {
    const kind = p.errors ?? "perp";
    const err = lineError(t.pts, t.c, t.angle, kind);
    const best = bestLine(mo, kind).error;
    if (err <= best + tol) return { state: "won" };
    // Off the mean: the line's distance from the mean, squared, is most of the extra error.
    const off = lineError([mo.m], t.c, t.angle, "perp");
    return lost(p.c && off > (err - best) / 2 ? "offMean" : "least", err, best);
  }
  if (g.kind === "most") {
    const kept = shadowSpread(mo, t.angle);
    return kept >= l1 - tol ? { state: "won" } : lost("most", kept, l1);
  }
  if (g.kind === "worst") {
    const err = lineError(t.pts, t.c, t.angle, "perp");
    return err >= l1 - tol ? { state: "won" } : lost("worst", err, l1);
  }
  if (g.kind === "upright") return Math.abs(a1 - 90) <= g.tol ? { state: "won" } : lost("upright", a1, 90);
  if (g.kind === "score") {
    const s = pc1Score(t.pts, g.point);
    return Math.abs(t.mark - s) <= g.tol ? { state: "won" } : lost("score", t.mark, s);
  }
  const share = l1 / (l1 + l2 || 1);
  return share >= g.share ? { state: "won" } : lost("keep", share, g.share);
}

/** Stars: done at the first try three, at the second two, else one. */
export const pcaStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);

export type LivePca = GameBase<PcaNotice, { kind: "wrong"; why: PcaSlip }> & {
  mode: "puzzle" | "free";
  pts: Pt[];
  /** The player's line: its angle in degrees and its middle. */
  angle: number;
  c: Pt;
  /** Where the shadow's mark is along PC1, in the score puzzle. */
  mark: number;
  /** Free play's choices: how errors are measured, and whether PC1 is drawn. */
  errors: ErrorKind;
  showBest: boolean;
  /** Tries that failed on this puzzle, and whether it is done. */
  tries: number;
  done: boolean;
};

/** Free play's cloud. */
export const FREE_PTS: Pt[] = cloud(-25, 0, 0, WIDE.slice(0, 9));

/** Where a try at a puzzle (or at free play) starts. */
export function pcaStart(p: PcaPuzzle | null): Pick<LivePca, "pts" | "angle" | "c" | "mark"> {
  const pts = (p?.pts ?? FREE_PTS).map((q): Pt => [q[0], q[1]]);
  const { m } = moments(pts);
  return { pts, angle: p?.angle ?? 0, c: p?.c ? [p.c[0], p.c[1]] : [round2(m[0]), round2(m[1])], mark: p?.mark ?? 0 };
}

export const PCA_START: LivePca = { mode: "puzzle", stage: 0, ...pcaStart(PCA_LADDER[0]), errors: "perp", showBest: false, tries: 0, done: false, said: null };

/** The puzzle being played, or null in free play. */
export const pcaPuzzle = (d: Pick<LivePca, "mode" | "stage">) => (d.mode === "puzzle" ? PCA_LADDER[d.stage] : null);

/** The line drawn and judged: the player's, or PC1 through the mean. */
export function mainLine(p: PcaPuzzle | null, d: Pick<LivePca, "pts" | "angle" | "c">): { c: Pt; angle: number } {
  if (ownLine(p) || d.pts.length < 2) return { c: d.c, angle: d.angle };
  const mo = moments(d.pts);
  return { c: mo.m, angle: principal(mo).angle };
}

// ---------- the picture ----------

export const PCA_PLOT = { w: 620, h: 404, left: 12, top: 12, size: 380 };
const BLUE = "#1971c2";
const RED = "#e03131";
const PURPLE = "#9c36b5";
const GREEN = "#2f9e44";
const ORANGE = "#e8590c";
const GREY = "#868e96";
const r2 = (v: number) => Math.round(v * 100) / 100;

/** From the cloud's coordinates to the page and back. */
export const toPage = ([x, y]: Pt): Pt => [PCA_PLOT.left + ((x + VIEW) / (2 * VIEW)) * PCA_PLOT.size, PCA_PLOT.top + ((VIEW - y) / (2 * VIEW)) * PCA_PLOT.size];
export const fromPage = ([px, py]: Pt): Pt => [((px - PCA_PLOT.left) / PCA_PLOT.size) * 2 * VIEW - VIEW, VIEW - ((py - PCA_PLOT.top) / PCA_PLOT.size) * 2 * VIEW];

/** Where a line through c along u enters and leaves the square ±lim, as distances along u; null if it misses it. */
export function clipLine(c: Pt, u: Pt, lim = VIEW): [number, number] | null {
  let [t0, t1] = [-Infinity, Infinity];
  for (const k of [0, 1]) {
    if (Math.abs(u[k]) < 1e-12) {
      if (Math.abs(c[k]) > lim) return null;
      continue;
    }
    const [a, b] = [(-lim - c[k]) / u[k], (lim - c[k]) / u[k]];
    [t0, t1] = [Math.max(t0, Math.min(a, b)), Math.min(t1, Math.max(a, b))];
  }
  return t0 < t1 ? [t0, t1] : null;
}

/** Where the handles that turn the line are: near its ends, inside the view. */
export function handles(c: Pt, angle: number): Pt[] {
  const u = dir(angle);
  const [t0, t1] = clipLine(c, u, VIEW - 0.45) ?? [-3, 3];
  return [Math.max(t0, -3.8), Math.min(t1, 3.8)].map((t): Pt => [c[0] + t * u[0], c[1] + t * u[1]]);
}

/** The foot of a point on the line: at right angles, or straight below or above it. */
export function foot(p: Pt, c: Pt, angle: number, kind: ErrorKind): Pt {
  const [ux, uy] = dir(angle);
  if (kind === "vertical") return [p[0], c[1] + (uy / ux) * (p[0] - c[0])];
  const t = (p[0] - c[0]) * ux + (p[1] - c[1]) * uy;
  return [c[0] + t * ux, c[1] + t * uy];
}

export type PcaWords = { total: string; kept: string; lost: string; pc1: string; pc2: string; ls: string };

/**
 * The picture: on the left the cloud with the line, each point's distance from it and the square on that distance,
 * the shadows on the line and the mean; once done (or asked for in free play) the best line dashed, with PC2 or the
 * other kind of best line faint beside it; in the score puzzle, the steps along PC1 and the mark. On the right the
 * spreads as bars: the whole spread, and the kept and lost spreads end to end, which reach it exactly when the line
 * goes through the mean.
 */
export function pcaSvg(
  d: Pick<LivePca, "pts" | "mark">,
  line: { c: Pt; angle: number },
  o: { errors: ErrorKind; best: boolean; drag?: number[] | "all"; special?: number; hideMean?: boolean; score?: boolean; move?: boolean; own?: boolean; words: PcaWords },
): string {
  const { left, top, size } = PCA_PLOT;
  const P = (p: Pt) => toPage(p).map(r2).join(",");
  const at = (p: Pt) => toPage(p).map(r2);
  let body = `<clipPath id="pca-clip"><rect x="${left}" y="${top}" width="${size}" height="${size}"/></clipPath>`;
  body += `<rect x="${left}" y="${top}" width="${size}" height="${size}" fill="#fff" stroke="#dee2e6"/>`;
  for (let k = -4; k <= 4; k++) {
    const [gx] = at([k, 0]);
    const [, gy] = at([0, k]);
    const stroke = k === 0 ? "#ced4da" : "#f1f3f5";
    body += `<line x1="${gx}" y1="${top}" x2="${gx}" y2="${top + size}" stroke="${stroke}"/><line x1="${left}" y1="${gy}" x2="${left + size}" y2="${gy}" stroke="${stroke}"/>`;
  }
  const u = dir(line.angle);
  const full = (c: Pt, a: number, extra: string) => {
    const v = dir(a);
    const t = clipLine(c, v);
    if (!t) return "";
    return `<line x1="${at([c[0] + t[0] * v[0], c[1] + t[0] * v[1]])[0]}" y1="${at([c[0] + t[0] * v[0], c[1] + t[0] * v[1]])[1]}" x2="${at([c[0] + t[1] * v[0], c[1] + t[1] * v[1]])[0]}" y2="${at([c[0] + t[1] * v[0], c[1] + t[1] * v[1]])[1]}" ${extra}/>`;
  };
  const enough = d.pts.length >= 2;
  const mo = enough ? moments(d.pts) : null;
  // The squares on the distances, then the distances, under everything else.
  let squares = "";
  let sticks = "";
  let shadows = "";
  if (!o.score || o.best) {
    d.pts.forEach((p, i) => {
      if (o.score && i !== o.special) return;
      const f = foot(p, line.c, line.angle, o.errors);
      const r: Pt = [p[0] - f[0], p[1] - f[1]];
      if (!Number.isFinite(f[1])) return;
      const s: Pt = [-r[1], r[0]];
      if (!o.score) squares += `<path d="M${P(p)}L${P(f)}L${P([f[0] + s[0], f[1] + s[1]])}L${P([p[0] + s[0], p[1] + s[1]])}z" fill="${RED}" fill-opacity="0.08" stroke="${RED}" stroke-opacity="0.3"/>`;
      sticks += `<line x1="${at(p)[0]}" y1="${at(p)[1]}" x2="${at(f)[0]}" y2="${at(f)[1]}" stroke="${RED}" stroke-width="1.8"${o.score ? ` stroke-dasharray="4 3"` : ""}/>`;
      if (o.errors === "perp") shadows += `<circle cx="${at(f)[0]}" cy="${at(f)[1]}" r="3" fill="${PURPLE}"/>`;
    });
  }
  body += `<g clip-path="url(#pca-clip)">${squares}`;
  if (o.best && mo) {
    // The best line, and faintly PC2 (or, for errors straight up, PC1 beside least squares).
    const pr = principal(mo);
    const b = bestLine(mo, o.errors);
    body += full(mo.m, o.errors === "perp" ? pr.angle + 90 : pr.angle, `stroke="${GREEN}" stroke-width="1.6" stroke-dasharray="3 5" opacity="0.6"`);
    body += full(mo.m, b.angle, `stroke="${GREEN}" stroke-width="2.6" stroke-dasharray="9 6"`);
  }
  body += full(line.c, line.angle, `stroke="${BLUE}" stroke-width="3"`);
  body += `${sticks}${shadows}</g>`;
  // The best lines' names, drawn last so that nothing covers them.
  let tags = "";
  if (o.best && mo) {
    const pr = principal(mo);
    const b = bestLine(mo, o.errors);
    const tag = (a: number, text: string, faint: boolean) => {
      const v = dir(a);
      const t = clipLine(mo.m, v, VIEW - 0.4);
      if (!t) return "";
      // Near the line's end, kept inside the frame.
      const [x, y] = at([mo.m[0] + t[1] * v[0], mo.m[1] + t[1] * v[1]]);
      const right = x > left + size / 2;
      const [tx, ty] = [right ? Math.min(left + size - 6, x - 12) : Math.max(left + 6, x + 12), Math.min(top + size - 6, Math.max(top + 16, y - 10))];
      return `<text x="${r2(tx)}" y="${r2(ty)}" font-size="13" font-weight="700" fill="${GREEN}" stroke="#fff" stroke-width="3" paint-order="stroke"${faint ? ` opacity="0.7"` : ""} text-anchor="${right ? "end" : "start"}">${text}</text>`;
    };
    tags += tag(b.angle, o.errors === "perp" ? o.words.pc1 : o.words.ls, false);
    tags += tag(o.errors === "perp" ? pr.angle + 90 : pr.angle, o.errors === "perp" ? o.words.pc2 : o.words.pc1, true);
  }
  // The steps along PC1 and the mark, in the score puzzle.
  if (o.score && mo) {
    const n: Pt = [-u[1], u[0]];
    for (let k = -4; k <= 4; k++) {
      const q: Pt = [line.c[0] + k * u[0], line.c[1] + k * u[1]];
      if (Math.max(Math.abs(q[0]), Math.abs(q[1])) > VIEW - 0.2) continue;
      const [a, b] = [at([q[0] + 0.12 * n[0], q[1] + 0.12 * n[1]]), at([q[0] - 0.12 * n[0], q[1] - 0.12 * n[1]])];
      const l = at([q[0] - 0.42 * n[0], q[1] - 0.42 * n[1]]);
      body += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${BLUE}" stroke-width="1.5"/><text x="${l[0]}" y="${r2(l[1] + 4)}" font-size="11" fill="${BLUE}" text-anchor="middle">${String(k).replace("-", "−")}</text>`;
    }
    const [mx, my] = at([line.c[0] + d.mark * u[0], line.c[1] + d.mark * u[1]]);
    body += `<path d="M${mx},${r2(my - 11)}L${r2(mx + 9)},${my}L${mx},${r2(my + 11)}L${r2(mx - 9)},${my}z" fill="${PURPLE}" stroke="#1e1e1e" stroke-width="1.2"/>`;
  }
  // The points, rings round those that can be dragged; the mean.
  d.pts.forEach((p, i) => {
    const [x, y] = at(p);
    const can = o.drag === "all" || o.drag?.includes(i);
    body += `<circle cx="${x}" cy="${y}" r="5" fill="${i === o.special ? ORANGE : "#1e1e1e"}"/>`;
    if (can) body += `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${i === o.special ? ORANGE : GREY}" stroke-width="1.4" stroke-dasharray="3 3"/>`;
  });
  if (mo && !o.hideMean) {
    const [x, y] = at(mo.m);
    body += `<path d="M${r2(x - 7)},${r2(y - 7)}L${r2(x + 7)},${r2(y + 7)}M${r2(x - 7)},${r2(y + 7)}L${r2(x + 7)},${r2(y - 7)}" stroke="${GREEN}" stroke-width="2.4"/>`;
  }
  // The handles of the player's line: its ends turn it, its middle moves it.
  if (o.own) {
    for (const h of handles(line.c, line.angle)) body += `<circle cx="${at(h)[0]}" cy="${at(h)[1]}" r="8" fill="#fff" stroke="${BLUE}" stroke-width="2.5"/>`;
    if (o.move) body += `<rect x="${r2(at(line.c)[0] - 7)}" y="${r2(at(line.c)[1] - 7)}" width="14" height="14" rx="3" fill="${BLUE}" stroke="#fff" stroke-width="1.5"/>`;
  }
  body += tags + spreadBars(d.pts, line, o.errors, o.words);
  return body;
}

/** The bars: the whole spread, and the kept and lost spreads end to end, on a scale where the whole spread is about
 * two thirds of the way across (a lost spread far larger runs off the end with an arrow). */
function spreadBars(pts: Pt[], line: { c: Pt; angle: number }, errors: ErrorKind, w: PcaWords): string {
  if (pts.length < 2) return "";
  const mo = moments(pts);
  const total = totalSpread(mo);
  const kept = errors === "perp" ? shadowSpread(mo, line.angle) : 0;
  const lost = lineError(pts, line.c, line.angle, errors);
  const [x0, width] = [PCA_PLOT.left + PCA_PLOT.size + 26, 172];
  const scale = width / (1.55 * (total || 1));
  const len = (v: number) => r2(Math.min(width, v * scale));
  const row = (y: number, label: string, value: string, color: string) => `<text x="${x0}" y="${y - 6}" font-size="12" fill="${color}" font-weight="700">${label}</text><text x="${x0 + width}" y="${y - 6}" font-size="12" fill="${color}" text-anchor="end">${value}</text>`;
  let s = row(60, w.total, num(total), "#495057");
  s += `<rect x="${x0}" y="64" width="${len(total)}" height="18" fill="#adb5bd"/>`;
  if (errors === "perp") {
    s += row(116, w.kept, `${num(kept)} · ${Math.round((100 * kept) / (total || 1))} %`, PURPLE);
    s += `<rect x="${x0}" y="120" width="${len(kept)}" height="18" fill="${PURPLE}"/>`;
  }
  const from = x0 + len(kept);
  s += row(errors === "perp" ? 160 : 116, w.lost, num(lost), RED);
  s += `<rect x="${r2(from)}" y="120" width="${r2(Math.max(0, Math.min(x0 + width - from, lost * scale)))}" height="18" fill="${RED}" fill-opacity="0.8"/>`;
  if (from + lost * scale > x0 + width) s += `<text x="${x0 + width + 4}" y="134" font-size="14" fill="${RED}">→</text>`;
  // The whole spread's end, down across both bars.
  s += `<line x1="${r2(x0 + len(total))}" y1="60" x2="${r2(x0 + len(total))}" y2="144" stroke="#495057" stroke-width="1.5" stroke-dasharray="3 2"/>`;
  return s;
}

/** A number for the readout: up to two decimals, with a minus sign. */
export const num = (v: number) => (Math.abs(v) < 5e-3 ? "0" : Number.isFinite(v) ? nf(v, 2).replace(/^-/, "−") : "∞");
