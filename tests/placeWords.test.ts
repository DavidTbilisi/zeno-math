// Place value in words and estimates (#698): a number or decimal written from its words in each language, the
// largest and smallest number from some digits, a number from too many of one place, a decimal times a power of ten,
// a number in figures against one in words; estimates made by rounding first, standard form in a story, one digit
// times a power of ten. Each answer is what its numbers make, and each named slip is the one it says.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { decimalInWords, numberInWords } from "../src/math/numberWords.ts";

const w = en.pracWords;
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const all = (skill: "placeValue" | "rounding", words = w) => LEVELS.flatMap((level) => SEEDS.map((seed) => ({ level, seed, ex: exercise(skill, level, seed, words) })));
const slip = (ex: ReturnType<typeof exercise>, id: string) => trapInputs(ex).find((t) => t.id === id);

test("a number from its words: the words are the number's own in every language, and the parts written after each other are named", () => {
  for (const [words, lang] of [[w, "en"], [ka.pracWords, "ka"], [ru.pracWords, "ru"]] as const) {
    const asked = all("placeValue", words).filter(({ ex }) => ex.prompt.startsWith(words.place.toFigures.split("{")[0]) && ex.answer.k === "num");
    assert.ok(asked.some(({ level }) => level === 1) && asked.some(({ level }) => level === 2), lang);
    for (const { ex, seed } of asked) {
      const n = Number(ex.plain);
      assert.ok(ex.prompt.includes(numberInWords(n, lang)), `${lang} #${seed}: ${ex.prompt}`);
      const t = slip(ex, "wordPartsJoined");
      if (!t) continue;
      const big = n >= 1000 ? 1000 : 100;
      assert.equal(t.input, `${Math.floor(n / big) * big}${n % big}`);
      assert.equal(check(ex, t.input, words).mistake, "wordPartsJoined");
    }
  }
});

test("the largest and the smallest number from some digits; the opposite one and a 0 put first are named", () => {
  const made = all("placeValue").filter(({ ex }) => ex.prompt.startsWith("Use each of the digits"));
  assert.ok(made.some(({ level }) => level === 1) && made.some(({ level }) => level === 2));
  for (const { ex } of made) {
    const ds = ex.prompt.match(/digits ([\d, ]+) once/)![1].split(", ").map(Number);
    const down = [...ds].sort((a, b) => b - a).join("");
    const largest = ex.prompt.includes("largest");
    if (largest) assert.equal(ex.plain, down);
    else {
      assert.equal(ex.plain.length, ds.length, "the smallest keeps every digit");
      assert.ok(ex.plain[0] !== "0" && [...ex.plain.slice(1)].every((d, i, xs) => i === 0 || xs[i - 1] <= d));
    }
    assert.equal(check(ex, largest ? [...down].reverse().join("") : down, w).mistake, largest ? "smallestForLargest" : "largestForSmallest");
    if (ds.includes(0)) assert.equal(check(ex, String(Number([...ds].sort((a, b) => a - b).join(""))), w).mistake, "zeroFirst");
  }
});

test("a number from too many of one place: the parts added, and the counts set side by side named", () => {
  const asked = all("placeValue").filter(({ ex }) => ex.prompt.startsWith("Which number is"));
  assert.ok(asked.some(({ level }) => level === 2) && asked.some(({ level }) => level === 3));
  const value: Record<string, number> = { thousands: 1000, hundreds: 100, tens: 10, ones: 1, tenths: 0.1, hundredths: 0.01 };
  for (const { ex } of asked) {
    const said = [...ex.prompt.matchAll(/(\d+) (thousands|hundreds|tens|ones|tenths|hundredths)/g)];
    assert.ok(said.some(([, c]) => Number(c) > 9));
    const v = said.reduce((acc, [, c, place]) => acc + Number(c) * value[place], 0);
    assert.ok(Math.abs(Number(ex.plain) - v) < 1e-9, ex.prompt);
    const t = slip(ex, "regroupSideBySide")!;
    assert.equal(check(ex, t.input, w).mistake, "regroupSideBySide");
  }
});

test("a decimal from its words, and the digits put straight after the point named", () => {
  const asked = all("placeValue").filter(({ ex }) => ex.prompt.startsWith("Write as a decimal"));
  assert.ok(asked.length > 20 && asked.every(({ level }) => level === 3));
  for (const { ex } of asked) {
    const [whole, frac = ""] = ex.plain.split(".");
    const p = frac.length as 2 | 3;
    assert.ok(ex.prompt.includes(decimalInWords(Number(whole), Number(frac), p, "en")), ex.prompt);
    assert.equal(check(ex, `${whole}.${Number(frac)}`, w).mistake, "zeroPlaceSkipped");
  }
});

