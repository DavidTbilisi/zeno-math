// Prime slice: numbers are thrown up across the stage and fall; swipe across (or tap) every one that is not prime and
// it splits at its smallest prime factor, a piece that is not prime yet thrown up again to be cut in its turn. A prime
// cut goes off like a bomb, and a number that is not prime let fall is a slip too; a prime let fall is right. The wave
// in the air lives on the screen only (math/primeSlice.ts moves it), and the board keeps what it came to. Built on the
// game shell (useGame): a cut is a step that leaves the streak alone, a slip a miss, and the end of the wave the win,
// clean when nothing slipped. A wave picked from the head starts at once; the first one waits for Start.
import { useEffect, useMemo, useRef, useState } from "react";
import { isPrime } from "../math/numtheory";
import {
  advance,
  BALL_R,
  cut,
  cutNotice,
  FADE,
  live,
  PIECE_R,
  posAt,
  SLICE_H,
  SLICE_LADDER,
  SLICE_NOTICES,
  SLICE_W,
  sliceNow,
  sliceStars,
  splitOf,
  startSim,
  waveOver,
  type Ball,
  type LivePrimeSlice,
  type SliceEvent,
  type Sim,
} from "../math/primeSlice";
import { starText } from "./ladderUi";
import { fill, FONT, INK, svgPoint, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const GREEN = "#2f9e44";
const RED = "#e03131";
const BLUE = "#1971c2";
/** How long the blade's trail stays, in ms. */
const TRAIL = 160;
const FRESH: Partial<LivePrimeSlice> = { done: false, cuts: 0, spared: 0, slips: 0, said: null };
type Phase = "idle" | "play" | "paused";
type Tally = { cuts: number; spared: number; slips: number; ended: boolean };

export function PrimeSlice({ state: d, set, w: words, svgRef }: PieceProps<"primeSlice">) {
  const [w, g] = [words.primeSlice, words.game];
  const game = useGame({ key: "zeno.primeSlice.v1", size: SLICE_LADDER.length, notices: SLICE_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const { mode, stage, level, seed, timed } = d;
  const { spec, throws } = useMemo(() => sliceNow({ mode, stage, level, seed, timed }), [mode, stage, level, seed, timed]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [, redraw] = useState(0);
  // The wave in the air, what it has come to so far, the stroke being drawn and the blade's trail: read and changed
  // between frames and pointer moves, so kept in refs; each frame draws them afresh.
  const sim = useRef<Sim>(startSim());
  const tally = useRef<Tally>({ cuts: 0, spared: 0, slips: 0, ended: false });
  const stroke = useRef<{ id: number; last: [number, number]; cuts: number } | null>(null);
  const strokes = useRef(0);
  const trail = useRef<{ p: [number, number]; t: number }[]>([]);
  const latest = useRef({ game, d, set });
  useEffect(() => {
    latest.current = { game, d, set };
  });

  // What happened goes to the shell: a slip is a miss, cuts a step (which does not move the streak); a prime let fall
  // only counts. The counts are sent whole, so a frame drawn before the board has caught up loses nothing.
  const report = (events: SliceEvent[], inStroke = 0) => {
    if (!events.length) return;
    const t = tally.current;
    const cuts = events.filter((e) => e.kind === "cut");
    const slips = events.filter((e) => e.kind === "boom" || e.kind === "dropped");
    t.cuts += cuts.length;
    t.spared += events.filter((e) => e.kind === "spared").length;
    t.slips += slips.length;
    const patch = { cuts: t.cuts, spared: t.spared, slips: t.slips };
    const { game } = latest.current;
    if (slips.length) game.miss({ ...patch, said: slips[0] });
    else if (cuts.length) game.step({ ...patch, said: cuts[cuts.length - 1] }, { counts: false, notice: () => cutNotice(cuts, inStroke) });
  };
  const finish = () => {
    const t = tally.current;
    t.ended = true;
    latest.current.game.win({
      stars: sliceStars(t.slips),
      clean: t.slips === 0,
      notice: (streak) => (streak === 10 ? "streak10" : null),
      patch: { done: true, cuts: t.cuts, spared: t.spared, slips: t.slips, said: null },
    });
  };
  const begin = () => {
    sim.current = startSim();
    tally.current = { cuts: 0, spared: 0, slips: 0, ended: false };
    trail.current = [];
    const { d, set } = latest.current;
    if (d.done || d.cuts || d.spared || d.slips || d.said) set({ ...d, ...FRESH } as LivePrimeSlice);
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

  // The frames: time moves on by the frame (at most 50 ms, so a hidden tab pauses the wave rather than dropping it),
  // the end is settled once the board has caught up with the last frame's slips, and the fading goes on after.
  useEffect(() => {
    if (phase !== "play") return;
    let [frame, last] = [0, performance.now()];
    const tick = (now: number) => {
      const s = sim.current;
      if (!tally.current.ended && waveOver(s, throws)) fns.current.finish();
      const next = advance(s, throws, spec.flight, s.t + Math.min(50, now - last));
      last = now;
      sim.current = next.sim;
      fns.current.report(next.events);
      redraw((n) => n + 1);
      if (tally.current.ended && !next.sim.balls.length) return setPhase("idle");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, throws, spec.flight]);

  const slash = (p: [number, number]) => {
    const s = stroke.current;
    if (!s) return;
    const r = cut(sim.current, s.last, p, s.id);
    sim.current = r.sim;
    s.last = p;
    trail.current = [...trail.current.filter((q) => sim.current.t - q.t < TRAIL), { p, t: sim.current.t }];
    s.cuts += r.events.filter((e) => e.kind === "cut").length;
    report(r.events, s.cuts);
  };
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== "play" || !svgRef.current || e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = svgPoint(svgRef.current, e);
    stroke.current = { id: ++strokes.current, last: p, cuts: 0 };
    slash(p);
  };
  const move = (e: React.PointerEvent) => stroke.current && svgRef.current && slash(svgPoint(svgRef.current, e));
  const up = () => {
    stroke.current = null;
  };

  const playing = phase !== "idle";
  const counts = playing ? tally.current : d;
  const stars = sliceStars(counts.slips);
  const t = sim.current.t;
  const left = playing ? throws.length - sim.current.thrown : d.done ? 0 : throws.length;

  const done = d.mode === "endless" ? (d.slips ? fill(w.slipped, { n: d.slips }) : fill(w.clean, { cuts: d.cuts, spared: d.spared })) : `${fill(w.done, { cuts: d.cuts, spared: d.spared, slips: d.slips, stars: starText(stars) })}${stars === 1 ? ` ${g.oneStar}` : ""}`;
  const said = d.said;
  const line: Line =
    said?.kind === "notice" ? { tone: "notice", text: d.done ? `${w.notices[said.key]} ${done}` : w.notices[said.key] }
    : d.done ? { tone: d.slips ? "near" : "ok", text: done }
    : said?.kind === "cut" ? { tone: "ok", text: fill(isPrime(said.q) ? w.cut : w.cutMore, { n: said.n, p: said.p, q: said.q }) }
    : said?.kind === "boom" ? { tone: "wrong", text: fill(w.boom, { n: said.n }) }
    : said?.kind === "dropped" ? { tone: "wrong", text: fill(w.dropped, { n: said.n, p: said.p, q: said.q }) }
    : { tone: "hint", text: w.hint };
  const blade = trail.current.filter((q) => t - q.t < TRAIL);

  return (
    <>
      <GameHead game={game} g={g}>
        <span className="live-stake">
          <b aria-label={`${stars} ★`}>{starText(stars)}</b>
          {fill(w.tally, { cuts: counts.cuts, left })}
        </span>
      </GameHead>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          width={SLICE_W}
          height={SLICE_H}
          viewBox={`0 0 ${SLICE_W} ${SLICE_H}`}
          fontFamily={FONT}
          role="img"
          aria-label={fill(w.label, { from: spec.from, to: spec.to })}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          style={{ cursor: phase === "play" ? "crosshair" : "default", touchAction: "none" }}
        >
          <rect width={SLICE_W} height={SLICE_H} fill="#fff" />
          {!playing && (
            <g textAnchor="middle" fill={INK}>
              <text x={SLICE_W / 2} y={SLICE_H / 2 - 10} fontSize={56} fontWeight={700}>
                {d.done ? `✂ ${d.cuts}   ✓ ${d.spared}   ✗ ${d.slips}` : `${spec.from} – ${spec.to}`}
              </text>
              <text x={SLICE_W / 2} y={SLICE_H / 2 + 34} fontSize={20} fill="#868e96">{d.done ? w.key : w.ready}</text>
            </g>
          )}
          {sim.current.balls.map((b) => (
            <BallView key={b.id} b={b} t={t} />
          ))}
          {blade.length > 1 && <polyline points={blade.map((q) => q.p.join(",")).join(" ")} fill="none" stroke={BLUE} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />}
          {phase === "paused" && (
            <text x={SLICE_W / 2} y={SLICE_H / 2} fontSize={48} fontWeight={700} textAnchor="middle" fill="#868e96">⏸</text>
          )}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done}>
        {phase === "idle" && <button className="live-btn on" onClick={begin}>▶ {w.start}</button>}
        {phase === "play" && <button className="live-btn" onClick={() => setPhase("paused")}>⏸ {w.pause}</button>}
        {phase === "paused" && <button className="live-btn on" onClick={() => setPhase("play")}>▶ {w.resume}</button>}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

/** A number in the air (a prime piece in green, done with), or what became of one, fading: cut, gone off, let fall. */
function BallView({ b, t }: { b: Ball; t: number }) {
  if (!b.end) {
    const [x, y] = posAt(b.f, t);
    const r = b.piece ? PIECE_R : BALL_R;
    const done = !live(b);
    return (
      <g data-n={b.n} data-live={done ? undefined : ""}>
        <circle cx={x} cy={y} r={r} fill={done ? "#d3f9d8" : "#e7f5ff"} stroke={done ? GREEN : BLUE} strokeWidth={2.5} />
        <text x={x} y={y + r * 0.3} fontSize={r * 0.85} fontWeight={700} textAnchor="middle" fill={done ? GREEN : INK}>{b.n}</text>
      </g>
    );
  }
  const age = (t - b.end.t) / FADE;
  const [x, y] = b.end.at;
  const o = Math.max(0, 1 - age);
  if (b.end.kind === "fell") return null;
  if (b.end.kind === "boom")
    return (
      <g opacity={o} textAnchor="middle">
        <circle cx={x} cy={y} r={BALL_R * (1 + age)} fill="#ffe3e3" stroke={RED} strokeWidth={2} />
        <text x={x} y={y + 10} fontSize={30}>💥</text>
        <text x={x} y={y - BALL_R - 8} fontSize={22} fontWeight={700} fill={RED}>{b.n}</text>
      </g>
    );
  // A number cut shows how it split; one let fall, a cross (red) or a tick (green).
  const kind = b.end.kind;
  const [p, q] = splitOf(b.n);
  const text = kind === "cut" ? `${b.n} = ${p} × ${q}` : `${b.n} ${kind === "spared" ? "✓" : "✗"}`;
  return (
    <text x={x} y={y - age * 30} opacity={o} fontSize={kind === "cut" ? 24 : 20} fontWeight={700} textAnchor="middle" fill={kind === "dropped" ? RED : GREEN}>
      {text}
    </text>
  );
}
