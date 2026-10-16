// A dot grid to make a shape on, shared by the geoboard on the board and the practice questions answered with a
// shape. Tapping a dot puts a corner there (the shape closes itself from the last corner back to the first); a corner
// can be dragged to another dot, or tapped to take it off. The parent holds the corners: a drag is drawn here as it
// goes and handed over when it is let go.
import { useState, type RefObject } from "react";
import { areaText, gridSides, measurePoly, moveCorner, shapeProblem, snapPt, tapDot, type GeoPt } from "../math/geoPlay";
import { play } from "./juice";
import { FONT, INK, svgPoint } from "./ui";

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const RED = "#e03131";
const PAD = 28;

export type GeoGridProps = {
  cols: number;
  rows: number;
  pts: GeoPt[];
  onChange: (pts: GeoPt[]) => void;
  svgRef: RefObject<SVGSVGElement | null>;
  /** Size of a square in pixels. */
  cell: number;
  /** The readouts under the grid ("Area 12"), and the length of each side along the grid lines. */
  readouts?: { area?: string; perim?: string };
  tone?: "right" | "wrong" | null;
  label: string;
  disabled?: boolean;
};

export function GeoGrid({ cols, rows, pts: given, onChange, svgRef, cell, readouts, tone, label, disabled }: GeoGridProps) {
  const [drag, setDrag] = useState<{ i: number; p: GeoPt; moved: boolean } | null>(null);
  const pts = drag ? moveCorner(given, drag.i, drag.p) : given;
  const X = (v: number) => PAD + v * cell;
  const W = 2 * PAD + cols * cell;
  const H = 2 * PAD + rows * cell + (readouts ? 36 : 0);
  const problem = pts.length >= 3 ? shapeProblem(pts, cols, rows) : null;
  const m = pts.length >= 3 && !problem ? measurePoly(pts) : null;
  const color = tone === "right" ? GREEN : tone === "wrong" || problem === "crossing" ? RED : BLUE;

  const dotAt = (e: { clientX: number; clientY: number }): GeoPt => {
    const [x, y] = svgPoint(svgRef.current!, e);
    return snapPt([(x - PAD) / cell, (y - PAD) / cell], cols, rows);
  };
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled || !svgRef.current || e.button > 0) return;
    const p = dotAt(e);
    const i = given.findIndex((q) => q[0] === p[0] && q[1] === p[1]);
    if (i < 0) {
      play("snap");
      onChange(tapDot(given, p));
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ i, p, moved: false });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag || !svgRef.current) return;
    const p = dotAt(e);
    if (p[0] === drag.p[0] && p[1] === drag.p[1]) return;
    if (!given.some((q, j) => j !== drag.i && q[0] === p[0] && q[1] === p[1])) play("snap");
    setDrag({ ...drag, p, moved: true });
  };
  const up = () => {
    if (!drag) return;
    const back = drag.p[0] === given[drag.i][0] && drag.p[1] === given[drag.i][1];
    // Let go where it started: a tap on the corner, which takes it off.
    onChange(drag.moved && !back ? moveCorner(given, drag.i, drag.p) : tapDot(given, given[drag.i]));
    setDrag(null);
  };

  // Each side along a grid line, labelled with its length outside the shape.
  const sideLabels = () =>
    m && readouts?.perim
      ? gridSides(pts).map(({ at: [x, y], out: [ox, oy], len }, i) => (
          <text key={i} x={X(x) + 14 * ox} y={X(y) + 14 * oy + 5} fontSize={15} fontWeight={700} textAnchor="middle" fill={color} stroke="#fff" strokeWidth={4} paintOrder="stroke">
            {len}
          </text>
        ))
      : null;

  const said = m && readouts
    ? [readouts.area && `${readouts.area} ${areaText(m.area2)}`, readouts.perim && `${readouts.perim} ${m.perim ?? `≈ ${(Math.round(m.around * 100) / 100).toString()}`}`].filter(Boolean).join("   ·   ")
    : "";
  return (
    <svg
      ref={svgRef}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      fontFamily={FONT}
      role="img"
      aria-label={label}
      className="geo-grid"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => setDrag(null)}
      style={{ cursor: disabled ? "default" : drag ? "grabbing" : "pointer", touchAction: "none" }}
    >
      <rect width={W} height={H} fill="#fff" />
      {Array.from({ length: cols + 1 }, (_, x) => <line key={`v${x}`} x1={X(x)} y1={X(0)} x2={X(x)} y2={X(rows)} stroke="#f1f3f5" />)}
      {Array.from({ length: rows + 1 }, (_, y) => <line key={`h${y}`} x1={X(0)} y1={X(y)} x2={X(cols)} y2={X(y)} stroke="#f1f3f5" />)}
      {Array.from({ length: (cols + 1) * (rows + 1) }, (_, k) => (
        <circle key={k} cx={X(k % (cols + 1))} cy={X(Math.floor(k / (cols + 1)))} r={3} fill="#adb5bd" />
      ))}
      {pts.length >= 3 ? (
        <polygon
          className={tone === "right" ? "geo-done" : undefined}
          points={pts.map(([x, y]) => `${X(x)},${X(y)}`).join(" ")}
          fill={color}
          fillOpacity={0.18}
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeDasharray={problem ? "8 6" : undefined}
        />
      ) : (
        pts.length === 2 && <line x1={X(pts[0][0])} y1={X(pts[0][1])} x2={X(pts[1][0])} y2={X(pts[1][1])} stroke={color} strokeWidth={3} />
      )}
      {sideLabels()}
      {pts.map(([x, y], i) => (
        <g key={i}>
          {i === 0 && pts.length > 1 && <circle cx={X(x)} cy={X(y)} r={11} fill="none" stroke={color} strokeWidth={2} />}
          <circle cx={X(x)} cy={X(y)} r={drag?.i === i ? 9 : 7} fill={color} style={{ cursor: disabled ? "default" : "grab" }} />
        </g>
      ))}
      {said && (
        <text x={W / 2} y={H - 14} fontSize={20} fontWeight={700} textAnchor="middle" fill={INK}>
          {said}
        </text>
      )}
    </svg>
  );
}
