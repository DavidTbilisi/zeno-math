// Sequences and series: every term, sum, limit and "first n" the tool states is checked against brute force on random
// cases — adding the terms one by one, iterating the recurrence, trying n = 1, 2, 3, … in turn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { renderSequences, type SeqTopic } from "../src/math/sequences.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const w = en.seqWords;
const textOf = (svg: string) =>
  [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)]
    .map((m) => m[1])
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
const render = (topic: SeqTopic, src: string) => textOf(renderSequences({ topic, src }, w).svg);

let seed = 7;
const rnd = (lo: number, hi: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), lo + (seed % (hi - lo + 1)));
const nz = (lo: number, hi: number) => {
  for (;;) {
    const v = rnd(lo, hi);
    if (v) return v;
  }
};
const close = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n: number) => String(n).replace(/\d/g, (d) => SUB[Number(d)]);

/** "−3/4", "1536", "≈ 1.153e+18" → a number. */
function val(str: string): number {
  const t = str.replace("≈", "").replace(/−/g, "-").trim();
  const m = /^(-?[\d.]+(?:e[+-]?\d+)?)(?:\/(\d+))?$/.exec(t);
  assert.ok(m, `not a number: ${str}`);
  return Number(m[1]) / (m[2] ? Number(m[2]) : 1);
}
/** The value stated for a name such as "u₂₀" or "S₈" (not the "u₁ + u₂₀" label of the picture). */
function stated(text: string, name: string): number {
  const m = new RegExp(`(?<!\\+ )${name} [=≈] (\\S+?)\\.?(?: |$)`).exec(text);
  assert.ok(m, `${name} not in: ${text}`);
  return val(m[1]);
}
function grab(text: string, re: RegExp): RegExpExecArray {
  const m = re.exec(text);
  assert.ok(m, `${re} not in: ${text}`);
  return m;
}

test("arithmetic: terms, sums, which term, the first n past a bound", () => {
  for (let k = 0; k < 14; k++) {
    const [a, d] = [rnd(-20, 30), nz(-7, 9)];
    const u = (n: number) => a + (n - 1) * d;
    const S = (n: number) => (n * (2 * a + (n - 1) * d)) / 2;
    const n = rnd(5, 60);
    const target = u(rnd(3, 40));
    const bound = d > 0 ? rnd(100, 900) : -rnd(100, 900);
    const op = d > 0 ? ">" : "<";
    const shown = render("arith", `${a}, ${a + d}, ${a + 2 * d}, …; u${n}; S${n}; = ${target}; un ${op} ${bound}`);
    assert.equal(stated(shown, `u${sub(n)}`), u(n), shown);
    assert.equal(stated(shown, `S${sub(n)}`), S(n), shown);
    const which = Number(grab(shown, /is term number (\d+)/)[1]);
    assert.equal(u(which), target);
    const first = Number(grab(shown, /The first such term is u([₀-₉]+)/)[1].replace(/[₀-₉]/g, (c) => String(SUB.indexOf(c))));
    const ok = (m: number) => (op === ">" ? u(m) > bound : u(m) < bound);
    assert.ok(ok(first) && (first === 1 || !ok(first - 1)), `${shown}: first ${first}`);
  }
});

test("arithmetic: two facts give a and d; the first sum past a bound", () => {
  for (let k = 0; k < 10; k++) {
    const [a, d] = [rnd(-10, 20), nz(-5, 8)];
    const u = (n: number) => a + (n - 1) * d;
    const S = (n: number) => (n * (2 * a + (n - 1) * d)) / 2;
    const [p, q] = [rnd(1, 6), rnd(7, 14)];
    const facts = k % 2 ? `u${p} = ${u(p)}, u${q} = ${u(q)}` : `u${p} = ${u(p)}, S${q} = ${S(q)}`;
    const shown = render("arith", `${facts}; u30`);
    assert.equal(stated(shown, "u₃₀"), u(30), `${facts} → ${shown}`);
    if (a > 0 && d > 0) {
      const v = rnd(200, 2000);
      const s = render("arith", `a = ${a}, d = ${d}; Sn > ${v}`);
      const n = Number(grab(s, /n = (\d+) is the first/)[1]);
      assert.ok(S(n) > v && S(n - 1) <= v, s);
    }
  }
});

