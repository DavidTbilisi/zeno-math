// How many fit?, worked by hand: dividing by measuring. A bar the size of the dividend on a ruler of wholes, and a tile
// the size of the divisor in the tray: a tap on it lays the next one along the bar, a tap on a laid one takes it off
// with those after it. The last tile may poke past the bar's end: it is drawn cut into parts of the tile, the ones inside
// shaded, so its leftover reads as a part of a tile (¼ of a tile), not of the whole. The answer is a whole number and a
// part. In free play the bar and the tile are set by their own tops and bottoms. Built on the game shell (useGame).
import type { ReactNode } from "react";
import { Frac } from "../math/fraction";
import {
  FIT_FRESH,
  FIT_LADDER,
  FIT_NOTICES,
  fitNotice,
  fitNow,
  fitOf,
  fitStars,
  freeFit,
  judgeFit,
  tilesToCover,
  type FitTask,
  type LiveFitTiles,
} from "../math/fitTiles";
import { starText } from "./ladderUi";
import { CHECK_H, CheckRow, keyTap, MUTED, NumBox, RED } from "./hand";
import { fill, FONT, INK, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const W = 640;
const X0 = 60;
const LEN = 520;
const [RY, BY, TY, BH] = [92, 104, 164, 46];
const BAR = "#ffd8a8";
const TILE = ["#b2f2bb", "#8ce99a"];
const fr = (f: Frac) => `${f.n}/${f.d}`;
/** A number written as a whole and a part: 2¼ as "2 1/4". */
const mixed = (q: Frac) => {
  const w = Math.floor(q.toNumber() + 1e-9);
  const p = q.sub(new Frac(w, 1));
  return w && !p.isZero() ? `${w} ${fr(p)}` : w ? `${w}` : fr(p);
};

/** The tile in the tray, to lay the next one with. */
function Tray({ x, y, w, b, label, onTap, disabled }: { x: number; y: number; w: number; b: Frac; label: string; onTap: () => void; disabled: boolean }) {
  const act = () => !disabled && onTap();
  return (
    <g role="button" tabIndex={disabled ? -1 : 0} aria-label={label} aria-disabled={disabled || undefined} opacity={disabled ? 0.35 : 1}
      style={{ cursor: disabled ? "default" : "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={act} onKeyDown={(e) => keyTap(e, act)}>
      <title>{label}</title>
      <rect x={x - 6} y={y - 6} width={Math.max(w, 44) + 12} height={BH + 12} rx={10} fill="#f8f9fa" stroke="#ced4da" strokeDasharray="5 4" />
      <rect x={x} y={y} width={Math.max(w, 44)} height={BH} rx={3} fill={TILE[0]} stroke="#2b8a3e" strokeWidth={1.5} />
      <g pointerEvents="none"><SvgFrac n={b.n} d={b.d} x={x + Math.max(w, 44) / 2} y={y + BH / 2 - 2} size={15} /></g>
    </g>
  );
}

export function FitTiles({ state: d, set, w: words, svgRef }: PieceProps<"fitTiles">) {
  const [w, g] = [words.fitTiles, words.game];
  const game = useGame({ key: "zeno.fittiles.v1", size: FIT_LADDER.length, notices: FIT_NOTICES, modes: ["puzzle", "endless", "free"], state: d, set, fresh: FIT_FRESH });
  const task = fitNow(d);
  const t: FitTask = task ?? freeFit(d);
  const stars = fitStars(d.misses);
  const change = (p: Partial<LiveFitTiles>) => !d.done && set({ ...d, ...p, said: null });
  const cover = tilesToCover(t);
  const { whole, part } = fitOf(t);

  const check = () => {
    if (!task) return;
    const why = judgeFit(task, d);
    if (why) return game.miss({ misses: d.misses + 1, said: { kind: "wrong", why } });
    game.win({ stars, clean: d.misses === 0, notice: (streak) => fitNotice(task, streak), patch: { done: true } });
  };

  // The ruler: a whole as long as fits the longest bar.
  const wholes = Math.max(1, Math.ceil(t.a.toNumber() - 1e-9));
  const U = LEN / wholes;
  const [aw, bw] = [t.a.toNumber() * U, t.b.toNumber() * U];
  const end = X0 + aw;
  const laid = Math.min(d.laid, cover);
  const cut = laid === cover && !part.isZero();

  const tiles: ReactNode[] = [];
  for (let i = 0; i < laid; i++) {
    const x = X0 + i * bw;
    const isCut = cut && i === laid - 1;
    const take = () => change({ laid: i });
    tiles.push(
      <g key={i} role="button" tabIndex={d.done ? -1 : 0} aria-label={fill(w.takeOff, { k: i + 1 })} style={{ cursor: d.done ? "default" : "pointer" }}
        onPointerDown={(e) => e.stopPropagation()} onClick={() => !d.done && take()} onKeyDown={(e) => !d.done && keyTap(e, take)}>
        {isCut ? (
          <g>
            {Array.from({ length: part.d }, (_, k) => {
              const inside = k < part.n;
              return <rect key={k} x={x + (k * bw) / part.d} y={TY} width={bw / part.d} height={BH} fill={inside ? TILE[i % 2] : "url(#fit-hatch)"}
                stroke={inside ? "#2b8a3e" : "#adb5bd"} strokeWidth={1} strokeDasharray={inside ? undefined : "4 3"} />;
            })}
            <rect x={x} y={TY} width={bw} height={BH} fill="none" stroke="#2b8a3e" strokeWidth={1.5} strokeDasharray="6 3" pointerEvents="none" />
          </g>
        ) : (
          <rect x={x} y={TY} width={bw} height={BH} fill={TILE[i % 2]} stroke="#2b8a3e" strokeWidth={1.5} />
        )}
        {bw >= 18 && !isCut && <text x={x + bw / 2} y={TY + BH / 2 + 6} fontSize={16} fontWeight={700} textAnchor="middle" fill="#2b8a3e" pointerEvents="none">{i + 1}</text>}
      </g>,
    );
  }

  const ask = task ? fill(w.ask, { a: mixed(t.a), b: fr(t.b) }) : w.askFree;
  const right = task && fill(w.right, { a: mixed(t.a), b: fr(t.b), q: mixed(t.a.div(t.b)), stars: starText(stars) });
  const status =
    laid < cover ? fill(laid ? w.laidSome : w.hint, { k: laid })
    : cut ? fill(w.cutRead, { k: whole, p: fr(part) })
    : fill(w.exactRead, { k: whole });
  const line: Line =
    d.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[d.said.key]} ${right ?? ""}` }
    : d.done ? { tone: "ok", text: right ?? "" }
    : d.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong[d.said.why], { p: fr(part), k: whole }) }
    : { tone: "hint", text: status };
  const H = 400;
  const row = task && !d.done ? CHECK_H : 0;
  const AY = 306;
  return (
    <>
      <GameHead game={game} g={g}>
        {task && <Stake stars={stars} tries={d.misses} g={g} />}
      </GameHead>
      <Said line={{ tone: "prompt", text: ask }} />
      <Stage game={game} stars={stars} done={d.done} g={g} notices={w.notices}>
        <svg ref={svgRef} className="hand-pic" width={W} height={H + row} viewBox={`0 0 ${W} ${H + row}`} fontFamily={FONT} style={{ touchAction: "none" }} aria-label={ask}>
          <defs>
            <pattern id="fit-hatch" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={8} height={8} fill="#fff" />
              <line x1={0} y1={0} x2={0} y2={8} stroke="#ced4da" strokeWidth={3} />
            </pattern>
          </defs>
          <rect width={W} height={H + row} fill="#fff" />
          {task ? (
            <g pointerEvents="none">
              <text x={X0} y={44} fontSize={15} fill={MUTED}>{w.bar}</text>
              <SvgFrac n={t.a.n} d={t.a.d} x={X0 + 64} y={40} size={18} />
              <text x={X0 + 140} y={44} fontSize={15} fill={MUTED}>{w.tile}</text>
              <SvgFrac n={t.b.n} d={t.b.d} x={X0 + 194} y={40} size={18} />
            </g>
          ) : (
            <g>
              <text x={X0} y={44} fontSize={15} fill={MUTED} pointerEvents="none">{w.bar}</text>
              <NumBox x={X0 + 40} y={14} w={46} h={36} size={17} value={d.an} min={1} max={2 * d.ad} label={w.barTop} onChange={(an) => set({ ...d, an, laid: 0 })} />
              <NumBox x={X0 + 92} y={14} w={46} h={36} size={17} value={d.ad} min={1} max={6} label={w.barBottom} onChange={(ad) => set({ ...d, ad, an: Math.min(d.an, 2 * ad), laid: 0 })} />
              <text x={X0 + 170} y={44} fontSize={15} fill={MUTED} pointerEvents="none">{w.tile}</text>
              <NumBox x={X0 + 210} y={14} w={46} h={36} size={17} value={d.bn} min={1} max={d.bd} label={w.tileTop} onChange={(bn) => set({ ...d, bn, laid: 0 })} />
              <NumBox x={X0 + 262} y={14} w={46} h={36} size={17} value={d.bd} min={1} max={12} label={w.tileBottom} onChange={(bd) => set({ ...d, bd, bn: Math.min(d.bn, bd), laid: 0 })} />
            </g>
          )}
          {/* The ruler of wholes, and the bar on it, cut into its own parts. */}
          <g pointerEvents="none">
            <line x1={X0} y1={RY} x2={X0 + LEN} y2={RY} stroke="#adb5bd" />
            {Array.from({ length: wholes + 1 }, (_, k) => (
              <g key={k}>
                <line x1={X0 + k * U} y1={RY - 8} x2={X0 + k * U} y2={RY + 2} stroke={INK} strokeWidth={2} />
                <text x={X0 + k * U} y={RY - 12} fontSize={14} textAnchor="middle" fill={INK}>{k}</text>
              </g>
            ))}
            <rect x={X0} y={BY} width={aw} height={BH} fill={BAR} stroke="#d9480f" strokeWidth={2} />
            {Array.from({ length: Math.round(t.a.toNumber() * t.a.d) - 1 }, (_, k) => (
              <line key={k} x1={X0 + ((k + 1) * U) / t.a.d} y1={BY} x2={X0 + ((k + 1) * U) / t.a.d} y2={BY + BH} stroke="#d9480f" strokeWidth={1} strokeDasharray="3 3" />
            ))}
            <line x1={end} y1={BY - 6} x2={end} y2={TY + BH + 8} stroke={RED} strokeWidth={2.5} strokeDasharray="6 4" />
          </g>
          {tiles}
          {cut && (
            <g pointerEvents="none">
              <path d={`M${X0 + whole * bw} ${TY + BH + 8} v6 h${bw} v-6`} fill="none" stroke="#2b8a3e" strokeWidth={1.5} />
              <text x={X0 + whole * bw + bw / 2} y={TY + BH + 30} fontSize={14} textAnchor="middle" fill="#2b8a3e">{fill(w.ofTile, { p: fr(part) })}</text>
            </g>
          )}
          <Tray x={X0} y={248} w={bw} b={t.b} label={fill(w.lay, { b: fr(t.b) })} disabled={d.done || laid >= cover} onTap={() => change({ laid: laid + 1 })} />
          {task && (
            <g>
              <g pointerEvents="none">
                <SvgFrac n={t.a.n} d={t.a.d} x={W - 300} y={AY} size={20} />
                <text x={W - 270} y={AY + 8} fontSize={22} textAnchor="middle" fill={INK}>÷</text>
                <SvgFrac n={t.b.n} d={t.b.d} x={W - 240} y={AY} size={20} />
                <text x={W - 212} y={AY + 8} fontSize={22} textAnchor="middle" fill={INK}>=</text>
              </g>
              {d.done ? (
                <text x={W - 150} y={AY + 10} fontSize={26} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">{mixed(t.a.div(t.b))}</text>
              ) : (
                <g>
                  <NumBox x={W - 196} y={AY - 22} w={52} h={44} value={d.whole} min={0} max={30} label={w.whole} onChange={(whole) => change({ whole })} />
                  <NumBox x={W - 132} y={AY - 50} w={52} h={44} value={d.top} min={0} max={30} label={w.top} onChange={(top) => change({ top })} />
                  <line x1={W - 136} y1={AY} x2={W - 76} y2={AY} stroke={INK} strokeWidth={3} />
                  <NumBox x={W - 132} y={AY + 6} w={52} h={44} value={d.bottom} min={1} max={30} label={w.bottom} onChange={(bottom) => change({ bottom })} />
                </g>
              )}
            </g>
          )}
          {!task && laid >= cover && (
            <text x={W - 150} y={AY + 10} fontSize={24} fontWeight={700} textAnchor="middle" fill={INK} pointerEvents="none">= {mixed(t.a.div(t.b))}</text>
          )}
          {row > 0 && <CheckRow w={W} y={H} check={{ text: g.check, onTap: check }} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.done} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
