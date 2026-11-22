// Make one: fraction pieces, each a slice of a pie, fall down the stage; tap one to catch it into the basket, a pie of
// one whole at the bottom that fills slice by slice. Exactly one whole is a one made (a green pie joins the row of ones);
// past one the basket spills red, a slip. The wave in the air lives on the screen only (math/makeOne.ts moves it); the
// board keeps what it came to, down to every one made and every spill, shown on the stage once the wave is over. Built
// on the game shell (useGame): a one made is a step that leaves the streak alone, a spill a miss, and the end of the
// wave the win, clean when nothing slipped. A wave picked from the head starts at once; the first one waits for Start.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Frac } from "../math/fraction";
import {
  advance,
  catchAt,
  FADE,
  FLOOR,
  MAKE_H,
  MAKE_LADDER,
  MAKE_NOTICES,
  MAKE_W,
  makeNow,
  makeStars,
  oneNotice,
  PIECE_R,
  posAt,
  slipsOf,
  startSim,
  sumText,
  waveOver,
  type Drop,
  type LiveMakeOne,
  type MakeEvent,
  type Sim,
} from "../math/makeOne";
import { Pill } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const GREEN = "#2f9e44";
const RED = "#e03131";
const GRAY = "#868e96";
/** A colour for each bottom, so halves, thirds and quarters look apart. */
const HUE: Record<number, [string, string]> = {
  2: ["#a5d8ff", "#1971c2"], 3: ["#b2f2bb", "#2b8a3e"], 4: ["#ffd8a8", "#d9480f"], 5: ["#eebefa", "#9c36b5"],
  6: ["#ffec99", "#e67700"], 8: ["#fcc2d7", "#c2255c"], 10: ["#d0bfff", "#6741d9"], 12: ["#99e9f2", "#0c8599"],
};
const hue = (d: number) => HUE[d] ?? ["#dee2e6", "#495057"];
const BX = MAKE_W / 2;
const BY = MAKE_H - 46;
const BR = 40;
const FRESH: Partial<LiveMakeOne> = { done: false, made: 0, overs: 0, said: null, ones: [], spills: [] };
type Phase = "idle" | "play" | "paused";
type Tally = { made: number; overs: number; ended: boolean; ones: string[]; spills: string[]; flash: { t: number; kind: "one" | "over"; parts: Frac[] } | null };

