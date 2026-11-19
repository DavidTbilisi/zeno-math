// Complex numbers in practice: the reader of a typed number, exact angles and forms, and every question checked
// against its own answer (right as shown, right in another form, the named slips wrong).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { addAngles, angle, anglePlain, cxPlain, cxTex, polarPlain, polarValue, readCx, sameList } from "../src/math/complexPractice.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";

const w = en.pracWords;
const near = (z: { re: number; im: number } | null, re: number, im: number) => {
  assert.ok(z, "read");
  assert.ok(Math.abs(z.re - re) < 1e-9 && Math.abs(z.im - im) < 1e-9, `${z.re} + ${z.im}i, not ${re} + ${im}i`);
};

test("a typed complex number is read in any usual form", () => {
  near(readCx("3 - 4i"), 3, -4);
  near(readCx("-i"), 0, -1);
  near(readCx("2,5 + 1,5i"), 2.5, 1.5);
  near(readCx("-1/2 + (√3/2)i"), -0.5, Math.sqrt(3) / 2);
  near(readCx("-1/2 + √3/2 i"), -0.5, Math.sqrt(3) / 2);
  near(readCx("2e^(2pi i/3)"), -1, Math.sqrt(3));
  near(readCx("2e^(i pi/3)"), 1, Math.sqrt(3));
  near(readCx("√2e^(-pi i/4)"), 1, -1);
  near(readCx("2cis(pi/2)"), 0, 2);
  for (const bad of ["", "3 + 4j", "abc", "2x + i"]) assert.equal(readCx(bad), null, bad);
});

test("angles are kept in lowest terms in (−π, π]", () => {
  assert.deepEqual(angle(8, 6), { k: -2, d: 3 });
  assert.deepEqual(angle(-6, 6), { k: 1, d: 1 });
  assert.deepEqual(addAngles(angle(1, 2), angle(1, 3)), { k: 5, d: 6 });
  assert.deepEqual(addAngles(angle(1, 4), angle(3, 4), -1), { k: -1, d: 2 });
  assert.equal(anglePlain(angle(-1, 4)), "-pi/4");
});

test("a + bi and re^{iθ} are written exactly and read back to the same number", () => {
  const z = polarValue({ r: 2, t: angle(2, 3) });
  assert.equal(cxTex(z), "-1 + \\sqrt{3}i");
  near(readCx(cxPlain(z)), z.re, z.im);
  const p = { r: 3 * Math.SQRT2, t: angle(-3, 4) };
  near(readCx(polarPlain(p)), -3, -3);
  assert.ok(sameList([{ re: 1, im: 2 }, { re: 1, im: -2 }], [{ re: 1, im: -2 }, { re: 1, im: 2 }]));
  assert.ok(!sameList([{ re: 1, im: 2 }, { re: 1, im: 2 }], [{ re: 1, im: -2 }, { re: 1, im: 2 }]));
});

const SKILLS: SkillId[] = ["complex", "polarForm", "deMoivre"];

test("every complex question accepts its own answer, in the other form too, and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[])
      for (let seed = 1; seed <= 200; seed++) {
        const ex = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${ex.q} → ${ex.plain}`;
        assert.ok(!/NaN|undefined|Infinity/.test(ex.q + ex.show + ex.plain + (ex.steps ?? []).join(" ")), where);
        assert.equal(check(ex, ex.plain, w).ok, true, where);
        for (const t of trapInputs(ex)) assert.equal(check(ex, t.input, w).mistake, t.id, `${where}; ${t.id} ${t.input}`);
        if (ex.answer.k !== "complex") continue;
        const a = ex.answer;
        // In a + bi: right when any form is asked for, sent back (not wrong) when re^{iθ} is.
        const cart = a.vs.map((z) => `${z.re} + (${z.im})*i`).join("; ");
        const v = check(ex, cart, w);
        if (a.polar) assert.deepEqual([v.ok, v.close], [false, true], where);
        else assert.equal(v.ok, true, where);
        // The roots in any order.
        if (a.vs.length > 1) assert.equal(check(ex, ex.plain.split("; ").reverse().join("; "), w).ok, true, where);
      }
});

test("the right count of roots is asked for", () => {
  const ex = exercise("complex", 3, 1, w);
  const v = check(ex, ex.plain.split("; ")[0], w);
  assert.equal(v.ok, false);
  assert.match(v.why ?? "", /2/);
});
