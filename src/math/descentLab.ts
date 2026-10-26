// Gradient descent by hand, the board's lab: a ball on the curve of f, put where it starts by dragging it, and a
// learning rate η (in one puzzle a momentum β too) set with sliders. Each step moves the ball by −η · f′(x) (with
// momentum, v ← βv − η · f′(x) and x ← x + v), and the step the rate would take next is drawn before it is taken.
// Nine puzzles ask for a rate that reaches the bottom in so many steps, lands on it in one step, jumps past it on the
// way, bounces for ever, suits a steep and then a shallow valley, gets the ball off a hilltop, finds the deeper of two
// valleys, and coasts over a hump with momentum; a try that fails says why (too slow, flew off, still bouncing, the
// other valley, no slope). Free play takes any f(x). Kept free of React so it can be tested on its own.
import { evalE, parseE } from "./expr";
import type { GameBase } from "./ladder";
import { niceStep } from "./scale";
import { nf } from "./text";

export type DescentFn = { text: string; f: (x: number) => number; df: (x: number) => number; view: [number, number] };
export type DescentFnId = "bowl" | "steep" | "shallow" | "hilltop" | "valleys";

export const DESCENT_FNS: Record<DescentFnId, DescentFn> = {
  bowl: { text: "(x − 3)²", f: (x) => (x - 3) ** 2, df: (x) => 2 * (x - 3), view: [-1.5, 7.5] },
  steep: { text: "4(x − 1)²", f: (x) => 4 * (x - 1) ** 2, df: (x) => 8 * (x - 1), view: [-3, 5] },
  shallow: { text: "(x + 1)² / 10", f: (x) => (x + 1) ** 2 / 10, df: (x) => (x + 1) / 5, view: [-4, 8] },
  hilltop: { text: "x⁴/4 − x²", f: (x) => x ** 4 / 4 - x ** 2, df: (x) => x ** 3 - 2 * x, view: [-2.6, 2.6] },
  valleys: { text: "x⁴ − 3x² + x", f: (x) => x ** 4 - 3 * x ** 2 + x, df: (x) => 4 * x ** 3 - 6 * x + 1, view: [-2.2, 2.4] },
};

/** The bottom of the deeper of the two valleys of x⁴ − 3x² + x (the other is at 1.1309). */
export const DEEP_VALLEY = -1.3008395659415772;

/** What a puzzle asks: to settle at the bottom within `max` steps (`bounce`: jumping past it at least twice on the
 * way), to land within `tol` of it in one step, or to bounce across it for `steps` steps without settling or flying
 * off. */
export type DescentGoal =
  | { kind: "reach"; max: number; tol: number }
  | { kind: "oneStep"; tol: number }
  | { kind: "bounce"; max: number; tol: number }
  | { kind: "forever"; steps: number };

/** A puzzle: the function, where the ball starts and the rate it starts with, the bottoms that count, what is asked,
 * and whether the start can be dragged, the rate is fixed, and momentum can be set. */
export type DescentPuzzle = { fn: DescentFnId; start: number; eta: number; targets: number[]; goal: DescentGoal; drag?: boolean; fixedEta?: boolean; momentum?: boolean };

export const DESCENT_LADDER: DescentPuzzle[] = [
  { fn: "bowl", start: 0, eta: 0.05, targets: [3], goal: { kind: "reach", max: 10, tol: 0.05 } },
  { fn: "bowl", start: 0, eta: 0.2, targets: [3], goal: { kind: "oneStep", tol: 0.1 } },
  { fn: "bowl", start: 0, eta: 0.3, targets: [3], goal: { kind: "bounce", max: 15, tol: 0.05 } },
  { fn: "bowl", start: 0, eta: 0.7, targets: [3], goal: { kind: "forever", steps: 12 } },
  { fn: "steep", start: -2, eta: 0.4, targets: [1], goal: { kind: "reach", max: 10, tol: 0.05 } },
  { fn: "shallow", start: 6, eta: 0.3, targets: [-1], goal: { kind: "reach", max: 10, tol: 0.05 } },
  { fn: "hilltop", start: 0, eta: 0.1, targets: [-Math.SQRT2, Math.SQRT2], drag: true, goal: { kind: "reach", max: 30, tol: 0.05 } },
  { fn: "valleys", start: 1.5, eta: 0.05, targets: [DEEP_VALLEY], drag: true, goal: { kind: "reach", max: 30, tol: 0.05 } },
  { fn: "valleys", start: 2, eta: 0.01, targets: [DEEP_VALLEY], fixedEta: true, momentum: true, goal: { kind: "reach", max: 100, tol: 0.05 } },
];

