import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { DERIV_PRESETS, DERIV_TOPICS, renderDeriv, type DerivSpec, type DerivTopic } from "../math/derive";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { startOr, Tabs } from "./ui";

type Specs = Record<DerivTopic, DerivSpec>;

export function DerivDialog({ initial, start, onSubmit, onClose }: {
  initial?: DerivSpec;
  start?: string;
  onSubmit: (spec: DerivSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.derivWords;
  const f = t.derivFields;
  const [topic, setTopic] = useState<DerivTopic>(initial?.topic ?? startOr(start, DERIV_TOPICS, "rules"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(DERIV_TOPICS.map((k) => [k, DERIV_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<DerivSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderDeriv(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  return (
    <Modal
      title={initial ? t.editDeriv : t.deriv}
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
      {!initial && <Tabs items={DERIV_TOPICS} value={topic} onChange={setTopic} label={(k) => t.derivTopics[k]} />}
      <small className="hint">{t.derivHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {DERIV_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fn-row">
        <span className="fn-prefix" style={{ fontStyle: "normal" }}>{f.f}</span>
        <input className="mono" spellCheck={false} value={spec.src} onChange={(e) => set({ src: e.target.value })} />
      </div>
      {(topic === "first" || topic === "tangent") && (
        <div className="fn-row">
          <span className="fn-prefix" style={{ fontStyle: "normal" }}>{f.at}</span>
          <input className="mono" spellCheck={false} value={spec.at} onChange={(e) => set({ at: e.target.value })} />
        </div>
      )}

      <div className="field">
        <span>{t.preview}</span>
        <div className="preview">
          {result.rendered ? <img src={svgToDataUrl(result.rendered.svg)} alt="" style={{ maxWidth: "100%" }} /> : <span className="error">{result.error}</span>}
        </div>
      </div>
    </Modal>
  );
}
