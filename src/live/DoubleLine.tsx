// Double number line, by hand. Two lines, the top amount over the bottom one, tied at 0 and at the pair given; a red
// flag stands on the amount asked, a "?" across from it. A tap on a mark (either line, the column between) picks it; two
// picked make a gap, blue on both lines, and the pills under the picture split it (÷n) or lay it again from its start
// (×n). Every new mark shows both amounts, so the partner of the flag can be read once a mark stands on it: the puzzle
// is done then, its stars from the moves against the fewest. ↶ takes the last move back. Built on the game shell.
import type { ReactNode } from "react";
import { Frac } from "../math/fraction";
import {
  afterMove,
  DOUBLE_FRESH,
  DOUBLE_LADDER,
  DOUBLE_NOTICES,
  doubleNotice,
  doubleNow,
  doubleStars,
  fewest,
  fr,
  gapOf,
  madeBy,
  NS,
  partner,
  reached,
  showVal,
  tapMark,
  targetBot,
  ticksOf,
  type DMove,
  type DoubleOp,
} from "../math/doubleLine";
import { BLUE, GREEN, keyTap, MUTED, Pill, PillRows, pillRowsH, type RowItem } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 660;
const X0 = 170;
const L = 460;
const TY = 120;
const BY = 222;
const FLAG = "#e03131";
const parse = (s: string) => Frac.parse(s) ?? Frac.ZERO;
const same = (x: Frac, y: Frac) => x.n === y.n && x.d === y.d;

/** A tappable SVG group with the hand kit's press rules. */
function Tap({ label, on, children }: { label: string; on: (() => void) | null; children: ReactNode }) {
  return (
    <g role="button" tabIndex={on ? 0 : -1} aria-label={label} aria-disabled={!on || undefined}
      style={{ cursor: on ? "pointer" : "default" }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); on?.(); }}
      onKeyDown={(e) => on && keyTap(e, on)}>
      {children}
    </g>
  );
}

/** Words that wrap onto a second line past `n` letters, for a line's name in the column before it. */
function Name({ x, y, text }: { x: number; y: number; text: string }) {
  const words = text.split(" ");
  const lines: string[] = [""];
  for (const w of words) {
    if (lines.at(-1)!.length && (lines.at(-1)! + " " + w).length > 16) lines.push(w);
    else lines[lines.length - 1] = lines.at(-1)! ? `${lines.at(-1)} ${w}` : w;
  }
  return (
    <text x={x} y={y - (lines.length - 1) * 8 + 5} fontSize={15} fontWeight={700} fill={INK} pointerEvents="none">
      {lines.map((s, i) => <tspan key={i} x={x} dy={i ? 17 : 0}>{s}</tspan>)}
    </text>
  );
}

