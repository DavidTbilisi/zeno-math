// Fractions before grade 6: every question takes its own answer in three languages and no slip is right; a sum or
// difference asked is the true one; a division written as a fraction is shared on bars; a fraction of a number is
// drawn on rows of counters; dividing by or into a unit fraction, bare and in stories; the new pictures themselves.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { renderFracOp } from "../src/math/fracop.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { gradeOf } from "../src/model/curriculum.ts";

const w = en.pracWords;
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
/** "3/4", "2 1/3", "5" as a number. */
const valueOf = (s: string) => {
  const m = s.match(/^(?:(\d+) )?(\d+)\/(\d+)$/);
  return m ? Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]) : Number(s);
};
const texValue = (t: string) => {
  const m = t.match(/^(\d*)\\frac\{(\d+)\}\{(\d+)\}$/);
  return m ? Number(m[1] || 0) + Number(m[2]) / Number(m[3]) : Number(t);
};

test("every question takes its own answer in each language, and no slip is the right answer", () => {
  for (const words of [w, ka.pracWords, ru.pracWords])
    for (const level of LEVELS)
      for (const seed of SEEDS) {
        const ex = exercise("fractionSums", level, seed, words);
        const where = `${level} #${seed}: ${ex.prompt} ${ex.q} → ${ex.plain}`;
        assert.equal(check(ex, ex.plain, words).ok, true, where);
        assert.ok(!/\{\w+\}/.test(ex.prompt), `${where}: the prompt is filled in`);
        assert.equal(trapInputs(ex).length, ex.answer.traps?.length ?? 0, `${where}: every slip can be typed`);
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, words);
          assert.equal(v.mistake, t.id, `${where}; ${t.id} ${t.input}`);
          assert.ok(v.hint && !/\{\w+\}/.test(v.hint), `${where}: ${v.hint}`);
        }
      }
});

test("a sum, difference or quotient asked is the true one, and the fractions given are in lowest terms", () => {
  let seen = 0;
  for (const level of LEVELS)
    for (const seed of SEEDS) {
      const ex = exercise("fractionSums", level, seed, w);
      const m = ex.q.match(/^(\S+) (\+|-|\\div) (\S+)$/);
      if (!m) continue;
      seen++;
      const [a, b] = [texValue(m[1]), texValue(m[3])];
      const v = m[2] === "+" ? a + b : m[2] === "-" ? a - b : a / b;
      assert.ok(Math.abs(valueOf(ex.plain) - v) < 1e-9, `${level} #${seed}: ${ex.q} = ${ex.plain}`);
      assert.ok(v > 0, `${ex.q}: positive`);
      for (const [, n, d] of ex.q.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)) {
        const g = (x: number, y: number): number => (y ? g(y, x % y) : x);
        assert.equal(g(Number(n), Number(d)), 1, `${ex.q}: ${n}/${d} in lowest terms`);
      }
    }
  assert.ok(seen > 500);
});

test("an answer not in lowest terms is sent back, and a mixed number is taken for an improper fraction", () => {
  const ex = SEEDS.map((s) => exercise("fractionSums", 2, s, w)).find((e) => /^\d\\frac/.test(e.q) && /^\d+\/\d+$/.test(e.plain) && valueOf(e.plain) > 1)!;
  const [n, d] = ex.plain.split("/").map(Number);
  assert.equal(check(ex, `${Math.floor(n / d)} ${n % d}/${d}`, w).ok, true, ex.plain);
  assert.notEqual(check(ex, `${2 * n}/${2 * d}`, w).ok, true);
});

