import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { RenderedSvg } from "../math/latex";
import { PIGEON_MODES, renderTactics, TACTICS_PRESETS, TACTICS_TOPICS, type TacticsSpec, type TacticsTopic } from "../math/tactics";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";

type Specs = Record<TacticsTopic, TacticsSpec>;

export function TacticsDialog({ initial, start, onSubmit, onClose }: {
  initial?: TacticsSpec;
  start?: string;
  onSubmit: (spec: TacticsSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const f = t.tacticsFields;
  const [topic, setTopic] = useState<TacticsTopic>(initial?.topic ?? startOr(start, TACTICS_TOPICS, "symmetry"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(TACTICS_TOPICS.map((k) => [k, TACTICS_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<TacticsSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderTactics(spec, t.tacticsWords) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, t]);

  const field = (key: keyof TacticsSpec, label: string, width = 70) => (
    <label key={key}>
      <span>{label}</span>
      <input className="mono" style={{ width }} spellCheck={false} value={spec[key] as string} onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );
  const row = (key: keyof TacticsSpec, label: string) => (
    <div className="fn-row">
      <span className="fn-prefix" style={{ fontStyle: "normal" }}>{label}</span>
      <input className="mono" spellCheck={false} value={spec[key] as string} onChange={(e) => set({ [key]: e.target.value })} />
    </div>
  );

  return (
    <Modal
      title={initial ? t.editTactics : t.tactics}
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
        <Tabs items={TACTICS_TOPICS} value={topic} onChange={setTopic} label={(k) => t.tacticsTopics[k]} />
      )}
      <small className="hint">{t.tacticsHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {TACTICS_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {topic === "symmetry" && <div className="range-grid">{field("n", f.n)}</div>}
      {topic === "pigeonhole" && (
        <>
          <Segmented items={PIGEON_MODES} value={spec.mode} onChange={(m) => set({ mode: m })} label={(m) => t.pigeonModes[m]} />
          {spec.mode === "count" ? (
            <div className="range-grid">
              {field("p", f.p)}
              {field("h", f.h)}
            </div>
          ) : (
            <>
              {row("nums", f.nums)}
              <div className="range-grid">{field("h", f.mod)}</div>
            </>
          )}
        </>
      )}
      {topic === "tiling" && (
        <>
          <div className="range-grid">
            {field("rows", f.rows)}
            {field("cols", f.cols)}
          </div>
          {row("removed", f.removed)}
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
