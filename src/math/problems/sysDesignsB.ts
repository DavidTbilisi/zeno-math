// Six more design questions, walked through the way designSlack is: requirements, estimates worked out from the
// numbers typed in, the architecture a part at a time with the reason for each, the main requests followed through
// it, and how it grows. Two are API questions (Uber, Twitch): they also lay out the entities and the endpoints.
import type { sysDesignsB } from "../../locales/problems/en/sysDesignsB";
import { done, fill, row, type ArchBox, type ArchLink, type Frame, type ProblemSubset, type Role } from "./core";
import { amount, bytes, DAY, human } from "./sys";
import { archAt, estimates } from "./sysDesigns";

type Est = [string, string, string][];
type Lit = { boxes: number[]; links: number[]; role?: Role };

/** Bits a second, written like sizes: 1.2 Gb/s. */
const bits = (n: number) => bytes(n).replace(/B$/, "b/s");

/** What it must do and what it should be like. */
const needs = (w: { reqNote: string; must: string; musts: readonly string[]; should: string; shoulds: readonly string[] }): Frame => ({
  note: w.reqNote,
  rows: [row(w.must, w.musts), row(w.should, w.shoulds)],
});

/** The estimates a row at a time, each note given the row's value. */
function estFrames(frames: Frame[], est: Est, heads: readonly string[], notes: readonly string[]) {
  est.forEach(([, v], i) => frames.push({ note: fill(notes[i], { v }), mat: estimates(est, heads, i) }));
}

/** The architecture a box at a time, each with the reason it is there. */
function buildFrames(frames: Frame[], boxes: ArchBox[], links: ArchLink[], why: readonly string[]) {
  boxes.forEach((_, i) => frames.push({ note: why[i], arch: archAt(boxes, links, i, { boxes: [i], role: "key" }) }));
}

/** A request followed through the finished architecture, a frame per part of the way. */
function flowFrames(frames: Frame[], boxes: ArchBox[], links: ArchLink[], notes: readonly string[], lits: Lit[]) {
  lits.forEach((lit, k) => frames.push({ note: notes[k], arch: archAt(boxes, links, boxes.length - 1, lit) }));
}

/** The endpoints so far as a table (path, who calls it, what it does), the newest ones lit. */
function apiTable(paths: readonly string[], who: readonly string[], what: readonly string[], heads: readonly string[], upTo: number, lit: number[]) {
  return {
    vals: paths.slice(0, upTo + 1).map((_, i) => [who[i], what[i]]),
    roles: paths.slice(0, upTo + 1).map((_, i): Role[] => (lit.includes(i) ? ["key", "key"] : ["plain", "plain"])),
    rowHeads: paths.slice(0, upTo + 1),
    colHeads: [...heads],
  };
}

/** The endpoints shown in groups: each group a frame with its note. */
function apiFrames(frames: Frame[], paths: readonly string[], who: readonly string[], what: readonly string[], heads: readonly string[], groups: number[][], notes: readonly string[]) {
  groups.forEach((g, k) => frames.push({ note: notes[k], mat: apiTable(paths, who, what, heads, Math.max(...g), g) }));
}

const UBER_PATHS = ["POST /rides", "GET /rides/:id", "WS /drivers/location", "POST /rides/:id/accept", "PATCH /rides/:id", "POST /rides/:id/cancel", "POST /rides/:id/rating"];
const UBER_FIELDS = [
  ["id", "name", "phone", "card"],
  ["id", "name", "car", "rating", "online"],
  ["id", "rider_id", "driver_id", "state", "pickup", "dropoff", "fare"],
  ["driver_id", "lat", "lng", "at"],
  ["id", "ride_id", "amount", "status"],
];
const TWITCH_PATHS = ["rtmp://ingest/:key", "GET /streams", "GET /channels/:id", "GET /hls/:id.m3u8", "POST /channels/:id/follow", "POST /channels/:id/subscriptions", "WS /chat/:channel"];
const TWITCH_FIELDS = [
  ["id", "name", "email"],
  ["id", "owner_id", "title", "game"],
  ["id", "channel_id", "started_at", "viewers"],
  ["id", "channel_id", "user_id", "text", "sent_at"],
  ["user_id", "channel_id", "since"],
  ["user_id", "channel_id", "tier", "renews_at"],
];

