// Softmax by hand, the board's lab: a score bar for each class, dragged up and down, and the probabilities softmax
// makes of them beside, pᵢ = e^(zᵢ/T) / Σ e^(zⱼ/T), with a strip that shows them adding up to 1. A temperature T is
// set with a slider, every score can be shifted at once, and with a target class the cross-entropy loss −ln p(target)
// and its gradient p − y, drawn as arrows on the scores, are shown. Eight puzzles ask for one class to win most of the
// probability, for even odds, for a score raised without changing any probability (only differences matter), for one
// class exactly twice as likely as another (a difference of ln 2), for a temperature that sharpens and one that
// flattens, for a loss below 0.1, and for two classes sharing the top. Free play takes two to five classes. Kept free
// of React so it can be tested on its own.
import { nf } from "./text";
import type { GameBase } from "./ladder";

/** softmax(z / T), with the largest score taken off first so that e^z cannot overflow. */
export function softmax(z: number[], T = 1): number[] {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp((v - m) / T));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

/** What a puzzle asks: class i to get at least p; every probability within tol of every other; class i's score up
 * to `to` with no probability changed; p(i) / p(j) within tol of r; the loss below `below`; or classes i and j each
 * to get at least `each`, within 0.02 of each other. */
export type SoftmaxGoal =
  | { kind: "atLeast"; i: number; p: number }
  | { kind: "even"; tol: number }
  | { kind: "shift"; i: number; to: number }
  | { kind: "ratio"; i: number; j: number; r: number; tol: number }
  | { kind: "loss"; below: number }
  | { kind: "pair"; i: number; j: number; each: number };

export type SoftmaxNotice = "share" | "equal" | "shift" | "ratio" | "cold" | "hot" | "loss" | "tie";
export const SOFTMAX_NOTICES: SoftmaxNotice[] = ["share", "equal", "shift", "ratio", "cold", "hot", "loss", "tie"];

/** A puzzle: the scores it starts with, the temperature, the target class, whether the scores are locked (only T
 * moves) or T is, whether every score can be shifted at once, what is asked, and what doing it shows. */
export type SoftmaxPuzzle = { z: number[]; T: number; target?: number; lockZ?: boolean; lockT?: boolean; shift?: boolean; goal: SoftmaxGoal; notice: SoftmaxNotice };

export const SOFTMAX_LADDER: SoftmaxPuzzle[] = [
  { z: [0.5, 1, 0], T: 1, lockT: true, goal: { kind: "atLeast", i: 0, p: 0.8 }, notice: "share" },
  { z: [2, -1, 0.5], T: 1, lockT: true, goal: { kind: "even", tol: 0.02 }, notice: "equal" },
  { z: [2, -1, 0.5], T: 1, lockT: true, shift: true, goal: { kind: "shift", i: 1, to: 1.5 }, notice: "shift" },
  { z: [0, 1, -1], T: 1, lockT: true, goal: { kind: "ratio", i: 0, j: 1, r: 2, tol: 0.1 }, notice: "ratio" },
  { z: [1.5, 1, 0.2], T: 1, lockZ: true, goal: { kind: "atLeast", i: 0, p: 0.95 }, notice: "cold" },
  { z: [1.5, -0.5, 0.5], T: 1, lockZ: true, goal: { kind: "even", tol: 0.1 }, notice: "hot" },
  { z: [1, 0.5, -0.5], T: 1, lockT: true, target: 2, goal: { kind: "loss", below: 0.1 }, notice: "loss" },
  { z: [0.5, 1.5, -1, 0, 1], T: 1, lockT: true, goal: { kind: "pair", i: 0, j: 3, each: 0.45 }, notice: "tie" },
];

/** How far a score goes either way, the step it snaps to, and the step of a shift of every score. */
export const Z_MAX = 5;
export const Z_STEP = 0.1;
export const SHIFT_STEP = 0.5;
/** The temperatures the slider stops at: two significant figures, from 0.1 to 10. */
export const TEMPS: number[] = [...[-1, 0].flatMap((e) => Array.from({ length: 90 }, (_, i) => Number(((10 + i) * 10 ** (e - 1)).toPrecision(2)))), 10];
/** The stop of the slider nearest a temperature, on a log scale. */
export const tempIndex = (T: number) => TEMPS.reduce((best, v, i) => (Math.abs(Math.log(v / T)) < Math.abs(Math.log(TEMPS[best] / T)) ? i : best), 0);

