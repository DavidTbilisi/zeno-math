import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { RenderedSvg } from "../math/latex";
import { PHASES, renderStrategies, STARTUP_PROBLEMS, STRATEGY_PRESETS, STRATEGY_TOPICS, type StrategySpec, type StrategyTopic } from "../math/strategies";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";

type Specs = Record<StrategyTopic, StrategySpec>;

export function StrategiesDialog({ initial, start, onSubmit, onClose }: {
  initial?: StrategySpec;
  start?: string;
  onSubmit: (spec: StrategySpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.strategiesWords;
  const [topic, setTopic] = useState<StrategyTopic>(initial?.topic ?? startOr(start, STRATEGY_TOPICS, "polya"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(STRATEGY_TOPICS.map((k) => [k, STRATEGY_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<StrategySpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderStrategies(spec, t.strategiesWords) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, t]);

  const area = (key: "problem" | "u" | "p" | "c" | "l", label: string) => (
    <label key={key} className="field">
      <span>{label}</span>
      <textarea rows={2} spellCheck={false} value={spec[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );

  return (
    <Modal
      title={initial ? t.editStrategies : t.strategies}
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
      {!initial && <Tabs items={STRATEGY_TOPICS} value={topic} onChange={setTopic} label={(k) => t.strategiesTopics[k]} />}
      <small className="hint">{t.strategiesHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {STRATEGY_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {topic === "polya" ? (
        <>
          {area("problem", t.strategiesFields.problem)}
          {PHASES.map((ph, i) => area(ph, `${i + 1}. ${w.phases[ph]}`))}
        </>
      ) : (
        <>
          <Segmented items={STARTUP_PROBLEMS} value={spec.sample} onChange={(s) => set({ sample: s })} label={(s) => t.strategiesProblems[s]} />
          <div className="range-grid">
            <label>
              <span>{t.strategiesFields.n}</span>
              <input className="mono" style={{ width: 70 }} spellCheck={false} value={spec.n} onChange={(e) => set({ n: e.target.value })} />
            </label>
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