export const DESIGNS_B: ProblemSubset<"sysDesigns", keyof typeof sysDesignsB> = {
  designGoogleDrive: {
    level: 0,
    example: ["20", "200", "6", "2", "25"],
    solve: ([users, perUser, size, uploads, dup], w) => {
      const U = amount(users, 0.01, 2000, w.badNumber) * 1e6;
      const F = amount(perUser, 1, 100_000, w.badNumber);
      const S = amount(size, 0.01, 10_000, w.badNumber);
      const N = amount(uploads, 0.01, 1000, w.badNumber);
      const d = amount(dup, 0, 99, w.badNumber) / 100;
      const frames: Frame[] = [needs(w)];

      const files = U * F;
      const stored = files * S * 1e6;
      const per = Math.ceil(S / 4);
      const kept = stored * (1 - d) * 3;
      const upRate = (U * N) / DAY;
      const traffic = upRate * S * 1e6 * (1 - d) * 3;
      const meta = files * 1000;
      const est: Est = [
        [w.est.files, human(files), `${human(U)} × ${human(F)}`],
        [w.est.stored, bytes(stored), `× ${human(S)} MB`],
        [w.est.chunks, human(files * per), `× ⌈${human(S)} MB ÷ 4 MB⌉`],
        [w.est.kept, bytes(kept), `× ${human(100 - d * 100)}% × 3 ${w.est.copies}`],
        [w.est.uploads, `${human(upRate)}/s`, `${human(U)} × ${human(N)} ÷ 86 400 s`],
        [w.est.traffic, `${bytes(traffic)}/s`, `× ${human(S)} MB × ${human(100 - d * 100)}% × 3`],
        [w.est.meta, bytes(meta), `${human(files)} × 1 KB`],
      ];
      estFrames(frames, est, w.heads, w.estNote);

      const boxes: ArchBox[] = [
        { label: w.box.clients, col: 0, row: 1, kind: "client" },
        { label: w.box.lb, col: 1, row: 1, kind: "lb" },
        { label: w.box.api, col: 2, row: 1, kind: "server" },
        { label: w.box.meta, col: 4, row: 1, kind: "db", tag: w.box.metaTag },
        { label: w.box.blocks, col: 1, row: 3, kind: "server", tag: w.box.blocksTag },
        { label: w.box.blob, col: 4, row: 3, kind: "store", tag: w.box.blobTag },
        { label: w.box.cache, col: 3, row: 2, kind: "cache" },
        { label: w.box.queue, col: 3, row: 0, kind: "queue" },
        { label: w.box.notify, col: 2, row: 0, kind: "server" },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: "HTTPS" }, // 0
        { a: 1, b: 2 }, // 1
        { a: 2, b: 3, label: w.link.commit }, // 2
        { a: 0, b: 4, label: w.link.chunks }, // 3
        { a: 4, b: 5, label: w.link.newOnly }, // 4
        { a: 2, b: 6, label: w.link.read }, // 5
        { a: 6, b: 3, dashed: true }, // 6
        { a: 2, b: 7, label: w.link.change, dashed: true }, // 7
        { a: 7, b: 8, dashed: true }, // 8
        { a: 0, b: 8, label: w.link.poll, both: true }, // 9
      ];
      buildFrames(frames, boxes, links, w.why);
      flowFrames(frames, boxes, links, w.flow, [
        { boxes: [0, 1, 2, 3], links: [0, 1, 2] },
        { boxes: [0, 4, 5], links: [3, 4] },
        { boxes: [0, 1, 2, 3], links: [0, 1, 2], role: "key" },
        { boxes: [2, 7, 8, 0], links: [7, 8, 9] },
        { boxes: [0, 1, 2, 6, 4, 5], links: [0, 1, 5, 3, 4], role: "sorted" },
      ]);
      frames.push({ note: w.scale, arch: archAt(boxes, links, boxes.length - 1, { boxes: [3, 5], role: "pivot" }) });
      return done(frames, fill(w.answer, { k: bytes(kept), t: `${bytes(traffic)}/s`, m: bytes(meta), f: human(files) }));
    },
  },

  designNetflix: {
    level: 0,
    example: ["150", "1.5", "4", "40000"],
    solve: ([subs, hours, rate, catalogue], w) => {
      const S = amount(subs, 0.01, 2000, w.badNumber) * 1e6;
      const H = amount(hours, 0.01, 24, w.badNumber);
      const B = amount(rate, 0.1, 100, w.badNumber);
      const C = amount(catalogue, 1, 10_000_000, w.badNumber);
      const frames: Frame[] = [needs(w)];

      const perDay = S * H;
      const atOnce = perDay / 24;
      const peak = atOnce * 3;
      const band = peak * B * 1e6;
      const store = C * 3600 * ((B * 1e6) / 8) * 3;
      const edges = Math.ceil(band / 40e9);
      const est: Est = [
        [w.est.hours, human(perDay), `${human(S)} × ${human(H)} h`],
        [w.est.atOnce, human(atOnce), `÷ 24 h`],
        [w.est.peak, human(peak), `× 3`],
        [w.est.band, bits(band), `× ${human(B)} Mb/s`],
        [w.est.store, bytes(store), `${human(C)} h × 3600 s × ${human(B)} Mb/s ÷ 8 × 6 × ½`],
        [w.est.edges, human(edges), `÷ 40 Gb/s`],
      ];
      estFrames(frames, est, w.heads, w.estNote);

      const boxes: ArchBox[] = [
        { label: w.box.clients, col: 0, row: 1, kind: "client" },
        { label: w.box.lb, col: 1, row: 1, kind: "lb" },
        { label: w.box.api, col: 2, row: 1, kind: "server" },
        { label: w.box.catalogue, col: 4, row: 1, kind: "db" },
        { label: w.box.encoders, col: 4, row: 0, kind: "service", tag: w.box.encodersTag },
        { label: w.box.origin, col: 3, row: 0, kind: "store" },
        { label: w.box.cdn, col: 1, row: 0, kind: "cdn", tag: `${human(edges)} × 40 Gb/s` },
        { label: w.box.events, col: 2, row: 3, kind: "queue" },
        { label: w.box.history, col: 4, row: 3, kind: "db" },
        { label: w.box.recs, col: 3, row: 2, kind: "service" },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: "HTTPS" }, // 0
        { a: 1, b: 2 }, // 1
        { a: 2, b: 3, label: w.link.titles }, // 2
        { a: 4, b: 5, label: w.link.encoded }, // 3
        { a: 5, b: 6, label: w.link.fill, dashed: true }, // 4
        { a: 0, b: 6, label: w.link.video }, // 5
        { a: 2, b: 7, label: w.link.watched, dashed: true }, // 6
        { a: 7, b: 8, dashed: true }, // 7
        { a: 8, b: 9, label: w.link.train, dashed: true }, // 8
        { a: 2, b: 9, label: w.link.rows }, // 9
      ];
      buildFrames(frames, boxes, links, w.why);
      flowFrames(frames, boxes, links, w.flow, [
        { boxes: [4, 5, 6], links: [3, 4], role: "key" },
        { boxes: [0, 1, 2, 3], links: [0, 1, 2] },
        { boxes: [0, 6], links: [5] },
        { boxes: [0, 1, 2, 7, 8], links: [0, 1, 6, 7] },
        { boxes: [0, 1, 2, 9, 8], links: [0, 1, 9, 8], role: "sorted" },
      ]);
      frames.push({ note: w.scale, arch: archAt(boxes, links, boxes.length - 1, { boxes: [6], links: [5], role: "pivot" }) });
      return done(frames, fill(w.answer, { p: human(peak), b: bits(band), n: human(edges), c: bytes(store) }));
    },
  },

  designUberApi: {
    level: 0,
    example: ["15", "400", "4"],
    solve: ([rides, drivers, every], w) => {
      const R = amount(rides, 0.001, 1000, w.badNumber) * 1e6;
      const D = amount(drivers, 0.01, 100_000, w.badNumber) * 1e3;
      const T = amount(every, 1, 60, w.badNumber);
      const frames: Frame[] = [needs(w)];

      const perSec = R / DAY;
      const peak = perSec * 3;
      const under = peak * 1200;
      const updates = D / T;
      const pushes = under / T;
      const est: Est = [
        [w.est.requests, `${human(perSec)}/s`, `${human(R)} ÷ 86 400 s`],
        [w.est.peak, `${human(peak)}/s`, `× 3`],
        [w.est.under, human(under), `× 1200 s (${w.est.ride})`],
        [w.est.updates, `${human(updates)}/s`, `${human(D)} ÷ ${human(T)} s`],
        [w.est.pushes, `${human(pushes)}/s`, `${human(under)} ÷ ${human(T)} s`],
        [w.est.data, `${bytes(updates * 100)}/s`, `× 100 B`],
      ];
      estFrames(frames, est, w.heads, w.estNote);

      // The entities, then the endpoints in groups.
      const ents = [w.ent.rider, w.ent.driver, w.ent.ride, w.ent.location, w.ent.payment];
      frames.push({ note: w.entNote, rows: ents.map((e, i) => row(e, UBER_FIELDS[i], (j) => (j === 0 ? "key" : "plain"))) });
      const who = [w.who.rider, w.who.rider, w.who.driver, w.who.driver, w.who.driver, w.who.both, w.who.both];
      apiFrames(frames, UBER_PATHS, who, w.api, w.apiHeads, [[0, 1], [2, 3], [4], [5, 6]], w.apiNote);

      // The ride's states: the usual way through, then the ways out.
      const st = w.state;
      const states: ArchBox[] = [
        { label: st.requested, col: 0, row: 0, kind: "service" },
        { label: st.accepted, col: 1, row: 0, kind: "service" },
        { label: st.arrived, col: 2, row: 0, kind: "service" },
        { label: st.onTrip, col: 3, row: 0, kind: "service" },
        { label: st.completed, col: 4, row: 0, kind: "service" },
        { label: st.cancelled, col: 1, row: 1, kind: "service" },
      ];
      const moves: ArchLink[] = [
        { a: 0, b: 1, label: st.accept },
        { a: 1, b: 2, label: st.arrive },
        { a: 2, b: 3, label: st.start },
        { a: 3, b: 4, label: st.complete },
        { a: 0, b: 5, label: st.cancel },
        { a: 1, b: 5, label: st.cancel },
        { a: 2, b: 5, label: st.cancel },
      ];
      const lightStates = (hot: number[], hotMoves: number[], role: Role) => ({
        boxes: states.map((b, i) => (hot.includes(i) ? { ...b, role } : b)),
        links: moves.map((l, i) => (hotMoves.includes(i) ? { ...l, role } : l)),
      });
      frames.push({ note: w.stateNote[0], arch: lightStates([0, 1, 2, 3, 4], [0, 1, 2, 3], "sorted") });
      frames.push({ note: w.stateNote[1], arch: lightStates([5], [4, 5, 6], "min") });

      const boxes: ArchBox[] = [
        { label: w.box.rider, col: 0, row: 1, kind: "client" },
        { label: w.box.driver, col: 0, row: 2, kind: "client" },
        { label: w.box.gateway, col: 1, row: 1, kind: "lb" },
        { label: w.box.rides, col: 2, row: 1, kind: "server" },
        { label: w.box.db, col: 4, row: 1, kind: "db", tag: w.box.dbTag },
        { label: w.box.ws, col: 1, row: 2, kind: "server", tag: `${human(Math.ceil(D / 50_000))} × 50 K` },
        { label: w.box.location, col: 2, row: 2, kind: "service", tag: w.box.locationTag },
        { label: w.box.payments, col: 3, row: 0, kind: "service" },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 2, label: "HTTPS" }, // 0
        { a: 1, b: 2, label: "HTTPS" }, // 1
        { a: 2, b: 3 }, // 2
        { a: 3, b: 4, label: w.link.rides }, // 3
        { a: 1, b: 5, label: "WebSocket", both: true }, // 4
        { a: 5, b: 6, label: w.link.position, both: true }, // 5
        { a: 3, b: 6, label: w.link.nearby }, // 6
        { a: 3, b: 5, label: w.link.offer, dashed: true }, // 7
        { a: 5, b: 0, label: w.link.push, dashed: true }, // 8
        { a: 3, b: 7, label: w.link.charge }, // 9
      ];
      buildFrames(frames, boxes, links, w.why);
      flowFrames(frames, boxes, links, w.flow, [
        { boxes: [0, 2, 3, 4, 6], links: [0, 2, 3, 6] },
        { boxes: [3, 5, 1, 2], links: [7, 4, 1, 2] },
        { boxes: [1, 5, 6, 0], links: [4, 5, 8], role: "key" },
        { boxes: [1, 2, 3, 4, 7], links: [1, 2, 3, 9], role: "sorted" },
      ]);
      frames.push({ note: fill(w.scale, { v: `${human((D + under) / T)}/s` }), arch: archAt(boxes, links, boxes.length - 1, { boxes: [5, 6], role: "pivot" }) });
      return done(frames, fill(w.answer, { p: human(peak), l: human(updates), r: human(under), u: human(pushes) }));
    },
  },

  designTinder: {
    level: 0,
    example: ["60", "40", "120", "5"],
    solve: ([users, active, swipes, photos], w) => {
      const U = amount(users, 0.01, 2000, w.badNumber) * 1e6;
      const A = amount(active, 1, 100, w.badNumber) / 100;
      const S = amount(swipes, 1, 10_000, w.badNumber);
      const P = amount(photos, 1, 9, w.badNumber);
      const frames: Frame[] = [needs(w)];

      const daily = U * A;
      const perDay = daily * S;
      const peak = (perDay / DAY) * 3;
      const year = perDay * 50 * 365;
      const photoStore = U * P * 300e3;
      const traffic = peak * 300e3;
      const est: Est = [
        [w.est.daily, human(daily), `${human(U)} × ${human(A * 100)}%`],
        [w.est.swipes, human(perDay), `× ${human(S)}`],
        [w.est.peak, `${human(peak)}/s`, `÷ 86 400 s × 3`],
        [w.est.year, bytes(year), `× 50 B × 365`],
        [w.est.photos, bytes(photoStore), `${human(U)} × ${human(P)} × 300 KB`],
        [w.est.traffic, `${bytes(traffic)}/s`, `${human(peak)}/s × 300 KB`],
      ];
      estFrames(frames, est, w.heads, w.estNote);

      const boxes: ArchBox[] = [
        { label: w.box.clients, col: 0, row: 1, kind: "client" },
        { label: w.box.lb, col: 1, row: 1, kind: "lb" },
        { label: w.box.api, col: 2, row: 1, kind: "server" },
        { label: w.box.profiles, col: 4, row: 1, kind: "db", tag: w.box.profilesTag },
        { label: w.box.photos, col: 4, row: 3, kind: "store", tag: w.box.photosTag },
        { label: w.box.cdn, col: 1, row: 3, kind: "cdn" },
        { label: w.box.geo, col: 3, row: 0, kind: "cache", tag: w.box.geoTag },
        { label: w.box.swipes, col: 4, row: 2, kind: "db", tag: w.box.swipesTag },
        { label: w.box.queue, col: 3, row: 2, kind: "queue" },
        { label: w.box.push, col: 2, row: 2, kind: "service" },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: "HTTPS" }, // 0
        { a: 1, b: 2 }, // 1
        { a: 2, b: 3, label: w.link.profile }, // 2
        { a: 2, b: 6, label: w.link.nearby }, // 3
        { a: 2, b: 7, label: w.link.swipe }, // 4
        { a: 2, b: 8, label: w.link.match, dashed: true }, // 5
        { a: 8, b: 9, dashed: true }, // 6
        { a: 9, b: 0, label: w.link.push, dashed: true }, // 7
        { a: 0, b: 5, label: w.link.photos }, // 8
        { a: 5, b: 4, label: w.link.miss, dashed: true }, // 9
      ];
      buildFrames(frames, boxes, links, w.why);
      flowFrames(frames, boxes, links, w.flow, [
        { boxes: [0, 1, 2, 6, 3], links: [0, 1, 3, 2] },
        { boxes: [0, 5, 4], links: [8, 9] },
        { boxes: [0, 1, 2, 7], links: [0, 1, 4], role: "key" },
        { boxes: [2, 8, 9, 0], links: [5, 6, 7], role: "sorted" },
      ]);
      frames.push({ note: w.scale, arch: archAt(boxes, links, boxes.length - 1, { boxes: [6, 7], role: "pivot" }) });
      return done(frames, fill(w.answer, { p: human(peak), y: bytes(year), s: bytes(photoStore), t: `${bytes(traffic)}/s` }));
    },
  },

  designAirbnb: {
    level: 0,
    example: ["6", "40", "500", "4"],
    solve: ([listings, searches, bookings, nights], w) => {
      const L = amount(listings, 0.001, 100, w.badNumber) * 1e6;
      const S = amount(searches, 0.001, 10_000, w.badNumber) * 1e6;
      const B = amount(bookings, 0.001, 100_000, w.badNumber) * 1e3;
      const N = amount(nights, 1, 365, w.badNumber);
      const frames: Frame[] = [needs(w)];

      const perSec = S / DAY;
      const peak = perSec * 3;
      const bookPeak = (B / DAY) * 3;
      const ratio = S / B;
      const calendar = L * 365;
      const booked = B * N;
      const est: Est = [
        [w.est.searches, `${human(perSec)}/s`, `${human(S)} ÷ 86 400 s`],
        [w.est.peak, `${human(peak)}/s`, `× 3`],
        [w.est.bookings, `${human(bookPeak)}/s`, `${human(B)} ÷ 86 400 s × 3`],
        [w.est.ratio, human(ratio), `${human(S)} ÷ ${human(B)}`],
        [w.est.calendar, human(calendar), `${human(L)} × 365`],
        [w.est.booked, human(booked), `${human(B)} × ${human(N)}`],
      ];
      estFrames(frames, est, w.heads, w.estNote);

      const boxes: ArchBox[] = [
        { label: w.box.clients, col: 0, row: 1, kind: "client" },
        { label: w.box.lb, col: 1, row: 1, kind: "lb" },
        { label: w.box.search, col: 2, row: 0, kind: "server" },
        { label: w.box.index, col: 4, row: 0, kind: "db", tag: w.box.indexTag },
        { label: w.box.listing, col: 2, row: 1, kind: "server" },
        { label: w.box.listings, col: 4, row: 1, kind: "db" },
        { label: w.box.booking, col: 2, row: 2, kind: "server" },
        { label: w.box.bookings, col: 4, row: 2, kind: "db", tag: w.box.bookingsTag },
        { label: w.box.payments, col: 3, row: 3, kind: "service" },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: "HTTPS" }, // 0
        { a: 1, b: 2, label: w.link.search }, // 1
        { a: 2, b: 3, label: w.link.query }, // 2
        { a: 1, b: 4, label: w.link.list }, // 3
        { a: 4, b: 5, label: w.link.write }, // 4
        { a: 5, b: 3, label: w.link.sync, dashed: true }, // 5
        { a: 1, b: 6, label: w.link.book }, // 6
        { a: 6, b: 7, label: w.link.tx }, // 7
        { a: 6, b: 8, label: w.link.charge }, // 8
        { a: 6, b: 3, label: w.link.dates, dashed: true }, // 9
      ];
      buildFrames(frames, boxes, links, w.why);
      flowFrames(frames, boxes, links, w.flow, [
        { boxes: [0, 1, 4, 5, 3], links: [0, 3, 4, 5], role: "key" },
        { boxes: [0, 1, 2, 3], links: [0, 1, 2] },
        { boxes: [0, 1, 6, 7], links: [0, 6, 7] },
      ]);
      // Two guests after the same nights: the first holds the lock, the second finds them taken.
      const r = (who: string, mine: number[]) => w.nights.map((_, i) => (mine.includes(i) ? who : "·"));
      frames.push({
        note: w.clash,
        mat: {
          vals: [r("A", [1, 2, 3]), r("B", [2, 3, 4])],
          roles: [w.nights.map((_, i): Role => ([1, 2, 3].includes(i) ? "sorted" : "plain")), w.nights.map((_, i): Role => ([2, 3].includes(i) ? "min" : i === 4 ? "idle" : "plain"))],
          rowHeads: [w.guestA, w.guestB],
          colHeads: [...w.nights],
        },
      });
      flowFrames(frames, boxes, links, [w.pay], [{ boxes: [6, 8, 3], links: [8, 9], role: "sorted" }]);
      frames.push({ note: w.scale, arch: archAt(boxes, links, boxes.length - 1, { boxes: [2, 3], role: "pivot" }) });
      return done(frames, fill(w.answer, { s: human(peak), b: human(bookPeak), r: human(ratio), c: human(calendar) }));
    },
  },

  designTwitchApi: {
    level: 0,
    example: ["80", "3", "6", "0.5"],
    solve: ([streams, viewers, rate, chat], w) => {
      const N = amount(streams, 0.001, 10_000, w.badNumber) * 1e3;
      const V = amount(viewers, 0.001, 1000, w.badNumber) * 1e6;
      const B = amount(rate, 0.1, 50, w.badNumber);
      const C = amount(chat, 0, 60, w.badNumber);
      const frames: Frame[] = [needs(w)];

      const ingest = N * B * 1e6;
      const per = V / N;
      const out = V * B * 1e6;
      const segs = V / 2;
      const msgs = (V * C) / 60;
      const deliveries = msgs * per;
      const est: Est = [
        [w.est.ingest, bits(ingest), `${human(N)} × ${human(B)} Mb/s`],
        [w.est.per, human(per), `${human(V)} ÷ ${human(N)}`],
        [w.est.out, bits(out), `${human(V)} × ${human(B)} Mb/s`],
        [w.est.segs, `${human(segs)}/s`, `÷ 2 s`],
        [w.est.msgs, `${human(msgs)}/s`, `${human(V)} × ${human(C)} ÷ 60 s`],
        [w.est.deliveries, `${human(deliveries)}/s`, `× ${human(per)}`],
      ];
      estFrames(frames, est, w.heads, w.estNote);

      const ents = [w.ent.user, w.ent.channel, w.ent.stream, w.ent.message, w.ent.follow, w.ent.subscription];
      frames.push({ note: w.entNote, rows: ents.map((e, i) => row(e, TWITCH_FIELDS[i], (j) => (j === 0 ? "key" : "plain"))) });
      const who = [w.who.streamer, w.who.viewer, w.who.viewer, w.who.viewer, w.who.viewer, w.who.viewer, w.who.both];
      apiFrames(frames, TWITCH_PATHS, who, w.api, w.apiHeads, [[0], [1, 2, 3], [4, 5], [6]], w.apiNote);

      const boxes: ArchBox[] = [
        { label: w.box.streamer, col: 0, row: 0, kind: "client" },
        { label: w.box.ingest, col: 1, row: 0, kind: "server", tag: "RTMP" },
        { label: w.box.transcode, col: 2, row: 0, kind: "service", tag: w.box.transcodeTag },
        { label: w.box.origin, col: 3, row: 0, kind: "store", tag: w.box.originTag },
        { label: w.box.cdn, col: 3, row: 1, kind: "cdn" },
        { label: w.box.viewers, col: 0, row: 1, kind: "client" },
        { label: w.box.api, col: 2, row: 2, kind: "server" },
        { label: w.box.db, col: 4, row: 2, kind: "db" },
        { label: w.box.chat, col: 1, row: 3, kind: "server", tag: "WebSocket" },
        { label: w.box.pubsub, col: 2, row: 3, kind: "queue" },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: "RTMP" }, // 0
        { a: 1, b: 2 }, // 1
        { a: 2, b: 3, label: w.link.segments }, // 2
        { a: 4, b: 3, label: w.link.pull, dashed: true }, // 3
        { a: 5, b: 4, label: "HLS" }, // 4
        { a: 5, b: 6, label: "HTTPS" }, // 5
        { a: 6, b: 7 }, // 6
        { a: 5, b: 8, label: w.link.chat, both: true }, // 7
        { a: 8, b: 9, label: w.link.publish, dashed: true, both: true }, // 8
      ];
      buildFrames(frames, boxes, links, w.why);
      flowFrames(frames, boxes, links, w.flow, [
        { boxes: [0, 1, 2, 3], links: [0, 1, 2], role: "key" },
        { boxes: [5, 6, 7], links: [5, 6] },
        { boxes: [5, 4, 3], links: [4, 3], role: "sorted" },
        { boxes: [5, 8, 9], links: [7, 8] },
      ]);
      frames.push({ note: w.scale, arch: archAt(boxes, links, boxes.length - 1, { boxes: [2, 4, 9], role: "pivot" }) });
      return done(frames, fill(w.answer, { i: bits(ingest), n: human(N), o: bits(out), d: human(deliveries) }));
    },
  },
};
