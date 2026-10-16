// The answer to a question asked with a shape: a dot grid to make it on. The answer is still text (its corners,
// "poly:1,1;5,1;5,4"), so it is checked, logged and marked again on the server like a typed one.
import { useRef } from "react";
import { decodePoly, encodePoly, type GeoPlay } from "../math/geoPlay";
import { GeoGrid } from "../live/GeoGrid";

export function GeoAnswer({ play, value, onChange, disabled, label, tone }: {
  play: GeoPlay;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  tone?: "right" | "wrong" | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  return (
    <div className="geo-answer">
      <GeoGrid
        cols={play.cols}
        rows={play.rows}
        pts={decodePoly(value) ?? []}
        onChange={(pts) => onChange(pts.length ? encodePoly(pts) : "")}
        svgRef={svgRef}
        cell={36}
        label={label}
        disabled={disabled}
        tone={tone}
      />
    </div>
  );
}
