// Six design questions (code deployment, AlgoExpert, a stockbroker, Amazon, the Reddit API, Facebook's news feed):
// their examples give the right answers, the estimates are worked out right for random knobs (each worked out again
// here from the inputs), the architecture grows a box at a time, and bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { bytes, human } from "../src/math/problems/sys.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const words = w.sysDesigns;
const trace = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w);
const answer = (id: ProblemId, ...input: string[]) => trace(id, ...input).answer;
/** The values column of the estimates table once it is complete (frame 0 is the requirements). */
const estimated = (id: ProblemId, rows: number, ...input: string[]) => trace(id, ...input).frames[rows].mat!.vals.map((r) => r[0]);
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));
/** A random number from lo to hi, rounded to `d` decimals, as typed. */
const pick = (r: () => number, lo: number, hi: number, d = 0) => String(Math.round((lo + r() * (hi - lo)) * 10 ** d) / 10 ** d);

/** The architecture shows one more box at each of its frames, and every link joins boxes that are shown. */
function growsBoxByBox(id: ProblemId, ...input: string[]) {
  const arch = trace(id, ...input).frames.flatMap((f) => (f.arch ? [f.arch] : []));
  const total = Math.max(...arch.map((a) => a.boxes.length));
  const counts = arch.map((a) => a.boxes.length);
  assert.deepEqual(counts.slice(0, total), Array.from({ length: total }, (_, i) => i + 1), id);
  for (const a of arch) for (const l of a.links) assert.ok(l.a < a.boxes.length && l.b < a.boxes.length, id);
  return total;
}

test("design a code-deployment system", () => {
  const id = "designCodeDeploymentSystem";
  assert.equal(
    answer(id, "2000", "15", "500", "200", "8"),
    "Plan for 63 build workers and 1 TB of new builds a day; each deploy moves 100 TB, copied once to each of 8 regions and then peer to peer, reaching every machine in about 15 rounds.",
  );
  assert.deepEqual(estimated(id, 7, "2000", "15", "500", "200", "8"), ["250", "63", "1 TB", "365 TB", "25 K", "100 TB", "15"]);
  // 128 machines a region: exactly 7 doublings.
  assert.match(answer(id, "24", "60", "1", "1.024", "8"), /^Plan for 3 build workers .* about 7 rounds\.$/);
  assert.equal(growsBoxByBox(id, "2000", "15", "500", "200", "8"), 8);
  const r = rng(301);
  for (let k = 0; k < 150; k++) {
    const [b, t, s, m, g] = [pick(r, 1, 50_000), pick(r, 1, 120, 1), pick(r, 1, 5000), pick(r, 0.1, 5000, 1), pick(r, 1, 50)];
    const [B, T, S, M, R] = [Number(b), Number(t), Number(s) * 1e6, Number(m) * 1e3, Number(g)];
    const workers = Math.ceil(((B / 24) * 3 * T) / 60);
    let rounds = 0;
    while (2 ** rounds < M / R) rounds++;
    const want = { w: human(workers), s: bytes(B * S), d: bytes(S * M), r: R, k: Math.max(1, rounds) };
    assert.equal(answer(id, b, t, s, m, g), fill(words.designCodeDeploymentSystem.answer, want), `${b} ${t} ${s} ${m} ${g}`);
    assert.deepEqual(estimated(id, 7, b, t, s, m, g)[3], bytes(B * S * 365));
  }
  assert.throws(() => answer(id, "0", "15", "500", "200", "8"), /from 1 to/);
  assert.throws(() => answer(id, "2000", "15", "500", "200", "2.5"), /whole number/);
  assert.throws(() => answer(id, "2000", "lots", "500", "200", "8"), /not “lots”/);
});

