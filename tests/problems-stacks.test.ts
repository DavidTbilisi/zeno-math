// The stack problems give the right answers: on their examples, on cases picked to catch a slip (an empty stack, a
// bracket closing nothing, equal asteroids, ".." at the root), and on random inputs checked against working it out the
// slow way; bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { posix } from "node:path";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const show = (v: number) => (v < 0 ? `−${-v}` : String(v));
const L = (a: readonly number[]) => `[${a.map(show).join(", ")}]`;

test("min max stack construction", () => {
  assert.equal(answer("minMaxStackConstruction", "push 5, push 7, push 2, getMin, getMax, pop, getMin, push 9, peek, getMax"), "The answers: 2, 7, 2, 5, 9, 9.");
  assert.equal(answer("minMaxStackConstruction", "pop, push 1, push 3"), "The answers: none.");
  assert.equal(answer("minMaxStackConstruction", "push -1, push 4"), "Nothing was asked; the stack ends as [−1, 4].");
  assert.throws(() => answer("minMaxStackConstruction", "push"), /doesn't fit/);
  assert.throws(() => answer("minMaxStackConstruction", "shove 3"), /doesn't fit/);
  const r = rng(31);
  for (let k = 0; k < 150; k++) {
    const stack: number[] = [];
    const ops: string[] = [];
    const got: string[] = [];
    for (let j = 0; j < 1 + (k % 14); j++) {
      const kind = r();
      if (kind < 0.45 && stack.length < 10) {
        const x = Math.floor(r() * 21) - 10;
        ops.push(`push ${x}`);
        stack.push(x);
        continue;
      }
      const name = ["pop", "peek", "getMin", "getMax"][Math.floor(r() * 4)];
      ops.push(name);
      if (!stack.length) got.push("none");
      else if (name === "getMin") got.push(show(Math.min(...stack)));
      else if (name === "getMax") got.push(show(Math.max(...stack)));
      else got.push(show(name === "pop" ? stack.pop()! : stack[stack.length - 1]));
    }
    const want = got.length ? `The answers: ${got.join(", ")}.` : `Nothing was asked; the stack ends as ${L(stack)}.`;
    assert.equal(answer("minMaxStackConstruction", ops.join(", ")), want, ops.join(", "));
  }
});

test("balanced brackets", () => {
  const b = w.stacks.balancedBrackets;
  assert.equal(answer("balancedBrackets", "{a[(b)c]}(d]"), "No: ] at place 11 meets (, which it can't close.");
  assert.equal(answer("balancedBrackets", "([]{x})"), b.yes);
  assert.equal(answer("balancedBrackets", "abc"), b.yes);
  assert.equal(answer("balancedBrackets", "a)"), "No: ) at place 1 has nothing to close.");
  assert.equal(answer("balancedBrackets", "(["), "No: ( [ never close.");
  assert.throws(() => answer("balancedBrackets", "  "), /Write something/);
  const r = rng(32);
  for (let k = 0; k < 200; k++) {
    const s = Array.from({ length: 1 + (k % 14) }, () => "()[]{}x"[Math.floor(r() * 7)]).join("");
    // The slow way: drop everything else, then take out matched pairs until none are left.
    let t = s.replace(/x/g, "");
    for (let prev = ""; prev !== t; ) [prev, t] = [t, t.replace(/\(\)|\[\]|\{\}/g, "")];
    assert.equal(answer("balancedBrackets", s) === b.yes, t === "", s);
  }
});

test("sunset views", () => {
  assert.equal(answer("sunsetViews", "3, 5, 4, 4, 3, 1, 3, 2", "EAST"), "The buildings that see the sunset: [1, 3, 6, 7]");
  assert.equal(answer("sunsetViews", "3, 5, 4, 4, 3, 1, 3, 2", "west"), "The buildings that see the sunset: [0, 1]");
  assert.equal(answer("sunsetViews", "2, 2, 2", "E"), "The buildings that see the sunset: [2]");
  assert.throws(() => answer("sunsetViews", "1, 2", "north"), /EAST or WEST/);
  assert.throws(() => answer("sunsetViews", "1, 0", "east"), /too small/);
  const r = rng(33);
  for (let k = 0; k < 150; k++) {
    const hs = randInts(r, 1 + (k % 12), 1, 6);
    const east = k % 2 === 0;
    const sees = hs.map((_, i) => i).filter((i) => (east ? hs.slice(i + 1) : hs.slice(0, i)).every((h) => h < hs[i]));
    assert.equal(answer("sunsetViews", hs.join(", "), east ? "EAST" : "WEST"), `The buildings that see the sunset: ${L(sees)}`, `${hs}`);
  }
});

test("best digits", () => {
  assert.equal(answer("bestDigits", "4629371", "3"), "Removing 3 digit(s) leaves the largest number 9371.");
  assert.equal(answer("bestDigits", "54321", "2"), "Removing 2 digit(s) leaves the largest number 543.");
  assert.equal(answer("bestDigits", "19", "0"), "Removing 0 digit(s) leaves the largest number 19.");
  assert.throws(() => answer("bestDigits", "12a", "1"), /digits only/);
  assert.throws(() => answer("bestDigits", "123", "3"), /from 0 to 2/);
  const r = rng(34);
  for (let k = 0; k < 150; k++) {
    const ds = randInts(r, 1 + (k % 9), 0, 9).join("");
    const kk = Math.floor(r() * ds.length);
    // The slow way: every way of keeping n − k digits, the biggest as text (all the same length).
    let best = "";
    const keep = ds.length - kk;
    for (let mask = 0; mask < 1 << ds.length; mask++) {
      if (mask.toString(2).split("1").length - 1 !== keep) continue;
      const t = [...ds].filter((_, i) => mask & (1 << i)).join("");
      if (t > best) best = t;
    }
    assert.equal(answer("bestDigits", ds, String(kk)), `Removing ${kk} digit(s) leaves the largest number ${best}.`, `${ds} − ${kk}`);
  }
});

test("sort stack", () => {
  assert.equal(answer("sortStack", "4, -2, 7, 1, 3"), "Sorted, from bottom to top: [−2, 1, 3, 4, 7]");
  assert.equal(answer("sortStack", "5"), "Sorted, from bottom to top: [5]");
  assert.equal(answer("sortStack", "2, 2, 1"), "Sorted, from bottom to top: [1, 2, 2]");
  const r = rng(35);
  for (let k = 0; k < 100; k++) {
    const xs = randInts(r, 1 + (k % 8), -9, 9);
    assert.equal(answer("sortStack", xs.join(", ")), `Sorted, from bottom to top: ${L([...xs].sort((a, b) => a - b))}`);
  }
});

test("next greater element", () => {
  assert.equal(answer("nextGreaterElement", "4, 2, 6, 1, 5, 3"), "Next greater: [6, 6, −1, 5, 6, 4]");
  assert.equal(answer("nextGreaterElement", "3, 3"), "Next greater: [−1, −1]");
  assert.equal(answer("nextGreaterElement", "-1"), "Next greater: [−1]");
  const r = rng(36);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 12), -5, 5);
    const n = xs.length;
    const want = xs.map((x, i) => {
      for (let d = 1; d < n; d++) if (xs[(i + d) % n] > x) return xs[(i + d) % n];
      return -1;
    });
    assert.equal(answer("nextGreaterElement", xs.join(", ")), `Next greater: ${L(want)}`, `${xs}`);
  }
});

