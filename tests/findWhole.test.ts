// Find the whole: tasks within the picture's limits for each level, a built row judged by what part of a whole it is
// (any cut works), the piece counted as one part and the piece named against the bar shown caught, and the notices.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import type { GameLevel } from "../src/math/ladder.ts";
import { judgeWhole, MAX_ROW, WHOLE_LADDER, wholeNotice, wholeNow, wholeTask } from "../src/math/findWhole.ts";

test("every level asks what it says: unit pieces, pieces of several parts, then over one or a bar that isn't one", () => {
  for (const level of [1, 2, 3] as GameLevel[])
    for (let seed = 1; seed <= 300; seed++) {
      const t = wholeTask(level, rng(seed));
      if (t.kind === "build") {
        assert.ok(t.d >= 2 && t.n >= 1 && Math.max(t.n, t.d) <= MAX_ROW / 2);
        if (level === 1) assert.equal(t.n, 1);
        if (level === 2) assert.ok(t.n >= 2 && t.n < t.d);
        if (level === 3) assert.ok(t.n > t.d);
      } else {
        assert.ok(t.pn >= 1 && t.pn <= t.rd && t.rn <= t.rd);
        if (level < 3) assert.equal(t.rn, t.rd);
        if (level === 3) assert.ok(t.rn < t.rd && t.pn !== t.rn);
      }
    }
  assert.equal(WHOLE_LADDER.length, 9);
  assert.equal(wholeNow({ mode: "free", stage: 0, level: 1, seed: 1 }), null);
});

test("build: 2/3 cut in two, three parts laid, or cut in four and six laid; the uncut piece three times is its own slip", () => {
  const t = { kind: "build", n: 2, d: 3 } as const;
  const at = (cut: number, parts: number) => judgeWhole(t, { cut, parts, top: 0, bottom: 1 });
  assert.equal(at(2, 3), null);
  assert.equal(at(4, 6), null);
  assert.equal(at(1, 3), "notCut");
  assert.equal(at(2, 2), "short");
  assert.equal(at(2, 4), "long");
  assert.equal(judgeWhole({ kind: "build", n: 4, d: 3 }, { cut: 4, parts: 3, top: 0, bottom: 1 }), null);
});

test("name: the piece against one whole, any equal fraction; against the bar shown is the slip", () => {
  const t = { kind: "name", rn: 3, rd: 4, pn: 2 } as const;
  const say = (top: number, bottom: number) => judgeWhole(t, { cut: 1, parts: 1, top, bottom });
  assert.equal(say(1, 2), null);
  assert.equal(say(2, 4), null);
  assert.equal(say(2, 3), "ofShown");
  assert.equal(say(3, 4), "answer");
  assert.equal(judgeWhole({ kind: "name", rn: 5, rd: 5, pn: 2 }, { cut: 5, parts: 1, top: 2, bottom: 5 }), null);
});

test("notices: taken off, finer parts, the whole changed, ten in a row", () => {
  assert.equal(wholeNotice({ kind: "build", n: 4, d: 3 }, { cut: 4 }, 1), "removed");
  assert.equal(wholeNotice({ kind: "build", n: 2, d: 3 }, { cut: 4 }, 1), "finer");
  assert.equal(wholeNotice({ kind: "build", n: 2, d: 3 }, { cut: 2 }, 1), null);
  assert.equal(wholeNotice({ kind: "name", rn: 3, rd: 4, pn: 2 }, { cut: 1 }, 1), "changed");
  assert.equal(wholeNotice({ kind: "name", rn: 3, rd: 4, pn: 2 }, { cut: 1 }, 10), "streak10");
});
