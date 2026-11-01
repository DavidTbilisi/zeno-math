// Scratch paper under a practice question: a pen in three inks, two erasers (one rubs out what it passes over, the
// other lifts away every whole line it touches), undo and clear, on squared paper, for the working a student would
// otherwise do on paper beside the screen. With dots on, the squares turn into dot paper and the pen draws straight
// lines from dot to dot (a tap marks a dot), for shapes, graphs and number lines; the eraser then runs along those
// lines too, dot to dot and only as wide as a line, so it takes out one stretch of a line and spares its neighbours,
// and the line eraser takes from a line drawn on dots only the piece between the two dots either side of where it
// touches. It takes a mouse, a finger or a stylus (pointer events), and it is only for the student: nothing drawn is
// checked or saved, and the next question starts on a clean sheet.
import { useEffect, useRef, useState } from "react";
import type { PracticeWords } from "../math/practice";

type Tool = "pen" | "rub" | "lift";
type Point = { x: number; y: number };
/** `flat`: square ends, so a stretch rubbed out between two dots stops at those dots. `dotted`: a straight line (or a
 * dot) the pen drew on dots, which the line eraser on dots takes apart piece by piece. */
type Stroke = { colour: string; width: number; erase: boolean; flat?: boolean; dotted?: boolean; points: Point[] };

/** The pen's inks: dark, blue and red, as on paper. */
const INKS = [["black", "#1e1e1e"], ["blue", "#1f5fd1"], ["red", "#d6336c"]] as const;
const PEN = 2.5;
/** The rubbing eraser's width, and how near the lifting eraser must come to a line to take it. */
const ERASER = 22;
/** The eraser on dots: a little wider than a pen line, so it covers the line's soft edge and nothing beside it. */
const LINE_ERASER = PEN + 2;
const REACH = 8;
/** The squares of the paper, in CSS pixels. */
const SQUARE = 20;
/** Whether the pen snaps to dots, remembered on this device like the scratch paper itself. */
const DOTS_KEY = "zeno.scratch.dots.v1";
const dotsWanted = () => {
  try {
    return localStorage.getItem(DOTS_KEY) === "on";
  } catch {
    return false;
  }
};
const wantDots = (on: boolean) => {
  try {
    if (on) localStorage.setItem(DOTS_KEY, "on");
    else localStorage.removeItem(DOTS_KEY);
  } catch {
    // No storage: the choice lasts for this sheet only.
  }
};
/** The dot nearest p: the corners of the squares. */
const snap = (p: Point): Point => ({ x: Math.round(p.x / SQUARE) * SQUARE, y: Math.round(p.y / SQUARE) * SQUARE });

