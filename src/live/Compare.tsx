// Two towers of blocks over two number cards, as with building blocks and pencils on a table, worked by hand. Blocks
// come from the pile at the top: drag one onto a tower. A tower's top block dragged to the other tower moves there,
// dragged anywhere else goes; a tap on a block or on a space builds the tower to it. The signs lie below: drag one
// between the cards (or tap it) to say which number is bigger, and drag it back out to take it away. The pencils (top
// left) are tapped, or dragged onto the towers, to lay them: the towers slide to a middle line and the two pencils
// join their tops and bottoms, which draws the sign itself. The die (top right) deals two new numbers.
import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  COMPARE_COLORS,
  COMPARE_MAX,
  COMPARE_SIGNS,
  compareSign,
  moveBlock,
  PENCIL_COLORS,
  tapSquare,
  towerSpan,
  type CompareSign,
  type Tower,
} from "../math/live";
import { BLUE, keyTap, useDrag } from "./hand";
import { Pencil, useJoin } from "./pencils";
import { usePops } from "./pops";
import { fill, FONT, INK, type PieceProps } from "./ui";

const W = 360;
const BW = 60;
const BH = 24;
const FLOOR = 286;
const MID = 166;
const CARD_Y = 300;
const SIGN_Y = 390;
const H = SIGN_Y + 54;
const TOWERS = [
  { key: "a" as const, x: 40 },
  { key: "b" as const, x: 260 },
];
const PILE = { x: 148, y: 4, w: 64, h: 38 };
const PENCILS = { x: 6, y: 6, w: 92, h: 34 };
const DIE = { x: W - 44, y: 4, s: 38 };
const MIDDLE = { x: 148, y: CARD_Y, w: 64, h: 74 };
const signX = (i: number) => 180 + (i - 1) * 56;

type Drag =
  | { from: "pile" }
  | { from: "tower"; t: Tower; i: number }
  | { from: "sign"; s: CompareSign }
  | { from: "guess" }
  | { from: "pencils" };

const inRect = (
  r: { x: number; y: number; w: number; h: number },
  x: number,
  y: number,
) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const towerAt = (x: number, y: number): Tower | null =>
  TOWERS.find(
    (t) =>
      x >= t.x - 14 && x <= t.x + BW + 14 && y > PILE.y + PILE.h && y < CARD_Y,
  )?.key ?? null;

function Block({
  x,
  y,
  color,
  studs,
}: {
  x: number;
  y: number;
  color: string;
  studs?: boolean;
}) {
  return (
    <g>
      {studs &&
        [0.2, 0.6].map((f) => (
          <rect
            key={f}
            x={x + f * BW}
            y={y - 6}
            width={0.2 * BW}
            height={7}
            rx={2}
            fill={color}
            stroke={INK}
            strokeWidth={1.5}
          />
        ))}
      <rect
        x={x}
        y={y}
        width={BW}
        height={BH}
        rx={3}
        fill={color}
        stroke={INK}
        strokeWidth={1.5}
      />
    </g>
  );
}

function SignCard({
  cx,
  y,
  s,
  fillColor,
  w = 48,
  h = 50,
  size = 34,
}: {
  cx: number;
  y: number;
  s: string;
  fillColor: string;
  w?: number;
  h?: number;
  size?: number;
}) {
  return (
    <g>
      <rect
        x={cx - w / 2}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill={fillColor}
        stroke="#adb5bd"
      />
      <text
        x={cx}
        y={y + h / 2 + size * 0.36}
        fontSize={size}
        textAnchor="middle"
        fill={INK}
      >
        {s}
      </text>
    </g>
  );
}

