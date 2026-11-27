// A tiny computer (#844), after Stallings' hypothetical machine (Computer Organization and Architecture, Fig. 3.4):
// 16-bit words shown in hex, a 4-bit opcode and a 12-bit address, one accumulator AC. Programs and data share the
// memory, so a program can change itself. The CPU works in small steps, each one transfer along a bus: fetch (MAR ← PC,
// MBR ← memory, IR ← MBR and PC + 1), decode, then execute. Devices are plugged into numbered ports of the I/O module:
// IN reads the keyboard on its port, OUT writes to the display on its port, and a device that isn't there makes the
// CPU wait. A puzzle is a program to run or to write, checked on its own test data.
import type { GameBase } from "./ladder";

/** Opcode → name. 1, 2 and 5 are the book's; 3 and 7 its I/O (problem 3.1); the rest ours. */
export const OPS = { 0: "HALT", 1: "LOAD", 2: "STORE", 3: "IN", 5: "ADD", 6: "SUB", 7: "OUT", 8: "JUMP", 9: "JZ", 10: "JN" } as const;
export type OpName = (typeof OPS)[keyof typeof OPS];
export const OP_CODE = Object.fromEntries(Object.entries(OPS).map(([k, v]) => [v, Number(k)])) as Record<OpName, number>;
/** The order of the tray. */
export const OP_TRAY: readonly OpName[] = ["LOAD", "STORE", "ADD", "SUB", "IN", "OUT", "JUMP", "JZ", "JN", "HALT"];

/** The memory shown: the program's cells and the data's. */
export const PROGRAM = Array.from({ length: 16 }, (_, k) => 0x300 + k);
export const DATA = Array.from({ length: 8 }, (_, k) => 0x940 + k);
export const PORTS = [5, 6, 7] as const;
export type Device = "keyboard" | "display";
export const DEVICES: readonly Device[] = ["keyboard", "display"];

export const hex = (v: number, n = 4) => (v & (16 ** n - 1)).toString(16).toUpperCase().padStart(n, "0");
/** A word read as a signed number (the top bit the sign, as twos complement). */
export const signed = (v: number) => ((v & 0xffff) ^ 0x8000) - 0x8000;
export const opOf = (w: number) => (w >> 12) & 15;
export const addrOf = (w: number) => w & 0xfff;
export const word = (op: number, addr: number) => ((op & 15) << 12) | (addr & 0xfff);
/** A word as an instruction, if its opcode is one: "ADD 941", "HALT". */
export function mnemonic(w: number): string | null {
  const name = (OPS as Record<number, OpName>)[opOf(w)];
  if (!name) return null;
  return name === "HALT" ? name : `${name} ${hex(addrOf(w), 3)}`;
}

/** What was typed into a cell: an instruction ("add 941"), four hex digits ("5941", as the book writes words), or a
 * number ("12", "-3"). Null if it is none of these. */
export function parseCell(s: string): number | null {
  const t = s.trim().toUpperCase();
  const m = /^([A-Z]+)\s*([0-9A-F]{1,3})?$/.exec(t);
  if (m && m[1] in OP_CODE) return m[1] === "HALT" ? 0 : m[2] ? word(OP_CODE[m[1] as OpName], parseInt(m[2], 16)) : null;
  if (/^[0-9A-F]{4}$/.test(t)) return parseInt(t, 16);
  if (/^-?\d{1,5}$/.test(t)) {
    const v = Number(t);
    return v >= -32768 && v <= 65535 ? v & 0xffff : null;
  }
  return null;
}

/** Where the CPU is in its cycle: three fetch steps, decode, up to three execute steps. */
export type Phase = "f1" | "f2" | "f3" | "d" | "x1" | "x2" | "x3";
export type Cpu = {
  pc: number;
  ir: number;
  ac: number;
  mar: number;
  mbr: number;
  phase: Phase;
  halted: boolean;
  /** The port the CPU is waiting on, for a device that isn't there. */
  wait: number | null;
  /** What the last step did, to light it up: a key of the words' `moves`. */
  last: Move | null;
  /** What the display has shown, and how many keys have been read. */
  shown: number[];
  read: number;
};
export type Move = "f1" | "f2" | "f3" | "d" | "load" | "addr" | "read" | "alu" | "toMbr" | "write" | "in" | "out" | "jump" | "stay" | "halt" | "wait";
export type Memory = Record<number, number>;
export type Ports = Partial<Record<number, Device>>;

