// The network lab: a neural network trained on points of two classes. First one neuron, the perceptron: it calls a
// point orange when w₀ + w₁x + w₂y ≥ 0, and each update takes a point it calls wrong and adds it to the weights (or
// takes it away), turning the line towards it until no point is wrong, if a line can do it. On XOR no line can; a
// hidden layer of a few neurons, each a line bent by an activation (sigmoid, tanh or ReLU), can. That network is
// trained by the loop of every learner: forward to the outputs, the log loss, backward to every weight's gradient,
// and a step downhill, drawn as a loss curve and a shaded boundary. A big network trained long on noisy points also
// learns the noise: its test loss turns up while the training loss keeps falling. Kept free of React so it can be
// tested on its own.
import type { GameBase } from "./ladder";
import { rng } from "./random";
import { nf } from "./text";

/** A labelled point in the unit square: class 1 (orange) or 0 (blue), and whether it is kept for testing. */
export type NPoint = { x: number; y: number; c: 0 | 1; test?: boolean };
export type NnData = "line" | "xor" | "circle" | "noisy";
export const FREE_DATA: NnData[] = ["line", "xor", "circle", "noisy"];
export type Act = "sigmoid" | "tanh" | "relu";
export const ACTS: Act[] = ["sigmoid", "tanh", "relu"];

const normal = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const clip = (v: number) => Math.round(Math.min(0.98, Math.max(0.02, v)) * 1000) / 1000;

export function pointsOf(data: NnData, seed: number): NPoint[] {
  const r = rng(seed * 43 + data.length * 7);
  const out: NPoint[] = [];
  const ruled = (n: number, rule: (x: number, y: number) => 0 | 1 | null, test = false) => {
    let made = 0;
    while (made < n) {
      const [x, y] = [clip(r()), clip(r())];
      const c = rule(x, y);
      if (c === null) continue;
      out.push({ x, y, c, ...(test ? { test } : {}) });
      made++;
    }
  };
  if (data === "line") ruled(40, (x, y) => (Math.abs(y - (0.25 + 0.5 * x)) < 0.06 ? null : y > 0.25 + 0.5 * x ? 1 : 0));
  else if (data === "xor")
    ([[0.25, 0.25, 0], [0.75, 0.75, 0], [0.25, 0.75, 1], [0.75, 0.25, 1]] as const).forEach(([mx, my, c]) => {
      for (let i = 0; i < 10; i++) out.push({ x: clip(mx + 0.08 * normal(r)), y: clip(my + 0.08 * normal(r)), c });
    });
  else if (data === "circle") ruled(60, (x, y) => {
    const d = Math.hypot(x - 0.5, y - 0.5);
    return Math.abs(d - 0.28) < 0.04 ? null : d < 0.28 ? 1 : 0;
  });
  else {
    // A wavy border with one label in eight flipped: a few training points and many test points.
    const rule = (x: number, y: number): 0 | 1 => (y > 0.5 + 0.2 * Math.sin(2 * Math.PI * x) ? 1 : 0);
    const flip = (c: 0 | 1): 0 | 1 => (r() < 0.125 ? ((1 - c) as 0 | 1) : c);
    ruled(40, (x, y) => flip(rule(x, y)));
    ruled(120, (x, y) => flip(rule(x, y)), true);
  }
  return out;
}
export const trainOf = (ps: NPoint[]) => ps.filter((p) => !p.test);
export const testOf = (ps: NPoint[]) => ps.filter((p) => p.test);
/** The inputs the network sees: the square stretched to −1 … 1. */
const inputs = (p: { x: number; y: number }): [number, number] => [2 * p.x - 1, 2 * p.y - 1];

// ---------- the perceptron ----------

/** The perceptron's weights (w₀, w₁, w₂) on the stretched inputs. */
export type Perceptron = [number, number, number];
export const perceptronCalls = (w: Perceptron, p: { x: number; y: number }): 0 | 1 => {
  const [a, b] = inputs(p);
  return w[0] + w[1] * a + w[2] * b >= 0 ? 1 : 0;
};
/** One update: from `from` on, the first point called wrong is added to the weights (orange) or taken away (blue).
 * Returns the new weights, the point used and where to look next; null when no point is wrong. */
export function perceptronUpdate(w: Perceptron, ps: NPoint[], from: number): { w: Perceptron; used: number; next: number } | null {
  for (let k = 0; k < ps.length; k++) {
    const i = (from + k) % ps.length;
    const p = ps[i];
    if (perceptronCalls(w, p) !== p.c) {
      const s = p.c ? 1 : -1;
      const [a, b] = inputs(p);
      return { w: [w[0] + s, w[1] + s * a, w[2] + s * b], used: i, next: (i + 1) % ps.length };
    }
  }
  return null;
}

