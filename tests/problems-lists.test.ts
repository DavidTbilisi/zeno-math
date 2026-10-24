// The linked-list problems give the right answers: on their examples, on cases picked to catch a slip (one node, the
// head removed, no shared node, a loop back to the head), and on random lists checked against doing the same to a
// plain array; bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const L = (a: readonly number[]) => `[${a.map((v) => (v < 0 ? `−${-v}` : String(v))).join(", ")}]`;
const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);

test("remove duplicates from linked list", () => {
  assert.equal(answer("removeDuplicatesFromLinkedList", "2, 2, 3, 5, 5, 5, 8, 9, 9"), "Without repeats: [2, 3, 5, 8, 9]");
  assert.equal(answer("removeDuplicatesFromLinkedList", "4"), "Without repeats: [4]");
  assert.equal(answer("removeDuplicatesFromLinkedList", "1, 1, 1"), "Without repeats: [1]");
  assert.throws(() => answer("removeDuplicatesFromLinkedList", "3, 1"), /sorted/);
  const r = rng(11);
  for (let k = 0; k < 150; k++) {
    const xs = sortNum(randInts(r, 1 + (k % 12), -5, 5));
    assert.equal(answer("removeDuplicatesFromLinkedList", xs.join(", ")), `Without repeats: ${L([...new Set(xs)])}`, `${xs}`);
  }
});

test("middle node", () => {
  assert.equal(answer("middleNode", "4, 8, 15, 16, 23, 42"), "The middle node is 16; from it the list reads [16, 23, 42].");
  assert.equal(answer("middleNode", "7"), "The middle node is 7; from it the list reads [7].");
  assert.equal(answer("middleNode", "1, 2, 3"), "The middle node is 2; from it the list reads [2, 3].");
  const r = rng(12);
  for (let k = 0; k < 100; k++) {
    const xs = randInts(r, 1 + (k % 12), -9, 9);
    const m = Math.floor(xs.length / 2);
    assert.equal(answer("middleNode", xs.join(", ")), `The middle node is ${L([xs[m]]).slice(1, -1)}; from it the list reads ${L(xs.slice(m))}.`);
  }
});

