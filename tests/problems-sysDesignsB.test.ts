// Six design questions (Google Drive, Netflix, the Uber API, Tinder, Airbnb, the Twitch API): their estimates are
// worked out right from whatever numbers are typed in, checked here against the same sums done separately, and bad
// numbers are refused with a reason.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { bytes, human } from "../src/math/problems/sys.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const trace = (id: ProblemId, ...input: (string | number)[]) => problemTrace(id, input.map(String), w);
const answer = (id: ProblemId, ...input: (string | number)[]) => trace(id, ...input).answer;
const bits = (n: number) => bytes(n).replace(/B$/, "b/s");
/** The values column of the full estimates table (the last frame that shows it). */
const values = (id: ProblemId, ...input: (string | number)[]) => {
  const heads = w.sysDesigns[id as keyof typeof w.sysDesigns] as { heads: readonly string[] };
  const mats = trace(id, ...input).frames.flatMap((f) => (f.mat && f.mat.colHeads?.[0] === heads.heads[0] ? [f.mat] : []));
  return mats[mats.length - 1].vals.map((r) => r[0]);
};
/** A number between lo and hi, rounded to a couple of decimals so it reads back the same. */
const pick = (r: () => number, lo: number, hi: number) => Math.round((lo + r() * (hi - lo)) * 100) / 100 || lo;

test("design Google Drive", () => {
  assert.equal(
    answer("designGoogleDrive", 20, 200, 6, 2, 25),
    "Keep 54 PB in the blob store (after dedup, in three copies), take in 6.3 GB/s of uploads at the peak and hold 4 TB of metadata for 4 B files.",
  );
  // 8.64 M users adding a file a day is 100 uploads a second; 3 MB files are one chunk each, 9 MB ones three.
  assert.deepEqual(values("designGoogleDrive", 8.64, 100, 3, 1, 0), ["864 M", "2.6 PB", "864 M", "7.8 PB", "100/s", "900 MB/s", "864 GB"]);
  assert.deepEqual(values("designGoogleDrive", 8.64, 100, 9, 1, 50).slice(2, 4), ["2.6 B", "11.7 PB"]);
  const r = rng(41);
  for (let k = 0; k < 60; k++) {
    const [U, F, S, N, d] = [pick(r, 0.01, 2000), Math.round(pick(r, 1, 5000)), pick(r, 0.01, 50), pick(r, 0.01, 20), Math.round(pick(r, 0, 99))];
    const files = U * 1e6 * F;
    const kept = files * S * 1e6 * (1 - d / 100) * 3;
    const traffic = ((U * 1e6 * N) / 86400) * S * 1e6 * (1 - d / 100) * 3;
    assert.deepEqual(values("designGoogleDrive", U, F, S, N, d), [
      human(files),
      bytes(files * S * 1e6),
      human(files * Math.ceil(S / 4)),
      bytes(kept),
      `${human((U * 1e6 * N) / 86400)}/s`,
      `${bytes(traffic)}/s`,
      bytes(files * 1000),
    ]);
  }
  assert.throws(() => answer("designGoogleDrive", 20, 200, 6, 2, 100), /from 0 to 99/);
  assert.throws(() => answer("designGoogleDrive", "lots", 200, 6, 2, 25), /“lots”/);
});

test("design Netflix", () => {
  assert.equal(answer("designNetflix", 150, 1.5, 4, 40000), "Plan for 28.1 M streams at the peak needing 113 Tb/s, about 2.8 K edge servers of 40 Gb/s, and 216 TB of encoded video.");
  // 24 M hours a day is 1 M at once and 3 M at the peak; at 10 Mb/s that is 30 Tb/s, 750 edge servers.
  assert.deepEqual(values("designNetflix", 12, 2, 10, 1000), ["24 M", "1 M", "3 M", "30 Tb/s", "13.5 TB", "750"]);
  const r = rng(42);
  for (let k = 0; k < 60; k++) {
    const [S, H, B, C] = [pick(r, 0.01, 2000), pick(r, 0.01, 24), pick(r, 0.1, 100), Math.round(pick(r, 1, 1e6))];
    const peak = ((S * 1e6 * H) / 24) * 3;
    const band = peak * B * 1e6;
    assert.deepEqual(values("designNetflix", S, H, B, C), [
      human(S * 1e6 * H),
      human((S * 1e6 * H) / 24),
      human(peak),
      bits(band),
      bytes(C * 3600 * (B * 1e6 / 8) * 3),
      human(Math.ceil(band / 40e9)),
    ]);
  }
  assert.throws(() => answer("designNetflix", 150, 25, 4, 40000), /from 0.01 to 24/);
});