/** A slice of a pie from `from` (in turns, clockwise from the top) for `size` turns. */
function slice(cx: number, cy: number, r: number, from: number, size: number) {
  const at = (u: number) => [cx + r * Math.sin(2 * Math.PI * u), cy - r * Math.cos(2 * Math.PI * u)];
  const [x0, y0] = at(from);
  const [x1, y1] = at(from + size);
  return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${size > 0.5 ? 1 : 0} 1 ${x1} ${y1} Z`;
}

/** Slices one after another round a pie, each in its bottom's colour. */
function Slices({ cx, cy, r, parts, edge }: { cx: number; cy: number; r: number; parts: Frac[]; edge?: string }) {
  let from = 0;
  return (
    <g>
      {parts.map((f, k) => {
        const size = f.toNumber();
        const p = slice(cx, cy, r, from, Math.min(size, 0.9999));
        from += size;
        return <path key={k} d={p} fill={hue(f.d)[0]} stroke={edge ?? hue(f.d)[1]} strokeWidth={1.5} />;
      })}
    </g>
  );
}

export function MakeOne({ state: d, set, w: words, svgRef }: PieceProps<"makeOne">) {
  const [w, g] = [words.makeOne, words.game];
  const game = useGame({ key: "zeno.makeone.v1", size: MAKE_LADDER.length, notices: MAKE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const { mode, stage, level, seed, timed } = d;
  const { spec, drops } = useMemo(() => makeNow({ mode, stage, level, seed, timed }), [mode, stage, level, seed, timed]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [, redraw] = useState(0);
  // The wave in the air and what it has come to: read and changed between frames and taps, so kept in refs.
  const sim = useRef<Sim>(startSim());
  const tally = useRef<Tally>({ made: 0, overs: 0, ended: false, ones: [], spills: [], flash: null });
  const latest = useRef({ game, d, set });
  useEffect(() => {
    latest.current = { game, d, set };
  });

  // A one made is a step that leaves the streak alone, a spill a miss; a piece in the basket is only said.
  const report = (e: MakeEvent) => {
    const t = tally.current;
    const { game, d, set } = latest.current;
    if (e.kind === "in") return set({ ...d, said: { kind: "in", sum: `${e.sum.n}/${e.sum.d}` } });
    t.flash = { t: sim.current.t, kind: e.kind, parts: e.parts };
    if (e.kind === "one") {
      t.made++;
      t.ones.push(sumText(e.parts));
      game.step({ made: t.made, overs: t.overs, said: { kind: "one", parts: sumText(e.parts) } }, { counts: false, notice: () => oneNotice(e.parts) });
    } else {
      t.overs++;
      t.spills.push(`${sumText(e.parts)} = ${e.sum.n}/${e.sum.d}`);
      game.miss({ made: t.made, overs: t.overs, said: { kind: "over", parts: sumText(e.parts), sum: `${e.sum.n}/${e.sum.d}` } });
    }
  };
  const finish = () => {
    const t = tally.current;
    t.ended = true;
    const slips = slipsOf(t.made, t.overs, spec.goal);
    latest.current.game.win({
      stars: makeStars(slips),
      clean: slips === 0,
      notice: (streak) => (streak === 10 ? "streak10" : null),
      patch: { done: true, made: t.made, overs: t.overs, said: null, ones: t.ones, spills: t.spills },
    });
  };
  const begin = () => {
    sim.current = startSim();
    tally.current = { made: 0, overs: 0, ended: false, ones: [], spills: [], flash: null };
    const { d, set } = latest.current;
    if (d.done || d.made || d.overs || d.said || d.ones?.length) set({ ...d, ...FRESH } as LiveMakeOne);
    setPhase("play");
  };
  const fns = useRef({ report, finish });
  useEffect(() => {
    fns.current = { report, finish };
  });

  // A wave picked from the head, or the next one, starts at once; the first one waits for Start.
  const waveKey = `${mode}.${stage}.${level}.${seed}.${!!timed}.${d.done}`;
  const shown = useRef(waveKey);
  useEffect(() => {
    if (shown.current === waveKey) return;
    shown.current = waveKey;
    if (d.done) return;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new wave starts one
  }, [waveKey]);

  // The frames: time moves on by the frame (at most 50 ms, so a hidden tab pauses the wave), the end is settled once
  // every piece is down, and the fading goes on after.
  useEffect(() => {
    if (phase !== "play") return;
    let [frame, last] = [0, performance.now()];
    const tick = (now: number) => {
      const s = sim.current;
      if (!tally.current.ended && waveOver(s, drops)) fns.current.finish();
      sim.current = advance(s, drops, spec.fall, s.t + Math.min(50, now - last));
      last = now;
      redraw((n) => n + 1);
      if (tally.current.ended && !sim.current.pieces.length) return setPhase("idle");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, drops, spec.fall]);

  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== "play" || !svgRef.current || e.button > 0) return;
    const [x, y] = svgPoint(svgRef.current, e);
    const r = catchAt(sim.current, drops, spec.fall, x, y);
    sim.current = r.sim;
    if (r.event) fns.current.report(r.event);
  };

  const playing = phase !== "idle";
  const made = playing ? tally.current.made : d.made;
  const overs = playing ? tally.current.overs : d.overs;
  const stars = makeStars(playing ? tally.current.overs : slipsOf(d.made, d.overs, spec.goal));
  const t = sim.current.t;
  const left = playing ? drops.length - sim.current.dropped : d.done ? 0 : drops.length;
  const flash = tally.current.flash && t - tally.current.flash.t < FADE && playing ? tally.current.flash : null;

  const doneText = `${fill(w.done, { made: d.made, goal: spec.goal, overs: d.overs, stars: starText(stars) })}${stars === 1 && d.mode === "puzzle" ? ` ${g.oneStar}` : ""}`;
  const said = d.said;
  const line: Line =
    said?.kind === "notice" ? { tone: "notice", text: d.done ? `${w.notices[said.key]} ${doneText}` : w.notices[said.key] }
    : d.done ? { tone: slipsOf(d.made, d.overs, spec.goal) ? "near" : "ok", text: doneText }
    : said?.kind === "one" ? { tone: "ok", text: fill(w.one, { parts: said.parts }) }
    : said?.kind === "over" ? { tone: "wrong", text: fill(w.over, { parts: said.parts, sum: said.sum ?? "" }) }
    : said?.kind === "in" ? { tone: "hint", text: fill(w.inBasket, { sum: said.sum }) }
    : { tone: "hint", text: fill(w.hint, { goal: spec.goal }) };

  return (
    <>
      <GameHead game={game} g={g}>
        <span className="live-stake">
          <b aria-label={`${stars} ★`}>{starText(stars)}</b>
          {fill(w.tally, { made, goal: spec.goal, left })}
        </span>
      </GameHead>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={MAKE_W} height={MAKE_H} viewBox={`0 0 ${MAKE_W} ${MAKE_H}`} fontFamily={FONT} className="hand-pic"
          aria-label={fill(w.label, { goal: spec.goal })} onPointerDown={down} style={{ cursor: phase === "play" ? "pointer" : "default", touchAction: "none" }}>
          <rect width={MAKE_W} height={MAKE_H} fill="#fff" />
          <line x1={0} y1={FLOOR + PIECE_R} x2={MAKE_W} y2={FLOOR + PIECE_R} stroke="#dee2e6" strokeWidth={2} strokeDasharray="6 6" />
          {!playing && d.done && (d.ones?.length || d.spills?.length) ? <Marks ones={d.ones ?? []} spills={d.spills ?? []} w={w} /> : !playing && (
            <g textAnchor="middle" fill={INK}>
              <text x={MAKE_W / 2} y={MAKE_H / 2 - 40} fontSize={44} fontWeight={700}>{d.done ? `1 × ${d.made}   ✗ ${d.overs}` : fill(w.goal, { goal: spec.goal })}</text>
              <text x={MAKE_W / 2} y={MAKE_H / 2 - 6} fontSize={18} fill={GRAY}>{d.done ? "" : w.ready}</text>
            </g>
          )}
          {sim.current.pieces.map((p) => <PieceView key={p.i} i={p.i} drop={drops[p.i]} end={p.end} t={t} fall={spec.fall} />)}
          {/* The ones made so far, then the ones still to make, as pies along the bottom left. */}
          {Array.from({ length: Math.max(spec.goal, made) }, (_, k) => (
            <circle key={k} cx={30 + k * 34} cy={BY + 18} r={14} fill={k < made ? GREEN : "#fff"} stroke={k < made ? GREEN : "#ced4da"} strokeWidth={2} />
          ))}
          {/* The basket: a pie of one whole, filling. */}
          <g pointerEvents="none">
            <circle cx={BX} cy={BY} r={BR + 4} fill="#fff" stroke={flash ? (flash.kind === "one" ? GREEN : RED) : "#adb5bd"} strokeWidth={flash ? 6 : 2.5} />
            <Slices cx={BX} cy={BY} r={BR} parts={flash ? flash.parts.filter((_, k, a) => flash.kind === "one" || sumOfFirst(a, k + 1) <= 1) : sim.current.basket} edge={flash?.kind === "over" ? RED : undefined} />
            {flash?.kind === "over" && <text x={BX + BR + 14} y={BY + 8} fontSize={26}>💧</text>}
            <text x={BX + BR + 16} y={BY - BR + 14} fontSize={15} fill={GRAY}>{w.basket}</text>
          </g>
          {overs > 0 && playing && <text x={MAKE_W - 16} y={BY + 24} fontSize={16} fontWeight={700} textAnchor="end" fill={RED}>{`✗ ${overs}`}</text>}
          {phase === "paused" && <text x={MAKE_W / 2} y={MAKE_H / 2} fontSize={48} fontWeight={700} textAnchor="middle" fill={GRAY}>⏸</text>}
          {phase === "idle" && <Pill x={MAKE_W / 2 - 60} y={d.done && (d.ones?.length || d.spills?.length) ? FLOOR - 26 : MAKE_H / 2 + 20} w={120} h={36} size={17} strong text={`▶ ${w.start}`} onTap={begin} />}
          {phase === "play" && <Pill x={MAKE_W - 46} y={8} w={38} h={30} text="⏸" title={w.pause} onTap={() => setPhase("paused")} />}
          {phase === "paused" && <Pill x={MAKE_W / 2 - 60} y={MAKE_H / 2 + 24} w={120} h={36} size={17} strong text={`▶ ${w.resume}`} onTap={() => setPhase("play")} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

const sumOfFirst = (fs: Frac[], k: number) => fs.slice(0, k).reduce((s, f) => s + f.toNumber(), 0) - 1e-9;

/** A piece falling (a slice of a pie, its fraction on it), or one going: caught (shrinking toward the basket) or lost. */
function PieceView({ i, drop, end, t, fall }: { i: number; drop: Drop; end: { kind: "caught" | "fell"; t: number; at: [number, number] } | null; t: number; fall: number }) {
  const [light, dark] = hue(drop.f.d);
  const label = `${drop.f.n}/${drop.f.d}`;
  if (!end) {
    const [x, y] = posAt(drop, fall, t);
    return (
      <g data-n={drop.f.n} data-d={drop.f.d} data-i={i} data-falling="">
        <circle cx={x} cy={y} r={PIECE_R} fill="#fff" stroke="#ced4da" strokeWidth={1.5} />
        <path d={slice(x, y, PIECE_R, 0, drop.f.toNumber())} fill={light} stroke={dark} strokeWidth={2} />
        <rect x={x - 18} y={y - 11} width={36} height={22} rx={6} fill="#fff" opacity={0.9} />
        <text x={x} y={y + 6} fontSize={16} fontWeight={700} textAnchor="middle" fill={INK}>{label}</text>
      </g>
    );
  }
  const age = Math.min(1, (t - end.t) / FADE);
  const [x0, y0] = end.at;
  if (end.kind === "fell") return <text x={x0} y={y0 + PIECE_R} opacity={1 - age} fontSize={16} textAnchor="middle" fill={GRAY}>{label}</text>;
  const [x, y] = [x0 + (BX - x0) * age, y0 + (BY - y0) * age];
  return <path d={slice(x, y, PIECE_R * (1 - 0.6 * age), 0, drop.f.toNumber())} fill={light} stroke={dark} strokeWidth={2} opacity={1 - age * 0.7} />;
}

/** The wave's ones made on the left and spills on the right. */
function Marks({ ones, spills, w }: { ones: string[]; spills: string[]; w: PieceProps<"makeOne">["w"]["makeOne"] }) {
  const cols = [ones.map((s) => `${s} = 1`), spills];
  const rowH = Math.min(28, (FLOOR - 100) / Math.max(1, ...cols.map((c) => c.length)));
  return (
    <g fontWeight={700}>
      {cols.map((col, k) => (
        <g key={k} fill={k ? RED : GREEN}>
          <text x={24 + k * (MAKE_W / 2)} y={40} fontSize={22}>{`${k ? "✗" : "✓"} ${k ? w.spilled : w.made}: ${col.length}`}</text>
          <line x1={24 + k * (MAKE_W / 2)} x2={(k + 1) * (MAKE_W / 2) - 16} y1={52} y2={52} stroke={k ? RED : GREEN} strokeWidth={2} opacity={0.4} />
          {col.map((s, i) => <text key={i} x={24 + k * (MAKE_W / 2)} y={76 + i * rowH + rowH * 0.4} fontSize={Math.min(18, rowH * 0.75)}>{s}</text>)}
          {!col.length && <text x={24 + k * (MAKE_W / 2)} y={90} fontSize={20} fill={GRAY}>—</text>}
        </g>
      ))}
    </g>
  );
}
