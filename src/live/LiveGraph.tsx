// The live graph, worked by hand: functions typed on the board (an empty line under them takes another, a line typed
// empty is taken away), every letter in them a slider (y = a·x² + b·x + c gets a, b and c). A slider's knob is dragged
// along its track, tapped it plays (the letter runs from its least to its greatest value and back); its ends are dragged
// left or right for another range. A tap on the first curve puts a point on it, dragged along the curve; a tap on the
// point shows its tangent, and the point dragged off the graph is put away. Dragging the graph moves the view, the
// lever on its right (or scrolling) zooms, a double-click puts the view back. What's mid-way (a knob being dragged, a
// function being typed, a view being moved) stays here until it's let go, so each change is one step to undo.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { LiveGraphState, LiveParam } from "../math/live";
import { compileWith, roundTo, sample, slope, stepFor, syncParams, zoomView } from "../math/liveGraph";
import { niceStep, PLOT_COLORS } from "../math/plot";
import { BLUE, capture, keyTap, pointIn, TAP } from "./hand";
import { fill, FONT, INK, svgPoint, type PieceProps } from "./ui";

const PW = 620;
const PH = 330;
const MAX_FNS = 3;
const HOME: LiveGraphState["view"] = { xMin: -10, xMax: 10, yMin: -5.5, yMax: 5.5 };
const LEVER = { x: PW - 34, y: 10, w: 24, h: 130 };
const LEVER_MID = LEVER.y + LEVER.h / 2;
/** How far the lever is pulled to zoom twice as far. */
const LEVER_TWICE = 40;
/** A slider: its name, its least value, the track, its greatest value. */
const SL = { w: 306, h: 44, name: 74, bound: 36 };
const fmt = (v: number) => {
  const r = Math.round(v * 1e6) / 1e6;
  return Math.abs(r) >= 1e4 || (Math.abs(r) < 1e-3 && r !== 0) ? r.toExponential(1) : String(r);
};
type View = LiveGraphState["view"];
type Words = PieceProps<"graph">["w"]["graph"];

/** The grid, the axes and the curves: the picture as "Copy as a picture" takes it. */
function PlotBody({ view, fns, compiled, scope, point, tangent, w, faded }: {
  view: View;
  fns: { color: string }[];
  compiled: (ReturnType<typeof compileWith> | null)[];
  scope: Record<string, number>;
  point: { x: number; y: number; m: number } | null;
  tangent: boolean;
  w: Words;
  faded?: boolean;
}) {
  const { xMin, xMax, yMin, yMax } = view;
  const px = (x: number) => ((x - xMin) / (xMax - xMin)) * PW;
  const py = (y: number) => ((yMax - y) / (yMax - yMin)) * PH;
  const xs = niceStep(xMax - xMin);
  const ysStep = niceStep(yMax - yMin, 8);
  const axisY = Math.min(Math.max(py(0), 0), PH);
  const axisX = Math.min(Math.max(px(0), 0), PW);
  const gridX: number[] = [];
  for (let x = Math.ceil(xMin / xs) * xs; x <= xMax; x += xs) gridX.push(x);
  const gridY: number[] = [];
  for (let y = Math.ceil(yMin / ysStep) * ysStep; y <= yMax; y += ysStep) gridY.push(y);
  return (
    <>
      <rect width={PW} height={PH} fill="#fff" />
      {gridX.map((x) => <line key={`x${x}`} x1={px(x)} x2={px(x)} y1={0} y2={PH} stroke="#e9ecef" />)}
      {gridY.map((y) => <line key={`y${y}`} x1={0} x2={PW} y1={py(y)} y2={py(y)} stroke="#e9ecef" />)}
      <line x1={0} x2={PW} y1={axisY} y2={axisY} stroke="#495057" strokeWidth={1.3} />
      <line x1={axisX} x2={axisX} y1={0} y2={PH} stroke="#495057" strokeWidth={1.3} />
      <g fontSize={11} fill="#495057">
        {gridX.filter((x) => Math.abs(x) > xs / 2).map((x) => <text key={x} x={px(x)} y={Math.min(axisY + 14, PH - 4)} textAnchor="middle">{fmt(x)}</text>)}
        {gridY.filter((y) => Math.abs(y) > ysStep / 2).map((y) => <text key={y} x={Math.max(axisX - 5, 24)} y={py(y) + 4} textAnchor="end">{fmt(y)}</text>)}
      </g>
      {compiled.map((c, i) =>
        c && "f" in c
          ? sample((x) => c.f(x, scope), xMin, xMax, yMin, yMax).map((run, j) => (
              <polyline key={`${i}-${j}`} points={run.map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" ")} fill="none" stroke={fns[i].color} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
            ))
          : null,
      )}
      {point && tangent && Number.isFinite(point.m) && (
        <line x1={0} x2={PW} y1={py(point.y + point.m * (xMin - point.x))} y2={py(point.y + point.m * (xMax - point.x))} stroke="#e8590c" strokeWidth={2} strokeDasharray="7 5" />
      )}
      {point && (
        <g opacity={faded ? 0.35 : 1}>
          <circle cx={px(point.x)} cy={py(point.y)} r={7} fill={fns[0].color} stroke="#fff" strokeWidth={2} />
          <text x={px(point.x) + 10} y={py(point.y) - 10} fontSize={14} fill={INK} stroke="#fff" strokeWidth={4} paintOrder="stroke" pointerEvents="none">
            ({fmt(roundTo(point.x, 0.01))}, {fmt(roundTo(point.y, 0.01))}){tangent && Number.isFinite(point.m) ? `  ${w.slope} = ${fmt(roundTo(point.m, 0.01))}` : ""}
          </text>
        </g>
      )}
    </>
  );
}

