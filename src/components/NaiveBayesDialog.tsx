import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { RenderedSvg } from "../math/latex";
import { NB_FIELDS, NB_PRESETS, NB_TOPICS, renderNaiveBayes, type NbSpec, type NbTopic } from "../math/naiveBayes";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { startOr, Tabs } from "./ui";

type Specs = Record<NbTopic, NbSpec>;

export function NaiveBayesDialog({ initial, start, onSubmit, onClose }: {
  initial?: NbSpec;
  start?: string;
  onSubmit: (spec: NbSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.naiveBayesWords;
  const f = t.naiveBayesFields;
  const [topic, setTopic] = useState<NbTopic>(initial?.topic ?? startOr(start, NB_TOPICS, "text"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(NB_TOPICS.map((k) => [k, NB_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const setSrc = (i: number, v: string) => {
    const src = NB_FIELDS[topic].map((_, k) => (k === i ? v : (spec.src[k] ?? "")));
    setSpecs({ ...specs, [topic]: { ...spec, src } });
  };

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderNaiveBayes(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  return (
    <Modal
      title={initial ? t.editNaiveBayes : t.naiveBayes}
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
      {!initial && <Tabs items={NB_TOPICS} value={topic} onChange={setTopic} label={(k) => t.naiveBayesTopics[k]} />}
      <small className="hint">{t.naiveBayesHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {NB_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {NB_FIELDS[topic].map((name, i) => (
        <div className="fn-row" key={name}>
          <span className="fn-prefix" style={{ fontStyle: "normal" }}>{f[name]}</span>
          <input className="mono" spellCheck={false} aria-label={f[name]} value={spec.src[i] ?? ""} onChange={(e) => setSrc(i, e.target.value)} />
        </div>
      ))}

      <div className="field">
        <span>{t.preview}</span>
        <div className="preview">
          {result.rendered ? <img src={svgToDataUrl(result.rendered.svg)} alt="" style={{ maxWidth: "100%" }} /> : <span className="error">{result.error}</span>}
        </div>
      </div>
    </Modal>
  );
}
