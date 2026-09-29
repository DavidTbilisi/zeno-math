// Interactive plane geometry: drag the points, everything is measured live.
import { useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { RenderedSvg } from "../math/latex";
import {
  DEFAULT_GEOMETRY,
  fitsPlane,
  fromPx,
  GEO_PRESETS,
  GEO_SHAPES,
  measure,
  PLANE,
  PLANE_PX,
  planeSvg,
  POINT_NAMES,
  renderGeometry,
  toPx,
  type GeometrySpec,
  type Pt,
} from "../math/geometry";
import { Modal } from "./Modal";

export function GeometryDialog({ initial, onSubmit, onClose }: {
  initial?: GeometrySpec;
  onSubmit: (spec: GeometrySpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [spec, setSpec] = useState<GeometrySpec>(initial ?? DEFAULT_GEOMETRY);
  const [active, setActive] = useState<number | null>(null);
  const overlay = useRef<SVGSVGElement>(null);
  const latest = useRef(spec);
  latest.current = spec;

  const m = useMemo(() => measure(spec), [spec]);
  const caption = m.classes.map((c) => t.geoClass[c]).join(" · ");

  const set = (patch: Partial<GeometrySpec>) => setSpec((s) => ({ ...s, ...patch }));

  /** Moves point i to `to`, keeping the Pythagoras triangle right-angled at C. */
  const movePoint = (s: GeometrySpec, i: number, to: Pt): Pt[] => {
    const pts = s.pts.map((p) => [...p] as Pt);
    if (s.shape !== "pythagoras") {
      pts[i] = to;
      return pts;
    }
    const [C, A, B] = pts;
    if (i === 0) {
      const d: Pt = [to[0] - C[0], to[1] - C[1]];
      return pts.map((p) => [p[0] + d[0], p[1] + d[1]] as Pt); // drag C = move the whole triangle
    }
    if (i === 1) return [C, [Math.abs(to[0] - C[0]) < 0.5 ? A[0] : to[0], C[1]], B]; // A slides along C's row
    return [C, A, [C[0], Math.abs(to[1] - C[1]) < 0.5 ? B[1] : to[1]]]; // B slides along C's column
  };

  // Window listeners attach synchronously on pointerdown so fast drags/taps are never lost.
  const startDrag = (i: number) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setActive(i);
    const move = (ev: PointerEvent) => {
      const svg = overlay.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return;
      const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
      let [x, y] = fromPx(p.x, p.y);
      const s = latest.current;
      const step = s.snap ? 1 : 0.1;
      x = Math.min(PLANE.w, Math.max(0, Math.round(x / step) * step));
      y = Math.min(PLANE.h, Math.max(0, Math.round(y / step) * step));
      x = Math.round(x * 10) / 10;
      y = Math.round(y * 10) / 10;
      const pts = movePoint(s, i, [x, y]);
      // Skip moves that would push a Pythagoras square off the plane (it would be cut off).
      if (!fitsPlane(s.shape, pts)) return;
      if (pts.some((q, j) => q[0] !== s.pts[j][0] || q[1] !== s.pts[j][1])) setSpec({ ...s, pts });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setActive(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const shapeLabel = t.geoShapes;
  const presets = GEO_PRESETS.filter((p) => p.spec.shape === spec.shape);
  const names = POINT_NAMES[spec.shape];

  return (
    <Modal
      title={initial ? t.editGeometry : t.geometry}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{t.cancel}</button>
          <button className="btn primary" onClick={() => onSubmit({ ...spec, caption }, renderGeometry({ ...spec, caption }))}>
            {initial ? t.update : t.insert}
          </button>
        </>
      }
    >
      <div className="segmented wrap" role="radiogroup">
        {GEO_SHAPES.map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={spec.shape === s}
            className={spec.shape === s ? "active" : ""}
            onClick={() => s !== spec.shape && setSpec({ ...GEO_PRESETS.find((p) => p.spec.shape === s)!.spec, lengths: spec.lengths, angles: spec.angles, area: spec.area, grid: spec.grid, snap: spec.snap })}
          >
            {shapeLabel[s]}
          </button>
        ))}
      </div>
      {presets.length > 1 && (
        <div className="snippets">
          {presets.map((p) => (
            <button key={p.key} className="chip text" onClick={() => set({ pts: p.spec.pts.map((q) => [...q] as Pt) })}>
              {t.geoPresets[p.key as keyof typeof t.geoPresets]}
            </button>
          ))}
        </div>
      )}

      <div className="geo-plane" style={{ aspectRatio: `${PLANE_PX.w} / ${PLANE_PX.h}` }}>
        <svg viewBox={`0 0 ${PLANE_PX.w} ${PLANE_PX.h}`} dangerouslySetInnerHTML={{ __html: planeSvg(spec) }} />
        <svg ref={overlay} className="geo-overlay" viewBox={`0 0 ${PLANE_PX.w} ${PLANE_PX.h}`}>
          {spec.pts.map((p, i) => {
            const [x, y] = toPx(p);
            return (
              <g key={i} className={`geo-handle${active === i ? " active" : ""}`} onPointerDown={startDrag(i)}>
                <circle cx={x} cy={y} r={16} fill="transparent" />
                <circle cx={x} cy={y} r={9} />
                <title>{`${names[i]} (${p[0]}, ${p[1]})`}</title>
              </g>
            );
          })}
        </svg>
      </div>
      <small className="hint">{t.geoDragHint[spec.shape]}</small>

      <div className="geo-readout">
        {caption && <div className="geo-class">{caption}</div>}
        {(spec.area || spec.shape !== "triangle" ? m.lines : m.lines.slice(0, 2)).map((l) => (
          <div key={l}>{l}</div>
        ))}
        <div className="geo-coords">{spec.pts.map((p, i) => `${names[i]}(${p[0]}, ${p[1]})`).join("   ")}</div>
      </div>

      <div className="range-grid">
        {spec.shape !== "circle" && spec.shape !== "pythagoras" && (
          <label className="check">
            <input type="checkbox" checked={spec.angles} onChange={(e) => set({ angles: e.target.checked })} />
            <span>{t.geoAngles}</span>
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={spec.lengths} onChange={(e) => set({ lengths: e.target.checked })} />
          <span>{t.geoLengths}</span>
        </label>
        {spec.shape === "triangle" && (
          <label className="check">
            <input type="checkbox" checked={spec.area} onChange={(e) => set({ area: e.target.checked })} />
            <span>{t.geoHeight}</span>
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={spec.grid} onChange={(e) => set({ grid: e.target.checked })} />
          <span>{t.showGrid}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={spec.snap} onChange={(e) => set({ snap: e.target.checked })} />
          <span>{t.geoSnap}</span>
        </label>
      </div>
    </Modal>
  );
}
