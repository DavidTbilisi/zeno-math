// The tiny computer (#844): the book's program adds 940 into 941 in the book's six steps; every puzzle has a program
// that passes its tests; a device unplugged, or in the wrong port, makes the CPU wait; a loop that never ends fails.
import assert from "node:assert/strict";
import test from "node:test";
import { CPU_LADDER, CPU_START, check, cpuStart, mnemonic, parseCell, run, tick, type Memory } from "../src/math/cpuLab.ts";

const prog = (words: number[]): Memory => Object.fromEntries(words.map((w, k) => [0x300 + k, w]));
const SOLUTIONS = [
  [0x1940, 0x5941, 0x2941],
  [0x1940, 0x5941, 0x2942, 0],
  [0x3005, 0x5940, 0x7006],
  [0x1940, 0x7006, 0x6941, 0x2940, 0x9306, 0x8301, 0],
  [0x1941, 0x9308, 0x6943, 0x2941, 0x1942, 0x5940, 0x2942, 0x8300, 0],
  [0x1940, 0x6941, 0xa306, 0x1940, 0x2942, 0, 0x1941, 0x2942, 0],
];

test("the book's program: fetch, decode and execute, one bus transfer a step, 941 becomes 5", () => {
  const s0 = cpuStart(CPU_LADDER[0]);
  let s = { cpu: CPU_START, mem: s0.mem };
  const moves: string[] = [];
  for (let k = 0; k < 7; k++) [s] = [tick(s.cpu, s.mem, {}, [])], moves.push(s.cpu.last!);
  assert.deepEqual(moves, ["f1", "f2", "f3", "d", "addr", "read", "load"]);
  assert.equal(s.cpu.ac, 3);
  assert.equal(s.cpu.ir, 0x1940);
  assert.equal(s.cpu.pc, 0x301);
  const end = run(s0.mem, {}, []);
  assert.equal(end.cpu.halted, true);
  assert.equal(end.mem[0x941], 5);
});

test("every puzzle has a program that passes its tests, with the devices plugged in", () => {
  assert.equal(SOLUTIONS.length, CPU_LADDER.length);
  const ports = { 5: "keyboard", 6: "display" } as const;
  CPU_LADDER.forEach((p, i) => assert.equal(check(prog(SOLUTIONS[i]), ports, p), null, `puzzle ${i + 1}`));
  // An empty program halts at once and passes none that want something done.
  CPU_LADDER.slice(1).forEach((p, i) => assert.notEqual(check({}, ports, p), null, `puzzle ${i + 2} empty`));
});

test("a device not there, or in the wrong port, makes the CPU wait; a loop that never ends fails", () => {
  const io = CPU_LADDER[2];
  assert.deepEqual(check(prog(SOLUTIONS[2]), {}, io), { test: 0, why: "wait", port: 5 });
  assert.deepEqual(check(prog(SOLUTIONS[2]), { 5: "display", 6: "keyboard" }, io), { test: 0, why: "wait", port: 5 });
  assert.deepEqual(check(prog(SOLUTIONS[2]), { 5: "keyboard" }, io), { test: 0, why: "wait", port: 6 });
  assert.deepEqual(check(prog([0x8300]), {}, CPU_LADDER[1]), { test: 0, why: "loop" });
  assert.deepEqual(check(prog([0x1940, 0x2942, 0]), {}, CPU_LADDER[1]), { test: 0, why: "mem", at: 0x942, got: 3, want: 5 });
});

test("a cell takes an instruction, four hex digits as the book writes words, or a number", () => {
  assert.equal(parseCell("add 941"), 0x5941);
  assert.equal(parseCell("HALT"), 0);
  assert.equal(parseCell("1940"), 0x1940);
  assert.equal(parseCell("12"), 12);
  assert.equal(parseCell("-2"), 0xfffe);
  assert.equal(parseCell("JUMP"), null);
  assert.equal(parseCell("hello"), null);
  assert.equal(mnemonic(0xa306), "JN 306");
  assert.equal(mnemonic(0x4000), null);
});