export const CPU_START: Cpu = { pc: 0x300, ir: 0, ac: 0, mar: 0, mbr: 0, phase: "f1", halted: false, wait: null, last: null, shown: [], read: 0 };

/** One step of the cycle: the CPU and memory after it. `keys` are what the keyboard has to give. */
export function tick(c: Cpu, mem: Memory, ports: Ports, keys: readonly number[]): { cpu: Cpu; mem: Memory } {
  if (c.halted) return { cpu: c, mem };
  const at = (a: number) => mem[a & 0xfff] ?? 0;
  const next = (cpu: Partial<Cpu>, phase: Phase, last: Move, m = mem) => ({ cpu: { ...c, wait: null, ...cpu, phase, last }, mem: m });
  const op = opOf(c.ir);
  switch (c.phase) {
    case "f1": return next({ mar: c.pc }, "f2", "f1");
    case "f2": return next({ mbr: at(c.mar) }, "f3", "f2");
    case "f3": return next({ ir: c.mbr, pc: (c.pc + 1) & 0xfff }, "d", "f3");
    case "d":
      // Decoding: an opcode that isn't one stops the machine, as HALT does.
      if (!(op in OPS) || op === 0) return { cpu: { ...c, phase: "f1", halted: true, last: "halt" }, mem };
      return next({}, "x1", "d");
    case "x1": {
      const a = addrOf(c.ir);
      if (op === 1 || op === 5 || op === 6 || op === 2) return next({ mar: a }, "x2", "addr");
      if (op === 8) return next({ pc: a }, "f1", "jump");
      if (op === 9 || op === 10) {
        const go = op === 9 ? (c.ac & 0xffff) === 0 : (c.ac & 0x8000) !== 0;
        return next(go ? { pc: a } : {}, "f1", go ? "jump" : "stay");
      }
      if (op === 3) {
        if (ports[a] !== "keyboard" || c.read >= keys.length) return { cpu: { ...c, wait: a, last: "wait" }, mem };
        return next({ ac: keys[c.read] & 0xffff, read: c.read + 1 }, "f1", "in");
      }
      // OUT
      if (ports[a] !== "display") return { cpu: { ...c, wait: a, last: "wait" }, mem };
      return next({ shown: [...c.shown, signed(c.ac)] }, "f1", "out");
    }
    case "x2":
      if (op === 2) return next({ mbr: c.ac }, "x3", "toMbr");
      return next({ mbr: at(c.mar) }, "x3", "read");
    case "x3":
      if (op === 2) return next({}, "f1", "write", { ...mem, [c.mar]: c.mbr });
      if (op === 1) return next({ ac: c.mbr }, "f1", "load");
      return next({ ac: (op === 5 ? c.ac + c.mbr : c.ac - c.mbr) & 0xffff }, "f1", "alu");
  }
}

/** Run until it halts, waits for a device, or takes too long (a loop that never ends). */
export function run(mem: Memory, ports: Ports, keys: readonly number[], limit = 20000): { cpu: Cpu; mem: Memory; ticks: number } {
  let s = { cpu: CPU_START, mem };
  let ticks = 0;
  while (!s.cpu.halted && s.cpu.wait === null && ticks < limit) [s, ticks] = [tick(s.cpu, s.mem, ports, keys), ticks + 1];
  return { ...s, ticks };
}

export type CpuTest = { data: Memory; keys?: readonly number[]; mem?: Memory; shown?: readonly number[] };
export type CpuPuzzle = {
  /** The program it starts with: the book's, or blank to be written. */
  program: readonly number[];
  tests: readonly CpuTest[];
  /** What is plugged in at the start. */
  ports: Ports;
};

