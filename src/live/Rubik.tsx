// A Rubik's cube on the board, drawn twice: as a cube that turns (click a sticker to turn its face, drag to look
// round it) and on three bands of circles, one per axis, with each face's nine dots where two bands cross: a turn
// slides the twelve dots beside the face along one circle and turns the face's own dots about its crossing. Below them the moves made, and moves to repeat with their order: how
// many times they must be done before the cube comes back.
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  axisOf,
  bandCentre,
  bandRadius,
  colorsAfter,
  common,
  cycleLengths,
  dotAt,
  dotDuring,
  FACES,
  GODS_NUMBER,
  isSolved,
  type Layout,
  type Move,
  movesText,
  NORMAL,
  onLayer,
  order,
  parseMoves,
  path,
  POSITIONS,
  ringCentre,
  scramble,
  seqPerm,
  stickerAt,
  STICKERS,
  type Face,
  type V3,
} from "../math/rubik";
import { fill, INK, type PieceProps } from "./ui";

export const FACE_COLORS: Record<Face, string> = { U: "#ffffff", D: "#ffd43b", F: "#2f9e44", B: "#1971c2", R: "#e03131", L: "#f76707" };
/** More turns than this in one go (a long repeat) are shown at once rather than turned one by one. */
const MAX_ANIMATED = 320;
/** The most moves kept. */
const MAX_MOVES = 1200;
const BODY = "#212529";

const [CUBE_X, CUBE_Y, CUBE_K] = [185, 205, 60];
const RINGS: Layout = { cx: 570, cy: 215, d: 60, rho: 110, step: 15 };

// ——— Turning and looking ———

const rad = (deg: number) => (deg * Math.PI) / 180;
/** v turned by `angle` about the unit vector a (right-handed). */
function rotate(v: V3, a: V3, angle: number): V3 {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const d = a[0] * v[0] + a[1] * v[1] + a[2] * v[2];
  const x: V3 = [a[1] * v[2] - a[2] * v[1], a[2] * v[0] - a[0] * v[2], a[0] * v[1] - a[1] * v[0]];
  return [0, 1, 2].map((k) => v[k] * c + x[k] * s + a[k] * d * (1 - c)) as V3;
}
/** Into the viewer's frame: x right, y up, z towards the viewer. */
function view(v: V3, yaw: number, pitch: number): V3 {
  const [cy, sy, cp, sp] = [Math.cos(rad(yaw)), Math.sin(rad(yaw)), Math.cos(rad(pitch)), Math.sin(rad(pitch))];
  const [x, y, z] = [v[0] * cy + v[2] * sy, v[1], -v[0] * sy + v[2] * cy];
  return [x, y * cp - z * sp, y * sp + z * cp];
}
/** The angle a move has got to, a fraction t of the way: clockwise seen from the face is negative about its normal. */
const moveAngle = (m: Move, t: number) => -(m.turns === 3 ? -1 : m.turns) * (Math.PI / 2) * t;

const CUBIES: V3[] = [-1, 0, 1].flatMap((x) => [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((z) => [x, y, z] as V3))).filter((c) => c.some(Boolean));
const DIRS: V3[] = FACES.map((f) => NORMAL[f]);
const FACE_OF = new Map(FACES.map((f) => [NORMAL[f].join(), f]));

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(Math.min(255, v * k)));
  return `rgb(${c.join(",")})`;
}

