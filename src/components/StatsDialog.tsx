import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import {
  CLT_SOURCES,
  DIST_KINDS,
  EXPERIMENTS,
  renderStatistics,
  STAT_PRESETS,
  STAT_TOPICS,
  type StatSpec,
  type StatSpecOf,
  type StatTopic,
} from "../math/statistics";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Slider } from "./AnalysisDialog";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";

type Specs = { [K in StatTopic]: StatSpecOf<K> };

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export function StatsDialog({ initial, start, onSubmit, onClose }: {
  initial?: StatSpec;
  start?: string;
  onSubmit: (spec: StatSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [topic, setTopic] = useState<StatTopic>(initial?.topic ?? startOr(start, STAT_TOPICS, "data"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(STAT_TOPICS.map((k) => [k, strip(STAT_PRESETS[k][0])])) as Specs;
    s.tree = { ...s.tree, nameA: t.treeNames.marbles.a, nameB: t.treeNames.marbles.b };
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<StatSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderStatistics(spec, t.statWords) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, t]);

  const presetLabel = (p: StatSpec & { names?: string }, i: number): string => {
    switch (p.topic) {
      case "data":
        return t.statPresetNames.data[i];
      case "scatter":
        return t.statPresetNames.scatter[i];
      case "chance":
        return `${t.statExperiments[p.experiment]} × ${p.trials}`;
      case "tree":
        return t.treeNames[p.names as keyof typeof t.treeNames].label;
      case "dist": {
        const head = p.kind === "binomial" ? `B(${p.n}, ${p.p})` : p.kind === "poisson" ? `Po(${p.lambda})` : `N(${p.mu}, ${p.sigma}²)`;
        const cond = p.lo && p.hi ? (p.lo === p.hi ? `X = ${p.lo}` : `${p.lo} ≤ X ≤ ${p.hi}`) : p.lo ? `X ≥ ${p.lo}` : `X ≤ ${p.hi}`;
        return `${head}: P(${cond})`;
      }
      case "clt":
        return `${t.cltSources[p.source]}, n = ${p.n}`;
    }
  };

  const applyPreset = (p: StatSpec & { names?: string }) => {
    const next = strip(p);
    if (next.topic === "tree" && p.names) {
      const names = t.treeNames[p.names as keyof typeof t.treeNames];
      next.nameA = names.a;
      next.nameB = names.b;
    }
    setSpecs({ ...specs, [topic]: next });
  };

  const text = (label: string, key: string, width = 90, placeholder = "") => (
    <label>
      <span>{label}</span>
      <input
        type="text"
        className="mono"
        style={{ width }}
        spellCheck={false}
        placeholder={placeholder}
        value={(spec as Record<string, unknown>)[key] as string}
        onChange={(e) => set({ [key]: e.target.value } as Partial<StatSpec>)}
      />
    </label>
  );

  return (
    <Modal
      title={initial ? t.editStatistics : t.statistics}
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
        <Tabs items={STAT_TOPICS} value={topic} onChange={setTopic} label={(k) => t.statTopics[k]} />
      )}
      <small className="hint">{t.statHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {STAT_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text" onClick={() => applyPreset(p)}>
              {presetLabel(p, i)}
            </button>
          ))}
        </div>
      </div>

      {spec.topic === "data" && (
        <>
          <label className="field">
            <span>{t.statData}</span>
            <textarea className="mono" rows={2} spellCheck={false} value={spec.values} onChange={(e) => set({ values: e.target.value })} />
          </label>
          <div className="range-grid">
            <Segmented items={(["dot", "hist"] as const)} value={spec.chart} onChange={(c) => set({ chart: c })} label={(c) => c === "dot" ? t.statDot : t.statHist} />
            {spec.chart === "hist" && (
              <label>
                <span>{t.statBins}</span>
                <input type="number" min={0} max={30} value={spec.bins} onChange={(e) => set({ bins: Number(e.target.value) })} />
              </label>
            )}
          </div>
        </>
      )}

      {spec.topic === "scatter" && (
        <>
          <label className="field">
            <span>{t.statPoints}</span>
            <textarea className="mono" rows={2} spellCheck={false} value={spec.points} onChange={(e) => set({ points: e.target.value })} />
          </label>
          <div className="range-grid">
            <label className="check">
              <input type="checkbox" checked={spec.line} onChange={(e) => set({ line: e.target.checked })} />
              <span>{t.showLine}</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={spec.residuals} onChange={(e) => set({ residuals: e.target.checked })} />
              <span>{t.showResiduals}</span>
            </label>
          </div>
        </>
      )}

      {spec.topic === "chance" && (
        <>
          <Segmented className="wrap" items={EXPERIMENTS} value={spec.experiment} onChange={(x) => set({ experiment: x })} label={(x) => t.statExperiments[x]} />
          {/* Trials on a log scale: 10 … 10 000. */}
          <Slider
            label={t.statTrials}
            min={1}
            max={4}
            step={0.01}
            value={Math.log10(spec.trials)}
            shown={String(spec.trials)}
            onChange={(v) => set({ trials: Math.round(10 ** v) })}
          />
          <button className="btn small add-fn" onClick={() => set({ seed: newSeed() })}>🎲 {t.newSample}</button>
        </>
      )}

      {spec.topic === "tree" && (
        <div className="range-grid">
          {text("P(A)", "pA")}
          {text("P(B | A)", "pBA")}
          {text("P(B | A′)", "pBnotA")}
          {text(t.nameA, "nameA", 130, "A")}
          {text(t.nameB, "nameB", 130, "B")}
        </div>
      )}

      {spec.topic === "dist" && (
        <>
          <Segmented className="wrap" items={DIST_KINDS} value={spec.kind} onChange={(k) => set({ kind: k })} label={(k) => t.distKinds[k]} />
          {spec.kind === "binomial" && <Slider label="n" min={1} max={60} step={1} value={spec.n} onChange={(v) => set({ n: v })} />}
          <div className="range-grid">
            {spec.kind === "binomial" && text("p", "p")}
            {spec.kind === "poisson" && text("λ", "lambda")}
            {spec.kind === "normal" && (
              <>
                {text("μ", "mu")}
                {text("σ", "sigma")}
              </>
            )}
            {text(t.from, "lo", 90, "−∞")}
            {text(t.to, "hi", 90, "∞")}
          </div>
        </>
      )}

      {spec.topic === "clt" && (
        <>
          <Segmented className="wrap" items={CLT_SOURCES} value={spec.source} onChange={(x) => set({ source: x })} label={(x) => t.cltSources[x]} />
          <Slider label={t.sampleSize} min={1} max={50} step={1} value={spec.n} onChange={(v) => set({ n: v })} />
          <Slider label={t.samplesCount} min={100} max={5000} step={100} value={spec.samples} onChange={(v) => set({ samples: v })} />
          <button className="btn small add-fn" onClick={() => set({ seed: newSeed() })}>🎲 {t.newSample}</button>
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

/** Presets carry a `names` key for the dialog only; it isn't part of the stored spec. */
function strip(p: StatSpec & { names?: string }): StatSpec {
  const { names: _names, ...rest } = p;
  return rest as StatSpec;
}
