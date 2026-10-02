import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { renderPolynomials, POLY_PRESETS, POLY_TOPICS, type PolySpec, type PolyTopic } from "../math/polynomials";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { startOr, Tabs } from "./ui";

type Specs = Record<PolyTopic, PolySpec>;

export function PolyDialog({ initial, start, onSubmit, onClose }: {
  initial?: PolySpec;
  start?: string;
  onSubmit: (spec: PolySpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.polyWords;
  const f = t.polyFields;
  const [topic, setTopic] = useState<PolyTopic>(initial?.topic ?? startOr(start, POLY_TOPICS, "divide"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(POLY_TOPICS.map((k) => [k, POLY_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderPolynomials(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  return (
    <Modal
      title={initial ? t.editPolynomials : t.polynomialsTool}
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
      {!initial && <Tabs items={POLY_TOPICS} value={topic} onChange={setTopic} label={(k) => t.polyTopics[k]} />}
      <small className="hint">{t.polyHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {POLY_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fn-row">
        <span className="fn-prefix" style={{ fontStyle: "normal" }}>{f.input}</span>
        <input className="mono" spellCheck={false} value={spec.src} onChange={(e) => setSpecs({ ...specs, [topic]: { ...spec, src: e.target.value } })} />
      </div>

      <div className="field">
        <span>{t.preview}</span>
        <div className="preview">
          {result.rendered ? <img src={svgToDataUrl(result.rendered.svg)} alt="" style={{ maxWidth: "100%" }} /> : <span className="error">{result.error}</span>}
        </div>
      </div>
    </Modal>
  );
}
