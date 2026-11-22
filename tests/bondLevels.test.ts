// Number bonds split to any depth: a part can be a bond of its own, each level gets its own row, and a one-level bond
// draws as it always did.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderModel, type BondPart, type BondSpec } from "../src/math/models.ts";

const circles = (svg: string) => (svg.match(/<circle /g) ?? []).length;
const lines = (svg: string) => (svg.match(/<line /g) ?? []).length;
const rows = (svg: string) => new Set([...svg.matchAll(/<circle cx="[^"]+" cy="([^"]+)"/g)].map((m) => m[1])).size;

test("a one-level bond: the whole, its parts and a line to each", () => {
  const r = renderModel({ type: "bond", whole: "10", parts: ["7", "?"] });
  assert.equal(circles(r.svg), 3);
  assert.equal(lines(r.svg), 2);
  assert.equal(rows(r.svg), 2);
});

test("parts split again to any depth, one row per level", () => {
  let part: BondPart = "1";
  for (let d = 0; d < 7; d++) part = { whole: String(2 ** (d + 1)), parts: [part, String(2 ** d)] };
  const spec: BondSpec = { type: "bond", whole: "256", parts: [part, "128"] };
  const r = renderModel(spec);
  // 256 → (128 → …) and 128: nine levels, two circles a level below the whole.
  assert.equal(rows(r.svg), 9);
  assert.equal(circles(r.svg), 1 + 2 * 8);
  assert.equal(lines(r.svg), 2 * 8);
  assert.ok(!/NaN/.test(r.svg));
});

test("split parts sit side by side without overlapping", () => {
  const r = renderModel({ type: "bond", whole: "100", parts: [{ whole: "60", parts: ["30", "30", "?"] }, { whole: "40", parts: ["20", "20"] }] });
  const ys = new Map<string, number[]>();
  for (const m of r.svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/g)) {
    const xs = ys.get(m[2]) ?? [];
    xs.push(Number(m[1]));
    ys.set(m[2], xs);
  }
  const bottom = [...ys.values()].find((xs) => xs.length === 5)!;
  bottom.sort((a, b) => a - b);
  for (let i = 1; i < bottom.length; i++) assert.ok(bottom[i] - bottom[i - 1] >= 80, `circles ${i - 1} and ${i} overlap`);
});