// ---------- the network ----------

/** A network 2 → h → 1: each hidden unit j has a bias and two weights (hidden[j] = [b, wx, wy]) and the output a bias
 * and one weight per hidden unit (out = [b, v₁, …, v_h]). */
export type Net = { hidden: number[][]; out: number[]; act: Act };
const actF: Record<Act, (z: number) => number> = { sigmoid: (z) => 1 / (1 + Math.exp(-z)), tanh: Math.tanh, relu: (z) => Math.max(0, z) };
const actD: Record<Act, (z: number, a: number) => number> = { sigmoid: (_, a) => a * (1 - a), tanh: (_, a) => 1 - a * a, relu: (z) => (z > 0 ? 1 : 0) };
export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** A network with h hidden units and small random weights from a seed. */
export function initNet(h: number, act: Act, seed: number): Net {
  const r = rng(seed * 97 + h * 5 + act.length);
  const u = (scale: number) => (2 * r() - 1) * scale;
  return { hidden: Array.from({ length: h }, () => [u(0.5), u(1.5), u(1.5)]), out: [0, ...Array.from({ length: h }, () => u(1.5 / Math.sqrt(Math.max(1, h))))], act };
}
/** The chance of orange at a point: forward through the hidden units to the sigmoid output. */
export function forward(net: Net, p: { x: number; y: number }): number {
  const [a, b] = inputs(p);
  const hs = net.hidden.map(([c, wx, wy]) => actF[net.act](c + wx * a + wy * b));
  return sigmoid(net.out[0] + hs.reduce((s, v, j) => s + v * net.out[j + 1], 0));
}
const EPS = 1e-12;
/** The mean log loss over points. */
export const lossOf = (net: Net, ps: NPoint[]) => (ps.length ? -ps.reduce((s, p) => s + Math.log(Math.max(EPS, p.c ? forward(net, p) : 1 - forward(net, p))), 0) / ps.length : NaN);
/** One step of gradient descent on the mean log loss over all the points: forward, backward, step. */
export function trainStep(net: Net, ps: NPoint[], eta: number): Net {
  const gh = net.hidden.map(() => [0, 0, 0]);
  const go = net.out.map(() => 0);
  for (const p of ps) {
    const [a, b] = inputs(p);
    const zs = net.hidden.map(([c, wx, wy]) => c + wx * a + wy * b);
    const hs = zs.map((z) => actF[net.act](z));
    const out = sigmoid(net.out[0] + hs.reduce((s, v, j) => s + v * net.out[j + 1], 0));
    // For log loss after a sigmoid, the output's error is simply out − y.
    const e = out - p.c;
    go[0] += e;
    hs.forEach((v, j) => {
      go[j + 1] += e * v;
      const d = e * net.out[j + 1] * actD[net.act](zs[j], v);
      gh[j][0] += d;
      gh[j][1] += d * a;
      gh[j][2] += d * b;
    });
  }
  const n = ps.length;
  return { act: net.act, hidden: net.hidden.map((row, j) => row.map((v, k) => v - (eta * gh[j][k]) / n)), out: net.out.map((v, k) => v - (eta * go[k]) / n) };
}
export const netCalls = (net: Net, p: { x: number; y: number }): 0 | 1 => (forward(net, p) >= 0.5 ? 1 : 0);
export function accuracy(call: (p: NPoint) => 0 | 1, ps: NPoint[]): number {
  return ps.length ? ps.filter((p) => call(p) === p.c).length / ps.length : NaN;
}

// ---------- the puzzles ----------