test("a decimal times or divided by a power of ten, and the point moved the other way named", () => {
  const asked = all("placeValue").filter(({ ex }) => /10\^\{\d\}$/.test(ex.q));
  assert.ok(asked.length > 20);
  for (const { ex } of asked) {
    const [, d, op, k] = ex.q.match(/^([\d.]+) \\(times|div) 10\^\{(\d)\}$/)!;
    const v = op === "times" ? Number(d) * 10 ** Number(k) : Number(d) / 10 ** Number(k);
    assert.ok(Math.abs(Number(ex.plain) - v) < 1e-9, ex.q);
    assert.equal(check(ex, trapInputs(ex)[0].input, w).mistake, "pointWrongWay");
  }
});

test("a number in figures against one in words: the larger is picked, the other named", () => {
  const asked = all("placeValue").filter(({ ex }) => ex.prompt === w.place.larger);
  assert.ok(asked.length > 20);
  for (const { ex } of asked) {
    if (ex.answer.k !== "pick") throw new Error("a pick");
    const [a, b] = ex.answer.options.map((o, i) => (i === 0 ? Number(o.plain) : NaN));
    assert.ok(Number.isFinite(a) && Number.isNaN(b));
    assert.equal(check(ex, trapInputs(ex)[0].input, w).mistake, "formsComparedByLook");
  }
});

test("estimates round each number first; the exact answer is named", () => {
  const asked = all("rounding").filter(({ ex }) => ex.prompt.startsWith("Estimate by rounding each number to the nearest"));
  assert.ok(asked.length > 20 && asked.every(({ level }) => level === 1));
  for (const { ex } of asked) {
    const unit = ex.prompt.includes("ten first") ? 10 : ex.prompt.includes("hundred") ? 100 : 1000;
    const [a, op, b] = ex.q.split(" ");
    const R = (n: string) => Math.round(Number(n) / unit) * unit;
    assert.equal(Number(ex.plain), op === "+" ? R(a) + R(b) : R(a) - R(b), ex.q);
    const exact = op === "+" ? Number(a) + Number(b) : Number(a) - Number(b);
    if (exact !== Number(ex.plain)) assert.equal(check(ex, String(exact), w).mistake, "exactNotEstimate");
  }
  const school = all("rounding").filter(({ ex }) => ex.prompt.startsWith("A school buys"));
  assert.ok(school.length > 5);
  for (const { ex } of school) {
    const [a, b, c] = ex.prompt.match(/\d+/g)!.map(Number);
    const R = (n: number) => Math.round(n / 100) * 100;
    assert.equal(Number(ex.plain), R(a) + R(b) - R(c));
  }
});

test("standard form in a story and one digit times a power of ten; the powers added and a power one out are named", () => {
  const probes = all("rounding").filter(({ ex }) => ex.prompt.startsWith("A space probe"));
  assert.ok(probes.length > 5 && probes.every(({ level }) => level === 2));
  const sup = (s: string) => Number(s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => "0123456789-"["⁰¹²³⁴⁵⁶⁷⁸⁹⁻".indexOf(c)]));
  for (const { ex } of probes) {
    const [[, a, ea], [, b, eb]] = [...ex.prompt.matchAll(/([\d.]+) × 10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)/g)];
    const v = (Number(a) * 10 ** sup(ea)) / (Number(b) * 10 ** sup(eb));
    assert.ok(Math.abs(Number(eval(ex.plain.replace("^", "**"))) / v - 1) < 1e-9, ex.prompt);
    assert.equal(check(ex, trapInputs(ex)[0].input, w).mistake, "powersAddedForDivide");
  }
  const single = all("rounding").filter(({ ex }) => ex.prompt.includes("single digit times a power of 10"));
  assert.ok(single.length > 5);
  for (const { ex } of single) {
    const n = Number(ex.prompt.match(/Round ([\d.]+) /)![1]);
    const e = Math.floor(Math.log10(n));
    assert.equal(ex.plain, `${Math.round(n / 10 ** e)}*10^${e}`);
    assert.equal(check(ex, trapInputs(ex)[0].input, w).mistake, "powerOneOut");
  }
});
