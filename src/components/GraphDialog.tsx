import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { compileExpr, DEFAULT_PLOT, PLOT_COLORS, plotToSvg, type PlotSpec } from "../math/plot";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { ColorSwatches, Modal } from "./Modal";

function exprError(expr: string): string | null {
  if (!expr.trim()) return null;
  try {
    compileExpr(expr);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

const num = (s: string): number | null => (s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s));

export function GraphDialog({ initial, onSubmit, onClose }: {
  initial?: PlotSpec;
  onSubmit: (spec: PlotSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const start = initial ?? DEFAULT_PLOT;
  const [fns, setFns] = useState(start.functions);
  // Ranges are edited as text so partially typed values like "-" don't get clobbered.
  const [range, setRange] = useState({
    xMin: String(start.xMin),
    xMax: String(start.xMax),
    yMin: start.yMin === null ? "" : String(start.yMin),
    yMax: start.yMax === null ? "" : String(start.yMax),
  });
  const [grid, setGrid] = useState(start.grid);
  const [focusIdx, setFocusIdx] = useState(0);

  const errors = fns.map((f) => exprError(f.expr));
  const spec: PlotSpec = {
    functions: fns,
    xMin: num(range.xMin) ?? -10,
    xMax: num(range.xMax) ?? 10,
    yMin: num(range.yMin),
    yMax: num(range.yMax),
    grid,
  };

  const result = useMemo(() => {
    if (errors.some(Boolean)) return { error: t.invalidExpression };
    try {
      return { rendered: plotToSvg(spec) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [JSON.stringify(spec), t]);

  const updateFn = (i: number, patch: Partial<PlotSpec["functions"][number]>) =>
    setFns(fns.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const nextColor = PLOT_COLORS.find((c) => !fns.some((f) => f.color === c)) ?? PLOT_COLORS[fns.length % PLOT_COLORS.length];

  return (
    <Modal
      title={initial ? t.editGraph : t.graph}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{t.cancel}</button>
          <button
            className="btn primary"
            disabled={!result.rendered || !fns.some((f) => f.expr.trim())}
            onClick={() => result.rendered && onSubmit({ ...spec, functions: fns.filter((f) => f.expr.trim()) }, result.rendered)}
          >
            {initial ? t.update : t.insert}
          </button>
        </>
      }
    >
      <div className="field">
        <span>{t.functions}</span>
        {fns.map((f, i) => (
          <div key={i} className="fn-row">
            <span className="fn-prefix" style={{ color: f.color }}>y =</span>
            <input
              className={`mono${errors[i] ? " invalid" : ""}`}
              value={f.expr}
              spellCheck={false}
              autoFocus={i === focusIdx}
              placeholder="f(x)"
              title={errors[i] ?? ""}
              onChange={(e) => updateFn(i, { expr: e.target.value })}
            />
            <ColorSwatches value={f.color} colors={PLOT_COLORS} onChange={(color) => updateFn(i, { color })} />
            {fns.length > 1 && (
              <button className="icon-btn" aria-label={t.remove} title={t.remove} onClick={() => setFns(fns.filter((_, j) => j !== i))}>
                ×
              </button>
            )}
          </div>
        ))}
        {fns.length < 6 && (
          <button
            className="btn small add-fn"
            onClick={() => {
              setFocusIdx(fns.length);
              setFns([...fns, { expr: "", color: nextColor }]);
            }}
          >
            + {t.addFunction}
          </button>
        )}
        <small className="hint">{t.functionHint}</small>
      </div>

      <div className="range-grid">
        <label>
          <span>{t.xRange}</span>
          <div>
            <input type="text" inputMode="decimal" value={range.xMin} onChange={(e) => setRange({ ...range, xMin: e.target.value })} />
            <span>…</span>
            <input type="text" inputMode="decimal" value={range.xMax} onChange={(e) => setRange({ ...range, xMax: e.target.value })} />
          </div>
        </label>
        <label>
          <span>{t.yRange}</span>
          <div>
            <input type="text" inputMode="decimal" placeholder={t.auto} value={range.yMin} onChange={(e) => setRange({ ...range, yMin: e.target.value })} />
            <span>…</span>
            <input type="text" inputMode="decimal" placeholder={t.auto} value={range.yMax} onChange={(e) => setRange({ ...range, yMax: e.target.value })} />
          </div>
        </label>
        <label className="check">
          <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />
          <span>{t.showGrid}</span>
        </label>
      </div>

      <div className="field">
        <span>{t.preview}</span>
        <div className="preview">
          {result.rendered ? (
            <img src={svgToDataUrl(result.rendered.svg)} alt="" style={{ maxWidth: "100%" }} />
          ) : (
            <span className="error">{result.error}</span>
          )}
        </div>
      </div>
    </Modal>
  );
}