test("geometric: terms, sums, sums to infinity, the first n past a bound", () => {
  const ratios: [number, number][] = [[2, 1], [3, 1], [-2, 1], [1, 2], [-1, 2], [2, 3], [3, 2], [-1, 3]];
  for (let k = 0; k < 16; k++) {
    const [p, q] = ratios[k % ratios.length];
    const r = p / q;
    const a = nz(-3, 4) * q ** 4;
    const u = (n: number) => a * r ** (n - 1);
    const S = (n: number) => (r === 1 ? a * n : (a * (1 - r ** n)) / (1 - r));
    const n = rnd(3, 12);
    const terms = [0, 1, 2].map((i) => a * p ** i * q ** (4 - i) / q ** 4);
    const shown = render("geom", `${terms.join(", ")}, …; u${n}; S${n}`);
    assert.ok(close(stated(shown, `u${sub(n)}`), u(n)), shown);
    assert.ok(close(stated(shown, `S${sub(n)}`), S(n)), shown);
    if (Math.abs(r) < 1) assert.ok(close(val(grab(shown, /S∞ = (\S+) \(the green line\)/)[1]), a / (1 - r)), shown);
    else assert.doesNotMatch(shown, /S∞/);
    if (a > 0 && r > 1) {
      const v = a * rnd(20, 5000);
      const s = render("geom", `a = ${a}, r = ${r}; un > ${v}; Sn > ${v}`);
      const m = Number(grab(s, /The first such term is u([₀-₉]+)/)[1].replace(/[₀-₉]/g, (c) => String(SUB.indexOf(c))));
      assert.ok(u(m) > v && (m === 1 || u(m - 1) <= v), s);
      const ns = Number(grab(s, /n = (\d+) is the first/)[1]);
      assert.ok(S(ns) > v && (ns === 1 || S(ns - 1) <= v), s);
    }
  }
});

test("geometric: a and r from two terms, or from the sum to infinity", () => {
  for (let k = 0; k < 8; k++) {
    const a = nz(-4, 5);
    const r = [2, 3, -2, -3][k % 4];
    const [p, q] = [rnd(1, 3), rnd(4, 6)];
    const shown = render("geom", `u${p} = ${a * r ** (p - 1)}, u${q} = ${a * r ** (q - 1)}; u8`);
    const got = stated(shown, "u₈");
    // With an even gap, −r fits too: the tool takes the positive ratio and says so.
    if ((q - p) % 2 === 0) {
      const r2 = Math.abs(r);
      assert.equal(got, ((a * r ** (p - 1)) / r2 ** (p - 1)) * r2 ** 7, shown);
      assert.match(shown, /fits as well/);
    } else assert.equal(got, a * r ** 7, shown);
  }
  const s = render("geom", "a = 4, S∞ = 12; S5");
  assert.equal(grab(s, /S₅ = (\S+)/)[1], "844/81");
});

test("find the rule: polynomials, geometric, recurrences", () => {
  for (let k = 0; k < 12; k++) {
    const cs = [rnd(-9, 9), rnd(-9, 9), k % 3 >= 1 ? nz(-4, 4) : 0, k % 3 === 2 ? nz(-2, 2) : 0];
    const f = (n: number) => cs[0] + cs[1] * n + cs[2] * n * n + cs[3] * n ** 3;
    if (cs[1] === 0 && cs[2] === 0 && cs[3] === 0) continue;
    const m = 6;
    const q = rnd(10, 40);
    const shown = render("pattern", `${Array.from({ length: m }, (_, i) => f(i + 1)).join(", ")}; u${q}`);
    const next = grab(shown, /The next terms: ([^.]+)\./)[1].split(", ").map(val);
    assert.deepEqual(next, [f(m + 1), f(m + 2), f(m + 3)], shown);
    assert.equal(stated(shown, `u${sub(q)}`), f(q), shown);
  }
  for (const [list, next] of [
    ["3, 6, 12, 24", [48, 96, 192]],
    ["1, 1, 2, 3, 5", [8, 13, 21]],
    ["2, 5, 11, 23", [47, 95, 191]],
    ["1, 3, 7, 15, 31", [63, 127, 255]],
    ["1, -2, 4, -8", [16, -32, 64]],
  ] as const) {
    const shown = render("pattern", list);
    assert.deepEqual(grab(shown, /The next terms: ([^.]+)\./)[1].split(", ").map(val), next, shown);
  }
  assert.match(render("pattern", "2, 3, 5, 7, 11, 13"), /No simple rule/);
});

