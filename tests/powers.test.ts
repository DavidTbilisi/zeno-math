// Powers, roots and logs: every answer is checked against the input, numerically, on many random cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { renderPowers, type PowersTopic } from "../src/math/powers.ts";

const w = en.powersWords;
const textOf = (svg: string) =>
  [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)]
    .map((m) => m[1])
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const render = (topic: PowersTopic, src: string) => textOf(renderPowers({ topic, src }, w).svg);
const val = (s: string) => Number(s.replace(/−/g, "-"));
let seed = 11;
const rnd = (lo: number, hi: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), lo + (seed % (hi - lo + 1)));
const nz = (lo: number, hi: number) => {
  for (;;) {
    const v = rnd(lo, hi);
    if (v !== 0) return v;
  }
};
const close = (a: number, b: number, tol = 1e-4) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

/** "the start gives L, the answer gives R" (or ≈) — the two must agree. */
function agrees(shown: string, where: string) {
  const m = /the start (?:gives|≈) (\S+?),? the answer (?:gives|≈) (\S+?)\.( |$)/.exec(shown);
  assert.ok(m, `${where}: no check in “${shown.slice(-240)}”`);
  assert.ok(close(val(m[1]), val(m[2])), `${where}: ${m[1]} vs ${m[2]}`);
}

test("index laws: the simplified form equals the input", () => {
  for (let k = 0; k < 150; k++) {
    const e = () => {
      const v = nz(-4, 5);
      return v < 0 ? `(${v})` : `${v}`;
    };
    const forms = [
      `x^${e()} * x^${e()}`,
      `x^${e()} / x^${e()}`,
      `(x^${e()})^${e()}`,
      `(${nz(2, 5)}x^${e()} y)^${nz(1, 3)} / (${nz(2, 6)}x^${e()} y^${e()})`,
      `a^${e()} b^${e()} / (a^${e()} b^${e()})`,
      `${[4, 8, 9, 27, 16][rnd(0, 4)]}^(${nz(-3, 3)}/${[2, 3][rnd(0, 1)]}) * x^(1/2)`,
      `(-${nz(1, 3)}a^${e()})^${nz(1, 4)}`,
    ];
    const src = forms[k % forms.length];
    let shown: string;
    try {
      shown = render("laws", src);
    } catch (err) {
      // 9^(1/3) has no exact value: that one is left as a power, never an error.
      assert.fail(`${src}: ${(err as Error).message}`);
    }
    agrees(shown, src);
  }
  assert.match(render("laws", "x^3 / x^3"), /a⁰ = 1/);
  assert.match(render("laws", "x^5 / x^2"), /= x³/);
  assert.match(render("laws", "(-2a)^3"), /odd power: the minus stays/);
  assert.throws(() => renderPowers({ topic: "laws", src: "x^2 + x^3" }, w), /products and quotients/);
  assert.throws(() => renderPowers({ topic: "laws", src: "x^y" }, w), /Powers must be numbers/);
  assert.throws(() => renderPowers({ topic: "laws", src: "(-8)^(1/2)" }, w), /not a real number/);
});

test("scientific notation: the power of ten is where the point hops to", () => {
  for (let k = 0; k < 120; k++) {
    const digits = String(rnd(1, 999));
    const shift = rnd(-12, 12);
    const src = shift >= 0 ? digits + "0".repeat(shift) : `0.${"0".repeat(-shift)}${digits}`;
    const shown = render("sci", src);
    const n = Math.floor(Math.log10(Number(src)) + 1e-12);
    if (n === 0) assert.match(shown, /already between 1 and 10/, src);
    else assert.match(shown, new RegExp(`power of ten is ${n < 0 ? "−" : ""}${Math.abs(n)}\\.`), src);
    const m = /the start ≈ (.+?), the answer ≈ (.+?)\.( |$)/.exec(shown);
    assert.ok(m && m[1] === m[2], `${src}: ${m?.[1]} vs ${m?.[2]}`);
  }
  for (let k = 0; k < 80; k++) {
    const a = `${rnd(1, 9)}.${rnd(0, 9)}`;
    const b = `${rnd(1, 9)}.${rnd(1, 9)}`;
    const [m, n] = [rnd(-9, 9), rnd(-9, 9)];
    const op = ["×", "÷", "+", "-"][k % 4];
    const src = `(${a} × 10^${m}) ${op} (${b} × 10^${n})`;
    const shown = render("sci", src);
    const x = Number(a) * 10 ** m;
    const y = Number(b) * 10 ** n;
    const exact = op === "×" ? x * y : op === "÷" ? x / y : op === "+" ? x + y : x - y;
    const res = /the answer ≈ (.+?)\.( |$)/.exec(shown)![1];
    const [mant, pow] = res.includes("×") ? res.split(" × ") : [res, "10⁰"];
    const sup = "⁰¹²³⁴⁵⁶⁷⁸⁹";
    const e = Number(pow.slice(2).replace("⁻", "-").replace(/[⁰-⁹¹²³]/g, (c) => String(sup.indexOf(c))));
    const got = val(mant) * 10 ** e;
    assert.ok(close(got, exact, op === "÷" ? 1e-3 : 1e-6), `${src}: ${res} vs ${exact}`);
  }
  assert.match(render("sci", "45 × 10^3"), /45 is not between 1 and 10/);
  assert.match(render("sci", "(2 × 10^5) ÷ (3 × 10^-2)"), /rounded to 4 significant figures/);
  assert.throws(() => renderPowers({ topic: "sci", src: "3x" }, w), /Numbers only/);
});