test("design AlgoExpert", () => {
  const id = "designAlgoExpert";
  assert.equal(answer(id, "200", "15", "3", "9"), "Plan for 104 code runs a second at the peak: about 313 sandboxes busy at once, so keep 625 warm — 70 for each of the 9 languages.");
  assert.deepEqual(estimated(id, 6, "200", "15", "3", "9"), ["3 M", "35/s", "104/s", "313", "625", "70"]);
  // 86.4 K users × 10 runs = 10 a second, 30 at the peak, 60 busy for 2 s, 120 warm, 40 for each of 3 languages.
  assert.equal(answer(id, "86.4", "10", "2", "3"), "Plan for 30 code runs a second at the peak: about 60 sandboxes busy at once, so keep 120 warm — 40 for each of the 3 languages.");
  assert.equal(growsBoxByBox(id, "200", "15", "3", "9"), 8);
  const r = rng(302);
  for (let k = 0; k < 150; k++) {
    const [u, n, s, l] = [pick(r, 1, 50_000), pick(r, 0.1, 100, 1), pick(r, 0.1, 30, 1), pick(r, 1, 30)];
    const peak = (Number(u) * 1e3 * Number(n) * 3) / 86_400;
    const busy = peak * Number(s);
    const warm = Math.ceil(busy * 2);
    const want = { p: human(peak), b: human(busy), k: human(warm), l: human(Math.ceil(warm / Number(l))), n: l };
    assert.equal(answer(id, u, n, s, l), fill(words.designAlgoExpert.answer, want), `${u} ${n} ${s} ${l}`);
  }
  assert.throws(() => answer(id, "200", "15", "3", "0"), /whole number/);
  assert.throws(() => answer(id, "200", "15", "90", "9"), /from 0.1 to 60/);
});

test("design a stockbroker", () => {
  const id = "designStockbroker";
  assert.equal(answer(id, "2", "3", "50000", "15"), "Plan for 1.3 K orders a second at the opening bell, 2.6 K balance writes a second, 1.2 B price updates a day taken in and 3 M price pushes a second.");
  assert.deepEqual(estimated(id, 7, "2", "3", "50000", "15"), ["6 M", "256/s", "1.3 K/s", "2.6 K/s", "1.2 B", "300 K", "3 M/s"]);
  // 4.68 M orders over 23 400 s is 200 a second; the bell makes it 1 K.
  assert.match(answer(id, "4.68", "1", "100", "1"), /^Plan for 1 K orders a second at the opening bell, 2 K balance writes/);
  assert.equal(growsBoxByBox(id, "2", "3", "50000", "15"), 9);
  const r = rng(303);
  for (let k = 0; k < 150; k++) {
    const [u, o, q, p] = [pick(r, 0.01, 500, 2), pick(r, 0.1, 50, 1), pick(r, 1, 1e6), pick(r, 0.1, 100, 1)];
    const peak = (Number(u) * 1e6 * Number(o) * 5) / 23_400;
    const want = { p: human(peak), l: human(peak * 2), t: human(Number(q) * 23_400), q: human(Number(u) * 1e6 * (Number(p) / 100) * 10) };
    assert.equal(answer(id, u, o, q, p), fill(words.designStockbroker.answer, want), `${u} ${o} ${q} ${p}`);
  }
  assert.throws(() => answer(id, "2", "3", "50000", "120"), /from 0.1 to 100/);
  assert.throws(() => answer(id, "", "3", "50000", "15"), /not “…”/);
});

test("design Amazon", () => {
  const id = "designAmazon";
  assert.equal(answer(id, "100", "30", "5", "300"), "Plan for 104 K page views a second at the peak against 174 orders a second (600 views per order), a catalogue of 3 TB and 9.1 TB of orders a year.");
  assert.deepEqual(estimated(id, 7, "100", "30", "5", "300"), ["3 B", "34.7 K/s", "104 K/s", "174/s", "600", "3 TB", "9.1 TB"]);
  // As many orders as views: one view per order.
  assert.match(answer(id, "1", "1", "1", "1"), /\(1 views per order\), a catalogue of 10 GB and 1.8 TB of orders a year\.$/);
  assert.equal(growsBoxByBox(id, "100", "30", "5", "300"), 10);
  const r = rng(304);
  for (let k = 0; k < 150; k++) {
    const [u, v, o, p] = [pick(r, 0.01, 2000, 2), pick(r, 1, 200), pick(r, 0.001, 100, 3), pick(r, 0.001, 5000, 3)];
    const [U, V, O, P] = [Number(u) * 1e6, Number(v), Number(o) * 1e6, Number(p) * 1e6];
    const want = { r: human((U * V * 3) / 86_400), o: human((O * 3) / 86_400), n: human((U * V) / O), c: bytes(P * 1e4), y: bytes(O * 365 * 5000) };
    assert.equal(answer(id, u, v, o, p), fill(words.designAmazon.answer, want), `${u} ${v} ${o} ${p}`);
  }
  assert.throws(() => answer(id, "100", "0", "5", "300"), /from 1 to 1000/);
});

