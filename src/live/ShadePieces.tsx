// The pieces of a shape to shade, each a button: tapping one shades or unshades it. Shared by the shading game on the
// board and the practice question answered by shading.
import { SHADE, type PieceShape } from "../math/shadeFrac";

export function ShadePieces({ pieces, shaded, onTap, disabled, tone }: { pieces: PieceShape[]; shaded: number[]; onTap: (k: number) => void; disabled?: boolean; tone?: "right" | null }) {
  const on = new Set(shaded);
  return (
    <>
      {pieces.map((s, k) => {
        const props = {
          fill: on.has(k) ? (tone === "right" ? "#69db7c" : SHADE) : "#ffffff",
          stroke: "#1e1e1e",
          strokeWidth: 2,
          role: "button",
          "aria-pressed": on.has(k),
          "aria-label": String(k + 1),
          className: "shade-piece",
          style: { cursor: disabled ? "default" : "pointer" },
          onClick: () => onTap(k),
        };
        if (s.kind === "rect") return <rect key={k} x={s.x} y={s.y} width={s.w} height={s.h} {...props} />;
        if (s.kind === "dot") return <circle key={k} cx={s.cx} cy={s.cy} r={s.r} {...props} />;
        return <path key={k} d={s.d} {...props} />;
      })}
    </>
  );
}
