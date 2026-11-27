// The pipeline (#858): instructions against ticks, each row its fetch, decode, execute, memory and write-back. Tap a
// row to push it a tick later (a bubble), tap a bubble to take it out; drag from one row to a later one to lay a
// forwarding wire; drag an instruction's name up or down to reorder; in the jump puzzle tap what must be flushed.
// A read too soon is a red arrow from where the value is ready to where it is wanted.
import { useState, type KeyboardEvent } from "react";
import {
  PIPE_LADDER,
  PIPE_NOTICES,
  STAGES,
  bestTicks,
  forwarded,
  hazards,
  legal,
  needs,
  pipePuzzleOf,
  pipeStart,
  readyWant,
  starsFor,
  starts,
  text,
  ticksOf,
  wrongPath,
  FREE_PROG,
  type Fwd,
  type LivePipe,
} from "../math/pipelineLab";
import { BLUE, GREEN, MUTED, RED, keyTap, useDrag } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 700;
const GX = 176;
const CW = 34;
const RY = 78;
const RH = 46;
const MAX_TICKS = 15;
const STAGE_FILL: Record<string, string> = { F: "#d0ebff", D: "#e5dbff", X: "#ffd8a8", M: "#c3fae8", W: "#d3f9d8" };
type Pipe = Pick<LivePipe, "order" | "bubbles" | "wires" | "fwd" | "flushed" | "misses">;
const keyOf = (s: Pipe) => `${s.order}|${s.bubbles}|${s.wires.join(";")}|${s.fwd}|${s.flushed}|${s.misses}`;

