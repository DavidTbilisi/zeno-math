// Talking to devices (#856): the disk, the interrupt bell, the DMA controller, the CPU and memory above a timeline of
// twenty ticks. The clock steps one tick; at the right tick the learner acts instead: takes the byte from the disk
// (polling), answers the bell (interrupts), sets up the DMA controller (DMA). The CPU's row fills tick by tick, and at
// the end the time each way leaves for the program is compared. The keyboard puzzle picks how often to poll.
import { useState, type KeyboardEvent, type ReactNode } from "react";
import {
  INTERVALS,
  IO_LADDER,
  IO_NOTICES,
  IO_T,
  DISK,
  METHODS,
  bestInterval,
  ioPuzzleOf,
  ioStart,
  plan,
  pollKeys,
  starsFor,
  workOf,
  type Act,
  type Decision,
  type Method,
} from "../math/ioLab";
import { BLUE, GREEN, MUTED, RED, keyTap } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 700;
const TOPY = 50;
const TL = 220;
const TX = 92;
const CW = 30;
const H = TL + 210;
const ACT_COLOR: Record<Act, string> = { work: "#b2f2bb", poll: "#dee2e6", take: "#a5d8ff", save: "#ffd8a8", return: "#ffd8a8", setup: "#d0bfff", check: "#ffd8a8" };
type Input = "clock" | Exclude<Decision, null>;