export const CPU_LADDER: readonly CpuPuzzle[] = [
  // The book's program (Fig. 3.5): add the word at 940 into 941.
  { program: [0x1940, 0x5941, 0x2941], tests: [{ data: { 0x940: 3, 0x941: 2 }, mem: { 0x941: 5 } }], ports: {} },
  // Write it: 942 = 940 + 941.
  { program: [], tests: [{ data: { 0x940: 3, 0x941: 2 }, mem: { 0x942: 5 } }, { data: { 0x940: 7, 0x941: 8 }, mem: { 0x942: 15 } }, { data: { 0x940: 100, 0x941: 23 }, mem: { 0x942: 123 } }], ports: {} },
  // The book's problem 3.1: a key from device 5, plus 940, to device 6. The program is given; plug the devices in.
  { program: [0x3005, 0x5940, 0x7006], tests: [{ data: { 0x940: 2 }, keys: [3], shown: [5] }, { data: { 0x940: 10 }, keys: [7], shown: [17] }], ports: {} },
  // Count down on the display from the number at 940 to 1 (941 holds 1).
  { program: [], tests: [3, 5, 1].map((n) => ({ data: { 0x940: n, 0x941: 1 }, shown: Array.from({ length: n }, (_, k) => n - k) })), ports: { 6: "display" } },
  // Multiply by adding: 942 = 940 × 941 (943 holds 1).
  { program: [], tests: [[3, 4], [0, 5], [7, 0], [6, 1]].map(([a, b]) => ({ data: { 0x940: a, 0x941: b, 0x943: 1 }, mem: { 0x942: a * b } })), ports: {} },
  // The larger: 942 = the larger of 940 and 941.
  { program: [], tests: [[3, 8], [9, 2], [4, 4], [0, 6]].map(([a, b]) => ({ data: { 0x940: a, 0x941: b }, mem: { 0x942: Math.max(a, b) } })), ports: {} },
];

/** A program and a test's data in one memory. */
export function memoryFor(program: Memory, test: CpuTest): Memory {
  const mem: Memory = {};
  for (const a of PROGRAM) if (program[a]) mem[a] = program[a];
  return { ...mem, ...test.data };
}

/** The first test a program fails, and why; null when it passes them all. */
export type Failed = { test: number; why: "loop" | "wait" | "mem" | "shown"; at?: number; got?: number; want?: number; port?: number };
export function check(program: Memory, ports: Ports, p: CpuPuzzle): Failed | null {
  for (const [k, t] of p.tests.entries()) {
    const r = run(memoryFor(program, t), ports, t.keys ?? []);
    if (r.cpu.wait !== null) return { test: k, why: "wait", port: r.cpu.wait };
    if (!r.cpu.halted) return { test: k, why: "loop" };
    for (const [a, v] of Object.entries(t.mem ?? {}))
      if (signed(r.mem[Number(a)] ?? 0) !== v) return { test: k, why: "mem", at: Number(a), got: signed(r.mem[Number(a)] ?? 0), want: v };
    if (t.shown && (r.cpu.shown.length !== t.shown.length || r.cpu.shown.some((v, i) => v !== t.shown![i]))) return { test: k, why: "shown" };
  }
  return null;
}

export const CPU_NOTICES = ["selfChange", "wait"] as const;
export type CpuNotice = (typeof CPU_NOTICES)[number];

export type LiveCpu = GameBase<CpuNotice> & {
  mode: "puzzle" | "free";
  /** The words in memory, program and data, as they are now. */
  mem: Memory;
  /** The program as written, before running changed anything: what the tests are run on. */
  program: Memory;
  cpu: Cpu;
  ports: Ports;
  /** The cell picked for typing into. */
  sel: number | null;
  done: boolean;
};

/** A puzzle's start: its program and its first test's data in memory, its devices plugged in. */
export function cpuStart(p: CpuPuzzle | null): Pick<LiveCpu, "mem" | "program" | "cpu" | "ports" | "sel" | "done"> {
  const program: Memory = {};
  (p?.program ?? []).forEach((w, k) => (program[0x300 + k] = w));
  return { program, mem: p ? memoryFor(program, p.tests[0]) : { ...program }, cpu: CPU_START, ports: { ...(p?.ports ?? { 5: "keyboard", 6: "display" }) }, sel: null, done: false };
}

export const CPU_START_STATE: LiveCpu = { mode: "puzzle", stage: 0, said: null, ...cpuStart(CPU_LADDER[0]) };
export const cpuPuzzleOf = (s: Pick<LiveCpu, "mode" | "stage">) => (s.mode === "puzzle" ? CPU_LADDER[s.stage] ?? null : null);
/** The keys the keyboard types: the first test's in a puzzle, a few in free play. */
export const keysOf = (p: CpuPuzzle | null) => (p ? p.tests[0].keys ?? [] : [3, 4, 5, 6, 7, 8, 9]);