export function PipelineLab({ state, set, w: words, svgRef }: PieceProps<"pipelineLab">) {
  const [w, g] = [words.pipelineLab, words.game];
  const d = state;
  const p = pipePuzzleOf(d);
  const game = useGame({
    key: "zeno.pipelinelab.v1", size: PIPE_LADDER.length, notices: PIPE_NOTICES, modes: ["puzzle", "free"], state: d, set,
    fresh: { said: null }, stagePatch: (k) => pipeStart(PIPE_LADDER[k]), freePatch: pipeStart(null),
  });
  const [said, setSaid] = useState<{ text: string; tone: "ok" | "wrong"; at: string } | null>(null);
  const last = said && said.at === keyOf(d) ? said : null;

  const prog = p?.prog ?? FREE_PROG;
  const s = starts(d.order, d.bubbles);
  const bad = hazards(prog, d.order, d.bubbles, d.fwd, d.wires);
  const ticks = ticksOf(d.order, d.bubbles);
  const best = p && p.goal !== "jump" ? bestTicks(p) : 0;
  const jumpAt = prog.findIndex((x) => x.op === "JUMP");
  const flushTick = jumpAt >= 0 ? s[jumpAt] + 3 : Infinity;
  const name = (id: number) => text(prog[id]);
  const row = (id: number) => d.order.indexOf(id);

  // ---- moves ----------------------------------------------------------------------------------------------------
  const notice = { stall: "stall", forward: "forward", reorder: "loadUse" } as const;
  /** A change to the timing: say what it did, and win if it is clear and as short as it can be. */
  const settle = (patch: Partial<Pipe>) => {
    const next = { ...d, ...patch };
    const hz = hazards(prog, next.order, next.bubbles, next.fwd, next.wires);
    const t = ticksOf(next.order, next.bubbles);
    const sn = starts(next.order, next.bubbles);
    const h = hz[0];
    const rw = h && readyWant(prog[h.from], sn[h.from], sn[h.to], forwarded(next.fwd, next.wires, h.from, h.to));
    const msg = h
      ? fill(w.tooSoon, { reg: h.reg, b: text(prog[h.to]), a: text(prog[h.from]), want: rw.want + 1, ready: rw.ready + 1 })
      : p && t > best ? fill(w.clearSlow, { t }) : fill(w.clear, { t });
    setSaid({ text: msg, tone: hz.length ? "wrong" : "ok", at: keyOf(next) });
    if (p && p.goal !== "jump" && !hz.length && t === best) return game.win({ stars: starsFor(next.misses), patch: { ...patch, done: true }, notice: () => notice[p.goal as keyof typeof notice] });
    game.tap(patch);
  };
  const wrong = (msg: string) => {
    const misses = d.misses + 1;
    setSaid({ text: msg, tone: "wrong", at: keyOf({ ...d, misses }) });
    game.miss({ misses });
  };
  const bubble = (id: number, by: 1 | -1) => {
    if (d.done || p?.goal === "jump") return;
    if (by > 0 && ticks >= MAX_TICKS) return setSaid({ text: w.full, tone: "wrong", at: keyOf(d) });
    settle({ bubbles: d.bubbles.map((b, i) => (i === id ? Math.max(0, b + by) : b)) });
  };
  const wire = (from: number, to: number) => {
    if (d.done) return;
    if (d.fwd !== "wires") return setSaid({ text: d.fwd === "all" ? w.wiresOn : w.noWires, tone: "wrong", at: keyOf(d) });
    const n = needs(prog, d.order).find((x) => x.from === from && x.to === to);
    if (!n) return wrong(fill(w.noNeed, { b: name(to), a: name(from) }));
    if (d.wires.some(([a, b]) => a === from && b === to)) return;
    settle({ wires: [...d.wires, [from, to]] });
  };
  const move = (id: number, to: number) => {
    if (d.done || to === row(id)) return;
    if (p && p.goal !== "reorder") return setSaid({ text: w.keepOrder, tone: "wrong", at: keyOf(d) });
    const order = d.order.filter((x) => x !== id);
    order.splice(to, 0, id);
    const clash = legal(prog, order);
    if (clash) return wrong(fill(w.illegal, { a: name(clash.a), b: name(clash.b) }));
    settle({ order });
  };
  const flush = (id: number) => {
    if (!p || p.goal !== "jump" || d.done || d.flushed.includes(id)) return;
    const path = wrongPath(p);
    if (!path.includes(id)) return wrong(fill(id < jumpAt ? w.before : id === jumpAt ? w.isJump : w.target, { x: name(id) }));
    const flushed = [...d.flushed, id];
    const next = { ...d, flushed };
    setSaid({ text: fill(w.flushedOne, { x: name(id) }), tone: "ok", at: keyOf(next) });
    if (path.every((x) => flushed.includes(x))) return game.win({ stars: starsFor(d.misses), patch: { flushed, done: true } });
    game.tap({ flushed });
  };
  const refwd = (f: Fwd) => game.tap({ fwd: f, wires: [] });

  const rowAt = (y: number) => Math.max(0, Math.min(d.order.length - 1, Math.floor((y - RY) / RH)));
  const { drag, begin, svgProps } = useDrag<{ id: number; kind: "row" | "name" }>((h) => {
    if (h.kind === "name") return h.moved ? move(h.id, rowAt(h.y)) : flush(h.id);
    if (!h.moved) return p?.goal === "jump" ? flush(h.id) : bubble(h.id, 1);
    const to = d.order[rowAt(h.y)];
    if (row(to) > row(h.id)) wire(h.id, to);
  });

  // ---- words --------------------------------------------------------------------------------------------------------
  const stars = p && d.done ? starsFor(d.misses) : 0;
  const line: Line =
    p && d.done ? { tone: "ok", text: `${last?.text ?? ""} ${fill(w.right, { stars: starText(stars) })}`.trim() }
    : last ? { tone: last.tone, text: last.text }
    : d.said?.kind === "notice" ? { tone: "notice", text: w.notices[d.said.key] }
    : { tone: "hint", text: p ? w.hints[p.goal] : w.hintFree };
  const ask = p ? w.asks[`p${d.stage + 1}` as keyof typeof w.asks] : w.freeAsk;

  // ---- drawing --------------------------------------------------------------------------------------------------------
  const cx = (t: number) => GX + t * CW;
  const cy = (id: number) => RY + row(id) * RH;
  const H = RY + prog.length * RH + 70;
  const links = needs(prog, d.order).map((n) => {
    const fw = forwarded(d.fwd, d.wires, n.from, n.to);
    const hz = bad.some((b) => b.from === n.from && b.to === n.to);
    // From the cell that makes the value (execute or memory when forwarded, else write-back) to the cell that wants it:
    // an arrow pointing back in time is a read too soon.
    const { ready, want } = readyWant(prog[n.from], s[n.from], s[n.to], fw);
    return { ...n, fw, hz, x1: cx(fw ? ready - 1 : ready) + CW / 2, y1: cy(n.from) + 34, x2: cx(want) + CW / 2, y2: cy(n.to) + 4 };
  });

  return (
    <>
      <GameHead game={game} g={g} />
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done && !!p} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ userSelect: "none", touchAction: "none" }} {...svgProps}>
          <rect width={W} height={H} fill="#fff" />
          {!p ? (["none", "all"] as const).map((f, k) => (
            <g key={f} role="button" tabIndex={0} aria-label={w.fwds[f]} aria-pressed={d.fwd === f} style={{ cursor: "pointer" }} onClick={() => refwd(f)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => refwd(f))}>
              <rect x={10 + k * 170} y={8} width={162} height={30} rx={7} fill={d.fwd === f ? "#d0ebff" : "#f8f9fa"} stroke={d.fwd === f ? BLUE : "#ced4da"} strokeWidth={d.fwd === f ? 2 : 1} />
              <text x={91 + k * 170} y={28} fontSize={12} fontWeight={700} textAnchor="middle" fill={INK}>{w.fwds[f]}</text>
            </g>
          )) : <text x={10} y={28} fontSize={13} fontWeight={700} fill={MUTED}>{w.fwds[d.fwd]}</text>}
          <text x={W - 10} y={28} fontSize={14} fontWeight={700} textAnchor="end" fill={bad.length ? RED : GREEN} data-ticks={ticks} data-hazards={bad.length}>
            {fill(bad.length ? w.ticksBad : w.ticks, { t: ticks, n: bad.length })}
          </text>
          {/* Tick numbers. */}
          {Array.from({ length: MAX_TICKS }, (_, t) => <text key={t} x={cx(t) + CW / 2} y={RY - 10} fontSize={10} textAnchor="middle" fill={MUTED}>{t + 1}</text>)}

          {d.order.map((id) => {
            const y = cy(id);
            const dead = d.flushed.includes(id);
            const dragging = drag?.kind === "name" && drag.id === id && drag.moved;
            return (
              <g key={id} data-instr={id} data-row={row(id)} data-start={s[id]} data-flushed={dead ? "1" : "0"}>
                {/* The instruction's name: drag to reorder, or (jump puzzle) tap to flush. */}
                <g role="button" tabIndex={0} aria-label={fill(p?.goal === "jump" ? w.flushName : w.moveName, { x: name(id) })} style={{ cursor: p?.goal === "jump" ? "pointer" : "grab" }}
                  onPointerDown={(e) => begin(e, { id, kind: "name" })} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => flush(id))}
                  transform={dragging ? `translate(0 ${drag.y - drag.y0})` : undefined}>
                  <rect x={8} y={y} width={GX - 16} height={RH - 8} rx={6} fill={dead ? "#f1f3f5" : "#f8f9fa"} stroke={dragging ? BLUE : "#ced4da"} strokeWidth={dragging ? 2 : 1} />
                  <text x={18} y={y + 24} fontSize={13} fontWeight={700} fontFamily="ui-monospace, monospace" fill={dead ? MUTED : INK} textDecoration={dead ? "line-through" : undefined}>{name(id)}</text>
                </g>
                {/* Bubbles: tap one to take it out. */}
                {Array.from({ length: d.bubbles[id] }, (_, k) => {
                  const t = s[id] - d.bubbles[id] + k;
                  return (
                    <g key={`b${k}`} data-bubble={id} role="button" tabIndex={0} aria-label={fill(w.bubbleName, { x: name(id) })} style={{ cursor: "pointer" }}
                      onClick={() => bubble(id, -1)} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => bubble(id, -1))}>
                      <circle cx={cx(t) + CW / 2} cy={y + 19} r={12} fill="#fff" stroke="#adb5bd" strokeDasharray="3 3" />
                    </g>
                  );
                })}
                {/* The five stages: tap to push the row a tick later, drag to a later row to forward. */}
                <g role="button" tabIndex={0} aria-label={fill(p?.goal === "jump" ? w.flushName : w.rowName, { x: name(id) })} style={{ cursor: "pointer" }}
                  onPointerDown={(e) => begin(e, { id, kind: "row" })} onKeyDown={(e: KeyboardEvent) => keyTap(e, () => (p?.goal === "jump" ? flush(id) : bubble(id, 1)))}>
                  {STAGES.map((st, k) => {
                    const t = s[id] + k;
                    const gone = dead && t >= flushTick;
                    return gone ? null : (
                      <g key={st}>
                        <rect x={cx(t) + 1} y={y} width={CW - 2} height={RH - 8} rx={4} fill={dead ? "#e9ecef" : STAGE_FILL[st]} stroke={dead ? "#adb5bd" : "#868e96"} />
                        <text x={cx(t) + CW / 2} y={y + 24} fontSize={12} fontWeight={700} textAnchor="middle" fill={dead ? MUTED : INK} pointerEvents="none">{dead && t === flushTick - 1 ? "✗" : st}</text>
                      </g>
                    );
                  })}
                </g>
              </g>
            );
          })}

          {/* What each instruction needs from an earlier one: blue wire when forwarded, red when read too soon. */}
          {links.map((l) => (
            <g key={`${l.from}-${l.to}-${l.reg}`} data-link={`${l.from}-${l.to}`} data-hazard={l.hz ? "1" : "0"} pointerEvents="none">
              <path d={`M${l.x1},${l.y1} C${l.x1},${(l.y1 + l.y2) / 2} ${l.x2},${(l.y1 + l.y2) / 2} ${l.x2},${l.y2}`} fill="none" stroke={l.hz ? RED : l.fw ? BLUE : MUTED}
                strokeWidth={l.hz ? 3 : 2} strokeDasharray={l.fw ? undefined : "5 4"} markerEnd="url(#pipeArrow)" />
              <text x={(l.x1 + l.x2) / 2 + 6} y={(l.y1 + l.y2) / 2} fontSize={10} fontWeight={700} fill={l.hz ? RED : l.fw ? BLUE : MUTED}>{`R${l.reg}`}</text>
            </g>
          ))}
          {drag?.kind === "row" && drag.moved && <line x1={drag.x0} y1={drag.y0} x2={drag.x} y2={drag.y} stroke={BLUE} strokeWidth={3} pointerEvents="none" />}
          <defs>
            <marker id="pipeArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={INK} />
            </marker>
          </defs>
          {/* The stages' names. */}
          {STAGES.map((st, k) => (
            <g key={st}>
              <rect x={GX + k * 104} y={H - 40} width={18} height={18} rx={3} fill={STAGE_FILL[st]} stroke="#868e96" />
              <text x={GX + k * 104 + 24} y={H - 26} fontSize={11} fill={INK}>{`${st} ${w.stages[st]}`}</text>
            </g>
          ))}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done && !!p} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