test("Σ: standard results, geometric parts and telescoping match adding the terms", () => {
  for (let k = 0; k < 14; k++) {
    const cs = [rnd(-6, 6), rnd(-6, 6), rnd(-3, 3), k % 2 ? rnd(-2, 2) : 0];
    const [lo, hi] = [rnd(0, 6), rnd(10, 40)];
    const f = (x: number) => cs[0] + cs[1] * x + cs[2] * x * x + cs[3] * x ** 3;
    let want = 0;
    for (let x = lo; x <= hi; x++) want += f(x);
    const body = `${cs[3]}k^3 + ${cs[2]}k^2 + ${cs[1]}k + ${cs[0]}`.replace(/\+ -/g, "- ");
    const shown = render("sigma", `sum k=${lo}..${hi} (${body})`);
    assert.equal(val(grab(shown, /Σ = (\S+)/)[1]), want, `${body}, ${lo}..${hi}: ${shown}`);
    // With n as the upper limit the formula agrees with the first two terms.
    const sym = render("sigma", `sum k=${lo}..n (${body})`);
    const m = grab(sym, /formula gives (\S+), the same as (\S+) \+ (\S+?)\./);
    assert.equal(val(m[1]), f(lo) + f(lo + 1), sym);
  }
  for (let k = 0; k < 6; k++) {
    const [c, base, lo, hi] = [nz(-3, 4), [2, 3, -2][k % 3], rnd(0, 3), rnd(5, 12)];
    let want = 0;
    for (let x = lo; x <= hi; x++) want += c * base ** x;
    const shown = render("sigma", `sum k=${lo}..${hi} ${c}*(${base})^k + k`);
    let extra = 0;
    for (let x = lo; x <= hi; x++) extra += x;
    assert.equal(val(grab(shown, /Σ = (\S+)/)[1]), want + extra, shown);
  }
  for (const [m, q, s] of [[1, 1, 0], [2, 1, 0], [1, 2, -1], [3, 1, 1], [1, 3, 1]] as const) {
    // c / ((q k + s)(q k + s + q m)) from k = 1.
    const c = rnd(1, 5);
    const N = rnd(5, 30);
    let want = 0;
    for (let k = 1; k <= N; k++) want += c / ((q * k + s) * (q * k + s + q * m));
    const den = `(${q}k + ${s})(${q}k + ${s + q * m})`;
    const shown = render("sigma", `sum k=1..${N} ${c}/(${den})`);
    assert.ok(close(val(grab(shown, /Σ = (\S+)/)[1]), want), `${den}: ${shown}`);
    let inf = 0;
    for (let k = 1; k <= 200000; k++) inf += c / ((q * k + s) * (q * k + s + q * m));
    assert.ok(close(val(grab(render("sigma", `sum k=1..∞ ${c}/(${den})`), /Σ = (\S+)/)[1]), inf, 1e-4), den);
  }
});

test("Σ: series written out", () => {
  for (let k = 0; k < 6; k++) {
    const [a, d, n] = [rnd(-5, 10), nz(-4, 6), rnd(5, 40)];
    const terms = [0, 1, 2].map((i) => a + i * d).join(" + ").replace(/\+ -/g, "- ");
    const shown = render("sigma", `${terms} + … + ${a + (n - 1) * d}`);
    assert.equal(val(grab(shown, /Σ = (\S+)/)[1]), (n * (2 * a + (n - 1) * d)) / 2, shown);
  }
  assert.equal(val(grab(render("sigma", "2 + 6 + 18 + … + 4374"), /Σ = (\S+)/)[1]), 6560);
  assert.equal(val(grab(render("sigma", "27 - 9 + 3 - 1 + …"), /Σ = (\S+)/)[1]), 81 / 4);
  assert.match(render("sigma", "sum k=1..∞ k^2"), /diverges/);
});

test("recurrences: terms, limits, closed forms", () => {
  for (let k = 0; k < 8; k++) {
    const [p, q, u1] = [[1, 2], [-1, 3], [3, 4], [2, 1], [-2, 1], [1, 1]][k % 6], c = nz(-6, 6), start = rnd(-5, 5);
    const pv = p / q;
    const it = (n: number) => {
      let x = start;
      for (let i = 1; i < n; i++) x = pv * x + c;
      return x;
    };
    void u1;
    const n = rnd(5, 25);
    const shown = render("recur", `u(n+1) = ${p}/${q} u(n) + ${c}; u(1) = ${start}; u(${n})`);
    assert.ok(close(stated(shown, `u${sub(n)}`), it(n), 1e-6), shown);
    if (Math.abs(pv) < 1) assert.ok(close(val(grab(shown, /approach (\S+?)\.( |$)/)[1]), c / (1 - pv), 1e-6), shown);
    else if (Math.abs(pv) > 1 && start !== c / (1 - pv)) assert.match(shown, /without bound/);
  }
  for (let k = 0; k < 6; k++) {
    const [p, q] = [nz(-3, 3), nz(-3, 3)];
    const [a, b] = [rnd(-5, 5), rnd(-5, 5)];
    const xs = [a, b];
    for (let i = 2; i < 15; i++) xs.push(p * xs[i - 1] + q * xs[i - 2]);
    const shown = render("recur", `u(n+2) = ${p}u(n+1) + ${q}u(n); u(1) = ${a}; u(2) = ${b}; u(15)`);
    assert.equal(stated(shown, "u₁₅"), xs[14], shown);
  }
  assert.match(render("recur", "u(n+1) = 3.2u(n)(1 - u(n)); u(0) = 0.2"), /cycle of 2/);
  assert.match(render("recur", "x(n+1) = cos(x(n)); x(1) = 1"), /approach 0\.739085/);
});