test("reverse polish notation", () => {
  assert.equal(answer("reversePolishNotation", "6, 2, 3, +, -, 7, *, 4, /"), "The value is 1.");
  assert.equal(answer("reversePolishNotation", "-7 2 /"), "The value is −3.");
  assert.equal(answer("reversePolishNotation", "42"), "The value is 42.");
  assert.throws(() => answer("reversePolishNotation", "1, +"), /needs two numbers/);
  assert.throws(() => answer("reversePolishNotation", "1, 0, /"), /divides by zero/);
  assert.throws(() => answer("reversePolishNotation", "1, 2"), /isn't finished/);
  assert.throws(() => answer("reversePolishNotation", "1, 2, ^"), /doesn't fit/);
  // Random expression trees, written out in reverse Polish and worked out straight from the tree.
  const r = rng(37);
  type Node = number | [string, Node, Node];
  const grow = (d: number): Node => (d === 0 || r() < 0.3 ? Math.floor(r() * 19) - 9 : ["+-*/"[Math.floor(r() * 4)], grow(d - 1), grow(d - 1)]);
  const rpn = (t: Node): string[] => (typeof t === "number" ? [String(t)] : [...rpn(t[1]), ...rpn(t[2]), t[0]]);
  const value = (t: Node): number | null => {
    if (typeof t === "number") return t;
    const [a, b] = [value(t[1]), value(t[2])];
    if (a === null || b === null || (t[0] === "/" && b === 0)) return null;
    return t[0] === "+" ? a + b : t[0] === "-" ? a - b : t[0] === "*" ? a * b : Math.trunc(a / b) + 0;
  };
  let checked = 0;
  for (let k = 0; k < 300 && checked < 150; k++) {
    const t = grow(3);
    const tokens = rpn(t);
    const v = value(t);
    if (v === null || tokens.length > 15) continue;
    checked++;
    assert.equal(answer("reversePolishNotation", tokens.join(" ")), `The value is ${show(v)}.`, tokens.join(" "));
  }
  assert.ok(checked > 100);
});

test("colliding asteroids", () => {
  assert.equal(answer("collidingAsteroids", "3, 6, -4, 2, -2, -8, 5"), "Left after the collisions: [−8, 5]");
  assert.equal(answer("collidingAsteroids", "4, -4"), "Left after the collisions: []");
  assert.equal(answer("collidingAsteroids", "-3, 5"), "Left after the collisions: [−3, 5]");
  assert.throws(() => answer("collidingAsteroids", "3, 0"), /size from 1 to 99/);
  const r = rng(38);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 12), 1, 5).map((x) => (r() < 0.5 ? -x : x));
    // The slow way: resolve any right-then-left neighbours until there are none.
    const a = [...xs];
    for (let i = 0; i + 1 < a.length; ) {
      if (a[i] > 0 && a[i + 1] < 0) {
        const [p, q] = [a[i], -a[i + 1]];
        a.splice(i, 2, ...(p > q ? [a[i]] : p < q ? [a[i + 1]] : []));
        i = 0;
      } else i++;
    }
    assert.equal(answer("collidingAsteroids", xs.join(", ")), `Left after the collisions: ${L(a)}`, `${xs}`);
  }
});

