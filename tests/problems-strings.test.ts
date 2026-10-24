// The string problems give the right answers: on their examples, on cases picked to catch a slip (one character,
// nothing found, ties, spaces), and on random strings checked against working it out the slow way (every substring,
// every split, every pair); bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const s = w.strings;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const randStr = (r: () => number, n: number, abc: string) => Array.from({ length: n }, () => abc[Math.floor(r() * abc.length)]).join("");
const rev = (x: string) => [...x].reverse().join("");
const subs = (x: string) => {
  const out: [number, number][] = [];
  for (let a = 0; a < x.length; a++) for (let b = a + 1; b <= x.length; b++) out.push([a, b]);
  return out;
};

test("palindrome check", () => {
  assert.equal(answer("palindromeCheck", "step on no pets"), "Yes: “step on no pets” is a palindrome.");
  assert.equal(answer("palindromeCheck", "a"), "Yes: “a” is a palindrome.");
  assert.equal(answer("palindromeCheck", "abca"), "No: “abca” isn't a palindrome.");
  assert.equal(answer("palindromeCheck", "Aa"), "No: “Aa” isn't a palindrome.");
  const r = rng(11);
  for (let k = 0; k < 150; k++) {
    const x = k % 2 ? randStr(r, 1 + (k % 9), "ab") : ((h) => h + rev(h).slice(k % 4 ? 0 : 1))(randStr(r, 1 + (k % 6), "abc"));
    assert.equal(answer("palindromeCheck", x).startsWith("Yes"), x === rev(x), x);
  }
  assert.throws(() => answer("palindromeCheck", "  "), /Write something/);
});

test("caesar cipher encryptor", () => {
  assert.equal(answer("caesarCipherEncryptor", "zebra", "28"), "Encrypted: “bgdtc”");
  assert.equal(answer("caesarCipherEncryptor", "xyz", "0"), "Encrypted: “xyz”");
  assert.equal(answer("caesarCipherEncryptor", "abc", "52"), "Encrypted: “abc”");
  const r = rng(12);
  for (let k = 0; k < 100; k++) {
    const x = randStr(r, 1 + (k % 14), "abcdefghijklmnopqrstuvwxyz");
    const key = Math.floor(r() * 999);
    const want = [...x].map((c) => String.fromCharCode(97 + ((c.charCodeAt(0) - 97 + key) % 26))).join("");
    assert.equal(answer("caesarCipherEncryptor", x, String(key)), `Encrypted: “${want}”`);
  }
  assert.throws(() => answer("caesarCipherEncryptor", "Abc", "2"), /lowercase/);
  assert.throws(() => answer("caesarCipherEncryptor", "abc", "-1"), /whole number/);
});

test("run-length encoding", () => {
  assert.equal(answer("runLengthEncoding", "AAAAAAAAAAAABBCD"), "Encoded: 9A3A2B1C1D");
  assert.equal(answer("runLengthEncoding", "x"), "Encoded: 1x");
  assert.equal(answer("runLengthEncoding", "aaaaaaaaab"), "Encoded: 9a1b");
  assert.equal(answer("runLengthEncoding", "a  b"), "Encoded: 1a2 1b");
  const r = rng(13);
  for (let k = 0; k < 150; k++) {
    const x = randStr(r, 1 + (k % 16), k % 3 ? "ab" : "a");
    // The slow way: the runs by a regular expression, each cut into nines.
    const want = (x.match(/(.)\1*/g) ?? []).map((run) => {
      let out = "";
      for (let n = run.length; n > 0; n -= 9) out += `${Math.min(9, n)}${run[0]}`;
      return out;
    }).join("");
    assert.equal(answer("runLengthEncoding", x), `Encoded: ${want}`, x);
  }
});

test("common characters", () => {
  assert.equal(answer("commonCharacters", "pencil, spine, tiles"), "The common characters: e, i");
  assert.equal(answer("commonCharacters", "abc, def"), s.commonCharacters.none);
  assert.equal(answer("commonCharacters", "aab"), "The common characters: a, b");
  const r = rng(14);
  for (let k = 0; k < 150; k++) {
    const ws = Array.from({ length: 1 + (k % 5) }, () => randStr(r, 1 + Math.floor(r() * 6), "abcdef"));
    const want = [...new Set(ws.join(""))].filter((c) => ws.every((x) => x.includes(c))).sort();
    const got = answer("commonCharacters", ws.join(", "));
    const list = got === s.commonCharacters.none ? [] : got.replace("The common characters: ", "").split(", ").sort();
    assert.deepEqual(list, want, `${ws}`);
  }
});