test("linked list construction", () => {
  assert.equal(
    answer("linkedListConstruction", "1, 2, 3", "setHead 4, insertAfter 2 7, setTail 2, removeNodesWithValue 2, insertAtPosition 1 9, insertBefore 3 5, contains 7, contains 2"),
    "Head to tail: [9, 4, 1, 7, 5, 3]; contains answered yes, no.",
  );
  assert.equal(answer("linkedListConstruction", "", "setTail 1, setTail 2, setHead 0"), "Head to tail: [0, 1, 2]");
  assert.equal(answer("linkedListConstruction", "1", "insertAtPosition 9 5, insertBefore 8 3"), "Head to tail: [1, 5]");
  assert.equal(answer("linkedListConstruction", "1, 1", "removeNodesWithValue 1, contains 1"), "Head to tail: []; contains answered no.");
  assert.throws(() => answer("linkedListConstruction", "1", "jump 3"), /doesn't fit/);
  assert.throws(() => answer("linkedListConstruction", "1", "setHead"), /doesn't fit/);
  assert.throws(() => answer("linkedListConstruction", "1", ""), /Write something/);
  // Random operations against a plain array, worked out the obvious way.
  const r = rng(13);
  for (let k = 0; k < 150; k++) {
    const list = randInts(r, k % 4, 0, 5);
    const start = [...list];
    const ops: string[] = [];
    const asked: string[] = [];
    for (let j = 0; j < 1 + (k % 8); j++) {
      const [x, y] = randInts(r, 2, 0, 5);
      const kind = Math.floor(r() * 7);
      if (list.length >= 11 && kind < 5) continue;
      if (kind === 0) ops.push(`setHead ${x}`), list.unshift(x);
      else if (kind === 1) ops.push(`setTail ${x}`), list.push(x);
      else if (kind === 2) {
        ops.push(`insertBefore ${x} ${y}`);
        if (list.includes(x)) list.splice(list.indexOf(x), 0, y);
      } else if (kind === 3) {
        ops.push(`insertAfter ${x} ${y}`);
        if (list.includes(x)) list.splice(list.indexOf(x) + 1, 0, y);
      } else if (kind === 4) {
        const p = 1 + Math.floor(r() * 6);
        ops.push(`insertAtPosition ${p} ${y}`);
        list.splice(Math.min(p - 1, list.length), 0, y);
      } else if (kind === 5) {
        ops.push(`removeNodesWithValue ${x}`);
        for (let i = list.length - 1; i >= 0; i--) if (list[i] === x) list.splice(i, 1);
      } else ops.push(`contains ${x}`), asked.push(list.includes(x) ? "yes" : "no");
    }
    if (!ops.length) continue;
    const want = asked.length ? `Head to tail: ${L(list)}; contains answered ${asked.join(", ")}.` : `Head to tail: ${L(list)}`;
    assert.equal(answer("linkedListConstruction", start.join(", "), ops.join(", ")), want, `${start} / ${ops}`);
  }
});

test("remove kth node from end", () => {
  assert.equal(answer("removeKthNodeFromEnd", "3, 9, 4, 7, 1, 6, 2", "3"), "Removing 1 leaves [3, 9, 4, 7, 6, 2]");
  assert.equal(answer("removeKthNodeFromEnd", "3, 9, 4", "3"), "Removing 3 leaves [9, 4]");
  assert.equal(answer("removeKthNodeFromEnd", "3, 9, 4", "1"), "Removing 4 leaves [3, 9]");
  assert.throws(() => answer("removeKthNodeFromEnd", "3, 9, 4", "4"), /from 1 to 3/);
  assert.throws(() => answer("removeKthNodeFromEnd", "3", "1"), /At least 2/);
  const r = rng(14);
  for (let k = 0; k < 100; k++) {
    const xs = randInts(r, 2 + (k % 10), -9, 9);
    const kk = 1 + Math.floor(r() * xs.length);
    const i = xs.length - kk;
    assert.equal(answer("removeKthNodeFromEnd", xs.join(", "), String(kk)), `Removing ${L([xs[i]]).slice(1, -1)} leaves ${L(xs.filter((_, j) => j !== i))}`);
  }
});

test("sum of linked lists", () => {
  assert.equal(answer("sumOfLinkedLists", "7, 4, 9, 2", "8, 6, 5"), "2947 + 568 = 3515, so the sum is the list [5, 1, 5, 3]");
  assert.equal(answer("sumOfLinkedLists", "9, 9", "1"), "99 + 1 = 100, so the sum is the list [0, 0, 1]");
  assert.equal(answer("sumOfLinkedLists", "0", "0"), "0 + 0 = 0, so the sum is the list [0]");
  assert.throws(() => answer("sumOfLinkedLists", "12", "1"), /at most 9/);
  assert.throws(() => answer("sumOfLinkedLists", "-1", "1"), /too small/);
  assert.throws(() => answer("sumOfLinkedLists", "1, 0", "1"), /can't be 0/);
  const r = rng(15);
  for (let k = 0; k < 150; k++) {
    const [a, b] = [randInts(r, 1 + (k % 8), 0, 9), randInts(r, 1 + ((k * 3) % 8), 0, 9)];
    for (const d of [a, b]) if (d.length > 1 && d[d.length - 1] === 0) d[d.length - 1] = 1;
    const num = (d: number[]) => Number([...d].reverse().join(""));
    const z = num(a) + num(b);
    const digits = [...String(z)].reverse().map(Number);
    assert.equal(answer("sumOfLinkedLists", a.join(", "), b.join(", ")), `${num(a)} + ${num(b)} = ${z}, so the sum is the list ${L(digits)}`);
  }
});

test("merging linked lists", () => {
  assert.equal(answer("mergingLinkedLists", "6, 1, 8", "4", "5, 2, 7"), "The lists first meet at 5; from there both read [5, 2, 7].");
  assert.equal(answer("mergingLinkedLists", "1, 2", "3", ""), w.lists.mergingLinkedLists.none);
  assert.equal(answer("mergingLinkedLists", "", "3", "4, 5"), "The lists first meet at 4; from there both read [4, 5].");
  assert.equal(answer("mergingLinkedLists", "", "", "4"), "The lists first meet at 4; from there both read [4].");
  assert.throws(() => answer("mergingLinkedLists", "", "1", ""), /Write something/);
  const r = rng(16);
  for (let k = 0; k < 150; k++) {
    // Values repeat across the lists on purpose: the answer is a node, not a value.
    const [a, b, s] = [randInts(r, k % 5, 1, 3), randInts(r, (k >> 1) % 5, 1, 3), randInts(r, (k >> 2) % 4, 1, 3)];
    if (!a.length && !s.length) continue;
    if (!b.length && !s.length) continue;
    const want = s.length ? `The lists first meet at ${s[0]}; from there both read ${L(s)}.` : w.lists.mergingLinkedLists.none;
    assert.equal(answer("mergingLinkedLists", a.join(", "), b.join(", "), s.join(", ")), want, `${a} / ${b} / ${s}`);
  }
});

test("find loop", () => {
  assert.equal(answer("findLoop", "5, 3, 8, 1, 6, 2, 9", "2"), "The loop begins at 8, at position 2.");
  assert.equal(answer("findLoop", "4", "0"), "The loop begins at 4, at position 0.");
  assert.equal(answer("findLoop", "4, 4, 4", "2"), "The loop begins at 4, at position 2.");
  assert.throws(() => answer("findLoop", "1, 2", "2"), /from 0 to 1/);
  const r = rng(17);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 12), 0, 3);
    const p = Math.floor(r() * xs.length);
    assert.equal(answer("findLoop", xs.join(", "), String(p)), `The loop begins at ${xs[p]}, at position ${p}.`);
  }
});

