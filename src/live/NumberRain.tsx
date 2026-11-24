// Number rain: tiles with a number fact on each fall down the stage; the ringed one, nearest to landing, is answered
// on the digit tiles under the stage (or the keyboard) before it lands. A right answer clears it; a wrong one shakes
// the stage and the tile falls on; a tile that lands stays as a block with its answer on it. A fact missed comes back
// once (ringed in orange) and, got right then, its block goes. The wave in the air lives on the screen only
// (math/numberRain.ts moves it), and the board keeps what it came to, down to which facts were right and which are
// still to learn, shown on the stage once the wave is over. Every answer goes into the learner's book of facts
// (math/facts.ts), which the endless run draws from, the weak facts most. Two games share this piece, + − and × ÷,
// each with its own ladder. Built on the game shell (useGame): a right answer is a step that leaves the streak alone,
// a slip a miss, and the end of the wave the win, clean when nothing slipped. In calm the tiles fall half as fast
// again more slowly. A wave picked from the head starts at once; the first one waits for Start.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { learn, poolOf, type FactBook } from "../math/facts";
import {
  advance,
  answer,
  floorOf,
  markUp,
  RAIN_COLS,
  RAIN_FADE,
  RAIN_H,
  RAIN_LADDERS,
  RAIN_NOTICES,
  RAIN_W,
  rainNow,
  rainStars,
  saidOf,
  shown,
  startSim,
  targetOf,
  TILE_H,
  TILE_W,
  tileY,
  waveOver,
  type LiveRain,
  type RainDeck,
  type RainEvent,
  type RainMark,
  type RainNotice,
  type RainSpec,
  type Sim,
  type Tile,
} from "../math/numberRain";
import { DigitPad, PAD_H } from "./DigitPad";
import { keepBook, loadBook } from "./factBook";
import { useFeel } from "./feel";
import { BLUE, GREEN, MUTED, Pill, RED } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const ORANGE = "#e8590c";
const PAD_W = 440;
const PAD_Y = RAIN_H + 14;
const FRESH: Partial<LiveRain> = { done: false, right: 0, quick: 0, slips: 0, said: null, marks: [] };
/** Where each game keeps its ladder in this browser (model/gameKeys.ts says the same). */
const LADDER: Record<RainDeck, { key: string }> = { plus: { key: "zeno.rainplus.v1" }, times: { key: "zeno.raintimes.v1" } };
type Phase = "idle" | "play" | "paused";
type Tally = { right: number; quick: number; slips: number; run: number; ended: boolean; marks: RainMark[] };
const NO_TALLY = (): Tally => ({ right: 0, quick: 0, slips: 0, run: 0, ended: false, marks: [] });
type RainProps = PieceProps<"rainPlus"> | PieceProps<"rainTimes">;
const colX = (col: number) => col * (RAIN_W / RAIN_COLS) + (RAIN_W / RAIN_COLS - TILE_W) / 2;

