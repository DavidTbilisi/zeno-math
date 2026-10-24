// Six system design questions walked through the way an interview goes, on the model of Slack: what the system must
// do, estimates worked out from the numbers typed in, the architecture built a part at a time with the reason for
// each part, the main requests followed through it, and how it grows. Deploying code to a fleet, AlgoExpert itself, a
// stockbroker, Amazon's shop, the Reddit API (entities and endpoints first) and Facebook's news feed (push or pull).
import type { sysDesignsA } from "../../locales/problems/en/sysDesignsA";
import { cells, done, fill, int, row, type ArchBox, type ArchLink, type Frame, type ProblemSubset, type Role } from "./core";
import { amount, bytes, DAY, human } from "./sys";
import { archAt, estimates } from "./sysDesigns";

/** What every walkthrough's words have: the requirements, the estimates' notes and the reason for each box. */
type Walk = {
  reqNote: string;
  must: string;
  musts: readonly string[];
  should: string;
  shoulds: readonly string[];
  heads: readonly string[];
  estNote: readonly string[];
};
type Est = [string, string, string][];

/** The requirements, then the estimates one row at a time. */
function start(w: Walk, est: Est): Frame[] {
  const frames: Frame[] = [{ note: w.reqNote, rows: [row(w.must, w.musts), row(w.should, w.shoulds)] }];
  est.forEach((r, i) => frames.push({ note: fill(w.estNote[i], { v: r[1] }), mat: estimates(est, w.heads, i) }));
  return frames;
}

/** The architecture a box at a time, each with its reason. */
const build = (boxes: ArchBox[], links: ArchLink[], why: readonly string[]): Frame[] =>
  boxes.map((_, i) => ({ note: why[i], arch: archAt(boxes, links, i, { boxes: [i], role: "key" }) }));

/** A request followed through the whole architecture: the boxes and links it has reached at each step. */
type Step = [note: string, boxes: number[], links: number[], role?: Role];
const follow = (boxes: ArchBox[], links: ArchLink[], steps: Step[]): Frame[] =>
  steps.map(([note, b, l, role]) => ({ note, arch: archAt(boxes, links, boxes.length - 1, { boxes: b, links: l, role }) }));

/** A rate written as one: “1.2 K/s”. */
const rate = (x: number) => `${human(x)}/s`;
/** The seconds a market is open: six and a half hours. */
const TRADING = 23_400;

/** The Reddit API's entities with their fields, and its endpoints in groups (fields and paths are code, not words). */
const ENTITIES = [
  ["id", "name", "karma", "created_at"],
  ["id", "name", "description", "owner_id"],
  ["id", "subreddit_id", "author_id", "title", "body", "score", "created_at"],
  ["id", "post_id", "parent_id", "author_id", "body", "score"],
  ["user_id", "item_id", "dir"],
  ["id", "item_id", "giver_id", "kind"],
] as const;
const ENDPOINTS: [method: string, path: string, params: string, group: number][] = [
  ["POST", "/r/:sub/posts", "title, body", 0],
  ["GET", "/r/:sub/posts", "sort, after, limit", 0],
  ["GET", "/posts/:id", "—", 1],
  ["POST", "/posts/:id/comments", "body, parent_id", 2],
  ["GET", "/posts/:id/comments", "sort, after, limit", 2],
  ["PUT", "/posts/:id/vote", "dir = 1, 0, −1", 3],
  ["PUT", "/comments/:id/vote", "dir = 1, 0, −1", 3],
  ["POST", "/posts/:id/awards", "award", 4],
  ["POST", "/r/:sub/subscribe", "—", 4],
];
/** Follower counts of a few made-up accounts, from an ordinary user to a pop star, to show where the threshold falls. */
const FOLLOWERS = [150, 900, 5_000, 40_000, 2_000_000, 100_000_000];

