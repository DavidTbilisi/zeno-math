// Tile drop: fraction bars fall toward a wall of three rows, each one whole long; a tap on a row (or Enter on it)
// slides the lowest bar still falling into it. A row holding exactly one whole clears, green; a bar that would take a
// row past one jams: it shows sticking out past the row's end, red, and falls on to be sent elsewhere. The wave in the
// air lives on the screen only (math/tileDrop.ts moves it); the board keeps what it came to, down to every row cleared
// and every jam. Built on the game shell (useGame): a row cleared is a step that leaves the streak alone, a jam a miss,
// the end of the wave the win, clean when nothing slipped. A wave picked from the head starts at once.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Frac } from "../math/fraction";
import { sumOf, sumText } from "../math/makeOne";
import {
  advanceTiles,
  FLOOR,
  lowest,
  ROW_H,
  ROW_W,
  ROW_X,
  ROWS,
  rowY,
  sendTo,
  startTiles,
  TILE_FADE,
  TILE_H,
  TILE_H_ALL,
  TILE_LADDER,
  TILE_NOTICES,
  TILE_W,
  tileNotice,
  tileNow,
  tileSlips,
  tileStars,
  tilesOver,
  tileY,
  type LiveTileDrop,
  type TileEvent,
  type TileSim,
} from "../math/tileDrop";
import { keyTap, Pill } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const GREEN = "#2f9e44";
const RED = "#e03131";
const GRAY = "#868e96";
const HUE: Record<number, [string, string]> = {
  2: ["#a5d8ff", "#1971c2"], 3: ["#b2f2bb", "#2b8a3e"], 4: ["#ffd8a8", "#d9480f"], 5: ["#eebefa", "#9c36b5"],
  6: ["#ffec99", "#e67700"], 8: ["#fcc2d7", "#c2255c"], 10: ["#d0bfff", "#6741d9"], 12: ["#99e9f2", "#0c8599"],
};
const hue = (d: number) => HUE[d] ?? ["#dee2e6", "#495057"];
const FRESH: Partial<LiveTileDrop> = { done: false, cleared: 0, jams: 0, said: null, rowsDone: [], jammed: [] };
type Phase = "idle" | "play" | "paused";
type Flash = { t: number; kind: "clear" | "jam"; parts: Frac[]; f?: Frac };
type Tally = { cleared: number; jams: number; ended: boolean; rowsDone: string[]; jammed: string[]; flash: (Flash | null)[] };
const freshTally = (): Tally => ({ cleared: 0, jams: 0, ended: false, rowsDone: [], jammed: [], flash: Array(ROWS).fill(null) });

/** Bars laid one after another from x, each its fraction of a whole `ROW_W` long, labelled when there is room. */
function Bars({ x, y, h, parts, edge, opacity = 1 }: { x: number; y: number; h: number; parts: Frac[]; edge?: string; opacity?: number }) {
  let at = x;
  return (
    <g opacity={opacity} pointerEvents="none">
      {parts.map((f, k) => {
        const w = f.toNumber() * ROW_W;
        const [light, dark] = hue(f.d);
        const out = (
          <g key={k}>
            <rect x={at} y={y} width={w} height={h} rx={4} fill={light} stroke={edge ?? dark} strokeWidth={2} />
            {w >= 30 && <text x={at + w / 2} y={y + h / 2 + 6} fontSize={16} fontWeight={700} textAnchor="middle" fill={INK}>{`${f.n}/${f.d}`}</text>}
          </g>
        );
        at += w;
        return out;
      })}
    </g>
  );
}

