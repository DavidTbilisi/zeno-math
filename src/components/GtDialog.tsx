import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { GT_LAYOUTS, GT_PRESETS, GT_TOPICS, renderGt, type GtSpec, type GtTopic } from "../math/graphtheory";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";

type Specs = Record<GtTopic, GtSpec>;

export function GtDialog({ initial, onSubmit, onClose }: {
  initial?: GtSpec;
  onSubmit: (spec: GtSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.gtWords;
  const [topic, setTopic] = useState<GtTopic>(initial?.topic ?? "props");
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(GT_TOPICS.map((k) => [k, GT_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<GtSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderGt(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  const text = (label: string, key: "a" | "b" | "k", width = 80) => (
    <label key={key}>
      <span>{label}</span>
      <input type="text" className="mono" style={{ width }} spellCheck={false} value={spec[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );

  return (
    <Modal
      title={initial ? t.editGt : t.gt}
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
          {GT_TOPICS.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={k === topic}
              className={`tab${k === topic ? " active" : ""}`}
              // Keep the graph when switching topics, so one graph can be studied from every side.
              onClick={() => {
                setSpecs({ ...specs, [k]: { ...specs[k], edges: spec.edges, layout: spec.layout } });
                setTopic(k);
              }}
            >
              {t.gtTopics[k]}
            </button>
          ))}
        </div>
      )}
      <small className="hint">{t.gtHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {GT_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fn-row">
        <span className="fn-prefix" style={{ fontStyle: "normal" }}>{t.gtEdges}</span>
        <input className="mono" spellCheck={false} value={spec.edges} onChange={(e) => set({ edges: e.target.value })} />
      </div>
      <div className="segmented wrap" role="radiogroup">
        {GT_LAYOUTS.map((l) => (
          <button key={l} role="radio" aria-checked={spec.layout === l} className={spec.layout === l ? "active" : ""} onClick={() => set({ layout: l })}>
            {t.gtLayouts[l]}
          </button>
        ))}
      </div>
      {spec.topic === "walks" && (
        <div className="range-grid">
          {text(t.gtFrom, "a")}
          {text(t.gtTo, "b")}
          {text(t.gtLength, "k")}
        </div>
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
