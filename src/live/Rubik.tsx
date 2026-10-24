// A Rubik's cube on the board, drawn four ways at once: as a cube that turns (click a sticker to turn its face); on a
// ball of circles, three bands of three, one band per axis, with each face's nine dots where two bands cross, so a
// turn slides the twelve dots beside the face along one circle and turns the face's own dots about its pole (dragging
// the cube or the ball turns both, any way up); the same bands flat, as in the paper's circle picture; and the net.
// Below them the moves made, and moves to repeat with their order: how many times they must be done before the cube
// comes back. The colours of a real cube can be painted in, sticker by sticker, and the cube solved a turn at a time.
import { useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from "react";
import {
  axisOf,
  bandCentre,
  bandRadius,
  circleOnBall,
  colorsAfter,
  common,
  cycleLengths,
  dotAt,
  dotDuring,
  dotOnBall,
  dotOnBallDuring,
  FACES,
  GODS_NUMBER,
  inverseSeq,
  isSolved,
  type Layout,
  moveAngle,
  type Move,
  moveText,
  movesText,
  netCell,
  NORMAL,
  onLayer,
  order,
  parseMoves,
  path,
  POSITIONS,
  ringCentre,
  rotate,
  scramble,
  seqPerm,
  stickerAt,
  STICKERS,
  type Face,
  type V3,
} from "../math/rubik";
import { type CubeError, type Cubies, readCube } from "../math/rubikSolve";
import { fill, INK, type PieceProps } from "./ui";

export const FACE_COLORS: Record<Face, string> = { U: "#ffffff", D: "#ffd43b", F: "#2f9e44", B: "#1971c2", R: "#e03131", L: "#f76707" };
/** More turns than this in one go (a long repeat) are shown at once rather than turned one by one. */
const MAX_ANIMATED = 320;
/** The most moves kept. */
const MAX_MOVES = 1200;
const BODY = "#212529";
/** How fast the turns go, times the usual pace: the slider's stops. */
const SPEEDS = [0.125, 0.25, 0.5, 1, 2, 4];

const [CUBE_X, CUBE_Y, CUBE_K] = [185, 205, 60];
/** The circle picture, below the cube: the three bands flat, as in the paper. */
const RINGS: Layout = { cx: 190, cy: 605, d: 60, rho: 110, step: 15 };
/** The net, below the ball: the size of a sticker and the top left corner. */
const [CELL, NET_X, NET_Y] = [30, 390, 465];
/** The ball: its middle and radius on the screen, and the size of a dot. */
const [BALL_X, BALL_Y, BALL_K, DOT] = [565, 200, 150, 9];
const rad = (deg: number) => (deg * Math.PI) / 180;
/** How the circles round the back of the ball are dashed. */
const BACK_DASH = "4 5";

// ——— Turning and looking ———

/** Into the viewer's frame: x right, y up, z towards the viewer. */
function view(v: V3, yaw: number, pitch: number): V3 {
  const [cy, sy, cp, sp] = [Math.cos(rad(yaw)), Math.sin(rad(yaw)), Math.cos(rad(pitch)), Math.sin(rad(pitch))];
  const [x, y, z] = [v[0] * cy + v[2] * sy, v[1], -v[0] * sy + v[2] * cy];
  return [x, y * cp - z * sp, y * sp + z * cp];
}

const CUBIES: V3[] = [-1, 0, 1].flatMap((x) => [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((z) => [x, y, z] as V3))).filter((c) => c.some(Boolean));
const DIRS: V3[] = FACES.map((f) => NORMAL[f]);
const FACE_OF = new Map(FACES.map((f) => [NORMAL[f].join(), f]));

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(Math.min(255, v * k)));
  return `rgb(${c.join(",")})`;
}

/**
 * Steps the cube shown towards the one asked for, a turn at a time; `anim` is the turn under way and how far it has got.
 * The speed is read every frame, so changing it slows or hurries the turns already under way. With `jump` set, the
 * next cube asked for is shown at once (a painted cube, already on the screen, now reached by moves).
 */
