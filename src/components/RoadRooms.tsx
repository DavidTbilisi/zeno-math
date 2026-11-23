// A goal's roadmap as a walk through rooms (#584, roomLayout.ts): one room per stage, its items at their stored
// places, each marked with its glyph (roomGlyphs.ts) and coloured by its learning stage (#576), the way in at the top
// and a dotted line walking the places in order. A room is a picture with its items read out in order as its label;
// tapping a place says what it is, with its link. The list (RoadmapPage) is the keyboard's and screen reader's view.
// WalkIt shows a room with one place empty and asks what stands there, from three choices; it counts for nothing.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";
import { fill } from "../math/text";
import type { LearningStage } from "../model/learningStage";
import { itemId, type GoalId, type Item, type ItemState, type RoadStage } from "../model/roadmap";
import { itemGlyph } from "../model/roomGlyphs";
import { placeAt, ROOM_W, roomH, walkQuestion, type Room, type WalkQuestion } from "../model/roomLayout";
import { itemName, stageName } from "../roadWords";

/** What a place shows of the learner's work on its item. */
export type PlaceLook = { state: ItemState; stage: LearningStage; next: boolean };

const TILE_W = 66;
const TILE_H = 58;
/** A glyph's size: the longer the glyph, the smaller, so it fits its tile. */
const glyphSize = (g: string) => [24, 24, 22, 18, 15, 13, 12][Array.from(g).length] ?? 11;