export function Compare({
  state,
  set,
  w: words,
  svgRef,
}: PieceProps<"compare">) {
  const w = words.compare;
  const { a, b } = state;
  const sign = compareSign(a, b);
  const { slide, pencils } = useJoin(state.joined);
  const spans = TOWERS.map(({ key }) =>
    towerSpan(state[key], BH, FLOOR, MID, slide),
  );
  const [ghosts, pop] = usePops<{ x: number; y: number; color: string }>();
  const say = (s: CompareSign) =>
    fill(w[s === "<" ? "lt" : s === ">" ? "gt" : "eq"], { a, b });

  const setCount = (key: Tower, n: number) =>
    set({
      ...state,
      [key]: Math.max(0, Math.min(COMPARE_MAX, n)),
      guess: null,
    });
  const towers = (next: { a: number; b: number }) =>
    (next.a !== a || next.b !== b) && set({ ...state, ...next, guess: null });
  const deal = () => {
    const na = Math.floor(Math.random() * (COMPARE_MAX + 1));
    const nb =
      Math.random() < 0.2 ? na : Math.floor(Math.random() * (COMPARE_MAX + 1));
    set({ a: na, b: nb, joined: false, guess: null });
  };

  const { drag, begin, svgProps } = useDrag<Drag>((d) => {
    const tower = towerAt(d.x, d.y);
    const onMiddle = inRect(MIDDLE, d.x, d.y);
    switch (d.from) {
      case "pile":
        if (d.moved && tower) towers(moveBlock(state, "pile", tower));
        return;
      case "tower": {
        if (!d.moved) return setCount(d.t, tapSquare(state[d.t], d.i));
        if (tower === d.t) return;
        if (!tower)
          pop([
            {
              x: d.x - BW / 2,
              y: d.y - BH / 2,
              color: COMPARE_COLORS[state[d.t] - 1],
            },
          ]);
        return towers(moveBlock(state, d.t, tower));
      }
      case "sign":
        if (!d.moved || onMiddle) set({ ...state, guess: d.s });
        return;
      case "guess":
        if (d.moved && !onMiddle) set({ ...state, guess: null });
        return;
      case "pencils":
        if (!d.moved) return set({ ...state, joined: !state.joined });
        if (d.y > PILE.y + PILE.h && d.y < CARD_Y)
          set({ ...state, joined: true });
    }
  });
  const press = (e: ReactPointerEvent, d: Drag) => begin(e, d);
  const held = drag?.moved ? drag : null;
  const over =
    held && (held.from === "pile" || held.from === "tower")
      ? towerAt(held.x, held.y)
      : null;
  const overMiddle =
    !!held &&
    (held.from === "sign" || held.from === "guess") &&
    inRect(MIDDLE, held.x, held.y);

  const towerKeys = (e: KeyboardEvent, t: Tower) => {
    const by = {
      ArrowUp: 1,
      ArrowRight: 1,
      "+": 1,
      ArrowDown: -1,
      ArrowLeft: -1,
      "-": -1,
    }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    setCount(t, state[t] + by);
  };

  // The middle card: the guess, coloured right or wrong; once the pencils are down and there is no guess, the sign.
  const guessHeld = held?.from === "guess";
  const shown =
    state.guess && !guessHeld ? state.guess : pencils === 1 ? sign : "?";
  const cardFill =
    state.guess && !guessHeld
      ? state.guess === sign
        ? "#b2f2bb"
        : "#ffc9c9"
      : pencils === 1
        ? "#a5d8ff"
        : "#f1f3f5";
  const numberCard = (cx: number, n: number) => (
    <g>
      <rect
        x={cx - 36}
        y={CARD_Y}
        width={72}
        height={74}
        rx={4}
        fill="#d8f5a2"
        stroke="#adb5bd"
      />
      <text x={cx} y={CARD_Y + 52} fontSize={42} textAnchor="middle" fill={INK}>
        {n}
      </text>
    </g>
  );
  const heldBlock =
    held?.from === "pile"
      ? COMPARE_COLORS[over ? Math.min(state[over], COMPARE_MAX - 1) : 0]
      : held?.from === "tower"
        ? COMPARE_COLORS[state[held.t] - 1]
        : null;
  const heldSign =
    held?.from === "sign"
      ? held.s
      : held?.from === "guess"
        ? state.guess
        : null;

  return (
    <>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="hand-pic"
        fontFamily={FONT}
        {...svgProps}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <rect width={W} height={H} fill="#fff" />
        {/* The pencils, the pile of blocks and the die. */}
        <g
          role="button"
          tabIndex={0}
          aria-label={state.joined ? w.pencilsOff : w.pencils}
          aria-pressed={state.joined}
          style={{ cursor: "grab" }}
          onPointerDown={(e) => press(e, { from: "pencils" })}
          onKeyDown={(e) =>
            keyTap(e, () => set({ ...state, joined: !state.joined }))
          }
        >
          <title>{state.joined ? w.pencilsOff : w.pencils}</title>
          <rect
            x={PENCILS.x}
            y={PENCILS.y}
            width={PENCILS.w}
            height={PENCILS.h}
            rx={8}
            fill={state.joined ? "#e7f5ff" : "#fff"}
            stroke={state.joined ? BLUE : "#ced4da"}
            strokeDasharray={state.joined ? undefined : "5 4"}
          />
          {PENCIL_COLORS.map((c, i) => (
            <g key={c} opacity={state.joined ? 0.3 : 1}>
              <line
                x1={PENCILS.x + 12}
                y1={PENCILS.y + 12 + i * 11}
                x2={PENCILS.x + PENCILS.w - 20}
                y2={PENCILS.y + 12 + i * 11}
                stroke={c}
                strokeWidth={7}
                strokeLinecap="round"
              />
              <path
                d={`M${PENCILS.x + PENCILS.w - 20} ${PENCILS.y + 8.5 + i * 11} l10 3.5 l-10 3.5 z`}
                fill="#f4d6a0"
                stroke={c}
                strokeWidth={1}
              />
            </g>
          ))}
        </g>
        <g
          role="button"
          tabIndex={0}
          aria-label={w.pile}
          style={{ cursor: "grab" }}
          onPointerDown={(e) => press(e, { from: "pile" })}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            (e.preventDefault(),
            towers(moveBlock(state, "pile", a <= b ? "a" : "b")))
          }
        >
          <title>{w.pile}</title>
          <rect
            x={PILE.x - 8}
            y={PILE.y}
            width={PILE.w + 16}
            height={PILE.h}
            fill="transparent"
          />
          {[
            [0, 14, 3],
            [32, 14, 1],
            [16, 2, 4],
          ].map(([dx, dy, c]) => (
            <rect
              key={dx}
              x={PILE.x - 6 + dx}
              y={PILE.y + dy}
              width={40}
              height={18}
              rx={3}
              fill={COMPARE_COLORS[c]}
              stroke={INK}
              strokeWidth={1.3}
            />
          ))}
        </g>
        <g
          role="button"
          tabIndex={0}
          aria-label={w.random}
          style={{ cursor: "pointer" }}
          onClick={deal}
          onKeyDown={(e) => keyTap(e, deal)}
        >
          <title>{w.random}</title>
          <rect
            x={DIE.x}
            y={DIE.y}
            width={DIE.s}
            height={DIE.s}
            rx={8}
            fill="#fff"
            stroke={INK}
            strokeWidth={2}
          />
          {[
            [0.27, 0.27],
            [0.5, 0.5],
            [0.73, 0.73],
            [0.73, 0.27],
            [0.27, 0.73],
          ].map(([fx, fy]) => (
            <circle
              key={`${fx}${fy}`}
              cx={DIE.x + fx * DIE.s}
              cy={DIE.y + fy * DIE.s}
              r={3.2}
              fill={INK}
            />
          ))}
        </g>
        {TOWERS.map(({ key, x }, ti) => {
          const n = state[key];
          const [top] = spans[ti];
          const lifted = held?.from === "tower" && held.t === key;
          const label = fill(w.tower, {
            t: key === "a" ? w.first : w.second,
            n,
          });
          return (
            <g
              key={key}
              role="group"
              tabIndex={0}
              aria-label={label}
              onKeyDown={(e) => towerKeys(e, key)}
            >
              <rect
                x={x - 8}
                y={PILE.y + PILE.h + 2}
                width={BW + 16}
                height={FLOOR - PILE.y - PILE.h}
                rx={6}
                fill={over === key ? "#e7f5ff" : "transparent"}
              />
              {slide === 0 &&
                Array.from({ length: COMPARE_MAX - n }, (_, i) => (
                  <rect
                    key={`slot${i}`}
                    x={x + 1}
                    y={FLOOR - (n + i + 1) * BH + 1}
                    width={BW - 2}
                    height={BH - 2}
                    rx={3}
                    fill="transparent"
                    stroke="#dee2e6"
                    strokeDasharray="4 4"
                    style={{ cursor: "pointer" }}
                    onClick={() => setCount(key, n + i + 1)}
                  />
                ))}
              {Array.from({ length: n }, (_, i) => (
                <g
                  key={i}
                  role="button"
                  aria-label={fill(w.block, { n: i + 1 })}
                  style={{ cursor: "grab" }}
                  opacity={lifted && i === n - 1 ? 0.25 : 1}
                  onPointerDown={(e) => press(e, { from: "tower", t: key, i })}
                >
                  <Block
                    x={x}
                    y={top + (n - 1 - i) * BH}
                    color={COMPARE_COLORS[i]}
                    studs={i === n - 1}
                  />
                </g>
              ))}
            </g>
          );
        })}
        <Pencil
          from={[100, spans[0][0]]}
          to={[260, spans[1][0]]}
          color={PENCIL_COLORS[0]}
          k={pencils}
        />
        <Pencil
          from={[100, spans[0][1]]}
          to={[260, spans[1][1]]}
          color={PENCIL_COLORS[1]}
          k={pencils}
        />
        {numberCard(70, a)}
        {numberCard(290, b)}
        <g
          role="button"
          aria-label={fill(w.middle, {
            s: state.guess ? say(state.guess) : "?",
          })}
          style={{ cursor: state.guess ? "grab" : "default" }}
          onPointerDown={(e) => state.guess && press(e, { from: "guess" })}
        >
          <rect
            x={MIDDLE.x - 4}
            y={MIDDLE.y - 4}
            width={MIDDLE.w + 8}
            height={MIDDLE.h + 8}
            rx={6}
            fill="none"
            stroke={overMiddle ? BLUE : "none"}
            strokeWidth={2.5}
          />
          <SignCard
            cx={180}
            y={CARD_Y}
            s={shown}
            fillColor={cardFill}
            w={64}
            h={74}
            size={42}
          />
        </g>
        {COMPARE_SIGNS.map((s, i) => (
          <g
            key={s}
            role="button"
            tabIndex={0}
            aria-label={fill(w.sign, { s: say(s) })}
            style={{ cursor: "grab" }}
            onPointerDown={(e) => press(e, { from: "sign", s })}
            onKeyDown={(e) => keyTap(e, () => set({ ...state, guess: s }))}
          >
            <title>{fill(w.sign, { s: say(s) })}</title>
            <SignCard
              cx={signX(i)}
              y={SIGN_Y}
              s={s}
              fillColor={state.guess === s ? "#e7f5ff" : "#fff"}
            />
          </g>
        ))}
        {ghosts?.items.map((g, i) => (
          <g key={`${ghosts.id}-${i}`} className="chip-pop">
            <Block x={g.x} y={g.y} color={g.color} />
          </g>
        ))}
        <g pointerEvents="none">
          {heldBlock && held && (
            <g opacity={0.9}>
              <Block
                x={held.x - BW / 2}
                y={held.y - BH / 2}
                color={heldBlock}
              />
            </g>
          )}
          {heldSign && held && (
            <SignCard
              cx={held.x}
              y={held.y - 25}
              s={heldSign}
              fillColor="#fff"
            />
          )}
          {held?.from === "pencils" && (
            <line
              x1={held.x - 40}
              y1={held.y}
              x2={held.x + 40}
              y2={held.y}
              stroke={PENCIL_COLORS[0]}
              strokeWidth={7}
              strokeLinecap="round"
            />
          )}
        </g>
      </svg>
      <p className="live-hint">
        {state.guess && state.guess !== sign
          ? `${w.wrong}${state.joined ? "" : ` ${w.tryPencils}`}`
          : state.guess || pencils === 1
            ? `${state.guess ? `${w.right} ` : ""}${say(sign)}.${pencils === 1 ? ` ${sign === "=" ? w.parallel : w.opens}` : ""}`
            : w.hint}
      </p>
    </>
  );
}