test("design the Reddit API", () => {
  const id = "designRedditApi";
  const t = trace(id, "800", "60", "40", "25");
  assert.equal(t.answer, "Votes are the busiest writes: 67.8 K a second at the peak, added up off a queue; 48 M comments a day, and a thread of 60 comments, 25 to a page, ends on page 3.");
  assert.deepEqual(estimated(id, 6, "800", "60", "40", "25"), ["48 M", "2 B", "22.6 K/s", "67.8 K/s", "3", "21.4 TB"]);
  // All six entities, then all nine endpoints, the votes as PUTs.
  const entities = t.frames.filter((f) => f.rows && !f.mat && f.rows.length >= 2 && f.note !== words.designRedditApi.reqNote);
  assert.equal(entities[entities.length - 1].rows!.length, 6);
  const endpoints = t.frames.filter((f) => f.mat?.colHeads?.[0] === "Path");
  assert.equal(endpoints.length, 5);
  assert.equal(endpoints[4].mat!.vals.length, 9);
  assert.deepEqual(endpoints[4].mat!.rowHeads!.filter((m) => m === "PUT").length, 2);
  // The first page lit, the cursor on its last item (a page of 25 fills all twelve boxes shown, so no cursor is drawn).
  const page = t.frames.find((f) => f.cells)!;
  assert.equal(page.cells!.ptrs, undefined);
  assert.ok(page.cells!.roles!.every((r) => r === "sorted"));
  const small = trace(id, "1", "7", "2", "5").frames.find((f) => f.cells)!;
  assert.deepEqual(small.cells!.ptrs, { after: 4 });
  assert.match(answer(id, "1", "7", "2", "5"), /a thread of 7 comments, 5 to a page, ends on page 2\.$/);
  assert.match(answer(id, "1", "0", "0", "5"), /0 a second at the peak.* ends on page 1\.$/);
  assert.equal(growsBoxByBox(id, "800", "60", "40", "25"), 7);
  const r = rng(305);
  for (let k = 0; k < 150; k++) {
    const [p, c, v, l] = [pick(r, 0.001, 5000, 3), pick(r, 0, 500), pick(r, 0, 1000), pick(r, 1, 100)];
    const [P, C, V, L] = [Number(p) * 1e3, Number(c), Number(v), Number(l)];
    let pages = 1;
    while (pages * L < C) pages++;
    const want = { v: human((((P + P * C) * V) / 86_400) * 3), c: human(P * C), k: human(C), n: pages, l: L };
    assert.equal(answer(id, p, c, v, l), fill(words.designRedditApi.answer, want), `${p} ${c} ${v} ${l}`);
  }
  assert.throws(() => answer(id, "800", "60", "40", "0"), /whole number from 1 to 100/);
  assert.throws(() => answer(id, "800", "-1", "40", "25"), /from 0 to/);
});

test("design Facebook News Feed", () => {
  const id = "designFacebookNewsFeed";
  const t = trace(id, "500", "300", "0.5", "10000");
  assert.equal(t.answer, "Plan for 868 K feed writes a second from fan-out, 57.9 K feed reads a second and 2 TB of feed cache; accounts with more than 10 K followers are pulled when a feed is read instead of pushed.");
  assert.deepEqual(estimated(id, 6, "500", "300", "0.5", "10000"), ["250 M", "2.9 K/s", "868 K/s", "57.9 K/s", "2 TB", "10 K"]);
  // The threshold splits the sample accounts: three pushed, three pulled; a huge threshold pushes all six.
  const demo = t.frames.find((f) => f.cells)!;
  assert.deepEqual(demo.cells!.roles, ["sorted", "sorted", "sorted", "pivot", "pivot", "pivot"]);
  assert.match(trace(id, "500", "300", "0.5", "1000000000").frames.find((f) => f.cells)!.note, /6 are pushed .* and 0 pulled/);
  assert.equal(growsBoxByBox(id, "500", "300", "0.5", "10000"), 9);
  const r = rng(306);
  for (let k = 0; k < 150; k++) {
    const [u, f, p, th] = [pick(r, 0.01, 3000, 2), pick(r, 1, 5000), pick(r, 0.01, 20, 2), pick(r, 100, 1e8)];
    const U = Number(u) * 1e6;
    const want = { w: human(((U * Number(p)) / 86_400) * Number(f)), r: human((U * 10) / 86_400), c: bytes(U * 4000), t: human(Number(th)) };
    assert.equal(answer(id, u, f, p, th), fill(words.designFacebookNewsFeed.answer, want), `${u} ${f} ${p} ${th}`);
  }
  assert.throws(() => answer(id, "500", "300", "0.5", "10"), /from 100 to/);
  assert.throws(() => answer(id, "500", "0", "0.5", "10000"), /from 1 to 5000/);
});
