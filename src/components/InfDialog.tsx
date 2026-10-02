import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { ALTS, hasAlt, INF_PRESETS, INF_TOPICS, infFields, kindLabel, kindsOf, renderInference, type InfSpec, type InfTopic } from "../math/inference";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, startOr, Tabs } from "./ui";

type Specs = Record<InfTopic, InfSpec>;

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export function InfDialog({ initial, start, onSubmit, onClose }: {
  initial?: InfSpec;
  start?: string;
  onSubmit: (spec: InfSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.infWords;
  const [topic, setTopic] = useState<InfTopic>(initial?.topic ?? startOr(start, INF_TOPICS, "ci"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(INF_TOPICS.map((k) => [k, INF_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<InfSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });
  /** Switching the kind starts from its first example, so the inputs fit. */
  const pick = (kind: string) => set(INF_PRESETS[topic].find((p) => p.spec.kind === kind)?.spec ?? { ...spec, kind });
  const kinds = kindsOf(topic);

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderInference(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  const fields = infFields(spec, w);

  return (
    <Modal
      title={initial ? t.editInference : t.inference}
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
      {!initial && <Tabs items={INF_TOPICS} value={topic} onChange={setTopic} label={(k) => t.infTopics[k]} />}
      <small className="hint">{t.infHints[topic]}</small>

      {kinds.length > 0 && (
        <Segmented className="wrap" items={kinds} value={kinds.includes(spec.kind) ? spec.kind : kinds[0]} onChange={pick} label={(k) => kindLabel(topic, k, w)} />
      )}
      {hasAlt(topic) && <Segmented items={ALTS} value={spec.alt} onChange={(alt) => set({ alt })} label={(a) => (topic === "power" ? `H₁: ${w.alt[a]}` : w.alt[a])} />}

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {INF_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {fields
        .filter((f) => f.area)
        .map(({ key, label }) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <textarea className="mono" rows={2} spellCheck={false} value={spec[key]} onChange={(e) => set({ [key]: e.target.value })} />
          </label>
        ))}
      <div className="range-grid">
        {fields
          .filter((f) => !f.area)
          .map(({ key, label }) => (
            <label key={key}>
              <span>{label}</span>
              <input type="text" className="mono" style={{ width: 110 }} spellCheck={false} value={spec[key]} onChange={(e) => set({ [key]: e.target.value })} />
            </label>
          ))}
      </div>
      {topic === "coverage" && (
        <button className="btn small add-fn" onClick={() => set({ seed: newSeed() })}>🎲 {t.newSample}</button>
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
