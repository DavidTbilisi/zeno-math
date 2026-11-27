// The cache (#855), by hand: the CPU's requests in a row along the top, the cache's four lines in the middle, main
// memory's sixteen blocks on the right, each coloured by where it may go. Each request is answered by tapping a cache
// line (or dragging the block from memory onto it): the line that already holds it, a hit, or the line it goes in, a
// miss. Puzzles predict hit or miss, and build a sequence that thrashes a direct-mapped cache but not a two-way one.
import { useState, type KeyboardEvent } from "react";
import {
  BLOCKS,
  CACHE_LADDER,
  CACHE_NOTICES,
  LINES,
  MAPPINGS,
  MAX_SEQ,
  T_CACHE,
  T_MEMORY,
  access,
  addressParts,
  averageTime,
  cachePuzzleOf,
  cacheStart,
  choicesOf,
  emptyCache,
  placeOf,
  runSeq,
  setName,
  starsFor,
  thrashes,
  type Mapping,
} from "../math/cacheLab";
import { BLUE, GREEN, MUTED, RED, keyTap, useDrag } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 700;
const H = 440;
const QY = 12;
const CX = 150;
const CW = 250;
const LY = 112;
const LH = 54;
const MX = 440;
const MY = 112;
const CELL = 60;
const PLACE_COLORS = ["#d0ebff", "#d3f9d8", "#fff3bf", "#ffe3e3"];

