// Inference: the distribution functions against tables and closed forms, intervals against tests (duality),
// two-sample and χ² statistics against their textbook formulas, power against the sample size it asks for,
// and the coverage simulation against the confidence level.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import {
  chiSf, chiUpper, INF_PRESETS, lastResult, lnGamma, normCdf, normSf, renderInference, tSf, tUpper, zUpper, type InfSpec,
} from "../src/math/inference.ts";

const w = en.infWords;
const close = (a: number, b: number, tol: number, what = "") => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);
const rnd = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const spec = (v: Partial<InfSpec>): InfSpec => ({ topic: "ci", kind: "t", a: "", b: "", c: "", d: "", e: "", f: "", data: "", data2: "", level: "95", alt: "ne", seed: 1, ...v });
const run = (v: Partial<InfSpec>) => {
  renderInference(spec(v), w);
  return lastResult();
};

test("normal, t and χ² against tables", () => {
  close(normCdf(1.96), 0.9750021, 1e-7, "Φ(1.96)");
  close(zUpper(0.025), 1.959964, 1e-6, "z 2.5%");
  close(zUpper(0.05), 1.644854, 1e-6, "z 5%");
  close(normSf(5) / 2.8665157e-7, 1, 1e-6, "far tail");
  close(tUpper(0.025, 10), 2.228139, 1e-6, "t 10");
  close(tUpper(0.025, 1), 12.7062, 1e-4, "t 1");
  close(tUpper(0.005, 30), 2.749996, 1e-6, "t 30");
  close(tUpper(0.025, 1e6), 1.959966, 1e-5, "t → z");
  close(chiUpper(0.05, 1), 3.841459, 1e-6, "χ² 1");
  close(chiUpper(0.05, 3), 7.814728, 1e-6, "χ² 3");
  close(chiUpper(0.01, 10), 23.209251, 1e-6, "χ² 10");
  close(lnGamma(5), Math.log(24), 1e-12, "Γ(5)");
  close(lnGamma(0.5), Math.log(Math.sqrt(Math.PI)), 1e-12, "Γ(1/2)");
});

test("closed forms: Cauchy, t₂, χ²₂ and χ²₁", () => {
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() - 0.5) * 20;
    close(tSf(x, 1), 0.5 - Math.atan(x) / Math.PI, 1e-12, `Cauchy ${x}`);
    close(tSf(x, 2), 0.5 - x / (2 * Math.sqrt(2 + x * x)), 1e-12, `t₂ ${x}`);
    const y = Math.random() * 30;
    close(chiSf(y, 2), Math.exp(-y / 2), 1e-12, `χ²₂ ${y}`);
    close(chiSf(y, 1), 2 * normSf(Math.sqrt(y)), 1e-12, `χ²₁ ${y}`);
    const df = 1 + Math.random() * 40;
    close(tSf(x, df) + tSf(-x, df), 1, 1e-12, "symmetry");
  }
});

test("a two-sided test rejects exactly when the interval misses μ₀", () => {
  for (let i = 0; i < 80; i++) {
    const n = rnd(2, 40);
    const data = Array.from({ length: n }, () => (50 + (Math.random() - 0.5) * 20).toFixed(1)).join(" ");
    const alpha = [0.01, 0.05, 0.1][rnd(0, 2)];
    const mu0 = 45 + Math.random() * 10;
    const ci = run({ topic: "ci", kind: "t", data, level: String(100 * (1 - alpha)) });
    const t = run({ topic: "test", kind: "t", data, d: String(mu0), level: String(alpha) });
    if (Math.abs(t.p - alpha) < 1e-9) continue;
    assert.equal(t.p < alpha, mu0 < ci.lo || mu0 > ci.hi, `n = ${n}, μ₀ = ${mu0}, p = ${t.p}, (${ci.lo}, ${ci.hi})`);
    // The statistic beyond the critical value says the same.
    assert.equal(Math.abs(t.stat) > t.crit, t.p < alpha);
  }
});

test("intervals: data and summary agree; proportions by the formula", () => {
  const xs = [12.1, 11.8, 12.5, 12.0, 11.6, 12.3, 12.4, 11.9];
  const mean = xs.reduce((a, b) => a + b) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (xs.length - 1));
  const a = run({ data: xs.join(" ") });
  const b = run({ a: String(mean), b: String(sd), c: String(xs.length) });
  close(a.lo, b.lo, 1e-9, "lo");
  close(a.hi, b.hi, 1e-9, "hi");
  close(a.hi - a.lo, 2 * 2.364624 * (sd / Math.sqrt(8)), 1e-5, "width");
  const p = run({ kind: "prop", a: "112", b: "200" });
  close(p.lo, 0.56 - 1.959964 * Math.sqrt((0.56 * 0.44) / 200), 1e-6, "Wald");
  const z = run({ kind: "z", a: "172", b: "8", c: "40", level: "90%" });
  close(z.hi - 172, (1.644854 * 8) / Math.sqrt(40), 1e-5, "z interval");
});

