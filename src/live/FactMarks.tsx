// The facts of a round of a fact game, listed on its stage once the round is over: those right at once on the left (a
// quick one marked ⚡) and those still to learn on the right, each with its answer; a fact missed and then got right
// when it came back says so.
import { shown, type FactMark } from "../math/facts";
import { GREEN, MUTED, RED } from "./hand";

export function FactMarks({ marks, w, width, height }: { marks: FactMark[]; w: { rightCol: string; wrongCol: string; mended: string }; width: number; height: number }) {
  const cols = [marks.filter((m) => m.ok), marks.filter((m) => !m.ok)];
  const rowH = Math.min(28, (height - 76 - 50) / Math.max(1, ...cols.map((c) => c.length)));
  return (
    <g fontWeight={700}>
      {cols.map((col, k) => (
        <g key={k} fill={k ? RED : GREEN}>
          <text x={24 + k * (width / 2)} y={40} fontSize={24}>{`${k ? "✗" : "✓"} ${k ? w.wrongCol : w.rightCol}: ${col.length}`}</text>
          <line x1={24 + k * (width / 2)} x2={(k + 1) * (width / 2) - 16} y1={52} y2={52} stroke={k ? RED : GREEN} strokeWidth={2} opacity={0.4} />
          {col.map((m, i) => (
            <text key={m.text} x={24 + k * (width / 2)} y={76 + i * rowH + rowH * 0.4} fontSize={Math.min(20, rowH * 0.78)}>
              {`${shown(m.text, m.answer)}${m.quick ? "  ⚡" : ""}`}
              {m.mended && <tspan fontSize={14} fill={GREEN}>{`  · ${w.mended} ✓`}</tspan>}
            </text>
          ))}
          {!col.length && <text x={24 + k * (width / 2)} y={90} fontSize={20} fill={MUTED}>—</text>}
        </g>
      ))}
    </g>
  );
}
