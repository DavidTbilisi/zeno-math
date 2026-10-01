import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import {
  COMB_PRESETS,
  COMB_TOPICS,
  COUNT_KINDS,
  INCL_MODES,
  NUMBER_KINDS,
  PASCAL_MODES,
  renderComb,
  type CombSpec,
  type CombSpecOf,
  type CombTopic,
} from "../math/combinatorics";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";

type Specs = { [K in CombTopic]: CombSpecOf<K> };

export function CombDialog({ initial, start, onSubmit, onClose }: {
  initial?: CombSpec;
  start?: string;
  onSubmit: (spec: CombSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.combWords;
  const [topic, setTopic] = useState<CombTopic>(initial?.topic ?? startOr(start, COMB_TOPICS, "count"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(COMB_TOPICS.map((k) => [k, COMB_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<CombSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderComb(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  const value = (key: string) => (spec as Record<string, unknown>)[key] as string;
  const text = (label: string, key: string, width = 80) => (
    <label key={key}>
      <span>{label}</span>
      <input type="text" className="mono" style={{ width }} spellCheck={false} value={value(key)} onChange={(e) => set({ [key]: e.target.value } as Partial<CombSpec>)} />
    </label>
  );
  const segmented = <K extends string>(keys: readonly K[], label: (k: K) => string, current: K, onPick: (k: K) => void) => (
    <Segmented className="wrap" itemClassName="math-label" items={keys} value={current} onChange={(k) => onPick(k)} label={(k) => label(k)} />
  );

  return (
    <Modal
      title={initial ? t.editComb : t.comb}
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
        <Tabs items={COMB_TOPICS} value={topic} onChange={setTopic} label={(k) => t.combTopics[k]} />
      )}
      <small className="hint">{t.combHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {COMB_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {spec.topic === "count" && (
        <>
          {segmented(COUNT_KINDS, (k) => w.countNames[k], spec.kind, (kind) => set({ kind }))}
          <div className="range-grid">
            {spec.kind === "word" ? (
              text(t.combWord, "word", 180)
            ) : (
              <>
                {text(t.combN, "n")}
                {text(t.combR, "r")}
              </>
            )}
          </div>
        </>
      )}

      {spec.topic === "pascal" && (
        <>
          {segmented(PASCAL_MODES, (m) => t.pascalModes[m], spec.mode, (mode) => set({ mode, rows: mode === "parity" ? "32" : spec.mode === "parity" ? "9" : spec.rows }))}
          <div className="range-grid">
            {text(t.combRows, "rows")}
            {(spec.mode === "row" || spec.mode === "entry" || spec.mode === "hockey") && text(t.combN, "n")}
            {(spec.mode === "entry" || spec.mode === "hockey") && text(t.combK, "k")}
          </div>
        </>
      )}

      {spec.topic === "stars" && (
        <div className="range-grid">
          {text(t.starsK, "k")}
          {text(t.starsN, "n")}
          <label className="check">
            <input type="checkbox" checked={spec.empty} onChange={(e) => set({ empty: e.target.checked })} />
            <span>{t.starsEmptyLabel}</span>
          </label>
        </div>
      )}

      {spec.topic === "incl" && (
        <>
          {segmented(INCL_MODES, (m) => t.inclModes[m], spec.mode, (mode) => set({ mode }))}
          <div className="range-grid">
            {spec.mode === "venn" ? (
              text(t.inclSizes, "sizes", 260)
            ) : (
              <>
                {text(t.inclN, "n", 110)}
                {text(t.inclDivs, "divs", 140)}
              </>
            )}
          </div>
        </>
      )}

      {spec.topic === "numbers" && (
        <>
          {segmented(NUMBER_KINDS, (k) => t.numberKinds[k], spec.kind, (kind) => set({ kind }))}
          <div className="range-grid">{text(t.combN, "n")}</div>
        </>
      )}

      <div className="field">
        <span>{t.preview}</span>
        <div className="preview">
          {result.rendered ? (
            <img src={svgToDataUrl(result.rendered.svg)} alt="" style={{ maxWidth: "100%" }} />
          ) : (
            <span className="error">{result.error}</span>
          )}
        </div>
      </div>
    </Modal>
  );
}