test("reverse linked list", () => {
  assert.equal(answer("reverseLinkedList", "3, 7, 1, 9, 4"), "Reversed: [4, 9, 1, 7, 3]");
  assert.equal(answer("reverseLinkedList", "-2"), "Reversed: [−2]");
  assert.throws(() => answer("reverseLinkedList", "1, x"), /isn't a whole number/);
  assert.throws(() => answer("reverseLinkedList", "1, 1000"), /at most 999/);
  const r = rng(18);
  for (let k = 0; k < 100; k++) {
    const xs = randInts(r, 1 + (k % 12), -20, 20);
    assert.equal(answer("reverseLinkedList", xs.join(", ")), `Reversed: ${L([...xs].reverse())}`);
  }
});

test("merge linked lists", () => {
  assert.equal(answer("mergeLinkedLists", "2, 6, 7, 11", "1, 3, 6, 9"), "Merged: [1, 2, 3, 6, 6, 7, 9, 11]");
  assert.equal(answer("mergeLinkedLists", "1, 2", "3, 4"), "Merged: [1, 2, 3, 4]");
  assert.equal(answer("mergeLinkedLists", "5", "1, 2, 3"), "Merged: [1, 2, 3, 5]");
  assert.throws(() => answer("mergeLinkedLists", "2, 1", "3"), /sorted/);
  const r = rng(19);
  for (let k = 0; k < 150; k++) {
    const a = sortNum(randInts(r, 1 + (k % 7), -6, 6));
    const b = sortNum(randInts(r, 1 + ((k * 5) % 7), -6, 6));
    assert.equal(answer("mergeLinkedLists", a.join(", "), b.join(", ")), `Merged: ${L(sortNum([...a, ...b]))}`);
  }
});

test("shift linked list", () => {
  assert.equal(answer("shiftLinkedList", "4, 1, 7, 3, 8, 5", "8"), "Shifted: [8, 5, 4, 1, 7, 3]");
  assert.equal(answer("shiftLinkedList", "1, 2, 3", "-1"), "Shifted: [2, 3, 1]");
  assert.equal(answer("shiftLinkedList", "1, 2, 3", "3"), "Shifted: [1, 2, 3]");
  assert.equal(answer("shiftLinkedList", "1, 2, 3", "0"), "Shifted: [1, 2, 3]");
  assert.throws(() => answer("shiftLinkedList", "1, 2", "100"), /from −99 to 99/);
  const r = rng(20);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 12), 0, 9);
    const s = Math.floor(r() * 61) - 30;
    // Shift one place at a time.
    const out = [...xs];
    for (let j = 0; j < Math.abs(s); j++) if (s > 0) out.unshift(out.pop()!);
    else out.push(out.shift()!);
    assert.equal(answer("shiftLinkedList", xs.join(", "), String(s)), `Shifted: ${L(out)}`, `${xs} by ${s}`);
  }
});

