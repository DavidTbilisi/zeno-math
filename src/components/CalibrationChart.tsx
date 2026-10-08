// Calibration: the questions grouped by the chance the model gave them when they appeared, each group a dot at (mean
// predicted chance, share answered right first time). Dots on the diagonal mean the predictions came true; above it,
// students did better than predicted. A dot's area grows with its number of answers, so a group of one doesn't look
// as sure as a group of a hundred. One series, so no legend: the heading says what is plotted. Each dot has a
// hover / focus readout, and the table view lists every group.
import type { Dashboard } from "../api";
import { fill } from "../math/text";
import { useChartTip } from "./ChartTip";

type Words = { predictedAxis: string; observedAxis: string; binTip: string };

const W = 340;
const H = 280;
const M = { left: 48, right: 14, top: 12, bottom: 44 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const x = (v: number) => M.left + v * PW;
const y = (v: number) => M.top + (1 - v) * PH;
const TICKS = [0, 0.25, 0.5, 0.75, 1];

export function CalibrationChart({ bins, words, pct }: { bins: Dashboard["calibration"]["bins"]; words: Words; pct: (x: number) => string }) {
  const { bind, view } = useChartTip();
  const shown = bins.filter((b) => b.n > 0);
  const most = Math.max(...shown.map((b) => b.n));
  // Area in proportion to answers: radius 4 (an 8px dot) for the smallest, up to 10 for the largest group.
  const radius = (n: number) => 4 + 6 * Math.sqrt(n / most);
  return (
    <div className="calib">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${words.predictedAxis} / ${words.observedAxis}`}>
        {TICKS.map((v) => (
          <g key={v}>
            <line className="viz-grid" x1={x(0)} x2={x(1)} y1={y(v)} y2={y(v)} />
            <line className="viz-grid" x1={x(v)} x2={x(v)} y1={y(0)} y2={y(1)} />
            <text className="viz-tick" x={M.left - 6} y={y(v)} dy="0.32em" textAnchor="end">{pct(v)}</text>
            <text className="viz-tick" x={x(v)} y={y(0) + 16} textAnchor="middle">{pct(v)}</text>
          </g>
        ))}
        <line className="viz-diagonal" x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} />
        <text className="viz-axis-label" x={M.left + PW / 2} y={H - 6} textAnchor="middle">{words.predictedAxis}</text>
        <text className="viz-axis-label" transform={`translate(12 ${M.top + PH / 2}) rotate(-90)`} textAnchor="middle">{words.observedAxis}</text>
        {shown.map((b) => {
          const tip = () => ({
            value: pct(b.observed),
            label: fill(words.binTip, { from: pct(b.from), to: pct(b.to), predicted: pct(b.predicted), observed: pct(b.observed), n: b.n }),
          });
          return (
            <g key={b.from} className="viz-point" tabIndex={0} role="img" aria-label={tip().label} {...bind(tip)}>
              <circle className="viz-hit" cx={x(b.predicted)} cy={y(b.observed)} r={Math.max(12, radius(b.n) + 4)} />
              <circle className="viz-dot" cx={x(b.predicted)} cy={y(b.observed)} r={radius(b.n)} />
            </g>
          );
        })}
      </svg>
      {view}
    </div>
  );
}
