// The games a teacher can assign (src/model/gameKeys.ts): every game in the Games menu that keeps a ladder, the pass
// rule the same as the games', and stars merged puzzle by puzzle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GAME_IDS, GAME_PASS_STARS, ladderDone, mergeStars, parseStars } from "../src/model/gameKeys.ts";
import { PASS_STARS } from "../src/math/ladder.ts";
import { isLiveEntry, MENUS } from "../src/menus.ts";

test("game keys: every Games-menu game with a ladder can be assigned", () => {
  const menu = MENUS.filter((g) => g.label === "gamesMenu").flatMap((g) => g.sections.flatMap((s) => s.items)).filter(isLiveEntry).map((e) => e.live as string);
  const ids = new Set<string>(GAME_IDS);
  // views3d is a game without a ladder.
  assert.deepEqual(menu.filter((g) => !ids.has(g)), ["views3d"]);
  assert.deepEqual(GAME_IDS.filter((g) => !menu.includes(g)), [], "every assignable game is in the menu");
});

test("game keys: the pass rule, and stars merged and checked", () => {
  assert.equal(GAME_PASS_STARS, PASS_STARS);
  assert.deepEqual(mergeStars([3, 0], [1, 2, 1]), [3, 2, 1]);
  assert.equal(ladderDone([2, 3, 2]), true);
  assert.equal(ladderDone([2, 1]), false);
  assert.equal(ladderDone([]), false);
  assert.deepEqual(parseStars([0, 3]), [0, 3]);
  for (const bad of [[], [4], [1.5], ["2"], "3", Array(41).fill(1)]) assert.equal(parseStars(bad), null, JSON.stringify(bad));
});