export type NnGoal = { kind: "perfect" } | { kind: "train"; min: number } | { kind: "test"; min: number };
export type NnControl = "update" | "hidden" | "act" | "eta" | "train";
export type NnNotice = "perceptron" | "xor" | "shape" | "overfit";
export const NN_NOTICES: NnNotice[] = ["perceptron", "xor", "shape", "overfit"];
export type NnPuzzle = { data: NnData; start: Partial<LiveNn>; controls: NnControl[]; goal: NnGoal; notice: NnNotice };
export const HIDDEN = [0, 1, 2, 3, 4, 8, 16, 32];
export const ETAS = [0.03, 0.1, 0.3, 1, 3];
const BASE: Partial<LiveNn> = { hidden: 0, act: "tanh", eta: 1, steps: 0, net: null, perceptron: [1, 1, 0], next: 0, used: null, updates: 0, losses: [], testLosses: [], start: 1 };
export const NN_LADDER: NnPuzzle[] = [
  { data: "line", start: { ...BASE }, controls: ["update"], goal: { kind: "perfect" }, notice: "perceptron" },
  { data: "xor", start: { ...BASE }, controls: ["update", "hidden", "train"], goal: { kind: "perfect" }, notice: "xor" },
  { data: "circle", start: { ...BASE, hidden: 2 }, controls: ["hidden", "act", "train"], goal: { kind: "train", min: 0.95 }, notice: "shape" },
  { data: "noisy", start: { ...BASE, hidden: 32 }, controls: ["hidden", "train"], goal: { kind: "test", min: 0.8 }, notice: "overfit" },
];
export const PUZZLE_SEED = 1;
export const TRAIN_STEPS = 100;

export type NnSlip = "wrongPoints" | "trainLow" | "testLow";
export type NnVerdict = { state: "won" } | { state: "lost"; why: NnSlip; have: number; want: number };

/** The game's state: hidden units (0: the perceptron), the activation and learning rate, the network's weights after
 * the steps trained (null before any), the perceptron's weights and where its next update looks, and the losses. */
export type LiveNn = GameBase<NnNotice, { kind: "wrong"; why: NnSlip }> & {
  mode: "puzzle" | "free";
  hidden: number;
  act: Act;
  eta: number;
  steps: number;
  net: Net | null;
  perceptron: Perceptron;
  next: number;
  /** The point the last perceptron update used. */
  used: number | null;
  updates: number;
  losses: number[];
  testLosses: number[];
  /** The seed of the network's first weights: "New start" draws another. */
  start: number;
  data: NnData;
  seed: number;
  tries: number;
  done: boolean;
};
export const NN_START: LiveNn = { mode: "puzzle", stage: 0, hidden: 0, act: "tanh", eta: 1, steps: 0, net: null, perceptron: [1, 1, 0], next: 0, used: null, updates: 0, losses: [], testLosses: [], start: 1, data: "line", seed: 1, tries: 0, done: false, said: null };
export const nnPuzzle = (d: Pick<LiveNn, "mode" | "stage">) => (d.mode === "puzzle" ? NN_LADDER[d.stage] : null);
export const nnPoints = (d: LiveNn) => {
  const p = nnPuzzle(d);
  return p ? pointsOf(p.data, PUZZLE_SEED) : pointsOf(d.data, d.seed);
};
export const controlsOf = (d: LiveNn): NnControl[] => nnPuzzle(d)?.controls ?? ["update", "hidden", "act", "eta", "train"];
export const nnStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);
/** How the state calls a point: the perceptron when there are no hidden units, else the network (blue before training). */
export const caller = (d: LiveNn) => (p: { x: number; y: number }): 0 | 1 => (d.hidden === 0 ? perceptronCalls(d.perceptron, p) : d.net ? netCalls(d.net, p) : 0);

/** Train the state's network n more steps (from fresh weights if it has none), recording the losses. */
export function trainMore(d: LiveNn, n: number): Pick<LiveNn, "net" | "steps" | "losses" | "testLosses"> {
  const ps = nnPoints(d);
  const [train, test] = [trainOf(ps), testOf(ps)];
  let net = d.net ?? initNet(d.hidden, d.act, d.start);
  const losses = d.net ? [...d.losses] : [lossOf(net, train)];
  const testLosses = d.net ? [...d.testLosses] : test.length ? [lossOf(net, test)] : [];
  for (let i = 0; i < n; i++) {
    net = trainStep(net, train, d.eta);
    // Every tenth step is kept for the curves.
    if ((d.steps + i + 1) % 10 === 0) {
      losses.push(lossOf(net, train));
      if (test.length) testLosses.push(lossOf(net, test));
    }
  }
  return { net, steps: d.steps + n, losses, testLosses };
}

export function judgeNn(d: LiveNn, g: NnGoal): NnVerdict {
  const ps = nnPoints(d);
  const [train, test] = [trainOf(ps), testOf(ps)];
  const call = caller(d);
  const lost = (why: NnSlip, have: number, want: number): NnVerdict => ({ state: "lost", why, have, want });
  switch (g.kind) {
    case "perfect": {
      const wrong = train.filter((p) => call(p) !== p.c).length;
      return wrong ? lost("wrongPoints", wrong, 0) : { state: "won" };
    }
    case "train": {
      const a = accuracy(call, train);
      return a >= g.min - 1e-9 ? { state: "won" } : lost("trainLow", a, g.min);
    }
    case "test": {
      const a = accuracy(call, test);
      return a >= g.min - 1e-9 ? { state: "won" } : lost("testLow", a, g.min);
    }
  }
}

