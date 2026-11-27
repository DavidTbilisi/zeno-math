// Virtual memory (#859): the page table on the left, the frames of real memory in the middle (sixteen bytes each), the
// disk with the program's eight pages on the right. Translate an address by tapping the very byte it names; place each
// page asked for by tapping its frame (a hit, a free frame, or the one FIFO or LRU throws out); run a string of pages
// with three frames and with four and see FIFO fault more with more.
import { useState, type KeyboardEvent } from "react";
import {
  PAGE,
  PAGES,
  PAGING_LADDER,
  PAGING_NOTICES,
  POLICIES,
  access,
  bitsOf,
  choicesOf,
  emptyFrames,
  pagingPuzzleOf,
  pagingStart,
  runPages,
  split,
  starsFor,
  tableOf,
  type LivePaging,
  type Policy,
} from "../math/pagingLab";
import { BLUE, GREEN, MUTED, RED, keyTap } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 700;
const TY = 112;
const FX = 168;
const BW = 20;
const FH = 58;
const DX = 534;
const PAGE_FILL = ["#d0ebff", "#d3f9d8", "#fff3bf", "#ffe3e3", "#e5dbff", "#c3fae8", "#ffd8a8", "#f3d9fa"];
const keyOf = (s: Pick<LivePaging, "at" | "misses" | "tried" | "policy" | "n" | "seq">) => `${s.at}.${s.misses}.${s.tried}.${s.policy}.${s.n}.${s.seq.length}`;

