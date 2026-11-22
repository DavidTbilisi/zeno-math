// Find the whole, worked by hand. Build: a bar is a given part (this is 2/3); cut it into its parts with the box beside
// it, then lay parts from the tray until the row is one whole (a tap on a laid part takes it off with those after it).
// Name: a bar is one whole, or a part (this is 3/4); cut it to measure, and write what the piece under it is, as a
// part of one whole. Free play builds from a piece set by its own top and bottom. Built on the game shell (useGame).
import type { ReactNode } from "react";
import { Frac } from "../math/fraction";
import {
  builtOf,
  judgeWhole,
  MAX_ROW,
  WHOLE_FRESH,
  WHOLE_LADDER,
  WHOLE_NOTICES,
  wholeNotice,
  wholeNow,
  wholeStars,
  type LiveFindWhole,
  type WholeTask,
} from "../math/findWhole";
import { starText } from "./ladderUi";
import { CHECK_H, CheckRow, keyTap, MUTED, NumBox } from "./hand";
import { fill, FONT, INK, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const W = 640;
const X0 = 60;
const [BY, RY, BH] = [58, 150, 44];
const PIECE = "#ffd8a8";
const WHOLE = "#a5d8ff";
const PART = ["#b2f2bb", "#8ce99a"];
const fr = (f: Frac) => (f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`);

/** A bar cut into equal parts by dashed lines. */
function Bar({ y, len, parts, color, edge }: { y: number; len: number; parts: number; color: string; edge: string }) {
  return (
    <g pointerEvents="none">
      <rect x={X0} y={y} width={len} height={BH} fill={color} stroke={edge} strokeWidth={2} />
      {Array.from({ length: parts - 1 }, (_, k) => (
        <line key={k} x1={X0 + ((k + 1) * len) / parts} y1={y} x2={X0 + ((k + 1) * len) / parts} y2={y + BH} stroke={edge} strokeWidth={1.5} strokeDasharray="4 3" />
      ))}
    </g>
  );
}

/** "This is" and what the bar is: a fraction, or 1. */
function ThisIs({ label, f }: { label: string; f: Frac }) {
  return (
    <g pointerEvents="none">
      <text x={X0} y={42} fontSize={16} fill={MUTED}>{label}</text>
      {f.d === 1 ? <text x={X0 + 66} y={44} fontSize={22} fontWeight={700} fill={INK} textAnchor="middle">{f.n}</text> : <SvgFrac n={f.n} d={f.d} x={X0 + 66} y={36} size={18} />}
    </g>
  );
}

export function FindWhole({ state: d, set, w: words, svgRef }: PieceProps<"findWhole">) {
  const [w, g] = [words.findWhole, words.game];
  const game = useGame({ key: "zeno.findwhole.v1", size: WHOLE_LADDER.length, notices: WHOLE_NOTICES, modes: ["puzzle", "endless", "free"], state: d, set, fresh: WHOLE_FRESH });
  const task = wholeNow(d);
  const t: WholeTask = task ?? { kind: "build", n: d.n, d: d.d };
  const stars = wholeStars(d.misses);
  const change = (p: Partial<LiveFindWhole>) => !d.done && set({ ...d, ...p, said: null });

  const check = () => {
    if (!task) return;
    const why = judgeWhole(task, d);
    if (why) return game.miss({ misses: d.misses + 1, said: { kind: "wrong", why } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => wholeNotice(task, d, streak), patch: { done: true } });
  };

  // The bar on top: the piece (build) or the bar named (name), in steps of one part of the whole.
  const [steps, top] = t.kind === "build" ? [t.n, new Frac(t.n, t.d)] : [t.rn, new Frac(t.rn, t.rd)];
  const longest = t.kind === "build" ? Math.max(t.n, t.d) : Math.max(t.rn, t.pn);
  // A row longer than the frame (the uncut piece laid again and again) shrinks the whole picture, bars and all.
  const u0 = Math.min(110, 500 / longest);
  const rowLen = t.kind === "build" ? ((t.n * u0) / d.cut) * d.parts : 0;
  const u = u0 * Math.min(1, (W - X0 - 30) / Math.max(rowLen, 1));
  const cutBox = (
    <g>
      <text x={W - 124} y={42} fontSize={15} fill={MUTED} textAnchor="end" pointerEvents="none">{w.cutInto}</text>
      <NumBox x={W - 116} y={14} w={50} h={40} size={18} value={d.cut} min={1} max={12} label={w.cutLabel}
        onChange={(cut) => change({ cut, parts: cut })} />
    </g>
  );

  let body: ReactNode;
  let ask: string;
  let right = "";
  let status: string;
  if (t.kind === "build") {
    const p = (t.n * u) / d.cut;
    const built = builtOf(t.n, t.d, d.cut, d.parts);
    const one = built.sub(Frac.ONE).isZero();
    const part = new Frac(t.n, t.d * d.cut);
    ask = task ? fill(w.askBuild, { f: fr(top) }) : w.askFree;
    right = fill(w.rightBuild, { k: d.parts, p: fr(part), stars: starText(stars) });
    status = !task ? (one ? fill(w.freeOne, { k: d.parts, p: fr(part) }) : fill(w.freeRead, { f: fr(built) }))
      : d.cut === 1 && t.n > 1 ? fill(w.hintCut, { f: fr(top) })
      : fill(w.rowRead, { k: d.parts });
    const row: ReactNode[] = [];
    for (let i = 0; i < d.parts; i++) {
      const take = () => change({ parts: i });
      row.push(
        <rect key={i} x={X0 + i * p} y={RY} width={p} height={BH} fill={PART[i % 2]} stroke="#2b8a3e" strokeWidth={1.5}
          role="button" tabIndex={d.done ? -1 : 0} aria-label={fill(w.takeOff, { k: i + 1 })} style={{ cursor: d.done ? "default" : "pointer" }}
          onPointerDown={(e) => e.stopPropagation()} onClick={() => !d.done && take()} onKeyDown={(e) => !d.done && keyTap(e, take)} />,
      );
    }
    const can = !d.done && d.parts < MAX_ROW;
    const lay = () => can && change({ parts: d.parts + 1 });
    const tw = Math.max(p, 30);
    body = (
      <>
        {task ? <ThisIs label={w.thisIs} f={top} /> : (
          <g>
            <text x={X0} y={42} fontSize={16} fill={MUTED} pointerEvents="none">{w.thisIs}</text>
            <NumBox x={X0 + 44} y={14} w={46} h={40} size={18} value={d.n} min={1} max={12} label={w.pieceTop} onChange={(n) => set({ ...d, n, cut: 1, parts: 1 })} />
            <NumBox x={X0 + 96} y={14} w={46} h={40} size={18} value={d.d} min={1} max={8} label={w.pieceBottom} onChange={(dd) => set({ ...d, d: dd, cut: 1, parts: 1 })} />
          </g>
        )}
        {cutBox}
        <Bar y={BY} len={steps * u} parts={d.cut} color={PIECE} edge="#d9480f" />
        <text x={X0} y={RY - 12} fontSize={15} fill={MUTED} pointerEvents="none">{w.buildRow}</text>
        {row}
        {(d.done || (!task && one)) && (
          <g pointerEvents="none">
            <path d={`M${X0} ${RY + BH + 8} v6 h${d.parts * p} v-6`} fill="none" stroke="#2b8a3e" strokeWidth={2} />
            <text x={X0 + (d.parts * p) / 2} y={RY + BH + 32} fontSize={16} fontWeight={700} textAnchor="middle" fill="#2b8a3e">{w.one}</text>
          </g>
        )}
        <g role="button" tabIndex={can ? 0 : -1} aria-label={w.lay} aria-disabled={!can || undefined} opacity={can ? 1 : 0.35}
          style={{ cursor: can ? "pointer" : "default" }} onPointerDown={(e) => e.stopPropagation()} onClick={lay} onKeyDown={(e) => keyTap(e, lay)}>
          <title>{w.lay}</title>
          <rect x={X0 - 6} y={RY + BH + 46} width={tw + 12} height={BH + 12} rx={10} fill="#f8f9fa" stroke="#ced4da" strokeDasharray="5 4" />
          <rect x={X0} y={RY + BH + 52} width={tw} height={BH} rx={3} fill={PART[0]} stroke="#2b8a3e" strokeWidth={1.5} />
          <text x={X0 + tw + 18} y={RY + BH + 80} fontSize={14} fill={MUTED} pointerEvents="none">{w.trayLabel}</text>
        </g>
      </>
    );
  } else {
    const isOne = t.rn === t.rd;
    const want = new Frac(t.pn, t.rd);
    ask = isOne ? w.askNameOne : fill(w.askName, { r: fr(top) });
    right = fill(w.rightName, { a: fr(want), stars: starText(stars) });
    status = w.hintName;
    const AY = RY + BH + 70;
    body = (
      <>
        <ThisIs label={w.thisIs} f={top} />
        {cutBox}
        <Bar y={BY} len={steps * u} parts={d.cut} color={WHOLE} edge="#1971c2" />
        <text x={X0} y={RY - 12} fontSize={15} fill={MUTED} pointerEvents="none">{w.whatPiece}</text>
        <Bar y={RY} len={t.pn * u} parts={1} color={PIECE} edge="#d9480f" />
        <text x={X0} y={AY + 8} fontSize={16} fill={INK} pointerEvents="none">{w.pieceIs}</text>
        {d.done ? <SvgFrac n={want.n} d={want.d} x={X0 + 150} y={AY} size={22} /> : (
          <g>
            <NumBox x={X0 + 124} y={AY - 50} w={52} h={44} value={d.top} min={0} max={24} label={w.top} onChange={(top) => change({ top })} />
            <line x1={X0 + 120} y1={AY} x2={X0 + 180} y2={AY} stroke={INK} strokeWidth={3} />
            <NumBox x={X0 + 124} y={AY + 6} w={52} h={44} value={d.bottom} min={1} max={24} label={w.bottom} onChange={(bottom) => change({ bottom })} />
          </g>
        )}
      </>
    );
  }

  const shown = t.kind === "name" ? `${t.pn}/${t.rn}` : "";
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right}` }
    : d.done ? { tone: "ok", text: right }
    : d.said?.kind === "wrong" ? {
      tone: "wrong",
      text: fill(w.wrong[d.said.why], { f: t.kind === "build" ? fr(builtOf(t.n, t.d, d.cut, d.parts)) : "", n: steps, top: fr(top), s: shown }),
    }
    : { tone: "hint", text: status };
  const H = 330;
  const rowH = task && !d.done ? CHECK_H : 0;
  return (
    <>
      <GameHead game={game} g={g}>
        {task && <Stake stars={stars} tries={d.misses} g={g} />}
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H + rowH} viewBox={`0 0 ${W} ${H + rowH}`} fontFamily={FONT} style={{ touchAction: "none" }} aria-label={ask}>
          <rect width={W} height={H + rowH} fill="#fff" />
          {body}
          {rowH > 0 && <CheckRow w={W} y={H} check={{ text: g.check, onTap: check }} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
