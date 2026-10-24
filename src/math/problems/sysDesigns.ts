// System design questions, each walked through the way an interview goes: what the system must do, estimates worked
// out from the numbers typed in (users, requests, sizes), the architecture built a part at a time with the reason for
// each part, then the main requests followed through it and the decisions that let it grow.
import { done, fill, row, type ArchBox, type ArchLink, type Frame, type ProblemSet, type Role } from "./core";
import { amount, bytes, DAY, human } from "./sys";

/** The architecture with the boxes up to `upTo` shown, `hot` boxes and links lit, and the rest of the links plain. */
export function archAt(boxes: ArchBox[], links: ArchLink[], upTo: number, hot: { boxes?: number[]; links?: number[]; role?: Role } = {}) {
  const role = hot.role ?? "compare";
  return {
    boxes: boxes.slice(0, upTo + 1).map((b, i) => (hot.boxes?.includes(i) ? { ...b, role } : b)),
    links: links.flatMap((l, i) => (l.a <= upTo && l.b <= upTo ? [hot.links?.includes(i) ? { ...l, role } : l] : [])),
  };
}

/** The estimates so far as a table: what each is, its value, and how it was worked out. */
import { DESIGNS_A } from "./sysDesignsA";
import { DESIGNS_B } from "./sysDesignsB";
export const estimates = (rows: [string, string, string][], heads: readonly string[], upTo = rows.length - 1, lit = upTo) => ({
  vals: rows.slice(0, upTo + 1).map(([, v, how]) => [v, how]),
  roles: rows.slice(0, upTo + 1).map((_, i): Role[] => (i === lit ? ["key", "key"] : ["plain", "plain"])),
  rowHeads: rows.slice(0, upTo + 1).map(([what]) => what),
  colHeads: [...heads],
});

export const SYS_DESIGNS: ProblemSet<"sysDesigns"> = {
  designSlack: {
    level: 0,
    example: ["10", "40", "300", "20"],
    solve: ([dau, perUser, size, members], w) => {
      const D = amount(dau, 0.01, 1000, w.badNumber) * 1e6;
      const M = amount(perUser, 1, 1000, w.badNumber);
      const S = amount(size, 10, 100_000, w.badNumber);
      const C = amount(members, 1, 10_000, w.badNumber);
      const frames: Frame[] = [];

      // What it must do.
      frames.push({ note: w.reqNote, rows: [row(w.must, w.musts), row(w.should, w.shoulds)] });

      // Estimates, one at a time.
      const perDay = D * M;
      const peak = (3 * perDay) / DAY;
      const est: [string, string, string][] = [
        [w.est.messages, human(perDay), `${human(D)} × ${human(M)}`],
        [w.est.writes, `${human(perDay / DAY)}/s`, `÷ 86 400 s`],
        [w.est.peak, `${human(peak)}/s`, `× 3`],
        [w.est.storage, bytes(perDay * S), `× ${bytes(S)}`],
        [w.est.year, bytes(perDay * S * 365 * 3), `× 365 × 3 ${w.est.copies}`],
        [w.est.deliveries, `${human(peak * C)}/s`, `${human(peak)}/s × ${human(C)}`],
        [w.est.connections, human(D * 0.5), `50% ${w.est.online}`],
      ];
      for (let i = 0; i < est.length; i++) frames.push({ note: fill(w.estNote[i], { v: est[i][1] }), mat: estimates(est, w.heads, i) });

      // The architecture, a part at a time.
      const boxes: ArchBox[] = [
        { label: w.box.clients, col: 0, row: 1, kind: "client" },
        { label: w.box.lb, col: 1, row: 1, kind: "lb" },
        { label: w.box.api, col: 2, row: 1, kind: "server" },
        { label: w.box.db, col: 4, row: 1, kind: "db", tag: w.box.dbTag },
        { label: w.box.gateway, col: 2, row: 0, kind: "server", tag: human(D * 0.5 / 50_000) + " × 50 K" },
        { label: w.box.pubsub, col: 3, row: 0, kind: "queue" },
        { label: w.box.cache, col: 3, row: 2, kind: "cache" },
        { label: w.box.files, col: 1, row: 2, kind: "store" },
      ];
      const links: ArchLink[] = [
        { a: 0, b: 1, label: "HTTPS" }, // 0
        { a: 1, b: 2 }, // 1
        { a: 2, b: 3, label: w.link.write }, // 2
        { a: 0, b: 4, label: "WebSocket", both: true }, // 3
        { a: 2, b: 5, label: w.link.publish, dashed: true }, // 4
        { a: 5, b: 4, label: w.link.push, dashed: true }, // 5
        { a: 2, b: 6, label: w.link.recent }, // 6
        { a: 6, b: 3, dashed: true }, // 7
        { a: 0, b: 7, label: w.link.upload }, // 8
      ];
      for (let i = 0; i < boxes.length; i++) frames.push({ note: w.why[i], arch: archAt(boxes, links, i, { boxes: [i], role: "key" }) });

      // The requests that matter, followed through it.
      const last = boxes.length - 1;
      const send: { boxes: number[]; links: number[] }[] = [
        { boxes: [0, 1], links: [0] },
        { boxes: [0, 1, 2], links: [0, 1] },
        { boxes: [0, 1, 2, 3], links: [0, 1, 2] },
        { boxes: [0, 1, 2, 3, 5], links: [0, 1, 2, 4] },
        { boxes: [0, 1, 2, 3, 5, 4], links: [0, 1, 2, 4, 5, 3] },
      ];
      send.forEach((lit, k) => frames.push({ note: w.sendFlow[k], arch: archAt(boxes, links, last, lit) }));
      frames.push({ note: w.readFlow, arch: archAt(boxes, links, last, { boxes: [0, 1, 2, 6], links: [0, 1, 6], role: "sorted" }) });
      frames.push({ note: w.scale, arch: archAt(boxes, links, last, { boxes: [3, 4], role: "pivot" }) });

      return done(frames, fill(w.answer, { p: human(peak), s: bytes(perDay * S), d: human(peak * C), g: human(Math.ceil((D * 0.5) / 50_000)) }));
    },
  },
  ...DESIGNS_A,
  ...DESIGNS_B,
};
