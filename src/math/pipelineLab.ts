// The pipeline (#858): each instruction goes through fetch, decode, execute, memory and write-back, one stage a tick,
// and a new one starts every tick. An instruction that reads a register an earlier one writes must not read it too
// soon: without forwarding it decodes no earlier than the writer's write-back; with a forwarding wire it executes the
// tick after the writer executes (after its memory stage, for a load). Bubbles (stalls) push it later. A jump decided in
// execute flushes the two instructions fetched behind it (Stallings 14.4, 15.5; Tanenbaum 4.5).
import type { GameBase } from "./ladder";

export const STAGES = ["F", "D", "X", "M", "W"] as const;
export type Instr = { op: "ADD" | "SUB" | "AND" | "OR" | "LOAD" | "JUMP"; dst: number | null; src: number[]; to?: number };
export const text = (x: Instr) =>
  x.op === "LOAD" ? `LOAD R${x.dst}, [A]` : x.op === "JUMP" ? `JUMP L` : `${x.op} R${x.dst}, R${x.src[0]}, R${x.src[1]}`;

/** Fetch ticks: in program order (`order`, ids), one a tick plus each one's bubbles. */
export function starts(order: readonly number[], bubbles: readonly number[]): number[] {
  const s: number[] = [];
  order.forEach((id, k) => (s[id] = (k ? s[order[k - 1]] + 1 : 0) + (bubbles[id] ?? 0)));
  return s;
}
/** Each read of a register paired with the nearest earlier instruction (in this order) that writes it. */
export function needs(prog: readonly Instr[], order: readonly number[]): { from: number; to: number; reg: number }[] {
  return order.flatMap((id, k) =>
    prog[id].src.flatMap((reg) => {
      const from = order.slice(0, k).reverse().find((j) => prog[j].dst === reg);
      return from === undefined ? [] : [{ from, to: id, reg }];
    }),
  );
}
/** How many ticks after its writer an instruction may be fetched. */
export const gapOf = (writer: Instr, forwarded: boolean) => (!forwarded ? 3 : writer.op === "LOAD" ? 2 : 1);
export type Fwd = "none" | "wires" | "all";
export const forwarded = (fwd: Fwd, wires: readonly (readonly [number, number])[], from: number, to: number) =>
  fwd === "all" || (fwd === "wires" && wires.some(([a, b]) => a === from && b === to));

/** The tick (from 0) a value is first there for a reader, and the tick the reader wants it: its decode, or its execute when forwarded. */
export const readyWant = (writer: Instr, sFrom: number, sTo: number, fw: boolean) => ({ ready: sFrom + (fw ? (writer.op === "LOAD" ? 4 : 3) : 4), want: sTo + (fw ? 2 : 1) });
export function hazards(prog: readonly Instr[], order: readonly number[], bubbles: readonly number[], fwd: Fwd, wires: readonly (readonly [number, number])[]) {
  const s = starts(order, bubbles);
  return needs(prog, order).filter((n) => s[n.to] - s[n.from] < gapOf(prog[n.from], forwarded(fwd, wires, n.from, n.to)));
}
/** Ticks until the last instruction writes back. */
export const ticksOf = (order: readonly number[], bubbles: readonly number[]) => Math.max(...order.map((id) => starts(order, bubbles)[id])) + STAGES.length;
/** The fewest bubbles that clear every hazard, instruction by instruction. */
export function leastBubbles(prog: readonly Instr[], order: readonly number[], fwd: Fwd, wires: readonly (readonly [number, number])[]): number[] {
  const b = prog.map(() => 0);
  const ns = needs(prog, order);
  const s: number[] = [];
  order.forEach((id, k) => {
    const plain = k ? s[order[k - 1]] + 1 : 0;
    const at = Math.max(plain, ...ns.filter((n) => n.to === id).map((n) => s[n.from] + gapOf(prog[n.from], forwarded(fwd, wires, n.from, n.to))));
    b[id] = at - plain;
    s[id] = at;
  });
  return b;
}
/** A new order keeps the meaning if no two instructions that touch a common register (one writing it) swapped. */
export function legal(prog: readonly Instr[], order: readonly number[]): { a: number; b: number } | null {
  const pos = (id: number) => order.indexOf(id);
  for (let a = 0; a < prog.length; a++)
    for (let b = a + 1; b < prog.length; b++) {
      if (pos(a) < pos(b)) continue;
      const [x, y] = [prog[a], prog[b]];
      const clash = (x.dst !== null && (y.src.includes(x.dst) || y.dst === x.dst)) || (y.dst !== null && x.src.includes(y.dst));
      if (clash) return { a, b };
    }
  return null;
}

