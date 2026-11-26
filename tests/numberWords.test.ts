// Numbers in words in English, Georgian and Russian (src/math/numberWords.ts), checked against forms written out by
// hand: the "and" of British English, Georgian twenties, Russian thousands and fractions with their endings.
import assert from "node:assert/strict";
import test from "node:test";
import { decimalInWords, numberInWords } from "../src/math/numberWords.ts";

test("English: hyphens below a hundred, and before the last two digits", () => {
  const cases: [number, string][] = [
    [7, "seven"], [15, "fifteen"], [42, "forty-two"], [90, "ninety"], [206, "two hundred and six"], [340, "three hundred and forty"],
    [3042, "three thousand and forty-two"], [1000, "one thousand"], [42306, "forty-two thousand three hundred and six"], [70015, "seventy thousand and fifteen"],
  ];
  for (const [n, s] of cases) assert.equal(numberInWords(n, "en"), s);
});

test("Georgian: counted in twenties, and a number word before another loses its last letter", () => {
  const cases: [number, string][] = [
    [7, "შვიდი"], [15, "თხუთმეტი"], [20, "ოცი"], [30, "ოცდაათი"], [42, "ორმოცდაორი"], [57, "ორმოცდაჩვიდმეტი"], [99, "ოთხმოცდაცხრამეტი"],
    [100, "ასი"], [206, "ორას ექვსი"], [340, "სამას ორმოცი"], [1000, "ათასი"], [1042, "ათას ორმოცდაორი"], [3042, "სამი ათას ორმოცდაორი"],
    [2000, "ორი ათასი"], [42306, "ორმოცდაორი ათას სამას ექვსი"],
  ];
  for (const [n, s] of cases) assert.equal(numberInWords(n, "ka"), s, String(n));
});

test("Russian: тысяча, тысячи, тысяч, and одна, две before a feminine noun", () => {
  const cases: [number, string][] = [
    [7, "семь"], [42, "сорок два"], [206, "двести шесть"], [1000, "одна тысяча"], [2000, "две тысячи"], [3042, "три тысячи сорок два"],
    [5000, "пять тысяч"], [11000, "одиннадцать тысяч"], [21000, "двадцать одна тысяча"], [42306, "сорок две тысячи триста шесть"],
  ];
  for (const [n, s] of cases) assert.equal(numberInWords(n, "ru"), s, String(n));
});

test("decimals: the whole part, then the fraction named by its last place", () => {
  assert.equal(decimalInWords(3, 7, 2, "en"), "three and seven hundredths");
  assert.equal(decimalInWords(0, 1, 1, "en"), "one tenth");
  assert.equal(decimalInWords(12, 45, 3, "en"), "twelve and forty-five thousandths");
  assert.equal(decimalInWords(3, 7, 2, "ka"), "სამი მთელი შვიდი მეასედი");
  assert.equal(decimalInWords(0, 45, 3, "ka"), "ნული მთელი ორმოცდახუთი მეათასედი");
  assert.equal(decimalInWords(3, 7, 2, "ru"), "три целых семь сотых");
  assert.equal(decimalInWords(1, 1, 1, "ru"), "одна целая одна десятая");
  assert.equal(decimalInWords(0, 2, 2, "ru"), "ноль целых две сотых");
  assert.equal(decimalInWords(2, 21, 3, "ru"), "две целых двадцать одна тысячная");
});
