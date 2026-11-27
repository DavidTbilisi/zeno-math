// The circuit lab (#841): switches, gates and lamps joined by wires, worked by hand. A circuit is its gates (where they
// sit) and its wires (an output to one input pin); the switches and lamps are the puzzle's. What a circuit shows is
// found by settling it: every gate worked out again from the values on its inputs until nothing changes, so a loop
// that keeps flipping never settles. A puzzle is a truth table to match with the gates it allows, stars for few gates.
// Memory (#842): a loop that settles keeps what it had, so a circuit is settled from the values it last held, and a
// memory puzzle is a timing strip, its rows run in turn from power-on, each wanting what the spec remembers.
import type { GameBase } from "./ladder";

export const GATES = ["not", "and", "or", "xor", "nand", "nor"] as const;
export type GateKind = (typeof GATES)[number];
export type Gate = { id: string; kind: GateKind; x: number; y: number };
/** From a switch ("i0"), or a gate's output, to an input pin of a gate or a lamp ("o0", pin 0). */
export type Wire = { from: string; to: string; pin: number };
export type Circuit = { gates: Gate[]; wires: Wire[] };

export const pinsOf = (k: GateKind) => (k === "not" ? 1 : 2);
const OPS: Record<GateKind, (a: boolean, b: boolean) => boolean> = {
  not: (a) => !a,
  and: (a, b) => a && b,
  or: (a, b) => a || b,
  xor: (a, b) => a !== b,
  nand: (a, b) => !(a && b),
  nor: (a, b) => !(a || b),
};

/** The gates nearest the switches first (by wires from them), the rest after: like a signal spreading, so a flip-flop
 * closes its first latch before its second copies, in whatever order its gates were put down. */
function inOrder(c: Circuit): Gate[] {
  const depth = new Map<string, number>();
  let edge = c.wires.filter((w) => w.from.startsWith("i")).map((w) => w.to);
  for (let k = 1; edge.length; k++) {
    const next: string[] = [];
    for (const id of edge) {
      if (depth.has(id)) continue;
      depth.set(id, k);
      next.push(...c.wires.filter((w) => w.from === id).map((w) => w.to));
    }
    edge = next;
  }
  const at = (g: Gate) => depth.get(g.id) ?? Infinity;
  return c.gates.map((g, i) => [g, i] as const).sort(([a, i], [b, j]) => at(a) - at(b) || i - j).map(([g]) => g);
}

/** The value on every switch, gate and lamp, and whether it settled (a loop that keeps flipping doesn't). Gates start
 * from `from`, what they last held (all 0 at power-on). */
export function settle(c: Circuit, ins: readonly boolean[], outs: number, from: Readonly<Record<string, boolean>> = {}): { val: Record<string, boolean>; steady: boolean } {
  const val: Record<string, boolean> = {};
  for (const g of c.gates) if (from[g.id]) val[g.id] = true;
  ins.forEach((v, k) => (val[`i${k}`] = v));
  const into = new Map(c.wires.map((w) => [`${w.to}/${w.pin}`, w.from]));
  const order = inOrder(c);
  const at = (id: string, pin: number) => {
    const from = into.get(`${id}/${pin}`);
    return from !== undefined && !!val[from];
  };
  let steady = false;
  // Each pass works every gate out from what its inputs hold now: a chain of n gates settles in n passes.
  for (let pass = 0; pass <= 2 * c.gates.length + 1 && !steady; pass++) {
    steady = true;
    for (const g of order) {
      const v = OPS[g.kind](at(g.id, 0), at(g.id, 1));
      if (v !== !!val[g.id]) [val[g.id], steady] = [v, false];
    }
  }
  for (let k = 0; k < outs; k++) val[`o${k}`] = at(`o${k}`, 0);
  return { val, steady };
}

export type CircuitPuzzle = {
  ins: readonly string[];
  outs: readonly string[];
  gates: readonly GateKind[];
  /** The fewest gates it can be done with: three stars. */
  best: number;
  /** What the lamps should show. A memory puzzle is also given the step before: its switches and what each lamp
   * should have held (or, where nothing was wanted, what it showed); null is "either". */
  want: (ins: readonly boolean[], before: Before | null) => (boolean | null)[];
  /** A memory puzzle's switch settings in turn, one bit each as in `on`; none for a truth table. */
  steps?: readonly number[];
};
export type Before = { ins: boolean[]; q: boolean[] };

const held = (b: Before | null, k = 0) => (b ? b.q[k] : null);
/** Clk went from 0 to 1 since the step before. */
const rose = (b: Before | null, clk: boolean, k: number) => !!b && !b.ins[k] && clk;

