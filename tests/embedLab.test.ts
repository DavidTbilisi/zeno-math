// The embeddings lab: the cosine is the dot product over the lengths, the cosine of the angle and blind to length;
// the nearest words are ranked by it; an analogy a − b + c lands where the arrow from b to c, laid from a's tip, ends;
// every puzzle starts unsolved and has a solution on the grid, and each kind of failed try is told apart; free play's
// picks, the readout, the view and the picture follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analogiesOf,
  analogyPoint,
  angleDeg,
  cosine,
  dot,
  EMBED_LADDER,
  EMBED_START,
  embedPuzzle,
  embedReadout,
  embedStars,
  embedStart,
  embedSvg,
  FREE_VECS,
  fromPage,
  judgeEmbed,
  len,
  nearest,
  num,
  pick,
  snapTip,
  toPage,
  VIEW,
  WORD_IDS,
  type Pt,
  type WordVec,
} from "../src/math/embedLab.ts";

const P = EMBED_LADDER;
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const names = Object.fromEntries(WORD_IDS.map((id) => [id, id]));
const W = { names, ratio: "|{b}| / |{a}|", off: "{e} ↔ {d}", picked: "pick", nearestTo: "near {q}", lands: "{e} lands" };
const moved = (vecs: WordVec[], id: string, v: Pt) => vecs.map((x) => (x.id === id ? { ...x, v } : x));

test("cosine: the dot product over the lengths, the cosine of the angle, blind to length", () => {
  const pairs: [Pt, Pt][] = [[[1, 0], [0, 2]], [[2, 1], [4, 2]], [[1, 1], [-1, -1]], [[3, -1], [0.5, 2]]];
  for (const [a, b] of pairs) {
    assert.ok(close(cosine(a, b), dot(a, b) / (len(a) * len(b))));
    assert.ok(close(Math.cos((angleDeg(a, b) * Math.PI) / 180), cosine(a, b)));
    assert.ok(close(cosine([3 * a[0], 3 * a[1]], b), cosine(a, b)));
    assert.ok(close(dot([3 * a[0], 3 * a[1]], b), 3 * dot(a, b)));
  }
  assert.deepEqual([cosine([1, 0], [0, 2]), cosine([2, 1], [4, 2]), cosine([1, 1], [-1, -1])].map((c) => Math.round(c * 1e9) / 1e9), [0, 1, -1]);
  assert.equal(cosine([0, 0], [1, 2]), 0);
  assert.equal(angleDeg([1, 0], [1, 0]), 0);
});

test("nearest words by cosine, and analogies as one arrow laid from another's tip", () => {
  const vecs = embedStart(null);
  const rank = nearest(vecs, [2.6, 1.2], ["cat"]);
  assert.equal(rank[0].id, "kitten");
  assert.ok(rank.every((r, i) => i === 0 || r.cos <= rank[i - 1].cos));
  assert.equal(rank.length, vecs.length - 1);
  const v = (id: string) => vecs.find((x) => x.id === id)!.v;
  const x = analogyPoint(v("king"), v("man"), v("woman"));
  assert.ok(close(x[0] - v("king")[0], v("woman")[0] - v("man")[0]) && close(x[1] - v("king")[1], v("woman")[1] - v("man")[1]));
  // Free play's words are laid out so that king − man + woman is queen.
  assert.ok(close(len([x[0] - v("queen")[0], x[1] - v("queen")[1]]), 0));
});

test("every puzzle starts unsolved, and has a solution on the grid", () => {
  const solutions: [string, Pt][] = [["dog", [2.4, 1.3]], ["car", [-2, 2]], ["down", [-0.6, -3]], ["kitten", [3, 0.8]], ["apple", [2, 1.4]], ["queen", [2, 1]], ["woman", [-2.5, 0.5]], ["it", [1.6, 0.8]]];
  assert.equal(solutions.length, P.length);
  P.forEach((p, i) => {
    const vecs = embedStart(p);
    assert.equal(judgeEmbed(p, vecs).state, "lost", `puzzle ${i + 1} starts solved`);
    const [id, at] = solutions[i];
    assert.ok(p.drag.includes(id as never), `puzzle ${i + 1}: ${id} can be dragged`);
    assert.deepEqual(snapTip(at), at, `puzzle ${i + 1}: on the grid`);
    assert.equal(judgeEmbed(p, moved(vecs, id, at)).state, "won", `puzzle ${i + 1}`);
    assert.ok(vecs.every((x) => Math.abs(x.v[0]) <= VIEW && Math.abs(x.v[1]) <= VIEW && len(x.v) >= 0.3));
  });
});

test("a failed try says why", () => {
  const why = (i: number, id?: string, at?: Pt) => {
    const v = judgeEmbed(P[i], id ? moved(embedStart(P[i]), id, at!) : embedStart(P[i]));
    return v.state === "lost" ? v.why : v.state;
  };
  assert.deepEqual(P.map((_, i) => why(i)), ["cos", "cos", "cos", "direction", "nearest", "analogy", "analogy", "dotLow"]);
  // Pointing the right way but too short, and scoring high with cat but also with mat.
  assert.equal(why(3, "kitten", [1.5, 0.4]), "short");
  assert.equal(why(7, "it", [3, 3]), "dotHigh");
  const v = judgeEmbed(P[4], embedStart(P[4]));
  assert.ok(v.state === "lost" && v.names!.length === 2 && v.names!.includes("dog"));
  const c = judgeEmbed(P[1], embedStart(P[1]));
  assert.ok(c.state === "lost" && c.want === 0.1);
});