/** The learning rates the slider stops at: two significant figures, from 0.001 to 10. */
export const ETAS: number[] = [...[-3, -2, -1, 0].flatMap((e) => Array.from({ length: 90 }, (_, i) => Number(((10 + i) * 10 ** (e - 1)).toPrecision(2)))), 10];
/** The stop of the slider nearest a rate, on a log scale. */
export const etaIndex = (eta: number) => ETAS.reduce((best, v, i) => (Math.abs(Math.log(v / eta)) < Math.abs(Math.log(ETAS[best] / eta)) ? i : best), 0);
export const BETAS: number[] = Array.from({ length: 20 }, (_, i) => i / 20);

/** Far enough away to say the ball has flown off. */
const AWAY = 1e6;

/** The ball's positions from x₀, one per step: x ← x − η · f′(x), or with momentum v ← βv − η · f′(x), x ← x + v. It
 * stops early, with `away` set, once the ball has flown off. */
export function descentPath(df: (x: number) => number, x0: number, eta: number, beta: number, n: number): { xs: number[]; away: boolean } {
  const xs = [x0];
  let [x, v] = [x0, 0];
  for (let i = 0; i < n; i++) {
    v = beta * v - eta * df(x);
    x += v;
    if (!Number.isFinite(x) || Math.abs(x) > AWAY) return { xs, away: true };
    xs.push(x);
  }
  return { xs, away: false };
}

export type DescentSlip = "slow" | "blowUp" | "bouncing" | "local" | "flat" | "short" | "long" | "noCross" | "fades" | "grows";
/** A try so far: still going, done in `steps` steps, or failed and why (with where the ball is and the bottom). */
export type DescentVerdict = { state: "going" } | { state: "won"; steps: number } | { state: "lost"; why: DescentSlip; x: number; target: number };

/** How many steps a try has before it is judged. */
export const budgetOf = (g: DescentGoal) => (g.kind === "oneStep" ? 1 : g.kind === "forever" ? g.steps : g.max);
const nearest = (ts: number[], x: number) => ts.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
/** How often the ball jumps from one side of t to the other. */
const crossings = (xs: number[], t: number) => xs.slice(1).filter((x, i) => (x - t) * (xs[i] - t) < 0).length;
/** The first step from which the ball stays within `tol` of where it ends up, or −1 if it never settles. */
function settledFrom(xs: number[], tol: number): number {
  const end = xs[xs.length - 1];
  let i = xs.length;
  while (i > 0 && Math.abs(xs[i - 1] - end) <= tol) i--;
  return i < xs.length - 50 ? i : -1;
}

/** Where a try stands after k steps from `start`, judged against the puzzle. The path is followed well past the
 * budget to tell a ball that has settled from one still on its way. */