/** A score snapped to the step and kept in range. */
export const snapZ = (v: number) => Math.round(Math.min(Z_MAX, Math.max(-Z_MAX, v)) / Z_STEP) * Z_STEP;
/** Every score shifted by d, or null if one would leave the range. */
export function shifted(z: number[], d: number): number[] | null {
  const out = z.map((v) => Math.round((v + d) * 100) / 100);
  return out.every((v) => Math.abs(v) <= Z_MAX + 1e-9) ? out : null;
}
/** The cross-entropy loss with a target class, −ln p(target), and its gradient with respect to each score, p − y. */
export const crossEntropy = (p: number[], target: number) => -Math.log(p[target]);
export const gradient = (p: number[], target: number) => p.map((v, i) => v - (i === target ? 1 : 0));

export type SoftmaxSlip = "low" | "uneven" | "changed" | "notYet" | "ratio" | "loss" | "pair";
/** A try: done, or wrong and why, with what it had and what was wanted. */
export type SoftmaxVerdict = { state: "won" } | { state: "lost"; why: SoftmaxSlip; have: number; want: number };

export function judgeSoftmax(q: SoftmaxPuzzle, z: number[], T: number): SoftmaxVerdict {
  const p = softmax(z, T);
  const g = q.goal;
  const lost = (why: SoftmaxSlip, have: number, want: number): SoftmaxVerdict => ({ state: "lost", why, have, want });
  if (g.kind === "atLeast") return p[g.i] >= g.p ? { state: "won" } : lost("low", p[g.i], g.p);
  if (g.kind === "even") {
    const spread = Math.max(...p) - Math.min(...p);
    return spread <= g.tol ? { state: "won" } : lost("uneven", spread, g.tol);
  }
  if (g.kind === "shift") {
    const start = softmax(q.z, q.T);
    const moved = Math.max(...p.map((v, i) => Math.abs(v - start[i])));
    if (moved > 0.005) return lost("changed", moved, 0);
    return z[g.i] >= g.to - 1e-9 ? { state: "won" } : lost("notYet", z[g.i], g.to);
  }
  if (g.kind === "ratio") {
    const r = p[g.i] / p[g.j];
    return Math.abs(r - g.r) <= g.tol ? { state: "won" } : lost("ratio", r, g.r);
  }
  if (g.kind === "loss") {
    const L = crossEntropy(p, q.target ?? 0);
    return L <= g.below ? { state: "won" } : lost("loss", L, g.below);
  }
  const ok = p[g.i] >= g.each && p[g.j] >= g.each && Math.abs(p[g.i] - p[g.j]) <= 0.02;
  return ok ? { state: "won" } : lost("pair", Math.min(p[g.i], p[g.j]), g.each);
}

/** Stars: done at the first try three, at the second two, else one. */
export const softmaxStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);

export type LiveSoftmax = GameBase<SoftmaxNotice, { kind: "wrong"; why: SoftmaxSlip }> & {
  mode: "puzzle" | "free";
  z: number[];
  T: number;
  /** Free play's target class, if any. */
  target: number | null;
  /** Tries that failed on this puzzle, and whether it is done. */
  tries: number;
  done: boolean;
};

export const FREE_Z = [2, 1, 0.1];
export const SOFTMAX_START: LiveSoftmax = { mode: "puzzle", stage: 0, z: [...SOFTMAX_LADDER[0].z], T: 1, target: null, tries: 0, done: false, said: null };

/** The puzzle being played, or null in free play. */
export const softmaxPuzzle = (d: Pick<LiveSoftmax, "mode" | "stage">) => (d.mode === "puzzle" ? SOFTMAX_LADDER[d.stage] : null);
/** The target in play: the puzzle's, or free play's. */
export const targetOf = (q: SoftmaxPuzzle | null, d: Pick<LiveSoftmax, "target">) => (q ? (q.target ?? null) : d.target);

// ---------- the picture ----------

