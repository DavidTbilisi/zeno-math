import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { FIRST_KINDS, ODE_PRESETS, ODE_TOPICS, renderOde, type OdeSpec, type OdeSpecOf, type OdeTopic } from "../math/ode";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Slider } from "./AnalysisDialog";
import { Modal } from "./Modal";

type Specs = { [K in OdeTopic]: OdeSpecOf<K> };

const FIRST_LABELS = { growth: "y′ = ky", affine: "y′ = k(y − A)", logistic: "y′ = ry(1 − y/K)", linear: "y′ + py = b·eᶜᵗ" };

export function OdeDialog({ initial, onSubmit, onClose }: {
  initial?: OdeSpec;
  onSubmit: (spec: OdeSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [topic, setTopic] = useState<OdeTopic>(initial?.topic ?? "field");
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(ODE_TOPICS.map((k) => [k, ODE_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<OdeSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderOde(spec, t.odeWords) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, t]);

  const text = (label: string, key: string, width = 70, placeholder = "") => (
    <label>
      <span>{label}</span>
      <input
        type="text"
        className="mono"
        style={{ width }}
        spellCheck={false}
        placeholder={placeholder}
        value={(spec as Record<string, unknown>)[key] as string}
        onChange={(e) => set({ [key]: e.target.value } as Partial<OdeSpec>)}
      />
    </label>
  );
  const range = (label: string, lo: string, hi: string) => (
    <label>
      <span>{label}</span>
      <div>
        <input type="text" className="mono" value={(spec as Record<string, unknown>)[lo] as string} onChange={(e) => set({ [lo]: e.target.value } as Partial<OdeSpec>)} />
        <span>…</span>
        <input type="text" className="mono" value={(spec as Record<string, unknown>)[hi] as string} onChange={(e) => set({ [hi]: e.target.value } as Partial<OdeSpec>)} />
      </div>
    </label>
  );
  const exprRow = (prefix: string, key: string) => (
    <div className="fn-row">
      <span className="fn-prefix">{prefix}</span>
      <input className="mono" spellCheck={false} value={(spec as Record<string, unknown>)[key] as string} onChange={(e) => set({ [key]: e.target.value } as Partial<OdeSpec>)} />
    </div>
  );

  return (
    <Modal
      title={initial ? t.editOde : t.odes}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{t.cancel}</button>
          <button className="btn primary" disabled={!result.rendered} onClick={() => result.rendered && onSubmit(spec, result.rendered)}>
            {initial ? t.update : t.insert}
          </button>
        </>
      }
    >
      {!initial && (
        <div className="tabs" role="tablist">
          {ODE_TOPICS.map((k) => (
            <button key={k} role="tab" aria-selected={k === topic} className={`tab${k === topic ? " active" : ""}`} onClick={() => setTopic(k)}>
              {t.odeTopics[k]}
            </button>
          ))}
        </div>
      )}
      <small className="hint">{t.odeHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {ODE_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {spec.topic === "field" && (
        <>
          {exprRow("dy/dx =", "expr")}
          <div className="range-grid">
            {text(t.odeStart, "points", 220)}
            {range(t.xRange, "xMin", "xMax")}
            {range(t.odeYRange, "yMin", "yMax")}
          </div>
        </>
      )}

      {spec.topic === "euler" && (
        <>
          {exprRow("dy/dx =", "expr")}
          <div className="range-grid">
            {text("x₀", "x0")}
            {text("y₀", "y0")}
          </div>
          <Slider label="h" min={0.01} max={1} step={0.01} value={spec.h} onChange={(h) => set({ h })} />
          <Slider label={t.odeSteps} min={1} max={100} step={1} value={spec.steps} onChange={(steps) => set({ steps })} />
        </>
      )}

      {spec.topic === "first" && (
        <>
          <div className="segmented wrap" role="radiogroup">
            {FIRST_KINDS.map((k) => (
              <button key={k} role="radio" aria-checked={spec.kind === k} className={`math-label${spec.kind === k ? " active" : ""}`} onClick={() => set({ kind: k })}>
                {FIRST_LABELS[k]}
              </button>
            ))}
          </div>
          <div className="range-grid">
            {(spec.kind === "growth" || spec.kind === "affine") && text("k", "k", 110)}
            {spec.kind === "affine" && text("A", "A")}
            {spec.kind === "logistic" && (
              <>
                {text("r", "k")}
                {text("K", "K")}
              </>
            )}
            {spec.kind === "linear" && (
              <>
                {text("p", "p")}
                {text("b", "b")}
                {text("c", "c")}
              </>
            )}
            {text("y(0)", "y0")}
            {text(t.odeTRange, "tMax")}
          </div>
        </>
      )}

      {spec.topic === "second" && (
        <>
          <small className="hint mono">a·y″ + b·y′ + c·y = F·cos(ωt)</small>
          <div className="range-grid">
            {text("a", "a", 60)}
            {text("b", "b", 60)}
            {text("c", "c", 60)}
            {text("F", "F", 60)}
            {text("ω", "w", 60)}
            {text("y(0)", "y0", 60)}
            {text("y′(0)", "v0", 60)}
            {text(t.odeTRange, "tMax", 60)}
          </div>
        </>
      )}

      {spec.topic === "phase" && (
        <>
          {exprRow("x′ =", "f")}
          {exprRow("y′ =", "g")}
          <div className="range-grid">
            {text(t.odeStart, "points", 220)}
            {range(t.xRange, "xMin", "xMax")}
            {range(t.odeYRange, "yMin", "yMax")}
          </div>
        </>
      )}

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