export function judge(p: DescentPuzzle, start: number, eta: number, beta: number, k: number): DescentVerdict {
  const { df } = DESCENT_FNS[p.fn];
  const g = p.goal;
  const budget = budgetOf(g);
  const { xs, away } = descentPath(df, start, eta, beta, budget + 400);
  const at = (i: number) => xs[Math.min(i, xs.length - 1)];
  const t = nearest(p.targets, at(k));
  const lost = (why: DescentSlip): DescentVerdict => ({ state: "lost", why, x: at(k), target: t });
  if (k === 0) return { state: "going" };
  if (g.kind === "oneStep") {
    const t0 = nearest(p.targets, start);
    if (Math.abs(at(1) - t0) <= g.tol) return { state: "won", steps: 1 };
    return { state: "lost", why: xs.length > 1 && (at(1) - t0) * (start - t0) > 0 ? "short" : "long", x: at(1), target: t0 };
  }
  if (away && k >= xs.length - 1) return lost(g.kind === "forever" ? "grows" : "blowUp");
  if (g.kind === "forever") {
    if (k < g.steps) return { state: "going" };
    const t0 = nearest(p.targets, start);
    const r = Math.abs(at(g.steps) - t0) / Math.abs(start - t0);
    if (crossings(xs.slice(0, g.steps + 1), t0) === g.steps && r >= 0.7 && r <= 1.4) return { state: "won", steps: g.steps };
    return lost(r > 1.4 ? "grows" : "fades");
  }
  // reach and bounce: done once the ball has settled at a bottom, within the budget.
  const s = away ? -1 : settledFrom(xs, g.tol);
  const end = xs[xs.length - 1];
  const home = s >= 0 && p.targets.some((b) => Math.abs(end - b) <= g.tol);
  if (home && s <= budget) {
    if (k < s) return { state: "going" };
    if (g.kind === "bounce" && crossings(xs.slice(0, s + 1), nearest(p.targets, end)) < 2) return lost("noCross");
    return { state: "won", steps: s };
  }
  // Settled where the slope is 0 but not at a bottom that counts: said as soon as the ball stops there.
  const stuck = settledFrom(xs, g.tol / 5);
  if (stuck >= 0 && stuck <= k && !home) return lost(Math.abs(df(start)) < 1e-9 ? "flat" : "local");
  if (k < budget) return { state: "going" };
  if (away) return lost("blowUp");
  return lost(crossings(xs.slice(0, budget + 1), t) >= 4 ? "bouncing" : "slow");
}

/** Stars: done at the first try three, at the second two, else one. */
export const descentStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);

export type DescentNotice = "blewUp" | "oneStep" | "edge" | "flat" | "local" | "momentum";
export const DESCENT_NOTICES: DescentNotice[] = ["blewUp", "oneStep", "edge", "flat", "local", "momentum"];
/** What a try shows: a rate so large the ball flies off, η = 1/f″, η = 2/f″, no slope on a hilltop, gradient descent
 * stopping in the nearer valley, momentum carrying the ball over a hump. */
export function descentNotice(p: DescentPuzzle | null, v: DescentVerdict): DescentNotice | null {
  if (v.state === "lost") return v.why === "blowUp" || v.why === "grows" ? "blewUp" : v.why === "flat" ? "flat" : v.why === "local" ? "local" : null;
  if (v.state !== "won" || !p) return null;
  if (p.goal.kind === "oneStep") return "oneStep";
  if (p.goal.kind === "forever") return "edge";
  return p.momentum ? "momentum" : null;
}

/** The game's state: the shared shape (no endless run: free play instead), what the ball and the dials are at, and the try. */
export type LiveDescent = GameBase<DescentNotice, { kind: "wrong"; why: DescentSlip; notice?: DescentNotice }> & {
  mode: "puzzle" | "free";
  /** Free play's function of x. */
  expr: string;
  start: number;
  eta: number;
  beta: number;
  /** Steps taken in this try, tries that failed on this puzzle, whether it is done. */
  steps: number;
  tries: number;
  done: boolean;
};

export const DESCENT_START: LiveDescent = { mode: "puzzle", stage: 0, expr: "x^4 - 3x^2 + x", start: 0, eta: DESCENT_LADDER[0].eta, beta: 0, steps: 0, tries: 0, done: false, said: null };
/** Free play's view, and the most steps a free try takes. */
export const FREE_VIEW: [number, number] = [-3, 3];
export const FREE_STEPS = 200;

/** A function typed in free play, with its slope by a central difference; null when it cannot be read or has no
 * value across most of the view. */
export function freeFn(expr: string): DescentFn | null {
  try {
    const e = parseE(expr);
    const f = (x: number) => evalE(e, x);
    const df = (x: number) => {
      const h = 1e-5 * Math.max(1, Math.abs(x));
      return (f(x + h) - f(x - h)) / (2 * h);
    };
    const [a, b] = FREE_VIEW;
    const ok = Array.from({ length: 41 }, (_, i) => f(a + ((b - a) * i) / 40)).filter(Number.isFinite).length;
    return ok > 30 ? { text: expr, f, df, view: FREE_VIEW } : null;
  } catch {
    return null;
  }
}

/** The puzzle being played, or null in free play. */
export const descentPuzzle = (d: Pick<LiveDescent, "mode" | "stage">) => (d.mode === "puzzle" ? DESCENT_LADDER[d.stage] : null);

// ---------- the picture ----------

