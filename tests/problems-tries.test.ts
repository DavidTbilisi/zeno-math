// The trie problems give the right answers: on their examples, on cases picked to catch a slip (a word that is only
// part of the string, one string, a tie), and on random strings checked against working it out the slow way (endsWith,
// includes, counting every prefix); bad inputs say why, and every trie drawn is a tree in layers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemInfo, problemsIn, problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const randStr = (r: () => number, n: number, abc: string) => Array.from({ length: n }, () => abc[Math.floor(r() * abc.length)]).join("");
const yesNo = (qs: string[], f: (q: string) => boolean) => qs.map((q) => `“${q}” ${f(q) ? "yes" : "no"}`).join(", ");

test("suffix trie construction", () => {
  assert.equal(answer("suffixTrieConstruction", "abcab", "ab, bca, cab, abd"), "Is it a suffix? “ab” yes, “bca” no, “cab” yes, “abd” no");
  assert.equal(answer("suffixTrieConstruction", "aaa", "a, aa, aaa, aaaa"), "Is it a suffix? “a” yes, “aa” yes, “aaa” yes, “aaaa” no");
  assert.throws(() => answer("suffixTrieConstruction", "abcdefg", "a"), /At most 20 nodes/);
  const r = rng(31);
  for (let k = 0; k < 150; k++) {
    const x = randStr(r, 1 + (k % 5), "ab");
    const qs = Array.from({ length: 1 + (k % 5) }, () => randStr(r, 1 + Math.floor(r() * 4), "ab"));
    assert.equal(answer("suffixTrieConstruction", x, qs.join(", ")), `Is it a suffix? ${yesNo(qs, (q) => x.endsWith(q))}`, `${x} / ${qs}`);
  }
});

test("multi string search", () => {
  assert.equal(answer("multiStringSearch", "she sells shells", "he, shell, sea, ells, hes"), "In the big string? “he” yes, “shell” yes, “sea” no, “ells” yes, “hes” no");
  assert.equal(answer("multiStringSearch", "abc", "abcd, c"), "In the big string? “abcd” no, “c” yes");
  const r = rng(32);
  for (let k = 0; k < 150; k++) {
    const big = randStr(r, 1 + (k % 16), "abc");
    const smalls = Array.from({ length: 1 + (k % 4) }, () => randStr(r, 1 + Math.floor(r() * 3), "abc"));
    assert.equal(answer("multiStringSearch", big, smalls.join(", ")), `In the big string? ${yesNo(smalls, (q) => big.includes(q))}`, `${big} / ${smalls}`);
  }
});

test("longest most frequent prefix", () => {
  assert.equal(answer("longestMostFrequentPrefix", "trie, tribe, trip, tree, trick"), "The longest most frequent prefix is “tr”: 5 of the strings start with it.");
  assert.equal(answer("longestMostFrequentPrefix", "abc"), "The longest most frequent prefix is “abc”: 1 of the strings start with it.");
  assert.equal(answer("longestMostFrequentPrefix", "ab, cd"), "The longest most frequent prefix is “ab”: 1 of the strings start with it.");
  const r = rng(33);
  for (let k = 0; k < 150; k++) {
    const strs = Array.from({ length: 1 + (k % 6) }, () => randStr(r, 1 + Math.floor(r() * 3), "ab"));
    // The slow way: how many strings start with each prefix; the most, then the longest of those.
    const pre = new Map<string, number>();
    for (const x of strs) for (let i = 1; i <= x.length; i++) pre.set(x.slice(0, i), (pre.get(x.slice(0, i)) ?? 0) + 1);
    const most = Math.max(...pre.values());
    const longest = Math.max(...[...pre].filter(([, n]) => n === most).map(([p]) => p.length));
    const [, p, n] = answer("longestMostFrequentPrefix", strs.join(", ")).match(/“(\w+)”: (\d+) of the strings/)!;
    assert.equal(Number(n), most, `${strs}`);
    assert.equal(pre.get(p), most, `${strs}`);
    assert.equal(p.length, longest, `${strs}`);
  }
});

test("shortest unique prefixes", () => {
  assert.equal(answer("shortestUniquePrefixes", "zebra, dog, duck, dove"), "The shortest unique prefixes: [z, dog, du, dov]");
  assert.equal(answer("shortestUniquePrefixes", "solo"), "The shortest unique prefixes: [s]");
  assert.throws(() => answer("shortestUniquePrefixes", "car, cart"), /“car” is the start of “cart”/);
  assert.throws(() => answer("shortestUniquePrefixes", "ab, ab"), /start of/);
  const r = rng(34);
  for (let k = 0; k < 150; k++) {
    const strs = Array.from({ length: 1 + (k % 5) }, () => randStr(r, 1 + (k % 3), "abc") + "d");
    if (new Set(strs).size < strs.length) continue;
    const want = strs.map((x) => {
      let n = 1;
      while (strs.some((y) => y !== x && y.startsWith(x.slice(0, n)))) n++;
      return x.slice(0, n);
    });
    assert.equal(answer("shortestUniquePrefixes", strs.join(", ")), `The shortest unique prefixes: [${want.join(", ")}]`, `${strs}`);
  }
});

test("every trie is drawn as a tree in layers: one edge into each node but the root, from the row above", () => {
  for (const id of [...problemsIn("tries"), "stringsMadeUpOfStrings" as const]) {
    for (const f of problemTrace(id, problemInfo(id).example, w).frames) {
      const g = f.graph;
      if (!g) continue;
      assert.equal(g.edges.length, g.nodes.length - 1, id);
      assert.deepEqual(g.edges.map((e) => e.b).sort((a, b) => a - b), g.nodes.slice(1).map((_, i) => i + 1), id);
      for (const e of g.edges) assert.equal(g.layer![e.b], g.layer![e.a] + 1, id);
      assert.ok(g.nodes.length <= 20, id);
    }
  }
});