export const SM_PLOT = { w: 620, h: 350, top: 34, zLeft: 16, zRight: 292, pLeft: 340, pRight: 588, panelH: 220, stripY: 296 };
export const CLASS_COLOURS = ["#1971c2", "#e8590c", "#2f9e44", "#9c36b5", "#f08c00"];
const PURPLE = "#9c36b5";
const r2 = (v: number) => Math.round(v * 100) / 100;

/** The score panel's scale: a score to a height on the page and back, and which column a point is in. */
export const zToY = (z: number) => SM_PLOT.top + SM_PLOT.panelH / 2 - (z / Z_MAX) * (SM_PLOT.panelH / 2 - 8);
export const yToZ = (y: number) => ((SM_PLOT.top + SM_PLOT.panelH / 2 - y) / (SM_PLOT.panelH / 2 - 8)) * Z_MAX;
export function columnAt(x: number, n: number): number | null {
  const { zLeft, zRight } = SM_PLOT;
  if (x < zLeft || x > zRight) return null;
  return Math.min(n - 1, Math.floor(((x - zLeft) / (zRight - zLeft)) * n));
}

export type SoftmaxWords = { scores: string; probs: string; classes: string[] };

/**
 * The picture: on the left the scores as bars up or down from 0, with the gradient's arrows −(p − y) beside them when
 * there is a target; on the right the probabilities as bars from 0 to 1, the target starred; under both, the
 * probabilities end to end in a strip, adding up to 1.
 */
