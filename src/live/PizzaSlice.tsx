// Slice the pizza: guests walk up to the table while the pizza waits on its board. Each tap on the pizza cuts it into
// one slice more, always equal; the pizza box swaps in a fresh one, one whole. A tap on the guests serves at once, and
// when they reach the table they are served what there is. The order on top shares among the guests or asks for
// slices of a size. The clock lives on the screen only (math/pizzaSlice.ts keeps it); the board keeps what the wave
// came to, each order and what it was served. Built on the game shell (useGame): a right order is a step that leaves
// the streak alone, a wrong one a miss, the end of the wave the win, clean when every order was right.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  advancePizza,
  cutPizza,
  freshPizza,
  PIZZA_LADDER,
  PIZZA_NOTICES,
  pizzaNotice,
  pizzaNow,
  pizzaOver,
  pizzaStars,
  servePizza,
  startPizza,
  walked,
  type LivePizza,
  type PizzaEvent,
  type PizzaSim,
} from "../math/pizzaSlice";
import { keyTap, Pill } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 600;
const H = 400;
const [PX, PY, PR] = [190, 232, 122];
const TABLE = 372;
const GREEN = "#2f9e44";
const RED = "#e03131";
const GRAY = "#868e96";
const FACES = ["🙂", "😀", "😊", "🤗", "😃", "🙃"];
/** Toppings at fixed spots, as turns round the pizza and parts of its radius. */
const TOPS: [number, number][] = [[0.05, 0.55], [0.18, 0.3], [0.27, 0.7], [0.4, 0.45], [0.52, 0.72], [0.6, 0.25], [0.7, 0.58], [0.83, 0.4], [0.92, 0.75], [0.33, 0.12]];
const FRESH: Partial<LivePizza> = { done: false, right: 0, wrong: 0, said: null, log: [] };
type Phase = "idle" | "play" | "paused";
type Tally = { right: number; wrong: number; ended: boolean; log: [number, number][] };

/** A tappable SVG group: a press acts at once (pointerdown), and Enter or Space does too. */
function Tap({ label, on, children, data }: { label: string; on: () => void; children: React.ReactNode; data?: Record<string, number> }) {
  const props = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));
  return (
    <g role="button" tabIndex={0} aria-label={label} style={{ cursor: "pointer" }} {...props}
      onPointerDown={(e) => { e.stopPropagation(); on(); }} onKeyDown={(e) => keyTap(e, on)}>
      {children}
    </g>
  );
}