export const DESIGNS_A: ProblemSubset<"sysDesigns", keyof typeof sysDesignsA> = {
  designCodeDeploymentSystem: {
    level: 0,
    example: ["2000", "15", "500", "200", "8"],
    solve: ([builds, minutes, size, machines, regions], w, e) => {
      const B = amount(builds, 1, 1_000_000, w.badNumber);
      const T = amount(minutes, 0.5, 600, w.badNumber);
      const S = amount(size, 1, 100_000, w.badNumber) * 1e6;
      const M = amount(machines, 0.1, 10_000, w.badNumber) * 1e3;
      const R = int(regions, e, 1, 50);

      const peakHour = (B / 24) * 3;
      const workers = Math.ceil((peakHour * T) / 60);
      const daily = B * S;
      const perRegion = M / R;
      const rounds = Math.max(1, Math.ceil(Math.log2(perRegion)));
      const est: Est = [
        [w.est.builds, human(peakHour), `${human(B)} ÷ 24 × 3`],
        [w.est.workers, human(workers), `× ${human(T)} min ÷ 60`],
        [w.est.daily, bytes(daily), `${human(B)} × ${bytes(S)}`],
        [w.est.year, bytes(daily * 365), "× 365"],
        [w.est.perRegion, human(perRegion), `${human(M)} ÷ ${R}`],
        [w.est.perDeploy, bytes(S * M), `${bytes(S)} × ${human(M)}`],
        [w.est.rounds, String(rounds), `log₂ ${human(perRegion)}`],
      ];
      const frames = start(w, est);

      const boxes: ArchBox[] = [
        { label: w.box.engineers, col: 0, row: 1, kind: "client" },
        { label: w.box.api, col: 1, row: 1, kind: "server" },
        { label: w.box.queue, col: 2, row: 0, kind: "queue", tag: w.box.queueTag },
        { label: w.box.workers, col: 3, row: 0, kind: "server", tag: `${human(workers)} × ${human(T)} min` },
        { label: w.box.store, col: 4, row: 0, kind: "store" },
        { label: w.box.regional, col: 4, row: 2, kind: "store", tag: `× ${R}` },
        { label: w.box.goal, col: 2, row: 2, kind: "db", tag: w.box.goalTag },
        { label: w.box.machines, col: 3, row: 2, kind: "server", tag: human(M) },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: w.link.build }, // 0
        { a: 1, b: 2, label: w.link.enqueue }, // 1
        { a: 3, b: 2, label: w.link.take }, // 2
        { a: 3, b: 4, label: w.link.upload }, // 3
        { a: 4, b: 5, label: w.link.replicate, dashed: true }, // 4
        { a: 1, b: 6, label: w.link.deploy }, // 5
        { a: 7, b: 6, label: w.link.poll }, // 6
        { a: 7, b: 5, label: w.link.fetch, both: true }, // 7
      ];
      frames.push(...build(boxes, links, w.why));
      frames.push(
        ...follow(boxes, links, [
          [w.buildFlow[0], [0, 1], [0]],
          [w.buildFlow[1], [0, 1, 2], [0, 1]],
          [w.buildFlow[2], [0, 1, 2, 3], [0, 1, 2]],
          [w.buildFlow[3], [0, 1, 2, 3, 4], [0, 1, 2, 3]],
          [w.buildFlow[4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4], "sorted"],
          [w.deployFlow[0], [0, 1, 6], [0, 5]],
          [w.deployFlow[1], [0, 1, 6, 7], [0, 5, 6]],
          [w.deployFlow[2], [0, 1, 6, 7, 5], [0, 5, 6, 7], "sorted"],
          [w.scale, [3, 7], [], "pivot"],
        ]),
      );
      return done(frames, fill(w.answer, { w: human(workers), s: bytes(daily), d: bytes(S * M), r: R, k: rounds }));
    },
  },

  designAlgoExpert: {
    level: 0,
    example: ["200", "15", "3", "9"],
    solve: ([users, runs, seconds, languages], w, e) => {
      const U = amount(users, 1, 100_000, w.badNumber) * 1e3;
      const R = amount(runs, 0.1, 1000, w.badNumber);
      const T = amount(seconds, 0.1, 60, w.badNumber);
      const L = int(languages, e, 1, 30);

      const perDay = U * R;
      const peak = (3 * perDay) / DAY;
      const busy = peak * T;
      const warm = Math.ceil(2 * busy);
      const perLang = Math.ceil(warm / L);
      const est: Est = [
        [w.est.runs, human(perDay), `${human(U)} × ${human(R)}`],
        [w.est.perSec, rate(perDay / DAY), "÷ 86 400 s"],
        [w.est.peak, rate(peak), "× 3"],
        [w.est.busy, human(busy), `× ${human(T)} s`],
        [w.est.warm, human(warm), "× 2"],
        [w.est.perLang, human(perLang), `÷ ${L}`],
      ];
      const frames = start(w, est);

      const boxes: ArchBox[] = [
        { label: w.box.users, col: 0, row: 1, kind: "client" },
        { label: w.box.cdn, col: 1, row: 0, kind: "cdn" },
        { label: w.box.lb, col: 1, row: 1, kind: "lb" },
        { label: w.box.api, col: 2, row: 1, kind: "server" },
        { label: w.box.cache, col: 3, row: 0, kind: "cache" },
        { label: w.box.db, col: 4, row: 1, kind: "db", tag: w.box.dbTag },
        { label: w.box.runners, col: 3, row: 2, kind: "server" },
        { label: w.box.sandboxes, col: 4, row: 2, kind: "service", tag: `${human(warm)} = ${L} × ${human(perLang)}` },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: w.link.page }, // 0
        { a: 0, b: 2, label: "HTTPS" }, // 1
        { a: 2, b: 3 }, // 2
        { a: 3, b: 4, label: w.link.read }, // 3
        { a: 4, b: 5, dashed: true }, // 4
        { a: 3, b: 5, label: w.link.save }, // 5
        { a: 3, b: 6, label: w.link.run }, // 6
        { a: 6, b: 7, label: w.link.exec }, // 7
      ];
      frames.push(...build(boxes, links, w.why));
      frames.push(
        ...follow(boxes, links, [
          [w.openFlow[0], [0, 1], [0]],
          [w.openFlow[1], [0, 2, 3, 4], [1, 2, 3], "sorted"],
          [w.runFlow[0], [0, 2, 3], [1, 2]],
          [w.runFlow[1], [0, 2, 3, 6], [1, 2, 6]],
          [w.runFlow[2], [0, 2, 3, 6, 7], [1, 2, 6, 7]],
          [w.runFlow[3], [3, 5], [5], "sorted"],
          [w.scale, [6, 7], [], "pivot"],
        ]),
      );
      return done(frames, fill(w.answer, { p: human(peak), b: human(busy), k: human(warm), l: human(perLang), n: L }));
    },
  },

  designStockbroker: {
    level: 0,
    example: ["2", "3", "50000", "15"],
    solve: ([users, orders, ticks, online], w) => {
      const U = amount(users, 0.001, 1000, w.badNumber) * 1e6;
      const O = amount(orders, 0.01, 1000, w.badNumber);
      const Q = amount(ticks, 1, 10_000_000, w.badNumber);
      const P = amount(online, 0.1, 100, w.badNumber);

      const perDay = U * O;
      const peak = (5 * perDay) / TRADING;
      const ledger = 2 * peak;
      const tickDay = Q * TRADING;
      const on = (U * P) / 100;
      const pushes = on * 10;
      const est: Est = [
        [w.est.orders, human(perDay), `${human(U)} × ${human(O)}`],
        [w.est.perSec, rate(perDay / TRADING), "÷ 23 400 s"],
        [w.est.open, rate(peak), "× 5"],
        [w.est.ledger, rate(ledger), "× 2"],
        [w.est.ticks, human(tickDay), `${rate(Q)} × 23 400 s`],
        [w.est.online, human(on), `${human(U)} × ${human(P)}%`],
        [w.est.pushes, rate(pushes), `× 10 ${w.est.stocks}`],
      ];
      const frames = start(w, est);

      const boxes: ArchBox[] = [
        { label: w.box.apps, col: 0, row: 1, kind: "client" },
        { label: w.box.lb, col: 1, row: 1, kind: "lb" },
        { label: w.box.orders, col: 2, row: 1, kind: "server" },
        { label: w.box.accounts, col: 2, row: 2, kind: "db", tag: w.box.accountsTag },
        { label: w.box.queue, col: 3, row: 1, kind: "queue" },
        { label: w.box.gateway, col: 4, row: 1, kind: "server", tag: "FIX" },
        { label: w.box.exchange, col: 4, row: 0, kind: "service" },
        { label: w.box.fills, col: 3, row: 2, kind: "queue" },
        { label: w.box.quotes, col: 2, row: 0, kind: "server", tag: rate(pushes) },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: "HTTPS" }, // 0
        { a: 1, b: 2 }, // 1
        { a: 2, b: 3, label: w.link.reserve }, // 2
        { a: 2, b: 4, label: w.link.send, dashed: true }, // 3
        { a: 4, b: 5, dashed: true }, // 4
        { a: 5, b: 6, label: "FIX", both: true }, // 5
        { a: 5, b: 7, label: w.link.fill, dashed: true }, // 6
        { a: 7, b: 2, dashed: true }, // 7
        { a: 6, b: 8, label: w.link.ticks, dashed: true }, // 8
        { a: 8, b: 0, label: w.link.push, dashed: true }, // 9
      ];
      frames.push(...build(boxes, links, w.why));
      frames.push(
        ...follow(boxes, links, [
          [w.placeFlow[0], [0, 1], [0]],
          [w.placeFlow[1], [0, 1, 2], [0, 1]],
          [w.placeFlow[2], [0, 1, 2, 3], [0, 1, 2]],
          [w.placeFlow[3], [0, 1, 2, 3, 4], [0, 1, 2, 3]],
          [w.placeFlow[4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4]],
          [w.placeFlow[5], [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5]],
          [w.fillFlow[0], [6, 5, 7], [5, 6]],
          [w.fillFlow[1], [6, 5, 7, 2, 3], [5, 6, 7, 2], "sorted"],
          [w.quoteFlow, [6, 8, 0], [8, 9]],
          [w.scale, [3, 4, 7], [], "pivot"],
        ]),
      );
      return done(frames, fill(w.answer, { p: human(peak), l: human(ledger), t: human(tickDay), q: human(pushes) }));
    },
  },

  designAmazon: {
    level: 0,
    example: ["100", "30", "5", "300"],
    solve: ([users, views, orders, products], w) => {
      const U = amount(users, 0.01, 5000, w.badNumber) * 1e6;
      const V = amount(views, 1, 1000, w.badNumber);
      const O = amount(orders, 0.001, 1000, w.badNumber) * 1e6;
      const P = amount(products, 0.001, 10_000, w.badNumber) * 1e6;

      const perDay = U * V;
      const peak = (3 * perDay) / DAY;
      const orderPeak = (3 * O) / DAY;
      const perOrder = perDay / O;
      const catalogue = P * 10e3;
      const year = O * 365 * 5e3;
      const est: Est = [
        [w.est.views, human(perDay), `${human(U)} × ${human(V)}`],
        [w.est.perSec, rate(perDay / DAY), "÷ 86 400 s"],
        [w.est.peak, rate(peak), "× 3"],
        [w.est.orders, rate(orderPeak), `${human(O)} ÷ 86 400 s × 3`],
        [w.est.perOrder, human(perOrder), `${human(perDay)} ÷ ${human(O)}`],
        [w.est.catalogue, bytes(catalogue), `${human(P)} × 10 KB`],
        [w.est.ordersYear, bytes(year), `${human(O)} × 365 × 5 KB`],
      ];
      const frames = start(w, est);

      const boxes: ArchBox[] = [
        { label: w.box.shoppers, col: 0, row: 1, kind: "client" },
        { label: w.box.cdn, col: 1, row: 0, kind: "cdn" },
        { label: w.box.lb, col: 1, row: 1, kind: "lb" },
        { label: w.box.catalogue, col: 2, row: 1, kind: "service" },
        { label: w.box.search, col: 3, row: 0, kind: "store" },
        { label: w.box.products, col: 4, row: 1, kind: "db", tag: w.box.productsTag },
        { label: w.box.checkout, col: 2, row: 2, kind: "service" },
        { label: w.box.carts, col: 3, row: 2, kind: "store", tag: w.box.cartsTag },
        { label: w.box.orders, col: 3, row: 3, kind: "db", tag: w.box.ordersTag },
        { label: w.box.payments, col: 4, row: 3, kind: "service" },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: w.link.static }, // 0
        { a: 0, b: 2, label: "HTTPS" }, // 1
        { a: 2, b: 3 }, // 2
        { a: 3, b: 4, label: w.link.search }, // 3
        { a: 3, b: 5, label: w.link.read }, // 4
        { a: 5, b: 4, label: w.link.index, dashed: true }, // 5
        { a: 2, b: 6 }, // 6
        { a: 6, b: 7, label: w.link.cart }, // 7
        { a: 6, b: 8, label: w.link.reserve }, // 8
        { a: 6, b: 9, label: w.link.pay }, // 9
      ];
      frames.push(...build(boxes, links, w.why));
      frames.push(
        ...follow(boxes, links, [
          [w.browseFlow[0], [0, 1], [0]],
          [w.browseFlow[1], [0, 2, 3, 4], [1, 2, 3]],
          [w.browseFlow[2], [0, 2, 3, 5], [1, 2, 4], "sorted"],
          [w.cartFlow, [0, 2, 6, 7], [1, 6, 7]],
          [w.checkoutFlow[0], [6, 8], [8]],
          [w.checkoutFlow[1], [6, 8, 9], [8, 9]],
          [w.checkoutFlow[2], [6, 8], [8], "sorted"],
          [w.scale, [5, 8], [], "pivot"],
        ]),
      );
      return done(frames, fill(w.answer, { r: human(peak), o: human(orderPeak), n: human(perOrder), c: bytes(catalogue), y: bytes(year) }));
    },
  },

  designRedditApi: {
    level: 0,
    example: ["800", "60", "40", "25"],
    solve: ([posts, comments, votes, page], w, e) => {
      const P = amount(posts, 0.001, 100_000, w.badNumber) * 1e3;
      const C = amount(comments, 0, 10_000, w.badNumber);
      const V = amount(votes, 0, 100_000, w.badNumber);
      const L = int(page, e, 1, 100);

      const perDay = P * C;
      const voteDay = (P + perDay) * V;
      const peak = (3 * voteDay) / DAY;
      const pages = Math.max(1, Math.ceil(C / L));
      const est: Est = [
        [w.est.comments, human(perDay), `${human(P)} × ${human(C)}`],
        [w.est.votes, human(voteDay), `(${human(P)} + ${human(perDay)}) × ${human(V)}`],
        [w.est.perSec, rate(voteDay / DAY), "÷ 86 400 s"],
        [w.est.peak, rate(peak), "× 3"],
        [w.est.pages, String(pages), `⌈${human(C)} ÷ ${L}⌉`],
        [w.est.storage, bytes(voteDay * 365 * 30), "× 365 × 30 B"],
      ];
      const frames = start(w, est);

      // The entities, two at a time, then the endpoints a group at a time.
      const names = [w.entity.user, w.entity.subreddit, w.entity.post, w.entity.comment, w.entity.vote, w.entity.award];
      for (let g = 0; g < 3; g++)
        frames.push({
          note: w.entityNote[g],
          rows: ENTITIES.slice(0, 2 * g + 2).map((fields, i) => row(names[i], fields, () => (i >= 2 * g ? "key" : "plain"))),
        });
      for (let g = 0; g < 5; g++) {
        const shown = ENDPOINTS.filter((r) => r[3] <= g);
        frames.push({
          note: w.endNote[g],
          mat: {
            vals: shown.map(([, path, params]) => [path, params]),
            roles: shown.map((r): Role[] => (r[3] === g ? ["key", "key"] : ["plain", "plain"])),
            rowHeads: shown.map(([method]) => method),
            colHeads: [...w.endHeads],
          },
        });
      }
      // Paging with a cursor: the newest posts, the first page lit, the cursor on its last item.
      const k = Math.min(L, 12);
      frames.push({
        note: fill(w.page, { l: L }),
        cells: cells(Array.from({ length: 12 }, (_, i) => `p${120 - i}`), (i) => (i < k ? "sorted" : "idle"), k < 12 ? { after: k - 1 } : undefined, [0, k - 1]),
      });

      // How votes are counted.
      const boxes: ArchBox[] = [
        { label: w.box.apps, col: 0, row: 1, kind: "client" },
        { label: w.box.api, col: 1, row: 1, kind: "server" },
        { label: w.box.votes, col: 2, row: 0, kind: "db", tag: w.box.votesTag },
        { label: w.box.queue, col: 2, row: 2, kind: "queue" },
        { label: w.box.counters, col: 3, row: 2, kind: "server" },
        { label: w.box.scores, col: 3, row: 1, kind: "cache" },
        { label: w.box.posts, col: 4, row: 1, kind: "db" },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: w.link.vote }, // 0
        { a: 1, b: 2, label: w.link.upsert }, // 1
        { a: 1, b: 3, label: w.link.change, dashed: true }, // 2
        { a: 3, b: 4, dashed: true }, // 3
        { a: 4, b: 5, label: w.link.add }, // 4
        { a: 1, b: 5, label: w.link.read }, // 5
        { a: 5, b: 6, label: w.link.save, dashed: true }, // 6
      ];
      frames.push(...build(boxes, links, w.why));
      frames.push(
        ...follow(boxes, links, [
          [w.voteFlow[0], [0, 1], [0]],
          [w.voteFlow[1], [0, 1, 2], [0, 1]],
          [w.voteFlow[2], [0, 1, 2, 3], [0, 1, 2]],
          [w.voteFlow[3], [3, 4, 5], [3, 4], "sorted"],
          [w.readFlow, [0, 1, 5], [0, 5], "sorted"],
        ]),
      );
      return done(frames, fill(w.answer, { v: human(peak), c: human(perDay), k: human(C), n: pages, l: L }));
    },
  },

  designFacebookNewsFeed: {
    level: 0,
    example: ["500", "300", "0.5", "10000"],
    solve: ([users, friends, posts, threshold], w) => {
      const U = amount(users, 0.01, 5000, w.badNumber) * 1e6;
      const F = amount(friends, 1, 5000, w.badNumber);
      const P = amount(posts, 0.01, 100, w.badNumber);
      const T = amount(threshold, 100, 1e9, w.badNumber);

      const perDay = U * P;
      const writes = (perDay / DAY) * F;
      const reads = (U * 10) / DAY;
      const cache = U * 500 * 8;
      const est: Est = [
        [w.est.posts, human(perDay), `${human(U)} × ${human(P)}`],
        [w.est.perSec, rate(perDay / DAY), "÷ 86 400 s"],
        [w.est.writes, rate(writes), `× ${human(F)}`],
        [w.est.reads, rate(reads), `${human(U)} × 10 ÷ 86 400 s`],
        [w.est.cache, bytes(cache), `${human(U)} × 500 × 8 B`],
        [w.est.celeb, human(T), w.est.threshold],
      ];
      const frames = start(w, est);

      // Where the threshold falls among a few accounts: pushed below it, pulled above it.
      const pulled = FOLLOWERS.filter((f) => f > T).length;
      frames.push({
        note: fill(w.demo, { t: human(T), n: FOLLOWERS.length - pulled, m: pulled }),
        cells: cells(FOLLOWERS.map(human), (i) => (FOLLOWERS[i] > T ? "pivot" : "sorted")),
      });

      const boxes: ArchBox[] = [
        { label: w.box.apps, col: 0, row: 1, kind: "client" },
        { label: w.box.lb, col: 1, row: 1, kind: "lb" },
        { label: w.box.post, col: 2, row: 0, kind: "server" },
        { label: w.box.posts, col: 3, row: 0, kind: "db", tag: w.box.postsTag },
        { label: w.box.graph, col: 4, row: 0, kind: "db", tag: w.box.graphTag },
        { label: w.box.queue, col: 3, row: 1, kind: "queue" },
        { label: w.box.workers, col: 4, row: 1, kind: "server" },
        { label: w.box.cache, col: 4, row: 2, kind: "cache", tag: bytes(cache) },
        { label: w.box.feed, col: 2, row: 2, kind: "server" },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: "HTTPS" }, // 0
        { a: 1, b: 2, label: w.link.post }, // 1
        { a: 2, b: 3, label: w.link.write }, // 2
        { a: 2, b: 5, label: w.link.fanOut, dashed: true }, // 3
        { a: 5, b: 6, dashed: true }, // 4
        { a: 6, b: 4, label: w.link.friends }, // 5
        { a: 6, b: 7, label: w.link.push }, // 6
        { a: 1, b: 8, label: w.link.feed }, // 7
        { a: 8, b: 7, label: w.link.read }, // 8
        { a: 8, b: 3, label: w.link.pull }, // 9
      ];
      frames.push(...build(boxes, links, w.why));
      frames.push(
        ...follow(boxes, links, [
          [w.postFlow[0], [0, 1, 2], [0, 1]],
          [w.postFlow[1], [0, 1, 2, 3], [0, 1, 2]],
          [w.postFlow[2], [0, 1, 2, 3, 5], [0, 1, 2, 3]],
          [fill(w.postFlow[3], { f: human(F) }), [0, 1, 2, 3, 5, 6, 4], [0, 1, 2, 3, 4, 5]],
          [w.postFlow[4], [0, 1, 2, 3, 5, 6, 4, 7], [0, 1, 2, 3, 4, 5, 6], "sorted"],
          [fill(w.celebFlow, { t: human(T) }), [2, 3], [2], "pivot"],
          [w.readFlow[0], [0, 1, 8], [0, 7]],
          [w.readFlow[1], [0, 1, 8, 7], [0, 7, 8]],
          [w.readFlow[2], [0, 1, 8, 7, 3], [0, 7, 8, 9], "sorted"],
        ]),
      );
      return done(frames, fill(w.answer, { w: human(writes), r: human(reads), c: bytes(cache), t: human(T) }));
    },
  },
};