test("surds: simplified, expanded and rationalised forms keep the value", () => {
  const r = () => [2, 3, 5, 6, 7, 8, 12, 18, 20, 27, 32, 45, 50, 72, 75, 98][rnd(0, 15)];
  for (let k = 0; k < 200; k++) {
    const forms = [
      `√${r()} + √${r()} - √${r()}`,
      `${nz(1, 5)}√${r()} × √${r()}`,
      `(${nz(-5, 5)} + √${r()})(${nz(-5, 5)} - √${r()})`,
      `(${nz(1, 4)} + ${nz(1, 3)}√${r()})^2`,
      `${nz(1, 9)} / √${r()}`,
      `${nz(1, 9)} / (${nz(1, 5)} + √${[2, 3, 5, 7][rnd(0, 3)]})`,
      `(√${r()} + √${r()}) / (√${[2, 3][rnd(0, 1)]} - √${[5, 7][rnd(0, 1)]})`,
      `∛${rnd(2, 500)} + ∛${[16, 54, 128, 250][rnd(0, 3)]}`,
      `√(${rnd(1, 50)}/${rnd(2, 50)})`,
      `1/√2 + 1/√8`,
    ];
    const src = forms[k % forms.length];
    agrees(render("surds", src), src);
  }
  assert.match(render("surds", "√72"), /largest square factor: 36.*outside: 2 · 3 = 6 inside: 2/);
  assert.match(render("surds", "√72"), /8² = 64 < 72 < 81 = 9²/);
  assert.match(render("surds", "2 / (3 - √5)"), /conjugate 3 \+ √5/);
  assert.throws(() => renderPowers({ topic: "surds", src: "√(-4)" }, w), /Complex numbers/);
  assert.throws(() => renderPowers({ topic: "surds", src: "√2 × ∛2" }, w), /Square and cube roots/);
  assert.throws(() => renderPowers({ topic: "surds", src: "1/(1 + √2 + √3)" }, w), /more than one conjugate/);
});

test("logarithms: exact where a power fits, change of base otherwise", () => {
  for (let k = 0; k < 150; k++) {
    const b = [2, 3, 4, 5, 8, 9, 10, 16, 27][rnd(0, 8)];
    const p = nz(-4, 4);
    const forms = [
      `log_${b}(${b ** p >= 1 ? b ** p : `1/${b ** -p}`})`,
      `log_${b}(${rnd(2, 40)}) + log_${b}(${rnd(2, 40)})`,
      `${nz(-3, 3)}log_${b}(${rnd(2, 12)}) - log_${b}(${rnd(2, 12)})`,
      `log(${10 ** Math.abs(p)}) - ln(e^${p})`,
      `log_(1/${b})(${b ** Math.abs(p)})`,
    ];
    const src = forms[k % forms.length];
    agrees(render("logs", src), src);
  }
  assert.match(render("logs", "log_9(27)"), /write both as powers of 3/);
  assert.match(render("logs", "log_3(20)"), /3² = 9 < 20 < 27 = 3³/);
  assert.throws(() => renderPowers({ topic: "logs", src: "log_2(-4)" }, w), /positive numbers/);
  assert.throws(() => renderPowers({ topic: "logs", src: "log_1(5)" }, w), /not 1/);
});

test("equations: the solution satisfies the equation, and false roots are thrown out", () => {
  for (let k = 0; k < 150; k++) {
    const b = [2, 3, 5][rnd(0, 2)];
    const [p, q, m] = [nz(-3, 3), rnd(-4, 4), rnd(-3, 4)];
    const forms = [
      `${b}^(${p}x + ${q}) = ${b ** m >= 1 ? b ** m : `1/${b ** -m}`}`,
      `${b * b}^x = ${b ** 3}^(x ${q < 0 ? "-" : "+"} ${Math.abs(q)})`,
      `${nz(2, 7)} * ${b}^x = ${rnd(3, 90)}`,
      `${b}^(${p}x) = ${[7, 11][rnd(0, 1)]}^(x + 1)`,
      `log_${b}(${nz(1, 4)}x + ${rnd(-5, 5)}) = ${rnd(0, 3)}`,
    ];
    const src = forms[k % forms.length];
    const shown = render("equations", src);
    if (/No solution|Every x/.test(shown)) continue;
    agrees(shown, src);
  }
  // x(x − 2) = 8 gives 4 and −2; −2 is outside the domain.
  const two = render("equations", "log_2(x) + log_2(x - 2) = 3");
  assert.match(two, /rejected: x = −2 ≤ 0/);
  assert.match(two, /x = 4: the start gives 3, the answer gives 3/);
  assert.match(render("equations", "log(x) + log(x + 3) = 1"), /x = 2: the start gives 1/);
  assert.match(render("equations", "2^x = -8"), /always positive/);
  assert.throws(() => renderPowers({ topic: "equations", src: "log_2(x) = log_2(-1)" }, w), /positive numbers/);
  assert.throws(() => renderPowers({ topic: "equations", src: "2^x" }, w), /one “=”/);
  assert.throws(() => renderPowers({ topic: "equations", src: "2^(x^2) = 4" }, w), /linear expression/);
});
