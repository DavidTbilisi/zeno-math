// Fractions on the line: four or five fraction cards to put on a line from 0 to 1 (or 2). Tap a card, then tap the
// line where it goes; tap a card on the line to pick it up again. Check shows where each really is, joined to where it
// was put. In order earns two stars, and in order with every card within 5 % of its place, three. Nine lines open in
// turn; the endless run keeps a streak of lines put in order.
import { useState } from "react";
import { withBest, withFound, withStars } from "../math/ladder";
import {
  ORDER_LADDER,
  ORDER_NOTICES,
  orderNotice,
  orderNow,
  orderStars,
  placedInOrder,
  rightOrder,
  type LiveOrder,
  type OrderLevel,
} from "../math/fracOrder";
import { play } from "./juice";
import { Cheer, Found, GameNav, newSeed, nextStage, Onward, SoundToggle, starText, useLadder } from "./ladderUi";
import { fill, FONT, HtmlFrac, INK, svgPoint, SvgFrac, type PieceProps } from "./ui";

const W = 680;
const [X0, X1, Y] = [40, 640, 120];
const GREEN = "#2f9e44";
const BLUE = "#1971c2";

export function FracOrder({ state: d, set, w: words, svgRef }: PieceProps<"fracOrder">) {
  const [w, g] = [words.fracOrder, words.game];
  const [ladder, keep] = useLadder("zeno.fracorder.v1", ORDER_LADDER.length, ORDER_NOTICES);
  const [cheer, setCheer] = useState(0);
  const task = orderNow(d);
  const X = (v: number) => X0 + (v / task.to) * (X1 - X0);
  const placed = task.items.map((_, i) => d.placed[i] ?? null);
  const all = placed.every((p) => p !== null);

  const putAt = (e: React.MouseEvent<SVGSVGElement>) => {
    if (d.checked || d.sel === null || !svgRef.current) return;
    const [x] = svgPoint(svgRef.current, e);
    const v = Math.max(0, Math.min(task.to, ((x - X0) / (X1 - X0)) * task.to));
    play("snap");
    const next = placed.map((p, i) => (i === d.sel ? Math.round(v * 1000) / 1000 : p));
    // The next card still to place is picked up, so the cards can go down one after another.
    const sel = next.findIndex((p) => p === null);
    set({ ...d, placed: next, sel: sel < 0 ? null : sel });
  };
  const check = () => {
    const ps = placed as number[];
    const stars = orderStars(task, ps);
    const inOrder = placedInOrder(task.items, ps);
    const streak = d.mode === "endless" ? (inOrder ? d.streak + 1 : 0) : d.streak;
    const key = orderNotice(task, ps, streak);
    let next = withBest(ladder, d.mode === "endless" ? streak : 0);
    if (d.mode === "puzzle") next = withStars(next, d.stage, stars);
    if (key && !next.found.includes(key)) next = withFound(next, key, ORDER_NOTICES);
    if (next !== ladder) keep(next);
    play(inOrder ? "good" : "miss");
    if (inOrder) {
      setTimeout(() => play("star"), 260);
      setCheer((c) => c + 1);
    }
    set({ ...d, checked: true, sel: null, streak, said: key ? { kind: "notice", key } : null });
  };
  const fresh: Pick<LiveOrder, "placed" | "sel" | "checked" | "said"> = { placed: [], sel: 0, checked: false, said: null };
  const go = (stage: number) => set({ ...d, ...fresh, mode: "puzzle", stage });
  const endless = (l: OrderLevel) => set({ ...d, ...fresh, mode: "endless", level: l, seed: newSeed() });
  const onward = () => (d.mode === "endless" ? endless(d.level) : go(nextStage(d.stage, ORDER_LADDER.length)));

  const stars = all ? orderStars(task, placed as number[]) : 0;
  const rankOf = Object.fromEntries(rightOrder(task.items).map((i, k) => [i, k])) as Record<number, number>;
  const inOrder = all && placedInOrder(task.items, placed as number[]);
  const said =
    !d.checked ? (d.sel !== null ? fill(w.place, { f: task.items[d.sel].text }) : all ? w.ready : w.hint)
    : `${d.said?.kind === "notice" ? `${w.notices[d.said.key]} ` : ""}${inOrder ? fill(stars === 3 ? w.sharp : w.inOrder, { stars: starText(stars) }) : w.outOfOrder}`;
  return (
    <>
      <GameNav ladder={ladder} mode={d.mode} stage={d.stage} level={d.level} streak={d.streak} onPuzzle={go} onEndless={endless} words={w} g={g} />
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
      <div className="geo-stage-wrap">
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
        {cheer > 0 && d.checked && inOrder && <Cheer key={cheer} text={starText(stars)} />}
      </div>
      <div className="live-bar">
        {d.checked && !inOrder && <button className="live-btn" onClick={() => set({ ...d, ...fresh })}>{w.retry}</button>}
        {d.checked ? (
          <Onward mode={d.mode} stage={d.stage} size={ORDER_LADDER.length} onClick={onward} g={g} />
        ) : (
          <button className="live-btn on" disabled={!all} onClick={check}>{g.check}</button>
        )}
        <SoundToggle title={g.sound} />
      </div>
      <p className={d.said?.kind === "notice" ? "live-said notice" : d.checked ? (inOrder ? "live-said ok" : "live-said") : "live-hint"}>
        {said} <Found ladder={ladder} of={ORDER_NOTICES.length} notices={w.notices} g={g} />
      </p>
    </>
  );
}