export function CacheLab({ state, set, w: words, svgRef }: PieceProps<"cacheLab">) {
  const [w, g] = [words.cacheLab, words.game];
  const d = state;
  const p = cachePuzzleOf(d);
  const game = useGame({
    key: "zeno.cachelab.v1", size: CACHE_LADDER.length, notices: CACHE_NOTICES, modes: ["puzzle", "free"], state: d, set,
    fresh: { said: null }, stagePatch: (k) => cacheStart(CACHE_LADDER[k]), freePatch: cacheStart(null),
  });
  const goal = p?.goal ?? "free";
  const m = d.mapping;
  // The thrash puzzle and free play show the sequence run by the rules; the others, what was done so far.
  const ruled = goal === "thrash" ? runSeq(m, d.seq) : null;
  const cache = ruled ? ruled.cache : d.cache;
  const hits = ruled ? ruled.hits : d.hits;
  const now = goal === "thrash" ? null : d.at < d.seq.length ? d.seq[d.at] : null;
  const finished = (at: number) => at >= d.seq.length;

  // The last thing said, kept with the requests (or the hits) it was said about.
  const [said, setSaid] = useState<{ text: string; tone: "ok" | "wrong"; on: unknown } | null>(null);
  const last = said && (said.on === d.hits || said.on === d.seq) ? said : null;

  // ---- moves ----------------------------------------------------------------------------------------------------
  /** A cache line tapped (or a block dropped on it) for the request now. */
  const answer = (line: number) => {
    if (now === null || goal === "predict") return;
    const b = now;
    const where = placeOf(m, b).find((i) => d.cache[i].block === b);
    let wrong: string | null = null;
    if (where !== undefined && line !== where) wrong = fill(w.alreadyIn, { b, line: where });
    else if (where === undefined) {
      const ok = choicesOf(d.cache, m, b);
      if (!ok.includes(line)) {
        const place = placeOf(m, b);
        wrong = !place.includes(line)
          ? m === "direct" ? fill(w.onlyLine, { b, line: place[0] }) : fill(w.onlySet, { b, s: setName(m, b), lines: place.join(w.and) })
          : place.some((i) => d.cache[i].block === null) ? fill(w.stillFree, { line: ok[0] }) : fill(w.lruOut, { line: ok[0], out: d.cache[ok[0]].block ?? 0 });
      }
    }
    if (wrong) {
      setSaid({ text: wrong, tone: "wrong", on: d.hits });
      return game.miss({ misses: d.misses + 1 });
    }
    const a = access(d.cache, m, b, d.at, where ?? line);
    const patch = { cache: a.cache, hits: [...d.hits, a.hit], at: d.at + 1 };
    setSaid({ text: a.hit ? fill(w.hitRight, { b, line: a.line }) : a.out !== null ? fill(w.missOut, { b, line: a.line, out: a.out }) : fill(w.missIn, { b, line: a.line }), tone: "ok", on: patch.hits });
    if (p && finished(patch.at)) return game.win({ stars: starsFor(d.misses), patch: { ...patch, done: true } });
    if (!a.hit && a.out !== null) return game.spot(patch, m === "direct" ? "conflict" : "lru");
    game.step(patch);
  };
  /** The predict puzzle: hit or miss, then the cache does it. */
  const predict = (hit: boolean) => {
    if (now === null) return;
    const a = access(d.cache, m, now, d.at);
    const patch = { cache: a.cache, hits: [...d.hits, a.hit], at: d.at + 1 };
    const right = a.hit === hit;
    setSaid({ text: fill(right ? w.guessRight : w.guessWrong, { b: now, what: a.hit ? w.hit : w.miss }), tone: right ? "ok" : "wrong", on: patch.hits });
    const misses = d.misses + (right ? 0 : 1);
    if (finished(patch.at)) return game.win({ stars: starsFor(misses), patch: { ...patch, misses, done: true } });
    if (!right) return game.miss({ ...patch, misses });
    if (a.hit && d.hits.length >= LINES) return game.spot(patch, "locality");
    game.step(patch);
  };
  /** A memory block tapped: free play asks for it; the thrash puzzle adds it to the sequence. */
  const request = (b: number) => {
    if (goal === "thrash") return d.seq.length < MAX_SEQ && game.tap({ seq: [...d.seq, b] });
    if (goal !== "free") return;
    const a = access(d.cache, m, b, d.seq.length);
    const hitsNow = [...d.hits, a.hit];
    setSaid({ text: a.hit ? fill(w.hitRight, { b, line: a.line }) : a.out !== null ? fill(w.missOut, { b, line: a.line, out: a.out }) : fill(w.missIn, { b, line: a.line }), tone: "ok", on: hitsNow });
    game.tap({ seq: [...d.seq, b], at: d.seq.length + 1, cache: a.cache, hits: hitsNow });
  };
  const check = () => {
    if (thrashes(d.seq)) return game.win({ stars: starsFor(d.misses), patch: { done: true } });
    setSaid({ tone: "wrong", on: d.seq, text: fill(w.noThrash, { n: d.seq.length, len: 6, dh: runSeq("direct", d.seq).hits.filter(Boolean).length, th: runSeq("two", d.seq).hits.filter(Boolean).length }) });
    game.miss({ misses: d.misses + 1 });
  };
  const remap = (to: Mapping) => game.tap({ mapping: to, seq: [], at: 0, hits: [], cache: emptyCache() });


  const { drag, begin, svgProps } = useDrag<{ b: number }>((h) => {
    if (!h.moved) return request(h.b);
    const line = Array.from({ length: LINES }, (_, i) => i).find((i) => h.x >= CX && h.x <= CX + CW && h.y >= LY + i * LH && h.y < LY + (i + 1) * LH);
    if (line !== undefined && h.b === now) answer(line);
  });

  // ---- words --------------------------------------------------------------------------------------------------------
  const nHits = hits.filter(Boolean).length;
  const stars = p && d.done ? starsFor(d.misses) : 0;
  const line: Line =
    p && d.done ? { tone: "ok", text: `${last?.text ?? ""} ${fill(w.right, { stars: starText(stars) })}`.trim() }
    : last ? { tone: last.tone, text: last.text }
    : d.said?.kind === "notice" ? { tone: "notice", text: w.notices[d.said.key] }
    : { tone: "hint", text: goal === "predict" ? w.hintPredict : goal === "thrash" ? w.hintThrash : w.hint };
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;
  const parts = now !== null ? addressParts(m, now) : null;

  // ---- drawing --------------------------------------------------------------------------------------------------------
  const chipW = Math.min(52, (W - 20) / Math.max(10, d.seq.length));
  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ touchAction: "none", userSelect: "none" }} {...svgProps}>
          <rect width={W} height={H} fill="#fff" />

          {/* The CPU's requests, in order: hit or miss once done, the one now ringed. */}
          <text x={10} y={QY + 12} fontSize={11} fill={MUTED}>{w.requests}</text>
          {d.seq.map((b, i) => {
            const h = hits[i];
            const label = fill(w.chip, { b, what: h === undefined ? "" : h ? w.hit : w.miss });
            const act = () => goal === "thrash" && game.tap({ seq: d.seq.filter((_, j) => j !== i) });
            return (
              <g key={i} data-req={i} data-hit={h === undefined ? "" : h ? "1" : "0"} role={goal === "thrash" ? "button" : undefined} tabIndex={goal === "thrash" ? 0 : undefined}
                aria-label={goal === "thrash" ? fill(w.removeChip, { b }) : label} onClick={act} onKeyDown={(e: KeyboardEvent) => keyTap(e, act)} style={{ cursor: goal === "thrash" ? "pointer" : "default" }}>
                <rect x={10 + i * (chipW + 4)} y={QY + 18} width={chipW} height={32} rx={6} fill={h === undefined ? "#fff" : h ? "#d3f9d8" : "#ffe3e3"}
                  stroke={i === d.at && now !== null ? BLUE : "#adb5bd"} strokeWidth={i === d.at && now !== null ? 3 : 1} />
                <text x={10 + i * (chipW + 4) + chipW / 2} y={QY + 39} fontSize={14} fontWeight={700} textAnchor="middle" fill={INK}>{b}</text>
              </g>
            );
          })}
          {!d.seq.length && <text x={12} y={QY + 40} fontSize={12} fill={MUTED}>{goal === "thrash" ? w.emptyThrash : w.emptyFree}</text>}
          {parts && (
            <text x={10} y={QY + 74} fontSize={13} fill={INK} data-address={`${parts.tag}|${parts.index}`}>
              {m === "full" ? fill(w.addrFull, { b: now!, bits: parts.tag }) : fill(m === "direct" ? w.addrDirect : w.addrTwo, { b: now!, tag: parts.tag, index: parts.index, at: setName(m, now!) })}
            </text>
          )}

          {/* The CPU, the block it asks for now, and (to predict) hit or miss. */}
          <rect x={10} y={LY} width={120} height={LH * 2 - 8} rx={10} fill="#f8f9fa" stroke="#adb5bd" />
          <text x={70} y={LY + 18} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{w.cpu}</text>
          <text x={70} y={LY + 64} fontSize={30} fontWeight={700} textAnchor="middle" fill={now === null ? MUTED : BLUE} data-now={now ?? ""}>{now ?? "–"}</text>
          <text x={70} y={LY + 88} fontSize={10} textAnchor="middle" fill={MUTED}>{w.wants}</text>
          {goal === "predict" && now !== null && [true, false].map((hit, i) => (
            <g key={i} role="button" tabIndex={0} aria-label={hit ? w.sayHit : w.sayMiss} style={{ cursor: "pointer" }} onClick={() => predict(hit)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => predict(hit))}>
              <rect x={10} y={LY + LH * 2 + i * 44} width={120} height={38} rx={8} fill={hit ? "#d3f9d8" : "#ffe3e3"} stroke={hit ? GREEN : RED} strokeWidth={1.5} />
              <text x={70} y={LY + LH * 2 + i * 44 + 24} fontSize={14} fontWeight={700} textAnchor="middle" fill={INK}>{hit ? w.hit : w.miss}</text>
            </g>
          ))}
          {goal === "free" && MAPPINGS.map((mp, i) => (
            <g key={mp} role="button" tabIndex={0} aria-label={w.mappings[mp]} aria-pressed={m === mp} style={{ cursor: "pointer" }} onClick={() => remap(mp)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => remap(mp))}>
              <rect x={10} y={LY + LH * 2 + i * 40} width={120} height={34} rx={7} fill={m === mp ? "#d0ebff" : "#f8f9fa"} stroke={m === mp ? BLUE : "#ced4da"} strokeWidth={m === mp ? 2 : 1} />
              <text x={70} y={LY + LH * 2 + i * 40 + 21} fontSize={11} fontWeight={700} textAnchor="middle" fill={INK}>{w.mappings[mp]}</text>
            </g>
          ))}
          {goal === "thrash" && (
            <g role="button" tabIndex={0} aria-label={w.check} style={{ cursor: "pointer" }} onClick={check} onKeyDown={(e: KeyboardEvent) => keyTap(e, check)}>
              <rect x={10} y={LY + LH * 2} width={120} height={40} rx={8} fill="#ebfbee" stroke={GREEN} strokeWidth={1.5} />
              <text x={70} y={LY + LH * 2 + 25} fontSize={13} fontWeight={700} textAnchor="middle" fill={GREEN}>{w.check}</text>
            </g>
          )}

          {/* The cache: four lines, in sets for two-way, each holding a block or nothing. */}
          <text x={CX} y={LY - 8} fontSize={12} fontWeight={700} fill={INK}>{`${w.cache} · ${w.mappings[m]}`}</text>
          {cache.map((l, i) => {
            const s = m === "direct" ? i : m === "two" ? Math.floor(i / 2) : 0;
            const target = now !== null && goal !== "predict" && drag?.moved && placeOf(m, now).includes(i);
            const label = fill(w.lineName, { i, what: l.block === null ? w.empty : fill(w.holds, { b: l.block }) });
            return (
              <g key={i} data-line={i} data-block={l.block ?? ""} role="button" tabIndex={0} aria-label={label} style={{ cursor: "pointer" }}
                onClick={() => answer(i)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => answer(i))}>
                <title>{label}</title>
                <rect x={CX} y={LY + i * LH} width={CW} height={LH - 6} rx={7} fill={m === "full" ? "#f8f9fa" : PLACE_COLORS[s]} stroke={target ? GREEN : "#868e96"} strokeWidth={target ? 3 : 1.2} />
                <text x={CX + 10} y={LY + i * LH + 19} fontSize={11} fill={MUTED}>{fill(w.line, { i })}</text>
                {m === "two" && i % 2 === 0 && <text x={CX + 10} y={LY + i * LH + 36} fontSize={10} fill={MUTED}>{fill(w.set, { s })}</text>}
                <text x={CX + 110} y={LY + i * LH + 31} fontSize={20} fontWeight={700} textAnchor="middle" fill={l.block === null ? "#ced4da" : INK}>{l.block ?? "–"}</text>
                {l.block !== null && <text x={CX + CW - 10} y={LY + i * LH + 31} fontSize={10} textAnchor="end" fill={MUTED}>{fill(w.used, { t: l.used + 1 })}</text>}
              </g>
            );
          })}

          {/* Main memory: sixteen blocks, coloured by the line or set each may go in. */}
          <text x={MX} y={MY - 8} fontSize={12} fontWeight={700} fill={INK}>{w.memory}</text>
          {Array.from({ length: BLOCKS }, (_, b) => {
            const [x, y] = [MX + (b % 4) * (CELL + 4), MY + Math.floor(b / 4) * (CELL - 8)];
            const isNow = b === now;
            const held = drag?.moved && drag.b === b;
            return (
              <g key={b} data-mem={b} role="button" tabIndex={0} aria-label={fill(isNow ? w.dragBlock : w.memBlock, { b })} style={{ cursor: isNow ? "grab" : "pointer" }}
                onPointerDown={(e) => begin(e, { b })} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => request(b))}>
                <rect x={x} y={y} width={CELL} height={CELL - 14} rx={6} fill={m === "full" ? "#f1f3f5" : PLACE_COLORS[m === "direct" ? b % 4 : b % 2]} stroke={isNow ? BLUE : "#adb5bd"} strokeWidth={isNow ? 3 : 1} opacity={held ? 0.4 : 1} />
                <text x={x + CELL / 2} y={y + 28} fontSize={15} fontWeight={700} textAnchor="middle" fill={INK}>{b}</text>
              </g>
            );
          })}
          {drag?.moved && (
            <g pointerEvents="none">
              <rect x={drag.x - 22} y={drag.y - 18} width={44} height={36} rx={6} fill="#fff" stroke={BLUE} strokeWidth={2} />
              <text x={drag.x} y={drag.y + 6} fontSize={15} fontWeight={700} textAnchor="middle" fill={INK}>{drag.b}</text>
            </g>
          )}

          {/* How it went: hits, misses, the hit rate and the average time a request takes. */}
          <text x={CX} y={LY + LINES * LH + 18} fontSize={12} fill={INK} data-hits={nHits}>
            {fill(w.stats, { h: nHits, m: hits.length - nHits, rate: hits.length ? Math.round((100 * nHits) / hits.length) : 0 })}
          </text>
          <text x={CX} y={LY + LINES * LH + 38} fontSize={12} fill={MUTED}>
            {fill(w.time, { t: averageTime(nHits, hits.length).toFixed(1), c: T_CACHE, mem: T_MEMORY })}
          </text>
          {goal === "thrash" && (
            <text x={CX} y={LY + LINES * LH + 60} fontSize={12} fontWeight={700} fill={INK}>
              {fill(w.both, { dh: runSeq("direct", d.seq).hits.filter(Boolean).length, th: runSeq("two", d.seq).hits.filter(Boolean).length })}
            </text>
          )}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