// ---------- the picture ----------

export const NN_PLOT = { w: 640, h: 446 };
export const PLANE = { left: 44, top: 24, size: 390 };
const SIDE = { left: 462, w: 166 };
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const RED = "#e03131";
const GREY = "#868e96";
const INK = "#1e1e1e";
const COLOURS = [BLUE, ORANGE];
const r2 = (v: number) => Math.round(v * 100) / 100;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type TextStyle = { size?: number; fill?: string; bold?: boolean; anchor?: "start" | "middle" | "end" };
const txt = (x: number, y: number, s: string, o: TextStyle = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.size ?? 12}" fill="${o.fill ?? "#495057"}"${o.bold ? ` font-weight="700"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${esc(s)}</text>`;
export const num = (v: number) => (Number.isFinite(v) ? nf(v, 3) : "—");
const tint = (hex: string, a: number) => `rgb(${[1, 3, 5].map((i) => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * a)).join(",")})`;
export const toPx = (x: number, y: number): [number, number] => [PLANE.left + x * PLANE.size, PLANE.top + (1 - y) * PLANE.size];

export type NnWords = { loss: string; train: string; test: string; steps: string; updates: string; network: string; perceptron: string };

/**
 * The plane shaded by the chance of orange (the perceptron: by its side of the line, drawn), the training points
 * (orange filled, blue hollow), test points as small squares, the points called wrong ringed red and the perceptron's
 * last point marked. Beside it the network drawn small and the loss after every ten steps (the test loss dashed).
 */
