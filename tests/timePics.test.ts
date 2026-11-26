// Time: clock times read and written on both clocks, lengths of time read however they are typed (in every language),
// the hops of the time line, and the time questions' answers, mistakes and worked solutions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { clock12, clock24, clockPic, durationText, hops, readClock, readDuration, timeLineSvg } from "../src/math/timePics.ts";

const w = en.pracWords;

test("clock times on the 12-hour and the 24-hour clock", () => {
  assert.equal(clock12(0), "12:00");
  assert.equal(clock12(40), "12:40");
  assert.equal(clock12(13 * 60 + 5), "1:05");
  assert.equal(clock24(9 * 60 + 5), "09:05");
  assert.equal(clock24(23 * 60 + 40), "23:40");
  assert.equal(clock24(24 * 60 + 20), "00:20", "past midnight it starts again");
});

test("a typed time is read with a colon, a point or a space, or as a bare hour", () => {
  assert.deepEqual(readClock("3:45"), { h: 3, m: 45 });
  assert.deepEqual(readClock(" 3.45 "), { h: 3, m: 45 });
  assert.deepEqual(readClock("15 40"), { h: 15, m: 40 });
  assert.deepEqual(readClock("03:05"), { h: 3, m: 5 });
  assert.deepEqual(readClock("7"), { h: 7, m: 0 });
  assert.deepEqual(readClock("2:75"), { h: 2, m: 75 }, "minutes past 59 come back for the checker to name");
  assert.deepEqual(readClock("5:100"), { h: 5, m: 100 });
  assert.equal(readClock("3:4"), null, "one digit of minutes is ambiguous");
  assert.equal(readClock("quarter to four"), null);
});

test("a length of time is read in minutes, hours and minutes, or h:mm, in each language", () => {
  const stems = w.time.stems;
  for (const s of ["85", "85 min", "85 minutes", "1 h 25 min", "1h25", "1h 25m", "1 hour 25 minutes", "1:25", "1 25"]) assert.equal(readDuration(s, stems)?.m, 85, s);
  assert.equal(readDuration("2 h", stems)?.m, 120);
  assert.equal(readDuration("1.5 h", stems)?.m, 90);
  assert.deepEqual(readDuration("1 h 65 min", stems), { m: 125, over: true, mins: 65 });
  assert.equal(readDuration("65 min", stems)?.over, false, "minutes alone may pass 60");
  assert.equal(readDuration("1 x 25", stems), null);
  assert.equal(readDuration("an hour", stems), null);
  assert.equal(readDuration("1 სთ 25 წთ", ka.pracWords.time.stems)?.m, 85);
  assert.equal(readDuration("1 საათი 25 წუთი", ka.pracWords.time.stems)?.m, 85);
  assert.equal(readDuration("1 ч 25 мин", ru.pracWords.time.stems)?.m, 85);
  assert.equal(readDuration("1 час 25 минут", ru.pracWords.time.stems)?.m, 85);
  assert.equal(durationText(85, w.time), "1 h 25 min");
  assert.equal(durationText(120, w.time), "2 h");
  assert.equal(durationText(40, w.time), "40 min");
});

test("the time line hops to the next o'clock, then whole hours, then the minutes left", () => {
  const t = (h: number, m: number) => 60 * h + m;
  assert.deepEqual(hops(t(2, 50), t(3, 15)), [{ a: t(2, 50), b: t(3, 0) }, { a: t(3, 0), b: t(3, 15) }]);
  assert.deepEqual(hops(t(9, 35), t(15, 25)), [{ a: t(9, 35), b: t(10, 0) }, { a: t(10, 0), b: t(15, 0) }, { a: t(15, 0), b: t(15, 25) }]);
  assert.deepEqual(hops(t(3, 0), t(4, 0)), [{ a: t(3, 0), b: t(4, 0) }], "from an o'clock there is no first hop");
  assert.deepEqual(hops(t(3, 10), t(3, 40)), [{ a: t(3, 10), b: t(3, 40) }], "within the hour, one hop");
  const svg = timeLineSvg({ pic: "line", from: t(9, 35), to: t(15, 25), h24: true, ask: "length", units: w.time, steps: [] }).body;
  for (const s of ["09:35", "10:00", "15:00", "15:25", "+ 25 min", "+ 5 h"]) assert.ok(svg.includes(s), s);
});