/** Steps the cube shown towards the one asked for, a turn at a time; `anim` is the turn under way and how far it has got. */
function useTurns(target: Move[]) {
  const shownRef = useRef(target);
  const [shown, setShown] = useState(target);
  const [anim, setAnim] = useState<{ move: Move; t: number } | null>(null);
  useEffect(() => {
    // Going back more than one turn (back to solved, a new scramble) jumps to where the two part; an undo turns back.
    const k = common(shownRef.current, target);
    if (shownRef.current.length - k > 1) {
      shownRef.current = target.slice(0, k);
      setShown(shownRef.current);
      setAnim(null);
    }
    const plan = path(shownRef.current, target);
    if (!plan.length) return;
    if (plan.length > MAX_ANIMATED) {
      shownRef.current = target;
      setShown(target);
      setAnim(null);
      return;
    }
    // A single turn eases in and out; a long run goes faster, at an even pace.
    const ms = Math.min(300, Math.max(30, 2400 / plan.length));
    const ease = plan.length <= 3 ? (x: number) => (x < 0.5 ? 2 * x * x : 1 - (2 - 2 * x) ** 2 / 2) : (x: number) => x;
    let [i, start, frame] = [0, performance.now(), 0];
    const tick = (now: number) => {
      let t = (now - start) / ms;
      while (t >= 1 && i < plan.length) {
        shownRef.current = plan[i++].after;
        start += ms;
        t -= 1;
      }
      setShown(shownRef.current);
      if (i >= plan.length) return setAnim(null);
      setAnim({ move: plan[i].move, t: ease(t) });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return { shown, anim };
}

// ——— The piece ———

export function Rubik({ state, set, w: words, svgRef }: PieceProps<"rubik">) {
  const w = words.rubik;
  const scrambled = useMemo(() => parseMoves(state.scramble) ?? [], [state.scramble]);
  const made = useMemo(() => parseMoves(state.moves) ?? [], [state.moves]);
  const target = useMemo(() => [...scrambled, ...made], [scrambled, made]);
  const { shown, anim } = useTurns(target);
  const colors = useMemo(() => colorsAfter(shown), [shown]);
  const [look, setLook] = useState<{ yaw: number; pitch: number } | null>(null);
  const [hover, setHover] = useState<Face | null>(null);
  const down = useRef<{ x: number; y: number; yaw: number; pitch: number; face?: Face; moved: boolean } | null>(null);
  // The sticker under the pointer when it went down (its handler runs before the cube's).
  const pressed = useRef<Face | undefined>(undefined);
  const { yaw, pitch } = look ?? state;

  const alg = parseMoves(state.alg);
  const algOrder = alg?.length ? order(alg) : 0;
  const lengths = alg?.length ? [...new Set(cycleLengths(seqPerm(alg)))].sort((a, b) => a - b) : [];
  const room = (n: number) => made.length + n <= MAX_MOVES;

  const turnMove = (face: Face): Move => ({ face, turns: state.prime ? 3 : 1 });
  const turn = (face: Face) => room(1) && set({ ...state, moves: movesText([...made, turnMove(face)]), reps: 0 });
  const repeat = (times: number) =>
    alg?.length && room(alg.length * times) &&
    set({ ...state, moves: movesText([...made, ...Array.from({ length: times }, () => alg).flat()]), reps: state.reps + times });

  // ——— The cube ———
  const turning = anim?.move;
  const onTurningLayer = (c: V3) => !!turning && c[0] * NORMAL[turning.face][0] + c[1] * NORMAL[turning.face][1] + c[2] * NORMAL[turning.face][2] === 1;
  const angle = turning ? moveAngle(turning, anim!.t) : 0;
  const world = (c: V3, v: V3) => (onTurningLayer(c) ? rotate(v, NORMAL[turning!.face], angle) : v);
  const screen = (v: V3) => {
    const [x, y] = view(v, yaw, pitch);
    return `${(CUBE_X + CUBE_K * x).toFixed(1)},${(CUBE_Y - CUBE_K * y).toFixed(1)}`;
  };
  const light: V3 = [-0.35, 0.55, 0.76];
  const cubie = (c: V3) =>
    DIRS.flatMap((d) => {
      const n = view(world(c, d), yaw, pitch);
      if (n[2] <= 1e-6) return [];
      const others = DIRS.filter((e) => e.every((v, k) => v === 0 || d[k] === 0) && e.some((v) => v > 0));
      const [e1, e2] = others;
      const quad = (half: number, lift: number) =>
        [[-1, -1], [1, -1], [1, 1], [-1, 1]]
          .map(([a, b]) => screen(world(c, [0, 1, 2].map((k) => c[k] + d[k] * lift + (e1[k] * a + e2[k] * b) * half) as V3)))
          .join(" ");
      const id = stickerAt(c, d);
      const key = `${c.join()}|${d.join()}`;
      const body = <polygon key={key} points={quad(0.5, 0.5)} fill={BODY} stroke={BODY} strokeWidth={1} strokeLinejoin="round" />;
      if (id === undefined) return [body];
      const k = 0.86 + 0.22 * Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
      const color = shade(FACE_COLORS[colors[id]], k);
      return [
        body,
        <polygon
          key={`${key}s`}
          data-sticker={id}
          points={quad(0.42, 0.502)}
          fill={color}
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
          onPointerDown={() => (pressed.current = FACE_OF.get(d.join()))}
        />,
      ];
    });
  const depth = (c: V3) => view(world(c, c), yaw, pitch)[2];
  const sorted = [...CUBIES].sort((a, b) => depth(a) - depth(b));
  // While a layer turns, the layer and the rest are drawn one after the other, the further first.
  const layerNear = turning ? view(NORMAL[turning.face], yaw, pitch)[2] > 0 : true;
  const groups = turning
    ? layerNear
      ? [sorted.filter((c) => !onTurningLayer(c)), sorted.filter(onTurningLayer)]
      : [sorted.filter(onTurningLayer), sorted.filter((c) => !onTurningLayer(c))]
    : [sorted];

  const grab = (e: PointerEvent<SVGRectElement | SVGGElement>) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    down.current = { x: e.clientX, y: e.clientY, yaw, pitch, face: pressed.current, moved: false };
    pressed.current = undefined;
  };
  const drag = (e: PointerEvent) => {
    const d = down.current;
    if (!d) return;
    const [dx, dy] = [e.clientX - d.x, e.clientY - d.y];
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    setLook({ yaw: d.yaw + dx * 0.5, pitch: Math.max(-85, Math.min(85, d.pitch + dy * 0.5)) });
  };
  const drop = () => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    if (d.moved && look) set({ ...state, yaw: Math.round(look.yaw) % 360, pitch: Math.round(look.pitch) });
    else if (d.face) turn(d.face);
    setLook(null);
  };

  // ——— The rings ———
  const ringDots = STICKERS.map((_, i) => {
    const [x, y] = turning ? dotDuring(i, turning, anim!.t, RINGS) : dotAt(i, RINGS);
    const lit = !turning && hover && onLayer(hover, i) && i % 9 !== 4;
    return <circle key={i} data-dot={i} cx={x} cy={y} r={6.5} fill={FACE_COLORS[colors[i]]} stroke={lit ? "#1971c2" : "#343a40"} strokeWidth={lit ? 3 : 1.2} />;
  });
  const trails =
    hover && !turning
      ? STICKERS.flatMap((_, i) =>
          onLayer(hover, i) && i % 9 !== 4
            ? [
                <polyline
                  key={i}
                  points={Array.from({ length: 17 }, (_, k) => dotDuring(i, turnMove(hover), k / 16, RINGS).map((v) => v.toFixed(1)).join(",")).join(" ")}
                  fill="none"
                  stroke="#74c0fc"
                  strokeWidth={1.6}
                />,
              ]
            : [],
        )
      : [];

  const solved = isSolved(colorsAfter(target));
  const digits = POSITIONS.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const shownMoves = made.length > 30 ? `… ${movesText(made.slice(-30))}` : movesText(made);
  const faceTitle = (f: Face) => fill(state.prime ? w.anticlockwise : w.clockwise, { face: w.faces[f] });

  return (
    <>
      <svg ref={svgRef} width={760} height={410} viewBox="0 0 760 410" fontFamily="Georgia, 'Times New Roman', serif">
        <rect width={760} height={410} fill="#fff" />
        <g style={{ cursor: "grab" }} onPointerDown={grab} onPointerMove={drag} onPointerUp={drop} onPointerCancel={drop}>
          <rect width={370} height={410} fill="transparent" />
          {groups.map((g) => g.map((c) => <g key={c.join()}>{cubie(c)}</g>))}
        </g>
        <g fill="none">
          {([0, 1, 2] as const).map((a) => {
            const [x, y] = bandCentre(a, RINGS);
            // The circle a hovered face's turn slides its ring along.
            const lit = hover && axisOf(hover) === a ? NORMAL[hover][a] : null;
            return [-1, 0, 1].map((v) => (
              <circle key={`${a}${v}`} cx={x} cy={y} r={bandRadius(a, v, RINGS)} stroke={lit === v ? "#74c0fc" : "#ced4da"} strokeWidth={lit === v ? 2.5 : 1} />
            ));
          })}
        </g>
        {trails}
        {ringDots}
        {FACES.map((f) => {
          const [cx, cy] = ringCentre(f, RINGS);
          // The letter beyond the face's dots, away from the middle of the picture.
          const k = 42 / Math.hypot(cx - RINGS.cx, cy - RINGS.cy);
          const [x, y] = [cx + (cx - RINGS.cx) * k, cy + (cy - RINGS.cy) * k];
          return (
            <g key={f} style={{ cursor: "pointer" }} onClick={() => turn(f)} onPointerEnter={() => setHover(f)} onPointerLeave={() => setHover(null)}>
              <title>{faceTitle(f)}</title>
              <circle cx={cx} cy={cy} r={RINGS.step * 2} fill="transparent" />
              <text x={x} y={y + 8} textAnchor="middle" fontSize={22} fontWeight={700} fill={INK}>{f}{state.prime ? "′" : ""}</text>
            </g>
          );
        })}
      </svg>
      <div className="live-bar">
        {FACES.map((f) => (
          <button key={f} className="live-btn live-face" title={faceTitle(f)} aria-label={faceTitle(f)} disabled={!room(1)} onClick={() => turn(f)} onPointerEnter={() => setHover(f)} onPointerLeave={() => setHover(null)}>
            {f}{state.prime ? "′" : ""}
          </button>
        ))}
        <button className={`live-btn${state.prime ? " on" : ""}`} aria-pressed={state.prime} title={w.prime} aria-label={w.prime} onClick={() => set({ ...state, prime: !state.prime })}>
          ↺ ′
        </button>
        <button className="live-btn" title={w.undo} aria-label={w.undo} disabled={!made.length} onClick={() => set({ ...state, moves: movesText(made.slice(0, -1)), reps: 0 })}>↶</button>
        <button className="live-btn" title={w.scramble} onClick={() => set({ ...state, scramble: movesText(scramble(20, Math.random)), moves: "", reps: 0 })}>🎲 {w.scramble}</button>
        <button className="live-btn" disabled={!target.length} onClick={() => set({ ...state, scramble: "", moves: "", reps: 0 })}>{w.reset}</button>
      </div>
      <div className="live-bar">
        <label className="live-rubik-alg">
          {w.alg}
          <input className={alg ? undefined : "invalid"} spellCheck={false} value={state.alg} title={alg ? undefined : w.badAlg} onChange={(e) => set({ ...state, alg: e.target.value, reps: 0 })} />
        </label>
        <button className="live-btn primary" disabled={!alg?.length || !room(alg.length)} onClick={() => repeat(1)}>▶ {w.play}</button>
        <button className="live-btn" disabled={!algOrder || !room(alg!.length * (algOrder - (state.reps % algOrder)))} onClick={() => repeat(algOrder - (state.reps % algOrder))}>
          ⟳ {w.untilBack}
        </button>
      </div>
      <p className="live-hint">
        {!alg
          ? w.badAlg
          : alg.length > 0 &&
            `${fill(w.order, { alg: movesText(alg), n: algOrder })} ${fill(w.cycles, { lens: lengths.join(", "), n: algOrder })}${state.reps ? ` ${fill(w.done, { k: state.reps % algOrder || algOrder, n: algOrder })}` : ""}`}
      </p>
      <p className="live-hint">
        {state.scramble && `${fill(w.scrambled, { n: scrambled.length })} `}
        {made.length ? fill(w.yourMoves, { moves: shownMoves, n: made.length }) : !state.scramble && w.hint}
        {solved && target.length > 0 && ` ✓ ${w.solved}`}
      </p>
      <p className="live-hint live-rubik-fact">{fill(w.gods, { positions: digits, n: GODS_NUMBER })}</p>
    </>
  );
}
