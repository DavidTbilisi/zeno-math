// Fractions on the line: four or five fraction cards to put on a line from 0 to 1 (or 2). Tap a card, then tap the
// line where it goes; tap a card on the line to pick it up again. Check shows where each really is, joined to where it
// was put. In order earns two stars, and in order with every card within 5 % of its place, three. Nine lines open in
// turn; the endless run keeps a streak of lines put in order. Built on the game shell (useGame): the check finishes the
// line either way, right when the cards are in order and a star all the same when they are not. Worked by hand: the
// cards wait in a tray over the line and are dragged down onto it, along it, or back up to the tray; a tap on a card
// then on the line places it too. The check and the second try are pills in the empty tray.
import { useRef } from "react";
import { ORDER_LADDER, ORDER_NOTICES, orderNotice, orderNow, orderStars, placedInOrder, rightOrder, type LiveOrder } from "../math/fracOrder";
import { keyTap, Pill, useDrag, type DragAt } from "./hand";
import { starText } from "./ladderUi";
import { fill, FONT, INK, svgPoint, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 680;
const [X0, X1, Y] = [40, 640, 176];
const H = 290;
/** The tray the cards wait in, over the line; a card let go above its bottom goes back there. */
const TRAY = 68;
const [CW, CH] = [56, 46];
const GREEN = "#2f9e44";
const BLUE = "#1971c2";
const FRESH: Partial<LiveOrder> = { placed: [], sel: 0, checked: false, said: null };

export function FracOrder({ state: d, set, w: words, svgRef }: PieceProps<"fracOrder">) {
  const [w, g] = [words.fracOrder, words.game];
  const game = useGame({ key: "zeno.fracorder.v1", size: ORDER_LADDER.length, notices: ORDER_NOTICES, modes: ["puzzle", "endless"], state: d, set, fresh: FRESH });
  const task = orderNow(d);
  const X = (v: number) => X0 + (v / task.to) * (X1 - X0);
  const placed = task.items.map((_, i) => d.placed[i] ?? null);
  const all = placed.every((p) => p !== null);

  const at = (x: number) => Math.round(Math.max(0, Math.min(task.to, ((x - X0) / (X1 - X0)) * task.to)) * 1000) / 1000;
  const put = (i: number, v: number | null) => {
    const next = placed.map((p, j) => (j === i ? v : p));
    // The next card still to place is picked up, so the cards can go down one after another with taps.
    const sel = next.findIndex((p) => p === null);
    game.tap({ placed: next, sel: sel < 0 ? null : sel });
  };
  // A drag just let go: the click that follows it on the picture is not a tap on the line.
  const dropped = useRef(false);
  const { drag, begin, svgProps } = useDrag<{ i: number }>((g: DragAt<{ i: number }>) => {
    if (!g.moved) return set({ ...d, sel: d.sel === g.i ? null : g.i });
    dropped.current = true;
    window.setTimeout(() => (dropped.current = false), 0);
    put(g.i, g.y < TRAY ? null : at(g.x));
  });
  const putAt = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dropped.current || d.checked || d.sel === null || !svgRef.current) return;
    const [x, y] = svgPoint(svgRef.current, e);
    if (y >= TRAY) put(d.sel, at(x));
  };
  const check = () => {
    const ps = placed as number[];
    const inOrder = placedInOrder(task.items, ps);
    game.win({ stars: orderStars(task, ps), right: inOrder, clean: inOrder, notice: (streak) => orderNotice(task, ps, streak), patch: { checked: true, sel: null } });
  };

  const stars = all ? orderStars(task, placed as number[]) : 0;
  const rankOf = Object.fromEntries(rightOrder(task.items).map((i, k) => [i, k])) as Record<number, number>;
  const inOrder = all && placedInOrder(task.items, placed as number[]);
  const notice = d.said?.kind === "notice" ? w.notices[d.said.key] : null;
  const line: Line =
    !d.checked ? { tone: "hint", text: d.sel !== null ? fill(w.place, { f: task.items[d.sel].text }) : all ? w.ready : w.hint }
    : { tone: notice ? "notice" : inOrder ? "ok" : "wrong", text: `${notice ? `${notice} ` : ""}${inOrder ? fill(stars === 3 ? w.sharp : w.inOrder, { stars: starText(stars) }) : w.outOfOrder}${d.mode === "puzzle" && stars === 1 ? ` ${g.oneStar}` : ""}` };
  return (
    <>
      <GameHead game={game} g={g} words={w} />
      <Stage game={game} stars={stars} done={d.checked} g={g} notices={w.notices}>
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} fontFamily={FONT} className="hand-pic" aria-label={w.hint}
          onClick={putAt} style={{ cursor: d.sel !== null && !d.checked ? "crosshair" : "default", touchAction: "none" }} {...svgProps}>
          <rect width={W} height={H} fill="#fff" />
          <rect x={X0 - 20} y={6} width={X1 - X0 + 40} height={TRAY - 12} rx={10} fill="#fff9db" stroke="#ffe066" strokeDasharray="6 4" />
          <line x1={X0} y1={Y} x2={X1} y2={Y} stroke={INK} strokeWidth={3} />
          {Array.from({ length: task.to + 1 }, (_, k) => (
            <g key={k}>
              <line x1={X(k)} y1={Y - 14} x2={X(k)} y2={Y + 14} stroke={INK} strokeWidth={3} />
              <text x={X(k)} y={Y + 44} fontSize={22} fontWeight={700} textAnchor="middle" fill={INK}>{k}</text>
            </g>
          ))}
          {!d.checked && all && <Pill x={W / 2 - 60} y={16} w={120} h={36} strong text={g.check} onTap={check} />}
          {d.checked && !inOrder && <Pill x={W / 2 - 70} y={16} w={140} h={36} text={w.retry} onTap={() => set({ ...d, ...FRESH })} />}
          {task.items.map((it, i) => {
            const p = placed[i];
            const moving = drag?.i === i && drag.moved;
            const sel = d.sel === i;
            const card = (cx: number, cy: number) => (
              <g role="button" tabIndex={d.checked ? -1 : 0} aria-label={it.text} aria-pressed={sel}
                style={{ cursor: d.checked ? "default" : moving ? "grabbing" : "grab" }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => !d.checked && begin(e, { i })} onKeyDown={(e) => !d.checked && keyTap(e, () => set({ ...d, sel: sel ? null : i }))}>
                <rect x={cx - CW / 2} y={cy - CH / 2} width={CW} height={CH} rx={6} fill={sel || moving ? "#d0ebff" : "#fff3bf"} stroke={sel || moving ? BLUE : "#fab005"} strokeWidth={2} />
                <g pointerEvents="none">
                  {it.text.includes(" ")
                    ? <text x={cx} y={cy + 5} fontSize={15} fontWeight={700} textAnchor="middle" fill={INK}>{it.text}</text>
                    : <SvgFrac n={it.n} d={it.d} x={cx} y={cy - 3} size={15} />}
                </g>
              </g>
            );
            if (moving) {
              const onLine = drag.y >= TRAY;
              return (
                <g key={i}>
                  {onLine && <line x1={X(at(drag.x))} y1={drag.y + CH / 2} x2={X(at(drag.x))} y2={Y} stroke={BLUE} strokeWidth={2} strokeDasharray="4 3" />}
                  {onLine && <circle cx={X(at(drag.x))} cy={Y} r={6} fill={BLUE} />}
                  {card(drag.x, drag.y)}
                </g>
              );
            }
            if (p === null) {
              // In the tray, in the order dealt, with the gaps of the ones on the line kept.
              const n = task.items.length;
              return <g key={i}>{card(W / 2 + (i - (n - 1) / 2) * (CW + 14), TRAY / 2)}</g>;
            }
            // Labels alternate above the line by height, so cards close together don't sit on each other.
            const lift = 40 + (i % 2) * 34;
            return (
              <g key={i}>
                {d.checked && <line x1={X(p)} y1={Y} x2={X(it.v)} y2={Y + 22} stroke={GREEN} strokeWidth={2} strokeDasharray="4 3" />}
                {d.checked && <circle cx={X(it.v)} cy={Y + 22} r={6} fill={GREEN} />}
                {/* Where it really is, named, in two rows under the line's numbers so neighbours don't collide. */}
                {d.checked && (
                  <text x={X(it.v)} y={Y + 70 + (rankOf[i] % 2) * 20} fontSize={14} fontWeight={700} textAnchor="middle" fill={GREEN}>{it.text}</text>
                )}
                <line x1={X(p)} y1={Y - lift + 18} x2={X(p)} y2={Y} stroke={sel ? BLUE : "#868e96"} strokeWidth={2} />
                <circle cx={X(p)} cy={Y} r={6} fill={sel ? BLUE : INK} />
                {card(X(p), Y - lift - 4)}
              </g>
            );
          })}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.checked} />
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
