import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { RenderedSvg } from "../math/latex";
import { INFO_FIELDS, INFO_PRESETS, INFO_TOPICS, renderInformation, type InfoSpec, type InfoTopic } from "../math/information";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { startOr, Tabs } from "./ui";

type Specs = Record<InfoTopic, InfoSpec>;

export function InformationDialog({ initial, start, onSubmit, onClose }: {
  initial?: InfoSpec;
  start?: string;
  onSubmit: (spec: InfoSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.informationWords;
  const f = t.informationFields;
  const [topic, setTopic] = useState<InfoTopic>(initial?.topic ?? startOr(start, INFO_TOPICS, "entropy"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(INFO_TOPICS.map((k) => [k, INFO_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const setSrc = (i: number, v: string) => {
    const src = INFO_FIELDS[topic].map((_, k) => (k === i ? v : (spec.src[k] ?? "")));
    setSpecs({ ...specs, [topic]: { ...spec, src } });
  };

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderInformation(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  return (
    <Modal
      title={initial ? t.editInformation : t.information}
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
      {!initial && <Tabs items={INFO_TOPICS} value={topic} onChange={setTopic} label={(k) => t.informationTopics[k]} />}
      <small className="hint">{t.informationHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {INFO_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {INFO_FIELDS[topic].map((name, i) => (
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
