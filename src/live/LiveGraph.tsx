// The live graph: functions typed on the board, every letter in them a slider (y = a·x² + b·x + c gets a, b and c),
// with a point to slide along the first curve and its tangent. Scroll zooms and dragging moves the view. What's
// mid-way (a slider being dragged, a function being typed, a view being moved) stays here until it's let go, so
// each change is one step to undo.
import { useEffect, useMemo, useRef, useState } from "react";
import type { LiveGraphState, LiveParam } from "../math/live";
import { compileWith, roundTo, sample, slope, stepFor, syncParams, zoomView } from "../math/liveGraph";
import { niceStep, PLOT_COLORS } from "../math/plot";
import { FONT, INK, svgPoint, Toggle, type PieceProps } from "./ui";

const PW = 620;
const PH = 330;
const MAX_FNS = 3;
const fmt = (v: number) => {
  const r = Math.round(v * 1e6) / 1e6;
  return Math.abs(r) >= 1e4 || (Math.abs(r) < 1e-3 && r !== 0) ? r.toExponential(1) : String(r);
};

export function LiveGraph({ state, set, w, svgRef }: PieceProps<"graph">) {
  const g = w.graph;
  // Changes not yet handed to the board.
  const [pending, setPending] = useState<Partial<LiveGraphState> | null>(null);
  const [drafts, setDrafts] = useState<string[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
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
  const compiled = useMemo(() => exprs.map((e) => (e.trim() ? compileWith(e) : null)), [exprs.join("\n")]);
  const { xMin, xMax, yMin, yMax } = cur.view;
  const px = (x: number) => ((x - xMin) / (xMax - xMin)) * PW;
  const py = (y: number) => ((yMax - y) / (yMax - yMin)) * PH;

  const commitFns = (next: string[]) => {
    const nextFns = next.map((expr, i) => ({ expr, color: cur.fns[i]?.color ?? PLOT_COLORS[i % PLOT_COLORS.length] }));
    setDrafts(null);
    setPending(null);
    set({ ...cur, fns: nextFns, params: syncParams({ ...cur, fns: nextFns }) });
  };
  const setParam = (name: string, p: LiveParam) => setPending((prev) => ({ ...prev, params: { ...params, ...prev?.params, [name]: p } }));

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
    // Restarts only when another letter starts playing.
  }, [playing]);

  // Scrolling zooms about the pointer (and isn't passed on, or the board would zoom too).
  const zoomTimer = useRef(0);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const [sx, sy] = svgPoint(svg, e);
      const { view } = latest.current.cur;
      const at: [number, number] = [view.xMin + (sx / PW) * (view.xMax - view.xMin), view.yMax - (sy / PH) * (view.yMax - view.yMin)];
      setPending((prev) => ({ ...prev, view: zoomView(view, at, Math.exp(e.deltaY * 0.0015)) }));
      window.clearTimeout(zoomTimer.current);
      zoomTimer.current = window.setTimeout(commit, 400);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const drag = useRef<{ kind: "pan"; from: [number, number]; view: LiveGraphState["view"] } | { kind: "trace" } | null>(null);
  const toUnits = (e: React.PointerEvent): [number, number] => {
    const [sx, sy] = svgPoint(svgRef.current!, e);
    return [xMin + (sx / PW) * (xMax - xMin), yMax - (sy / PH) * (yMax - yMin)];
  };

  const f0 = compiled[0] && "f" in compiled[0] ? compiled[0].f : null;
  const trace = cur.trace || cur.tangent;
  const tx = cur.traceX;
  const ty = f0 ? f0(tx, scope) : NaN;
  const m = f0 && Number.isFinite(ty) ? slope((x) => f0(x, scope), tx) : NaN;

  // Grid lines and labels.
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
      <div className="live-fns">
        {fns.map((f, i) => {
          const c = compiled[i];
          return (
            <div key={i} className="live-fn">
              <span style={{ color: f.color }}>y =</span>
              <input
                className={c && "error" in c ? "invalid" : undefined}
                value={f.expr}
                spellCheck={false}
                title={c && "error" in c ? c.error : ""}
                onChange={(e) => setDrafts(exprs.map((x, j) => (j === i ? e.target.value : x)))}
                onBlur={() => drafts && commitFns(drafts)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
              {fns.length > 1 && (
                <button className="live-btn" title={g.remove} aria-label={g.remove} onClick={() => commitFns(exprs.filter((_, j) => j !== i))}>×</button>
              )}
            </div>
          );
        })}
        {fns.length < MAX_FNS && (
          <button className="live-btn" onClick={() => commitFns([...exprs, ""])}>+ {g.add}</button>
        )}
      </div>
      <svg
        ref={svgRef}
        width={PW}
        height={PH}
        viewBox={`0 0 ${PW} ${PH}`}
        fontFamily={FONT}
        className="live-plot"
        onPointerDown={(e) => {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          const [sx, sy] = svgPoint(svgRef.current!, e);
          const nearPoint = trace && Number.isFinite(ty) && Math.hypot(sx - px(tx), sy - py(ty)) < 16;
          drag.current = nearPoint ? { kind: "trace" } : { kind: "pan", from: toUnits(e), view: cur.view };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (d.kind === "trace") return setPending((prev) => ({ ...prev, traceX: roundTo(toUnits(e)[0], niceStep(xMax - xMin) / 100) }));
          const [sx, sy] = svgPoint(svgRef.current!, e);
          const v = d.view;
          const at: [number, number] = [v.xMin + (sx / PW) * (v.xMax - v.xMin), v.yMax - (sy / PH) * (v.yMax - v.yMin)];
          const [dx, dy] = [d.from[0] - at[0], d.from[1] - at[1]];
          setPending((prev) => ({ ...prev, view: { xMin: v.xMin + dx, xMax: v.xMax + dx, yMin: v.yMin + dy, yMax: v.yMax + dy } }));
        }}
        onPointerUp={() => {
          if (drag.current) commit();
          drag.current = null;
        }}
      >
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
        {cur.tangent && Number.isFinite(m) && (
          <line x1={0} x2={PW} y1={py(ty + m * (xMin - tx))} y2={py(ty + m * (xMax - tx))} stroke="#e8590c" strokeWidth={2} strokeDasharray="7 5" />
        )}
        {trace && Number.isFinite(ty) && (
          <g>
            <circle cx={px(tx)} cy={py(ty)} r={7} fill={fns[0].color} stroke="#fff" strokeWidth={2} style={{ cursor: "grab" }} />
            <text x={px(tx) + 10} y={py(ty) - 10} fontSize={14} fill={INK} stroke="#fff" strokeWidth={4} paintOrder="stroke">
              ({fmt(roundTo(tx, 0.01))}, {fmt(roundTo(ty, 0.01))}){cur.tangent && Number.isFinite(m) ? `  ${g.slope} = ${fmt(roundTo(m, 0.01))}` : ""}
            </text>
          </g>
        )}
      </svg>
      <div className="live-bar">
        <Toggle on={cur.trace} onClick={() => set({ ...cur, trace: !cur.trace })}>{g.trace}</Toggle>
        <Toggle on={cur.tangent} onClick={() => set({ ...cur, tangent: !cur.tangent })}>{g.tangent}</Toggle>
        <button className="live-btn" onClick={() => set({ ...cur, view: { xMin: -10, xMax: 10, yMin: -5.5, yMax: 5.5 } })}>{g.resetView}</button>
        <span className="live-note">{g.zoomHint}</span>
      </div>
      <div className="live-sliders">
        {Object.keys(params).length === 0 && <p className="live-hint">{g.noParams}</p>}
        {Object.entries(params).map(([name, p]) => (
          <Slider key={name} name={name} p={p} w={g} playing={playing === name} onPlay={() => setPlaying(playing === name ? null : name)} onChange={(q) => setParam(name, q)} onDone={commit} />
        ))}
      </div>
    </>
  );
}

