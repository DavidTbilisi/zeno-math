// Be the monotonic stack: a player who makes the code's operations ends with what brute force gives (each next greater,
// days to wait, previous smaller, the smallest number left), each index pushed once; every other operation is refused
// with the rule it broke; the tasks are worth playing; and the stars, notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { answers, apply, checkOp, CODE, expect as next, kept, logText, OPS, replay, STACK_ALGOS, STACK_LADDER, stackNotice, stackNow, stackRun, stackStars, stackSvg, startMachine, type StackAttempt, type StackLevel, type StackMachine, type StackTask, type StackWhy } from "../src/math/beStack.ts";

const tasks = (): { t: StackTask; where: string }[] => [
  ...STACK_LADDER.map((_, stage) => ({ t: stackNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as StackLevel[]).flatMap((level) => Array.from({ length: 40 }, (_, i) => ({ t: stackNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** The answers by brute force: looking right of each cell (or left), or trying every k digits to remove. */
function plain(t: StackTask): number[] | string {
  const { a, k } = t;
  if (t.algo === "removeK") {
    let best = "";
    const pickOut = (from: number, left: number, gone: number[]) => {
      if (left === 0) {
        const s = a.filter((_, i) => !gone.includes(i)).join("");
        if (!best || s < best) best = s;
        return;
      }
      for (let i = from; i < a.length; i++) pickOut(i + 1, left - 1, [...gone, i]);
    };
    pickOut(0, k, []);
    return best;
  }
  return a.map((v, j) => {
    if (t.algo === "prevSmaller") {
      const before = a.slice(0, j).map((w, i) => ({ w, i })).filter(({ w }) => w < v);
      return before.length ? before[before.length - 1].w : -1;
    }
    const after = a.findIndex((w, i) => i > j && w > v);
    return after < 0 ? (t.algo === "temps" ? 0 : -1) : t.algo === "temps" ? after - j : a[after];
  });
}

test("the code's own operations end with what brute force gives, each index pushed once", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = stackRun(t);
    assert.deepEqual(t.algo === "removeK" ? kept(end) : answers(end), plain(t), `${where}: ${JSON.stringify(t)}`);
    assert.equal(ops.filter((c) => OPS[c] === "push").length, t.a.length, where);
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.log.length, ops.length + 1, where);
    // The stack keeps its order after every operation: falling values for the next greater, rising otherwise.
    let m = startMachine(t);
    for (const code of ops) {
      m = apply(m, code);
      const v = m.stack.map((j) => t.a[j]);
      assert.ok(v.every((x, i) => i === 0 || (t.algo === "nextGreater" || t.algo === "temps" ? v[i - 1] >= x : t.algo === "prevSmaller" ? v[i - 1] < x : true)), where);
    }
  }
});

/** Every operation the board lets the player try. */
function attempts(m: StackMachine): StackAttempt[] {
  const { algo, a } = m.task;
  const at: StackAttempt[] = [];
  if (m.i < a.length) at.push({ kind: "push" });
  if (m.stack.length) at.push({ kind: "pop" });
  if (algo === "removeK") return at;
  for (let to = 0; to < a.length; to++) {
    if (m.stack.length) at.push({ kind: "ans", to });
    if (algo === "prevSmaller") at.push({ kind: "none", to });
  }
  return at;
}
function right(m: StackMachine, a: StackAttempt): boolean {
  const e = next(m);
  if (e === "push") return a.kind === "push";
  if (e === "pop") return a.kind === "pop";
  if (e === "resolve") return a.kind === "ans" && a.to === m.stack[m.stack.length - 1];
  return a.kind === (m.stack.length ? "ans" : "none") && a.to === m.i;
}

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<StackWhy>();
  for (const { t, where } of tasks().filter((_, i) => i < STACK_LADDER.length || i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of stackRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beStack.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: StackMachine, a: StackAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  const [P, R, O, W] = OPS.map((_, i) => i);
  // The next greater in 4 2 3 5: 3 answers 2; 5 answers 3 and then 4.
  const ng: StackTask = { algo: "nextGreater", a: [4, 2, 3, 5], k: 0 };
  let m = replay(ng, [P, P]);
  assert.equal(say(m, { kind: "push" }), `popFirst {"t":2,"x":3}`);
  assert.equal(say(m, { kind: "ans", to: 2 }), `ownCell {"j":1}`);
  assert.equal(say(m, { kind: "pop" }), `answerIt {"j":1}`);
  m = apply(m, R);
  assert.equal(logText(m.log.at(-1)!, ng), "a[1] = 2 < 3: ans[1] = 3");
  assert.equal(say(m, { kind: "ans", to: 0 }), `notGreater {"t":4,"x":3}`);
  m = [P, R, R].reduce(apply, m);
  assert.deepEqual(m.seen, ["many"]);
  assert.equal(logText(m.log.at(-1)!, ng), "a[0] = 4 < 5: ans[0] = 5");
  assert.deepEqual(answers(apply(m, P)), [5, 3, 5, -1]);
  // Days to wait in 70 72: one day.
  const tp: StackTask = { algo: "temps", a: [70, 72], k: 0 };
  assert.equal(logText(replay(tp, [P, R]).log.at(-1)!, tp), "a[0] = 70 < 72: ans[0] = 1 − 0 = 1");
  // The previous smaller in 3 5 4: 5 is popped for 4, then 3 is its answer.
  const ps: StackTask = { algo: "prevSmaller", a: [3, 5, 4], k: 0 };
  let p = startMachine(ps);
  assert.equal(say(p, { kind: "push" }), `writeFirst {"i":0}`);
  assert.equal(say(p, { kind: "none", to: 1 }), `ownCell {"j":0}`);
  p = apply(p, W);
  assert.equal(logText(p.log.at(-1)!, ps), "ans[0] = −1");
  assert.equal(say(p, { kind: "none", to: 0 }), `written {"i":0}`);
  p = [P, W].reduce(apply, p);
  assert.equal(say(p, { kind: "none", to: 1 }), `written {"i":1}`);
  p = apply(p, P);
  assert.equal(say(p, { kind: "ans", to: 2 }), `popGe {"t":5,"x":4}`);
  p = apply(p, O);
  assert.equal(logText(p.log.at(-1)!, ps), "a[1] = 5 ≥ 4: stack.pop()");
  assert.equal(say(p, { kind: "pop" }), `keepSmaller {"t":3,"x":4}`);
  assert.equal(say(p, { kind: "none", to: 2 }), `hasSmaller {"t":3}`);
  p = apply(p, W);
  assert.equal(logText(p.log.at(-1)!, ps), "ans[2] = a[0] = 3");
  // Removing 2 digits from 1 4 3 9: 4 goes for 3, then 9 is trimmed from the end.
  const rk: StackTask = { algo: "removeK", a: [1, 4, 3, 9], k: 2 };
  let r = replay(rk, [P, P]);
  assert.equal(say(r, { kind: "push" }), `popBigger {"t":4,"x":3,"k":2}`);
  assert.equal(say(replay(rk, [P]), { kind: "pop" }), `keepDigit {"t":1,"x":4}`);
  r = apply(r, O);
  assert.equal(logText(r.log.at(-1)!, rk), "4 > 3: drop 4; k = 1");
  r = [P, P, O].reduce(apply, r);
  assert.equal(logText(r.log.at(-1)!, rk), "drop 9 from the end; k = 0");
  assert.deepEqual([kept(r), r.seen], ["13", ["trim"]]);
  assert.equal(say(replay({ ...rk, k: 1 }, [P, P, O]), { kind: "pop" }), "noK {}");
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = stackRun(t);
    const pops = ops.filter((c) => OPS[c] === "resolve" || OPS[c] === "pop").length;
    assert.ok(pops >= (t.algo === "removeK" ? t.k : t.a.length / 3) && end.seen.includes("many"), where);
  }
  STACK_LADDER.forEach((s, stage) => {
    const end = stackRun(stackNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    assert.equal(end.task.algo, s.algo);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(STACK_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(stackStars), [3, 2, 1, 1]);
  const end = stackRun({ algo: "nextGreater", a: [5, 2, 1, 3], k: 0 }).end;
  assert.deepEqual(end.seen, ["many", "leftover"]);
  assert.equal(stackNotice(end, 0, 2), "many");
  assert.equal(stackNotice(end, 1, 2), null);
  assert.equal(stackNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i < STACK_LADDER.length || i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of stackRun(t).ops) {
      const pic = stackSvg(m, { hot: "c1", sel: "top" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const pair =
        e === "push" ? ["x", "stack"]
        : e === "pop" ? ["top", "bin"]
        : e === "resolve" ? ["top", `c${m.stack[m.stack.length - 1]}`]
        : [m.stack.length ? "top" : "none", `c${m.i}`];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(stackSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beStack);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beStack));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeStack);
  }
  for (const algo of STACK_ALGOS) assert.ok(en.live.beStack.names[algo] && en.live.beStack.hint[algo] && en.live.beStack.right[algo].includes("{stars}"));
});
