// The circuit lab (#841): switches, gates and lamps joined by wires, worked by hand. A circuit is its gates (where they
// sit) and its wires (an output to one input pin); the switches and lamps are the puzzle's. What a circuit shows is
// found by settling it: every gate worked out again from the values on its inputs until nothing changes, so a loop
// that keeps flipping never settles. A puzzle is a truth table to match with the gates it allows, stars for few gates.
// Memory (#842): a loop that settles keeps what it had, so a circuit is settled from the values it last held, and a
// memory puzzle is a timing strip, its rows run in turn from power-on, each wanting what the spec remembers.
// Chips (#843): a solved puzzle's circuit comes back as one part with several pins (a full adder, a selector, a
// flip-flop, a 4-bit adder, an ALU slice), worked out from the puzzle's own spec; a constant 1 feeds a carry in.
// Numbers made of several switches are shown in decimal beside the binary.
import type { GameBase } from "./ladder";

export const GATES = ["not", "and", "or", "xor", "nand", "nor"] as const;
export type Basic = (typeof GATES)[number];
export const CHIPS = ["fa", "mux", "dff", "tff", "add4", "alu1"] as const;
export type Chip = (typeof CHIPS)[number];
export type GateKind = Basic | Chip | "one";
export type Gate = { id: string; kind: GateKind; x: number; y: number };
/** From a switch ("i0"), or a gate's output ("g3", its second "g3.1"), to an input pin of a gate or a lamp ("o0", pin 0). */
export type Wire = { from: string; to: string; pin: number };
export type Circuit = { gates: Gate[]; wires: Wire[] };

const OPS: Record<Basic, (a: boolean, b: boolean) => boolean> = {
  not: (a) => !a,
  and: (a, b) => a && b,
  or: (a, b) => a || b,
  xor: (a, b) => a !== b,
  nand: (a, b) => !(a && b),
  nor: (a, b) => !(a || b),
};
export const isBasic = (k: GateKind): k is Basic => k in OPS;

const sub = (s: string, ks: readonly number[]) => ks.map((k) => `${s}${"₀₁₂₃"[k]}`);
const nibble = (s: string) => sub(s, [3, 2, 1, 0]);

/** A chip's pins, and the puzzle whose spec it works by (the stateful two remember instead). */
export const CHIP_PINS: Record<Chip, { ins: readonly string[]; outs: readonly string[]; from: number }> = {
  fa: { ins: ["A", "B", "Cᵢₙ"], outs: ["S", "Cₒᵤₜ"], from: 5 },
  mux: { ins: ["A", "B", "Sel"], outs: ["Y"], from: 6 },
  dff: { ins: ["D", "Clk"], outs: ["Q"], from: 9 },
  tff: { ins: ["Clk"], outs: ["Q"], from: 10 },
  add4: { ins: [...nibble("A"), ...nibble("B"), "Cᵢₙ"], outs: ["C", ...nibble("S")], from: 11 },
  alu1: { ins: ["A", "B", "Cᵢₙ", "Op₁", "Op₀"], outs: ["R", "Cₒᵤₜ"], from: 13 },
};

export const pinsOf = (k: GateKind) => (k === "one" ? 0 : k === "not" ? 1 : isBasic(k) ? 2 : CHIP_PINS[k].ins.length);
export const outsOf = (k: GateKind) => (isBasic(k) || k === "one" ? 1 : CHIP_PINS[k].outs.length);
/** The value name of output k of a gate. */
export const outId = (id: string, k: number) => (k ? `${id}.${k}` : id);
/** The part a wire comes from: "g3" for "g3.1". */
export const partOf = (from: string) => from.split(".")[0];

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
      next.push(...c.wires.filter((w) => partOf(w.from) === id).map((w) => w.to));
    }
    edge = next;
  }
  const at = (g: Gate) => (g.kind === "one" ? 0 : depth.get(g.id) ?? Infinity);
  return c.gates.map((g, i) => [g, i] as const).sort(([a, i], [b, j]) => at(a) - at(b) || i - j).map(([g]) => g);
}

/** The value on every switch, gate and lamp, and whether it settled (a loop that keeps flipping doesn't). Gates start
 * from `from`, what they last held (all 0 at power-on). A flip-flop chip takes what its D held, as Clk rises. */