test("tips snap to the grid, stay in view and off the origin; free play picks the last three tapped", () => {
  assert.deepEqual(snapTip([1.234, -2.06]), [1.2, -2.1]);
  assert.deepEqual(snapTip([9, -9]), [3.8, -3.8]);
  assert.equal(snapTip([0.1, 0.1]), null);
  assert.deepEqual(pick([], "cat"), ["cat"]);
  assert.deepEqual(pick(["a", "b", "c"], "d"), ["b", "c", "d"]);
  assert.deepEqual(pick(["a", "b"], "a"), ["b"]);
  for (const q of [[-4, -4], [0, 0], [1.5, -2.5]] as Pt[]) {
    const back = fromPage(toPage(q));
    assert.ok(close(back[0], q[0]) && close(back[1], q[1]));
  }
});

test("the readout: what each puzzle is about, and free play's one, two or three picks", () => {
  const rows = (i: number) => embedReadout(P[i], embedStart(P[i]), [], W).rows;
  assert.deepEqual(rows(0).map((r) => [r.label, r.ok]), [["cos(cat, dog)", false]]);
  assert.deepEqual(rows(3).map((r) => r.label), ["cos(cat, kitten)", "|kitten| / |cat|"]);
  const near = embedReadout(P[4], embedStart(P[4]), [], W);
  assert.equal(near.title, "near apple");
  assert.equal(near.rows.length, 5);
  assert.deepEqual(near.rows.slice(0, 2).map((r) => r.ok), [false, false]);
  assert.deepEqual(rows(6).map((r) => r.label), ["king − man + woman ↔ queen", "uncle − man + woman ↔ aunt"]);
  assert.deepEqual(rows(7).map((r) => [r.label, r.text, r.ok]), [["it · cat", "2", false], ["it · mat", "1.5", false]]);
  const vecs = embedStart(null);
  assert.deepEqual(embedReadout(null, vecs, [], W), { title: "pick", rows: [] });
  assert.equal(embedReadout(null, vecs, ["gone"], W).rows.length, 0);
  assert.equal(embedReadout(null, vecs, ["cat"], W).rows[0].label, "cos(cat, kitten)");
  assert.deepEqual(embedReadout(null, vecs, ["cat", "car"], W).rows.map((r) => r.label), ["cos(cat, car)", "cat · car", "|cat|", "|car|"]);
  const three = embedReadout(null, vecs, ["king", "man", "woman"], W);
  assert.equal(three.title, "king − man + woman lands");
  assert.deepEqual([three.rows[0].label, three.rows[0].text], ["queen", "0"]);
});

test("every picture draws, with the angle, the analogies, and labels inside the frame", () => {
  P.forEach((p, i) => {
    const vecs = embedStart(p);
    const g = p.goal;
    const pair = g.kind === "cos" || g.kind === "long" ? ([g.a, g.b] as [string, string]) : undefined;
    const svg = embedSvg(vecs, { drag: p.drag, sel: [], pair, analogies: analogiesOf(p, []), readout: embedReadout(p, vecs, [], W), names });
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `puzzle ${i + 1}`);
    for (const [, x] of svg.matchAll(/<text x="([\d.-]+)"/g)) assert.ok(Number(x) >= 0 && Number(x) <= 620, `puzzle ${i + 1}: ${x}`);
  });
  // Landed on its word, an analogy's point is not named; off it, it is.
  const p = P[5];
  const at = (q: Pt) => embedSvg(moved(embedStart(p), "queen", q), { drag: p.drag, sel: [], analogies: analogiesOf(p, []), readout: { rows: [] }, names }).includes(">king − man + woman<");
  assert.deepEqual([at([2, 1]), at([-0.5, 3])], [false, true]);
  // An analogy landing outside the view draws no point; free play's three picks draw theirs.
  const far = moved(embedStart(null), "king", [3.8, 3.8]);
  assert.doesNotMatch(embedSvg(far, { drag: [], sel: ["king", "woman", "car"], analogies: analogiesOf(null, ["king", "woman", "car"]), readout: { rows: [] }, names }), /<circle[^>]*r="7"/);
  assert.deepEqual(analogiesOf(null, ["a", "b"]), []);
  assert.deepEqual(analogiesOf(P[0], []), []);
});

test("stars, the puzzle in play, where tries start, and numbers for the readout", () => {
  assert.deepEqual([embedStars(0), embedStars(1), embedStars(4)], [3, 2, 1]);
  assert.equal(embedPuzzle({ mode: "puzzle", stage: 2 }), P[2]);
  assert.equal(embedPuzzle({ mode: "free", stage: 2 }), null);
  assert.deepEqual(EMBED_START.vecs, embedStart(P[0]));
  assert.notEqual(embedStart(P[0])[0].v, P[0].vecs[0][1]);
  assert.equal(embedStart(null).length, FREE_VECS.length);
  assert.deepEqual([num(-0.547), num(0.001), num(4)], ["−0.55", "0", "4"]);
});