export function nnSvg(d: LiveNn, w: NnWords): string {
  const ps = nnPoints(d);
  const [train, test] = [trainOf(ps), testOf(ps)];
  const call = caller(d);
  let out = `<rect x="${PLANE.left}" y="${PLANE.top}" width="${PLANE.size}" height="${PLANE.size}" fill="#fff" stroke="#dee2e6"/>`;
  const G = 40;
  const cell = PLANE.size / G;
  for (let i = 0; i < G; i++)
    for (let j = 0; j < G; j++) {
      const q = { x: (i + 0.5) / G, y: (j + 0.5) / G };
      const p = d.hidden === 0 ? (perceptronCalls(d.perceptron, q) ? 0.75 : 0.25) : d.net ? forward(d.net, q) : 0.5;
      out += `<rect x="${r2(PLANE.left + i * cell)}" y="${r2(PLANE.top + (G - 1 - j) * cell)}" width="${r2(cell + 0.5)}" height="${r2(cell + 0.5)}" fill="${tint(p >= 0.5 ? ORANGE : BLUE, 0.04 + 0.3 * Math.abs(p - 0.5) * 2)}"/>`;
    }
  for (let k = 0; k <= 4; k++) {
    const [gx, gy] = toPx(k / 4, k / 4);
    out += txt(gx, PLANE.top + PLANE.size + 15, nf(k / 4, 3), { anchor: "middle", size: 10.5, fill: GREY }) + txt(PLANE.left - 6, gy + 4, nf(k / 4, 3), { anchor: "end", size: 10.5, fill: GREY });
  }
  // The perceptron's line, w₀ + w₁a + w₂b = 0 on the stretched inputs.
  if (d.hidden === 0) {
    const [w0, w1, w2] = d.perceptron;
    if (Math.abs(w2) > 1e-9 || Math.abs(w1) > 1e-9) {
      const pts: [number, number][] = [];
      if (Math.abs(w2) > Math.abs(w1)) for (const x of [0, 1]) pts.push([x, (-(w0 + w1 * (2 * x - 1)) / w2 + 1) / 2]);
      else for (const y of [0, 1]) pts.push([(-(w0 + w2 * (2 * y - 1)) / w1 + 1) / 2, y]);
      const [a, b] = [toPx(...pts[0]), toPx(...pts[1])];
      out += `<clipPath id="nn-clip"><rect x="${PLANE.left}" y="${PLANE.top}" width="${PLANE.size}" height="${PLANE.size}"/></clipPath>`;
      out += `<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="${INK}" stroke-width="2.5" clip-path="url(#nn-clip)"/>`;
    }
  }
  for (const p of train) {
    const [px, py] = toPx(p.x, p.y);
    out += p.c ? `<circle cx="${r2(px)}" cy="${r2(py)}" r="4.5" fill="${ORANGE}"/>` : `<circle cx="${r2(px)}" cy="${r2(py)}" r="4" fill="#fff" stroke="${BLUE}" stroke-width="1.8"/>`;
    if (call(p) !== p.c) out += `<circle cx="${r2(px)}" cy="${r2(py)}" r="8" fill="none" stroke="${RED}" stroke-width="1.6"/>`;
  }
  for (const p of test) {
    const [px, py] = toPx(p.x, p.y);
    out += `<rect x="${r2(px - 3)}" y="${r2(py - 3)}" width="6" height="6" fill="${COLOURS[p.c]}" opacity="0.55"/>`;
  }
  if (d.hidden === 0 && d.used !== null && train[d.used]) {
    const [px, py] = toPx(train[d.used].x, train[d.used].y);
    out += `<circle cx="${r2(px)}" cy="${r2(py)}" r="11" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="3 3"/>`;
  }

  // The network drawn small: two inputs, the hidden units (up to 8 drawn), one output.
  const S = SIDE;
  let y = PLANE.top + 6;
  out += txt(S.left, y, d.hidden ? `${w.network}: 2 → ${d.hidden} → 1` : w.perceptron, { bold: true, size: 12.5 });
  const shown = Math.min(d.hidden, 8);
  const col = (k: number, n: number) => y + 22 + ((k + 0.5) * 110) / n;
  const [xi, xh, xo] = [S.left + 14, S.left + 80, S.left + 146];
  const ins = [0, 1].map((k) => col(k, 2));
  const hid = Array.from({ length: shown }, (_, k) => col(k, shown));
  const outY = col(0, 1);
  const edge = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="#ced4da" stroke-width="1.2"/>`;
  if (shown) {
    ins.forEach((a) => hid.forEach((b) => (out += edge(xi, a, xh, b))));
    hid.forEach((b) => (out += edge(xh, b, xo, outY)));
  } else ins.forEach((a) => (out += edge(xi, a, xo, outY)));
  ins.forEach((a, k) => (out += `<circle cx="${xi}" cy="${r2(a)}" r="9" fill="#fff" stroke="${INK}"/>` + txt(xi, a + 4, ["x", "y"][k], { anchor: "middle", size: 11, fill: INK })));
  hid.forEach((b) => (out += `<circle cx="${xh}" cy="${r2(b)}" r="${shown > 4 ? 5.5 : 8}" fill="#e7f5ff" stroke="${BLUE}"/>`));
  out += `<circle cx="${xo}" cy="${r2(outY)}" r="9" fill="#fff4e6" stroke="${ORANGE}"/>`;
  y += 150;
  out += txt(S.left, y, d.hidden ? fill(w.steps, { n: d.steps }) : fill(w.updates, { n: d.updates }), { size: 11.5 });

  // The loss after every ten steps.
  if (d.hidden && d.losses.length) {
    const box = { left: S.left, top: y + 30, w: S.w - 6, h: 116 };
    const all = [...d.losses, ...d.testLosses].filter(Number.isFinite);
    const top = Math.max(...all) * 1.05 || 1;
    const X = (i: number, n: number) => box.left + 4 + ((box.w - 8) * i) / Math.max(1, n - 1);
    const Y = (v: number) => box.top + box.h - 4 - ((box.h - 8) * Math.min(v, top)) / top;
    out += txt(S.left, y + 22, w.loss, { bold: true, size: 12 });
    out += `<rect x="${box.left}" y="${box.top}" width="${box.w}" height="${box.h}" fill="#fff" stroke="#dee2e6"/>`;
    out += `<polyline points="${d.losses.map((v, i) => `${r2(X(i, d.losses.length))},${r2(Y(v))}`).join(" ")}" fill="none" stroke="#9c36b5" stroke-width="2"/>`;
    if (d.testLosses.length) out += `<polyline points="${d.testLosses.map((v, i) => `${r2(X(i, d.testLosses.length))},${r2(Y(v))}`).join(" ")}" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="5 3"/>`;
    out += txt(box.left, box.top + box.h + 14, `— ${w.train} ${num(d.losses[d.losses.length - 1])}`, { size: 10.5, fill: "#9c36b5" });
    if (d.testLosses.length) out += txt(box.left, box.top + box.h + 28, `- - ${w.test} ${num(d.testLosses[d.testLosses.length - 1])}`, { size: 10.5, fill: INK });
  }
  return out;
}
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