test("generate document", () => {
  assert.equal(answer("generateDocument", "a stop pot", "pots top"), s.generateDocument.yes);
  assert.equal(answer("generateDocument", "abc", ""), s.generateDocument.yes);
  assert.equal(answer("generateDocument", "a b", "a  b"), "No: there aren't enough “␣” for the document.");
  assert.equal(answer("generateDocument", "abc", "abcd"), "No: there aren't enough “d” for the document.");
  const r = rng(15);
  for (let k = 0; k < 150; k++) {
    const a = randStr(r, 1 + (k % 12), "ab c");
    const d = randStr(r, k % 8, "abc ").trim();
    const count = (x: string, c: string) => [...x].filter((y) => y === c).length;
    const want = [...d].every((c) => count(d, c) <= count(a.trim(), c));
    if (!a.trim()) continue;
    assert.equal(answer("generateDocument", a, d) === s.generateDocument.yes, want, `${a} / ${d}`);
  }
});

test("first non-repeating character", () => {
  assert.equal(answer("firstNonRepeatingCharacter", "abracadabra"), "The first non-repeating character is “c”, at index 4.");
  assert.equal(answer("firstNonRepeatingCharacter", "aabb"), s.firstNonRepeatingCharacter.none);
  assert.equal(answer("firstNonRepeatingCharacter", "z"), "The first non-repeating character is “z”, at index 0.");
  const r = rng(16);
  for (let k = 0; k < 150; k++) {
    const x = randStr(r, 1 + (k % 14), "abcd");
    const i = [...x].findIndex((c) => x.indexOf(c) === x.lastIndexOf(c));
    const want = i < 0 ? s.firstNonRepeatingCharacter.none : `The first non-repeating character is “${x[i]}”, at index ${i}.`;
    assert.equal(answer("firstNonRepeatingCharacter", x), want, x);
  }
});

test("semordnilap", () => {
  assert.equal(answer("semordnilap", "stressed, live, desserts, gulp, evil, level, plug"), "The pairs: [stressed, desserts], [live, evil], [gulp, plug]");
  assert.equal(answer("semordnilap", "abc, aba, xy"), s.semordnilap.none);
  assert.throws(() => answer("semordnilap", "ab, ba, ab"), /doesn't fit/);
  const r = rng(17);
  for (let k = 0; k < 150; k++) {
    const ws = [...new Set(Array.from({ length: 2 + (k % 6) }, () => randStr(r, 1 + Math.floor(r() * 3), "ab")))];
    const want: string[] = [];
    for (const [i, a] of ws.entries()) for (const b of ws.slice(i + 1)) if (rev(a) === b) want.push([a, b].sort().join("/"));
    const got = answer("semordnilap", ws.join(", "));
    const pairs = got === s.semordnilap.none ? [] : [...got.matchAll(/\[(\w+), (\w+)\]/g)].map((m) => [m[1], m[2]].sort().join("/"));
    assert.deepEqual(pairs.sort(), want.sort(), `${ws}`);
  }
});

test("longest palindromic substring", () => {
  assert.equal(answer("longestPalindromicSubstring", "noonabcbax"), "The longest palindromic substring is “abcba”.");
  assert.equal(answer("longestPalindromicSubstring", "xabbay"), "The longest palindromic substring is “abba”.");
  assert.equal(answer("longestPalindromicSubstring", "q"), "The longest palindromic substring is “q”.");
  assert.equal(answer("longestPalindromicSubstring", "abcd"), "The longest palindromic substring is “a”.");
  const r = rng(18);
  for (let k = 0; k < 200; k++) {
    const x = randStr(r, 1 + (k % 16), k % 2 ? "ab" : "abc");
    // The slow way: every substring, the longest palindrome, leftmost of those.
    let best = x[0];
    for (const [a, b] of subs(x)) {
      const p = x.slice(a, b);
      if (p === rev(p) && p.length > best.length) best = p;
    }
    assert.equal(answer("longestPalindromicSubstring", x), `The longest palindromic substring is “${best}”.`, x);
  }
});

test("group anagrams", () => {
  assert.equal(answer("groupAnagrams", "listen, pots, silent, elbow, stop, tinsel, below, opts"), "The groups: [listen, silent, tinsel], [pots, stop, opts], [elbow, below]");
  assert.equal(answer("groupAnagrams", "one"), "The groups: [one]");
  const r = rng(19);
  for (let k = 0; k < 100; k++) {
    const ws = Array.from({ length: 1 + (k % 8) }, () => randStr(r, 1 + Math.floor(r() * 3), "abc"));
    const got = [...answer("groupAnagrams", ws.join(", ")).matchAll(/\[([^\]]*)\]/g)].map((m) => m[1].split(", "));
    assert.deepEqual(got.flat().sort(), [...ws].sort(), `${ws}`);
    for (const g of got) assert.ok(g.every((x) => [...x].sort().join("") === [...g[0]].sort().join("")), `${ws}`);
    assert.equal(new Set(got.map((g) => [...g[0]].sort().join(""))).size, got.length, `${ws}`);
  }
});