function paint(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[]) {
  const { width, height } = ctx.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineJoin = "round";
  for (const s of strokes) {
    ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
    ctx.strokeStyle = s.colour;
    ctx.fillStyle = s.colour;
    ctx.lineWidth = s.width;
    ctx.lineCap = s.flat ? "butt" : "round";
    const [first, ...rest] = s.points;
    if (!rest.length) {
      // A tap leaves a dot.
      ctx.beginPath();
      ctx.arc(first.x, first.y, s.width / 2, 0, 2 * Math.PI);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const p of rest) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

/** How far p is from the segment a–b. */
function distance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Whether the lifting eraser at p touches the line: rubbing strokes leave no line of their own, so it never takes them.
 * `beside`: only from beside the line, not past its ends, so that the line eraser cutting a line on dots does not reach
 * past the cut it just made and take the next piece too. */
function touches(s: Stroke, p: Point, beside = false) {
  if (s.erase) return false;
  const near = REACH + s.width / 2;
  if (s.points.length === 1) return Math.hypot(p.x - s.points[0].x, p.y - s.points[0].y) <= near;
  if (beside) {
    const [a, b] = s.points;
    const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    if (t < 0 || t > 1) return false;
  }
  return s.points.slice(1).some((b, i) => distance(p, s.points[i], b) <= near);
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** A line drawn on dots, without the piece the line eraser touched at p: the piece between the dots the line passes
 * either side of p. What is left (nothing, one line or two) keeps the line's ink and stays a line on dots. */
function cut(s: Stroke, p: Point): Stroke[] {
  if (s.points.length < 2) return [];
  const [a, b] = s.points;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // The line passes a dot every 1/n of its length.
  const n = gcd(Math.abs(Math.round(dx / SQUARE)), Math.abs(Math.round(dy / SQUARE))) || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  const k = Math.min(n - 1, Math.floor(t * n));
  const at = (i: number): Point => ({ x: a.x + (dx * i) / n, y: a.y + (dy * i) / n });
  const left: Stroke[] = [];
  if (k > 0) left.push({ ...s, points: [a, at(k)] });
  if (k + 1 < n) left.push({ ...s, points: [at(k + 1), b] });
  return left;
}

export function ScratchPad({ w }: { w: PracticeWords["ui"]["scratch"] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  /** The sheet before each change (a line drawn or rubbed, lines lifted, the sheet cleared), for undo. */
  const history = useRef<Stroke[][]>([]);
  const drawing = useRef<Stroke | null>(null);
  /** The sheet as the lifting eraser found it, while it is pressed. */
  const lifting = useRef<Stroke[] | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [ink, setInk] = useState<string>(INKS[0][1]);
  const [dots, setDots] = useState(dotsWanted);
  /** Whether the line being drawn is a straight one between dots. */
  const straight = useRef(false);
  /** Changes to undo and lines on the sheet, for the buttons. */
  const [steps, setSteps] = useState(0);
  const [lines, setLines] = useState(0);

  const redraw = () => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) paint(ctx, drawing.current ? [...strokes.current, drawing.current] : strokes.current);
  };

  // The canvas follows its box (the sheet can be pulled taller) at the screen's own pixel density.
  useEffect(() => {
    const box = wrap.current;
    const c = canvas.current;
    if (!box || !c) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(box.clientWidth * dpr);
      c.height = Math.round(box.clientHeight * dpr);
      redraw();
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(box);
    return () => watch.disconnect();
  }, []);

  const show = (next: Stroke[]) => {
    strokes.current = next;
    setLines(next.length);
    setSteps(history.current.length);
    redraw();
  };
  /** A change to the sheet, from `before`, that undo takes back. */
  const change = (before: Stroke[], next: Stroke[]) => {
    history.current.push(before);
    show(next);
  };
  const undo = () => {
    const before = history.current.pop();
    if (before) show(before);
  };
  /** The line eraser at p: on dots, a line drawn on dots loses the piece it touches; any other line goes whole. */
  const lift = (p: Point) => {
    const piece = (s: Stroke) => dots && !!s.dotted;
    if (!strokes.current.some((s) => touches(s, p, piece(s)))) return;
    show(strokes.current.flatMap((s) => (!touches(s, p, piece(s)) ? [s] : piece(s) ? cut(s, p) : [])));
  };

  /** The pointer's points since the last event: the moves the browser merged into this one, for a smooth line. */
  const pointsOf = (e: React.PointerEvent<HTMLCanvasElement>): Point[] => {
    const r = e.currentTarget.getBoundingClientRect();
    const merged = e.nativeEvent.getCoalescedEvents?.() ?? [];
    return (merged.length ? merged : [e.nativeEvent]).map((p) => ({ x: p.clientX - r.left, y: p.clientY - r.top }));
  };

  const toolButton = (t: Tool, label: string) => (
    <button className="btn small" aria-pressed={tool === t} onClick={() => setTool(t)}>
      {label}
    </button>
  );

  return (
    <div className="scratch">
      <div className="scratch-tools" role="toolbar" aria-label={w.title}>
        {toolButton("pen", `✏️ ${w.pen}`)}
        {INKS.map(([name, c]) => (
          <button
            key={c}
            className="scratch-ink"
            style={{ background: c }}
            aria-label={w[name]}
            aria-pressed={tool === "pen" && ink === c}
            onClick={() => (setInk(c), setTool("pen"))}
          />
        ))}
        {toolButton("rub", `🧽 ${w.rub}`)}
        {toolButton("lift", `〰 ${w.lift}`)}
        <button className="btn small" aria-pressed={dots} onClick={() => (wantDots(!dots), setDots(!dots))}>
          ⠿ {w.dots}
        </button>
        <span className="scratch-gap" />
        <button className="btn small" disabled={!steps} onClick={undo}>
          ↶ {w.undo}
        </button>
        <button className="btn small" disabled={!lines} onClick={() => change(strokes.current, [])}>
          {w.clear}
        </button>
      </div>
      <div
        ref={wrap}
        className={`scratch-sheet ${tool}${dots ? " dots" : ""}`}
        // A dot sits on each corner of the squares: the dot drawn in the middle of a square, moved half a square back.
        style={{ backgroundSize: `${SQUARE}px ${SQUARE}px`, backgroundPosition: dots ? `${-SQUARE / 2}px ${-SQUARE / 2}px` : undefined }}
      >
        <canvas
          ref={canvas}
          aria-label={w.title}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            const [p] = pointsOf(e);
            if (tool === "lift") {
              lifting.current = strokes.current;
              lift(p);
              return;
            }
            const erase = tool === "rub";
            straight.current = dots;
            drawing.current = dots
              ? { colour: ink, width: erase ? LINE_ERASER : PEN, erase, flat: erase, dotted: !erase, points: [snap(p)] }
              : { colour: ink, width: erase ? ERASER : PEN, erase, points: [p] };
            redraw();
          }}
          onPointerMove={(e) => {
            if (lifting.current) for (const p of pointsOf(e)) lift(p);
            if (!drawing.current) return;
            const points = drawing.current.points;
            if (straight.current) {
              // A straight line (or rubbed-out stretch) from the first dot to the dot under the pointer; back on the
              // first dot, just that dot.
              const end = snap(pointsOf(e).at(-1)!);
              points.length = 1;
              if (end.x !== points[0].x || end.y !== points[0].y) points.push(end);
            } else points.push(...pointsOf(e));
            redraw();
          }}
          onPointerUp={() => {
            const before = lifting.current;
            lifting.current = null;
            if (before && before !== strokes.current) change(before, strokes.current);
            if (!drawing.current) return;
            const done = drawing.current;
            drawing.current = null;
            change(strokes.current, [...strokes.current, done]);
          }}
          onPointerCancel={() => {
            if (lifting.current) show(lifting.current);
            lifting.current = null;
            drawing.current = null;
            redraw();
          }}
        />
      </div>
    </div>
  );
}
