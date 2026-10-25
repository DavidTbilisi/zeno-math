// Fractions on the line: four or five fraction cards to put on a line from 0 to 1 (or 2). Tap a card, then tap the
// line where it goes; tap a card on the line to pick it up again. Check shows where each really is, joined to where it
// was put. In order earns two stars, and in order with every card within 5 % of its place, three. Nine lines open in
// turn; the endless run keeps a streak of lines put in order. Built on the game shell (useGame): the check finishes the
// line either way, right when the cards are in order and a star all the same when they are not.
import { ORDER_LADDER, ORDER_NOTICES, orderNotice, orderNow, orderStars, placedInOrder, rightOrder, type LiveOrder } from "../math/fracOrder";
import { starText } from "./ladderUi";
import { fill, FONT, HtmlFrac, INK, svgPoint, SvgFrac, type PieceProps } from "./ui";
import { GameActions, GameHead, Said, Stage, useGame, type Line } from "./useGame";

const W = 680;
const [X0, X1, Y] = [40, 640, 120];
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

  const putAt = (e: React.MouseEvent<SVGSVGElement>) => {
    if (d.checked || d.sel === null || !svgRef.current) return;
    const [x] = svgPoint(svgRef.current, e);
    const v = Math.max(0, Math.min(task.to, ((x - X0) / (X1 - X0)) * task.to));
    const next = placed.map((p, i) => (i === d.sel ? Math.round(v * 1000) / 1000 : p));
    // The next card still to place is picked up, so the cards can go down one after another.
    const sel = next.findIndex((p) => p === null);
    game.tap({ placed: next, sel: sel < 0 ? null : sel });
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
      <div className="live-bar order-cards">
        {task.items.map((it, i) => (
          <button
            key={i}
            className={`live-btn order-card${d.sel === i ? " on" : ""}${placed[i] !== null ? " placed" : ""}`}
            disabled={d.checked}
            aria-pressed={d.sel === i}
            aria-label={it.text}
            onClick={() => set({ ...d, sel: d.sel === i ? null : i })}
          >
            {it.text.includes(" ") ? <>{it.text.split(" ")[0]}<HtmlFrac n={Number(it.text.split(" ")[1].split("/")[0])} d={it.d} /></> : <HtmlFrac n={it.n} d={it.d} />}
          </button>
        ))}
      </div>
      <Stage game={game} stars={stars} done={d.checked} g={g} notices={w.notices}>
        <svg
          ref={svgRef}
          width={W}
          height={225}
          viewBox={`0 0 ${W} 225`}
          fontFamily={FONT}
          role="img"
          aria-label={w.hint}
          onClick={putAt}
          style={{ cursor: d.sel !== null && !d.checked ? "crosshair" : "default" }}
        >
          <rect width={W} height={225} fill="#fff" />
          <line x1={X0} y1={Y} x2={X1} y2={Y} stroke={INK} strokeWidth={3} />
          {Array.from({ length: task.to + 1 }, (_, k) => (
            <g key={k}>
              <line x1={X(k)} y1={Y - 14} x2={X(k)} y2={Y + 14} stroke={INK} strokeWidth={3} />
              <text x={X(k)} y={Y + 44} fontSize={22} fontWeight={700} textAnchor="middle" fill={INK}>{k}</text>
            </g>
          ))}
          {task.items.map((it, i) => {
            const p = placed[i];
            if (p === null) return null;
            // Labels alternate above the line by height, so cards close together don't sit on each other.
            const lift = 40 + (i % 2) * 34;
            return (
              <g key={i} style={{ cursor: d.checked ? "default" : "pointer" }} onClick={(e) => (e.stopPropagation(), !d.checked && set({ ...d, sel: i }))}>
                {d.checked && <line x1={X(p)} y1={Y} x2={X(it.v)} y2={Y + 22} stroke={GREEN} strokeWidth={2} strokeDasharray="4 3" />}
                {d.checked && <circle cx={X(it.v)} cy={Y + 22} r={6} fill={GREEN} />}
                {/* Where it really is, named, in two rows under the line's numbers so neighbours don't collide. */}
                {d.checked && (
                  <text x={X(it.v)} y={Y + 70 + (rankOf[i] % 2) * 20} fontSize={14} fontWeight={700} textAnchor="middle" fill={GREEN}>{it.text}</text>
                )}
                <line x1={X(p)} y1={Y - lift + 18} x2={X(p)} y2={Y} stroke={d.sel === i ? BLUE : "#868e96"} strokeWidth={2} />
                <circle cx={X(p)} cy={Y} r={6} fill={d.sel === i ? BLUE : INK} />
                <rect x={X(p) - 26} y={Y - lift - 26} width={52} height={44} rx={6} fill={d.sel === i ? "#d0ebff" : "#fff3bf"} stroke={d.sel === i ? BLUE : "#fab005"} strokeWidth={2} />
                {it.text.includes(" ") ? (
                  <text x={X(p)} y={Y - lift + 2} fontSize={15} fontWeight={700} textAnchor="middle" fill={INK}>{it.text}</text>
                ) : (
                  <SvgFrac n={it.n} d={it.d} x={X(p)} y={Y - lift - 6} size={15} />
                )}
              </g>
            );
          })}
        </svg>
      </Stage>
      <GameActions game={game} g={g} done={d.checked} always>
        {!d.checked ? (
          <button className="live-btn on" disabled={!all} onClick={check}>{g.check}</button>
        ) : (
          !inOrder && <button className="live-btn" onClick={() => set({ ...d, ...FRESH })}>{w.retry}</button>
        )}
      </GameActions>
      <Said line={line} pulse={game.fx.pulse} found={{ game, notices: w.notices, g }} />
    </>
  );
}
