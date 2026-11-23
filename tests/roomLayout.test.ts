// The roadmap as a walk through rooms (#584): every goal has a stored layout that matches the generator, places never
// move when an item is added, every place is drawn inside its room, every item has a mark that differs from its room's
// others, and the walk-it check works on every goal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_SKILLS } from "../src/math/practiceSkills.ts";
import { GAME_KEYS, games, GOALS, itemId, itemsOf, skills, type GameId, type Roadmap } from "../src/model/roadmap.ts";
import { ROADMAPS } from "../src/model/roadmaps/index.ts";
import { itemGlyph } from "../src/model/roomGlyphs.ts";
import { CELL_H, CELL_W, layOut, placeAt, ROOM_W, roomH, roomsOf, walkQuestion, WALK_CHOICES } from "../src/model/roomLayout.ts";
import { ROOM_LAYOUTS } from "../src/model/roomLayouts.ts";
import { roomFile, roomLayouts } from "../scripts/room-layouts.ts";

/** A seeded random number in [0, 1), so a failure can be replayed. */
const seeded = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

test("every goal has a stored layout, and it is what the generator makes", () => {
  for (const g of GOALS) {
    const stored = ROOM_LAYOUTS[g];
    assert.ok(stored, `${g} has no stored layout: run npm run room-layouts -- --write`);
    assert.deepEqual(layOut(ROADMAPS[g], stored), stored, `${g}'s stored layout is out of date: run npm run room-layouts -- --write`);
    assert.deepEqual(Object.keys(stored), ROADMAPS[g].stages.map((s) => s.id));
    // Every item has exactly one place, in its own stage's room.
    for (const st of ROADMAPS[g].stages) assert.deepEqual([...stored[st.id]].filter((x) => x !== null).sort(), st.items.map(itemId).sort(), `${g}/${st.id}`);
  }
  // The file on disk is the generator's text, so writing it again changes nothing.
  assert.equal(roomFile(roomLayouts()), roomFile(ROOM_LAYOUTS as ReturnType<typeof roomLayouts>));
});

test("a first layout walks the curriculum's order", () => {
  for (const g of GOALS) for (const st of ROADMAPS[g].stages) assert.deepEqual(layOut({ stages: [st] })[st.id], st.items.map(itemId));
});

test("adding an item at the end of a stage or a goal moves no place", () => {
  for (const g of GOALS) {
    const r = ROADMAPS[g];
    const stored = ROOM_LAYOUTS[g]!;
    const extra = [...skills(...ALL_SKILLS), ...games(...(Object.keys(GAME_KEYS) as GameId[]))].find((i) => !itemsOf(r).some((j) => itemId(j) === itemId(i)))!;
    for (const [n, st] of r.stages.entries()) {
      const added: Roadmap = { ...r, stages: r.stages.map((s, m) => (m === n ? { ...s, items: [...s.items, extra] } : s)) };
      const grown = layOut(added, stored);
      for (const s of r.stages) assert.deepEqual(grown[s.id].slice(0, stored[s.id].length), [...stored[s.id]], `${g}/${s.id} moved when ${st.id} grew`);
      assert.deepEqual(grown[st.id], [...stored[st.id], itemId(extra)], "the new item takes the next place");
    }
  }
});

test("an item taken off leaves its place empty, and the next new one fills it", () => {
  const st = ROADMAPS.software.stages[0];
  const stored = { [st.id]: st.items.map(itemId) };
  const without = layOut({ stages: [{ ...st, items: st.items.filter((_, k) => k !== 2) }] }, stored)[st.id];
  assert.equal(without[2], null);
  assert.deepEqual(without.filter((_, k) => k !== 2), stored[st.id].filter((_, k) => k !== 2));
  const refilled = layOut({ stages: [{ ...st, items: [...st.items.filter((_, k) => k !== 2), ...skills("compare")] }] }, { [st.id]: without })[st.id];
  assert.equal(refilled[2], "skill:compare");
});

test("every place sits in its own cell inside the room, the snake turning at each row's end", () => {
  const seen = new Set<string>();
  for (let k = 0; k < 80; k++) {
    const { x, y, row, col } = placeAt(k);
    assert.ok(x - CELL_W / 2 >= 0 && x + CELL_W / 2 <= ROOM_W && y + CELL_H / 2 <= roomH(k + 1), `place ${k}`);
    assert.ok(!seen.has(`${row},${col}`));
    seen.add(`${row},${col}`);
    if (k) assert.equal(Math.abs(placeAt(k - 1).col - col) + Math.abs(placeAt(k - 1).row - row), 1, "each place is next to the one before");
  }
});

test("every item has a mark, different from the others in its room", () => {
  for (const g of GOALS)
    for (const st of ROADMAPS[g].stages) {
      const marks = st.items.map(itemGlyph);
      for (const m of marks) assert.ok(m.trim(), `${g}/${st.id}`);
      const twice = marks.filter((m, k) => marks.indexOf(m) !== k);
      assert.deepEqual(twice, [], `${g}/${st.id} shows ${twice.join(" ")} twice`);
    }
});

test("the walk-it check works on every goal: one empty place, three different choices, the answer among them", () => {
  for (const g of GOALS) {
    const rooms = roomsOf(ROADMAPS[g], ROOM_LAYOUTS[g]);
    assert.equal(rooms.flatMap((r) => r.places).filter(Boolean).length, itemsOf(ROADMAPS[g]).length);
    const random = seeded(GOALS.indexOf(g) + 1);
    for (let n = 0; n < 50; n++) {
      const q = walkQuestion(rooms, random)!;
      assert.equal(rooms[q.room].places[q.place], q.answer);
      assert.equal(q.choices.length, WALK_CHOICES);
      assert.equal(new Set(q.choices).size, WALK_CHOICES);
      assert.ok(q.choices.includes(q.answer));
      // The wrong choices come from other rooms, so the room shown doesn't give them away.
      for (const c of q.choices) if (c !== q.answer) assert.ok(!rooms[q.room].places.includes(c), `${g}: a choice is seen in the room`);
    }
  }
});

test("on a goal of one small room the choices come from the room itself", () => {
  const q = walkQuestion(roomsOf({ stages: [{ id: "a", items: skills("compare", "times", "money") }] }), seeded(3))!;
  assert.equal(q.choices.length, 3);
  assert.equal(walkQuestion([]), null);
});
