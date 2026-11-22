// Frog jumps, by hand. Lily pads under the line, one per jump size: a tap on a pad makes the frog jump that far. A tap
// on a jump's arc takes it off, with the jumps after it. Under each whole of the line a lens zooms into it, every tick
// labelled, and a tap on the zoomed line zooms back out. A puzzle flags a target and asks for the fewest jumps that
// land on it; free play sets one jump size and reads the jumps as a product. Built on the game shell (useGame).
import { useId, type ReactNode } from "react";
import { Frac } from "../math/fraction";
import {
  canJump,
  exprOf,
  FROG_FRESH,
  FROG_LADDER,
  FROG_NOTICES,
  frogNotice,
  frogNow,
  frogStars,
  fewest,
  judgeFrog,
  landOf,
  LINE_END,
  stepOf,
  type LiveFrog,
} from "../math/frogJumps";
import { starText } from "./ladderUi";
import { CHECK_H, CheckRow, keyTap, MUTED, NumBox } from "./hand";
import { fill, FONT, INK, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, Stake, useGame, type Line } from "./useGame";

const W = 640;
const X0 = 50;
const L = 540;
const NY = 170;
const PY = NY + 128;
const ARC = "#2f9e44";
const FLAG = "#e03131";
const fr = (f: Frac) => (f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`);

/** A tappable SVG group with the hand kit's press rules. */
function Tap({ label, on, children }: { label: string; on: (() => void) | null; children: ReactNode }) {
  return (
    <g role="button" tabIndex={on ? 0 : -1} aria-label={label} aria-disabled={!on || undefined} opacity={on ? 1 : 0.4}
      style={{ cursor: on ? "pointer" : "default" }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); on?.(); }}
      onKeyDown={(e) => on && keyTap(e, on)}>
      {children}
    </g>
  );
}

export function FrogJumps({ state: s, set, w: words, svgRef }: PieceProps<"frogJumps">) {
  const [w, g] = [words.frogJumps, words.game];
  const clip = useId();
  const game = useGame({ key: "zeno.frog.v1", size: FROG_LADDER.length, notices: FROG_NOTICES, modes: ["puzzle", "endless", "free"], state: s, set, fresh: FROG_FRESH });
  const task = frogNow(s);
  const sizes = task ? task.sizes : [new Frac(s.n, s.d)];
  const stars = frogStars(s.misses);
  const change = (p: Partial<LiveFrog>) => !s.done && set({ ...s, ...p, said: null });
  const look = (zoom: number) => set({ ...s, zoom });

  const check = () => {
    if (!task) return;
    const why = judgeFrog(task, s.jumps);
    if (why) return game.miss({ misses: s.misses + 1, said: { kind: "wrong", why } });
    game.win({ stars, clean: s.misses === 0, notice: (streak) => frogNotice(task, streak), patch: { done: true } });
  };

  // The view: the whole line 0 to 3, or one whole zoomed across it.
  const z = s.zoom;
  const span = z < 0 ? LINE_END : 1;
  const from = z < 0 ? 0 : z;
  const U = L / span;
  const xOf = (v: number) => X0 + (v - from) * U;
  const step = stepOf(task ? [...sizes, task.target] : sizes);
  const land = landOf(sizes, s.jumps);

  const ticks: ReactNode[] = [];
  for (let j = 0; j <= span * step; j++) {
    const v = new Frac(from * step + j, step);
    const big = v.isInt();
    const x = xOf(v.toNumber());
    ticks.push(<line key={`t${j}`} x1={x} y1={NY - (big ? 12 : 6)} x2={x} y2={NY + (big ? 12 : 6)} stroke={INK} strokeWidth={big ? 2 : 1} />);
    if (big) ticks.push(<text key={`l${j}`} x={x} y={NY + 34} fontSize={18} fontWeight={700} textAnchor="middle" fill={INK}>{v.n}</text>);
    else if (z >= 0) ticks.push(<SvgFrac key={`l${j}`} n={v.n} d={v.d} x={x} y={NY + 30} size={13} />);
  }

  // The jumps, as arcs from where each starts to where it lands; a tap takes it and the ones after it off.
  const arcs: ReactNode[] = [];
  let at = Frac.ZERO;
  s.jumps.forEach((j, i) => {
    const to = at.add(sizes[j]);
    const [x1, x2] = [xOf(at.toNumber()), xOf(to.toNumber())];
    const h = Math.min(90, 18 + (x2 - x1) * 0.45);
    const take = s.done ? null : () => change({ jumps: s.jumps.slice(0, i) });
    arcs.push(
      <Tap key={i} label={fill(w.takeOff, { k: i + 1 })} on={take}>
        <path d={`M${x1} ${NY} Q${(x1 + x2) / 2} ${NY - 2 * h} ${x2} ${NY}`} fill="none" stroke="transparent" strokeWidth={14} />
        <path d={`M${x1} ${NY} Q${(x1 + x2) / 2} ${NY - 2 * h} ${x2} ${NY}`} fill="none" stroke={ARC} strokeWidth={2.5} strokeDasharray={j ? "6 4" : undefined} />
      </Tap>,
    );
    at = to;
  });

  const tx = task ? xOf(task.target.toNumber()) : 0;
  const lx = xOf(land.toNumber());
  const line = (
    <g>
      <defs>
        <clipPath id={clip}><rect x={X0 - 14} y={0} width={L + 28} height={NY + 60} /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <line x1={X0} y1={NY} x2={X0 + L} y2={NY} stroke={INK} strokeWidth={2} pointerEvents="none" />
        <g pointerEvents="none">{ticks}</g>
        {task && (
          <g pointerEvents="none">
            <line x1={tx} y1={NY} x2={tx} y2={NY - 52} stroke={FLAG} strokeWidth={2} />
            <path d={`M${tx} ${NY - 52} l22 7 l-22 7 z`} fill={FLAG} />
            <text x={tx + 26} y={NY - 40} fontSize={15} fontWeight={700} fill={FLAG}>{fr(task.target)}</text>
          </g>
        )}
        {arcs}
        <text x={lx} y={NY - 6} fontSize={30} textAnchor="middle" pointerEvents="none">🐸</text>
      </g>
      {z >= 0 && (
        <Tap label={w.zoomOut} on={() => look(-1)}>
          <title>{w.zoomOut}</title>
          <rect x={X0} y={NY + 50} width={L} height={30} rx={8} fill="#f1f3f5" stroke="#ced4da" />
          <text x={X0 + L / 2} y={NY + 70} fontSize={14} textAnchor="middle" fill={MUTED} pointerEvents="none">{fill(w.zoomed, { a: z, b: z + 1 })}</text>
        </Tap>
      )}
      {z < 0 && Array.from({ length: LINE_END }, (_, k) => (
        <Tap key={k} label={fill(w.zoomIn, { a: k, b: k + 1 })} on={() => look(k)}>
          <title>{fill(w.zoomIn, { a: k, b: k + 1 })}</title>
          <rect x={xOf(k) + U / 2 - 22} y={NY + 46} width={44} height={30} rx={8} fill="#f8f9fa" stroke="#ced4da" />
          <text x={xOf(k) + U / 2} y={NY + 67} fontSize={16} textAnchor="middle" pointerEvents="none">🔍</text>
        </Tap>
      ))}
    </g>
  );

  // The lily pads: one per size.
  const pw = 120;
  const pads = sizes.map((size, j) => {
    const x = X0 + 40 + j * (pw + 40);
    const on = !s.done && canJump(sizes, s.jumps, j) ? () => change({ jumps: [...s.jumps, j] }) : null;
    const label = fill(w.jump, { f: fr(size) });
    return (
      <Tap key={j} label={label} on={on}>
        <title>{label}</title>
        <ellipse cx={x + pw / 2} cy={PY} rx={pw / 2} ry={30} fill="#b2f2bb" stroke={ARC} strokeWidth={2} />
        <path d={`M${x + pw / 2} ${PY} l${pw / 2 - 4} -12 l0 10 z`} fill="#fff" pointerEvents="none" />
        <g pointerEvents="none"><SvgFrac n={size.n} d={size.d} x={x + pw / 2 - 8} y={PY} size={20} /></g>
      </Tap>
    );
  });

  const expr = exprOf(sizes, s.jumps);
  const m = task ? fewest(task.sizes, task.target) ?? 0 : 0;
  const ask = task ? fill(task.sizes.length > 1 ? w.askTwo : w.askOne, { t: fr(task.target), a: fr(sizes[0]), b: fr(sizes[1] ?? sizes[0]) }) : w.askFree;
  const right = fill(w.right, { k: s.jumps.length, e: expr, t: fr(land), stars: starText(stars) });
  const status = !s.jumps.length ? w.hint : task ? fill(w.jumpsRead, { k: s.jumps.length, e: expr }) : fill(w.freeRead, { e: expr, t: fr(land) });
  const gap = task ? task.target.sub(land) : Frac.ZERO;
  const said: Line =
    s.said?.kind === "notice" ? { tone: "notice", text: `${w.notices[s.said.key]} ${right}` }
    : s.done ? { tone: "ok", text: right }
    : s.said?.kind === "wrong" ? { tone: "wrong", text: fill(w.wrong[s.said.why], { g: fr(gap.abs()), k: s.jumps.length, m }) }
    : { tone: "hint", text: status };
  const H = PY + 50;
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
              <text x={W - 150} y={42} fontSize={15} fill={MUTED} textAnchor="end" pointerEvents="none">{w.size}</text>
              <NumBox x={W - 142} y={14} w={46} h={40} size={18} value={s.n} min={1} max={6} label={w.sizeTop} onChange={(n) => set({ ...s, n, jumps: [] })} />
              <NumBox x={W - 90} y={14} w={46} h={40} size={18} value={s.d} min={1} max={12} label={w.sizeBottom} onChange={(d) => set({ ...s, d, jumps: [] })} />
            </g>
          )}
          {line}
          {pads}
          {(s.done || !task) && s.jumps.length > 0 && (
            <text x={W - 24} y={PY + 6} fontSize={17} fontWeight={700} textAnchor="end" fill={ARC} pointerEvents="none">{`${expr} = ${fr(land)}`}</text>
          )}
          {row > 0 && <CheckRow w={W} y={H} check={{ text: g.check, onTap: check }} />}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={s.done} />
      <Said line={said} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