test("the easy level: the same bottoms, and a division written as a fraction with its share drawn", () => {
  let [same, division] = [0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("fractionSums", 1, seed, w);
    // A fraction broken into parts is worked in lines (#702; tests/fractionLine.test.ts).
    if (!ex.solution) continue;
    const spec = (ex.solution as { spec: { op: string; a: string; b: string; pic?: string } }).spec;
    if (ex.prompt === w.fracSums.asFraction) {
      division++;
      const [a, b] = ex.q.split(" \\div ").map(Number);
      assert.equal(valueOf(ex.plain), a / b);
      assert.deepEqual([spec.op, spec.pic], ["÷", "share"]);
      assert.equal(check(ex, `${b}/${a}`, w).mistake, "quotientFlipped");
    } else {
      same++;
      assert.ok(ex.q.match(/\\frac\{\d+\}\{(\d+)\}.*\\frac\{\d+\}\{\1\}/), `${ex.q}: the same bottom`);
    }
  }
  assert.ok(same > 100 && division > 50, `${same} ${division}`);
});

test("a fraction of a number: drawn on counters, and one part for all of them is the slip", () => {
  let seen = 0;
  for (const seed of SEEDS) {
    const ex = exercise("fractionSums", 2, seed, w);
    const m = ex.prompt.match(/^What is (\d+)\/(\d+) of (\d+)\?$/);
    if (!m) continue;
    seen++;
    const [n, d, N] = m.slice(1).map(Number);
    assert.equal(Number(ex.plain), (n * N) / d);
    assert.equal((ex.solution as { spec: { pic?: string } }).spec.pic, "of");
    if (n > 1) assert.equal(check(ex, String(N / d), w).mistake, "onlyOnePart");
  }
  assert.ok(seen > 50);
});

test("the hard level: a unit fraction shared, a whole number cut into unit fractions, and stories", () => {
  let [shared, fits, stories] = [0, 0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("fractionSums", 3, seed, w);
    const spec = (ex.solution as { spec: { a: string; b: string; pic?: string } }).spec;
    if (ex.q === "") stories++;
    else if (spec.a.includes("/")) shared++;
    else fits++;
    if (spec.b.includes("/")) assert.equal(spec.pic, undefined, "how many fit: the fits picture");
    else assert.equal(spec.pic, "share");
    assert.ok(trapInputs(ex).length >= 1, `${ex.prompt} ${ex.q}: a slip`);
  }
  assert.ok(shared > 40 && fits > 40 && stories > 60, `${shared} ${fits} ${stories}`);
});

test("every worked solution is drawn, with its picture", async () => {
  for (const level of LEVELS)
    for (const seed of SEEDS.slice(0, 40)) {
      const ex = exercise("fractionSums", level, seed, w);
      if (!ex.solution) continue; // the parts of a fraction, worked in lines (#702)
      const r = await renderSolution(ex.solution!, en);
      assert.ok(r?.svg.includes("<rect") || r?.svg.includes("<circle"), `${level} #${seed}: ${ex.q}`);
    }
});

test("the share and fraction-of pictures", () => {
  const share = renderFracOp({ type: "fracop", op: "÷", a: "3", b: "4", step: 999, pic: "share" }).svg;
  assert.equal((share.match(/<circle/g) ?? []).length, 3, "one share: a piece of each whole");
  const unit = renderFracOp({ type: "fracop", op: "÷", a: "1/3", b: "4", step: 999, pic: "share" }).svg;
  assert.equal((unit.match(/<circle/g) ?? []).length, 1);
  const of = renderFracOp({ type: "fracop", op: "×", a: "2/3", b: "12", step: 999, pic: "of" }).svg;
  assert.equal((of.match(/<circle/g) ?? []).length, 12, "twelve counters");
  assert.equal((of.match(/fill="#b2f2bb"/g) ?? []).length, 8, "two rows of four picked out");
  // Without the flag, or where it cannot apply, the usual pictures stay.
  assert.equal((renderFracOp({ type: "fracop", op: "÷", a: "3", b: "4", step: 999 }).svg.match(/<circle/g) ?? []).length, 0);
  assert.equal((renderFracOp({ type: "fracop", op: "×", a: "2/3", b: "13", step: 999, pic: "of" }).svg.match(/<circle/g) ?? []).length, 0);
});

test("its grades: the first level in grade 4, the others in grade 5", () => {
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("fractionSums", L as 1 | 2 | 3)), [4, 5, 5]);
});
