import { test } from "node:test";
import assert from "node:assert/strict";
import { exercise, check, LEVELS } from "../src/math/practice.ts";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";

test("practical trig covers all ratios and unknowns with consistent physical measurements", () => {
  const cases = new Set<string>();
  const scenarios = new Set<string>();
  for (const level of LEVELS) for (let seed = 1; seed <= 120; seed++) {
    const ex = exercise("practicalTrig", level, seed, en.pracWords);
    const s = ex.solution!.spec as { given: string; ask: string; ang: string; opp: string; adj: string; hyp: string };
    const [o, a, h, t] = [Number(s.opp), Number(s.adj), Number(s.hyp), Number(s.ang) * Math.PI / 180];
    let expected: number;
    switch (s.given) {
      case "angHyp": expected = h * (s.ask === "opp" ? Math.sin(t) : Math.cos(t)); break;
      case "angAdj": expected = s.ask === "opp" ? a * Math.tan(t) : a / Math.cos(t); break;
      case "angOpp": expected = s.ask === "adj" ? o / Math.tan(t) : o / Math.sin(t); break;
      case "oppAdj": expected = Math.atan(o / a) * 180 / Math.PI; break;
      case "oppHyp": expected = Math.asin(o / h) * 180 / Math.PI; break;
      case "adjHyp": expected = Math.acos(a / h) * 180 / Math.PI; break;
      default: throw new Error(s.given);
    }
    assert.ok(Math.abs(Number(ex.plain) - expected) <= 0.005001);
    assert.equal(check(ex, ex.plain, en.pracWords).ok, true);
    assert.equal(check(ex, String(Number(ex.plain) + 1), en.pracWords).ok, false);
    assert.ok(ex.prompt.includes(en.pracWords.practicalTrig[s.ask as "opp"]));
    assert.doesNotMatch(ex.prompt, /undefined|\{\w+\}/);
    assert.doesNotMatch(ex.pic!.svg(30, 40), /NaN|undefined/);
    cases.add(`${s.given}:${s.ask}`);
    for (const k of ["ladder", "ramp", "cable"] as const) if (ex.prompt.includes(en.pracWords.practicalTrig[k])) scenarios.add(k);
  }
  assert.equal(cases.size, 9);
  assert.equal(scenarios.size, 3);
});

test("practical scenarios and measurement instructions are available in every language", () => {
  for (const t of [en, ka, ru]) for (const level of LEVELS) {
    const ex = exercise("practicalTrig", level, 42, t.pracWords);
    assert.ok(ex.prompt.includes(level === 3 ? t.pracWords.practicalTrig.angle : t.pracWords.practicalTrig.length));
    assert.doesNotMatch(ex.prompt, /undefined|\{\w+\}/);
    assert.equal(check(ex, ex.plain, t.pracWords).ok, true);
  }
});