const ADD = (d: number, a: number, b: number): Instr => ({ op: "ADD", dst: d, src: [a, b] });
const SUB = (d: number, a: number, b: number): Instr => ({ op: "SUB", dst: d, src: [a, b] });
const OR = (d: number, a: number, b: number): Instr => ({ op: "OR", dst: d, src: [a, b] });
const AND = (d: number, a: number, b: number): Instr => ({ op: "AND", dst: d, src: [a, b] });
const LOAD = (d: number): Instr => ({ op: "LOAD", dst: d, src: [] });

export type PipePuzzle = { goal: "stall" | "forward" | "reorder" | "jump"; prog: readonly Instr[]; fwd: Fwd; bubbles: readonly number[] };
export const PIPE_LADDER: readonly PipePuzzle[] = [
  { goal: "stall", prog: [ADD(1, 2, 3), SUB(4, 1, 5), AND(6, 7, 8)], fwd: "none", bubbles: [0, 0, 0] },
  { goal: "forward", prog: [ADD(1, 2, 3), SUB(4, 1, 5), OR(6, 4, 2)], fwd: "wires", bubbles: [0, 2, 2] },
  { goal: "reorder", prog: [LOAD(1), ADD(2, 1, 3), SUB(4, 5, 6)], fwd: "all", bubbles: [0, 1, 0] },
  { goal: "jump", prog: [ADD(1, 2, 3), { op: "JUMP", dst: null, src: [], to: 4 }, SUB(4, 5, 6), OR(7, 8, 9), AND(1, 1, 2)], fwd: "all", bubbles: [0, 0, 0, 0, 0] },
];
/** In the jump puzzle: the instructions fetched behind the jump before it executes, that never run. */
export const wrongPath = (p: PipePuzzle) => {
  const j = p.prog.findIndex((x) => x.op === "JUMP");
  return j < 0 ? [] : p.prog.map((_, i) => i).filter((i) => i > j && i < p.prog[j].to!).slice(0, 2);
};
/** The fewest ticks this puzzle can take: by bubbles alone, with wires on every need, or over every legal order. */
export function bestTicks(p: PipePuzzle): number {
  const ids = p.prog.map((_, i) => i);
  if (p.goal === "forward") {
    const all = needs(p.prog, ids).map((n) => [n.from, n.to] as const);
    return ticksOf(ids, leastBubbles(p.prog, ids, "wires", all));
  }
  if (p.goal === "reorder") {
    const perms = (xs: number[]): number[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x) => perms(xs.filter((y) => y !== x)).map((r) => [x, ...r])));
    return Math.min(...perms(ids).filter((o) => !legal(p.prog, o)).map((o) => ticksOf(o, leastBubbles(p.prog, o, p.fwd, []))));
  }
  return ticksOf(ids, leastBubbles(p.prog, ids, p.fwd, []));
}

export const PIPE_NOTICES = ["stall", "forward", "loadUse"] as const;
export type PipeNotice = (typeof PIPE_NOTICES)[number];

export type LivePipe = GameBase<PipeNotice> & {
  mode: "puzzle" | "free";
  order: number[];
  bubbles: number[];
  wires: [number, number][];
  fwd: Fwd;
  flushed: number[];
  misses: number;
  done: boolean;
};
export const pipePuzzleOf = (s: Pick<LivePipe, "mode" | "stage">) => (s.mode === "puzzle" ? PIPE_LADDER[s.stage] ?? null : null);
/** Free play: the forwarding program, forwarding off, every bubble out. */
export const FREE_PROG = PIPE_LADDER[1].prog;
export function pipeStart(p: PipePuzzle | null): Pick<LivePipe, "order" | "bubbles" | "wires" | "fwd" | "flushed" | "misses" | "done"> {
  const prog = p?.prog ?? FREE_PROG;
  return { order: prog.map((_, i) => i), bubbles: [...(p?.bubbles ?? prog.map(() => 0))], wires: [], fwd: p?.fwd ?? "none", flushed: [], misses: 0, done: false };
}
export const PIPE_START: LivePipe = { mode: "puzzle", stage: 0, said: null, ...pipeStart(PIPE_LADDER[0]) };
export const starsFor = (misses: number) => (misses === 0 ? 3 : misses <= 2 ? 2 : 1);