test("valid IP addresses", () => {
  assert.equal(answer("validIpAddresses", "2550010"), "Valid addresses: 25.50.0.10, 255.0.0.10");
  assert.equal(answer("validIpAddresses", "0000"), "Valid addresses: 0.0.0.0");
  assert.equal(answer("validIpAddresses", "123"), s.validIpAddresses.none);
  assert.equal(answer("validIpAddresses", "999999999999"), s.validIpAddresses.none);
  assert.throws(() => answer("validIpAddresses", "12a4"), /digits/);
  assert.throws(() => answer("validIpAddresses", "1234567890123"), /At most 12/);
  const r = rng(20);
  const part = /^(0|[1-9]\d{0,2})$/;
  for (let k = 0; k < 150; k++) {
    const x = randStr(r, 1 + (k % 12), k % 3 ? "0125" : "0123456789");
    const want: string[] = [];
    for (let i = 1; i < x.length; i++)
      for (let j = i + 1; j < x.length; j++)
        for (let m = j + 1; m < x.length; m++) {
          const ps = [x.slice(0, i), x.slice(i, j), x.slice(j, m), x.slice(m)];
          if (ps.every((p) => part.test(p) && Number(p) <= 255)) want.push(ps.join("."));
        }
    const got = answer("validIpAddresses", x);
    assert.deepEqual(got === s.validIpAddresses.none ? [] : got.replace("Valid addresses: ", "").split(", "), want, x);
  }
});

test("reverse words in string", () => {
  assert.equal(answer("reverseWordsInString", "dogs  chase cats"), "Reversed: “cats chase  dogs”");
  assert.equal(answer("reverseWordsInString", "word"), "Reversed: “word”");
  assert.equal(answer("reverseWordsInString", " a b  "), "Reversed: “  b a ”");
  const r = rng(21);
  for (let k = 0; k < 150; k++) {
    const x = randStr(r, 1 + (k % 16), "ab  ");
    if (!x.trim()) continue;
    assert.equal(answer("reverseWordsInString", x), `Reversed: “${(x.match(/ +|[^ ]+/g) ?? []).reverse().join("")}”`, JSON.stringify(x));
  }
});

test("minimum characters for words", () => {
  assert.equal(answer("minimumCharactersForWords", "noon, moon, onion, moose"), "The characters: [n, n, o, o, m, i, s, e]");
  assert.equal(answer("minimumCharactersForWords", "aaa"), "The characters: [a, a, a]");
  const r = rng(22);
  for (let k = 0; k < 150; k++) {
    const ws = Array.from({ length: 1 + (k % 6) }, () => randStr(r, 1 + Math.floor(r() * 6), "abcd"));
    const want = [..."abcd"].flatMap((c) => Array.from({ length: Math.max(...ws.map((x) => [...x].filter((y) => y === c).length)) }, () => c));
    const got = answer("minimumCharactersForWords", ws.join(", ")).match(/\[(.*)\]/)![1].split(", ").sort();
    assert.deepEqual(got, want, `${ws}`);
  }
});

test("one edit", () => {
  assert.equal(answer("oneEdit", "planet", "plant"), s.oneEdit.yes);
  assert.equal(answer("oneEdit", "abc", "abc"), s.oneEdit.yes);
  assert.equal(answer("oneEdit", "", "a"), s.oneEdit.yes);
  assert.equal(answer("oneEdit", "abc", "a"), s.oneEdit.no);
  assert.equal(answer("oneEdit", "abcd", "abdc"), s.oneEdit.no);
  assert.throws(() => answer("oneEdit", "", " "), /Write something/);
  const r = rng(23);
  const lev = (a: string, b: string) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i ? (j ? 0 : i) : j)));
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  for (let k = 0; k < 200; k++) {
    const a = randStr(r, 1 + (k % 7), "ab");
    const b = randStr(r, Math.max(0, a.length - 1 + Math.floor(r() * 3)), "ab");
    assert.equal(answer("oneEdit", a, b) === s.oneEdit.yes, lev(a, b) <= 1, `${a} / ${b}`);
  }
});

