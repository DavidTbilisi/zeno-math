import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { ALGEBRA_PRESETS, ALGEBRA_TOPICS, QUAD_METHODS, renderAlgebra, type AlgebraSpec, type AlgebraTopic } from "../math/algebra";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, startOr, Tabs } from "./ui";

type Specs = Record<AlgebraTopic, AlgebraSpec>;

export function AlgebraDialog({ initial, start, onSubmit, onClose }: {
  initial?: AlgebraSpec;
  start?: string;
  onSubmit: (spec: AlgebraSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.algebraWords;
  const f = t.algebraFields;
  const [topic, setTopic] = useState<AlgebraTopic>(initial?.topic ?? startOr(start, ALGEBRA_TOPICS, "linear"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(ALGEBRA_TOPICS.map((k) => [k, ALGEBRA_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<AlgebraSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderAlgebra(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  return (
    <Modal
      title={initial ? t.editAlgebra : t.algebra}
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
      {!initial && <Tabs items={ALGEBRA_TOPICS} value={topic} onChange={setTopic} label={(k) => t.algebraTopics[k]} />}
      <small className="hint">{t.algebraHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {ALGEBRA_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fn-row">
        <span className="fn-prefix" style={{ fontStyle: "normal" }}>{topic === "expand" || topic === "factor" ? f.expr : f.eq}</span>
        <input className="mono" spellCheck={false} value={spec.eq} onChange={(e) => set({ eq: e.target.value })} />
      </div>
      {topic === "quadratic" && (
        <div className="range-grid">
          <span className="hint">{f.method}</span>
          <Segmented items={QUAD_METHODS} value={spec.method} onChange={(method) => set({ method })} label={(m) => w.quad.methods[m]} />
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