export function DoubleLine({ state: s, set, w: words, svgRef }: PieceProps<"doubleLine">) {
  const [w, g] = [words.doubleLine, words.game];
  const game = useGame({ key: "zeno.doubleline.v1", size: DOUBLE_LADDER.length, notices: DOUBLE_NOTICES, modes: ["puzzle", "endless"], state: s, set, fresh: DOUBLE_FRESH });
  const task = doubleNow(s);
  const best = fewest(task) ?? 0;
  const ticks = ticksOf(task, s.moves);
  const ctx = w.ctx[task.ctx];
  const T = targetBot(task);
  const xOf = (v: Frac) => X0 + (v.toNumber() / task.end) * L;
  const gap = gapOf(s.sel);
  const stars = doubleStars(s.moves.length, best);

  const move = (op: DoubleOp, n: number) => {
    if (!gap || s.done) return;
    const m: DMove = { p: fr(gap[0]), q: fr(gap[1]), op, n };
    const moves = [...s.moves, m];
    const after = ticksOf(task, moves);
    if (!reached(task, after)) return game.tap({ moves, sel: [], said: null });
    const k = moves.length;
    game.win({
      stars: doubleStars(k, best),
      clean: k <= best,
      notice: (streak) => doubleNotice(task, moves, streak),
      patch: { moves, sel: [], done: true },
    });
  };
  const back = () => set({ ...s, moves: s.moves.slice(0, -1), sel: [], said: null });
  const pick = (v: Frac) => !s.done && set({ ...s, sel: tapMark(s.sel, fr(v)), said: null });

  // The marks: a column per mark, both amounts, a tap picks it. Labels that would touch the one before drop lower.
  let lastX = -99;
  let low = false;
  const marks = ticks.map((v) => {
    const x = xOf(v);
    low = x - lastX < 30 ? !low : false;
    lastX = x;
    const given = v.isZero() || (v.isInt() && v.n === task.a);
    const on = s.sel.includes(fr(v));
    const flag = same(v, task.t);
    const tone = flag ? GREEN : on ? BLUE : INK;
    const bot = partner(task, v);
    const label = fill(w.mark, { top: showVal(v), bot: showVal(bot) });
    return (
      <Tap key={fr(v)} label={label} on={s.done ? null : () => pick(v)}>
        <title>{label}</title>
        <rect x={x - 12} y={TY - 44} width={24} height={BY - TY + 84} fill={on ? "rgba(25,113,194,0.08)" : "transparent"} />
        <line x1={x} y1={TY} x2={x} y2={BY} stroke={tone} strokeWidth={1} strokeDasharray="3 4" opacity={0.5} pointerEvents="none" />
        {[TY, BY].map((y) => <line key={y} x1={x} y1={y - 10} x2={x} y2={y + 10} stroke={tone} strokeWidth={on || given || flag ? 3 : 2} pointerEvents="none" />)}
        {on && [TY, BY].map((y) => <circle key={y} cx={x} cy={y} r={7} fill="none" stroke={BLUE} strokeWidth={2.5} pointerEvents="none" />)}
        <g pointerEvents="none" fontWeight={given || flag ? 800 : 600} fill={tone} textAnchor="middle">
          <text x={x} y={TY - 16 - (low ? 18 : 0)} fontSize={16}>{showVal(v)}</text>
          <text x={x} y={BY + 30 + (low ? 18 : 0)} fontSize={16}>{showVal(bot)}</text>
        </g>
      </Tap>
    );
  });

  // The flag on the line the amount is known on, a "?" across from it, until a mark stands there.
  const fx = xOf(task.t);
  const hit = reached(task, ticks);
  const [flagY, askY] = task.ask === "bot" ? [TY, BY] : [BY, TY];
  const flag = !hit && (
    <g pointerEvents="none">
      <line x1={fx} y1={TY} x2={fx} y2={BY} stroke={FLAG} strokeWidth={1.5} strokeDasharray="5 4" />
      {task.ask === "bot" ? (
        <g>
          <line x1={fx} y1={TY + 10} x2={fx} y2={TY - 48} stroke={FLAG} strokeWidth={2} />
          <path d={`M${fx} ${TY - 48} l20 7 l-20 7 z`} fill={FLAG} />
          <text x={fx + 24} y={TY - 36} fontSize={16} fontWeight={800} fill={FLAG}>{showVal(task.t)}</text>
        </g>
      ) : (
        <g>
          <line x1={fx} y1={BY - 10} x2={fx} y2={BY + 52} stroke={FLAG} strokeWidth={2} />
          <path d={`M${fx} ${BY + 38} l20 7 l-20 7 z`} fill={FLAG} />
          <text x={fx + 24} y={BY + 50} fontSize={16} fontWeight={800} fill={FLAG}>{showVal(T)}</text>
        </g>
      )}
      <circle cx={fx} cy={askY} r={13} fill="#fff" stroke={FLAG} strokeWidth={2} />
      <text x={fx} y={askY + 6} fontSize={17} fontWeight={800} textAnchor="middle" fill={FLAG}>?</text>
      <line x1={fx} y1={flagY - 10} x2={fx} y2={flagY + 10} stroke={FLAG} strokeWidth={3} />
    </g>
  );

  // The last move, as arcs over the top line: the parts a split made, or the gap laid n times.
  const last = s.moves.at(-1);
  const arcs: ReactNode[] = [];
  if (last) {
    const [p, q] = [parse(last.p), parse(last.q)];
    const stops = last.op === "split" ? [p, ...madeBy(p, q, "split", last.n), q] : [p, ...Array.from({ length: last.n }, (_, i) => p.add(q.sub(p).mul(new Frac(i + 1))))];
    for (let i = 0; i + 1 < stops.length; i++) {
      const [x1, x2] = [xOf(stops[i]), xOf(stops[i + 1])];
      const h = Math.min(30, 8 + (x2 - x1) * 0.3);
      arcs.push(<path key={i} d={`M${x1} ${TY - 52} Q${(x1 + x2) / 2} ${TY - 52 - 2 * h} ${x2} ${TY - 52}`} fill="none" stroke={GREEN} strokeWidth={2} />);
    }
    arcs.push(
      <text key="op" x={(xOf(stops[0]) + xOf(stops.at(-1)!)) / 2} y={TY - 86} fontSize={14} fontWeight={700} textAnchor="middle" fill={GREEN}>
        {`${last.op === "split" ? "÷" : "×"}${last.n}`}
      </text>,
    );
  }

  // The pills: ÷n and ×n on the gap picked, each greyed when it would leave the lines or make nothing new.
  const items: RowItem[] = gap && !s.done
    ? (["split", "times"] as const).flatMap((op, k) => [
        { text: op === "split" ? w.split : w.times, brk: k > 0 },
        ...NS.map((n) => ({
          text: `${op === "split" ? "÷" : "×"}${n}`,
          title: fill(op === "split" ? w.splitTitle : w.timesTitle, { p: showVal(gap[0]), q: showVal(gap[1]), n }),
          disabled: !afterMove(ticks, task.end, gap[0], gap[1], op, n),
          onTap: () => move(op, n),
        })),
      ])
    : [];
  const RY = BY + 74;
  const rowsH = Math.max(80, pillRowsH(items, W));
  const H = RY + rowsH;

  const ask = fill(task.ask === "bot" ? ctx.askBot : ctx.askTop, { a: task.a, A: task.A, t: showVal(task.t), T: showVal(T) });
  const doneText = `${fill(w.right, { t: showVal(task.t), T: showVal(T), k: s.moves.length, stars: starText(stars) })}${s.moves.length > best ? ` ${fill(w.fewer, { m: best })}` : ""}`;
  const lastText = last && fill(last.op === "split" ? w.splitDone : w.timesDone, {
    p: showVal(parse(last.p)), q: showVal(parse(last.q)), n: last.n,
    list: madeBy(parse(last.p), parse(last.q), last.op, last.n).map((v) => `${showVal(v)} ↔ ${showVal(partner(task, v))}`).join(", "),
  });
  const said: Line =
    s.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[s.said.key]} ${doneText}` }
    : s.done ? { tone: s.moves.length > best ? "near" : "ok", text: doneText }
    : gap ? { tone: "hint", text: fill(w.pickTwo, { p: showVal(gap[0]), q: showVal(gap[1]) }) }
    : s.sel.length === 1 ? { tone: "hint", text: fill(w.pickOne, { p: showVal(parse(s.sel[0])) }) }
    : lastText ? { tone: "hint", text: lastText }
    : { tone: "hint", text: w.hint };

  return (
    <>
      <GameHead game={game} g={g}>
        <span className="live-stake">
          <b aria-label={`${stars} ★`}>{starText(stars)}</b>
          {fill(w.tally, { k: s.moves.length })}
        </span>
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={s.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} style={{ touchAction: "none" }} aria-label={ask}>
          <rect width={W} height={H} fill="#fff" />
          <Name x={16} y={TY} text={ctx.top} />
          <Name x={16} y={BY} text={ctx.bot} />
          {[TY, BY].map((y) => <line key={y} x1={X0 - 10} y1={y} x2={X0 + L + 14} y2={y} stroke={INK} strokeWidth={2} pointerEvents="none" />)}
          {[TY, BY].map((y) => <path key={`a${y}`} d={`M${X0 + L + 14} ${y - 6} l10 6 l-10 6 z`} fill={INK} pointerEvents="none" />)}
          {gap && [TY, BY].map((y) => (
            <line key={`g${y}`} x1={xOf(gap[0])} y1={y} x2={xOf(gap[1])} y2={y} stroke={BLUE} strokeWidth={6} opacity={0.45} pointerEvents="none" />
          ))}
          <g pointerEvents="none">{arcs}</g>
          {flag}
          {marks}
          {items.length > 0 ? <PillRows items={items} w={W} y={RY} /> : !s.done && (
            <text x={W / 2} y={RY + 30} fontSize={15} textAnchor="middle" fill={MUTED} pointerEvents="none">{w.pickHint}</text>
          )}
          {s.moves.length > 0 && !s.done && <Pill x={W - 58} y={8} w={46} h={32} size={18} text="↶" title={w.takeBack} onTap={back} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={s.done} />
      <Said line={said} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