function useTurns(target: Move[], speed: number, jump: RefObject<boolean>) {
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const shownRef = useRef(target);
  const [shown, setShown] = useState(target);
  const [anim, setAnim] = useState<{ move: Move; t: number } | null>(null);
  useEffect(() => {
    if (jump.current) {
      jump.current = false;
      shownRef.current = target;
      setShown(target);
      setAnim(null);
      return;
    }
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
    let [i, t, last, frame] = [0, 0, performance.now(), 0];
    const tick = (now: number) => {
      t += ((now - last) * speedRef.current) / ms;
      last = now;
      while (t >= 1 && i < plan.length) {
        shownRef.current = plan[i++].after;
        t -= 1;
      }
      setShown(shownRef.current);
      if (i >= plan.length) return setAnim(null);
      setAnim({ move: plan[i].move, t: ease(t) });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, jump]);
  return { shown, anim };
}

// ——— Solving, in a worker ———

let solver: Worker | null = null;
let asked = 0;
/** Turns that solve the cube, worked out in the worker; with no cube, the worker only gets its tables ready. */
function solveAway(cubies: Cubies | null): Promise<Move[]> {
  solver ??= new Worker(new URL("./rubikWorker.ts", import.meta.url), { type: "module" });
  const [worker, id] = [solver, ++asked];
  return new Promise((done) => {
    const answer = (e: MessageEvent<{ id: number; moves: string }>) => {
      if (e.data.id !== id) return;
      worker.removeEventListener("message", answer);
      done(parseMoves(e.data.moves) ?? []);
    };
    worker.addEventListener("message", answer);
    worker.postMessage({ id, cubies });
  });
}

// ——— The piece ———

export function Rubik({ state, set, w: words, svgRef }: PieceProps<"rubik">) {
  const w = words.rubik;
  const scrambled = useMemo(() => parseMoves(state.scramble) ?? [], [state.scramble]);
  const made = useMemo(() => parseMoves(state.moves) ?? [], [state.moves]);
  const target = useMemo(() => [...scrambled, ...made], [scrambled, made]);
  const [speed, setSpeed] = useState(SPEEDS.indexOf(1));
  const jump = useRef(false);
  const { shown, anim } = useTurns(target, SPEEDS[speed], jump);
  // While a real cube's colours are painted in, they are what is shown.
  const paint = useMemo(() => (state.paint?.length === 54 ? ([...state.paint] as Face[]) : null), [state.paint]);
  const shownColors = useMemo(() => colorsAfter(shown), [shown]);
  const colors = paint ?? shownColors;
  const [brush, setBrush] = useState<Face>("U");
  const [solving, setSolving] = useState(false);
  const [look, setLook] = useState<{ yaw: number; pitch: number } | null>(null);
  const [hover, setHover] = useState<Face | null>(null);
  const down = useRef<{ x: number; y: number; yaw: number; pitch: number; face?: Face; sticker?: number; moved: boolean } | null>(null);
  // The sticker under the pointer when it went down, and its face (its handler runs before the cube's).
  const pressed = useRef<Face | undefined>(undefined);
  const pressedSticker = useRef<number | undefined>(undefined);
  const { yaw, pitch } = look ?? state;

  const alg = parseMoves(state.alg);
  const algOrder = alg?.length ? order(alg) : 0;
  const lengths = alg?.length ? [...new Set(cycleLengths(seqPerm(alg)))].sort((a, b) => a - b) : [];
  const room = (n: number) => made.length + n <= MAX_MOVES;

  const turnMove = (face: Face): Move => ({ face, turns: state.prime ? 3 : 1 });
  const turn = (face: Face) => !paint && room(1) && set({ ...state, moves: movesText([...made, turnMove(face)]), reps: 0 });
  const enter = (f: Face) => !paint && setHover(f);

  // ——— Painting a real cube in, and solving ———
  const check = paint && readCube(paint);
  const startPaint = () => {
    setHover(null);
    set({ ...state, paint: colorsAfter(target).join("") });
    // The worker makes its tables while the colours go in.
    void solveAway(null);
  };
  const paintAt = (i: number) => paint && i % 9 !== 4 && set({ ...state, paint: paint.map((c, j) => (j === i ? brush : c)).join("") });
  const solution = parseMoves(state.solution ?? "") ?? [];
  const onPath = common(made, solution) === made.length;
  const solveNow = async () => {
    const read = readCube(paint ?? colorsAfter(target));
    if (!("cubies" in read)) return;
    setSolving(true);
    const moves = await solveAway(read.cubies);
    setSolving(false);
    // The cube is now the solution undone from solved: the same colours, reached by moves, so every view can turn it.
    const from = movesText(inverseSeq(moves));
    jump.current = from !== state.scramble || made.length > 0;
    set({ ...state, paint: "", scramble: from, moves: "", reps: 0, solution: movesText(moves) });
  };
  const nextTurn = (all: boolean) => set({ ...state, moves: movesText(solution.slice(0, all ? solution.length : made.length + 1)), reps: 0 });
  const repeat = (times: number) =>
    alg?.length && room(alg.length * times) &&
    set({ ...state, moves: movesText([...made, ...Array.from({ length: times }, () => alg).flat()]), reps: state.reps + times });

  // ——— The cube ———
  const turning = paint ? undefined : anim?.move;
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
          onPointerDown={() => {
            pressed.current = FACE_OF.get(d.join());
            pressedSticker.current = id;
          }}
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
    down.current = { x: e.clientX, y: e.clientY, yaw, pitch, face: pressed.current, sticker: pressedSticker.current, moved: false };
    pressed.current = undefined;
    pressedSticker.current = undefined;
  };
  const drag = (e: PointerEvent) => {
    const d = down.current;
    if (!d) return;
    const [dx, dy] = [e.clientX - d.x, e.clientY - d.y];
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    setLook({ yaw: d.yaw + dx * 0.5, pitch: d.pitch + dy * 0.5 });
  };
  const drop = () => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    if (d.moved && look) set({ ...state, yaw: Math.round(look.yaw) % 360, pitch: Math.round(look.pitch) % 360 });
    else if (paint) {
      if (d.sticker !== undefined) paintAt(d.sticker);
    } else if (d.face) turn(d.face);
    setLook(null);
  };

  // ——— The ball ———
  const faceTitle = (f: Face) => fill(state.prime ? w.anticlockwise : w.clockwise, { face: w.faces[f] });
  /** A point of the ball on the screen, with how far it is towards the viewer (−1 at the back to 1 at the front). */
  const onScreen = (v: V3): V3 => {
    const [x, y, z] = view(v, yaw, pitch);
    return [BALL_X + BALL_K * x, BALL_Y - BALL_K * y, z];
  };
  /** A line over the ball cut where it goes round the back: the parts behind and the parts in front. */
  const sides = (points: V3[]) => {
    const out: { front: boolean; pts: string }[] = [];
    let run: V3[] = [];
    const flush = () => run.length > 1 && out.push({ front: run[0][2] >= 0, pts: run.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ") });
    for (const p of points.map(onScreen)) {
      if (run.length && run[run.length - 1][2] >= 0 !== p[2] >= 0) {
        run.push(p);
        flush();
        run = [p];
      } else run.push(p);
    }
    flush();
    return out;
  };
  // The circles, the one a hovered face's turn slides its ring along lit up.
  const circles = ([0, 1, 2] as const).flatMap((a) =>
    [-1, 0, 1].map((v) => ({ key: `${a}${v}`, lit: !!hover && axisOf(hover) === a && NORMAL[hover][a] === v, parts: sides(circleOnBall(a, v)) })),
  );
  const drawCircles = (front: boolean) =>
    circles.flatMap(({ key, lit, parts }) =>
      parts
        .filter((part) => part.front === front)
        .map((part, k) => (
          <polyline
            key={`${key}-${k}`}
            points={part.pts}
            stroke={lit ? (front ? "#339af0" : "#a5d8ff") : front ? "#868e96" : "#ced4da"}
            strokeWidth={lit ? (front ? 3.5 : 2) : front ? 1.6 : 1.1}
            strokeDasharray={front ? undefined : BACK_DASH}
          />
        )),
    );
  const dots = STICKERS.map((_, i) => ({ i, at: onScreen(turning ? dotOnBallDuring(i, turning, anim!.t) : dotOnBall(i)) })).sort((p, q) => p.at[2] - q.at[2]);
  const drawDots = (front: boolean) =>
    dots
      .filter(({ at }) => at[2] >= 0 === front)
      .map(({ i, at: [x, y, z] }) => {
        const lit = !turning && hover && onLayer(hover, i) && i % 9 !== 4;
        return (
          <circle
            key={i}
            data-dot={i}
            cx={x}
            cy={y}
            r={DOT * (0.85 + 0.15 * z)}
            fill={`url(#rubik-bead-${colors[i]})`}
            stroke={lit ? "#1971c2" : "#343a40"}
            strokeWidth={lit ? 3 : 1.2}
          />
        );
      });
  const trails =
    hover && !turning
      ? STICKERS.flatMap((_, i) =>
          onLayer(hover, i) && i % 9 !== 4
            ? sides(Array.from({ length: 17 }, (_, k) => dotOnBallDuring(i, turnMove(hover), k / 16))).map((part, k) => (
                <polyline key={`${i}-${k}`} points={part.pts} fill="none" stroke="#74c0fc" strokeWidth={1.6} strokeOpacity={part.front ? 1 : 0.4} />
              ))
            : [],
        )
      : [];
  // Each face's letter just beyond its pole, faint when the face is round the back; the pole is the place to click.
  const letters = (front: boolean) =>
    FACES.flatMap((f) => {
      const [x, y, z] = onScreen(NORMAL[f].map((c) => c * 1.25) as V3);
      if (z >= 0 !== front) return [];
      const [px, py] = onScreen(NORMAL[f]);
      return [
        <g key={f} style={{ cursor: "pointer" }} onPointerDown={() => (pressed.current = f)} onPointerEnter={() => enter(f)} onPointerLeave={() => setHover(null)}>
          <title>{faceTitle(f)}</title>
          {front && <circle cx={px} cy={py} r={BALL_K * 0.3} fill="transparent" />}
          <text x={x} y={y + 8} textAnchor="middle" fontSize={22} fontWeight={700} fill={INK} opacity={front ? 1 : 0.35}>
            {f}
            {state.prime ? "′" : ""}
          </text>
        </g>,
      ];
    });

  // ——— The circle picture ———
  const rings = () => {
    const at = (i: number) => (turning ? dotDuring(i, turning, anim!.t, RINGS) : dotAt(i, RINGS));
    const pts = (ps: [number, number][]) => ps.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");
    return (
      <>
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
        {/* Each face's places, its rows and columns joined: the dots slide from place to place. */}
        <g fill="none" stroke="#868e96" strokeWidth={1}>
          {FACES.flatMap((_, k) =>
            [0, 1, 2].flatMap((n) => [
              <polyline key={`${k}r${n}`} points={pts([0, 1, 2].map((c) => dotAt(9 * k + 3 * n + c, RINGS)))} />,
              <polyline key={`${k}c${n}`} points={pts([0, 1, 2].map((r) => dotAt(9 * k + 3 * r + n, RINGS)))} />,
            ]),
          )}
        </g>
        {hover &&
          !turning &&
          STICKERS.flatMap((_, i) =>
            onLayer(hover, i) && i % 9 !== 4
              ? [<polyline key={`t${i}`} points={pts(Array.from({ length: 17 }, (_, k) => dotDuring(i, turnMove(hover), k / 16, RINGS)))} fill="none" stroke="#74c0fc" strokeWidth={1.6} />]
              : [],
          )}
        {STICKERS.map((_, i) => {
          const [x, y] = at(i);
          const lit = !turning && hover && onLayer(hover, i) && i % 9 !== 4;
          return <circle key={i} data-dot={i} cx={x} cy={y} r={6.5} fill={`url(#rubik-bead-${colors[i]})`} stroke={lit ? "#1971c2" : "#343a40"} strokeWidth={lit ? 3 : 1.2} />;
        })}
        {FACES.map((f) => {
          const [cx, cy] = ringCentre(f, RINGS);
          // The letter beyond the face's dots, away from the middle of the picture.
          const k = 42 / Math.hypot(cx - RINGS.cx, cy - RINGS.cy);
          const [x, y] = [cx + (cx - RINGS.cx) * k, cy + (cy - RINGS.cy) * k];
          return (
            <g key={f} style={{ cursor: "pointer" }} onClick={() => turn(f)} onPointerEnter={() => enter(f)} onPointerLeave={() => setHover(null)}>
              <title>{faceTitle(f)}</title>
              <circle cx={cx} cy={cy} r={RINGS.step * 2} fill="transparent" />
              <text x={x} y={y + 8} textAnchor="middle" fontSize={22} fontWeight={700} fill={INK}>
                {f}
                {state.prime ? "′" : ""}
              </text>
            </g>
          );
        })}
      </>
    );
  };

  // ——— The net ———
  const net = () => (
    <>
      {FACES.map((f, k) => {
        const [x, y] = netCell(9 * k);
        return (
          <g key={f} style={{ cursor: "pointer" }} onClick={() => turn(f)} onPointerEnter={() => enter(f)} onPointerLeave={() => setHover(null)}>
            <title>{faceTitle(f)}</title>
            <rect x={NET_X + x * CELL - 3} y={NET_Y + y * CELL - 3} width={3 * CELL + 6} height={3 * CELL + 6} rx={6} fill={BODY} />
          </g>
        );
      })}
      {STICKERS.map((s, i) => {
        const [x, y] = netCell(i);
        // The stickers a hovered face's turn moves.
        const lit = !turning && hover && onLayer(hover, i);
        return (
          <rect
            key={i}
            data-net={i}
            x={NET_X + x * CELL + 2}
            y={NET_Y + y * CELL + 2}
            width={CELL - 4}
            height={CELL - 4}
            rx={4}
            fill={FACE_COLORS[colors[i]]}
            stroke={lit ? "#74c0fc" : "none"}
            strokeWidth={3}
            pointerEvents={paint && i % 9 !== 4 ? undefined : "none"}
            style={paint ? { cursor: "pointer" } : undefined}
            onClick={() => paintAt(i)}
          />
        );
      })}
      {FACES.map((f) => {
        const [x, y] = netCell(FACES.indexOf(f) * 9 + 4);
        return (
          <text key={f} x={NET_X + (x + 0.5) * CELL} y={NET_Y + (y + 0.5) * CELL + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill={colors[FACES.indexOf(f) * 9 + 4] === "U" || colors[FACES.indexOf(f) * 9 + 4] === "D" ? INK : "#fff"} pointerEvents="none">
            {f}
            {state.prime ? "′" : ""}
          </text>
        );
      })}
    </>
  );

  const solved = isSolved(colorsAfter(target));
  /** What is wrong with the painted colours: for the counts, which colours are off and how many each has. */
  const paintProblem = (error: CubeError) =>
    error === "count"
      ? fill(w.counts, { list: FACES.flatMap((f) => (paint!.filter((c) => c === f).length === 9 ? [] : [`${w.colors[f]} ${paint!.filter((c) => c === f).length}`])).join(", ") })
      : w.problems[error];
  const digits = POSITIONS.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const shownMoves = made.length > 30 ? `… ${movesText(made.slice(-30))}` : movesText(made);

  return (
    <>
      <svg ref={svgRef} width={760} height={800} viewBox="0 0 760 800" fontFamily="Georgia, 'Times New Roman', serif">
        <rect width={760} height={800} fill="#fff" />
        <g style={{ cursor: "grab" }} onPointerDown={grab} onPointerMove={drag} onPointerUp={drop} onPointerCancel={drop}>
          <rect width={370} height={410} fill="transparent" />
          {groups.map((g) => g.map((c) => <g key={c.join()}>{cubie(c)}</g>))}
        </g>
        <defs>
          {FACES.map((f) => (
            <radialGradient key={f} id={`rubik-bead-${f}`} cx="0.35" cy="0.3" r="0.75">
              <stop offset="0" stopColor={shade(FACE_COLORS[f], 1.25)} />
              <stop offset="0.55" stopColor={FACE_COLORS[f]} />
              <stop offset="1" stopColor={shade(FACE_COLORS[f], 0.7)} />
            </radialGradient>
          ))}
        </defs>
        <radialGradient id="rubik-ball" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity={0.75} />
          <stop offset="0.7" stopColor="#e7f5ff" stopOpacity={0.7} />
          <stop offset="1" stopColor="#a5d8ff" stopOpacity={0.75} />
        </radialGradient>
        <g style={{ cursor: "grab" }} onPointerDown={grab} onPointerMove={drag} onPointerUp={drop} onPointerCancel={drop}>
          <rect x={370} width={390} height={410} fill="transparent" />
          <ellipse cx={BALL_X} cy={BALL_Y + BALL_K + 22} rx={BALL_K * 0.75} ry={10} fill="#000" opacity={0.07} />
          {/* The back of the ball, seen through it; only the letters take clicks. */}
          <g fill="none" pointerEvents="none">{drawCircles(false)}</g>
          <g pointerEvents="none">{drawDots(false)}</g>
          {letters(false)}
          <circle cx={BALL_X} cy={BALL_Y} r={BALL_K} fill="url(#rubik-ball)" stroke="#a5d8ff" strokeWidth={1.5} />
          <g pointerEvents="none">
            <g fill="none">{drawCircles(true)}</g>
            {trails}
            {drawDots(true)}
          </g>
          {letters(true)}
        </g>
        {rings()}
        {net()}
      </svg>
      <div className="live-bar">
        {FACES.map((f) => (
          <button key={f} className="live-btn live-face" title={faceTitle(f)} aria-label={faceTitle(f)} disabled={!!paint || !room(1)} onClick={() => turn(f)} onPointerEnter={() => enter(f)} onPointerLeave={() => setHover(null)}>
            {f}{state.prime ? "′" : ""}
          </button>
        ))}
        <button className={`live-btn${state.prime ? " on" : ""}`} aria-pressed={state.prime} title={w.prime} aria-label={w.prime} disabled={!!paint} onClick={() => set({ ...state, prime: !state.prime })}>
          ↺ ′
        </button>
        <button className="live-btn" title={w.undo} aria-label={w.undo} disabled={!!paint || !made.length} onClick={() => set({ ...state, moves: movesText(made.slice(0, -1)), reps: 0 })}>↶</button>
        <button className="live-btn" title={w.scramble} aria-label={w.scramble} disabled={!!paint} onClick={() => set({ ...state, scramble: movesText(scramble(20, Math.random)), moves: "", reps: 0, solution: "" })}>🎲</button>
        <button className="live-btn" disabled={!!paint || !target.length} onClick={() => set({ ...state, scramble: "", moves: "", reps: 0, solution: "" })}>{w.reset}</button>
        <button className={`live-btn${paint ? " on" : ""}`} aria-pressed={!!paint} title={w.paintTitle} onClick={() => (paint ? set({ ...state, paint: "" }) : startPaint())}>
          🎨 {w.paint}
        </button>
        {!paint && (
          <button className="live-btn" title={w.solveTitle} disabled={solving || solved} onClick={solveNow}>
            🧩 {w.solve}
          </button>
        )}
      </div>
      {paint ? (
        <div className="live-bar">
          {FACES.map((f) => (
            <button
              key={f}
              className={`live-btn live-rubik-swatch${brush === f ? " on" : ""}`}
              aria-pressed={brush === f}
              title={w.colors[f]}
              aria-label={w.colors[f]}
              style={{ background: FACE_COLORS[f] }}
              onClick={() => setBrush(f)}
            />
          ))}
          <button className="live-btn primary" disabled={solving || !check || !("cubies" in check)} onClick={solveNow}>
            🧩 {w.solve}
          </button>
          <button className="live-btn" onClick={() => set({ ...state, paint: "" })}>{w.cancel}</button>
        </div>
      ) : (
        <div className="live-bar">
          {solution.length > 0 ? (
            <>
              <button className="live-btn primary" disabled={!onPath || made.length >= solution.length} onClick={() => nextTurn(false)}>
                ▶ {fill(w.next, { move: onPath && made.length < solution.length ? moveText(solution[made.length]) : "" })}
              </button>
              <button className="live-btn" disabled={!onPath || made.length >= solution.length} onClick={() => nextTurn(true)}>⏭ {w.rest}</button>
              <button className="live-btn" title={w.closeSolution} aria-label={w.closeSolution} onClick={() => set({ ...state, solution: "" })}>✕</button>
            </>
          ) : (
            <>
              <label className="live-rubik-alg">
                {w.alg}
                <input className={alg ? undefined : "invalid"} spellCheck={false} value={state.alg} title={alg ? undefined : w.badAlg} onChange={(e) => set({ ...state, alg: e.target.value, reps: 0 })} />
              </label>
              <button className="live-btn primary" disabled={!alg?.length || !room(alg.length)} onClick={() => repeat(1)}>▶ {w.play}</button>
              <button className="live-btn" disabled={!algOrder || !room(alg!.length * (algOrder - (state.reps % algOrder)))} onClick={() => repeat(algOrder - (state.reps % algOrder))}>
                ⟳ {w.untilBack}
              </button>
            </>
          )}
          <label className="live-slider live-rubik-speed" title={w.speed}>
            <b>{w.speed} ×{SPEEDS[speed]}</b>
            <input type="range" min={0} max={SPEEDS.length - 1} value={speed} aria-label={w.speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          </label>
        </div>
      )}
      {paint ? (
        <>
          <p className="live-hint">{w.paintHint}</p>
          <p className="live-hint">{solving ? w.solving : check && "cubies" in check ? w.ready : check && paintProblem(check.error)}</p>
        </>
      ) : solution.length > 0 ? (
        <>
          <p className="live-hint live-rubik-solution">
            {fill(w.solution, { n: solution.length })}{" "}
            {solution.map((m, k) => (
              <span key={k} className={!onPath ? undefined : k < made.length ? "done" : k === made.length ? "next" : undefined}>
                {moveText(m)}{" "}
              </span>
            ))}
          </p>
          <p className="live-hint">
            {!onPath ? w.offPath : made.length < solution.length ? fill(w.step, { k: made.length, n: solution.length }) : `✓ ${w.solved}`}
          </p>
        </>
      ) : (
        <>
          <p className="live-hint">
            {!alg
              ? w.badAlg
              : alg.length > 0 &&
                `${fill(w.order, { alg: movesText(alg), n: algOrder })} ${fill(w.cycles, { lens: lengths.join(", "), n: algOrder })}${state.reps ? ` ${fill(w.done, { k: state.reps % algOrder || algOrder, n: algOrder })}` : ""}`}
          </p>
          <p className="live-hint">
            {solving && `${w.solving} `}
            {state.scramble && `${fill(w.scrambled, { n: scrambled.length })} `}
            {made.length ? fill(w.yourMoves, { moves: shownMoves, n: made.length }) : !state.scramble && w.hint}
            {solved && target.length > 0 && ` ✓ ${w.solved}`}
          </p>
        </>
      )}
      <p className="live-hint live-rubik-fact">{fill(w.gods, { positions: digits, n: GODS_NUMBER })}</p>
    </>
  );
}