test("longest substring without duplication", () => {
  assert.equal(answer("longestSubstringWithoutDuplication", "missionaries"), "The longest substring without a repeated character is “onaries”.");
  assert.equal(answer("longestSubstringWithoutDuplication", "clementine"), "The longest substring without a repeated character is “menti”.");
  assert.equal(answer("longestSubstringWithoutDuplication", "aaaa"), "The longest substring without a repeated character is “a”.");
  assert.equal(answer("longestSubstringWithoutDuplication", "abba"), "The longest substring without a repeated character is “ab”.");
  const r = rng(24);
  for (let k = 0; k < 200; k++) {
    const x = randStr(r, 1 + (k % 16), "abcde");
    let best = x[0];
    for (const [a, b] of subs(x)) if (new Set(x.slice(a, b)).size === b - a && b - a > best.length) best = x.slice(a, b);
    assert.equal(answer("longestSubstringWithoutDuplication", x), `The longest substring without a repeated character is “${best}”.`, x);
  }
});

test("underscorify substring", () => {
  assert.equal(answer("underscorifySubstring", "banana bandana", "ana"), "The result: “b_anana_ band_ana_”");
  assert.equal(answer("underscorifySubstring", "testtest", "test"), "The result: “_testtest_”");
  assert.equal(answer("underscorifySubstring", "abc", "x"), "The result: “abc”");
  assert.equal(answer("underscorifySubstring", "aaa", "a"), "The result: “_aaa_”");
  const r = rng(25);
  for (let k = 0; k < 200; k++) {
    const x = randStr(r, 1 + (k % 16), "ab");
    const t = randStr(r, 1 + (k % 3), "ab");
    // The slow way: mark every character some occurrence covers; an underscore wherever covered starts or stops.
    const cov = [...x].map(() => false);
    for (let i = 0; i + t.length <= x.length; i++) if (x.slice(i, i + t.length) === t) for (let j = i; j < i + t.length; j++) cov[j] = true;
    let want = "";
    for (let i = 0; i <= x.length; i++) want += ((cov[i] ?? false) !== (cov[i - 1] ?? false) ? "_" : "") + (x[i] ?? "");
    assert.equal(answer("underscorifySubstring", x, t), `The result: “${want}”`, `${x} / ${t}`);
  }
});

test("pattern matcher", () => {
  assert.equal(answer("patternMatcher", "yxyy", "gophergogo"), "x = “pher”, y = “go”: [pher, go]");
  assert.equal(answer("patternMatcher", "xxyxxy", "aabaab"), "x = “a”, y = “b”: [a, b]");
  assert.equal(answer("patternMatcher", "xx", "abab"), "x = “ab”, y = “”: [ab, ]");
  assert.equal(answer("patternMatcher", "yy", "abab"), "x = “”, y = “ab”: [, ab]");
  assert.equal(answer("patternMatcher", "xy", "a"), s.patternMatcher.none);
  assert.throws(() => answer("patternMatcher", "xz", "ab"), /x and y only/);
  const r = rng(26);
  for (let k = 0; k < 200; k++) {
    const pat = randStr(r, 1 + (k % 5), "xy");
    const str = k % 2 ? randStr(r, 1 + (k % 12), "ab") : [...pat].map((c) => (c === "x" ? "ab" : "b")).join("");
    if (str.length > 16) continue;
    const hasY = pat.includes("y");
    // The slow way: every length of x and of y, x and y read off where they first appear.
    let some = false;
    for (let lx = hasY ? 1 : 0; lx <= str.length && !some; lx++)
      for (let ly = hasY ? 1 : 0; ly <= str.length && !some; ly++) {
        if (!hasY && ly) continue;
        let at = 0;
        const seen: Record<string, string> = {};
        let ok = true;
        for (const c of pat) {
          const l = c === "x" ? lx : ly;
          const piece = str.slice(at, at + l);
          if (piece.length !== l || (seen[c] !== undefined && seen[c] !== piece) || (!l && pat.includes(c))) ok = false;
          seen[c] = piece;
          at += l;
        }
        if (ok && at === str.length) some = true;
      }
    const got = answer("patternMatcher", pat, str);
    assert.equal(got !== s.patternMatcher.none, some, `${pat} / ${str}: ${got}`);
    if (some) {
      const [, x, y] = got.match(/^x = “(\w*)”, y = “(\w*)”/)!;
      assert.equal([...pat].map((c) => (c === "x" ? x : y)).join(""), str, `${pat} / ${str}`);
    }
  }
});

