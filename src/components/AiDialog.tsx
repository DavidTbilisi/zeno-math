import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { renderAi, AI_DEFAULT, AI_PRESETS, AI_TOPICS, type AiSpec, type AiTopic } from "../math/ai";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { startOr, Tabs } from "./ui";

type Specs = Record<AiTopic, AiSpec>;

export function AiDialog({ initial, start, onSubmit, onClose }: {
  initial?: AiSpec;
  start?: string;
  onSubmit: (spec: AiSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.aiWords;
  const f = t.aiFields;
  const [topic, setTopic] = useState<AiTopic>(initial?.topic ?? startOr(start, AI_TOPICS, "tensor"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(AI_TOPICS.map((k) => [k, AI_DEFAULT[k]])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderAi(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  return (
    <Modal
      title={initial ? t.editAi : t.aiTool}
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
      {!initial && AI_TOPICS.length > 1 && <Tabs items={AI_TOPICS} value={topic} onChange={setTopic} label={(k) => t.aiTopics[k]} />}
      <small className="hint">{t.aiHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {AI_PRESETS[topic].map((p, i) => (
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