test("LRU cache", () => {
  assert.equal(
    answer("lruCache", "3", "put a 1, put b 2, put c 3, get a, put d 4, get b, put c 5, recent, get c, get d"),
    "The answers: 1, none, c, 5, 4; the cache holds [d, c, a], most recent first.",
  );
  assert.equal(answer("lruCache", "1", "put x 1, put y 2"), "The cache holds [y], most recent first.");
  assert.equal(answer("lruCache", "2", "recent, get a"), "The answers: none, none; the cache holds [], most recent first.");
  assert.throws(() => answer("lruCache", "0", "put a 1"), /from 1 to 6/);
  assert.throws(() => answer("lruCache", "2", "put a"), /doesn't fit/);
  assert.throws(() => answer("lruCache", "2", "fetch a"), /doesn't fit/);
  // Random operations against a Map, whose keys keep the order they were (re)inserted in: least recent first.
  const r = rng(21);
  for (let k = 0; k < 150; k++) {
    const cap = 1 + (k % 4);
    const m = new Map<string, number>();
    const ops: string[] = [];
    const got: string[] = [];
    for (let j = 0; j < 1 + (k % 12); j++) {
      const key = "abcde"[Math.floor(r() * 5)];
      const kind = r();
      if (kind < 0.5) {
        const v = Math.floor(r() * 20);
        ops.push(`put ${key} ${v}`);
        m.delete(key);
        if (m.size === cap) m.delete(m.keys().next().value!);
        m.set(key, v);
      } else if (kind < 0.85) {
        ops.push(`get ${key}`);
        if (m.has(key)) {
          const v = m.get(key)!;
          got.push(String(v));
          m.delete(key);
          m.set(key, v);
        } else got.push("none");
      } else {
        ops.push("recent");
        got.push(m.size ? [...m.keys()][m.size - 1] : "none");
      }
    }
    const keys = `[${[...m.keys()].reverse().join(", ")}]`;
    const want = got.length ? `The answers: ${got.join(", ")}; the cache holds ${keys}, most recent first.` : `The cache holds ${keys}, most recent first.`;
    assert.equal(answer("lruCache", String(cap), ops.join(", ")), want, ops.join(", "));
  }
});

test("rearrange linked list", () => {
  assert.equal(answer("rearrangeLinkedList", "6, 2, 9, 4, 1, 4, 7, 3", "4"), "Rearranged around 4: [2, 1, 3, 4, 4, 6, 9, 7]");
  assert.equal(answer("rearrangeLinkedList", "5, 6", "1"), "Rearranged around 1: [5, 6]");
  assert.equal(answer("rearrangeLinkedList", "3, -1, 3", "3"), "Rearranged around 3: [−1, 3, 3]");
  const r = rng(22);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 12), -5, 5);
    const p = Math.floor(r() * 11) - 5;
    const want = [...xs.filter((x) => x < p), ...xs.filter((x) => x === p), ...xs.filter((x) => x > p)];
    assert.equal(answer("rearrangeLinkedList", xs.join(", "), String(p)), `Rearranged around ${L([p]).slice(1, -1)}: ${L(want)}`);
  }
});

