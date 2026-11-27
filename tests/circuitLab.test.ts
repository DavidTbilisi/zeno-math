// The circuit lab (#841): every puzzle has a circuit of its fewest gates, using only the gates it allows, that matches
// every row of its table; an empty board matches none; a loop that keeps flipping never settles; a wire into a used
// pin takes its place, and a gate taken away takes its wires.
import assert from "node:assert/strict";
import test from "node:test";
import { CIRCUIT_LADDER, circuitStars, joined, settle, tableOf, without, type Circuit, type GateKind } from "../src/math/circuitLab.ts";

/** A circuit from gates "g1:nand" and wires "i0>g1.0" (a lamp is "o0.0"). */
function circuit(gates: string[], wires: string[]): Circuit {
  return {
    gates: gates.map((s, i) => ({ id: s.split(":")[0], kind: s.split(":")[1] as GateKind, x: 100 + 60 * i, y: 100 })),
    wires: wires.map((s) => {
      const [from, to] = s.split(">");
      const [id, pin] = to.split(".");
      return { from, to: id, pin: Number(pin) };
    }),
  };
}

const SOLUTIONS: Circuit[] = [
  circuit(["g1:nand"], ["i0>g1.0", "i0>g1.1", "g1>o0.0"]),
  circuit(["g1:nand", "g2:nand"], ["i0>g1.0", "i1>g1.1", "g1>g2.0", "g1>g2.1", "g2>o0.0"]),
  circuit(["g1:nand", "g2:nand", "g3:nand"], ["i0>g1.0", "i0>g1.1", "i1>g2.0", "i1>g2.1", "g1>g3.0", "g2>g3.1", "g3>o0.0"]),
  circuit(["g1:or", "g2:and", "g3:not", "g4:and"], ["i0>g1.0", "i1>g1.1", "i0>g2.0", "i1>g2.1", "g2>g3.0", "g1>g4.0", "g3>g4.1", "g4>o0.0"]),
  circuit(["g1:xor", "g2:and"], ["i0>g1.0", "i1>g1.1", "i0>g2.0", "i1>g2.1", "g1>o0.0", "g2>o1.0"]),
  circuit(["g1:xor", "g2:xor", "g3:and", "g4:and", "g5:or"], [
    "i0>g1.0", "i1>g1.1", "g1>g2.0", "i2>g2.1", "i0>g3.0", "i1>g3.1", "g1>g4.0", "i2>g4.1", "g3>g5.0", "g4>g5.1", "g2>o0.0", "g5>o1.0",
  ]),
  circuit(["g1:not", "g2:and", "g3:and", "g4:or"], ["i2>g1.0", "i0>g2.0", "g1>g2.1", "i1>g3.0", "i2>g3.1", "g2>g4.0", "g3>g4.1", "g4>o0.0"]),
];

test("every puzzle is solved by a circuit of its fewest gates, of the kinds it allows; an empty board solves none", () => {
  assert.equal(SOLUTIONS.length, CIRCUIT_LADDER.length);
  CIRCUIT_LADDER.forEach((p, i) => {
    const c = SOLUTIONS[i];
    assert.equal(c.gates.length, p.best, `puzzle ${i + 1}`);
    assert.ok(c.gates.every((g) => p.gates.includes(g.kind)), `puzzle ${i + 1} gates`);
    const rows = tableOf(c, p, p);
    assert.equal(rows.length, 2 ** p.ins.length);
    assert.ok(rows.every((r) => r.ok), `puzzle ${i + 1}: ${JSON.stringify(rows)}`);
    assert.equal(circuitStars(p, c.gates.length), 3);
    assert.ok(!tableOf({ gates: [], wires: [] }, p, p).every((r) => r.ok), `puzzle ${i + 1} empty`);
  });
});

test("a NOT gate fed by itself never settles; one that isn't settles at once", () => {
  const loop = circuit(["g1:not"], ["g1>g1.0", "g1>o0.0"]);
  assert.equal(settle(loop, [], 1).steady, false);
  const plain = circuit(["g1:not"], ["i0>g1.0", "g1>o0.0"]);
  assert.deepEqual(settle(plain, [false], 1), { val: { i0: false, g1: true, o0: true }, steady: true });
});

test("a new wire into a used pin replaces the old one; a gate taken away takes its wires", () => {
  const c = circuit(["g1:and", "g2:or"], ["i0>g1.0", "i1>g1.1", "g1>g2.0"]);
  const w = joined(c, { from: "i1", to: "g1", pin: 0 });
  assert.deepEqual(w.filter((x) => x.to === "g1").map((x) => `${x.from}.${x.pin}`).sort(), ["i1.0", "i1.1"]);
  assert.deepEqual(without(c, "g1"), { gates: [c.gates[1]], wires: [] });
  assert.equal(circuitStars(CIRCUIT_LADDER[0], 3), 2);
  assert.equal(circuitStars(CIRCUIT_LADDER[0], 4), 1);
});
