// Be the hash ring: a player who makes the code's operations leaves every key on the server a plain walk round the ring
// finds, on every puzzle and endless task, and moves only the keys whose server changes, each once; every other
// operation is refused with the rule it broke; the tasks are worth playing; and the stars, notices, pictures, log and
// words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, checkOp, CODE, expect as next, logText, ownerOf, replay, RING_ALGOS, RING_LADDER, ringNotice, ringNow, ringRun, ringStars, ringSvg, serverName, startMachine, type RingAttempt, type RingLevel, type RingMachine, type RingNode, type RingTask, type RingWhy } from "../src/math/beRing.ts";

const tasks = (): { t: RingTask; where: string }[] => [
  ...RING_LADDER.map((_, stage) => ({ t: ringNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as RingLevel[]).flatMap((level) => Array.from({ length: 60 }, (_, i) => ({ t: ringNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** The node a position meets first, walking round the ring a step at a time. */
const walk = (nodes: RingNode[], h: number) => {
  for (let p = h; ; p = (p + 1) % 100) {
    const n = nodes.find((x) => x.h === p);
    if (n) return n.id;
  }
};
/** Each key's node at the end, and how many keys change node, by a plain walk after every event. */
function plain(t: RingTask) {
  let nodes = [...t.nodes];
  const on = new Map(t.keys.map((key) => [key.k, walk(nodes, key.h)]));
  const pos = new Map(t.keys.map((key) => [key.k, key.h]));
  let moved = 0;
  for (const ev of t.events) {
    if (ev.kind === "key") {
      on.set(ev.k, walk(nodes, ev.h));
      pos.set(ev.k, ev.h);
      continue;
    }
    nodes = ev.kind === "add" ? [...nodes, { id: serverName(ev.s), s: ev.s, h: ev.h }] : nodes.filter((n) => n.s !== ev.s);
    for (const [k, at] of on) {
      const to = walk(nodes, pos.get(k)!);
      if (to !== at) moved++;
      on.set(k, to);
    }
  }
  return { on, moved };
}

/** Every operation the board lets the player try: the new key, or any key on the ring, onto any server. */
const attempts = (m: RingMachine): RingAttempt[] => {
  const keys: ("new" | number)[] = next(m) === "place" ? ["new"] : m.keys.map((_, i) => i);
  return keys.flatMap((key) => m.nodes.map((n) => ({ key, to: n.id })));
};
function right(m: RingMachine, a: RingAttempt): boolean {
  if (next(m) === "place") return a.to === ownerOf(m.nodes, (m.task.events[m.e] as { h: number }).h).id;
  const i = a.key as number;
  return m.pending.includes(i) && a.to === ownerOf(m.nodes.filter((n) => n.s !== m.leaving), m.keys[i].h).id;
}

test("the code's own operations leave each key where a plain walk round the ring finds it, moving only the keys that change server", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = ringRun(t);
    const p = plain(t);
    assert.deepEqual(new Map(end.keys.map((key) => [key.k, key.at])), p.on, `${where}: ${JSON.stringify(t)}`);
    assert.equal(ops.filter((c) => c > 0).length, p.moved, where);
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.leaving, null, where);
  }
});

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<RingWhy>();
  for (const { t, where } of tasks().filter((_, i) => i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of ringRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.ok(c.code === code || (code > 0 && m.pending.includes(c.code - 1)), where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    const c = checkOp(m, { key: "new", to: "A" });
    assert.equal(c.ok, false);
    if (!c.ok) why.add(c.why);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beRing.why).sort());
});

test("the keys to move can go in any order", () => {
  const t = ringNow({ mode: "puzzle", stage: 3, level: 1, seed: 1 });
  let m = startMachine(t);
  const order = [...m.pending].reverse();
  for (const i of order) {
    const c = checkOp(m, { key: i, to: ownerOf(m.nodes.filter((n) => n.s !== m.leaving), m.keys[i].h).id });
    assert.ok(c.ok);
    m = apply(m, c.code);
  }
  assert.deepEqual(m.keys.map((key) => key.at), ringRun(t).end.keys.map((key) => key.at));
});

test("the slips worked by hand", () => {
  const say = (m: RingMachine, a: RingAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  const nodes: RingNode[] = [{ id: "A", s: 0, h: 10 }, { id: "B", s: 1, h: 40 }, { id: "C", s: 2, h: 70 }];
  // Lookups: dog at 50 meets C at 70 first; yak at 90 has nothing after it, so goes round to A at 10.
  const look: RingTask = { algo: "lookup", nodes, keys: [], events: [{ kind: "key", k: "dog", h: 50 }, { kind: "key", k: "yak", h: 90 }] };
  let m = startMachine(look);
  assert.equal(say(m, { key: "new", to: "B" }), `clockwise {"h":50,"s":"C","p":70}`);
  m = apply(m, 0);
  assert.equal(say(m, { key: "new", to: "C" }), `wrapRound {"h":90,"s":"A","p":10}`);
  m = apply(m, 0);
  assert.equal(logText(m.log.at(-1)!, look), "yak @ 90 → A@10 (round past 99)");
  assert.deepEqual(m.seen, ["wrap"]);
  assert.equal(say(m, { key: "new", to: "A" }), "allDone {}");
  // D joins at 25: ant at 20 now meets D first; bee at 30 still meets B.
  const add: RingTask = { algo: "add", nodes, keys: [{ k: "ant", h: 20 }, { k: "bee", h: 30 }, { k: "cat", h: 50 }], events: [{ kind: "add", s: 3, h: 25 }] };
  m = startMachine(add);
  assert.equal(logText(m.log.at(-1)!, add), "D joins @ 25; 1 key to move");
  assert.equal(say(m, { key: 1, to: "D" }), `stays {"k":"bee","s":"B","x":"D"}`);
  assert.equal(say(m, { key: 0, to: "A" }), `toNew {"k":"ant","s":"D"}`);
  m = apply(m, 1);
  assert.equal(logText(m.log.at(-1)!, add), "ant @ 20: B → D");
  // B leaves: ant moves on to C; cat was never on B.
  const rem: RingTask = { algo: "remove", nodes, keys: [{ k: "ant", h: 20 }, { k: "cat", h: 50 }], events: [{ kind: "remove", s: 1 }] };
  m = startMachine(rem);
  assert.equal(say(m, { key: 1, to: "A" }), `notLeaving {"k":"cat","s":"B"}`);
  assert.equal(say(m, { key: 0, to: "A" }), `successor {"k":"ant","s":"C","x":"B"}`);
  m = apply(m, 1);
  assert.deepEqual(m.log.slice(-2).map((l) => logText(l, rem)), ["ant @ 20: B → C", "B deleted from the ring"]);
  assert.deepEqual(m.seen, ["toSuccessor"]);
  assert.equal(logText(m.log[0], rem), "ring = [A@10, B@40, C@70]");
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = ringRun(t);
    assert.ok(ops.length >= 2, where);
    if (t.algo === "lookup") assert.ok(end.seen.includes("wrap"), where);
    if (t.algo === "vnodes") assert.ok(end.seen.includes("vnodes"), where);
    if (t.algo === "remove") assert.ok(end.seen.includes("toSuccessor"), where);
  }
  RING_LADDER.forEach((s, stage) => {
    const end = ringRun(ringNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    if (s.algo) assert.equal(end.task.algo, s.algo);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(RING_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(ringStars), [3, 2, 1, 1]);
  const end = ringRun(ringNow({ mode: "puzzle", stage: 2, level: 1, seed: 1 })).end;
  assert.deepEqual(end.seen, ["fewMoved"]);
  assert.equal(ringNotice(end, 0, 2), "fewMoved");
  assert.equal(ringNotice(end, 1, 2), null);
  assert.equal(ringNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of ringRun(t).ops) {
      const pic = ringSvg(m, { hot: "nA", sel: "new" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const pair =
        code === 0
          ? ["new", `n${ownerOf(m.nodes, (t.events[m.e] as { h: number }).h).id}`]
          : [`k${code - 1}`, `n${ownerOf(m.nodes.filter((n) => n.s !== m.leaving), m.keys[code - 1].h).id}`];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(ringSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beRing);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beRing));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeRing);
  }
  for (const algo of RING_ALGOS) assert.ok(en.live.beRing.names[algo] && en.live.beRing.hint[algo] && en.live.beRing.right[algo].includes("{stars}"));
});