export const CIRCUIT_LADDER: readonly CircuitPuzzle[] = [
  { ins: ["A"], outs: ["Y"], gates: ["nand"], best: 1, want: ([a]) => [!a] },
  { ins: ["A", "B"], outs: ["Y"], gates: ["nand"], best: 2, want: ([a, b]) => [a && b] },
  { ins: ["A", "B"], outs: ["Y"], gates: ["nand"], best: 3, want: ([a, b]) => [a || b] },
  { ins: ["A", "B"], outs: ["Y"], gates: ["not", "and", "or"], best: 4, want: ([a, b]) => [a !== b] },
  { ins: ["A", "B"], outs: ["S", "C"], gates: ["xor", "and"], best: 2, want: ([a, b]) => [a !== b, a && b] },
  { ins: ["A", "B", "Cᵢₙ"], outs: ["S", "Cₒᵤₜ"], gates: ["xor", "and", "or"], best: 5, want: ([a, b, c]) => [(a !== b) !== c, (a && b) || (c && a !== b)] },
  { ins: ["A", "B", "Sel"], outs: ["Y"], gates: ["not", "and", "or"], best: 4, want: ([a, b, s]) => [s ? b : a] },
  // Memory: S–R latch, D latch, D flip-flop (on the rising edge), a counter bit (flips on every rising edge).
  { ins: ["S", "R"], outs: ["Q"], gates: ["nor"], best: 2, steps: [1, 0, 2, 0, 1, 0], want: ([s, r], b) => [s ? true : r ? false : held(b)] },
  { ins: ["D", "En"], outs: ["Q"], gates: ["not", "and", "nor"], best: 5, steps: [1, 3, 2, 0, 1, 3, 2, 0], want: ([d, en], b) => [en ? d : held(b)] },
  { ins: ["D", "Clk"], outs: ["Q"], gates: ["not", "and", "nor"], best: 10, steps: [0, 1, 3, 2, 3, 1, 0, 1], want: ([d, clk], b) => [rose(b, clk, 1) ? d : held(b)] },
  { ins: ["Clk"], outs: ["Q"], gates: ["not", "and", "nor"], best: 9, steps: [0, 1, 0, 1, 0, 1, 0, 1], want: ([clk], b) => [rose(b, clk, 0) ? !held(b) : held(b)] },
];
/** Free play: every gate, three switches and two lamps. */
export const FREE_IO = { ins: ["A", "B", "C"], outs: ["X", "Y"] } as const;
/** More gates than this don't fit on the board. */
export const MAX_GATES = 12;

export const CIRCUIT_NOTICES = ["loop"] as const;
export type CircuitNotice = (typeof CIRCUIT_NOTICES)[number];

export type LiveCircuit = GameBase<CircuitNotice> & Circuit & {
  mode: "puzzle" | "free";
  /** The switches that are on, one bit each, the first switch the highest. */
  on: number;
  done: boolean;
  /** What every gate last settled to, so a latch keeps it (missing on boards saved before #842). */
  mem?: Record<string, boolean>;
  /** The row of a memory puzzle's strip the switches are at. */
  step?: number;
};

export const CIRCUIT_START: LiveCircuit = { mode: "puzzle", stage: 0, said: null, gates: [], wires: [], on: 0, done: false, mem: {}, step: 0 };

export const puzzleOf = (s: Pick<LiveCircuit, "mode" | "stage">): CircuitPuzzle | null => (s.mode === "puzzle" ? CIRCUIT_LADDER[s.stage] ?? null : null);
export const ioOf = (s: Pick<LiveCircuit, "mode" | "stage">) => puzzleOf(s) ?? FREE_IO;

/** Row r of a table of n switches, the first switch the highest bit. */
export const bitsOf = (r: number, n: number) => Array.from({ length: n }, (_, k) => ((r >> (n - 1 - k)) & 1) === 1);

export type Row = { ins: boolean[]; got: boolean[]; want: (boolean | null)[] | null; steady: boolean; ok: boolean; val: Record<string, boolean> };

/** The whole table: for a truth table every setting of the switches, each from power-on; for a memory puzzle its
 * steps in turn, each settled from the one before. What the circuit gives, and what the puzzle wants. */
export function tableOf(c: Circuit, io: { ins: readonly string[]; outs: readonly string[] }, p: CircuitPuzzle | null): Row[] {
  const n = io.ins.length;
  const settings = p?.steps ?? Array.from({ length: 2 ** n }, (_, r) => r);
  let [last, before]: [Record<string, boolean>, Before | null] = [{}, null];
  return settings.map((r) => {
    const ins = bitsOf(r, n);
    const { val, steady } = settle(c, ins, io.outs.length, p?.steps ? last : {});
    const got = io.outs.map((_, k) => val[`o${k}`]);
    const want = p ? p.want(ins, before) : null;
    if (p?.steps) [last, before] = [val, { ins, q: got.map((v, k) => want?.[k] ?? v) }];
    return { ins, got, want, steady, val, ok: !!want && steady && got.every((v, k) => want[k] === null || v === want[k]) };
  });
}

/** Three stars for the fewest gates, two for up to two more. */
export const circuitStars = (p: CircuitPuzzle, gates: number) => (gates <= p.best ? 3 : gates <= p.best + 2 ? 2 : 1);

/** A gate's next id: one more than the highest. */
export const nextGateId = (gates: readonly Gate[]) => `g${gates.reduce((m, g) => Math.max(m, Number(g.id.slice(1))), 0) + 1}`;

/** A wire into this pin, put in place of the one there was; none from a part into itself. */
export function joined(c: Circuit, w: Wire): Wire[] {
  if (w.from === w.to) return c.wires;
  return [...c.wires.filter((x) => !(x.to === w.to && x.pin === w.pin)), w];
}

/** The circuit without a gate and its wires. */
export const without = (c: Circuit, id: string): Circuit => ({
  gates: c.gates.filter((g) => g.id !== id),
  wires: c.wires.filter((w) => w.from !== id && w.to !== id),
});