export function LiveGraph({ state, set, w, svgRef }: PieceProps<"graph">) {
  const g = w.graph;
  // Changes not yet handed to the board.
  const [pending, setPending] = useState<Partial<LiveGraphState> | null>(null);
  const [drafts, setDrafts] = useState<string[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const plotRef = useRef<SVGSVGElement>(null);
  const cur: LiveGraphState = { ...state, ...pending };
  const latest = useRef({ cur, set });
  latest.current = { cur, set };
  const commit = () => {
    setPending(null);
    latest.current.set(latest.current.cur);
  };

  const exprs = drafts ?? cur.fns.map((f) => f.expr);
  const fns = exprs.map((expr, i) => ({ expr, color: cur.fns[i]?.color ?? PLOT_COLORS[i % PLOT_COLORS.length] }));
  const params = syncParams({ ...cur, fns });
  const scope = Object.fromEntries(Object.entries(params).map(([k, p]) => [k, p.v]));
  // exprs is a new array every render; its text says when it changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const compiled = useMemo(() => exprs.map((e) => (e.trim() ? compileWith(e) : null)), [exprs.join("\n")]);
  const view = cur.view;
  const { xMin, xMax, yMin, yMax } = view;
  const px = (x: number) => ((x - xMin) / (xMax - xMin)) * PW;
  const py = (y: number) => ((yMax - y) / (yMax - yMin)) * PH;
  const toUnits = ([sx, sy]: number[], v = view): [number, number] => [v.xMin + (sx / PW) * (v.xMax - v.xMin), v.yMax - (sy / PH) * (v.yMax - v.yMin)];

  // A line typed empty is taken away (one empty line stays when every line is).
  const commitFns = (next: string[]) => {
    const kept = next.filter((e) => e.trim());
    const nextFns = (kept.length ? kept : [""]).map((expr, i) => ({ expr, color: cur.fns[i]?.color ?? PLOT_COLORS[i % PLOT_COLORS.length] }));
    setDrafts(null);
    setPending(null);
    set({ ...cur, fns: nextFns, params: syncParams({ ...cur, fns: nextFns }) });
  };
  const setParam = (name: string, p: LiveParam) => setPending((prev) => ({ ...prev, params: { ...params, ...prev?.params, [name]: p } }));
  // A key press is one whole step: handed to the board at once.
  const putParam = (name: string, p: LiveParam) => {
    setPending(null);
    set({ ...cur, params: { ...params, [name]: p } });
  };

  // A letter that's playing runs from its least to its greatest value and back, every four seconds.
  useEffect(() => {
    if (!playing) return;
    const p = params[playing];
    if (!p) return setPlaying(null);
    let frame = 0;
    const start = performance.now() - (((p.v - p.min) / (p.max - p.min)) * 2000 || 0);
    const tick = (now: number) => {
      const t = ((now - start) % 4000) / 2000;
      const v = p.min + (p.max - p.min) * (t < 1 ? t : 2 - t);
      setParam(playing, { ...p, v: roundTo(v, stepFor(p)) });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      commit();
    };
    // Restarts only when another letter starts playing, not on every frame it sets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Scrolling zooms about the pointer (and isn't passed on, or the board would zoom too).
  const zoomTimer = useRef(0);
  useEffect(() => {
    const svg = plotRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const { view } = latest.current.cur;
      setPending((prev) => ({ ...prev, view: zoomView(view, toUnits(svgPoint(svg, e), view), Math.exp(e.deltaY * 0.0015)) }));
      window.clearTimeout(zoomTimer.current);
      zoomTimer.current = window.setTimeout(commit, 400);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
    // Added once to the piece's own svg (it reads the latest state through latest.current).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const f0 = compiled[0] && "f" in compiled[0] ? compiled[0].f : null;
  const on = cur.trace || cur.tangent;
  const tx = cur.traceX;
  const ty = f0 ? f0(tx, scope) : NaN;
  const m = f0 && Number.isFinite(ty) ? slope((x) => f0(x, scope), tx) : NaN;
  const point = on && Number.isFinite(ty) ? { x: tx, y: ty, m } : null;

  // The plot under the hand: the point dragged along the curve (off the graph it goes away), or the view moved.
  type Press = { kind: "point"; s0: number[]; moved: boolean; off: boolean } | { kind: "pan"; s0: number[]; view: View; moved: boolean };
  const [press, setPressState] = useState<Press | null>(null);
  const pressNow = useRef<Press | null>(null);
  const setPress = (p: Press | null) => {
    pressNow.current = p;
    setPressState(p);
  };
  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    capture(e.currentTarget, e.pointerId);
    const s = svgPoint(e.currentTarget, e);
    const onPoint = point && Math.hypot(s[0] - px(point.x), s[1] - py(point.y)) < 16;
    setPress(onPoint ? { kind: "point", s0: s, moved: false, off: false } : { kind: "pan", s0: s, view, moved: false });
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = pressNow.current;
    if (!p) return;
    const s = svgPoint(e.currentTarget, e);
    const moved = p.moved || Math.hypot(s[0] - p.s0[0], s[1] - p.s0[1]) > TAP;
    if (!moved) return;
    if (p.kind === "point") {
      const off = s[0] < -8 || s[0] > PW + 8 || s[1] < -8 || s[1] > PH + 8;
      setPress({ ...p, moved, off });
      return off || setPending((prev) => ({ ...prev, traceX: roundTo(toUnits(s)[0], niceStep(xMax - xMin) / 20) }));
    }
    if (!p.moved) setPress({ ...p, moved });
    const [a, b] = [toUnits(p.s0, p.view), toUnits(s, p.view)];
    const [dx, dy] = [a[0] - b[0], a[1] - b[1]];
    const v = p.view;
    setPending((prev) => ({ ...prev, view: { xMin: v.xMin + dx, xMax: v.xMax + dx, yMin: v.yMin + dy, yMax: v.yMax + dy } }));
  };
  const up = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = pressNow.current;
    setPress(null);
    if (!p) return;
    if (p.kind === "point") {
      if (p.off) {
        setPending(null);
        return set({ ...cur, trace: false, tangent: false });
      }
      if (!p.moved) return set({ ...cur, trace: true, tangent: !cur.tangent });
      return commit();
    }
    if (p.moved) return commit();
    // A tap near the first curve puts the point there.
    const [sx, sy] = svgPoint(e.currentTarget, e);
    const x = toUnits([sx, sy])[0];
    const y = f0 ? f0(x, scope) : NaN;
    if (Number.isFinite(y) && Math.abs(py(y) - sy) < 16) set({ ...cur, trace: true, traceX: roundTo(x, niceStep(xMax - xMin) / 20) });
  };

  // The zoom lever: pulled up the graph zooms in, down it zooms out, as far as it is pulled; let go it springs back.
  const [lever, setLever] = useState<{ y0: number; view0: View; dy: number } | null>(null);
  const centre = (v: View): [number, number] => [(v.xMin + v.xMax) / 2, (v.yMin + v.yMax) / 2];
  const leverDown = (e: ReactPointerEvent<SVGGElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    capture(e.currentTarget, e.pointerId);
    setLever({ y0: pointIn(e)[1], view0: view, dy: 0 });
  };
  const leverMove = (e: ReactPointerEvent<SVGGElement>) => {
    if (!lever) return;
    e.stopPropagation();
    const dy = Math.max(-LEVER.h / 2 + 12, Math.min(LEVER.h / 2 - 12, pointIn(e)[1] - lever.y0));
    setLever({ ...lever, dy });
    if (Math.abs(dy) > TAP) setPending((prev) => ({ ...prev, view: zoomView(lever.view0, centre(lever.view0), 2 ** (dy / LEVER_TWICE)) }));
  };
  const leverUp = (e: ReactPointerEvent<SVGGElement>) => {
    if (!lever) return;
    e.stopPropagation();
    setLever(null);
    if (Math.abs(lever.dy) > TAP) return commit();
    set({ ...cur, view: zoomView(view, centre(view), lever.y0 < LEVER_MID ? 1 / 1.6 : 1.6) });
  };
  const leverKey = (e: KeyboardEvent<SVGGElement>) => {
    const k = { ArrowUp: 1 / 1.6, ArrowRight: 1 / 1.6, ArrowDown: 1.6, ArrowLeft: 1.6 }[e.key];
    if (k) set({ ...cur, view: zoomView(view, centre(view), k) });
    else if (e.key === "Home") set({ ...cur, view: HOME });
    else return;
    e.preventDefault();
  };

  const slots = exprs.length < MAX_FNS && exprs[exprs.length - 1]?.trim() ? [...exprs, ""] : exprs;
  const names = Object.keys(params);
  const slH = Math.ceil(names.length / 2) * SL.h;
  return (
    <>
      <div className="live-fns">
        {slots.map((expr, i) => {
          const c = compiled[i];
          const spare = i >= exprs.length;
          const color = fns[i]?.color ?? PLOT_COLORS[i % PLOT_COLORS.length];
          return (
            <div key={i} className={`live-fn${spare ? " live-fn-spare" : ""}`}>
              <span style={{ color }}>y =</span>
              <input
                className={c && "error" in c ? "invalid" : undefined}
                value={expr}
                spellCheck={false}
                placeholder={spare ? g.add : undefined}
                aria-label={spare ? g.add : `y = ${expr}`}
                title={c && "error" in c ? c.error : g.clearTip}
                onChange={(e) => setDrafts(spare ? [...exprs, e.target.value] : exprs.map((x, j) => (j === i ? e.target.value : x)))}
                onBlur={() => drafts && commitFns(drafts)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
          );
        })}
      </div>
      <svg ref={plotRef} width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} fontFamily={FONT} className="live-plot hand-pic"
        style={{ touchAction: "none", userSelect: "none", cursor: press?.kind === "pan" && press.moved ? "grabbing" : "grab" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => (setPress(null), setPending(null))}
        onDoubleClick={() => set({ ...cur, view: HOME })}>
        <PlotBody view={view} fns={fns} compiled={compiled} scope={scope} point={point} tangent={cur.tangent} w={g} faded={press?.kind === "point" && press.off} />
        {point && (
          <circle cx={px(point.x)} cy={py(point.y)} r={14} fill="transparent" role="button" tabIndex={0} aria-label={g.point} style={{ cursor: "grab" }}
            onKeyDown={(e) => {
              const by = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
              if (by) {
                e.preventDefault();
                return set({ ...cur, traceX: roundTo(tx + (by * niceStep(xMax - xMin)) / 10, niceStep(xMax - xMin) / 20) });
              }
              if (e.key === "Delete" || e.key === "Backspace") return set({ ...cur, trace: false, tangent: false });
              keyTap(e, () => set({ ...cur, tangent: !cur.tangent }));
            }}>
            <title>{g.point}</title>
          </circle>
        )}
        <g role="slider" tabIndex={0} aria-label={g.zoom} aria-valuemin={-10} aria-valuemax={10} aria-valuenow={Math.round(-Math.log2((xMax - xMin) / 20) * 10) / 10}
          aria-valuetext={fill(g.zoomText, { a: fmt(roundTo(xMin, 0.01)), b: fmt(roundTo(xMax, 0.01)) })}
          style={{ cursor: "ns-resize" }} onPointerDown={leverDown} onPointerMove={leverMove} onPointerUp={leverUp} onPointerCancel={() => setLever(null)}
          onDoubleClick={(e) => e.stopPropagation()} onKeyDown={leverKey}>
          <title>{g.zoom}</title>
          <rect x={LEVER.x} y={LEVER.y} width={LEVER.w} height={LEVER.h} rx={LEVER.w / 2} fill="#fff" fillOpacity={0.9} stroke="#ced4da" />
          <text x={LEVER.x + LEVER.w / 2} y={LEVER.y + 17} fontSize={16} fontWeight={700} textAnchor="middle" fill="#868e96" pointerEvents="none">+</text>
          <text x={LEVER.x + LEVER.w / 2} y={LEVER.y + LEVER.h - 6} fontSize={16} fontWeight={700} textAnchor="middle" fill="#868e96" pointerEvents="none">−</text>
          <circle cx={LEVER.x + LEVER.w / 2} cy={LEVER_MID + (lever?.dy ?? 0)} r={9} fill={lever ? BLUE : "#fff"} stroke={BLUE} strokeWidth={2} pointerEvents="none" />
        </g>
      </svg>
      {names.length === 0 ? (
        <p className="live-hint">{g.noParams}</p>
      ) : (
        <svg className="hand-pic" width={PW} height={slH} viewBox={`0 0 ${PW} ${slH}`} fontFamily={FONT} style={{ touchAction: "none", userSelect: "none" }}>
          {names.map((name, i) => (
            <Slider key={name} x={(i % 2) * (SL.w + 8)} y={Math.floor(i / 2) * SL.h} name={name} p={params[name]} w={g} playing={playing === name}
              onPlay={() => setPlaying(playing === name ? null : name)} onStop={() => playing === name && setPlaying(null)}
              onChange={(q) => setParam(name, q)} onPut={(q) => putParam(name, q)} onDone={commit} />
          ))}
        </svg>
      )}
      <p className="live-hint">{g.hint}</p>
      <div hidden>
        <svg ref={svgRef} width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} fontFamily={FONT}>
          <PlotBody view={state.view} fns={fns} compiled={compiled} scope={scope} point={point} tangent={cur.tangent} w={g} />
        </svg>
      </div>
    </>
  );
}

/** One end of a slider's range: dragged left or right it is changed by `step`, as are the arrow keys. */
function Bound({ x, y, value, step, label, onSet, onDone }: {
  x: number; y: number; value: number; step: number; label: string; onSet: (v: number, now: boolean) => void; onDone: () => void;
}) {
  // The step stays as it was pressed: the range it changes changes the step too.
  const press = useRef<{ x0: number; v0: number; step: number; moved: boolean } | null>(null);
  const to = (v: number, by: number, now = false) => onSet(roundTo(Math.round(v / by) * by, by), now);
  return (
    <g role="slider" tabIndex={0} aria-label={label} aria-valuenow={value} style={{ cursor: "ew-resize" }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        capture(e.currentTarget, e.pointerId);
        press.current = { x0: pointIn(e)[0], v0: value, step, moved: false };
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (!p) return;
        const dx = pointIn(e)[0] - p.x0;
        if (!p.moved && Math.abs(dx) <= TAP) return;
        p.moved = true;
        to(p.v0 + Math.round(dx / 10) * p.step, p.step);
      }}
      onPointerUp={() => {
        if (press.current?.moved) onDone();
        press.current = null;
      }}
      onPointerCancel={() => (press.current = null)}
      onKeyDown={(e) => {
        const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
        if (!by) return;
        e.preventDefault();
        to(value + by * step, step, true);
      }}>
      <title>{label}</title>
      <rect x={x} y={y} width={SL.bound} height={24} rx={6} fill="#f8f9fa" stroke="#ced4da" />
      <text x={x + SL.bound / 2} y={y + 16} fontSize={12} textAnchor="middle" fill="#495057" pointerEvents="none">{fmt(value)}</text>
    </g>
  );
}

/** A letter's slider: its knob dragged along the track (or the track tapped where it should go), tapped to play. */
function Slider({ x, y, name, p, w, playing, onPlay, onStop, onChange, onPut, onDone }: {
  x: number;
  y: number;
  name: string;
  p: LiveParam;
  w: Words;
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  onChange: (p: LiveParam) => void;
  onPut: (p: LiveParam) => void;
  onDone: () => void;
}) {
  const step = stepFor(p);
  const t0 = x + SL.name + SL.bound + 14;
  const t1 = x + SL.w - SL.bound - 14;
  const kx = t0 + ((p.v - p.min) / (p.max - p.min)) * (t1 - t0);
  const ky = y + 16;
  const at = (sx: number) => roundTo(p.min + Math.max(0, Math.min(1, (sx - t0) / (t1 - t0))) * (p.max - p.min), step);
  const press = useRef<{ knob: boolean; x0: number; moved: boolean } | null>(null);
  const bstep = roundTo(step * 10, step);
  const bound = (which: "min" | "max", bx: number) => (
    <Bound x={bx} y={ky - 12} value={p[which]} step={bstep} label={fill(w.bound, { name, which: w[which] })} onDone={onDone}
      onSet={(v, now) => {
        const next = { ...p, [which]: v };
        if (next.max > next.min) (now ? onPut : onChange)({ ...next, v: Math.min(next.max, Math.max(next.min, p.v)) });
      }} />
  );
  return (
    <g>
      <text x={x + 4} y={ky + 5} fontSize={14} fontWeight={700} fill={INK} fontFamily="ui-monospace, Menlo, Consolas, monospace">{name} = {fmt(p.v)}</text>
      {bound("min", x + SL.name)}
      <g role="slider" tabIndex={0} aria-label={fill(w.knob, { name })} aria-valuemin={p.min} aria-valuemax={p.max} aria-valuenow={p.v}
        aria-valuetext={`${name} = ${fmt(p.v)}${playing ? " ▶" : ""}`} style={{ cursor: "pointer" }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          capture(e.currentTarget, e.pointerId);
          const sx = pointIn(e)[0];
          const knob = Math.abs(sx - kx) < 13;
          press.current = { knob, x0: sx, moved: false };
          if (!knob) {
            onStop();
            onChange({ ...p, v: at(sx) });
          }
        }}
        onPointerMove={(e) => {
          const pr = press.current;
          if (!pr) return;
          const sx = pointIn(e)[0];
          if (!pr.moved && Math.abs(sx - pr.x0) <= TAP) return;
          if (!pr.moved) onStop();
          pr.moved = true;
          onChange({ ...p, v: at(sx) });
        }}
        onPointerUp={() => {
          const pr = press.current;
          press.current = null;
          if (pr?.knob && !pr.moved) onPlay();
          else if (pr) onDone();
        }}
        onPointerCancel={() => (press.current = null)}
        onKeyDown={(e) => {
          const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
          if (by) {
            e.preventDefault();
            onStop();
            return onPut({ ...p, v: roundTo(Math.max(p.min, Math.min(p.max, p.v + by * step)), step) });
          }
          keyTap(e, onPlay);
        }}>
        <title>{fill(w.knob, { name })}</title>
        <rect x={t0 - 12} y={ky - 14} width={t1 - t0 + 24} height={28} fill="transparent" />
        <line x1={t0} x2={t1} y1={ky} y2={ky} stroke="#ced4da" strokeWidth={5} strokeLinecap="round" />
        <line x1={t0} x2={kx} y1={ky} y2={ky} stroke="#74c0fc" strokeWidth={5} strokeLinecap="round" />
        <circle cx={kx} cy={ky} r={11} fill={playing ? BLUE : "#fff"} stroke={BLUE} strokeWidth={2} />
        <text x={kx + (playing ? 0 : 1)} y={ky + 4} fontSize={10} textAnchor="middle" fill={playing ? "#fff" : BLUE} pointerEvents="none">{playing ? "❚❚" : "▶"}</text>
      </g>
      {bound("max", t1 + 14)}
    </g>
  );
}