export function TileDrop({ state: d, set, w: words, svgRef }: PieceProps<"tileDrop">) {
  const [w, g] = [words.tileDrop, words.game];
  const game = useGame({ key: "zeno.tiledrop.v1", size: TILE_LADDER.length, notices: TILE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const { mode, stage, level, seed, timed } = d;
  const { spec, drops } = useMemo(() => tileNow({ mode, stage, level, seed, timed }), [mode, stage, level, seed, timed]);
  const clip = useId();
  const [phase, setPhase] = useState<Phase>("idle");
  const [, redraw] = useState(0);
  const sim = useRef<TileSim>(startTiles());
  const tally = useRef<Tally>(freshTally());
  const latest = useRef({ game, d, set });
  useEffect(() => {
    latest.current = { game, d, set };
  });

  const report = (e: TileEvent) => {
    const t = tally.current;
    const { game, d, set } = latest.current;
    if (e.kind === "in") return set({ ...d, said: { kind: "in", sum: `${e.sum.n}/${e.sum.d}` } });
    if (e.kind === "clear") {
      t.flash[e.row] = { t: sim.current.t, kind: "clear", parts: e.parts };
      t.cleared++;
      t.rowsDone.push(sumText(e.parts));
      game.step({ cleared: t.cleared, jams: t.jams, said: { kind: "clear", parts: sumText(e.parts) } }, { counts: false, notice: () => tileNotice(e.parts) });
    } else {
      t.flash[e.row] = { t: sim.current.t, kind: "jam", parts: e.parts, f: e.f };
      t.jams++;
      const all = sumText([...e.parts, e.f]);
      t.jammed.push(`${all} = ${e.sum.n}/${e.sum.d}`);
      game.miss({ cleared: t.cleared, jams: t.jams, said: { kind: "jam", parts: all, sum: `${e.sum.n}/${e.sum.d}` } });
    }
  };
  const finish = () => {
    const t = tally.current;
    t.ended = true;
    const slips = tileSlips(t.cleared, t.jams, spec.goal);
    latest.current.game.win({
      stars: tileStars(slips),
      clean: slips === 0,
      notice: (streak) => (streak === 10 ? "streak10" : null),
      patch: { done: true, cleared: t.cleared, jams: t.jams, said: null, rowsDone: t.rowsDone, jammed: t.jammed },
    });
  };
  const begin = () => {
    sim.current = startTiles();
    tally.current = freshTally();
    const { d, set } = latest.current;
    if (d.done || d.cleared || d.jams || d.said || d.rowsDone?.length) set({ ...d, ...FRESH } as LiveTileDrop);
    setPhase("play");
  };
  const fns = useRef({ report, finish });
  useEffect(() => {
    fns.current = { report, finish };
  });

  const waveKey = `${mode}.${stage}.${level}.${seed}.${!!timed}.${d.done}`;
  const shown = useRef(waveKey);
  useEffect(() => {
    if (shown.current === waveKey) return;
    shown.current = waveKey;
    if (d.done) return;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new wave starts one
  }, [waveKey]);

  // The frames: time moves on by the frame (at most 50 ms, so a hidden tab pauses the wave); the end is settled once
  // every bar is placed or lost, and the fading goes on after.
  useEffect(() => {
    if (phase !== "play") return;
    let [frame, last] = [0, performance.now()];
    const tick = (now: number) => {
      const s = sim.current;
      if (!tally.current.ended && tilesOver(s, drops)) fns.current.finish();
      sim.current = advanceTiles(s, drops, spec.fall, s.t + Math.min(50, now - last));
      last = now;
      redraw((n) => n + 1);
      if (tally.current.ended && !sim.current.tiles.length) return setPhase("idle");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, drops, spec.fall]);

  const send = (row: number) => {
    if (phase !== "play") return;
    const r = sendTo(sim.current, drops, spec.fall, row);
    sim.current = r.sim;
    if (r.event) fns.current.report(r.event);
    redraw((n) => n + 1);
  };

  const playing = phase !== "idle";
  const cleared = playing ? tally.current.cleared : d.cleared;
  const stars = tileStars(playing ? tally.current.jams : tileSlips(d.cleared, d.jams, spec.goal));
  const t = sim.current.t;
  const left = playing ? drops.length - sim.current.dropped : d.done ? 0 : drops.length;
  const next = lowest(sim.current);
  const marks = !playing && d.done && (d.rowsDone?.length || d.jammed?.length);

  const doneText = `${fill(w.done, { cleared: d.cleared, goal: spec.goal, jams: d.jams, stars: starText(stars) })}${stars === 1 && d.mode === "puzzle" ? ` ${g.oneStar}` : ""}`;
  const said = d.said;
  const line: Line =
    said?.kind === "notice" ? { tone: "notice", text: d.done ? `${w.notices[said.key]} ${doneText}` : w.notices[said.key] }
    : d.done ? { tone: tileSlips(d.cleared, d.jams, spec.goal) ? "near" : "ok", text: doneText }
    : said?.kind === "clear" ? { tone: "ok", text: fill(w.clear, { parts: said.parts }) }
    : said?.kind === "jam" ? { tone: "wrong", text: fill(w.jam, { parts: said.parts, sum: said.sum ?? "" }) }
    : said?.kind === "in" ? { tone: "hint", text: fill(w.inRow, { sum: said.sum }) }
    : { tone: "hint", text: fill(w.hint, { goal: spec.goal }) };

  const cx = ROW_X + ROW_W / 2;
  return (
    <>
      <GameHead game={game} g={g}>
        <span className="live-stake">
          <b aria-label={`${stars} ★`}>{starText(stars)}</b>
          {fill(w.tally, { cleared, goal: spec.goal, left })}
        </span>
      </GameHead>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={TILE_W} height={TILE_H_ALL} viewBox={`0 0 ${TILE_W} ${TILE_H_ALL}`} fontFamily={FONT} className="hand-pic"
          aria-label={fill(w.label, { goal: spec.goal })} style={{ touchAction: "none" }}>
          <defs>
            <clipPath id={clip}><rect width={TILE_W} height={TILE_H_ALL} /></clipPath>
          </defs>
          <rect width={TILE_W} height={TILE_H_ALL} fill="#fff" />
          {marks ? <Marks rowsDone={d.rowsDone ?? []} jammed={d.jammed ?? []} w={w} /> : (
            <g clipPath={`url(#${clip})`}>
              <line x1={ROW_X} y1={FLOOR} x2={ROW_X + ROW_W} y2={FLOOR} stroke="#dee2e6" strokeWidth={2} strokeDasharray="6 6" />
              <text x={ROW_X} y={FLOOR + 14} fontSize={13} fill={GRAY}>0</text>
              <text x={ROW_X + ROW_W} y={FLOOR + 14} fontSize={13} fill={GRAY} textAnchor="end">1</text>
              {Array.from({ length: ROWS }, (_, r) => {
                const y = rowY(r);
                const flash = tally.current.flash[r];
                const lit = playing && flash && t - flash.t < TILE_FADE ? flash : null;
                const parts = sim.current.rows[r];
                const sum = sumOf(parts);
                const tap = () => send(r);
                return (
                  <g key={r} data-row={r} role="button" tabIndex={phase === "play" ? 0 : -1} aria-label={fill(w.row, { k: r + 1 })}
                    style={{ cursor: phase === "play" ? "pointer" : "default" }} onPointerDown={(e) => { e.stopPropagation(); tap(); }}
                    onKeyDown={(e) => keyTap(e, tap)}>
                    <rect x={0} y={y - ROW_GAP_HALF} width={TILE_W} height={ROW_H + 2 * ROW_GAP_HALF} fill="transparent" />
                    <text x={ROW_X - 30} y={y + ROW_H / 2 + 7} fontSize={20} fontWeight={700} textAnchor="middle" fill={GRAY}>{r + 1}</text>
                    <rect x={ROW_X} y={y} width={ROW_W} height={ROW_H} rx={6} fill="#f8f9fa"
                      stroke={lit ? (lit.kind === "clear" ? GREEN : RED) : "#adb5bd"} strokeWidth={lit ? 5 : 2} />
                    <Bars x={ROW_X} y={y + 4} h={ROW_H - 8} parts={parts} />
                    {lit?.kind === "clear" && <Bars x={ROW_X} y={y + 4} h={ROW_H - 8} parts={lit.parts} edge={GREEN} opacity={1 - (t - lit.t) / TILE_FADE} />}
                    {lit?.kind === "jam" && lit.f && (
                      <g opacity={1 - (t - lit.t) / TILE_FADE}>
                        <Bars x={ROW_X + sumOf(lit.parts).toNumber() * ROW_W} y={y + 4} h={ROW_H - 8} parts={[lit.f]} edge={RED} />
                        <line x1={ROW_X + ROW_W} y1={y - 6} x2={ROW_X + ROW_W} y2={y + ROW_H + 6} stroke={RED} strokeWidth={3} />
                      </g>
                    )}
                    {parts.length > 0 && <text x={ROW_X + ROW_W + 12} y={y + ROW_H / 2 + 6} fontSize={16} fill={GRAY} pointerEvents="none">{`${sum.n}/${sum.d}`}</text>}
                  </g>
                );
              })}
              {sim.current.tiles.map((p) => {
                if (p.end?.kind === "placed") return null;
                const f = drops[p.i].f;
                const wd = f.toNumber() * ROW_W;
                const y = p.end ? p.end.y : tileY(drops[p.i], spec.fall, t);
                const first = next === p;
                return (
                  <g key={p.i} data-i={p.i} data-falling={p.end ? undefined : ""} pointerEvents="none"
                    opacity={p.end ? 1 - (t - p.end.t) / TILE_FADE : 1}>
                    <Bars x={cx - wd / 2} y={y - TILE_H / 2} h={TILE_H} parts={[f]} edge={p.end ? GRAY : first ? INK : undefined} />
                    {first && <text x={cx - wd / 2 - 10} y={y + 6} fontSize={18} textAnchor="end" fill={INK}>▶</text>}
                  </g>
                );
              })}
            </g>
          )}
          {/* The rows cleared so far, then the ones still to clear. */}
          {!marks && Array.from({ length: Math.max(spec.goal, cleared) }, (_, k) => (
            <rect key={k} x={14} y={14 + k * 22} width={40} height={14} rx={3} fill={k < cleared ? GREEN : "#fff"} stroke={k < cleared ? GREEN : "#ced4da"} strokeWidth={2} />
          ))}
          {!playing && !marks && (
            <g textAnchor="middle" fill={INK} pointerEvents="none">
              <text x={TILE_W / 2} y={60} fontSize={30} fontWeight={700}>{fill(w.goal, { goal: spec.goal })}</text>
              <text x={TILE_W / 2} y={88} fontSize={16} fill={GRAY}>{w.ready}</text>
            </g>
          )}
          {phase === "paused" && <text x={TILE_W / 2} y={100} fontSize={48} fontWeight={700} textAnchor="middle" fill={GRAY}>⏸</text>}
          {phase === "idle" && <Pill x={TILE_W / 2 - 60} y={marks ? TILE_H_ALL - 52 : 106} w={120} h={36} size={17} strong text={`▶ ${w.start}`} onTap={begin} />}
          {phase === "play" && <Pill x={TILE_W - 46} y={8} w={38} h={30} text="⏸" title={w.pause} onTap={() => setPhase("paused")} />}
          {phase === "paused" && <Pill x={TILE_W / 2 - 60} y={116} w={120} h={36} size={17} strong text={`▶ ${w.resume}`} onTap={() => setPhase("play")} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

const ROW_GAP_HALF = 10;

/** The wave's rows cleared on the left and jams on the right. */
function Marks({ rowsDone, jammed, w }: { rowsDone: string[]; jammed: string[]; w: PieceProps<"tileDrop">["w"]["tileDrop"] }) {
  const cols = [rowsDone.map((s) => `${s} = 1`), jammed];
  const rowH = Math.min(28, (TILE_H_ALL - 160) / Math.max(1, ...cols.map((c) => c.length)));
  return (
    <g fontWeight={700} pointerEvents="none">
      {cols.map((col, k) => (
        <g key={k} fill={k ? RED : GREEN}>
          <text x={24 + k * (TILE_W / 2)} y={40} fontSize={22}>{`${k ? "✗" : "✓"} ${k ? w.jammed : w.cleared}: ${col.length}`}</text>
          <line x1={24 + k * (TILE_W / 2)} x2={(k + 1) * (TILE_W / 2) - 16} y1={52} y2={52} stroke={k ? RED : GREEN} strokeWidth={2} opacity={0.4} />
          {col.map((s, i) => <text key={i} x={24 + k * (TILE_W / 2)} y={76 + i * rowH + rowH * 0.4} fontSize={Math.min(17, rowH * 0.75)}>{s}</text>)}
          {!col.length && <text x={24 + k * (TILE_W / 2)} y={90} fontSize={20} fill={GRAY}>—</text>}
        </g>
      ))}
    </g>
  );
}
