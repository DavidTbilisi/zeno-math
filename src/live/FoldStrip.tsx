// Fold to equal, worked by hand: a paper strip with a shaded part, and four cards under it. A tap on "fold in two"
// (or three) folds it and opens it again: twice (three times) the pieces, the new creases dashed, the shaded amount the
// same. "Unfold" erases every other crease (two of three), and only when the shading ends on a crease that stays:
// that is simplifying. Every strip along the way is written in a trail of equal fractions; a tap on one goes back to
// it. A puzzle asks for the start with a given bottom (2/3 as ?/12): reach that many pieces and write the top. In free
// play the start is set by its own top and bottom. Built on the game shell (useGame).
import type { ReactNode } from "react";
import {
  FOLD_FRESH,
  FOLD_LADDER,
  FOLD_NOTICES,
  foldNotice,
  foldNow,
  foldOnce,
  foldStars,
  foldStart,
  foldTrail,
  judgeFold,
  MAX_PIECES,
  type FoldMove,
  type LiveFold,
} from "../math/fold";
import { starText } from "./ladderUi";
import { CHECK_H, CheckRow, keyTap, MUTED, NumBox } from "./hand";
import { fill, FONT, INK, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const W = 640;
const [SX, SY, SW, SH] = [40, 92, 560, 76];
const SHADE = "#a5d8ff";
const NEW = "#e8590c";

/** The strip: d pieces, the first n shaded; creases that were there before the last move solid, new ones dashed. */
function Strip({ n, d, before }: { n: number; d: number; before: number }) {
  const step = SW / d;
  const lines: ReactNode[] = [];
  for (let k = 1; k < d; k++) {
    // A crease is old when it falls on one of the strip's creases before the last move.
    const old = Number.isInteger((k * before) / d);
    lines.push(<line key={k} x1={SX + k * step} y1={SY} x2={SX + k * step} y2={SY + SH} stroke={old ? INK : NEW} strokeWidth={old ? 2 : 1.6} strokeDasharray={old ? undefined : "5 3"} />);
  }
  return (
    <g pointerEvents="none">
      <rect x={SX} y={SY} width={SW} height={SH} fill="#fff" />
      <rect x={SX} y={SY} width={n * step} height={SH} fill={SHADE} />
      {lines}
      <rect x={SX} y={SY} width={SW} height={SH} fill="none" stroke={INK} strokeWidth={2.5} />
      {d <= 24 && Array.from({ length: d }, (_, k) => (
        <text key={k} x={SX + (k + 0.5) * step} y={SY + SH + 16} fontSize={11} textAnchor="middle" fill={MUTED}>{k + 1}</text>
      ))}
    </g>
  );
}

/** A card to fold the strip with: a small strip, folded or opened, and what it does. */
function Card({ x, y, m, label, onTap, disabled }: { x: number; y: number; m: FoldMove; label: string; onTap: () => void; disabled: boolean }) {
  const k = Math.abs(m);
  const act = () => !disabled && onTap();
  const [cw, ch] = [124, 84];
  const icon = (
    <g pointerEvents="none" stroke="#495057" strokeWidth={1.5}>
      <rect x={x + 22} y={y + 14} width={80} height={20} fill="#fff" />
      {Array.from({ length: (m > 0 ? k : 1) * 2 - 1 }, (_, i) => {
        const at = x + 22 + ((i + 1) * 80) / ((m > 0 ? k : 1) * 2);
        const fresh = m > 0 && i % 2 === 0;
        return <line key={i} x1={at} y1={y + 14} x2={at} y2={y + 34} stroke={fresh ? NEW : "#495057"} strokeDasharray={fresh ? "3 2" : undefined} />;
      })}
      {m < 0 && <path d={`M${x + 38} ${y + 40} l24 0 m-4 -4 l4 4 l-4 4 M${x + 86} ${y + 40} l-24 0`} fill="none" />}
    </g>
  );
  return (
    <g role="button" tabIndex={disabled ? -1 : 0} aria-label={label} aria-disabled={disabled || undefined} opacity={disabled ? 0.35 : 1}
      style={{ cursor: disabled ? "default" : "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={act} onKeyDown={(e) => keyTap(e, act)}>
      <title>{label}</title>
      <rect x={x} y={y} width={cw} height={ch} rx={12} fill={m > 0 ? "#f1f8ff" : "#fff9db"} stroke={m > 0 ? "#74c0fc" : "#fcc419"} strokeWidth={1.5} />
      {icon}
      <text x={x + cw / 2} y={y + 70} fontSize={22} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{m > 0 ? `×${k}` : `÷${k}`}</text>
    </g>
  );
}

export function FoldStrip({ state: d, set, w: words, svgRef }: PieceProps<"foldStrip">) {
  const [w, g] = [words.foldStrip, words.game];
  const game = useGame({ key: "zeno.foldstrip.v1", size: FOLD_LADDER.length, notices: FOLD_NOTICES, modes: ["puzzle", "endless", "free"], state: d, set, fresh: FOLD_FRESH });
  const task = foldNow(d);
  const stars = foldStars(d.misses);
  const start = foldStart(task, d);
  const trail = foldTrail(start, d.path);
  const at = trail[trail.length - 1];
  const before = trail.length > 1 ? trail[trail.length - 2].d : at.d;
  const change = (p: Partial<LiveFold>) => !d.done && set({ ...d, ...p, said: null });
  const move = (m: FoldMove) => foldOnce(at, m) && change({ path: [...d.path, m] });

  const check = () => {
    if (!task) return;
    const why = judgeFold(task, d);
    if (why) return game.miss({ misses: d.misses + 1, said: { kind: "wrong", why } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => foldNotice(task, d, streak), patch: { done: true } });
  };

  const ask = task ? fill(w.ask, { a: `${task.n}/${task.d}`, to: task.to }) : w.askFree;
  const right = task && fill(w.right, { a: `${task.n}/${task.d}`, b: `${d.top}/${task.to}`, stars: starText(stars) });
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right ?? ""}` }
    : d.done ? { tone: "ok", text: right ?? "" }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong[d.said.why], { d: at.d, to: task?.to ?? 0 }) }
    : { tone: "hint", text: fill(d.path.length ? w.hintMoved : w.hint, { k: at.n, n: at.d }) };

  // The trail, the last seven strips, each a tap back to it.
  const shown = trail.slice(-7);
  const skip = trail.length - shown.length;
  const gap = 78;
  const tx0 = W / 2 - ((shown.length - 1) * gap) / 2;
  const TY = 318;
  const H = task ? 470 : 390;
  const row = task && !d.done ? CHECK_H : 0;
  return (
    <>
      <GameHead game={game} g={g}>
        {task && <Stake stars={stars} tries={d.misses} g={g} />}
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H + row} viewBox={`0 0 ${W} ${H + row}`} fontFamily={FONT} style={{ touchAction: "none" }} aria-label={ask}>
          <rect width={W} height={H + row} fill="#fff" />
          {task ? (
            <g pointerEvents="none">
              <text x={SX} y={50} fontSize={16} fill={MUTED}>{w.startIs}</text>
              <SvgFrac n={task.n} d={task.d} x={SX + 118} y={44} size={20} />
              <text x={W - SX - 110} y={50} fontSize={16} textAnchor="end" fill={MUTED}>{w.goal}</text>
              <text x={W - SX - 80} y={41} fontSize={20} textAnchor="middle" fill={NEW}>?</text>
              <line x1={W - SX - 96} y1={45} x2={W - SX - 64} y2={45} stroke={INK} strokeWidth={1.5} />
              <text x={W - SX - 80} y={63} fontSize={20} textAnchor="middle" fill={INK}>{task.to}</text>
            </g>
          ) : (
            <g>
              <text x={SX} y={50} fontSize={16} fill={MUTED} pointerEvents="none">{w.startIs}</text>
              <NumBox x={SX + 100} y={12} w={56} h={36} size={18} value={d.n} min={1} max={d.d} label={w.startTop} onChange={(n) => set({ ...d, n, path: [] })} />
              <NumBox x={SX + 164} y={12} w={56} h={36} size={18} value={d.d} min={2} max={12} label={w.startBottom} onChange={(dd) => set({ ...d, d: dd, n: Math.min(d.n, dd), path: [] })} />
              <text x={SX + 160} y={70} fontSize={12} textAnchor="middle" fill={MUTED} pointerEvents="none">{w.topBottom}</text>
            </g>
          )}
          <Strip n={at.n} d={at.d} before={before} />
          {([2, 3, -2, -3] as FoldMove[]).map((m, i) => (
            <Card key={m} x={38 + i * 144} y={196} m={m} label={w.cards[`${m > 0 ? "fold" : "unfold"}${Math.abs(m)}` as "fold2"]}
              disabled={d.done || !foldOnce(at, m)} onTap={() => move(m)} />
          ))}
          {at.d * 2 > MAX_PIECES && <text x={W / 2} y={296} fontSize={12} textAnchor="middle" fill={MUTED} pointerEvents="none">{fill(w.most, { n: MAX_PIECES })}</text>}
          {shown.map((s, i) => {
            const k = skip + i;
            const last = k === trail.length - 1;
            const back = () => !last && change({ path: d.path.slice(0, k) });
            return (
              <g key={k} role="button" tabIndex={last || d.done ? -1 : 0} aria-label={fill(w.back, { f: `${s.n}/${s.d}` })}
                style={{ cursor: last || d.done ? "default" : "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={back} onKeyDown={(e) => keyTap(e, back)}>
                <rect x={tx0 + i * gap - 26} y={TY - 30} width={52} height={66} rx={8} fill={last ? "#e7f5ff" : "transparent"} stroke={last ? "#74c0fc" : "none"} />
                <SvgFrac n={s.n} d={s.d} x={tx0 + i * gap} y={TY} size={20} />
                {i > 0 && <text x={tx0 + i * gap - gap / 2} y={TY + 8} fontSize={22} textAnchor="middle" fill={INK} pointerEvents="none">=</text>}
              </g>
            );
          })}
          {skip > 0 && <text x={tx0 - 46} y={TY + 8} fontSize={18} textAnchor="middle" fill={MUTED} pointerEvents="none">…</text>}
          {task && (
            <g>
              <text x={W / 2 - 150} y={TY + 112} fontSize={16} textAnchor="end" fill={MUTED} pointerEvents="none">{w.answer}</text>
              <SvgFrac n={task.n} d={task.d} x={W / 2 - 110} y={TY + 106} size={22} />
              <text x={W / 2 - 66} y={TY + 114} fontSize={24} textAnchor="middle" fill={INK} pointerEvents="none">=</text>
              {d.done ? (
                <SvgFrac n={d.top} d={task.to} x={W / 2 - 10} y={TY + 106} size={22} />
              ) : (
                <g>
                  <NumBox x={W / 2 - 40} y={TY + 56} w={60} h={44} value={d.top} min={0} max={MAX_PIECES} label={w.top} onChange={(top) => change({ top })} />
                  <line x1={W / 2 - 44} y1={TY + 106} x2={W / 2 + 24} y2={TY + 106} stroke={INK} strokeWidth={3} />
                  <text x={W / 2 - 10} y={TY + 134} fontSize={24} textAnchor="middle" fill={INK} pointerEvents="none">{task.to}</text>
                </g>
              )}
            </g>
          )}
          {row > 0 && <CheckRow w={W} y={H} check={{ text: g.check, onTap: check }} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
