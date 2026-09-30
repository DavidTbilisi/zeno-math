import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import {
  ANALYSIS_PRESETS,
  ANALYSIS_TOPICS,
  RIEMANN_METHODS,
  renderAnalysis,
  type AnalysisSpec,
  type AnalysisTopic,
  type SpecOf,
} from "../math/analysis";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";

type Specs = { [K in AnalysisTopic]: SpecOf<K> };

/** Short, language-neutral chip labels for the examples. */
function presetLabel(p: AnalysisSpec): string {
  switch (p.topic) {
    case "sequence":
      return `${p.expr} → ${p.limit}`;
    case "limit":
      return `x → ${p.a}: ${p.expr}`;
    case "derivative":
      return `${p.expr}, a = ${p.a}`;
    case "riemann":
      return `${p.expr}, x ∈ [${p.a}, ${p.b}]`;
    case "series":
      return `Σ ${p.expr}`;
    case "taylor":
      return `${p.expr}, a = ${p.a}`;
  }
}

export function AnalysisDialog({ initial, onSubmit, onClose }: {
  initial?: AnalysisSpec;
  onSubmit: (spec: AnalysisSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [topic, setTopic] = useState<AnalysisTopic>(initial?.topic ?? "sequence");
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(ANALYSIS_TOPICS.map((k) => [k, ANALYSIS_PRESETS[k][0]])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<AnalysisSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderAnalysis(spec, t.analysisWords) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, t]);

  const text = (label: string, key: string, width = 90, placeholder = "") => (
    <label>
      <span>{label}</span>
      <input
        type="text"
        className="mono"
        style={{ width }}
        spellCheck={false}
        placeholder={placeholder}
        value={(spec as Record<string, unknown>)[key] as string}
        onChange={(e) => set({ [key]: e.target.value } as Partial<AnalysisSpec>)}
      />
    </label>
  );

  return (
    <Modal
      title={initial ? t.editAnalysis : t.analysis}
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
          {ANALYSIS_TOPICS.map((k) => (
            <button key={k} role="tab" aria-selected={k === topic} className={`tab${k === topic ? " active" : ""}`} onClick={() => setTopic(k)}>
              {t.analysisTopics[k]}
            </button>
          ))}
        </div>
      )}
      <small className="hint">{t.analysisHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {ANALYSIS_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text mono" onClick={() => setSpecs({ ...specs, [topic]: p })}>
              {presetLabel(p)}
            </button>
          ))}
        </div>
      </div>

      <div className="fn-row">
        <span className="fn-prefix">{topic === "sequence" || topic === "series" ? "aₙ =" : "f(x) ="}</span>
        <input className="mono" value={spec.expr} spellCheck={false} onChange={(e) => set({ expr: e.target.value })} />
      </div>

      <div className="range-grid">
        {spec.topic === "sequence" && text("L", "limit")}
        {spec.topic === "limit" && (
          <>
            {text("a", "a")}
            {text("L", "limit")}
            {text(t.analysisWindow, "zoom")}
          </>
        )}
        {(spec.topic === "derivative" || spec.topic === "taylor") && text("a", "a")}
        {spec.topic === "riemann" && (
          <>
            {text("a", "a")}
            {text("b", "b")}
          </>
        )}
        {spec.topic === "series" && (
          <>
            <label>
              <span>{t.analysisStart}</span>
              <input type="number" min={0} max={1000} value={spec.start} onChange={(e) => set({ start: Number(e.target.value) })} />
            </label>
            {text(t.analysisSum, "sum", 130, "?")}
          </>
        )}
        {spec.topic === "taylor" && (
          <label>
            <span>{t.xRange}</span>
            <div>
              <input type="text" className="mono" value={spec.xMin} onChange={(e) => set({ xMin: e.target.value })} />
              <span>…</span>
              <input type="text" className="mono" value={spec.xMax} onChange={(e) => set({ xMax: e.target.value })} />
            </div>
          </label>
        )}
        {spec.topic === "derivative" && (
          <label className="check">
            <input type="checkbox" checked={spec.showDerivative} onChange={(e) => set({ showDerivative: e.target.checked })} />
            <span>{t.showDerivative}</span>
          </label>
        )}
      </div>

      {(spec.topic === "sequence" || spec.topic === "limit") && (
        // ε on a log scale: 0.001 … 1 (sequences) or 0.01 … 2 (limits).
        <Slider
          label="ε"
          min={spec.topic === "sequence" ? -3 : -2}
          max={spec.topic === "sequence" ? 0 : Math.log10(2)}
          step={0.01}
          value={Math.log10(spec.eps)}
          shown={String(spec.eps)}
          onChange={(v) => set({ eps: Number((10 ** v).toPrecision(2)) })}
        />
      )}
      {spec.topic === "sequence" && <Slider label={t.analysisTerms} min={5} max={120} step={1} value={spec.nMax} onChange={(v) => set({ nMax: v })} />}
      {spec.topic === "derivative" && (
        <Slider label="h" min={-2} max={2} step={0.01} value={spec.h} shown={String(spec.h)} onChange={(v) => set({ h: v === 0 ? 0.01 : v })} />
      )}
      {spec.topic === "riemann" && (
        <>
          <Slider label="n" min={1} max={100} step={1} value={spec.n} onChange={(v) => set({ n: v })} />
          <div className="segmented wrap" role="radiogroup">
            {RIEMANN_METHODS.map((m) => (
              <button key={m} role="radio" aria-checked={spec.method === m} className={spec.method === m ? "active" : ""} onClick={() => set({ method: m })}>
                {t.analysisWords.methods[m]}
              </button>
            ))}
          </div>
        </>
      )}
      {spec.topic === "series" && <Slider label={t.analysisTerms} min={2} max={120} step={1} value={spec.nMax} onChange={(v) => set({ nMax: v })} />}
      {spec.topic === "taylor" && <Slider label={t.analysisOrder} min={0} max={12} step={1} value={spec.order} onChange={(v) => set({ order: v })} />}

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

export function Slider({ label, min, max, step, value, shown, onChange }: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  shown?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="slider-row">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <output>{shown ?? value}</output>
    </label>
  );
}
