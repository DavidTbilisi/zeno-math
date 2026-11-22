// Overflow bars, worked by hand: bars of equal parts, a tap shades up to a part (a tap on the last one shaded takes it
// off), and shading past one whole spills into the next bar, up to three. A number line under the bars runs from 0 to
// 3, with the shaded amount marked on it. A puzzle asks to shade an improper fraction or a mixed number and write it
// the other way. In free play the parts per bar are set, and the shading reads both ways. Built on the game shell.
import type { ReactNode } from "react";
import {
  barsFor,
  judgeOverflow,
  MAX_BARS,
  MAX_D,
  mixedOf,
  OVERFLOW_FRESH,
  OVERFLOW_LADDER,
  OVERFLOW_NOTICES,
  overflowNotice,
  overflowNow,
  overflowStars,
  tapPart,
  type LiveOverflow,
} from "../math/overflowBars";
import { starText } from "./ladderUi";
import { CHECK_H, CheckRow, keyTap, MUTED, NumBox } from "./hand";
import { fill, FONT, INK, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const W = 640;
const X0 = 60;
const L = 520;
const [GAP, BH] = [54, 40];
const SHADE = "#ffa94d";
const EDGE = "#d9480f";
/** n/d as a mixed number: 11/4 as "2 3/4", 8/4 as "2", 3/4 as "3/4". */
const mixedText = (n: number, d: number) => {
  const { w, a } = mixedOf(n, d);
  return w && a ? `${w} ${a}/${d}` : w ? `${w}` : `${a}/${d}`;
};

export function OverflowBars({ state: s, set, w: words, svgRef }: PieceProps<"overflowBars">) {
  const [w, g] = [words.overflowBars, words.game];
  const game = useGame({ key: "zeno.overflow.v1", size: OVERFLOW_LADDER.length, notices: OVERFLOW_NOTICES, modes: ["puzzle", "endless", "free"], state: s, set, fresh: OVERFLOW_FRESH });
  const task = overflowNow(s);
  const d = task ? task.d : s.d;
  const stars = overflowStars(s.misses);
  const change = (p: Partial<LiveOverflow>) => !s.done && set({ ...s, ...p, said: null });

  const check = () => {
    if (!task) return;
    const why = judgeOverflow(task, s);
    if (why) return game.miss({ misses: s.misses + 1, said: { kind: "wrong", why } });
    game.win({ stars, clean: s.misses === 0, notice: (streak) => overflowNotice(task, streak), patch: { done: true } });
  };

  // Free play has its parts box on top; a puzzle starts the bars higher.
  const BY = task ? 24 : 64;
  const NY = BY + MAX_BARS * GAP + 30;
  const AY = NY + 84;
  const bars = barsFor(s.shaded, d);
  const pw = L / d;
  const cells: ReactNode[] = [];
  for (let b = 0; b < bars; b++) {
    const y = BY + b * GAP;
    for (let k = 0; k < d; k++) {
      const i = b * d + k;
      const on = i < s.shaded;
      const tap = () => change({ shaded: tapPart(s.shaded, i) });
      cells.push(
        <rect key={i} x={X0 + k * pw} y={y} width={pw} height={BH} fill={on ? SHADE : "#fff"} stroke={EDGE} strokeWidth={1.5}
          role="button" tabIndex={s.done ? -1 : 0} aria-label={fill(w.part, { b: b + 1, k: k + 1 })} aria-pressed={on}
          style={{ cursor: s.done ? "default" : "pointer" }} onPointerDown={(e) => e.stopPropagation()}
          onClick={() => !s.done && tap()} onKeyDown={(e) => !s.done && keyTap(e, tap)} />,
      );
    }
    const full = s.shaded >= (b + 1) * d;
    cells.push(
      <g key={`b${b}`} pointerEvents="none">
        <rect x={X0} y={y} width={L} height={BH} fill="none" stroke={EDGE} strokeWidth={2.5} />
        {full && <text x={X0 - 18} y={y + BH / 2 + 7} fontSize={20} fontWeight={700} textAnchor="middle" fill="#2b8a3e">{b + 1}</text>}
      </g>,
    );
  }

  // The number line, 0 to 3, in steps of one part, the shaded amount along it.
  const U = L / MAX_BARS;
  const at = X0 + (s.shaded / d) * U;
  const reveal = !task || s.done;
  const line = (
    <g pointerEvents="none">
      <line x1={X0} y1={NY} x2={X0 + L + 16} y2={NY} stroke={INK} strokeWidth={2} />
      <path d={`M${X0 + L + 16} ${NY - 5} l8 5 l-8 5 z`} fill={INK} />
      {Array.from({ length: MAX_BARS * d + 1 }, (_, j) => {
        const big = j % d === 0;
        return <line key={j} x1={X0 + (j / d) * U} y1={NY - (big ? 10 : 5)} x2={X0 + (j / d) * U} y2={NY + (big ? 10 : 5)} stroke={INK} strokeWidth={big ? 2 : 1} />;
      })}
      {Array.from({ length: MAX_BARS + 1 }, (_, k) => (
        <text key={k} x={X0 + k * U} y={NY + 30} fontSize={16} textAnchor="middle" fill={INK}>{k}</text>
      ))}
      {s.shaded > 0 && (
        <g>
          <line x1={X0} y1={NY} x2={at} y2={NY} stroke={SHADE} strokeWidth={6} strokeLinecap="round" />
          <path d={`M${at} ${NY - 8} l-7 -12 h14 z`} fill={EDGE} />
          {reveal && <text x={at} y={NY - 26} fontSize={15} fontWeight={700} textAnchor="middle" fill={EDGE}>{`${s.shaded}/${d}`}</text>}
        </g>
      )}
    </g>
  );

  let answer: ReactNode = null;
  if (task) {
    const { w: tw, a: ta } = mixedOf(task.n, task.d);
    const given =
      task.kind === "toMixed" ? <SvgFrac n={task.n} d={task.d} x={X0 + 24} y={AY} size={22} />
      : (
        <g>
          <text x={X0 + 10} y={AY + 10} fontSize={30} fontWeight={700} textAnchor="middle" fill={INK}>{tw}</text>
          <SvgFrac n={ta} d={task.d} x={X0 + 42} y={AY} size={20} />
        </g>
      );
    const ax = X0 + 110;
    answer = (
      <g>
        <g pointerEvents="none">
          {given}
          <text x={X0 + 80} y={AY + 9} fontSize={26} textAnchor="middle" fill={INK}>=</text>
        </g>
        {s.done ? (
          <text x={ax} y={AY + 10} fontSize={28} fontWeight={700} fill="#2b8a3e" pointerEvents="none">
            {task.kind === "toMixed" ? mixedText(task.n, task.d) : `${task.n}/${task.d}`}
          </text>
        ) : (
          <g>
            {task.kind === "toMixed" && <NumBox x={ax} y={AY - 24} w={54} h={48} value={s.whole} min={0} max={9} label={w.whole} onChange={(whole) => change({ whole })} />}
            {(() => {
              const fx = task.kind === "toMixed" ? ax + 66 : ax;
              return (
                <g>
                  <NumBox x={fx} y={AY - 50} w={52} h={44} value={s.top} min={0} max={30} label={w.top} onChange={(top) => change({ top })} />
                  <line x1={fx - 4} y1={AY} x2={fx + 56} y2={AY} stroke={INK} strokeWidth={3} />
                  <NumBox x={fx} y={AY + 6} w={52} h={44} value={s.bottom} min={1} max={30} label={w.bottom} onChange={(bottom) => change({ bottom })} />
                </g>
              );
            })()}
          </g>
        )}
      </g>
    );
  }

  const f = task ? `${task.n}/${task.d}` : `${s.shaded}/${d}`;
  const m = task ? mixedText(task.n, task.d) : mixedText(s.shaded, d);
  const ask = !task ? w.askFree : task.kind === "toMixed" ? fill(w.askMixed, { f }) : fill(w.askImproper, { m });
  const right = fill(w.right, { f, m, stars: starText(stars) });
  const { w: mw, a: ma } = mixedOf(task?.n ?? 0, d);
  const status = task ? fill(w.shadedRead, { k: s.shaded }) : s.shaded > d ? fill(w.freeRead, { f, m }) : fill(w.freeOne, { f });
  const said: Line =
    s.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[s.said.key]} ${right}` }
    : s.done ? { tone: "ok", text: right }
    : s.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong[s.said.why], { f: task?.kind === "toImproper" ? m : f, d, w: mw, a: ma }) }
    : { tone: "hint", text: status };
  const H = task ? AY + 70 : NY + 50;
  const row = task && !s.done ? CHECK_H : 0;
  return (
    <>
      <GameHead game={game} g={g}>
        {task && <Stake stars={stars} tries={s.misses} g={g} />}
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={s.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H + row} viewBox={`0 0 ${W} ${H + row}`} fontFamily={FONT} style={{ touchAction: "none" }} aria-label={ask}>
          <rect width={W} height={H + row} fill="#fff" />
          {!task && (
            <g>
              <text x={W - 130} y={40} fontSize={15} fill={MUTED} textAnchor="end" pointerEvents="none">{w.parts}</text>
              <NumBox x={W - 120} y={12} w={50} h={40} size={18} value={s.d} min={2} max={MAX_D} label={w.parts} onChange={(dd) => set({ ...s, d: dd, shaded: Math.min(s.shaded, MAX_BARS * dd) })} />
            </g>
          )}
          {cells}
          {line}
          {answer}
          {row > 0 && <CheckRow w={W} y={H} check={{ text: g.check, onTap: check }} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={s.done} />
      <Said line={said} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
