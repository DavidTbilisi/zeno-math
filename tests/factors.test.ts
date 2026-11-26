// Factors, multiples, prime or composite (#701): every picked answer is true of its number and every wrong option is
// false; each slip has its hint; each kind sits at the level whose grade fits it.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;
const W = w.factors;
const all = [1, 2, 3].flatMap((level) => Array.from({ length: 300 }, (_, i) => ({ level, ex: exercise("divisibility", level as 1 | 2 | 3, i + 1, w) })));
const fills = (prompt: string, t: string) => new RegExp(`^${t.split(/\{\w+\}/).map((p) => p.replace(/[.*+?^$()|[\]\\]/g, "\\$&")).join(".+?")}$`).test(prompt);
const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);
const prime = (n: number) => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every((d) => n % d !== 0);

test("each option is true or false of its number as the answer says", () => {
  const kinds = new Set<string>();
  for (const { ex } of all) {
    if (ex.answer.k !== "pick") continue;
    const { options, right } = ex.answer;
    const where = `${ex.prompt} [${options.map((o) => o.text).join(" | ")}]`;
    const truth = (text: string): boolean => {
      const [n] = nums(ex.prompt);
      if (fills(ex.prompt, W.pair)) return nums(text).reduce((p, x) => p * x, 1) === n;
      if (fills(ex.prompt, W.factor)) return n % Number(text) === 0 && Number(text) < n;
      if (fills(ex.prompt, W.multiple)) return Number(text) % n === 0;
      if (ex.prompt === W.prime) return prime(Number(text));
      if (ex.prompt === W.composite) return Number(text) > 1 && !prime(Number(text));
      if (fills(ex.prompt, W.primeOrComposite)) return (text === W.isPrime) === prime(n);
      // a is a factor of b, or a is a multiple of b.
      const [a, b] = nums(text);
      return fills(text, W.factorOf) ? b % a === 0 : a % b === 0;
    };
    kinds.add(ex.prompt.replace(/\d+/g, "n"));
    options.forEach((o, i) => assert.equal(truth(o.text), i === right, `${where}: ${o.text}`));
    for (const t of trapInputs(ex)) assert.ok(check(ex, t.input, w).hint, `${where}: ${t.id}`);
  }
  assert.equal(kinds.size, 7, [...kinds].join("; "));
});

test("factor pairs, factors and multiples first; the relation and primes next; composites, prime or composite and bigger multiples last", () => {
  const where = (f: (p: string) => boolean) => [...new Set(all.filter(({ ex }) => f(ex.prompt)).map(({ level }) => level))].sort();
  assert.deepEqual(where((p) => fills(p, W.factor)), [1]);
  assert.deepEqual(where((p) => fills(p, W.pair)), [1, 2]);
  assert.deepEqual(where((p) => fills(p, W.multiple)), [1, 3]);
  assert.deepEqual(where((p) => fills(p, W.relate) || p === W.prime), [2]);
  assert.deepEqual(where((p) => p === W.composite || fills(p, W.primeOrComposite)), [3]);
  // The divisibility tests are still asked at every level.
  assert.deepEqual([...new Set(all.filter(({ ex }) => ex.answer.k === "divisors").map(({ level }) => level))].sort(), [1, 2, 3]);
});
