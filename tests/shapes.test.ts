// Maths shapes: every piece builds, with finite coordinates and a sensible size, every group has pieces, and every
// piece has a name in the panel (the i18n test checks the other languages have the same names).
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { bounds, SHAPE_GROUPS, SHAPES } from "../src/math/shapes.ts";

test("ids are unique and every shape has a name", () => {
  const ids = SHAPES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(Object.keys(en.shapes.names).sort(), [...ids].sort());
  assert.deepEqual(Object.keys(en.shapes.groups), [...SHAPE_GROUPS]);
  for (const g of SHAPE_GROUPS) assert.ok(SHAPES.some((s) => s.group === g), g);
});

test("every shape builds, with finite numbers and a size that fits a board", () => {
  for (const shape of SHAPES) {
    const pieces = shape.build();
    assert.ok(pieces.length > 0, shape.id);
    for (const p of pieces) {
      const numbers = p.kind === "path" ? p.points.flat() : p.kind === "ellipse" ? [p.cx, p.cy, p.rx, p.ry] : p.kind === "rect" ? [p.x, p.y, p.w, p.h] : [p.x, p.y, p.size];
      assert.ok(numbers.every(Number.isFinite), `${shape.id}: ${JSON.stringify(p)}`);
      if (p.kind === "path") assert.ok(p.points.length >= 2, `${shape.id}: a path needs two points`);
      if (p.kind === "text") assert.ok(p.text.trim(), `${shape.id}: empty label`);
    }
    const b = bounds(pieces);
    const [w, h] = [b.x1 - b.x0, b.y1 - b.y0];
    assert.ok(Math.max(w, h) >= 20 && w <= 520 && h <= 420, `${shape.id}: ${w} × ${h}`);
  }
});

test("a shape builds the same every time", () => {
  for (const shape of SHAPES) assert.deepEqual(shape.build(), shape.build(), shape.id);
});

test("instruments measure true", () => {
  const find = (id: string) => SHAPES.find((s) => s.id === id)!.build();
  // Ruler: 10 cm at 40 px a centimetre, numbered 0 to 10.
  const ruler = find("ruler");
  const numbers = ruler.flatMap((p) => (p.kind === "text" && /^\d+$/.test(p.text) ? [p] : []));
  assert.deepEqual(numbers.map((p) => p.text), ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  assert.deepEqual(numbers.map((p) => p.x), numbers.map((_, i) => 10 + 40 * i));
  // Set squares: the angles are what the labels say.
  const corners = (id: string) => {
    const tri = find(id).find((p) => p.kind === "path" && p.closed);
    assert.ok(tri && tri.kind === "path");
    return tri.points;
  };
  const angleAt = (a: readonly number[], b: readonly number[], c: readonly number[]) => {
    const u = [a[0] - b[0], a[1] - b[1]];
    const v = [c[0] - b[0], c[1] - b[1]];
    return (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))) * 180) / Math.PI;
  };
  const [a, b, c] = corners("setSquare30");
  assert.ok(Math.abs(angleAt(b, a, c) - 60) < 1e-9 && Math.abs(angleAt(a, b, c) - 90) < 1e-9 && Math.abs(angleAt(a, c, b) - 30) < 1e-9);
  const [p, q, r] = corners("setSquare45");
  assert.ok(Math.abs(angleAt(q, p, r) - 45) < 1e-9 && Math.abs(angleAt(p, q, r) - 90) < 1e-9);
});
