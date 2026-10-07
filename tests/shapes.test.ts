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
    const pieces = shape.build(en.shapes.words);
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
  for (const shape of SHAPES) assert.deepEqual(shape.build(en.shapes.words), shape.build(en.shapes.words), shape.id);
});

test("instruments measure true", () => {
  const find = (id: string) => SHAPES.find((s) => s.id === id)!.build(en.shapes.words);
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

test("the clock and the 360° protractor read true", () => {
  const find = (id: string) => SHAPES.find((s) => s.id === id)!.build(en.shapes.words);
  const label = (pieces: ReturnType<typeof find>, t: string) => {
    const p = pieces.find((q) => q.kind === "text" && q.text === t);
    assert.ok(p && p.kind === "text", t);
    return [p.x, p.y];
  };
  // Twelve straight above three o'clock's centre line, three straight right of it, six below, nine left.
  const clock = find("clock");
  const [x12, y12] = label(clock, "12");
  const [x3, y3] = label(clock, "3");
  const [x6, y6] = label(clock, "6");
  const [x9, y9] = label(clock, "9");
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  assert.ok(close(x12, x6) && close(y3, y9) && y12 < y6 && x9 < x3 && close((x3 + x9) / 2, x12) && close((y12 + y6) / 2, y3));
  // 90° anticlockwise from the right is at the top; 270° at the bottom.
  const p = find("protractor360");
  const [, y90] = label(p, "90");
  const [, y270] = label(p, "270");
  assert.ok(y90 < y270);
});

test("nets have the surface area of their solids", () => {
  const area = (id: string) =>
    SHAPES.find((s) => s.id === id)!
      .build(en.shapes.words)
      .reduce((sum, p) => {
        // Faces are the filled parts; the centre dot is ink.
        if (p.kind === "text" || !p.fill || p.fill === "#1e1e1e") return sum;
        if (p.kind === "rect") return sum + p.w * p.h;
        if (p.kind === "ellipse") return sum + Math.PI * p.rx * p.ry;
        if (p.kind === "path" && p.closed) {
          // Shoelace formula.
          const q = p.points;
          return sum + Math.abs(q.reduce((s, [x, y], i) => s + x * q[(i + 1) % q.length][1] - q[(i + 1) % q.length][0] * y, 0)) / 2;
        }
        return sum;
      }, 0);
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  assert.ok(close(area("netCube"), 6 * 60 ** 2));
  assert.ok(close(area("netCuboid"), 2 * (120 * 60 + 120 * 80 + 60 * 80)));
  assert.ok(close(area("netPrism"), 3 * 90 * 160 + 2 * (Math.sqrt(3) / 4) * 90 ** 2));
  assert.ok(close(area("netPyramid"), 110 ** 2 + 4 * (110 * 95) / 2));
  assert.ok(close(area("netCylinder"), 2 * Math.PI * 40 * 120 + 2 * Math.PI * 40 ** 2));
});

test("pieces with words write them in the language they're given", () => {
  const words = { ...en.shapes.words, evens: "EVENS", hypotenuse: "HYP" };
  const texts = (id: string) => SHAPES.find((s) => s.id === id)!.build(words).flatMap((p) => (p.kind === "text" ? [p.text] : []));
  assert.ok(texts("probabilityScale").includes("EVENS"));
  assert.ok(texts("trigTriangle").includes("HYP"));
});

test("a number line is one line: its ticks don't draw a second one along their ends", () => {
  for (const id of ["numberLine", "numberLine01", "probabilityScale"]) {
    const pieces = SHAPES.find((s) => s.id === id)!.build(en.shapes.words);
    const rows = new Set<number>();
    for (const p of pieces) {
      if (p.kind !== "path") continue;
      p.points.forEach((a, i) => {
        const b = p.points[i + 1];
        if (b && a[1] === b[1] && a[0] !== b[0]) rows.add(a[1]);
      });
    }
    assert.equal(rows.size, 1, `${id}: horizontal lines at y = ${[...rows]}`);
  }
});