export function NumberRain({ state: d, set, w: words, svgRef }: RainProps) {
  const [w, g] = [words.rain, words.game];
  const deck = d.deck;
  const game = useGame({ ...LADDER[deck], size: RAIN_LADDERS[deck].length, notices: RAIN_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const calm = useFeel() === "calm";
  const { mode, stage, level, seed, timed } = d;
  // The wave as it is shown before it starts; the one played is drawn at Start, with the book as it is then.
  const shownWave = useMemo(() => rainNow({ deck, mode, stage, level, seed, timed }, { calm }), [deck, mode, stage, level, seed, timed, calm]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState("");
  const [, redraw] = useState(0);
  // The wave in the air, its pace, what it has come to so far and the book of facts: read and changed between frames
  // and key presses, so kept in refs; each frame draws them afresh.
  const sim = useRef<Sim>(startSim([]));
  const pace = useRef<RainSpec>(shownWave.spec);
  const tally = useRef<Tally>(NO_TALLY());
  const book = useRef<FactBook | null>(null);
  const latest = useRef({ game, d, set, calm });
  useEffect(() => {
    latest.current = { game, d, set, calm };
  });

  // What happened goes to the book and to the shell: a slip is a miss, a right answer a step (which does not move the
  // streak). The counts are sent whole, so a frame drawn before the board has caught up loses nothing.
  const report = (events: RainEvent[]) => {
    if (!events.length) return;
    const t = tally.current;
    let notice: RainNotice | null = null;
    for (const e of events) {
      t.marks = markUp(t.marks, e);
      const slip = (e.kind === "wrong" || e.kind === "landed") && e.slip;
      if (slip) book.current = learn(book.current ?? {}, e.fact.key, false);
      if (e.kind === "right") book.current = learn(book.current ?? {}, e.fact.key, true, e.ms);
      if (slip) t.slips++;
      if (e.kind === "right" && !e.again) {
        t.right++;
        if (e.quick) t.quick++;
      }
      if (e.kind === "right") {
        t.run = e.quick ? t.run + 1 : 0;
        if (e.dug) notice = "dug";
        else if (t.run === 5) notice = "quick5";
      } else t.run = 0;
    }
    if (book.current) keepBook(book.current);
    const patch = { right: t.right, quick: t.quick, slips: t.slips };
    const { game } = latest.current;
    const wrong = events.find((e) => e.kind === "wrong" || (e.kind === "landed" && e.slip));
    const last = events[events.length - 1];
    if (wrong) game.miss({ ...patch, said: saidOf(wrong) });
    else if (last.kind === "right") game.step({ ...patch, said: saidOf(last) }, { counts: false, notice: () => notice });
    else game.tap({ ...patch, said: saidOf(last) });
  };
  const finish = () => {
    const t = tally.current;
    t.ended = true;
    latest.current.game.win({
      stars: rainStars(t.slips),
      clean: t.slips === 0,
      notice: (streak) => (t.slips === 0 && t.quick === t.right ? "allQuick" : streak === 10 ? "streak10" : null),
      patch: { done: true, right: t.right, quick: t.quick, slips: t.slips, said: null, marks: t.marks },
    });
  };
  const begin = () => {
    const { d, set, calm } = latest.current;
    book.current ??= loadBook();
    const run = rainNow(d, { book: book.current, calm });
    sim.current = startSim(run.drops);
    pace.current = run.spec;
    tally.current = NO_TALLY();
    setTyped("");
    if (d.done || d.right || d.slips || d.said || d.marks?.length) set({ ...d, ...FRESH } as LiveRain);
    setPhase("play");
    toSlot();
  };
  // The keys go to the answer slot from the start, and again after a pause (the pill pressed is gone by then).
  const toSlot = () => requestAnimationFrame(() => svgRef.current?.querySelector<SVGGElement>('[role="textbox"]')?.focus());
  const resume = () => {
    setPhase("play");
    toSlot();
  };
  const fns = useRef({ report, finish });
  useEffect(() => {
    fns.current = { report, finish };
  });

  // A wave picked from the head, or the next one, starts at once; the first one waits for Start.
  const waveKey = `${mode}.${stage}.${level}.${seed}.${!!timed}.${d.done}`;
  const shownKey = useRef(waveKey);
  useEffect(() => {
    if (shownKey.current === waveKey) return;
    shownKey.current = waveKey;
    if (d.done) return;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new wave starts one
  }, [waveKey]);

  // The frames: time moves on by the frame (at most 50 ms, so a hidden tab pauses the wave rather than landing it),
  // the end is settled once the board has caught up with the last frame's slips, and the fading goes on after.
  useEffect(() => {
    if (phase !== "play") return;
    let [frame, last] = [0, performance.now()];
    const tick = (now: number) => {
      const s = sim.current;
      if (!tally.current.ended && waveOver(s)) fns.current.finish();
      const next = advance(s, pace.current, s.t + Math.min(50, now - last));
      last = now;
      sim.current = next.sim;
      fns.current.report(next.events);
      redraw((n) => n + 1);
      if (tally.current.ended && !next.sim.tiles.length) return setPhase("idle");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // What is typed is judged at once, digit by digit.
  const enter = (v: string) => {
    if (phase !== "play") return;
    const r = answer(sim.current, v, pace.current);
    sim.current = r.sim;
    setTyped(r.entry);
    report(r.events);
  };
  // A digit pressed anywhere in the piece goes to the answer (the slot has its own keys while it has the focus; a tap
  // on the stage gives the focus to the picture), so the board around never takes it for a tool of its own.
  const keys = (e: KeyboardEvent) => {
    if (phase !== "play") return;
    if (/^[0-9]$/.test(e.key)) enter(typed + e.key);
    else if (e.key === "Backspace" || e.key === "Delete") setTyped(typed.slice(0, -1));
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const playing = phase !== "idle";
  const counts = playing ? tally.current : d;
  const stars = rainStars(counts.slips);
  const s = sim.current;
  const fall = pace.current.fall;
  const left = playing ? s.queue.length - s.dropped + s.tiles.filter((x) => !x.end).length : d.done ? 0 : shownWave.spec.count;
  const target = playing ? targetOf(s) : null;
  // One fact of each kind in the wave, to say what is coming.
  const samples = useMemo(() => shownWave.spec.families.slice(0, 3).map((f) => poolOf([f])).map((p) => p[Math.floor(p.length / 2)].text), [shownWave]);

  const done = d.mode === "endless" ? (d.slips ? fill(w.slipped, { n: d.slips }) : fill(w.clean, { right: d.right, quick: d.quick })) : `${fill(w.done, { right: d.right, quick: d.quick, slips: d.slips, stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}`;
  const said = d.said;
  const line: Line =
    said?.kind === "notice" ? { tone: "notice", text: d.done ? `${w.notices[said.key]} ${done}` : w.notices[said.key] }
    : d.done ? { tone: d.slips ? "near" : "ok", text: done }
    : said?.kind === "right" ? { tone: "ok", text: fill(said.dug ? w.dug : said.quick ? w.rightQuick : w.right, { fact: shown(said.text, said.answer) }) }
    : said?.kind === "fixed" ? { tone: "near", text: fill(w.fixed, { fact: shown(said.text, said.answer) }) }
    : said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong, { text: said.text, typed: said.typed }) }
    : said?.kind === "landed" ? { tone: "wrong", text: fill(w.landed, { fact: shown(said.text, said.answer) }) }
    : { tone: "hint", text: w.hint };

  return (
    <>
      <GameHead game={game} g={g}>
        <span className="live-stake">
          <b aria-label={`${stars} ★`}>{starText(stars)}</b>
          {fill(w.tally, { right: counts.right, left })}
        </span>
      </GameHead>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={RAIN_W} height={PAD_Y + PAD_H} viewBox={`0 0 ${RAIN_W} ${PAD_Y + PAD_H}`} fontFamily={FONT} className="hand-pic" aria-label={w.label} tabIndex={-1} onKeyDown={keys} style={{ touchAction: "none" }}>
          <rect width={RAIN_W} height={RAIN_H} fill="#fff" />
          <line x1={0} x2={RAIN_W} y1={RAIN_H} y2={RAIN_H} stroke={INK} strokeWidth={2} />
          {!playing && d.done && d.marks?.length ? (
            <Marks marks={d.marks} w={w} />
          ) : (
            !playing && (
              <g textAnchor="middle" fill={INK}>
                <text x={RAIN_W / 2} y={RAIN_H / 2 - 30} fontSize={34} fontWeight={700}>{samples.join("     ")}</text>
                <text x={RAIN_W / 2} y={RAIN_H / 2 + 10} fontSize={19} fill={MUTED}>{w.ready}</text>
              </g>
            )
          )}
          {playing && s.stacks.map((st, col) => st.map((f, i) => <Block key={`${col}.${i}.${f.key}`} x={colX(col)} y={RAIN_H - (i + 1) * TILE_H} text={shown(f.text, f.answer)} />))}
          {playing && s.tiles.map((x) => <TileView key={x.id} x={x} t={s.t} fall={fall} target={x.id === target?.id} floor={floorOf(s, x.col)} />)}
          {phase === "paused" && <text x={RAIN_W / 2} y={RAIN_H / 2} fontSize={48} fontWeight={700} textAnchor="middle" fill={MUTED}>⏸</text>}
          {/* Start, pause and go on, in the picture. */}
          {phase === "idle" && <Pill x={RAIN_W / 2 - 60} y={d.done && d.marks?.length ? RAIN_H - 44 : RAIN_H / 2 + 36} w={120} h={36} size={17} strong text={`▶ ${w.start}`} onTap={begin} />}
          {/* Pause sits beside the answer slot, clear of the tiles. */}
          {phase === "play" && <Pill x={(RAIN_W - PAD_W) / 2 + 184} y={PAD_Y + 10} w={38} h={30} text="⏸" title={w.pause} onTap={() => setPhase("paused")} />}
          {phase === "paused" && <Pill x={RAIN_W / 2 - 60} y={RAIN_H / 2 + 24} w={120} h={36} size={17} strong text={`▶ ${w.resume}`} onTap={resume} />}
          <DigitPad x={(RAIN_W - PAD_W) / 2} y={PAD_Y} w={PAD_W} value={typed} onChange={enter} label={w.answer} erase={w.erase} disabled={phase !== "play"} />
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

/** A fact on its way down: the target ringed in blue, one tried wrong in red, a missed fact come back ringed in orange; or one just answered, floating off. */
function TileView({ x, t, fall, target, floor }: { x: Tile; t: number; fall: number; target: boolean; floor: number }) {
  const left = colX(x.col);
  const text = (y: number, size: number, color: string, s: string) => (
    <text x={left + TILE_W / 2} y={y + TILE_H / 2 + size * 0.35} fontSize={size} fontWeight={700} textAnchor="middle" fill={color}>{s}</text>
  );
  if (x.end) {
    // A tile that landed is its block already.
    if (x.end.kind === "landed") return null;
    const age = (t - x.end.t) / RAIN_FADE;
    return <g opacity={Math.max(0, 1 - age)}>{text(Math.max(0, x.end.y - age * 26), 19, x.end.kind === "right" ? GREEN : ORANGE, `${shown(x.fact.text, x.fact.answer)} ${x.end.kind === "right" ? "✓" : ""}`)}</g>;
  }
  const y = Math.min(tileY(x, t, fall), floor - TILE_H);
  const [line, paper] = x.tried ? [RED, "#fff5f5"] : target ? [BLUE, "#e7f5ff"] : ["#adb5bd", "#f8f9fa"];
  const size = x.fact.text.length > 10 ? 18 : 21;
  return (
    <g data-id={x.id} data-fact={x.fact.text} data-again={x.again ? "" : undefined} data-target={target ? "" : undefined} opacity={Math.min(1, (t - x.t0) / 200)}>
      {x.again && <rect x={left - 5} y={y - 5} width={TILE_W + 10} height={TILE_H + 10} rx={12} fill="none" stroke={ORANGE} strokeWidth={2} strokeDasharray="5 4" />}
      <rect x={left} y={y} width={TILE_W} height={TILE_H - 4} rx={8} fill={paper} stroke={line} strokeWidth={target || x.tried ? 3 : 1.5} />
      {text(y - 2, size, target || x.tried ? INK : MUTED, x.fact.text)}
    </g>
  );
}

/** A fact that landed, its answer on it. */
function Block({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g data-block="">
      <rect x={x} y={y + 2} width={TILE_W} height={TILE_H - 4} rx={4} fill="#fff5f5" stroke={RED} strokeWidth={1.5} opacity={0.9} />
      <text x={x + TILE_W / 2} y={y + TILE_H / 2 + 6} fontSize={text.length > 12 ? 15 : 17} fontWeight={700} textAnchor="middle" fill={RED}>{text}</text>
    </g>
  );
}

/** The wave's facts, those right at once on the left (a quick one marked ⚡) and those still to learn on the right, each with its answer. */
function Marks({ marks, w }: { marks: RainMark[]; w: RainProps["w"]["rain"] }) {
  const cols = [marks.filter((m) => m.ok), marks.filter((m) => !m.ok)];
  const rowH = Math.min(28, (RAIN_H - 76 - 50) / Math.max(1, ...cols.map((c) => c.length)));
  return (
    <g fontWeight={700}>
      {cols.map((col, k) => (
        <g key={k} fill={k ? RED : GREEN}>
          <text x={24 + k * (RAIN_W / 2)} y={40} fontSize={24}>{`${k ? "✗" : "✓"} ${k ? w.wrongCol : w.rightCol}: ${col.length}`}</text>
          <line x1={24 + k * (RAIN_W / 2)} x2={(k + 1) * (RAIN_W / 2) - 16} y1={52} y2={52} stroke={k ? RED : GREEN} strokeWidth={2} opacity={0.4} />
          {col.map((m, i) => (
            <text key={m.text} x={24 + k * (RAIN_W / 2)} y={76 + i * rowH + rowH * 0.4} fontSize={Math.min(20, rowH * 0.78)}>
              {`${shown(m.text, m.answer)}${m.quick ? "  ⚡" : ""}`}
              {m.mended && <tspan fontSize={14} fill={GREEN}>{`  · ${w.mended} ✓`}</tspan>}
            </text>
          ))}
          {!col.length && <text x={24 + k * (RAIN_W / 2)} y={90} fontSize={20} fill={MUTED}>—</text>}
        </g>
      ))}
    </g>
  );
}
