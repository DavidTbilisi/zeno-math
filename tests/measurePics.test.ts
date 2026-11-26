// Measuring: typed measures read in each language, the instruments' pictures, and the measuring questions' answers,
// forms and mistakes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";
import { dialPic, jugPic, readMeasure, rulerPic, unitWords } from "../src/math/measurePics.ts";

const w = en.pracWords;

test("a typed measure is read as numbers with their units, in each language and with the Latin units", () => {
  const words = unitWords(w.units);
  assert.deepEqual(readMeasure("2 m 35 cm", words), [[2, "m"], [35, "cm"]]);
  assert.deepEqual(readMeasure("2m35cm", words), [[2, "m"], [35, "cm"]]);
  assert.deepEqual(readMeasure("235", words), [[235, null]]);
  assert.deepEqual(readMeasure("1,5 l", words), [[1.5, "l"]]);
  assert.deepEqual(readMeasure("3 ℓ 40 mL", words), [[3, "l"], [40, "ml"]]);
  assert.equal(readMeasure("2 feet", words), null);
  assert.equal(readMeasure("cm", words), null);
  assert.deepEqual(readMeasure("2 მ 35 სმ", unitWords(ka.pracWords.units)), [[2, "m"], [35, "cm"]]);
  assert.deepEqual(readMeasure("1 кг 200 г", unitWords(ru.pracWords.units)), [[1, "kg"], [200, "g"]]);
  assert.deepEqual(readMeasure("1 kg 200 g", unitWords(ru.pracWords.units)), [[1, "kg"], [200, "g"]]);
});

test("the instruments show their scale's labels and the reading's place", () => {
  const ruler = rulerPic(2, 9, 15, "cm").body;
  for (const n of ["0", "9", "15", "cm"]) assert.ok(ruler.includes(`>${n}</text>`), n);
  const dial = dialPic(475, 500, 100, 25, "g").body;
  for (const n of ["0", "100", "500", "g"]) assert.ok(dial.includes(`>${n}</text>`), n);
  assert.ok(!dial.includes(">475<"), "the reading is the question, so it isn't written");
  const jug = jugPic(260, 500, 100, 20, "ml").body;
  assert.ok(jug.includes(">200</text>") && jug.includes(">300</text>") && !jug.includes(">260<"));
});

test("measure answers: either unit form when it is the same, two units asked for, the larger unit sent back", () => {
  const find = (level: 1 | 2 | 3, pred: (ex: ReturnType<typeof exercise>) => boolean) => {
    for (let seed = 1; seed < 500; seed++) {
      const ex = exercise("measure", level, seed, w);
      if (pred(ex)) return ex;
    }
    throw new Error("no such question");
  };
  const scale = find(1, (ex) => ex.prompt === w.prompts.measScale);
  if (scale.answer.k !== "meas") throw new Error("unreachable");
  assert.equal(check(scale, `${scale.plain} g`, w).ok, true);
  assert.equal(check(scale, `${scale.answer.v / 1000} kg`, w).why, w.reasons.measure.inSmall.replace("{small}", "g"));
  assert.match(check(scale, "475 ml", w).why ?? "", /Use kg and g/);
  const whole = find(3, (ex) => ex.answer.k === "meas" && !!ex.answer.whole);
  if (whole.answer.k !== "meas") throw new Error("unreachable");
  assert.equal(check(whole, `${whole.answer.v} ${w.units[whole.answer.small]}`, w).why, w.reasons.measure.whole.replace(/\{big\}/g, w.units[whole.answer.big]).replace(/\{small\}/g, w.units[whole.answer.small]));
  assert.match(check(whole, "lots", w).why ?? "", /Couldn't read/);
});

test("every measuring question accepts its answer in each language", () => {
  for (const words of [en, ka, ru])
    for (const level of LEVELS)
      for (let seed = 1; seed <= 30; seed++) {
        const ex = exercise("measure", level, seed, words.pracWords);
        assert.equal(check(ex, ex.plain, words.pracWords).ok, true, `${level} #${seed} ${ex.plain}`);
        assert.ok(ex.steps?.length);
        assert.ok(!/NaN|undefined|(?<!\\text)\{\w+\}/.test(ex.prompt + ex.show + ex.steps!.join(" ")), `${level} #${seed}: ${ex.prompt}`);
      }
});