export const PLOT = { w: 620, h: 310, left: 40, right: 14, top: 30, bottom: 26 };
const ORANGE = "#e8590c";
const PURPLE = "#9c36b5";
const GREEN = "#2f9e44";
const r2 = (v: number) => Math.round(v * 100) / 100;

/** From the function's values to the page and back: x across the view, y from a little under the lowest value to a
 * little over the highest (the highest left out when it is far above the rest, as a typed function's can be). */
export function plotScale(fn: DescentFn) {
  const [x0, x1] = fn.view;
  const ys = Array.from({ length: 241 }, (_, i) => fn.f(x0 + ((x1 - x0) * i) / 240)).filter(Number.isFinite).sort((a, b) => a - b);
  const lo = ys[0];
  const hi = Math.min(ys[ys.length - 1], lo + 4 * (ys[Math.floor(ys.length * 0.8)] - lo || 1));
  const pad = (hi - lo || 1) * 0.08;
  const [y0, y1] = [lo - pad, hi + pad];
  const W = PLOT.w - PLOT.left - PLOT.right;
  const H = PLOT.h - PLOT.top - PLOT.bottom;
  return {
    x0, x1, y0, y1,
    X: (x: number) => PLOT.left + ((x - x0) / (x1 - x0)) * W,
    Y: (y: number) => PLOT.top + ((y1 - y) / (y1 - y0)) * H,
    /** From a point of the page back to x. */
    toX: (px: number) => x0 + ((px - PLOT.left) / W) * (x1 - x0),
  };
}

/**
 * The curve with its bottoms flagged, the ball at the last of `xs` with the tangent there, the steps taken as hops
 * along the curve, and `next`, where the next step would put it, as a dashed hop. A ball off the view is drawn at its
 * edge with an arrow.
 */
