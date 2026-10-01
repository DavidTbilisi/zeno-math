import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { RenderedSvg } from "../math/latex";
import { CHECK_OPS, MAJOR_SYSTEMS, MENTAL_PRESETS, MENTAL_TOPICS, renderMental, type MentalSpec, type MentalTopic } from "../math/mental";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";

type Specs = Record<MentalTopic, MentalSpec>;
const OP_LABEL = { "+": "+", "-": "−", "*": "×", "/": "÷" };

export function MentalDialog({ initial, start, onSubmit, onClose }: {
  initial?: MentalSpec;
  start?: string;
  onSubmit: (spec: MentalSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const w = t.mentalWords;
  const f = t.mentalFields;
  const [topic, setTopic] = useState<MentalTopic>(initial?.topic ?? startOr(start, MENTAL_TOPICS, "multiply"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(MENTAL_TOPICS.map((k) => [k, MENTAL_PRESETS[k][0].spec])) as Specs;
    // The Major System follows the language: БЦК for Russian, the Latin table otherwise.
    if (lang === "ru") s.major = MENTAL_PRESETS.major[1].spec;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<MentalSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderMental(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  const field = (key: keyof MentalSpec, label: string, width = 110) => (
    <label key={key}>
      <span>{label}</span>
      <input className="mono" style={{ width }} spellCheck={false} value={spec[key] as string} onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );
  const row = (key: keyof MentalSpec, label: string) => (
    <div className="fn-row">
      <span className="fn-prefix" style={{ fontStyle: "normal" }}>{label}</span>
      <input spellCheck={false} value={spec[key] as string} onChange={(e) => set({ [key]: e.target.value })} />
    </div>
  );
  const segmented = <K extends string>(keys: readonly K[], label: (k: K) => string, current: K, onPick: (k: K) => void) => (
    <Segmented items={keys} value={current} onChange={(k) => onPick(k)} label={(k) => label(k)} />
  );

  return (
    <Modal
      title={initial ? t.editMental : t.mental}
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
        <Tabs items={MENTAL_TOPICS} value={topic} onChange={setTopic} label={(k) => t.mentalTopics[k]} />
      )}
      <small className="hint">{t.mentalHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {MENTAL_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {topic === "multiply" && (
        <div className="range-grid">
          {field("a", f.a)}
          {field("b", f.b)}
          {field("base", f.base, 90)}
        </div>
      )}
      {topic === "check" && (
        <>
          <div className="range-grid">
            {field("a", f.a, 150)}
            {field("b", f.b, 150)}
            {field("c", f.c, 180)}
          </div>
          {segmented(CHECK_OPS, (o) => OP_LABEL[o], spec.op, (op) => set({ op }))}
        </>
      )}
      {(topic === "sqrt" || topic === "cbrt") && <div className="range-grid">{field("a", f.n, 160)}</div>}
      {(topic === "cube" || topic === "magic") && <div className="range-grid">{field("a", f.n2, 70)}</div>}
      {topic === "major" && (
        <>
          {row("a", f.number)}
          {row("words", f.words)}
          <div className="range-grid">
            <span className="hint">{f.sys}</span>
            {segmented(MAJOR_SYSTEMS, (s) => w.major.sys[s], spec.sys, (sys) => set({ sys }))}
          </div>
        </>
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
