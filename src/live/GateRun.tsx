// Gate run: a road of three lanes seen from behind the runner, a number fact on the sign overhead, and a row of three
// gates coming up the road with a number on each. A lane tapped (or its number pressed) sends the runner dashing
// through that gate; the arrow keys steer, and ↑ dashes for the lane the runner is in. The right gate turns green; a
// wrong one red, with the right one shown, and the fact comes back once after the rest (its sign ringed in orange).
// The run on the road lives on the screen only (math/gateRun.ts moves it), and the board keeps what it came to, down
// to which facts were right and which are still to learn, listed on the stage once the run is over. Every gate goes
// into the learner's book of facts (math/facts.ts), which the endless run draws from. Two games share this piece,
// + − and × ÷, each with its own ladder. Built on the game shell (useGame): the right gate is a step that leaves the
// streak alone, a wrong one a miss, and the end of the run the win, clean when nothing slipped. In calm the gates come
// half as fast again more slowly. A run picked from the head starts at once; the first one waits for Start.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { learn, markFact, poolOf, shown, type FactBook, type FactMark } from "../math/facts";
import {
  advance,
  dash,
  depth,
  onRoad,
  REST,
  RUN_LADDERS,
  RUN_LANES,
  RUN_NOTICES,
  runNow,
  runOver,
  runStars,
  saidOf,
  startSim,
  steer,
  type LiveRun,
  type RunDeck,
  type RunEvent,
  type RunNotice,
  type Sim,
} from "../math/gateRun";
import { keepBook, loadBook } from "./factBook";
import { FactMarks } from "./FactMarks";
import { useFeel } from "./feel";
import { BLUE, GREEN, MUTED, Pill, RED } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const [W, H] = [600, 380];
const ORANGE = "#e8590c";
/** The road: from the horizon, half as wide, to the bottom of the stage; the runner stands at RUNNER_Y. */
const [HORIZON, RUNNER_Y, FAR, NEAR] = [104, 306, 130, 260];
const halfAt = (y: number) => FAR + ((NEAR - FAR) * (y - HORIZON)) / (H - HORIZON);
const laneX = (lane: number, y: number) => W / 2 + (lane - (RUN_LANES - 1) / 2) * ((2 * halfAt(y)) / RUN_LANES);
/** Where a row at depth z (1 at the horizon, 0 at the runner) stands, and how big it is drawn there (1 at the runner). */
const rowY = (z: number) => HORIZON + (RUNNER_Y - HORIZON) * (2 / (1 + z) - 1);
const scaleAt = (y: number) => halfAt(y) / halfAt(RUNNER_Y);

const FRESH: Partial<LiveRun> = { done: false, right: 0, quick: 0, slips: 0, said: null, marks: [] };
/** Where each game keeps its ladder in this browser (model/gameKeys.ts says the same). */
const LADDER: Record<RunDeck, { key: string }> = { plus: { key: "zeno.runplus.v1" }, times: { key: "zeno.runtimes.v1" } };
type Phase = "idle" | "play" | "paused";
type Tally = { right: number; quick: number; slips: number; run: number; ended: boolean; marks: FactMark[] };
const NO_TALLY = (): Tally => ({ right: 0, quick: 0, slips: 0, run: 0, ended: false, marks: [] });
type RunProps = PieceProps<"runPlus"> | PieceProps<"runTimes">;

