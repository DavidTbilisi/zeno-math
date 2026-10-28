// Name the component: every requirement names one component and every component has three; a right tile is the
// requirement's component and any other is refused with the tile chosen; the rounds draw requirements of different
// components, with look-alikes when asked; the notices, stars and picture follow the rules; each clue stands word for
// word in its requirement in every language; and each requirement with a game opens it at a puzzle of its own kind.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { fill } from "../src/math/text.ts";
import { CACHE_LADDER } from "../src/math/beCache.ts";
import { LB_LADDER } from "../src/math/beBalance.ts";
import { QUEUE_LADDER } from "../src/math/beQueue.ts";
import { QUORUM_LADDER } from "../src/math/beQuorum.ts";
import { LIMIT_LADDER } from "../src/math/beLimit.ts";
import { RING_LADDER } from "../src/math/beRing.ts";
import { apply, checkOp, COMP_LADDER, compNotice, compNow, compRun, compStars, compSvg, COMPONENTS, expect as next, GAMES, LOOKALIKE, PLAY, replay, REQ_IDS, REQS, startMachine, wrap, type CompLevel, type CompTask } from "../src/math/beComp.ts";

const tasks = (): { t: CompTask; where: string; size: number; looks?: boolean }[] => [
  ...COMP_LADDER.map((s, stage) => ({ t: compNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `round ${stage + 1}`, size: s.size, looks: s.looks })),
  ...([1, 2, 3] as CompLevel[]).flatMap((level) => Array.from({ length: 40 }, (_, i) => ({ t: compNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}`, size: [4, 6, 8][level - 1], looks: level === 3 }))),
];

test("every component has three requirements, and every requirement one component", () => {
  for (const p of COMPONENTS) assert.equal(REQ_IDS.filter((id) => REQS[id] === p).length, 3, p);
  for (const ids of Object.values(LOOKALIKE)) for (const id of ids) assert.ok(REQS[id], id);
});

test("only the requirement's own component is taken; any other tile is refused, naming it", () => {
  for (const { t, where } of tasks()) {
    let m = startMachine(t);
    for (const code of compRun(t).ops) {
      COMPONENTS.forEach((p, tile) => {
        const c = checkOp(m, tile);
        assert.equal(c.ok, p === next(m), where);
        if (!c.ok) assert.deepEqual(c.vars, { tile: p });
      });
      m = apply(m, code);
    }
    assert.equal(next(m), null);
    assert.deepEqual(m.answered, t.items.map((i) => REQS[i.id]), where);
    assert.deepEqual(replay(t, compRun(t).ops), m, where);
  }
});

test("each round draws requirements of different components, with look-alikes when asked", () => {
  for (const { t, where, size, looks } of tasks()) {
    const pats = t.items.map((i) => REQS[i.id]);
    assert.equal(t.items.length, size, where);
    assert.equal(new Set(pats).size, size, where);
    if (looks) assert.ok(Object.values(LOOKALIKE).some((g) => new Set(t.items.filter((i) => g.includes(i.id)).map((i) => REQS[i.id])).size >= 2), where);
    for (const i of t.items) assert.ok(i.n >= 5 && i.n <= 12 && i.x >= 10 && i.x <= 99 && i.k >= 2 && i.k <= 5, where);
  }
  assert.ok(COMP_LADDER.slice(0, 2).every((s) => s.size === 6) && COMP_LADDER[8].size === 12);
});

test("stars and notices: no miss three, one two; the look-alikes a clean round told apart, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(compStars), [3, 2, 1, 1]);
  const item = (id: string) => ({ id, n: 5, x: 10, k: 2 });
  const faster = compRun({ items: [item("c1"), item("i1")] }).end;
  assert.deepEqual(faster.seen, ["faster"]);
  const scale = compRun({ items: [item("l1"), item("r1"), item("s1")] }).end;
  assert.deepEqual(scale.seen, ["scale"]);
  assert.deepEqual(compRun({ items: [item("i2"), item("e1")] }).end.seen, ["finding"]);
  assert.deepEqual(compRun({ items: [item("c1"), item("c2")] }).end.seen, []);
  assert.equal(compNotice(faster, 0, 2), "faster");
  assert.equal(compNotice(faster, 1, 2), null);
  assert.equal(compNotice(scale, 3, 10), "streak10");
});

test("every picture draws without a gap, with the card and the right tile to drop it on", () => {
  const W = en.live.beComp;
  const names = COMPONENTS.map((p) => W.tiles[p]);
  for (const { t, where } of tasks().filter((_, i) => i % 5 === 0)) {
    let m = startMachine(t);
    for (const code of compRun(t).ops) {
      const it = t.items[m.k];
      const pic = compSvg(m, { text: fill(W.problems[it.id as keyof typeof W.problems], it), clue: "", names, showClue: false }, { hot: "tile0", sel: "card" });
      assert.ok(!/NaN|undefined|null/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      assert.ok(pic.spots.find((s) => s.id === "card")?.from && pic.spots.find((s) => s.id === `tile${code}`)?.to, where);
      m = apply(m, code);
    }
    assert.ok(!pic(m).spots.some((s) => s.from || s.to));
  }
  function pic(m: ReturnType<typeof startMachine>) {
    return compSvg(m, { text: "done", clue: "x", names, showClue: true }, { finished: true });
  }
  assert.deepEqual(wrap("a bb ccc dddd", 6), ["a bb", "ccc", "dddd"]);
});

test("the words: every clue stands in its requirement in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beComp);
  for (const dict of [en, ka, ru]) {
    const W = dict.live.beComp;
    const other = new Map(flat(W));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    for (const id of REQ_IDS) {
      const vars = { n: 7, x: 42, k: 3 };
      const [text, clue] = [fill(W.problems[id as keyof typeof W.problems], vars), fill(W.clues[id as keyof typeof W.clues], vars)];
      assert.ok(text.includes(clue), `${id}: ${clue}`);
    }
    assert.deepEqual(Object.keys(W.tiles).sort(), [...COMPONENTS].sort());
    assert.deepEqual(Object.keys(W.needs).sort(), [...COMPONENTS].sort());
    assert.ok(dict.shapes.names.liveBeComp);
  }
});

test("each requirement with a game opens it at a puzzle of its own kind", () => {
  const ladders: Record<string, readonly { algo?: string | null }[]> = {
    beCache: CACHE_LADDER, beBalance: LB_LADDER, beQueue: QUEUE_LADDER, beQuorum: QUORUM_LADDER, beLimit: LIMIT_LADDER, beRing: RING_LADDER,
  };
  // What each requirement is, worked by hand: a dead server is round robin with one down, a burst is the token bucket…
  const kind: Record<string, string> = {
    c1: "lru", c2: "lru", c3: "lru", l1: "rr", l2: "rr", l3: "rr", q1: "group", q2: "group", q3: "group",
    r1: "majority", r2: "outage", r3: "majority", m1: "bucket", m2: "fixed", m3: "sliding", g1: "add", g2: "add", g3: "lookup",
  };
  assert.deepEqual(Object.keys(PLAY).sort(), REQ_IDS.filter((id) => GAMES[REQS[id]]).sort());
  for (const [id, stage] of Object.entries(PLAY)) assert.equal(ladders[GAMES[REQS[id]]!][stage].algo, kind[id], id);
  // A server dying, and a deploy server by server, want a server down.
  assert.ok((LB_LADDER[PLAY.l2] as { down?: boolean }).down && (LB_LADDER[PLAY.l3] as { down?: boolean }).down);
});