test("shorten path", () => {
  const p = w.stacks.shortenPath;
  assert.equal(answer("shortenPath", "/usr/./lib//../bin/../../etc/x/.."), "The shortest path: /etc");
  assert.equal(answer("shortenPath", "/../.."), "The shortest path: /");
  assert.equal(answer("shortenPath", "../a/../../b/./c/"), "The shortest path: ../../b/c");
  assert.equal(answer("shortenPath", "a/.."), p.emptyPath);
  assert.throws(() => answer("shortenPath", "a b"), /doesn't fit/);
  const r = rng(39);
  for (let k = 0; k < 200; k++) {
    const parts = Array.from({ length: 1 + (k % 8) }, () => ["a", "b", "..", ".", ""][Math.floor(r() * 5)]);
    const path = (k % 2 ? "/" : "") + parts.join("/");
    if (!path.trim()) continue;
    // Node's own path handling: resolve from the root for an absolute path, normalise a relative one.
    const want = path.startsWith("/") ? posix.resolve("/", path) : posix.normalize(path).replace(/\/$/, "").replace(/^\.$/, "");
    assert.equal(answer("shortenPath", path), want ? `The shortest path: ${want}` : p.emptyPath, path);
  }
});

test("largest rectangle under skyline", () => {
  assert.equal(answer("largestRectangleUnderSkyline", "2, 4, 5, 1, 3, 3, 2"), "The largest rectangle has area 8: height 4 over buildings 1 to 2.");
  assert.equal(answer("largestRectangleUnderSkyline", "3, 3, 3"), "The largest rectangle has area 9: height 3 over buildings 0 to 2.");
  assert.equal(answer("largestRectangleUnderSkyline", "0, 0"), w.stacks.largestRectangleUnderSkyline.answerZero);
  assert.throws(() => answer("largestRectangleUnderSkyline", "1, -1"), /too small/);
  const r = rng(40);
  for (let k = 0; k < 150; k++) {
    const hs = randInts(r, 1 + (k % 12), 0, 6);
    let best = 0;
    for (let i = 0; i < hs.length; i++) for (let j = i; j < hs.length; j++) best = Math.max(best, Math.min(...hs.slice(i, j + 1)) * (j - i + 1));
    const got = answer("largestRectangleUnderSkyline", hs.join(", "));
    assert.match(got, best ? new RegExp(`^The largest rectangle has area ${best}:`) : /area 0/, `${hs}`);
  }
});