export function settle(c: Circuit, ins: readonly boolean[], outs: number, from: Readonly<Record<string, boolean>> = {}): { val: Record<string, boolean>; steady: boolean } {
  const val: Record<string, boolean> = {};
  for (const g of c.gates) for (let k = 0; k < outsOf(g.kind); k++) if (from[outId(g.id, k)]) val[outId(g.id, k)] = true;
  ins.forEach((v, k) => (val[`i${k}`] = v));
  const into = new Map(c.wires.map((w) => [`${w.to}/${w.pin}`, w.from]));
  const at = (id: string, pin: number, vals: Readonly<Record<string, boolean>> = val) => {
    const src = into.get(`${id}/${pin}`);
    return src !== undefined && !!vals[src];
  };
  const work = (g: Gate): boolean[] => {
    const k = g.kind;
    if (k === "one") return [true];
    if (isBasic(k)) return [OPS[k](at(g.id, 0), at(g.id, 1))];
    const pins = Array.from({ length: pinsOf(k) }, (_, p) => at(g.id, p));
    const clk = pins[k === "dff" ? 1 : 0];
    const rose = clk && !from[`${g.id}~clk`];
    if (k === "dff") return [rose ? at(g.id, 0, from) : !!from[g.id]];
    if (k === "tff") return [rose ? !from[g.id] : !!from[g.id]];
    return CIRCUIT_LADDER[CHIP_PINS[k].from].want(pins, null).map((v) => !!v);
  };
  const order = inOrder(c);
  let steady = false;
  // Each pass works every gate out from what its inputs hold now: a chain of n gates settles in n passes.
  for (let pass = 0; pass <= 2 * c.gates.length + 1 && !steady; pass++) {
    steady = true;
    for (const g of order)
      work(g).forEach((v, k) => {
        const id = outId(g.id, k);
        if (v !== !!val[id]) [val[id], steady] = [v, false];
      });
  }
  // What each clock pin saw, for the next edge.
  for (const g of c.gates) if (g.kind === "dff" || g.kind === "tff") val[`${g.id}~clk`] = at(g.id, g.kind === "dff" ? 1 : 0);
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
  /** Switches and lamps read as numbers: each group's name and how many bits, the first the highest. */
  nums?: { ins: readonly Group[]; outs: readonly Group[] };
  /** For a table too long to show: the rows shown (every row is still checked). */
  show?: readonly number[];
};
export type Group = readonly [string, number];
export type Before = { ins: boolean[]; q: boolean[] };

const held = (b: Before | null, k = 0) => (b ? b.q[k] : null);
/** Clk went from 0 to 1 since the step before. */
const rose = (b: Before | null, clk: boolean, k: number) => !!b && !b.ins[k] && clk;

/** Bits read as a number, the first the highest. */
export const numOf = (bits: readonly (boolean | null)[]) => bits.reduce<number>((n, b) => 2 * n + (b ? 1 : 0), 0);
/** A number as `n` bits, the highest first. */
export const bitsOfNum = (v: number, n: number) => Array.from({ length: n }, (_, k) => ((v >> (n - 1 - k)) & 1) === 1);
/** Numbers (one per group of bits) packed into one switch setting. */
const pack = (sizes: readonly number[], vals: readonly number[]) => sizes.reduce((r, n, i) => (r << n) | (vals[i] & ((1 << n) - 1)), 0);
/** A switch setting's groups as numbers. */
export function groupsOf(bits: readonly (boolean | null)[], groups: readonly Group[]): number[] {
  let at = 0;
  return groups.map(([, n]) => numOf(bits.slice(at, (at += n))));
}