test("two samples: Welch, paired and two proportions", () => {
  for (let i = 0; i < 40; i++) {
    const [m1, s1, n1, m2, s2, n2] = [Math.random() * 100, 1 + Math.random() * 10, rnd(2, 60), Math.random() * 100, 1 + Math.random() * 10, rnd(2, 60)];
    const r = run({ topic: "two", kind: "means", a: String(m1), b: String(s1), c: String(n1), d: String(m2), e: String(s2), f: String(n2), level: "0.05" });
    const [v1, v2] = [s1 ** 2 / n1, s2 ** 2 / n2];
    const df = (v1 + v2) ** 2 / (v1 ** 2 / (n1 - 1) + v2 ** 2 / (n2 - 1));
    close(r.stat, (m1 - m2) / Math.sqrt(v1 + v2), 1e-9, "Welch t");
    close(r.p, 2 * tSf(Math.abs(r.stat), df), 1e-12, "Welch p");
  }
  // Paired = one-sample t on the differences.
  const x1 = "120 135 128 142 130 125 138 133";
  const x2 = "115 130 126 135 128 122 131 130";
  const d = x1.split(" ").map((v, i) => Number(v) - Number(x2.split(" ")[i])).join(" ");
  const paired = run({ topic: "two", kind: "paired", data: x1, data2: x2, alt: "gt", level: "0.05" });
  const one = run({ topic: "test", kind: "t", data: d, d: "0", alt: "gt", level: "0.05" });
  close(paired.stat, one.stat, 1e-12, "paired t");
  close(paired.p, one.p, 1e-12, "paired p");
  const props = run({ topic: "two", kind: "props", a: "45", b: "150", c: "30", d: "150", level: "0.05" });
  close(props.stat, 2, 1e-12, "pooled z");
  close(props.p, 0.0455003, 1e-6, "p");
});

test("χ²: goodness of fit and the 2 × 2 shortcut", () => {
  const die = run({ topic: "chi", kind: "gof", data: "8 12 9 14 7 10", level: "0.05" });
  close(die.stat, (4 + 4 + 1 + 16 + 9 + 0) / 10, 1e-12, "die");
  assert.equal(die.df, 5);
  const mendel = run({ topic: "chi", kind: "gof", data: "315 108 101 32", data2: "9:3:3:1", level: "0.05" });
  close(mendel.stat, 0.470024, 1e-6, "Mendel");
  for (let i = 0; i < 40; i++) {
    const [a, b, c, dd] = [rnd(1, 80), rnd(1, 80), rnd(1, 80), rnd(1, 80)];
    const r = run({ topic: "chi", kind: "indep", data: `${a} ${b}\n${c} ${dd}`, level: "0.05" });
    const n = a + b + c + dd;
    close(r.stat, (n * (a * dd - b * c) ** 2) / ((a + b) * (c + dd) * (a + c) * (b + dd)), 1e-9, `${a} ${b} ${c} ${dd}`);
    close(r.p, chiSf(r.stat, 1), 1e-15, "p");
  }
});

test("power: the n it asks for is just enough", () => {
  for (let i = 0; i < 30; i++) {
    const [mu0, delta, sigma] = [rnd(0, 100), 0.5 + Math.random() * 5, 1 + Math.random() * 20];
    const alt = (["gt", "lt"] as const)[rnd(0, 1)];
    const mu1 = alt === "gt" ? mu0 + delta : mu0 - delta;
    const base = { topic: "power" as const, kind: "", a: String(mu0), b: String(mu1), c: String(sigma), alt, level: "0.05" };
    const need = run({ ...base, d: "10" }).n;
    assert.ok(run({ ...base, d: String(need) }).power >= 0.8 - 1e-9, `n = ${need}`);
    if (need > 1) assert.ok(run({ ...base, d: String(need - 1) }).power < 0.8, `n − 1 = ${need - 1}`);
  }
  // Power → α as μ₁ → μ₀; two-sided power at the textbook example.
  close(run({ topic: "power", a: "100", b: "100.000001", c: "15", d: "36", alt: "gt", level: "0.05" }).power, 0.05, 1e-6, "α");
  close(run({ topic: "power", a: "100", b: "105", c: "15", d: "36", alt: "gt", level: "0.05" }).power, 0.63876, 1e-5, "power");
});

test("about 95% of 95% intervals catch μ", () => {
  for (const [kind, c, level] of [["z", "20", "95"], ["t", "5", "95"], ["z", "10", "80"]] as const)
    for (const seed of [1, 2, 3]) {
      const r = run({ topic: "coverage", kind, a: "50", b: "10", c, level, seed });
      close(r.rate, Number(level) / 100, 0.03, `${kind} n = ${c} seed ${seed}`);
    }
});

test("presets give sensible results; bad input gives a message", () => {
  for (const p of Object.values(INF_PRESETS).flat()) {
    renderInference(p.spec, w);
    for (const [k, v] of Object.entries(lastResult())) assert.ok(Number.isFinite(v), `${p.label}: ${k} = ${v}`);
  }
  const bad: [Partial<InfSpec>, string][] = [
    [{ a: "50", b: "4", c: "25", level: "120" }, w.needConf],
    [{ a: "50", b: "4", c: "1" }, w.needN.replace("{m}", "2")],
    [{ a: "50", b: "0", c: "25" }, w.needSd],
    [{ data: "7" }, w.needData],
    [{ data: "1 2 x" }, w.bad.replace("{s}", "x")],
    [{ topic: "test", kind: "prop", a: "5", b: "20", d: "1.5", level: "0.05" }, w.needP0],
    [{ topic: "test", kind: "t", a: "5", b: "2", c: "20", d: "4", level: "0.9" }, w.needAlpha],
    [{ topic: "two", kind: "paired", data: "1 2 3", data2: "1 2", level: "0.05" }, w.pairLength],
    [{ topic: "chi", kind: "indep", data: "1 2 3\n4 5", level: "0.05" }, w.ragged],
    [{ topic: "chi", kind: "gof", data: "1 2 3", data2: "1 1", level: "0.05" }, w.ratioLength.replace("{k}", "3")],
    [{ topic: "power", a: "100", b: "95", c: "15", d: "36", alt: "gt", level: "0.05" }, w.needDiff],
  ];
  for (const [v, msg] of bad) assert.throws(() => renderInference(spec(v), w), { message: msg }, JSON.stringify(v));
});