test("linked list palindrome", () => {
  const p = w.lists.linkedListPalindrome;
  assert.equal(answer("linkedListPalindrome", "2, 5, 8, 9, 8, 5, 2"), p.yes);
  assert.equal(answer("linkedListPalindrome", "1, 2, 2, 1"), p.yes);
  assert.equal(answer("linkedListPalindrome", "7"), p.yes);
  assert.equal(answer("linkedListPalindrome", "1, 2, 3, 1"), "No: 2 and 3 are in mirror places but differ.");
  const r = rng(23);
  for (let k = 0; k < 200; k++) {
    let xs = randInts(r, 1 + (k % 12), 0, 2);
    if (k % 2) xs = [...xs.slice(0, Math.ceil(xs.length / 2)), ...xs.slice(0, Math.floor(xs.length / 2)).reverse()];
    const yes = xs.join() === [...xs].reverse().join();
    assert.equal(answer("linkedListPalindrome", xs.join(", ")) === p.yes, yes, `${xs}`);
  }
});

test("zip linked list", () => {
  assert.equal(answer("zipLinkedList", "1, 2, 3, 4, 5, 6, 7"), "Zipped: [1, 7, 2, 6, 3, 5, 4]");
  assert.equal(answer("zipLinkedList", "1, 2, 3, 4"), "Zipped: [1, 4, 2, 3]");
  assert.equal(answer("zipLinkedList", "1, 2"), "Zipped: [1, 2]");
  assert.equal(answer("zipLinkedList", "9"), "Zipped: [9]");
  const r = rng(24);
  for (let k = 0; k < 100; k++) {
    const xs = randInts(r, 1 + (k % 12), -9, 9);
    const want: number[] = [];
    for (let [i, j] = [0, xs.length - 1]; i <= j; i++, j--) want.push(...(i === j ? [xs[i]] : [xs[i], xs[j]]));
    assert.equal(answer("zipLinkedList", xs.join(", ")), `Zipped: ${L(want)}`);
  }
});

test("node swap", () => {
  assert.equal(answer("nodeSwap", "5, 1, 8, 3, 6, 2, 4"), "Swapped in pairs: [1, 5, 3, 8, 2, 6, 4]");
  assert.equal(answer("nodeSwap", "1, 2"), "Swapped in pairs: [2, 1]");
  assert.equal(answer("nodeSwap", "1"), "Swapped in pairs: [1]");
  const r = rng(25);
  for (let k = 0; k < 100; k++) {
    const xs = randInts(r, 1 + (k % 12), -9, 9);
    const want = [...xs];
    for (let i = 0; i + 1 < want.length; i += 2) [want[i], want[i + 1]] = [want[i + 1], want[i]];
    assert.equal(answer("nodeSwap", xs.join(", ")), `Swapped in pairs: ${L(want)}`);
  }
});

test("the list problems check their sizes", () => {
  assert.throws(() => answer("reverseLinkedList", Array(13).fill(1).join(", ")), /At most 12/);
  assert.throws(() => answer("mergingLinkedLists", "1, 2, 3, 4, 5", "6, 7, 8, 9", "1, 2, 3, 4"), /At most 12/);
  assert.throws(() => answer("linkedListConstruction", "1, 2, 3, 4, 5, 6, 7, 8", "setHead 1, setHead 1, setHead 1, setHead 1, setHead 1"), /At most 12 nodes/);
});