test("smallest substring containing", () => {
  assert.equal(answer("smallestSubstringContaining", "bacon and beans", "nab"), "The smallest substring is “bean”.");
  assert.equal(answer("smallestSubstringContaining", "abc", "abcd"), s.smallestSubstringContaining.none);
  assert.equal(answer("smallestSubstringContaining", "aab", "aa"), "The smallest substring is “aa”.");
  const r = rng(27);
  for (let k = 0; k < 200; k++) {
    const big = randStr(r, 1 + (k % 16), "abcd");
    const small = randStr(r, 1 + (k % 4), "abc");
    const need = (x: string) => [...new Set(small)].every((c) => [...x].filter((y) => y === c).length >= [...small].filter((y) => y === c).length);
    let best = "";
    for (let len = 1; len <= big.length && !best; len++)
      for (let a = 0; a + len <= big.length && !best; a++) if (need(big.slice(a, a + len))) best = big.slice(a, a + len);
    const want = best ? `The smallest substring is “${best}”.` : s.smallestSubstringContaining.none;
    assert.equal(answer("smallestSubstringContaining", big, small), want, `${big} / ${small}`);
  }
});

test("longest balanced substring", () => {
  assert.equal(answer("longestBalancedSubstring", "())(()())(("), "The longest balanced substring is 6 long: “(()())”.");
  assert.equal(answer("longestBalancedSubstring", ")))("), s.longestBalancedSubstring.none);
  assert.equal(answer("longestBalancedSubstring", "()()"), "The longest balanced substring is 4 long: “()()”.");
  assert.throws(() => answer("longestBalancedSubstring", "(a)"), /brackets/);
  const r = rng(28);
  const balanced = (x: string) => {
    let d = 0;
    for (const c of x) if ((d += c === "(" ? 1 : -1) < 0) return false;
    return d === 0;
  };
  for (let k = 0; k < 200; k++) {
    const x = randStr(r, 1 + (k % 16), "()");
    const best = Math.max(0, ...subs(x).filter(([a, b]) => balanced(x.slice(a, b))).map(([a, b]) => b - a));
    const got = answer("longestBalancedSubstring", x);
    assert.equal(got === s.longestBalancedSubstring.none ? 0 : Number(got.match(/is (\d+) long/)![1]), best, x);
    if (best) assert.ok(balanced(got.match(/“(.*)”/)![1]), x);
  }
});

test("strings made up of strings", () => {
  assert.equal(answer("stringsMadeUpOfStrings", "bedrock, bedroom, rockbed", "be, bed, d, rock, roo"), "Made of the substrings: [bedrock, rockbed]");
  assert.equal(answer("stringsMadeUpOfStrings", "abc", "ab, bc"), s.stringsMadeUpOfStrings.none);
  assert.equal(answer("stringsMadeUpOfStrings", "aaaa, aaa", "aa"), "Made of the substrings: [aaaa]");
  assert.throws(() => answer("stringsMadeUpOfStrings", "abc", "abcdefgh, ijklmnop, qrstuvwx"), /trie/);
  const r = rng(29);
  for (let k = 0; k < 150; k++) {
    const strs = Array.from({ length: 1 + (k % 5) }, () => randStr(r, 1 + Math.floor(r() * 8), "ab"));
    const parts = [...new Set(Array.from({ length: 1 + (k % 4) }, () => randStr(r, 1 + Math.floor(r() * 3), "ab")))];
    // The slow way: word break, a table of which starts can reach the end.
    const can = (x: string) => {
      const ok = [...x].map(() => false).concat(true);
      for (let i = x.length - 1; i >= 0; i--) ok[i] = parts.some((p) => x.startsWith(p, i) && ok[i + p.length]);
      return ok[0];
    };
    const want = strs.filter(can);
    const got = answer("stringsMadeUpOfStrings", strs.join(", "), parts.join(", "));
    assert.equal(got, want.length ? `Made of the substrings: [${want.join(", ")}]` : s.stringsMadeUpOfStrings.none, `${strs} / ${parts}`);
  }
});
