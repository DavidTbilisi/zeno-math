// What the patterns build their frames with: a tape of frames that refuses to grow past the limit, values written
// the way captions and cells want them, a row of the variables a step is working with, slot formulas compiled with
// their errors naming the slot, and base cases read from "dp[0] = 1; dp[1] = 1".
import { fill } from "../text";
import type { Cells, Frame, Trace } from "../patternSteps";
import { compile, type Env, type Hooks, type Value } from "./expr";
import { LIMITS, type SlotId, type SolverWords } from "./types";

export type { Cells, Env, Frame, Trace, Value };
export { fill };

/** The frames of one run; the last one is the answer said once more over the picture as the last step left it. */
export function tape(w: SolverWords) {
  const frames: Frame[] = [];
  return {
    frames,
    push(f: Frame) {
      if (frames.length >= LIMITS.frames) throw new Error(fill(w.errors.steps, { n: LIMITS.frames }));
      frames.push(f);
    },
    /** The frame before this one: where `then` and `ask` go. */
    get last(): Frame | undefined {
      return frames[frames.length - 1];
    },
    done(answer: string, extra: Partial<Frame> = {}): Trace {
      const last = frames[frames.length - 1];
      frames.push({ ...last, ...extra, note: answer, then: undefined, ask: undefined });
      return { frames, answer };
    },
  };
}

/** A value as a caption or a cell shows it: ∞ and − as symbols, booleans as ticks, a list in brackets. */
export function showVal(v: Value): string {
  if (typeof v === "number") {
    if (Number.isNaN(v)) return "";
    if (!Number.isFinite(v)) return v > 0 ? "∞" : "−∞";
    const r = Math.round(v * 1e4) / 1e4;
    return r < 0 ? `−${-r}` : String(r);
  }
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "string") return v;
  return `[${v.map(showVal).join(", ")}]`;
}
/** A value in a cell: numbers as they are, everything else as a caption shows it. */
export const cellVal = (v: Value): number | string => (typeof v === "number" && Number.isFinite(v) ? v : showVal(v));
/** A value in a caption: text in quotes, so 'a' is told from a name. */
export const say = (v: Value): string => (typeof v === "string" ? `'${v}'` : showVal(v));
export const listText = (xs: readonly Value[]) => `[${xs.map(say).join(", ")}]`;

/** The row under the picture that says what the variables are now. */
export const varsRow = (w: SolverWords, vars: Record<string, Value>): Cells => ({ label: w.vars, vals: Object.entries(vars).map(([k, v]) => `${k} = ${showVal(v)}`) });

/** A slot's formula compiled once; whatever goes wrong in it, reading or running, names the slot. */
export function slot(w: SolverWords, id: SlotId, src: string): { text: string; label: string; run: (env: Env, hooks?: Hooks) => Value } {
  const label = w.slots[id];
  const text = src.trim();
  const wrap = <T>(f: () => T): T => {
    try {
      return f();
    } catch (err) {
      throw new Error(fill(w.errors.inSlot, { slot: label, msg: (err as Error).message }));
    }
  };
  const f = wrap(() => compile(text, w.errors));
  return { text, label, run: (env, hooks) => wrap(() => f(env, hooks)) };
}
export const slotNum = (s: ReturnType<typeof slot>, w: SolverWords, env: Env, hooks?: Hooks): number => {
  const v = s.run(env, hooks);
  if (typeof v !== "number") throw new Error(fill(w.errors.inSlot, { slot: s.label, msg: fill(w.errors.notNumber, { s: s.text }) }));
  return v;
};
export const slotBool = (s: ReturnType<typeof slot>, w: SolverWords, env: Env, hooks?: Hooks): boolean => {
  const v = s.run(env, hooks);
  if (typeof v !== "boolean") throw new Error(fill(w.errors.inSlot, { slot: s.label, msg: fill(w.errors.notBool, { s: s.text }) }));
  return v;
};

/** The base cases "dp[0] = 1; dp[i][0] = 0": each cell's indices (a number, or i / j for every row or column) and its formula. */
export function parseBase(w: SolverWords, src: string, dims: 1 | 2): { idx: (number | "i" | "j")[]; rhs: ReturnType<typeof slot> }[] {
  return src
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(dims === 1 ? /^dp\s*\[\s*(\d+|i)\s*\]\s*=\s*(.+)$/ : /^dp\s*\[\s*(\d+|i)\s*\]\s*\[\s*(\d+|j)\s*\]\s*=\s*(.+)$/);
      if (!m) throw new Error(w.errors.base);
      const idx = m.slice(1, 1 + dims).map((x) => (x === "i" || x === "j" ? x : Number(x)));
      return { idx, rhs: slot(w, "base", m[1 + dims]) };
    });
}

/** Numbers to choose from in a quiz: the right one and some near misses, smallest first, no repeats. */
export function numberAsk(q: string, right: number, wrong: number[]) {
  const all = [...new Set([right, ...wrong.filter(Number.isFinite)])].sort((a, b) => a - b);
  return { q, options: all.map(showVal), answer: all.indexOf(right) };
}