export function PagingLab({ state, set, w: words, svgRef }: PieceProps<"pagingLab">) {
  const [w, g] = [words.pagingLab, words.game];
  const d = state;
  const p = pagingPuzzleOf(d);
  const game = useGame({
    key: "zeno.paginglab.v1", size: PAGING_LADDER.length, notices: PAGING_NOTICES, modes: ["puzzle", "free"], state: d, set,
    fresh: { said: null }, stagePatch: (k) => pagingStart(PAGING_LADDER[k]), freePatch: pagingStart(null),
  });
  const [said, setSaid] = useState<{ text: string; tone: "ok" | "wrong"; at: string } | null>(null);
  const last = said && said.at === keyOf(d) ? said : null;
  const say = (text: string, tone: "ok" | "wrong", next: Parameters<typeof keyOf>[0]) => setSaid({ text, tone, at: keyOf(next) });

  const goal = p?.goal ?? "free";
  const table = goal === "translate" && p?.goal === "translate" ? p.table : tableOf(d.frames);
  const now = d.at < d.seq.length && goal !== "free" && goal !== "belady" ? d.seq[d.at] : null;
  const page = now === null ? null : goal === "translate" ? split(now).page : now;
  const faults = d.hits.filter((h) => !h).length;

  // ---- moves ----------------------------------------------------------------------------------------------------
  const wrong = (text: string) => {
    const misses = d.misses + 1;
    say(text, "wrong", { ...d, misses });
    game.miss({ misses });
  };
  const advance = (patch: Partial<LivePaging>, text: string, notice?: "fault" | "lru") => {
    const at = d.at + 1;
    const next = { ...d, ...patch, at };
    say(text, "ok", next);
    if (at >= d.seq.length) return game.win({ stars: starsFor(d.misses), patch: { ...patch, at, done: true }, notice: notice && (() => notice) });
    game.step({ ...patch, at });
  };
  const byte = (f: number, o: number) => {
    if (goal !== "translate" || now === null || d.done) return;
    const { page: pg, offset } = split(now);
    if (f !== table[pg]) return wrong(fill(w.wrongFrame, { p: pg, f: table[pg]! }));
    if (o !== offset) return wrong(fill(w.wrongOffset, { bits: bitsOf(now).offset, o: offset }));
    advance({}, fill(w.translated, { a: now, p: pg, f, o, phys: f * PAGE + o }));
  };
  const frameTap = (f: number) => {
    if (goal !== "hand" || page === null || d.done) return;
    const at = d.frames.findIndex((x) => x.page === page);
    if (at >= 0) return f === at ? advance({ frames: access(d.frames, d.policy, page, d.at).frames, hits: [...d.hits, true] }, fill(w.hit, { p: page, f })) : wrong(fill(w.alreadyIn, { p: page, f: at }));
    const ok = choicesOf(d.frames, d.policy);
    if (!ok.includes(f)) {
      const free = d.frames.some((x) => x.page === null);
      return wrong(fill(free ? w.stillFree : d.policy === "fifo" ? w.fifoOut : w.lruOut, { f: ok[0], out: d.frames[ok[0]].page ?? 0 }));
    }
    const a = access(d.frames, d.policy, page, d.at, f);
    advance({ frames: a.frames, hits: [...d.hits, false] }, fill(a.out === null ? w.faultIn : w.faultOut, { p: page, f, out: a.out ?? 0 }), d.policy === "lru" ? "lru" : "fault");
  };
  const request = (pg: number) => {
    if (goal !== "free" || d.seq.length >= 12) return;
    const a = access(d.frames, d.policy, pg, d.seq.length);
    const next = { ...d, seq: [...d.seq, pg], at: d.seq.length + 1, hits: [...d.hits, a.hit], frames: a.frames };
    say(a.hit ? fill(w.hit, { p: pg, f: a.frame }) : fill(a.out === null ? w.faultIn : w.faultOut, { p: pg, f: a.frame, out: a.out ?? 0 }), "ok", next);
    game.tap({ seq: next.seq, at: next.at, hits: next.hits, frames: next.frames });
  };
  const runWith = (n: number) => {
    if (goal !== "belady" || d.done) return;
    const tried = d.tried.includes(n) ? d.tried : [...d.tried, n].sort();
    const r = runPages(d.policy, n, d.seq);
    const next = { ...d, n, tried, hits: r.hits, frames: r.frames, at: d.seq.length };
    say(fill(w.ran, { n, k: r.hits.filter((h) => !h).length }), "ok", next);
    const patch = { n, tried, hits: r.hits, frames: r.frames, at: d.seq.length };
    if (tried.length === 2) return game.win({ stars: 3, patch: { ...patch, done: true }, notice: () => "belady" });
    game.tap(patch);
  };
  const repolicy = (policy: Policy) => game.tap({ policy, seq: [], at: 0, hits: [], frames: emptyFrames(d.n) });
  const reframes = (n: number) => game.tap({ n, seq: [], at: 0, hits: [], frames: emptyFrames(n) });

  // ---- words --------------------------------------------------------------------------------------------------------
  const stars = p && d.done ? (goal === "belady" ? 3 : starsFor(d.misses)) : 0;
  const line: Line =
    p && d.done ? { tone: "ok", text: `${last?.text ?? ""} ${fill(w.right, { stars: starText(stars) })}`.trim() }
    : last ? { tone: last.tone, text: last.text }
    : d.said?.kind === "notice" ? { tone: "notice", text: w.notices[d.said.key] }
    : { tone: "hint", text: w.hints[goal] };
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;

  // ---- drawing --------------------------------------------------------------------------------------------------------
  const tile = (key: string, x: number, wd: number, label: string, on: boolean, act: () => void) => (
    <g key={key} role="button" tabIndex={0} aria-label={label} aria-pressed={on} style={{ cursor: "pointer" }} onClick={act} onKeyDown={(e: KeyboardEvent) => keyTap(e, act)}>
      <rect x={x} y={8} width={wd} height={30} rx={7} fill={on ? "#d0ebff" : "#f8f9fa"} stroke={on ? BLUE : "#ced4da"} strokeWidth={on ? 2 : 1} />
      <text x={x + wd / 2} y={28} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{label}</text>
    </g>
  );
  const chips = (hits: boolean[], y: number, label: string) => (
    <g>
      <text x={10} y={y + 19} fontSize={11} fill={MUTED}>{label}</text>
      {d.seq.map((pg, i) => {
        const done = i < hits.length;
        const cur = i === d.at && goal === "hand";
        return (
          <g key={i} data-req={i} data-hit={done ? (hits[i] ? "1" : "0") : ""}>
            <rect x={150 + i * 40} y={y} width={36} height={28} rx={5} fill={done ? (hits[i] ? "#d3f9d8" : "#ffe3e3") : PAGE_FILL[pg]} stroke={cur ? BLUE : "#adb5bd"} strokeWidth={cur ? 2.5 : 1} />
            <text x={168 + i * 40} y={y + 19} fontSize={14} fontWeight={700} textAnchor="middle" fill={INK}>{pg}</text>
          </g>
        );
      })}
    </g>
  );
  const H = TY + Math.max(PAGES * 30, d.n * FH) + 60;

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ userSelect: "none" }}>
          <rect width={W} height={H} fill="#fff" />
          {goal === "free" && [...POLICIES.map((pol, k) => tile(pol, 10 + k * 130, 122, w.policies[pol], d.policy === pol, () => repolicy(pol))), ...[3, 4].map((n, k) => tile(`n${n}`, 290 + k * 110, 102, fill(w.frames, { n }), d.n === n, () => reframes(n)))]}
          {goal === "belady" && [3, 4].map((n, k) => tile(`run${n}`, 10 + k * 150, 142, fill(w.runWith, { n }), d.tried.includes(n), () => runWith(n)))}
          {p && goal !== "belady" && <text x={10} y={28} fontSize={14} fontWeight={700} fill={INK}>{goal === "translate" ? w.translate : w.policies[d.policy]}</text>}

          {/* What is asked for: an address split into page and offset, or the string of pages. */}
          {goal === "translate" && now !== null ? (
            <g data-address={now}>
              <text x={10} y={72} fontSize={15} fontWeight={700} fill={INK}>{fill(w.address, { a: now })}</text>
              <text x={210} y={72} fontSize={18} fontWeight={700} fontFamily="ui-monospace, monospace" fill={BLUE}>{bitsOf(now).page}</text>
              <text x={250} y={72} fontSize={18} fontWeight={700} fontFamily="ui-monospace, monospace" fill={GREEN}>{bitsOf(now).offset}</text>
              <text x={310} y={72} fontSize={12} fill={MUTED}>{fill(w.parts, { p: split(now).page, o: split(now).offset })}</text>
            </g>
          ) : goal === "belady" ? (
            <g>
              {d.tried.map((n, r) => {
                const hits = runPages(d.policy, n, d.seq).hits;
                return <g key={n} data-run={n} data-faults={hits.filter((h) => !h).length}>{chips(hits, 50 + r * 34, fill(w.runLine, { n, k: hits.filter((h) => !h).length }))}</g>;
              })}
              {!d.tried.length && chips([], 50, w.asked)}
            </g>
          ) : chips(d.hits, 50, w.asked)}

          {/* The page table: page → frame, or on the disk. */}
          {goal !== "belady" && (
            <g>
              <text x={10} y={TY - 8} fontSize={12} fontWeight={700} fill={INK}>{w.table}</text>
              {table.map((f, pg) => (
                <g key={pg} data-entry={pg} data-frame={f ?? ""}>
                  <rect x={10} y={TY + pg * 30} width={140} height={26} rx={4} fill={pg === page ? "#e7f5ff" : "#f8f9fa"} stroke={pg === page ? BLUE : "#dee2e6"} strokeWidth={pg === page ? 2 : 1} />
                  <rect x={14} y={TY + pg * 30 + 4} width={18} height={18} rx={3} fill={PAGE_FILL[pg]} />
                  <text x={23} y={TY + pg * 30 + 18} fontSize={11} fontWeight={700} textAnchor="middle" fill={INK}>{pg}</text>
                  <text x={42} y={TY + pg * 30 + 18} fontSize={11} fill={f === null ? MUTED : INK}>{f === null ? w.onDisk : fill(w.inFrame, { f })}</text>
                </g>
              ))}
            </g>
          )}

          {/* The frames of real memory: sixteen bytes each, coloured by the page they hold. */}
          <text x={FX} y={TY - 8} fontSize={12} fontWeight={700} fill={INK}>{w.memory}</text>
          {d.frames.map((fr, f) => {
            const y = TY + f * FH;
            const tap = goal === "hand";
            return (
              <g key={f} data-frame={f} data-page={fr.page ?? ""} role={tap ? "button" : undefined} tabIndex={tap ? 0 : undefined} aria-label={tap ? fill(w.frameName, { f, what: fr.page === null ? w.free : fill(w.holds, { p: fr.page }) }) : undefined}
                style={{ cursor: tap ? "pointer" : "default" }} onClick={() => frameTap(f)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => frameTap(f))}>
                <rect x={FX - 4} y={y + 2} width={PAGE * BW + 6} height={FH - 6} rx={6} fill="transparent" />
                <text x={FX} y={y + 12} fontSize={11} fill={MUTED}>{fill(w.frameLabel, { f, what: fr.page === null ? w.free : fill(w.holds, { p: fr.page }), b: f * PAGE })}</text>
                {Array.from({ length: PAGE }, (_, o) => (
                  <rect key={o} data-byte={`${f}.${o}`} x={FX + o * BW} y={y + 18} width={BW - 2} height={30} rx={3} fill={fr.page === null ? "#fff" : PAGE_FILL[fr.page]} stroke="#adb5bd"
                    role={goal === "translate" ? "button" : undefined} aria-label={goal === "translate" ? fill(w.byteName, { f, o, phys: f * PAGE + o }) : undefined}
                    style={{ cursor: goal === "translate" ? "pointer" : undefined }} onClick={(e) => { if (goal === "translate") { e.stopPropagation(); byte(f, o); } }} />
                ))}
                {fr.page !== null && <text x={FX + 8 * BW} y={y + 39} fontSize={13} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{fill(w.pageN, { p: fr.page })}</text>}
              </g>
            );
          })}

          {/* The disk holds every page; in free play tap one to ask for it. */}
          <text x={DX} y={TY - 8} fontSize={12} fontWeight={700} fill={INK}>{w.disk}</text>
          <rect x={DX} y={TY} width={156} height={4 * 44 + 8} rx={10} fill="#f1f3f5" stroke="#adb5bd" />
          {Array.from({ length: PAGES }, (_, pg) => {
            const [x, y] = [DX + 8 + (pg % 2) * 74, TY + 8 + Math.floor(pg / 2) * 44];
            const free = goal === "free";
            return (
              <g key={pg} data-disk={pg} role={free ? "button" : undefined} tabIndex={free ? 0 : undefined} aria-label={free ? fill(w.askFor, { p: pg }) : undefined} style={{ cursor: free ? "pointer" : "default" }}
                onClick={() => request(pg)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => request(pg))}>
                <rect x={x} y={y} width={66} height={36} rx={5} fill={PAGE_FILL[pg]} stroke={pg === page ? BLUE : "#adb5bd"} strokeWidth={pg === page ? 2.5 : 1} />
                <text x={x + 33} y={y + 23} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{fill(w.pageN, { p: pg })}</text>
              </g>
            );
          })}

          {goal !== "translate" && (
            <text x={FX} y={H - 14} fontSize={13} fontWeight={700} fill={faults ? RED : MUTED} data-faults={faults}>{fill(w.faults, { k: faults, n: d.hits.length })}</text>
          )}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
