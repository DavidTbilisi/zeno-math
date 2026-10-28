// Be the heap: a player who makes the code's operations ends with what a plain heap gives (the same array after each
// push and heapify, out[] sorted, the k-th largest), the heap order holding whenever no sift runs; every other operation
// is refused with the rule it broke; the tasks are worth playing; and the stars, notices, pictures, log and words follow
// the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, capacity, checkOp, CODE, expect as next, HEAP_ALGOS, HEAP_LADDER, heapNotice, heapNow, heapRun, heapStars, heapSvg, logText, nextS, OPS, partner, replay, startMachine, type HeapAttempt, type HeapLevel, type HeapMachine, type HeapTask, type HeapWhy } from "../src/math/beHeap.ts";

const tasks = (): { t: HeapTask; where: string }[] => [
  ...HEAP_LADDER.map((_, stage) => ({ t: heapNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as HeapLevel[]).flatMap((level) => Array.from({ length: 40 }, (_, i) => ({ t: heapNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** A plain min-heap, as a textbook writes it. */
function siftDown(h: number[], i: number) {
  for (;;) {
    const [l, r] = [2 * i + 1, 2 * i + 2];
    let c = l;
    if (r < h.length && h[r] < h[l]) c = r;
    if (l >= h.length || h[c] >= h[i]) return;
    [h[i], h[c]] = [h[c], h[i]];
    i = c;
  }
}
function push(h: number[], x: number) {
  h.push(x);
  for (let i = h.length - 1; i > 0 && h[(i - 1) >> 1] > h[i]; i = (i - 1) >> 1) [h[i], h[(i - 1) >> 1]] = [h[(i - 1) >> 1], h[i]];
}
const ordered = (h: (number | null)[]) => h.every((v, i) => i === 0 || (h[(i - 1) >> 1]! <= v!));

test("the code's own operations end with what a plain heap gives, the heap order holding whenever no sift runs", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = heapRun(t);
    if (t.algo === "push") {
      const h: number[] = [];
      t.a.forEach((x) => push(h, x));
      assert.deepEqual(end.heap, h, where);
    } else if (t.algo === "heapify") {
      const h = [...t.a];
      for (let s = (h.length >> 1) - 1; s >= 0; s--) siftDown(h, s);
      assert.deepEqual(end.heap, h, where);
    } else if (t.algo === "pop") {
      assert.ok(ordered(t.a), where);
      assert.deepEqual(end.out, [...t.a].sort((x, y) => x - y), where);
      assert.deepEqual(end.heap, [], where);
    } else assert.equal(end.ret, [...t.a].sort((x, y) => y - x)[t.k - 1], where);
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.log.length, ops.length + 1, where);
    let m = startMachine(t);
    for (const code of ops) {
      m = apply(m, code);
      assert.ok(m.heap.length <= capacity(t), where);
      if (partner(m) === null && m.heap[0] !== null && !(t.algo === "heapify" && next(m) === "next")) assert.ok(ordered(m.heap), `${where}: ${m.heap}`);
    }
  }
});

/** Every operation the board lets the player try. */
function attempts(m: HeapMachine): HeapAttempt[] {
  const { algo, a } = m.task;
  const h = m.heap;
  const at: HeapAttempt[] = [];
  const idx = [...h.keys()];
  if ((algo === "push" || algo === "topK") && m.j < a.length) {
    for (let to = 0; to <= Math.min(h.length, capacity(m.task) - 1); to++) at.push({ kind: "put", to });
    if (algo === "topK") at.push({ kind: "skip" });
  }
  for (const from of idx.filter((i) => h[i] !== null)) {
    for (const to of idx) if (to !== from) at.push({ kind: "node", from, to });
    if (algo === "pop") at.push({ kind: "take", from });
    if (algo === "topK") at.push({ kind: "return", from });
  }
  if (algo === "heapify") for (const to of idx) at.push({ kind: "next", to });
  return at;
}
function right(m: HeapMachine, a: HeapAttempt): boolean {
  const e = next(m);
  const h = m.heap;
  if (e === "swap") return a.kind === "node" && [a.from, a.to].sort().join() === [m.cur!, partner(m)!].sort().join();
  if (e === "append") return a.kind === "put" && a.to === h.length;
  if (e === "replace") return a.kind === "put" && a.to === 0;
  if (e === "skip") return a.kind === "skip";
  if (e === "take") return a.kind === "take" && a.from === 0;
  if (e === "fill") return a.kind === "node" && a.from === h.length - 1 && a.to === 0;
  if (e === "next") return a.kind === "next" && a.to === nextS(m);
  return a.kind === "return" && a.from === 0;
}

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<HeapWhy>();
  for (const { t, where } of tasks().filter((_, i) => i < HEAP_LADDER.length || i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of heapRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    for (const a of attempts(m)) assert.equal(checkOp(m, a).ok, false, where);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beHeap.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: HeapMachine, a: HeapAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  const [A, S, T, F, N, Rp, Sk, Rt] = OPS.map((_, i) => i);
  // Pushing 5 9 7 2: 2 lands at heap[3] and climbs past 9, then past 5, to the root.
  const pu: HeapTask = { algo: "push", a: [5, 9, 7, 2], k: 0 };
  let m = replay(pu, [A, A, A]);
  assert.equal(say(m, { kind: "put", to: 1 }), `atEnd {"n":3}`);
  m = apply(m, A);
  assert.equal(logText(m.log.at(-1)!, pu), "heap.append(2) → heap[3] = 2");
  assert.equal(say(m, { kind: "put", to: 4 }), `siftFirst {"hi":9,"lo":2}`);
  assert.equal(say(m, { kind: "node", from: 3, to: 2 }), `notFamily {"i":3,"j":2}`);
  assert.equal(say(m, { kind: "node", from: 0, to: 2 }), `follow {"i":3,"v":2}`);
  m = apply(m, S);
  assert.equal(logText(m.log.at(-1)!, pu), "swap(3, 1): heap[3] = 9, heap[1] = 2");
  assert.equal(say(m, { kind: "node", from: 1, to: 3 }), `upParent {"v":2,"w":5}`);
  m = apply(m, S);
  assert.deepEqual([m.heap, m.seen], [[2, 5, 7, 9], ["toRoot"]]);
  assert.equal(say(m, { kind: "node", from: 0, to: 1 }), "inOrder {}");
  // Popping 1 3 2 8 4: the last leaf 4 fills the hole and sinks past the smaller child 2.
  const po: HeapTask = { algo: "pop", a: [1, 3, 2, 8, 4], k: 0 };
  let p = startMachine(po);
  assert.equal(say(p, { kind: "take", from: 2 }), `rootOnly {"root":1}`);
  p = apply(p, T);
  assert.equal(say(p, { kind: "node", from: 3, to: 0 }), `lastFills {"v":4,"at":4}`);
  assert.equal(say(p, { kind: "take", from: 1 }), "fillFirst {}");
  p = apply(p, F);
  assert.equal(logText(p.log.at(-1)!, po), "heap[0] = heap.pop() = 4");
  assert.equal(say(p, { kind: "node", from: 0, to: 1 }), `smallerChild {"c":2,"w":3}`);
  p = apply(p, S);
  assert.equal(logText(replay(po, heapRun(po).ops).log.at(-1)!, po), "out.append(8) → out = [1, 2, 3, 4, 8]");
  // Sinking 9 in 9 1 2 7 3: it swaps with 1, then with 3 below it, never back up.
  const hp: HeapTask = { algo: "heapify", a: [9, 1, 2, 7, 3], k: 0 };
  let q = startMachine(hp);
  assert.equal(say(q, { kind: "next", to: 4 }), `lastParent {"s":1,"n":5}`);
  assert.equal(say(q, { kind: "node", from: 0, to: 1 }), `moveS {"s":1}`);
  q = [N, N].reduce(apply, q);
  assert.equal(logText(q.log.at(-1)!, hp), "s = 0; i = 0");
  q = apply(q, S);
  assert.equal(say(q, { kind: "node", from: 1, to: 0 }), `downChild {"v":9,"c":3}`);
  assert.equal(say(q, { kind: "next", to: 0 }), `siftFirst {"hi":9,"lo":3}`);
  assert.equal(say(replay(hp, [N]), { kind: "next", to: 1 }), `downByOne {"s":0}`);
  assert.equal(say(replay(hp, heapRun(hp).ops), { kind: "next", to: 0 }), "inOrder {}");
  // The 2nd largest of 4 1 6 3 5 with a heap of two: 6 and 5 replace the root, 1 and 3 are skipped.
  const tk: HeapTask = { algo: "topK", a: [4, 1, 6, 3, 5], k: 2 };
  let r = replay(tk, [A]);
  assert.equal(say(r, { kind: "skip" }), `notFull {"size":1,"k":2}`);
  r = [A, S].reduce(apply, r);
  assert.equal(say(r, { kind: "put", to: 2 }), `full {"k":2,"x":6,"root":1}`);
  r = replay(tk, [A, A, S, Rp]);
  assert.equal(logText(r.log.at(-1)!, tk), "6 > heap[0] = 1: heap[0] = 6");
  r = replay(tk, [A, A, S, Rp, S]);
  assert.equal(say(r, { kind: "put", to: 0 }), `skipSmall {"x":3,"root":4}`);
  r = apply(r, Sk);
  assert.equal(logText(r.log.at(-1)!, tk), "3 ≤ heap[0] = 4: skip");
  assert.equal(say(r, { kind: "skip" }), `bigger {"x":5,"root":4}`);
  assert.equal(say(r, { kind: "put", to: 1 }), `full {"k":2,"x":5,"root":4}`);
  assert.equal(say(r, { kind: "return", from: 0 }), `returnEarly {"left":1}`);
  const end = replay(tk, heapRun(tk).ops.slice(0, -1));
  assert.equal(say(end, { kind: "return", from: 1 }), `rootOnly {"root":5}`);
  assert.equal(logText(apply(end, Rt).log.at(-1)!, tk), "return heap[0] = 5");
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { ops } = heapRun(t);
    const count = (op: string) => ops.filter((c) => OPS[c] === op).length;
    assert.ok((t.algo === "heapify" || ops.length >= 8) && count("swap") >= 3, where);
    if (t.algo === "topK") assert.ok(count("replace") >= 2 && count("skip") >= 2, where);
  }
  HEAP_LADDER.forEach((s, stage) => {
    const end = heapRun(heapNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    assert.equal(end.task.algo, s.algo);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(HEAP_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(heapStars), [3, 2, 1, 1]);
  const end = heapRun({ algo: "pop", a: [1, 3, 2], k: 0 }).end;
  assert.deepEqual(end.seen, ["heapSort"]);
  assert.equal(heapNotice(end, 0, 2), "heapSort");
  assert.equal(heapNotice(end, 1, 2), null);
  assert.equal(heapNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i < HEAP_LADDER.length || i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of heapRun(t).ops) {
      const pic = heapSvg(m, { hot: "h1", sel: "t0" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const h = m.heap;
      const pair =
        e === "swap" ? [`h${m.cur}`, `t${partner(m)}`]
        : e === "append" ? ["x", `h${h.length}`]
        : e === "replace" ? ["x", "t0"]
        : e === "skip" ? ["x", "skip"]
        : e === "take" ? ["t0", "out"]
        : e === "fill" ? [`h${h.length - 1}`, "t0"]
        : e === "next" ? ["s", `h${nextS(m)}`]
        : ["h0", "ret"];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(heapSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beHeap);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beHeap));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeHeap);
  }
  for (const algo of HEAP_ALGOS) assert.ok(en.live.beHeap.names[algo] && en.live.beHeap.hint[algo] && en.live.beHeap.right[algo].includes("{stars}"));
});
