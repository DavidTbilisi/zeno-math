// The hover / focus readout shared by the dashboard's charts: the value leads, what it is follows. Text only (never
// HTML), placed beside the pointer or the focused mark and kept inside the window.
import { useState, type FocusEvent, type PointerEvent } from "react";

export type Tip = { value: string; label: string; detail?: string; x: number; y: number };

export function useChartTip() {
  const [tip, setTip] = useState<Tip | null>(null);
  /** Handlers for one mark: pointer and keyboard focus show the same readout. */
  const bind = (content: () => Omit<Tip, "x" | "y">) => ({
    onPointerEnter: (e: PointerEvent) => setTip({ ...content(), x: e.clientX, y: e.clientY }),
    onPointerMove: (e: PointerEvent) => setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t)),
    onPointerLeave: () => setTip(null),
    onFocus: (e: FocusEvent<Element>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTip({ ...content(), x: r.right, y: r.top });
    },
    onBlur: () => setTip(null),
  });
  const view = tip && (
    <div
      className="chart-tip"
      role="status"
      style={{
        left: Math.min(tip.x + 14, window.innerWidth - 260),
        top: tip.y + 14 > window.innerHeight - 90 ? tip.y - 84 : tip.y + 14,
      }}
    >
      <strong>{tip.value}</strong>
      <span>{tip.label}</span>
      {tip.detail && <span className="muted">{tip.detail}</span>}
    </div>
  );
  return { bind, view };
}