export function softmaxSvg(z: number[], T: number, o: { target: number | null; locked?: boolean; words: SoftmaxWords }): string {
  const { top, zLeft, zRight, pLeft, pRight, panelH, stripY, w } = SM_PLOT;
  const n = z.length;
  const p = softmax(z, T);
  const name = (i: number) => o.words.classes[i] ?? String(i + 1);
  const mid = top + panelH / 2;
  let s = `<text x="${(zLeft + zRight) / 2}" y="${top - 14}" font-size="13" font-weight="700" fill="#495057" text-anchor="middle">${o.words.scores}</text>`;
  s += `<text x="${(pLeft + pRight) / 2}" y="${top - 14}" font-size="13" font-weight="700" fill="#495057" text-anchor="middle">${o.words.probs}</text>`;
  // The score panel: a grid line at each whole score, 0 darker.
  s += `<rect x="${zLeft}" y="${top}" width="${zRight - zLeft}" height="${panelH}" fill="${o.locked ? "#f8f9fa" : "#fff"}" stroke="#dee2e6"/>`;
  for (let k = -Z_MAX + 1; k < Z_MAX; k++) s += `<line x1="${zLeft}" y1="${r2(zToY(k))}" x2="${zRight}" y2="${r2(zToY(k))}" stroke="${k === 0 ? "#868e96" : "#f1f3f5"}"/>`;
  s += `<text x="${zLeft + 3}" y="${r2(zToY(4) + 4)}" font-size="10" fill="#adb5bd">4</text><text x="${zLeft + 3}" y="${r2(zToY(-4) + 4)}" font-size="10" fill="#adb5bd">−4</text>`;
  const col = (zRight - zLeft) / n;
  const grad = o.target === null ? null : gradient(p, o.target);
  z.forEach((v, i) => {
    const cx = zLeft + col * (i + 0.5);
    const bw = Math.min(46, col * 0.55);
    const [y0, y1] = [Math.min(mid, zToY(v)), Math.max(mid, zToY(v))];
    s += `<rect x="${r2(cx - bw / 2)}" y="${r2(y0)}" width="${r2(bw)}" height="${r2(Math.max(1, y1 - y0))}" fill="${CLASS_COLOURS[i]}" opacity="0.85"/>`;
    if (!o.locked) s += `<rect x="${r2(cx - bw / 2 - 3)}" y="${r2(zToY(v) - 3)}" width="${r2(bw + 6)}" height="6" rx="3" fill="#1e1e1e"/>`;
    // The score's value past the end of its bar, or just inside it when there is no room below.
    const inside = v < 0 && zToY(v) + 18 > top + panelH - 3;
    s += `<text x="${r2(cx)}" y="${r2(v >= 0 || inside ? zToY(v) - 8 : zToY(v) + 18)}" font-size="13" font-weight="700" fill="${inside ? "#fff" : "#1e1e1e"}" text-anchor="middle">${num(v)}</text>`;
    s += `<text x="${r2(cx)}" y="${top + panelH + 16}" font-size="12" fill="${CLASS_COLOURS[i]}" font-weight="700" text-anchor="middle">${name(i)}${o.target === i ? " ★" : ""}</text>`;
    if (grad && Math.abs(grad[i]) > 0.005) {
      // The way gradient descent would move this score: −(p − y), up for the target, down for the others.
      const ax = r2(cx + bw / 2 + 9);
      const len = -grad[i] * 70;
      const [a, b] = [zToY(v), zToY(v) - len];
      s += `<line x1="${ax}" y1="${r2(a)}" x2="${ax}" y2="${r2(b)}" stroke="${PURPLE}" stroke-width="2.5"/><path d="M${r2(ax - 5)},${r2(b + (len > 0 ? 6 : -6))}L${ax},${r2(b)}L${r2(ax + 5)},${r2(b + (len > 0 ? 6 : -6))}" fill="none" stroke="${PURPLE}" stroke-width="2.5"/>`;
    }
  });
  // softmax, from one panel to the other.
  s += `<text x="${(zRight + pLeft) / 2}" y="${mid - 6}" font-size="20" fill="#868e96" text-anchor="middle">→</text><text x="${(zRight + pLeft) / 2}" y="${mid + 12}" font-size="11" fill="#868e96" text-anchor="middle">T = ${num(T)}</text>`;
  // The probability panel, 0 to 1.
  s += `<rect x="${pLeft}" y="${top}" width="${pRight - pLeft}" height="${panelH}" fill="#fff" stroke="#dee2e6"/>`;
  const pY = (v: number) => top + panelH - v * (panelH - 22);
  for (const k of [0.25, 0.5, 0.75, 1]) s += `<line x1="${pLeft}" y1="${r2(pY(k))}" x2="${pRight}" y2="${r2(pY(k))}" stroke="#f1f3f5"/><text x="${pRight + 3}" y="${r2(pY(k) + 3)}" font-size="10" fill="#adb5bd">${k}</text>`;
  const pcol = (pRight - pLeft) / n;
  p.forEach((v, i) => {
    const cx = pLeft + pcol * (i + 0.5);
    const bw = Math.min(46, pcol * 0.55);
    s += `<rect x="${r2(cx - bw / 2)}" y="${r2(pY(v))}" width="${r2(bw)}" height="${r2(top + panelH - pY(v))}" fill="${CLASS_COLOURS[i]}"/>`;
    s += `<text x="${r2(cx)}" y="${r2(pY(v) - 6)}" font-size="13" font-weight="700" fill="#1e1e1e" text-anchor="middle">${prob(v)}</text>`;
    s += `<text x="${r2(cx)}" y="${top + panelH + 16}" font-size="12" fill="${CLASS_COLOURS[i]}" font-weight="700" text-anchor="middle">${name(i)}${o.target === i ? " ★" : ""}</text>`;
  });
  // The strip: every probability end to end, which fills it exactly.
  const [x0, x1] = [zLeft, w - 14];
  let x = x0;
  p.forEach((v, i) => {
    const wd = v * (x1 - x0);
    s += `<rect x="${r2(x)}" y="${stripY}" width="${r2(wd)}" height="26" fill="${CLASS_COLOURS[i]}" stroke="#fff"/>`;
    if (wd > 46) s += `<text x="${r2(x + wd / 2)}" y="${stripY + 17}" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">${Math.round(v * 100)} %</text>`;
    x += wd;
  });
  s += `<text x="${x1}" y="${stripY + 42}" font-size="11" fill="#868e96" text-anchor="end">Σ p = 1</text>`;
  return s;
}

/** A score or a temperature for the readout: up to two decimals, with a minus sign. */
export const num = (v: number) => nf(Math.round(v * 100) / 100, 2).replace(/^-/, "−");
/** A probability: two decimals, three when it is under 0.01, and <0.001 for less. */
export const prob = (v: number) => (v < 0.0005 ? "<0.001" : v < 0.01 ? v.toFixed(3) : v.toFixed(2));