export function GateRun({ state: d, set, w: words, svgRef }: RunProps) {
  // The words every fact game says alike (Start, the two columns of the list) are number rain's.
  const [w, shared, g] = [words.run, words.rain, words.game];
  const deck = d.deck;
  const game = useGame({ ...LADDER[deck], size: RUN_LADDERS[deck].length, notices: RUN_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const calm = useFeel() === "calm";
  const { mode, stage, level, seed, timed } = d;
  // The run as it is shown before it starts; the one played is drawn at Start, with the book as it is then.
  const shownRun = useMemo(() => runNow({ deck, mode, stage, level, seed, timed }, { calm }), [deck, mode, stage, level, seed, timed, calm]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [, redraw] = useState(0);
  const sim = useRef<Sim>(startSim([]));
  const travel = useRef(shownRun.spec.travel);
  const tally = useRef<Tally>(NO_TALLY());
  const book = useRef<FactBook | null>(null);
  const latest = useRef({ game, d, set, calm });
  useEffect(() => {
    latest.current = { game, d, set, calm };
  });

  // What happened goes to the book and to the shell: a wrong gate is a miss, the right one a step (which does not
  // move the streak). The counts are sent whole, so a frame drawn before the board has caught up loses nothing.
  const report = (events: RunEvent[]) => {
    if (!events.length) return;
    const t = tally.current;
    let notice: RunNotice | null = null;
    for (const e of events) {
      const ok = e.kind === "right";
      t.marks = markFact(t.marks, { fact: e.fact, ok, quick: ok && e.quick, again: e.again });
      book.current = learn(book.current ?? {}, e.fact.key, ok, ok ? e.ms : 0);
      if (!ok) t.slips++;
      else if (!e.again) {
        t.right++;
        if (e.quick) t.quick++;
      }
      t.run = ok && e.quick ? t.run + 1 : 0;
      if (ok && e.again) notice = "mended";
      else if (t.run === 5) notice = "quick5";
    }
    if (book.current) keepBook(book.current);
    const patch = { right: t.right, quick: t.quick, slips: t.slips };
    const { game } = latest.current;
    const wrong = events.find((e) => e.kind === "wrong");
    if (wrong) game.miss({ ...patch, said: saidOf(wrong) });
    else game.step({ ...patch, said: saidOf(events[events.length - 1]) }, { counts: false, notice: () => notice });
  };
  const finish = () => {
    const t = tally.current;
    t.ended = true;
    latest.current.game.win({
      stars: runStars(t.slips),
      clean: t.slips === 0,
      notice: (streak) => (t.slips === 0 && t.quick === t.right ? "allQuick" : streak === 10 ? "streak10" : null),
      patch: { done: true, right: t.right, quick: t.quick, slips: t.slips, said: null, marks: t.marks },
    });
  };
  // The keys go to the picture from the start, and again after a pause (the pill pressed is gone by then).
  const toStage = () => requestAnimationFrame(() => svgRef.current?.focus());
  const begin = () => {
    const { d, set, calm } = latest.current;
    book.current ??= loadBook();
    const run = runNow(d, { book: book.current, calm });
    sim.current = startSim(run.gates);
    travel.current = run.spec.travel;
    tally.current = NO_TALLY();
    if (d.done || d.right || d.slips || d.said || d.marks?.length) set({ ...d, ...FRESH } as LiveRun);
    setPhase("play");
    toStage();
  };
  const resume = () => {
    setPhase("play");
    toStage();
  };
  const fns = useRef({ report, finish });
  useEffect(() => {
    fns.current = { report, finish };
  });

  // A run picked from the head, or the next one, starts at once; the first one waits for Start.
  const runKey = `${mode}.${stage}.${level}.${seed}.${!!timed}.${d.done}`;
  const shownKey = useRef(runKey);
  useEffect(() => {
    if (shownKey.current === runKey) return;
    shownKey.current = runKey;
    if (d.done) return;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new run starts one
  }, [runKey]);

  // The frames: time moves on by the frame (at most 50 ms, so a hidden tab pauses the run), the end is settled once
  // the board has caught up with the last gate, and the last row is left to be seen for a moment after.
  useEffect(() => {
    if (phase !== "play") return;
    let [frame, last] = [0, performance.now()];
    const tick = (now: number) => {
      const s = sim.current;
      if (!tally.current.ended && runOver(s)) fns.current.finish();
      const next = advance(s, { travel: travel.current }, s.t + Math.min(50, now - last));
      last = now;
      sim.current = next.sim;
      fns.current.report(next.events);
      redraw((n) => n + 1);
      if (tally.current.ended && next.sim.passed && next.sim.t - next.sim.passed.t > REST) return setPhase("idle");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const move = (lane: number) => {
    if (phase === "play") sim.current = steer(sim.current, lane);
  };
  const go = () => {
    if (phase === "play") sim.current = dash(sim.current);
  };
  /** A lane picked outright: the runner goes there and dashes. */
  const pick = (lane: number) => {
    move(lane);
    go();
  };
  const keys = (e: KeyboardEvent) => {
    if (phase !== "play") return;
    const lane = sim.current.lane;
    if (e.key === "ArrowLeft") move(lane - 1);
    else if (e.key === "ArrowRight") move(lane + 1);
    else if (e.key === "ArrowUp" || e.key === " " || e.key === "Enter") go();
    else if (/^[1-3]$/.test(e.key)) pick(Number(e.key) - 1);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const playing = phase !== "idle";
  const counts = playing ? tally.current : d;
  const stars = runStars(counts.slips);
  const s = sim.current;
  const left = playing ? s.gates.length - s.at : d.done ? 0 : shownRun.spec.count;
  const row = playing ? onRoad(s) : null;
  // The row just passed stays where the runner is while it is seen.
  const past = playing && s.passed && s.t - s.passed.t <= REST ? s.passed : null;
  const z = row ? depth(s, travel.current) : 0;
  const y = rowY(z);
  // One fact of each kind in the run, to say what is coming.
  const samples = useMemo(() => shownRun.spec.families.slice(0, 3).map((f) => poolOf([f])).map((p) => p[Math.floor(p.length / 2)].text), [shownRun]);

  const done = d.mode === "endless" ? (d.slips ? fill(w.slipped, { n: d.slips }) : fill(w.clean, { right: d.right, quick: d.quick })) : `${fill(w.done, { right: d.right, quick: d.quick, slips: d.slips, stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}`;
  const said = d.said;
  const line: Line =
    said?.kind === "notice" ? { tone: "notice", text: d.done ? `${w.notices[said.key]} ${done}` : w.notices[said.key] }
    : d.done ? { tone: d.slips ? "near" : "ok", text: done }
    : said?.kind === "right" ? { tone: "ok", text: fill(said.again ? w.mended : said.quick ? w.rightQuick : w.right, { fact: shown(said.text, said.answer) }) }
    : said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong, { picked: said.picked, fact: shown(said.text, said.answer) }) }
    : { tone: "hint", text: w.hint };
  const sign = row ? { text: row.fact.text, color: INK, again: row.again } : past ? { text: shown(past.gate.fact.text, past.gate.fact.answer), color: past.ok ? GREEN : RED, again: false } : null;
  const lanes = Array.from({ length: RUN_LANES }, (_, l) => l);
  const edge = (k: number, yy: number) => W / 2 + (k - RUN_LANES / 2) * ((2 * halfAt(yy)) / RUN_LANES);

  return (
    <>
      <GameHead game={game} g={g}>
        <span className="live-stake">
          <b aria-label={`${stars} ★`}>{starText(stars)}</b>
          {fill(w.tally, { right: counts.right, left })}
        </span>
      </GameHead>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" aria-label={w.label} tabIndex={0} onKeyDown={keys} style={{ touchAction: "none" }}>
          <rect width={W} height={H} fill="#fff" />
          {!playing && d.done && d.marks?.length ? (
            <FactMarks marks={d.marks} w={shared} width={W} height={H} />
          ) : (
            <>
              {/* The road, wider toward the runner, and its lanes. */}
              <polygon points={`${W / 2 - FAR},${HORIZON} ${W / 2 + FAR},${HORIZON} ${W / 2 + NEAR},${H} ${W / 2 - NEAR},${H}`} fill="#f1f3f5" stroke="#adb5bd" strokeWidth={1.5} />
              {[1, 2].map((k) => (
                <line key={k} x1={edge(k, HORIZON)} y1={HORIZON} x2={edge(k, H)} y2={H} stroke="#adb5bd" strokeWidth={2} strokeDasharray="14 10" />
              ))}
              {!playing && (
                <g textAnchor="middle" fill={INK}>
                  <text x={W / 2} y={52} fontSize={32} fontWeight={700}>{samples.join("     ")}</text>
                  <text x={W / 2} y={84} fontSize={18} fill={MUTED}>{w.ready}</text>
                </g>
              )}
            </>
          )}
          {/* The sign overhead: the fact asked, or the one just passed with its answer. */}
          {sign && (
            <g textAnchor="middle">
              {sign.again && <rect x={W / 2 - 126} y={4} width={252} height={62} rx={14} fill="none" stroke={ORANGE} strokeWidth={2} strokeDasharray="5 4" />}
              <rect x={W / 2 - 120} y={10} width={240} height={50} rx={10} fill="#fff" stroke={sign.color === INK ? BLUE : sign.color} strokeWidth={3} />
              <text x={W / 2} y={45} fontSize={sign.text.length > 12 ? 24 : 30} fontWeight={700} fill={sign.color} data-fact={row?.fact.text} data-again={row?.again ? "" : undefined}>{sign.text}</text>
            </g>
          )}
          {/* A lane is its own button: a tap sends the runner through its gate. */}
          {playing && lanes.map((l) => (
            <polygon key={l} role="button" aria-label={row ? fill(w.gate, { n: l + 1, v: row.options[l] }) : fill(w.lane, { n: l + 1 })} aria-disabled={!row || undefined}
              points={`${edge(l, HORIZON)},${HORIZON} ${edge(l + 1, HORIZON)},${HORIZON} ${edge(l + 1, H)},${H} ${edge(l, H)},${H}`} fill="transparent" style={{ cursor: row ? "pointer" : "default" }}
              onPointerDown={() => pick(l)} />
          ))}
          {(row ?? past?.gate) && lanes.map((l) => {
            const gate = (row ?? past?.gate)!;
            const yy = row ? y : RUNNER_Y;
            const k = scaleAt(yy);
            const [bw, bh] = [118 * k, 52 * k];
            const x = laneX(l, yy);
            // Passed: the right gate green, the one run through wrongly red, the other faint.
            const [paper, ink, o] = !past || row ? ["#fff", INK, 1] : l === gate.right ? ["#d3f9d8", GREEN, 1] : l === past.lane ? ["#ffe3e3", RED, 1] : ["#fff", MUTED, 0.35];
            return (
              <g key={l} pointerEvents="none" opacity={o * (past && !row ? Math.max(0.2, 1 - (s.t - past.t) / REST) : 1)} data-gate={row ? gate.options[l] : undefined}>
                <line x1={x - bw / 2 + 6 * k} x2={x - bw / 2 + 6 * k} y1={yy - bh * 0.4} y2={yy} stroke={ink} strokeWidth={3 * k} />
                <line x1={x + bw / 2 - 6 * k} x2={x + bw / 2 - 6 * k} y1={yy - bh * 0.4} y2={yy} stroke={ink} strokeWidth={3 * k} />
                <rect x={x - bw / 2} y={yy - bh * 1.25} width={bw} height={bh} rx={8 * k} fill={paper} stroke={ink} strokeWidth={2.5 * k} />
                <text x={x} y={yy - bh * 0.75 + 11 * k} fontSize={30 * k} fontWeight={700} textAnchor="middle" fill={ink}>{gate.options[l]}</text>
              </g>
            );
          })}
          {playing && <Runner x={laneX(s.lane, RUNNER_Y + 44)} y={RUNNER_Y + 44} dashing={s.dashed >= 0} />}
          {phase === "paused" && <text x={W / 2} y={H / 2 + 20} fontSize={48} fontWeight={700} textAnchor="middle" fill={MUTED}>⏸</text>}
          {/* Start, pause and go on, in the picture. */}
          {phase === "idle" && <Pill x={W / 2 - 60} y={d.done && d.marks?.length ? H - 44 : H / 2 + 30} w={120} h={36} size={17} strong text={`▶ ${shared.start}`} onTap={begin} />}
          {phase === "play" && <Pill x={W - 46} y={8} w={38} h={30} text="⏸" title={shared.pause} onTap={() => setPhase("paused")} />}
          {phase === "paused" && <Pill x={W / 2 - 60} y={H / 2 + 44} w={120} h={36} size={17} strong text={`▶ ${shared.resume}`} onTap={resume} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

/** The runner, seen from behind: a head, a body and two legs, leaning into a dash. It slides to its lane. */
function Runner({ x, y, dashing }: { x: number; y: number; dashing: boolean }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y - (dashing ? 10 : 0)}px)`, transition: "transform 110ms ease-out" }} pointerEvents="none" data-runner="">
      <line x1={-7} y1={4} x2={-11} y2={24} stroke={BLUE} strokeWidth={7} strokeLinecap="round" />
      <line x1={7} y1={4} x2={11} y2={24} stroke={BLUE} strokeWidth={7} strokeLinecap="round" />
      <rect x={-15} y={-26} width={30} height={34} rx={11} fill={BLUE} />
      <circle cx={0} cy={-40} r={12} fill="#ffd8a8" stroke={INK} strokeWidth={1.5} />
    </g>
  );
}