const ALU_OPS = (op: number, a: number, b: number) => [a & b, a | b, a + b, a - b][op] & 15;

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
  // Chips: a 4-bit adder from full adders, subtracting by adding the opposite, an ALU slice and four of them, a
  // register, a counter.
  {
    ins: CHIP_PINS.add4.ins, outs: CHIP_PINS.add4.outs, gates: ["fa"], best: 4,
    nums: { ins: [["A", 4], ["B", 4], ["Cᵢₙ", 1]], outs: [["S", 5]] },
    want: (i) => {
      const [a, b, c] = groupsOf(i, [["A", 4], ["B", 4], ["C", 1]]);
      return bitsOfNum(a + b + c, 5);
    },
    show: [[3, 4, 0], [5, 5, 0], [7, 1, 1], [9, 6, 0], [15, 1, 0], [15, 15, 1]].map((v) => pack([4, 4, 1], v)),
  },
  {
    ins: [...nibble("A"), ...nibble("B")], outs: nibble("D"), gates: ["not", "one", "add4"], best: 6,
    nums: { ins: [["A", 4], ["B", 4]], outs: [["A − B", 4]] },
    want: (i) => {
      const [a, b] = groupsOf(i, [["A", 4], ["B", 4]]);
      return bitsOfNum((a - b) & 15, 4);
    },
    show: [[9, 4], [7, 7], [12, 5], [3, 5], [0, 1], [15, 8]].map((v) => pack([4, 4], v)),
  },
  {
    ins: CHIP_PINS.alu1.ins, outs: CHIP_PINS.alu1.outs, gates: ["and", "or", "xor", "fa", "mux"], best: 7,
    want: ([a, b, c, o1, o0]) => {
      const bb = o1 && o0 ? !b : b;
      return o1 ? [(a !== bb) !== c, (a && bb) || (c && a !== bb)] : [o0 ? a || b : a && b, null];
    },
  },
  {
    ins: [...nibble("A"), ...nibble("B"), "Op₁", "Op₀"], outs: [...nibble("R"), "Z"], gates: ["and", "or", "nor", "alu1"], best: 8,
    nums: { ins: [["A", 4], ["B", 4], ["Op", 2]], outs: [["R", 4], ["Z", 1]] },
    want: (i) => {
      const [a, b, op] = groupsOf(i, [["A", 4], ["B", 4], ["Op", 2]]);
      const r = ALU_OPS(op, a, b);
      return [...bitsOfNum(r, 4), r === 0];
    },
    show: [[12, 10, 0], [12, 10, 1], [6, 7, 2], [6, 7, 3], [5, 5, 3], [9, 3, 2]].map((v) => pack([4, 4, 2], v)),
  },
  {
    ins: [...nibble("D"), "Load", "Clk"], outs: nibble("Q"), gates: ["dff", "mux"], best: 8,
    nums: { ins: [["D", 4], ["Load", 1], ["Clk", 1]], outs: [["Q", 4]] },
    steps: [[0, 0, 0], [5, 1, 0], [5, 1, 1], [9, 1, 1], [9, 0, 1], [9, 0, 0], [9, 0, 1], [9, 1, 1], [9, 1, 0], [9, 1, 1]].map((v) => pack([4, 1, 1], v)),
    want: (i, b) => {
      const [, load, clk] = groupsOf(i, [["D", 4], ["L", 1], ["C", 1]]);
      return b && !b.ins[5] && clk && load ? i.slice(0, 4) : b ? b.q : [null, null, null, null];
    },
  },
  {
    ins: ["Clk"], outs: sub("Q", [2, 1, 0]), gates: ["not", "tff"], best: 5,
    nums: { ins: [["Clk", 1]], outs: [["Q", 3]] },
    steps: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    want: ([clk], b) => (b && b.q.every((q) => q !== null) && rose(b, clk, 0) ? bitsOfNum((numOf(b.q) + 1) & 7, 3) : b ? b.q : [null, null, null]),
  },
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
/** The parts free play offers: every gate, the constant 1, and each chip whose puzzle has been passed. */
export const freeKinds = (stars: readonly number[]): GateKind[] => [...GATES, "one", ...CHIPS.filter((c) => (stars[CHIP_PINS[c].from] ?? 0) > 0)];

/** Row r of a table of n switches, the first switch the highest bit. */
export const bitsOf = (r: number, n: number) => bitsOfNum(r, n);

export type Row = { on: number; ins: boolean[]; got: boolean[]; want: (boolean | null)[] | null; steady: boolean; ok: boolean; val: Record<string, boolean> };

/** The whole table: for a truth table every setting of the switches, each from power-on; for a memory puzzle its
 * steps in turn, each settled from the one before. What the circuit gives, and what the puzzle wants. */
export function tableOf(c: Circuit, io: { ins: readonly string[]; outs: readonly string[] }, p: CircuitPuzzle | null): Row[] {
  const n = io.ins.length;
  const settings = p?.steps ?? Array.from({ length: 2 ** n }, (_, r) => r);
  let [last, before]: [Record<string, boolean>, Before | null] = [{}, null];
  return settings.map((on) => {
    const ins = bitsOf(on, n);
    const { val, steady } = settle(c, ins, io.outs.length, p?.steps ? last : {});
    const got = io.outs.map((_, k) => val[`o${k}`]);
    const want = p ? p.want(ins, before) : null;
    if (p?.steps) [last, before] = [val, { ins, q: got.map((v, k) => want?.[k] ?? v) }];
    return { on, ins, got, want, steady, val, ok: !!want && steady && got.every((v, k) => want[k] === null || v === want[k]) };
  });
}

/** Three stars for the fewest gates, two for up to two more. */
export const circuitStars = (p: CircuitPuzzle, gates: number) => (gates <= p.best ? 3 : gates <= p.best + 2 ? 2 : 1);

/** A gate's next id: one more than the highest. */
export const nextGateId = (gates: readonly Gate[]) => `g${gates.reduce((m, g) => Math.max(m, Number(g.id.slice(1))), 0) + 1}`;

/** A wire into this pin, put in place of the one there was; none from a part into itself. */
export function joined(c: Circuit, w: Wire): Wire[] {
  if (partOf(w.from) === w.to) return c.wires;
  return [...c.wires.filter((x) => !(x.to === w.to && x.pin === w.pin)), w];
}

/** The circuit without a gate and its wires. */
export const without = (c: Circuit, id: string): Circuit => ({
  gates: c.gates.filter((g) => g.id !== id),
  wires: c.wires.filter((w) => partOf(w.from) !== id && w.to !== id),
});
