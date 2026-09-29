// Interactive plane geometry: drag the points, everything is measured live.
import { useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { RenderedSvg } from "../math/latex";
import {
  armAt,
  DEFAULT_GEOMETRY,
  fitsPlane,
  fromPx,
  GEO_PRESETS,
  GEO_SHAPES,
  measure,
  PLANE,
  PLANE_PX,
  planeSvg,
  pointNames,
  renderGeometry,
  toPx,
  type GeometrySpec,
  type Pt,
} from "../math/geometry";
import { Modal } from "./Modal";

const same = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
const shift = (pts: Pt[], d: Pt) => pts.map((p) => [p[0] + d[0], p[1] + d[1]] as Pt);

/** Moves point i to `to`, applying each shape's constraints. Returns null to reject the move. */
function movePoint(s: GeometrySpec, i: number, to: Pt): Pt[] | null {
  const pts = s.pts.map((p) => [...p] as Pt);
  const d: Pt = [to[0] - pts[0][0], to[1] - pts[0][1]];
  switch (s.shape) {
    case "pythagoras": {
      const [C, A, B] = pts;
      if (i === 0) return shift(pts, d); // drag C = move the whole triangle
      if (i === 1) return [C, [Math.abs(to[0] - C[0]) < 0.5 ? A[0] : to[0], C[1]], B]; // A slides along C's row
      return [C, A, [C[0], Math.abs(to[1] - C[1]) < 0.5 ? B[1] : to[1]]]; // B slides along C's column
    }
    case "protractor": {
      if (i === 0) return shift(pts, d); // move the whole protractor
      // Arms keep their length; the direction snaps to 1° (or 5° with snap on).
      const step = s.snap ? 5 : 1;
      const dirDeg = (Math.atan2(to[1] - pts[0][1], to[0] - pts[0][0]) * 180) / Math.PI;
      pts[i] = armAt(pts[0], Math.round(dirDeg / step) * step);
      return pts;
    }
    case "angles": {
      if (i === 0 && s.mode !== "parallel") return shift(pts, d); // the vertex carries its rays
      pts[i] = to;
      if (s.mode === "parallel") return Math.abs(pts[0][1] - pts[1][1]) < 0.5 ? null : pts; // the lines must stay apart
      return pts.slice(1).some((r) => same(r, pts[0])) ? null : pts;
    }
    default:
      pts[i] = to;
      return pts;
  }
}

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

  // The spec as drawn: fact names follow the UI language.
  const view: GeometrySpec = { ...spec, factNames: [t.factCorresponding, t.factAlternate, t.factCoInterior] };
  const m = useMemo(() => measure(view), [spec, t]);
  const caption = m.classes.map((c) => t.geoClass[c]).join(" · ");

  const set = (patch: Partial<GeometrySpec>) => setSpec((s) => ({ ...s, ...patch }));

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
      const step = s.snap && s.shape !== "protractor" ? 1 : 0.1;
      x = Math.round(Math.min(PLANE.w, Math.max(0, Math.round(x / step) * step)) * 10) / 10;
      y = Math.round(Math.min(PLANE.h, Math.max(0, Math.round(y / step) * step)) * 10) / 10;
      const pts = movePoint(s, i, [x, y]);
      // Skip rejected moves and ones that would push part of the figure off the plane.
      if (!pts || !fitsPlane(s.shape, pts)) return;
      if (pts.some((q, j) => !same(q, s.pts[j]))) setSpec({ ...s, pts });
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

  const presets = GEO_PRESETS.filter((p) => p.spec.shape === spec.shape);
  const names = pointNames(spec);
  const presetActive = (p: GeometrySpec) => spec.shape === "angles" && p.mode === spec.mode;
  const hint = spec.shape === "angles" ? t.angleHints[spec.mode ?? "line"] : t.geoDragHint[spec.shape];
  const plainShape = spec.shape === "triangle" || spec.shape === "quad";

  return (
    <Modal
      title={initial ? t.editGeometry : t.geometry}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{t.cancel}</button>
          <button className="btn primary" onClick={() => onSubmit({ ...view, caption }, renderGeometry({ ...view, caption }))}>
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
            onClick={() =>
              s !== spec.shape &&
              setSpec({ ...GEO_PRESETS.find((p) => p.spec.shape === s)!.spec, lengths: spec.lengths, angles: spec.angles, area: spec.area, grid: spec.grid, snap: spec.snap })
            }
          >
            {t.geoShapes[s]}
          </button>
        ))}
      </div>
      {presets.length > 1 && (
        <div className="snippets">
          {presets.map((p) => (
            <button
              key={p.key}
              className={`chip text${presetActive(p.spec) ? " selected" : ""}`}
              onClick={() => set({ pts: p.spec.pts.map((q) => [...q] as Pt), mode: p.spec.mode })}
            >
              {t.geoPresets[p.key as keyof typeof t.geoPresets]}
            </button>
          ))}
        </div>
      )}

      <div className="geo-plane" style={{ aspectRatio: `${PLANE_PX.w} / ${PLANE_PX.h}` }}>
        <svg viewBox={`0 0 ${PLANE_PX.w} ${PLANE_PX.h}`} dangerouslySetInnerHTML={{ __html: planeSvg(view) }} />
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
      <small className="hint">{hint}</small>

      <div className="geo-readout">
        {caption && <div className="geo-class">{caption}</div>}
        {(spec.area || spec.shape !== "triangle" ? m.lines : m.lines.slice(0, 2)).map((l) => (
          <div key={l}>{l}</div>
        ))}
        {spec.shape !== "protractor" && <div className="geo-coords">{spec.pts.map((p, i) => `${names[i]}(${p[0]}, ${p[1]})`).join("   ")}</div>}
      </div>

      <div className="range-grid">
        {plainShape && (
          <label className="check">
            <input type="checkbox" checked={spec.angles} onChange={(e) => set({ angles: e.target.checked })} />
            <span>{t.geoAngles}</span>
          </label>
        )}
        {(plainShape || spec.shape === "circle" || spec.shape === "pythagoras") && (
          <label className="check">
            <input type="checkbox" checked={spec.lengths} onChange={(e) => set({ lengths: e.target.checked })} />
            <span>{t.geoLengths}</span>
          </label>
        )}
        {spec.shape === "triangle" && (
          <label className="check">
            <input type="checkbox" checked={spec.area} onChange={(e) => set({ area: e.target.checked })} />
            <span>{t.geoHeight}</span>
          </label>
        )}
        {spec.shape === "protractor" && (
          <label className="check">
            <input type="checkbox" checked={!!spec.hide} onChange={(e) => set({ hide: e.target.checked })} />
            <span>{t.hideAnswer}</span>
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={spec.grid} onChange={(e) => set({ grid: e.target.checked })} />
          <span>{t.showGrid}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={spec.snap} onChange={(e) => set({ snap: e.target.checked })} />
          <span>{spec.shape === "protractor" ? t.snap5 : t.geoSnap}</span>
        </label>
      </div>
    </Modal>
  );
}