test("the clock face puts the hour hand between the hours, as a real clock does", () => {
  // At 3:30 the hour hand is half way from 3 to 4: 105° from twelve.
  const body = clockPic(3 * 60 + 30).body;
  const R = 92;
  const cx = R + 6;
  const a = (105 * Math.PI) / 180;
  const x = Math.round((cx + 0.4 * R * Math.sin(a)) * 100) / 100;
  assert.ok(body.includes(`x2="${x}"`), "the hour hand ends half way to 4");
});

test("time answers: either clock where it is the same time, 12 at most on a clock with hands, minutes under 60", () => {
  const find = (level: 1 | 2 | 3, pred: (ex: ReturnType<typeof exercise>) => boolean) => {
    for (let seed = 1; seed < 500; seed++) {
      const ex = exercise("time", level, seed, w);
      if (pred(ex)) return ex;
    }
    throw new Error("no such question");
  };
  const face = find(1, (ex) => ex.answer.k === "clock" && ex.answer.t >= 60);
  if (face.answer.k !== "clock") throw new Error("unreachable");
  assert.equal(check(face, clock24(face.answer.t + 12 * 60), w).why, w.reasons.time.face, "a clock with hands shows 3:40, not 15:40");
  const end = find(2, (ex) => ex.answer.k === "clock" && !ex.answer.face);
  if (end.answer.k !== "clock") throw new Error("unreachable");
  assert.equal(check(end, clock24(end.answer.t + 12 * 60), w).ok, true, "a film's end on the 24-hour clock is the same time");
  const len = find(2, (ex) => ex.answer.k === "dur" && ex.answer.m > 60);
  if (len.answer.k !== "dur") throw new Error("unreachable");
  const m = len.answer.m;
  for (const s of [String(m), `${m} min`, `${Math.floor(m / 60)} h ${m % 60} min`, `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`]) assert.equal(check(len, s, w).ok, true, s);
  assert.equal(check(len, `${Math.floor(m / 60)} h ${(m % 60) + 60} min`, w).mistake, "minutes100");
  assert.match(check(len, "soon", w).why ?? "", /Couldn't read/);
  const h24 = find(3, (ex) => ex.answer.k === "clock" && !!ex.answer.h24 && ex.answer.t >= 13 * 60);
  if (h24.answer.k !== "clock") throw new Error("unreachable");
  assert.equal(check(h24, clock12(h24.answer.t), w).mistake, "not24");
  assert.equal(check(h24, clock24(h24.answer.t).replace(/^0/, ""), w).ok, true);
});

test("every time question has a worked solution, in each language", async () => {
  for (const words of [en, ka, ru])
    for (const level of LEVELS)
      for (let seed = 1; seed <= 12; seed++) {
        const ex = exercise("time", level, seed, words.pracWords);
        // Units of time written in a smaller one, and how long things take (#705): worked lines, not a clock or line.
        if (ex.format === "number" || ex.format === "pick") {
          assert.ok(ex.steps?.length && !/NaN|undefined|\{\w+\}/.test(ex.prompt + ex.steps.join(" ")), `${level} #${seed}`);
          continue;
        }
        assert.equal(ex.solution?.kind, "time");
        assert.equal(check(ex, ex.plain, words.pracWords).ok, true, `${level} #${seed} ${ex.plain}`);
        const pic = await renderSolution(ex.solution!, words);
        assert.ok(pic.svg.startsWith("<svg") && pic.width > 0 && pic.height > 0);
        assert.ok(!/NaN|undefined|\{\w+\}/.test(pic.svg + ex.prompt), `${level} #${seed}: ${ex.prompt}`);
      }
});
