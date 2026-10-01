// Complex numbers: the input forms parse to the right value, simple values print exactly,
// and the arithmetic pictures agree with mathjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "mathjs";
import { en } from "../src/locales/en.ts";
import { nice, parseCx, renderComplex } from "../src/math/complex.ts";

const w = en.cxWords;
const close = (z: { re: number; im: number }, re: number, im: number) => Math.abs(z.re - re) < 1e-9 && Math.abs(z.im - im) < 1e-9;

test("parsing", () => {
  const cases: [string, number, number][] = [
    ["3+4i", 3, 4], ["-1+i", -1, 1], ["2∠150°", -Math.sqrt(3), 1], ["sqrt(-4)", 0, 2], ["(1+i)^3", -2, 2],
    ["2e^(i*pi/3)", 1, Math.sqrt(3)], ["2e^(iπ/3)", 1, Math.sqrt(3)], ["−2−2√3i", -2, -2 * Math.sqrt(3)],
    ["-2-2sqrt(3)i", -2, -2 * Math.sqrt(3)], ["i", 0, 1], ["-5", -5, 0], ["cis(pi/2)", 0, 1], ["3i", 0, 3],
    ["1+sqrt(3)i", 1, Math.sqrt(3)], ["3pi/4", (3 * Math.PI) / 4, 0], ["60°", Math.PI / 3, 0],
  ];
  for (const [s, re, im] of cases) {
    const z = parseCx(s, w);
    assert.ok(close(z, re, im), `${s} gave ${z.re} + ${z.im}i`);
  }
  for (const s of ["", "3+", "abc", "4k"]) assert.throws(() => parseCx(s, w), s);
});

test("exact values", () => {
  const cases: [number, string][] = [
    [0.5, "\\frac{1}{2}"], [Math.SQRT2 / 2, "\\frac{\\sqrt{2}}{2}"], [-2 * Math.sqrt(3), "-2\\sqrt{3}"],
    [7, "7"], [Math.PI, "3.1416"], [-0.75, "-\\frac{3}{4}"],
  ];
  for (const [v, tex] of cases) assert.equal(nice(v).tex, tex, String(v));
});

test("operations agree with mathjs", () => {
  let seed = 3;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), (seed % 2001) / 100 - 10);
  for (let k = 0; k < 60; k++) {
    const [a, b, c, d] = [rnd(), rnd(), rnd(), rnd()];
    const zs = `${a}${b < 0 ? "" : "+"}${b}i`;
    const ws = `${c}${d < 0 ? "" : "+"}${d}i`;
    for (const op of ["+", "-", "*", "/"] as const) {
      const want = evaluate(`(${zs}) ${op} (${ws})`) as { re: number; im: number };
      const got = parseCx(`(${zs}) ${op} (${ws})`, w);
      assert.ok(close(got, want.re, want.im), `${zs} ${op} ${ws}`);
      const svg = renderComplex({ topic: "ops", z: zs, w: ws, op, n: "2", a: "1", b: "0", c: "1", t: "1" }, w).svg;
      assert.doesNotMatch(svg, /NaN|undefined/, `${zs} ${op} ${ws}`);
    }
  }
});

test("n-th roots raised to n give z back", () => {
  for (const [z, n] of [["-8", 3], ["16i", 4], ["1", 6], ["-1+i", 5]] as const) {
    const Z = parseCx(z, w);
    const r = Math.hypot(Z.re, Z.im) ** (1 / n);
    const t = Math.atan2(Z.im, Z.re);
    for (let k = 0; k < n; k++) {
      const a = (t + 2 * Math.PI * k) / n;
      const back = parseCx(`(${r * Math.cos(a)} + ${r * Math.sin(a)}i)^${n}`, w);
      assert.ok(Math.abs(back.re - Z.re) < 1e-6 && Math.abs(back.im - Z.im) < 1e-6, `${z}, root ${k}`);
    }
    assert.doesNotMatch(renderComplex({ topic: "roots", z, w: "1", op: "+", n: String(n), a: "1", b: "0", c: "1", t: "1" }, w).svg, /NaN/);
  }
});