export function IoLab({ state, set, w: words, svgRef }: PieceProps<"ioLab">) {
  const [w, g] = [words.ioLab, words.game];
  const d = state;
  const p = ioPuzzleOf(d);
  const game = useGame({
    key: "zeno.iolab.v1", size: IO_LADDER.length, notices: IO_NOTICES, modes: ["puzzle", "free"], state: d, set,
    fresh: { said: null }, stagePatch: (k) => ioStart(IO_LADDER[k]), freePatch: ioStart(null),
  });
  const [said, setSaid] = useState<{ text: string; tone: "ok" | "wrong"; at: string } | null>(null);
  const here = `${d.mode}.${d.stage}.${d.t}.${d.k}.${d.misses}.${d.method}`;
  const last = said && said.at === here ? said : null;
  const tell = (text: string, tone: "ok" | "wrong", at: string) => setSaid({ text, tone, at });

  const keys = p?.goal === "keys";
  const T = p?.T ?? IO_T;
  const ticks = plan(d.method, p?.goal === "hand" ? p.arrivals : DISK, T);
  const now = d.t < T ? ticks[d.t] : null;
  const arrived = ticks.slice(0, d.t + 1).filter((x) => x.arrive).length;
  const storedN = ticks.slice(0, d.t).filter((x) => x.stored).length;
  const waiting = d.method === "polling" && now?.decide === "take";
  const ringing = now?.decide === "ring";
  const setUp = d.method === "dma" && d.t > 0;

  // ---- moves ----------------------------------------------------------------------------------------------------
  const next = (t: number, misses: number) => `${d.mode}.${d.stage}.${t}.${d.k}.${misses}.${d.method}`;
  const input = (what: Input) => {
    if (!now || keys) return;
    const want: Input = now.decide ?? "clock";
    if (p && what !== want) {
      tell(want === "clock" ? w.notNow[what as Exclude<Input, "clock">] : w.due[want as Exclude<Input, "clock">], "wrong", next(d.t, d.misses + 1));
      return game.miss({ misses: d.misses + 1 });
    }
    const t = d.t + 1;
    tell(fill(w.did[now.act], { t: d.t + 1 }), "ok", next(t, d.misses));
    if (p && t >= T) return game.win({ stars: starsFor(d.misses), patch: { t, done: true } });
    if (what === "take" && d.method === "polling" && arrived === 1) return game.spot({ t }, "waste");
    if (what === "ring" && d.method === "interrupts" && arrived === 1) return game.spot({ t }, "save");
    if (p) game.step({ t });
    else game.tap({ t });
  };
  const runAll = () => game.tap({ t: T });
  const pick = (k: number) => {
    const r = pollKeys(p && p.goal === "keys" ? p.keys : [], k, T);
    tell(r.lost.length ? fill(w.keysLost, { k, lost: r.lost.map((x) => x + 1).join(", ") }) : fill(w.keysKept, { k, polls: r.ticks.filter((a) => a !== "work").length, work: r.ticks.filter((a) => a === "work").length }), r.lost.length ? "wrong" : "ok", `${d.mode}.${d.stage}.${d.t}.${k}.${d.misses}.${d.method}`);
    if (r.lost.length) return game.spot({ k }, "lost");
    game.tap({ k });
  };
  const check = () => {
    if (!p || p.goal !== "keys" || !d.k) return;
    const r = pollKeys(p.keys, d.k, T);
    const best = bestInterval(p.keys, T);
    if (r.lost.length) {
      tell(fill(w.keysLost, { k: d.k, lost: r.lost.map((x) => x + 1).join(", ") }), "wrong", next(d.t, d.misses + 1));
      return game.miss({ misses: d.misses + 1 });
    }
    game.win({ stars: d.k === best ? 3 : 2, patch: { done: true } });
  };
  const remethod = (m: Method) => game.tap({ method: m, t: 0 });

  // ---- words --------------------------------------------------------------------------------------------------------
  const stars = p && d.done ? (keys ? (d.k === bestInterval((p as { keys: readonly number[] }).keys, T) ? 3 : 2) : starsFor(d.misses)) : 0;
  const line: Line =
    p && d.done ? { tone: "ok", text: fill(w.right, { stars: starText(stars) }) }
    : last ? { tone: last.tone, text: last.text }
    : d.said?.kind === "notice" ? { tone: "notice", text: w.notices[d.said.key] }
    : { tone: "hint", text: keys ? w.hintKeys : w.hint };
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;

  // ---- drawing --------------------------------------------------------------------------------------------------------
  const unit = (key: Input, x: number, y: number, wd: number, ht: number, title: string, label: string, on: boolean, color: string, body?: ReactNode) => (
    <g key={key} data-unit={key} role="button" tabIndex={0} aria-label={title} style={{ cursor: "pointer" }} onClick={() => input(key)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => input(key))}>
      <title>{title}</title>
      <rect x={x} y={y} width={wd} height={ht} rx={9} fill={on ? color : "#f8f9fa"} stroke={on ? INK : "#adb5bd"} strokeWidth={on ? 2.5 : 1.5} />
      <text x={x + wd / 2} y={y + 18} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{label}</text>
      {body}
    </g>
  );
  const row = (y: number, label: string, cell: (t: number) => ReactNode) => (
    <g>
      <text x={TX - 8} y={y + 19} fontSize={11} textAnchor="end" fill={MUTED}>{label}</text>
      {Array.from({ length: T }, (_, t) => <g key={t}>{cell(t)}</g>)}
    </g>
  );
  const keyRun = keys && d.k ? pollKeys((p as { keys: readonly number[] }).keys, d.k, T) : null;
  const cpuAct = (t: number): Act | null => (keys ? keyRun?.ticks[t] ?? null : t < d.t ? ticks[t].act : null);

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ userSelect: "none" }}>
          <rect width={W} height={H} fill="#fff" />
          {/* The way of this puzzle, or (free play) a choice of the three. */}
          {!p && METHODS.map((m, i) => (
            <g key={m} role="button" tabIndex={0} aria-label={w.methods[m]} aria-pressed={d.method === m} style={{ cursor: "pointer" }} onClick={() => remethod(m)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => remethod(m))}>
              <rect x={8 + i * 130} y={8} width={124} height={32} rx={7} fill={d.method === m ? "#d0ebff" : "#f8f9fa"} stroke={d.method === m ? BLUE : "#ced4da"} strokeWidth={d.method === m ? 2 : 1} />
              <text x={70 + i * 130} y={29} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{w.methods[m]}</text>
            </g>
          ))}
          {p && <text x={10} y={30} fontSize={15} fontWeight={700} fill={INK}>{keys ? w.keyboard : w.methods[d.method]}</text>}

          {keys ? (
            // The keyboard puzzle: how often to poll.
            <g>
              <text x={10} y={TOPY + 30} fontSize={12} fill={INK}>{w.every}</text>
              {INTERVALS.map((k, i) => (
                <g key={k} role="button" tabIndex={0} aria-label={fill(w.everyK, { k })} aria-pressed={d.k === k} style={{ cursor: "pointer" }} onClick={() => pick(k)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => pick(k))}>
                  <rect x={10 + i * 52} y={TOPY + 40} width={46} height={40} rx={7} fill={d.k === k ? "#d0ebff" : "#f8f9fa"} stroke={d.k === k ? BLUE : "#ced4da"} strokeWidth={d.k === k ? 2 : 1} />
                  <text x={33 + i * 52} y={TOPY + 66} fontSize={15} fontWeight={700} textAnchor="middle" fill={INK}>{k}</text>
                </g>
              ))}
              <g role="button" tabIndex={0} aria-label={w.check} style={{ cursor: "pointer" }} onClick={check} onKeyDown={(e: KeyboardEvent) => keyTap(e, check)}>
                <rect x={340} y={TOPY + 40} width={110} height={40} rx={8} fill="#ebfbee" stroke={GREEN} strokeWidth={1.5} />
                <text x={395} y={TOPY + 65} fontSize={13} fontWeight={700} textAnchor="middle" fill={GREEN}>{w.check}</text>
              </g>
            </g>
          ) : (
            <g>
              {/* The disk (its light on while a byte waits), the bell, the DMA controller, the CPU, memory, the clock. */}
              {unit("take", 10, TOPY, 120, 110, w.takeName, w.disk, waiting, "#d3f9d8",
                <g pointerEvents="none">
                  <circle cx={70} cy={TOPY + 56} r={22} fill="#e9ecef" stroke="#868e96" />
                  <circle cx={70} cy={TOPY + 56} r={5} fill="#868e96" />
                  <circle cx={112} cy={TOPY + 14} r={6} fill={now?.arrive || waiting ? GREEN : "#dee2e6"} data-light={now?.arrive || waiting ? "on" : "off"} />
                  <text x={70} y={TOPY + 100} fontSize={10} textAnchor="middle" fill={MUTED}>{fill(w.sent, { n: arrived, of: DISK.length })}</text>
                </g>)}
              {unit("ring", 150, TOPY, 90, 110, w.ringName, w.bell, ringing, "#ffe3e3",
                <text x={195} y={TOPY + 72} fontSize={34} textAnchor="middle" pointerEvents="none" data-ringing={ringing ? "1" : "0"} style={{ filter: ringing ? "none" : "grayscale(1)", opacity: ringing ? 1 : 0.4 }}>🔔</text>)}
              {unit("setup", 260, TOPY, 110, 110, w.setupName, w.dmaBox, d.method === "dma" && d.t === 0, "#e5dbff",
                <text x={315} y={TOPY + 62} fontSize={11} textAnchor="middle" fill={setUp ? GREEN : MUTED} pointerEvents="none">{d.method !== "dma" ? w.dmaUnused : setUp ? fill(w.dmaSet, { n: DISK.length }) : w.dmaNotSet}</text>)}
              <rect x={390} y={TOPY} width={150} height={110} rx={9} fill="#f8f9fa" stroke="#adb5bd" strokeWidth={1.5} />
              <text x={465} y={TOPY + 18} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{w.cpu}</text>
              <rect x={402} y={TOPY + 32} width={126} height={36} rx={6} fill={now && d.t > 0 ? ACT_COLOR[ticks[d.t - 1].act] : "#fff"} stroke="#adb5bd" />
              <text x={465} y={TOPY + 55} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK} data-act={d.t > 0 ? ticks[d.t - 1].act : ""}>{d.t > 0 ? w.acts[ticks[d.t - 1].act] : "–"}</text>
              <text x={465} y={TOPY + 92} fontSize={10} textAnchor="middle" fill={MUTED}>{fill(w.work, { n: ticks.slice(0, d.t).filter((x) => x.act === "work").length })}</text>
              <rect x={560} y={TOPY} width={130} height={52} rx={9} fill="#f8f9fa" stroke="#adb5bd" strokeWidth={1.5} />
              <text x={625} y={TOPY + 18} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{w.memory}</text>
              {DISK.map((_, i) => <rect key={i} x={583 + i * 30} y={TOPY + 26} width={24} height={18} rx={3} fill={i < storedN ? "#a5d8ff" : "#fff"} stroke="#868e96" />)}
              {unit("clock", 560, TOPY + 60, 130, 50, w.tick, `⏱ ${w.tickShort}`, false, "#fff9db",
                <text x={625} y={TOPY + 98} fontSize={10} textAnchor="middle" fill={MUTED} pointerEvents="none">{fill(w.tickOf, { t: Math.min(d.t + 1, T), T })}</text>)}
              {!p && (
                <g role="button" tabIndex={0} aria-label={w.runAll} style={{ cursor: "pointer" }} onClick={runAll} onKeyDown={(e: KeyboardEvent) => keyTap(e, runAll)}>
                  <rect x={410} y={8} width={130} height={32} rx={7} fill="#f1f3f5" stroke="#ced4da" />
                  <text x={475} y={29} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{`▶ ${w.runAll}`}</text>
                </g>
              )}
            </g>
          )}

          {/* The timeline: the device's bytes or keys, the CPU's tick by tick, and memory. */}
          <text x={TX} y={TL - 10} fontSize={11} fill={MUTED}>{w.timeline}</text>
          {row(TL, keys ? w.keyboard : w.disk, (t) => {
            const on = keys ? (p as { keys: readonly number[] }).keys.includes(t) : ticks[t].arrive;
            const lostKey = keyRun?.lost.includes(t);
            return (
              <g>
                <rect x={TX + t * CW} y={TL} width={CW - 2} height={28} rx={3} fill="#f8f9fa" stroke={!keys && t === d.t ? BLUE : "#e9ecef"} strokeWidth={!keys && t === d.t ? 2 : 1} />
                {on && <text x={TX + t * CW + CW / 2 - 1} y={TL + 19} fontSize={13} textAnchor="middle" fill={lostKey ? RED : INK}>{lostKey ? "✗" : keys ? "⌨" : "●"}</text>}
              </g>
            );
          })}
          {row(TL + 34, w.cpu, (t) => {
            const a = cpuAct(t);
            return (
              <g data-tick={t} data-act={a ?? ""}>
                <rect x={TX + t * CW} y={TL + 34} width={CW - 2} height={28} rx={3} fill={a ? ACT_COLOR[a] : "#fff"} stroke="#ced4da" />
                {a && <text x={TX + t * CW + CW / 2 - 1} y={TL + 53} fontSize={10} fontWeight={700} textAnchor="middle" fill={INK}>{w.short[a]}</text>}
              </g>
            );
          })}
          {!keys && row(TL + 68, w.memory, (t) => (
            <g>
              <rect x={TX + t * CW} y={TL + 68} width={CW - 2} height={28} rx={3} fill="#f8f9fa" stroke="#e9ecef" />
              {t < d.t && ticks[t].stored && <rect x={TX + t * CW + 6} y={TL + 74} width={CW - 14} height={16} rx={2} fill="#a5d8ff" stroke="#1971c2" />}
            </g>
          ))}
          {Array.from({ length: T }, (_, t) => t % 5 === 0 && <text key={t} x={TX + t * CW + CW / 2} y={TL + 112} fontSize={9} textAnchor="middle" fill={MUTED}>{t + 1}</text>)}

          {/* The legend, and at the end of a way: the time each leaves for the program. */}
          {(["work", "poll", "take", "save", "setup"] as Act[]).map((a, i) => (
            <g key={a}>
              <rect x={TX + i * 120} y={TL + 122} width={14} height={14} rx={2} fill={ACT_COLOR[a]} stroke="#ced4da" />
              <text x={TX + i * 120 + 20} y={TL + 133} fontSize={10} fill={INK}>{`${w.short[a]} ${w.acts[a]}`}</text>
            </g>
          ))}
          {!keys && d.t >= T && METHODS.map((m, i) => {
            const n = workOf(plan(m, DISK, T));
            return (
              <g key={m} data-compare={m} data-work={n}>
                <text x={TX - 8} y={TL + 158 + i * 17} fontSize={10} textAnchor="end" fill={INK}>{w.methods[m]}</text>
                <rect x={TX} y={TL + 148 + i * 17} width={n * 22} height={12} rx={2} fill={m === d.method ? GREEN : "#b2f2bb"} />
                <text x={TX + n * 22 + 6} y={TL + 158 + i * 17} fontSize={10} fill={INK}>{fill(w.left, { n, T })}</text>
              </g>
            );
          })}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
