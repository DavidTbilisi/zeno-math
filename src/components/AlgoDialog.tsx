import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import {
  ALGO_PRESETS,
  ALGO_TOPICS,
  DP_PROBLEMS,
  DS_KINDS,
  GRAPH_ALGOS,
  GROWTH_MODES,
  renderAlgo,
  SEARCH_ALGOS,
  SORT_ALGOS,
  TREE_KINDS,
  type AlgoSpec,
  type AlgoSpecOf,
  type AlgoTopic,
} from "../math/algo";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";

type Specs = { [K in AlgoTopic]: AlgoSpecOf<K> };

export function AlgoDialog({ initial, onSubmit, onClose }: {
  initial?: AlgoSpec;
  onSubmit: (spec: AlgoSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.algoWords;
  const [topic, setTopic] = useState<AlgoTopic>(initial?.topic ?? "sort");
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(ALGO_TOPICS.map((k) => [k, ALGO_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<AlgoSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderAlgo(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  const value = (key: string) => (spec as Record<string, unknown>)[key] as string;
  const text = (label: string, key: string, width = 70) => (
    <label key={key}>
      <span>{label}</span>
      <input type="text" className="mono" style={{ width }} spellCheck={false} value={value(key)} onChange={(e) => set({ [key]: e.target.value } as Partial<AlgoSpec>)} />
    </label>
  );
  const row = (prefix: string, key: string) => (
    <div className="fn-row">
      <span className="fn-prefix" style={{ fontStyle: "normal" }}>{prefix}</span>
      <input className="mono" spellCheck={false} value={value(key)} onChange={(e) => set({ [key]: e.target.value } as Partial<AlgoSpec>)} />
    </div>
  );
  const segmented = <K extends string>(keys: readonly K[], label: (k: K) => string, current: K, onPick: (k: K) => void) => (
    <div className="segmented wrap" role="radiogroup">
      {keys.map((k) => (
        <button key={k} role="radio" aria-checked={current === k} className={`math-label${current === k ? " active" : ""}`} onClick={() => onPick(k)}>
          {label(k)}
        </button>
      ))}
    </div>
  );

  return (
    <Modal
      title={initial ? t.editAlgo : t.algo}
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
        <div className="tabs" role="tablist">
          {ALGO_TOPICS.map((k) => (
            <button key={k} role="tab" aria-selected={k === topic} className={`tab${k === topic ? " active" : ""}`} onClick={() => setTopic(k)}>
              {t.algoTopics[k]}
            </button>
          ))}
        </div>
      )}
      <small className="hint">{t.algoHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {ALGO_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {spec.topic === "sort" && (
        <>
          {segmented(SORT_ALGOS, (a) => w.sortNames[a], spec.algo, (algo) => set({ algo }))}
          {row(t.algoData, "data")}
        </>
      )}

      {spec.topic === "search" && (
        <>
          {segmented(SEARCH_ALGOS, (a) => w.searchNames[a], spec.algo, (algo) => set({ algo }))}
          {row(t.algoData, "data")}
          <div className="range-grid">{text(t.algoTarget, "target", 90)}</div>
        </>
      )}

      {spec.topic === "graph" && (
        <>
          {segmented(GRAPH_ALGOS, (a) => w.graphNames[a], spec.algo, (algo) => set({ algo, ...(algo === "topo" ? { directed: true } : {}) }))}
          {row(t.algoEdges, "edges")}
          <div className="range-grid">
            {spec.algo !== "topo" && spec.algo !== "kruskal" && text(t.algoStart, "start", 90)}
            <label className="check">
              <input type="checkbox" checked={spec.directed} onChange={(e) => set({ directed: e.target.checked })} />
              <span>{t.algoDirected}</span>
            </label>
          </div>
        </>
      )}

      {spec.topic === "tree" && (
        <>
          {segmented(TREE_KINDS, (k) => w.treeNames[k], spec.kind, (kind) => set({ kind }))}
          {row(t.algoData, "data")}
        </>
      )}

      {spec.topic === "ds" && (
        <>
          {segmented(DS_KINDS, (k) => w.dsNames[k], spec.kind, (kind) => set({ kind }))}
          {row(spec.kind === "stack" || spec.kind === "queue" ? t.algoOps : t.algoKeys, "ops")}
          {(spec.kind === "chaining" || spec.kind === "probing") && <div className="range-grid">{text(t.algoSize, "m")}</div>}
        </>
      )}

      {spec.topic === "dp" && (
        <>
          {segmented(DP_PROBLEMS, (p) => w.dpNames[p], spec.problem, (problem) => set({ problem }))}
          {(spec.problem === "lcs" || spec.problem === "edit") && (
            <>
              {row(t.algoX, "a")}
              {row(t.algoY, "b")}
            </>
          )}
          {spec.problem === "knapsack" && (
            <>
              {row(t.algoWeights, "a")}
              {row(t.algoValues, "b")}
              <div className="range-grid">{text(t.algoCapacity, "c")}</div>
            </>
          )}
          {spec.problem === "coins" && (
            <>
              {row(t.algoCoins, "a")}
              <div className="range-grid">{text(t.algoAmount, "c")}</div>
            </>
          )}
        </>
      )}

      {spec.topic === "growth" && (
        <>
          {segmented(GROWTH_MODES, (m) => t.growthModes[m], spec.mode, (mode) => set({ mode }))}
          {spec.mode === "master" ? (
            <>
              <small className="hint mono">T(n) = a·T(n/b) + Θ(nᵈ)</small>
              <div className="range-grid">
                {text("a", "a")}
                {text("b", "b")}
                {text("d", "d")}
              </div>
            </>
          ) : (
            <div className="range-grid">{text(t.algoN, "n")}</div>
          )}
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