function Slider({ name, p, w, playing, onPlay, onChange, onDone }: {
  name: string;
  p: LiveParam;
  w: PieceProps<"graph">["w"]["graph"];
  playing: boolean;
  onPlay: () => void;
  onChange: (p: LiveParam) => void;
  onDone: () => void;
}) {
  const step = stepFor(p);
  const bound = (which: "min" | "max") => (
    <input
      className="live-bound"
      key={`${which}${p[which]}`}
      defaultValue={p[which]}
      aria-label={`${name} ${w[which]}`}
      title={w[which]}
      onBlur={(e) => {
        const v = Number(e.target.value);
        const next = { ...p, [which]: v };
        if (!Number.isFinite(v) || !(next.max > next.min)) return void (e.target.value = String(p[which]));
        onChange({ ...next, v: Math.min(next.max, Math.max(next.min, p.v)) });
        onDone();
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
  return (
    <div className="live-slider">
      <b>{name} = {fmt(p.v)}</b>
      {bound("min")}
      <input
        type="range"
        min={p.min}
        max={p.max}
        step={step}
        value={p.v}
        aria-label={name}
        onChange={(e) => onChange({ ...p, v: roundTo(Number(e.target.value), step) })}
        onPointerUp={onDone}
        onKeyUp={onDone}
      />
      {bound("max")}
      <button className="live-btn" title={playing ? w.pause : w.play} aria-label={playing ? w.pause : w.play} onClick={onPlay}>{playing ? "⏸" : "▶"}</button>
    </div>
  );
}
