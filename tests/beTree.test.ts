// Be the tree: a player who makes the code's operations ends with what a plain search tree gives (the same tree after
// the inserts, each search's answer, the values in order and node first); every other operation is refused with the
// rule it broke; the tasks are worth playing; and the stars, notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, build, checkOp, CODE, expect as next, height, logText, OPS, replay, startMachine, step, TREE_ALGOS, TREE_LADDER, treeNotice, treeNow, treeRun, treeStars, treeSvg, type TreeAttempt, type TreeLevel, type TreeMachine, type TreeNode, type TreeTask, type TreeWhy } from "../src/math/beTree.ts";

const tasks = (): { t: TreeTask; where: string }[] => [
  ...TREE_LADDER.map((_, stage) => ({ t: treeNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as TreeLevel[]).flatMap((level) => Array.from({ length: 40 }, (_, i) => ({ t: treeNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** The values node first, by recursion. */
const pre = (nodes: TreeNode[], i: number): number[] => (i < 0 ? [] : [nodes[i].v, ...pre(nodes, nodes[i].l), ...pre(nodes, nodes[i].r)]);
const vals = (m: TreeMachine) => m.out.map((i) => m.nodes[i].v);

test("the code's own operations end with what a plain search tree gives", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = treeRun(t);
    if (t.algo === "insert") assert.deepEqual([end.nodes, end.root], Object.values(build([...t.a, ...t.q])), where);
    if (t.algo === "search") assert.deepEqual(end.res, t.q.map((x) => (t.a.includes(x) ? x : null)), where);
    if (t.algo === "inorder") assert.deepEqual(vals(end), [...t.a].sort((x, y) => x - y), where);
    if (t.algo === "preorder") assert.deepEqual(vals(end), pre(end.nodes, end.root), where);
    if (t.algo === "preorder") {
      // Inserting the preorder values in turn builds the same tree: the same values node first.
      const again = build(vals(end));
      assert.deepEqual(pre(again.nodes, again.root), vals(end), where);
    }
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.log.length, ops.length + 1, where);
    assert.deepEqual(end.stack, [], where);
  }
});

/** Every operation the board lets the player try. */
function attempts(m: TreeMachine): TreeAttempt[] {
  const { algo } = m.task;
  const idx = [...m.nodes.keys()];
  if (algo === "insert" || algo === "search") {
    const n = m.nodes[m.cur];
    return [...idx.map((node) => ({ kind: "drop" as const, node })), ...(["l", "r"] as const).filter((s) => n[s] < 0).map((side) => ({ kind: "slot" as const, side }))];
  }
  return [...idx.map((node) => ({ kind: "push" as const, node })), ...idx.map((node) => ({ kind: "out" as const, node })), ...(m.stack.length ? [{ kind: "pop" as const }] : [])];
}
function right(m: TreeMachine, a: TreeAttempt): boolean {
  const e = next(m);
  if (e === "down") return a.kind === "drop" && a.node === step(m).to;
  if (e === "place" || e === "miss") return a.kind === "slot" && a.side === step(m).side;
  if (e === "found") return a.kind === "drop" && a.node === m.cur;
  if (e === "pop") return a.kind === "pop";
  return a.kind === "push" && a.node === (m.task.algo === "inorder" ? m.cur : m.pend[0]);
}

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<TreeWhy>();
  for (const { t, where } of tasks().filter((_, i) => i < TREE_LADDER.length || i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of treeRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beTree.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: TreeMachine, a: TreeAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  const [D, , , , P, O] = OPS.map((_, i) => i);
  // The tree of 8 3 12 1 5 (nodes 0..4): inserting 4 goes left of 8, right of 3, left of 5.
  const ins: TreeTask = { algo: "insert", a: [8, 3, 12, 1, 5], q: [4] };
  let m = startMachine(ins);
  assert.equal(say(m, { kind: "drop", node: 2 }), `goLeft {"x":4,"v":8}`);
  assert.equal(say(m, { kind: "drop", node: 4 }), `oneStep {"v":8}`);
  m = apply(m, D);
  assert.equal(logText(m.log.at(-1)!, ins), "4 < 8: cur = cur.left = 3");
  assert.equal(say(m, { kind: "drop", node: 3 }), `goRight {"x":4,"v":3}`);
  m = [D].reduce(apply, m);
  assert.equal(say(m, { kind: "slot", side: "r" }), `goLeft {"x":4,"v":5}`);
  m = apply(m, OPS.indexOf("place"));
  assert.equal(logText(m.log.at(-1)!, ins), "4 < 5: 5.left = Node(4)");
  assert.deepEqual(m.seen, ["leaf"]);
  // Searching for 5 and 6: 5 is found at depth 2, 6 falls off to the right of 5.
  const se: TreeTask = { algo: "search", a: [8, 3, 12, 1, 5], q: [5, 6] };
  let s = replay(se, [D, D]);
  assert.equal(say(s, { kind: "drop", node: 0 }), `here {"x":5}`);
  s = apply(s, OPS.indexOf("found"));
  assert.equal(logText(s.log.at(-1)!, se), "5 found: res.append(5)");
  s = [D, D].reduce(apply, s);
  assert.equal(say(s, { kind: "slot", side: "r" }), "ok");
  assert.equal(logText(apply(s, OPS.indexOf("miss")).log.at(-1)!, se), "6 isn't there: res.append(None)");
  // Inorder of the same tree: push 8, 3, 1, then cur is None, so pop 1.
  const io: TreeTask = { algo: "inorder", a: [8, 3, 12, 1, 5], q: [] };
  let n = startMachine(io);
  assert.equal(say(n, { kind: "push", node: 1 }), `pushCur {"v":8}`);
  assert.equal(say(n, { kind: "out", node: 3 }), "viaStack {\"v\":1}");
  n = [P, P].reduce(apply, n);
  assert.equal(say(n, { kind: "pop" }), `leftFirst {"v":1}`);
  n = apply(n, P);
  assert.equal(logText(n.log.at(-1)!, io), "stack.append(1) → [8, 3, 1]");
  assert.equal(say(n, { kind: "push", node: 4 }), `popTop {"t":1}`);
  n = apply(n, O);
  assert.equal(logText(n.log.at(-1)!, io), "stack.pop() = 1; out = [1]");
  // Preorder: pop 8, push 12 then 3, so 3 comes off first.
  const po: TreeTask = { algo: "preorder", a: [8, 3, 12, 1, 5], q: [] };
  let p = apply(startMachine(po), O);
  assert.equal(say(p, { kind: "push", node: 1 }), `rightFirst {"r":12,"l":3}`);
  assert.equal(say(p, { kind: "push", node: 3 }), `pushChild {"v":8}`);
  assert.equal(say(p, { kind: "pop" }), `pushChildren {"v":8}`);
  p = [P, P].reduce(apply, p);
  assert.deepEqual(p.lines, [4]);
  assert.equal(vals(replay(po, treeRun(po).ops)).join(), "8,3,1,5,12");
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = treeRun(t);
    const h = height(end.nodes, end.root);
    assert.ok(h >= 3 && h <= 5, where);
    if (t.algo === "insert" || t.algo === "search") assert.ok(ops.filter((c) => OPS[c] === "down").length >= 2 * t.q.length, where);
    if (t.algo === "search") assert.ok(end.res.some((r) => r !== null) && end.res.includes(null), where);
  }
  TREE_LADDER.forEach((s, stage) => assert.equal(treeNow({ mode: "puzzle", stage, level: 1, seed: 1 }).algo, s.algo));
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(TREE_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(treeStars), [3, 2, 1, 1]);
  const end = treeRun({ algo: "inorder", a: [2, 1, 3], q: [] }).end;
  assert.deepEqual(end.seen, ["sorted"]);
  assert.equal(treeNotice(end, 0, 2), "sorted");
  assert.equal(treeNotice(end, 1, 2), null);
  assert.equal(treeNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i < TREE_LADDER.length || i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of treeRun(t).ops) {
      const pic = treeSvg(m, { hot: "stack", sel: "x" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const pair =
        e === "down" ? ["x", `n${step(m).to}`]
        : e === "place" || e === "miss" ? ["x", `s${step(m).side}`]
        : e === "found" ? ["x", `n${m.cur}`]
        : e === "push" ? [`n${t.algo === "inorder" ? m.cur : m.pend[0]}`, "stack"]
        : ["top", "out"];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(treeSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beTree);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beTree));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeTree);
  }
  for (const algo of TREE_ALGOS) assert.ok(en.live.beTree.names[algo] && en.live.beTree.hint[algo] && en.live.beTree.right[algo].includes("{stars}"));
});