test("errors say what is wrong", () => {
  const err = (topic: SeqTopic, src: string, re: RegExp) => assert.throws(() => render(topic, src), re, `${topic}: ${src}`);
  err("arith", "3, 7, 12", /not all the same/);
  err("arith", "u3 = 10", /not enough/);
  err("arith", "a = 1, d = 2, u3 = 6", /don't fit/);
  err("geom", "1, 0, 0", /can't contain 0/);
  err("geom", "u1 = 2, u3 = 6", /no fractional solution/);
  err("sigma", "sum k=1..5 1/(k(k-2))", /undefined at k = 2/);
  err("sigma", "sum k=1..n sin(k)", /No standard method/);
  err("recur", "u(n+1) = 2u(n)", /starting values: u₁/);
  err("pattern", "1, 2", /at least 3/);
});

test("practice: sequence and series answers follow from the question", () => {
  const pw = en.pracWords;
  const nums = (s: string) => s.replace(/−/g, "-").split(", ").filter((x) => x !== "…").map(Number);
  for (let s = 1; s <= 40; s++)
    for (const level of LEVELS) {
      for (const skill of ["sequences", "series"] as const) {
        const ex = exercise(skill, level, s, pw);
        let want: number | null = null;
        const list = /((?:-?\d+, )+…)/.exec(ex.prompt.replace(/−/g, "-"));
        const two = /(u[₀-₉]+) = (-?\d+) and (u[₀-₉]+) = (-?\d+)\. Find u([₀-₉]+)/.exec(ex.prompt.replace(/−/g, "-"));
        const idx = (t: string) => Number(t.replace(/u/, "").replace(/[₀-₉]/g, (c) => String(SUB.indexOf(c))));
        if (two) {
          const [p, x, q, y, n] = [idx(two[1]), Number(two[2]), idx(two[3]), Number(two[4]), idx(two[5])];
          const d = (y - x) / (q - p);
          want = x + (n - p) * d;
        } else if (skill === "sequences") {
          const n = Number(/term number (\d+)/.exec(ex.prompt)?.[1] ?? NaN);
          if (list && Number.isFinite(n)) {
            const t = nums(list[1]);
            const [d1, d2] = [t[1] - t[0], t[2] - t[1]];
            if (level === 3) {
              // Quadratic: from the first three terms.
              const A = (t[2] - 2 * t[1] + t[0]) / 2;
              const B = t[1] - t[0] - 3 * A;
              const C = t[0] - A - B;
              want = A * n * n + B * n + C;
            } else if (d1 === d2) want = t[0] + (n - 1) * d1;
            else want = t[0] * (t[1] / t[0]) ** (n - 1);
          }
        } else if (list) {
          const t = nums(list[1]);
          const n = Number(/first (\d+) terms/.exec(ex.prompt)?.[1] ?? NaN);
          const r = t[1] / t[0];
          if (/infinity/.test(ex.prompt)) want = t[0] / (1 - r);
          else if (t[1] - t[0] === t[2] - t[1]) want = (n * (2 * t[0] + (n - 1) * (t[1] - t[0]))) / 2;
          else want = (t[0] * (r ** n - 1)) / (r - 1);
        }
        const [top, bottom] = ex.plain.split("/").map(Number);
        if (want !== null) assert.ok(close(top / (bottom ?? 1), want), `${ex.prompt} → ${ex.plain}, want ${want}`);
        else assert.ok(level === 3 && skill === "series", `no list in ${ex.prompt}`);
        assert.equal(check(ex, ex.plain, pw).ok, true, ex.prompt);
      }
    }
});