/** A room's plan: the walls with the way in and out, the walk through its places, and the places. */
function RoomPlan({ places, label, look, empty, filled, selected, onPick }: {
  places: readonly (Item | null)[];
  label: string;
  look?: (i: Item) => PlaceLook;
  /** A place shown empty (the walk-it check), and what fills it once answered. */
  empty?: number;
  filled?: { item: Item; right: boolean };
  selected?: number;
  onPick?: (place: number) => void;
}) {
  const H = roomH(places.length);
  const used = places.map((_, k) => k).filter((k) => places[k] || k === empty);
  const first = placeAt(0);
  const last = placeAt(Math.max(0, places.length - 1));
  const door = 20;
  const walls = `M ${first.x - door} 0 H 0 V ${H} H ${last.x - door} M ${last.x + door} ${H} H ${ROOM_W} V 0 H ${first.x + door}`;
  const walk = [`M ${first.x} 0`, ...used.map((k) => `L ${placeAt(k).x} ${placeAt(k).y}`), `L ${last.x} ${H}`].join(" ");
  return (
    <svg className="rm-plan" viewBox={`-2 -2 ${ROOM_W + 4} ${H + 4}`} role="img" aria-label={label}>
      <rect className="rm-floor" x={0} y={0} width={ROOM_W} height={H} />
      <path className="rm-walk" d={walk} />
      <path className="rm-wall" d={walls} />
      <path className="rm-door" d={`M ${first.x - 6} 12 l 6 7 l 6 -7`} />
      {places.map((item, k) => {
        const { x, y } = placeAt(k);
        if (k === empty) {
          const g = filled ? itemGlyph(filled.item) : "?";
          return (
            <g key={k} className={`rm-spot rm-empty${filled ? (filled.right ? " right" : " wrong") : ""}`} transform={`translate(${x} ${y})`}>
              <rect className="rm-tile" x={-TILE_W / 2} y={-TILE_H / 2} width={TILE_W} height={TILE_H} rx={10} />
              <text className="rm-glyph" y={1} style={{ fontSize: glyphSize(g) }}>{g}</text>
              <text className="rm-n" x={-TILE_W / 2 + 5} y={-TILE_H / 2 + 11}>{k + 1}</text>
            </g>
          );
        }
        if (!item) return null;
        const l = look?.(item);
        const g = itemGlyph(item);
        const cls = ["rm-spot", l && l.state, l && l.stage ? `ls-${l.stage}` : "", l?.next ? "next" : "", selected === k ? "sel" : "", onPick ? "pick" : ""].filter(Boolean).join(" ");
        return (
          <g key={k} className={cls} transform={`translate(${x} ${y})`} onClick={onPick && (() => onPick(k))}>
            {l?.next && <rect className="rm-ring" x={-TILE_W / 2 - 4} y={-TILE_H / 2 - 4} width={TILE_W + 8} height={TILE_H + 8} rx={13} />}
            <rect className="rm-tile" x={-TILE_W / 2} y={-TILE_H / 2} width={TILE_W} height={TILE_H} rx={10} />
            <text className="rm-glyph" y={1} style={{ fontSize: glyphSize(g) }}>{g}</text>
            <text className="rm-n" x={-TILE_W / 2 + 5} y={-TILE_H / 2 + 11}>{k + 1}</text>
            {l && (l.state === "done" || l.state === "behind") && (
              <g className="rm-tick" transform={`translate(${TILE_W / 2 - 4} ${-TILE_H / 2 + 4})`}>
                <circle r={8} />
                <text y={0.5}>✓</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** A room's items read out in order, an empty place as "?" (what the picture says to a screen reader). */
function useRoomLabel() {
  const { t } = useI18n();
  return (n: number, name: string, places: readonly (Item | null)[], empty?: number) =>
    fill(t.roadmap.rooms.roomLabel, {
      n, name,
      items: places.map((i, k) => `${k + 1} ${k === empty ? "?" : i ? itemName(t, i) : t.roadmap.rooms.empty}`).join(", "),
    });
}

/** Every room of a goal, in walking order; a tapped place says what it is under its room. */
export function RoomMap({ goal, stages, rooms, look, open }: {
  goal: GoalId;
  stages: readonly RoadStage[];
  rooms: readonly Room[];
  look: (i: Item) => PlaceLook;
  /** The item's link or button, as the list has it, around `body`. */
  open: (i: Item, body: ReactNode) => ReactNode;
}) {
  const { t, lang } = useI18n();
  const r = t.roadmap;
  const label = useRoomLabel();
  const [sel, setSel] = useState<{ room: number; place: number } | null>(null);
  return (
    <ol className="rm-map">
      {rooms.map((room, n) => {
        const name = stageName(t, lang, goal, stages[n]);
        const picked = sel?.room === n ? room.places[sel.place] : null;
        return (
          <li key={room.id} className="rm-room">
            <h2 className="rm-head"><span className="rm-num">{n + 1}</span>{name}</h2>
            <RoomPlan places={room.places} label={label(n + 1, name, room.places)} look={look} selected={sel?.room === n ? sel.place : undefined}
              onPick={(place) => setSel(sel?.room === n && sel.place === place ? null : { room: n, place })} />
            {picked && (
              <p className="rm-caption" aria-live="polite">
                {open(picked, <><span className="rm-cap-glyph" aria-hidden="true">{itemGlyph(picked)}</span><span className="road-name">{sel!.place + 1}. {itemName(t, picked)}</span><span className="road-note">{r.legend[look(picked).state]}</span></>)}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** The walk-it check: a room with one place empty, and three choices of what stands there. Counts for nothing. */
export function WalkIt({ goal, stages, rooms }: { goal: GoalId; stages: readonly RoadStage[]; rooms: readonly Room[] }) {
  const { t, lang } = useI18n();
  const w = t.roadmap.rooms;
  const label = useRoomLabel();
  const [q, setQ] = useState<WalkQuestion | null>(null);
  const [picked, setPicked] = useState<Item | null>(null);
  const after = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => (picked ? after : first).current?.focus(), [q, picked]);
  const start = () => {
    setQ(walkQuestion(rooms));
    setPicked(null);
  };
  const roomOf = (i: Item) => rooms.findIndex((r) => r.places.includes(i));
  const name = q && stageName(t, lang, goal, stages[q.room]);
  return (
    <section className="rm-walkit" aria-labelledby="rm-walkit">
      <h2 id="rm-walkit">{w.walk}</h2>
      <p className="course-count">{w.walkLede}</p>
      {!q ? (
        <button type="button" className="z-btn" onClick={start}>{w.walkStart}</button>
      ) : (
        <div className="rm-walk-q">
          <div className="rm-room">
            <h3 className="rm-head"><span className="rm-num">{q.room + 1}</span>{name}</h3>
            <RoomPlan places={rooms[q.room].places} label={label(q.room + 1, name!, rooms[q.room].places, q.place)} empty={q.place}
              filled={picked ? { item: q.answer, right: picked === q.answer } : undefined} />
          </div>
          <div className="rm-ask">
            <p className="rm-q"><strong>{fill(w.walkQ, { n: q.place + 1 })}</strong></p>
            <ul className="rm-choices">
              {q.choices.map((c, k) => (
                <li key={itemId(c)}>
                  <button type="button" ref={k === 0 ? first : undefined} disabled={!!picked} onClick={() => setPicked(c)}
                    className={`rm-choice${picked && c === q.answer ? " right" : ""}${picked === c && c !== q.answer ? " wrong" : ""}`}>
                    <span className="rm-cap-glyph" aria-hidden="true">{itemGlyph(c)}</span>
                    <span>{itemName(t, c)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {picked && (
              <>
                <p className={`rm-said ${picked === q.answer ? "right" : "wrong"}`} role="status">
                  {picked === q.answer
                    ? fill(w.right, { name: itemName(t, q.answer) })
                    : fill(w.wrong, { picked: itemName(t, picked), room: roomOf(picked) + 1, name: itemName(t, q.answer) })}
                </p>
                <button type="button" className="z-btn" ref={after} onClick={start}>{w.another}</button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