test("design the Uber API", () => {
  assert.equal(
    answer("designUberApi", 15, 400, 4),
    "Plan for 521 ride requests a second at the peak, 100 K location updates a second from drivers, and 625 K rides under way getting 156 K position pushes a second.",
  );
  // 8.64 M rides a day is 100 a second, 300 at the peak, 360 K under way; 600 K drivers every 3 s is 200 K updates.
  assert.deepEqual(values("designUberApi", 8.64, 600, 3), ["100/s", "300/s", "360 K", "200 K/s", "120 K/s", "20 MB/s"]);
  const t = trace("designUberApi", 15, 400, 4);
  // The endpoints all appear, and the state machine shows both the way through and the ways out.
  assert.ok(t.frames.some((f) => f.mat?.rowHeads?.includes("POST /rides/:id/accept")));
  assert.ok(t.frames.some((f) => f.arch?.boxes.some((b) => b.label === w.sysDesigns.designUberApi.state.cancelled && b.role === "min")));
  const r = rng(43);
  for (let k = 0; k < 60; k++) {
    const [R, D, T] = [pick(r, 0.001, 1000), pick(r, 0.01, 100000), Math.round(pick(r, 1, 60))];
    const peak = ((R * 1e6) / 86400) * 3;
    assert.equal(answer("designUberApi", R, D, T), `Plan for ${human(peak)} ride requests a second at the peak, ${human((D * 1e3) / T)} location updates a second from drivers, and ${human(peak * 1200)} rides under way getting ${human((peak * 1200) / T)} position pushes a second.`);
  }
  assert.throws(() => answer("designUberApi", 15, 400, 0), /from 1 to 60/);
});

test("design Tinder", () => {
  assert.equal(answer("designTinder", 60, 40, 120, 5), "Plan for 100 K swipes a second at the peak, 52.6 TB of swipes a year, 90 TB of photos and 30 GB/s of photo traffic at the peak.");
  // 10 M users, 50% daily, 172.8 swipes each: 864 M a day, 30 K a second at the peak.
  assert.deepEqual(values("designTinder", 10, 50, 172.8, 2), ["5 M", "864 M", "30 K/s", "15.8 TB", "6 TB", "9 GB/s"]);
  const r = rng(44);
  for (let k = 0; k < 60; k++) {
    const [U, A, S, P] = [pick(r, 0.01, 2000), Math.round(pick(r, 1, 100)), Math.round(pick(r, 1, 1000)), Math.round(pick(r, 1, 9))];
    const perDay = U * 1e6 * (A / 100) * S;
    const peak = (perDay / 86400) * 3;
    assert.equal(answer("designTinder", U, A, S, P), `Plan for ${human(peak)} swipes a second at the peak, ${bytes(perDay * 50 * 365)} of swipes a year, ${bytes(U * 1e6 * P * 300e3)} of photos and ${bytes(peak * 300e3)}/s of photo traffic at the peak.`);
  }
  assert.throws(() => answer("designTinder", 60, 40, 120, 10), /from 1 to 9/);
});

test("design Airbnb", () => {
  assert.equal(answer("designAirbnb", 6, 40, 500, 4), "Plan for 1.4 K searches a second at the peak against 17 bookings a second — 80 searches per booking — with 2.2 B calendar nights kept.");
  assert.deepEqual(values("designAirbnb", 1, 86.4, 86.4, 3), ["1 K/s", "3 K/s", "3/s", "1 K", "365 M", "259 K"]);
  // The clash: guest B's nights that A holds are refused.
  const clash = trace("designAirbnb", 6, 40, 500, 4).frames.find((f) => f.note === w.sysDesigns.designAirbnb.clash)!;
  assert.deepEqual(clash.mat!.roles[1], ["plain", "plain", "min", "min", "idle"]);
  const r = rng(45);
  for (let k = 0; k < 60; k++) {
    const [L, S, B, N] = [pick(r, 0.001, 100), pick(r, 0.001, 10000), pick(r, 0.001, 100000), Math.round(pick(r, 1, 30))];
    assert.equal(answer("designAirbnb", L, S, B, N), `Plan for ${human(((S * 1e6) / 86400) * 3)} searches a second at the peak against ${human(((B * 1e3) / 86400) * 3)} bookings a second — ${human((S * 1e6) / (B * 1e3))} searches per booking — with ${human(L * 1e6 * 365)} calendar nights kept.`);
  }
  assert.throws(() => answer("designAirbnb", 6, 40, 0, 4), /from 0.001 to 100000/);
});

test("design the Twitch API", () => {
  assert.equal(answer("designTwitchApi", 80, 3, 6, 0.5), "Take in 480 Gb/s from 80 K live streams, send out 18 Tb/s through the CDN, and make 938 K chat deliveries a second.");
  // 1 K streams, 100 K viewers: 100 per stream; 2 messages a minute each is 3.3 K a second, 333 K deliveries.
  assert.deepEqual(values("designTwitchApi", 1, 0.1, 5, 2), ["5 Gb/s", "100", "500 Gb/s", "50 K/s", "3.3 K/s", "333 K/s"]);
  assert.equal(answer("designTwitchApi", 1, 0.1, 5, 0), "Take in 5 Gb/s from 1 K live streams, send out 500 Gb/s through the CDN, and make 0 chat deliveries a second.");
  const r = rng(46);
  for (let k = 0; k < 60; k++) {
    const [N, V, B, C] = [pick(r, 0.001, 10000), pick(r, 0.001, 1000), pick(r, 0.1, 50), pick(r, 0, 60)];
    const per = (V * 1e6) / (N * 1e3);
    assert.equal(answer("designTwitchApi", N, V, B, C), `Take in ${bits(N * 1e3 * B * 1e6)} from ${human(N * 1e3)} live streams, send out ${bits(V * 1e6 * B * 1e6)} through the CDN, and make ${human(((V * 1e6 * C) / 60) * per)} chat deliveries a second.`);
  }
  assert.throws(() => answer("designTwitchApi", 80, 3, 60, 0.5), /from 0.1 to 50/);
  assert.throws(() => answer("designTwitchApi", 80, "", 6, 0.5), /“…”/);
});