export function descentSvg(fn: DescentFn, xs: number[], o: { next?: number | null; targets?: number[]; away?: boolean; drag?: boolean } = {}): string {
  const s = plotScale(fn);
  const { X, Y, x0, x1, y0, y1 } = s;
  const inside = (x: number) => x >= x0 && x <= x1;
  const P = (x: number): [number, number] => {
    const cx = Math.min(x1, Math.max(x0, x));
    return [X(cx), Math.min(PLOT.h - PLOT.bottom, Math.max(PLOT.top, Y(fn.f(cx))))];
  };
  let body = `<clipPath id="descent-clip"><rect x="${PLOT.left}" y="${PLOT.top}" width="${PLOT.w - PLOT.left - PLOT.right}" height="${PLOT.h - PLOT.top - PLOT.bottom}"/></clipPath>`;
  // Grid and axes.
  const [sx, sy] = [niceStep(x1 - x0, 10), niceStep(y1 - y0, 6)];
  for (let x = Math.ceil(x0 / sx) * sx; x <= x1 + 1e-9; x += sx)
    body += `<line x1="${r2(X(x))}" y1="${PLOT.top}" x2="${r2(X(x))}" y2="${PLOT.h - PLOT.bottom}" stroke="#f1f3f5"/><text x="${r2(X(x))}" y="${PLOT.h - 8}" font-size="11" fill="#868e96" text-anchor="middle">${nf(x, 3).replace("-", "−")}</text>`;
  for (let y = Math.ceil(y0 / sy) * sy; y <= y1 + 1e-9; y += sy)
    body += `<line x1="${PLOT.left}" y1="${r2(Y(y))}" x2="${PLOT.w - PLOT.right}" y2="${r2(Y(y))}" stroke="#f1f3f5"/><text x="${PLOT.left - 5}" y="${r2(Y(y) + 4)}" font-size="11" fill="#868e96" text-anchor="end">${nf(y, 3).replace("-", "−")}</text>`;
  if (y0 < 0 && y1 > 0) body += `<line x1="${PLOT.left}" y1="${r2(Y(0))}" x2="${PLOT.w - PLOT.right}" y2="${r2(Y(0))}" stroke="#adb5bd"/>`;
  // The curve, in pieces where it has a value.
  let d = "";
  let pen = false;
  for (let i = 0; i <= 400; i++) {
    const x = x0 + ((x1 - x0) * i) / 400;
    const y = fn.f(x);
    if (!Number.isFinite(y)) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${r2(X(x))},${r2(Math.min(PLOT.h * 4, Math.max(-PLOT.h * 3, Y(y))))}`;
    pen = true;
  }
  body += `<path d="${d}" clip-path="url(#descent-clip)" fill="none" stroke="#1971c2" stroke-width="3"/>`;
  for (const t of o.targets ?? []) {
    const [tx, ty] = P(t);
    body += `<line x1="${r2(tx)}" y1="${r2(ty)}" x2="${r2(tx)}" y2="${r2(ty - 30)}" stroke="${GREEN}" stroke-width="2"/><path d="M${r2(tx)},${r2(ty - 30)}l14,5l-14,5z" fill="${GREEN}"/>`;
  }
  // A hop from one place on the curve to the next, arching over the gap between them.
  const hop = (a: number, b: number, color: string, extra: string) => {
    const [p, q] = [P(a), P(b)];
    const lift = 16 + 0.15 * Math.hypot(q[0] - p[0], q[1] - p[1]);
    const [mx, my] = [(p[0] + q[0]) / 2, Math.min(p[1], q[1]) - lift];
    return `<path d="M${r2(p[0])},${r2(p[1])}Q${r2(mx)},${r2(my)} ${r2(q[0])},${r2(q[1])}" fill="none" stroke="${color}" ${extra}/>`;
  };
  const last = xs[xs.length - 1];
  xs.slice(0, -1).forEach((x, i) => {
    body += hop(x, xs[i + 1], ORANGE, `stroke-width="2" opacity="0.55"`);
    const [px, py] = P(x);
    body += i === 0 ? `<circle cx="${r2(px)}" cy="${r2(py)}" r="7" fill="#fff" stroke="${ORANGE}" stroke-width="2"/>` : `<circle cx="${r2(px)}" cy="${r2(py)}" r="3.5" fill="${ORANGE}" opacity="0.6"/>`;
  });
  if (o.next !== undefined && o.next !== null && Number.isFinite(o.next) && !o.away) body += hop(last, o.next, PURPLE, `stroke-width="2.4" stroke-dasharray="6 4"`) + `<circle cx="${r2(P(o.next)[0])}" cy="${r2(P(o.next)[1])}" r="5" fill="none" stroke="${PURPLE}" stroke-width="2"/>`;
  const [bx, by] = P(last);
  if (inside(last) && !o.away) {
    // The tangent: the slope the step is worked out from.
    const k = (fn.df(last) * (Y(0) - Y(1))) / (X(1) - X(0));
    const [ux, uy] = [1 / Math.hypot(1, k), -k / Math.hypot(1, k)];
    body += `<line x1="${r2(bx - 48 * ux)}" y1="${r2(by - 48 * uy)}" x2="${r2(bx + 48 * ux)}" y2="${r2(by + 48 * uy)}" stroke="${GREEN}" stroke-width="2.4" stroke-linecap="round"/>`;
    if (o.drag) body += `<circle cx="${r2(bx)}" cy="${r2(by)}" r="17" fill="none" stroke="${ORANGE}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    body += `<circle cx="${r2(bx)}" cy="${r2(by)}" r="10" fill="${ORANGE}" stroke="#1e1e1e" stroke-width="1.5"/>`;
  } else {
    // Off the view: the ball at the edge it left by, with an arrow pointing on.
    const right = o.away ? (xs.length > 1 ? last > xs[xs.length - 2] : true) : last > x1;
    const ex = right ? PLOT.w - PLOT.right - 14 : PLOT.left + 14;
    body += `<circle cx="${r2(ex)}" cy="${PLOT.top + 20}" r="10" fill="${ORANGE}" stroke="#1e1e1e" stroke-width="1.5"/><text x="${r2(ex + (right ? -16 : 16))}" y="${PLOT.top + 25}" font-size="16" font-weight="700" fill="${ORANGE}" text-anchor="${right ? "end" : "start"}">${right ? "→" : "←"}</text>`;
  }
  return body;
}

/** A number for the readout: up to three decimals with a minus sign, powers of ten for very large ones, and 0 for what
 * is left of a slope or a step once the ball has settled. */
export const num = (v: number) => (Math.abs(v) < 5e-4 ? "0" : nf(v, 3).replace(/^-/, "−").replace("e-", "e−"));