export function PizzaSlice({ state: d, set, w: words, svgRef }: PieceProps<"pizzaSlice">) {
  const [w, g] = [words.pizzaSlice, words.game];
  const game = useGame({ key: "zeno.pizza.v1", size: PIZZA_LADDER.length, notices: PIZZA_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const { mode, stage, level, seed, timed } = d;
  const { spec, orders } = useMemo(() => pizzaNow({ mode, stage, level, seed, timed }), [mode, stage, level, seed, timed]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [, redraw] = useState(0);
  const sim = useRef<PizzaSim>(startPizza());
  const tally = useRef<Tally>({ right: 0, wrong: 0, ended: false, log: [] });
  const latest = useRef({ game, d, set });
  useEffect(() => {
    latest.current = { game, d, set };
  });

  const report = (e: PizzaEvent) => {
    const t = tally.current;
    const { game } = latest.current;
    const { order, n, why, late } = e;
    t.log.push([order.want, n]);
    const size = order.kind === "size";
    if (!why) {
      t.right++;
      game.step({ right: t.right, wrong: t.wrong, said: { kind: "right", n, k: order.k, size } }, { counts: false, notice: () => pizzaNotice(order) });
    } else {
      t.wrong++;
      game.miss({ right: t.right, wrong: t.wrong, said: { kind: "wrong", why, n, want: order.want, size, late } });
    }
  };
  const finish = () => {
    const t = tally.current;
    t.ended = true;
    latest.current.game.win({
      stars: pizzaStars(t.wrong),
      clean: t.wrong === 0,
      notice: (streak) => (streak === 10 ? "streak10" : null),
      patch: { done: true, right: t.right, wrong: t.wrong, said: null, log: t.log },
    });
  };
  const begin = () => {
    sim.current = startPizza();
    tally.current = { right: 0, wrong: 0, ended: false, log: [] };
    const { d, set } = latest.current;
    if (d.done || d.right || d.wrong || d.said || d.log?.length) set({ ...d, ...FRESH } as LivePizza);
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

  // The frames: the clock moves on by the frame (at most 50 ms, so a hidden tab pauses it); guests who reach the table
  // are served, and the wave is settled once the last order has had its pause.
  useEffect(() => {
    if (phase !== "play") return;
    let [frame, last] = [0, performance.now()];
    const tick = (now: number) => {
      const r = advancePizza(sim.current, orders, spec.walk, sim.current.t + Math.min(50, now - last));
      sim.current = r.sim;
      last = now;
      if (r.event) fns.current.report(r.event);
      redraw((n) => n + 1);
      if (pizzaOver(sim.current, orders)) {
        fns.current.finish();
        return setPhase("idle");
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, orders, spec.walk]);

  const act = (f: (s: PizzaSim) => PizzaSim) => {
    if (phase !== "play") return;
    sim.current = f(sim.current);
    redraw((n) => n + 1);
  };
  const serve = () => {
    if (phase !== "play") return;
    const r = servePizza(sim.current, orders);
    sim.current = r.sim;
    if (r.event) fns.current.report(r.event);
    redraw((n) => n + 1);
  };

  const s = sim.current;
  const playing = phase !== "idle";
  const order = playing ? orders[Math.min(s.at, orders.length - 1)] : null;
  const n = playing ? s.n : 1;
  const served = playing ? s.served : null;
  const right = playing ? tally.current.right : d.right;
  const stars = pizzaStars(playing ? tally.current.wrong : d.wrong);
  const marks = !playing && d.done && d.log?.length;

  const doneText = `${fill(w.done, { right: d.right, total: orders.length, stars: starText(stars) })}${stars === 1 && d.mode === "puzzle" ? ` ${g.oneStar}` : ""}`;
  const said = d.said;
  const wrongText = (x: Extract<LivePizza["said"], { kind: "wrong" }>) =>
    `${x.late ? `${w.late} ` : ""}${fill(w.wrong[`${x.why}${x.size ? "Size" : "Share"}`], { n: x.n, want: x.want })}`;
  const line: Line =
    said?.kind === "notice" ? { tone: "notice", text: d.done ? `${w.notices[said.key]} ${doneText}` : w.notices[said.key] }
    : d.done ? { tone: d.wrong ? "near" : "ok", text: doneText }
    : said?.kind === "right" ? { tone: "ok", text: fill(w.right, { n: said.n }) }
    : said?.kind === "wrong" ? { tone: "wrong", text: wrongText(said) }
    : { tone: "hint", text: w.hint };

  // The guests: they walk from the door on the right to the table, three to a row.
  const gone = order ? walked(s, spec.walk) : 0;
  const gx = W - 20 - gone * (W - 20 - TABLE - 110);
  const guests = order ? Array.from({ length: order.k }, (_, j) => (
    <text key={j} x={gx - (j % 3) * 36} y={128 + Math.floor(j / 3) * 40} fontSize={30} textAnchor="middle">{FACES[(s.at + j) % FACES.length]}</text>
  )) : null;
  const ring = served ? (served.why ? RED : GREEN) : "#d9480f";
  const orderText = order ? (order.kind === "share" ? fill(w.share, { k: order.k }) : fill(w.size, { m: order.want, k: order.k })) : "";

  return (
    <>
      <GameHead game={game} g={g}>
        <span className="live-stake">
          <b aria-label={`${stars} ★`}>{starText(stars)}</b>
          {fill(w.tally, { at: playing ? Math.min(s.at + 1, orders.length) : d.done ? orders.length : 0, total: orders.length, right })}
        </span>
      </GameHead>
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" aria-label={w.label} style={{ touchAction: "none" }}>
          <rect width={W} height={H} fill="#fff" />
          {marks ? <Marks log={d.log ?? []} w={w} /> : (
            <g>
              {order && (
                <g pointerEvents="none">
                  <text x={20} y={36} fontSize={24} fontWeight={700} fill={INK} data-want={order.want}>{orderText}</text>
                  <rect x={20} y={48} width={W - 80} height={8} rx={4} fill="#f1f3f5" />
                  <rect x={20} y={48} width={(W - 80) * (1 - gone)} height={8} rx={4} fill={gone > 0.75 ? RED : "#fab005"} />
                </g>
              )}
              {/* The table's edge, where the guests stop. */}
              <line x1={TABLE} y1={80} x2={TABLE} y2={H - 20} stroke="#dee2e6" strokeWidth={3} strokeDasharray="8 6" />
              <Tap label={w.cut} on={() => act((x) => cutPizza(x, orders))} data={{ n, at: s.at }}>
                <circle cx={PX} cy={PY} r={PR + 10} fill="#f1f3f5" stroke={ring} strokeWidth={served ? 6 : 1} />
                <circle cx={PX} cy={PY} r={PR} fill="#f4c27a" stroke="#d9480f" strokeWidth={2} />
                <circle cx={PX} cy={PY} r={PR - 14} fill="#ffd43b" />
                {TOPS.map(([u, r], k) => (
                  <circle key={k} cx={PX + r * (PR - 30) * Math.sin(2 * Math.PI * u)} cy={PY - r * (PR - 30) * Math.cos(2 * Math.PI * u)} r={9} fill="#c92a2a" opacity={0.85} />
                ))}
                {n > 1 && Array.from({ length: n }, (_, j) => {
                  const a = (2 * Math.PI * j) / n;
                  return <line key={j} x1={PX} y1={PY} x2={PX + PR * Math.sin(a)} y2={PY - PR * Math.cos(a)} stroke="#5c3d1e" strokeWidth={3} strokeLinecap="round" />;
                })}
              </Tap>
              <text x={PX} y={PY + PR + 34} fontSize={18} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">
                {n === 1 ? w.whole : fill(w.slices, { n })}
              </text>
              <Tap label={w.fresh} on={() => act((x) => freshPizza(x, orders))}>
                <rect x={16} y={H - 62} width={64} height={46} rx={6} fill="#fff4e6" stroke="#d9480f" strokeWidth={1.5} />
                <text x={48} y={H - 32} fontSize={24} textAnchor="middle" pointerEvents="none">🍕</text>
                <text x={48} y={H - 70} fontSize={12} textAnchor="middle" fill={GRAY} pointerEvents="none">{w.freshShort}</text>
              </Tap>
              <Tap label={w.serve} on={serve}>
                <rect x={TABLE + 6} y={84} width={W - TABLE - 10} height={H - 110} rx={10} fill={served ? (served.why ? "#fff5f5" : "#ebfbee") : "#f8f9fa"} />
                <g pointerEvents="none">{guests}</g>
                {order && !served && <text x={(TABLE + W) / 2} y={H - 36} fontSize={15} textAnchor="middle" fill={GRAY} pointerEvents="none">{w.serveShort}</text>}
                {served && <text x={(TABLE + W) / 2} y={H - 40} fontSize={44} fontWeight={700} textAnchor="middle" fill={served.why ? RED : GREEN} pointerEvents="none">{served.why ? "✗" : "✓"}</text>}
              </Tap>
            </g>
          )}
          {!playing && !marks && (
            <g textAnchor="middle" fill={INK} pointerEvents="none">
              <text x={W / 2} y={40} fontSize={26} fontWeight={700}>{w.ready}</text>
            </g>
          )}
          {phase === "paused" && <text x={PX} y={PY + 16} fontSize={48} fontWeight={700} textAnchor="middle" fill={GRAY}>⏸</text>}
          {phase === "idle" && <Pill x={marks ? W / 2 - 60 : PX - 60} y={marks ? H - 52 : PY - 18} w={120} h={36} size={17} strong text={`▶ ${w.start}`} onTap={begin} />}
          {phase === "play" && <Pill x={W - 46} y={8} w={38} h={30} text="⏸" title={w.pause} onTap={() => setPhase("paused")} />}
          {phase === "paused" && <Pill x={PX - 60} y={PY + 30} w={120} h={36} size={17} strong text={`▶ ${w.resume}`} onTap={() => setPhase("play")} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}

/** Each order of the wave: right ones on the left, wrong ones on the right with what was wanted. */
function Marks({ log, w }: { log: [number, number][]; w: PieceProps<"pizzaSlice">["w"]["pizzaSlice"] }) {
  const cols = [log.filter(([a, b]) => a === b).map(([a]) => `1/${a}`), log.filter(([a, b]) => a !== b).map(([a, b]) => fill(w.wanted, { n: b, want: a }))];
  const rowH = Math.min(30, (H - 150) / Math.max(1, ...cols.map((c) => c.length)));
  return (
    <g fontWeight={700} pointerEvents="none">
      {cols.map((col, k) => (
        <g key={k} fill={k ? RED : GREEN}>
          <text x={24 + k * (W / 2)} y={40} fontSize={22}>{`${k ? "✗" : "✓"} ${k ? w.wrongCol : w.rightCol}: ${col.length}`}</text>
          <line x1={24 + k * (W / 2)} x2={(k + 1) * (W / 2) - 16} y1={52} y2={52} stroke={k ? RED : GREEN} strokeWidth={2} opacity={0.4} />
          {col.map((t, i) => <text key={i} x={24 + k * (W / 2)} y={76 + i * rowH + rowH * 0.4} fontSize={Math.min(18, rowH * 0.75)}>{t}</text>)}
          {!col.length && <text x={24 + k * (W / 2)} y={90} fontSize={20} fill={GRAY}>—</text>}
        </g>
      ))}
    </g>
  );
}
