import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import {
  ALGO_PRESETS,
  ALGO_TOPICS,
  DP_PROBLEMS,
  DS_KINDS,
  GRAPH_ALGOS,
  GROWTH_MODES,
  RECUR_PROBLEMS,
  renderAlgo,
  SEARCH_ALGOS,
  SORT_ALGOS,
  SORT_VIEWS,
  STRING_ALGOS,
  TREE_KINDS,
  type AlgoSpec,
  type AlgoSpecOf,
  type AlgoTopic,
} from "../math/algo";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";

type Specs = { [K in AlgoTopic]: AlgoSpecOf<K> };

export function AlgoDialog({ initial, start, onSubmit, onClose }: {
  initial?: AlgoSpec;
  start?: string;
  onSubmit: (spec: AlgoSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.algoWords;
  const [topic, setTopic] = useState<AlgoTopic>(initial?.topic ?? startOr(start, ALGO_TOPICS, "sort"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(ALGO_TOPICS.map((k) => [k, ALGO_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  // Changing the input shows the whole trace again; the slider then steps through the new one.
  const set = (patch: Partial<AlgoSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch, step: undefined } });

  const result = useMemo((): { rendered?: ReturnType<typeof renderAlgo>; error?: string } => {
    try {
      return { rendered: renderAlgo(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);
  const steps = result.rendered?.steps ?? 0;
  const shown = Math.min(spec.step ?? steps, steps);

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
    <Segmented className="wrap" itemClassName="math-label" items={keys} value={current} onChange={(k) => onPick(k)} label={(k) => label(k)} />
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
        <Tabs items={ALGO_TOPICS} value={topic} onChange={setTopic} label={(k) => t.algoTopics[k]} />
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
          <div className="range-grid">
            <span className="hint">{t.algoView}</span>
            {segmented(SORT_VIEWS, (v) => t.algoViews[v], spec.view ?? "cells", (view) => set({ view }))}
          </div>
        </>
      )}

      {spec.topic === "search" && (
        <>
          {segmented(SEARCH_ALGOS, (a) => w.searchNames[a], spec.algo, (algo) => set({ algo }))}
          {row(t.algoData, "data")}
          <div className="range-grid">{text(spec.algo === "twoptr" ? t.algoSum : spec.algo === "window" ? t.algoWindow : t.algoTarget, "target", 90)}</div>
        </>
      )}

      {spec.topic === "graph" && (
        <>
          {segmented(GRAPH_ALGOS, (a) => w.graphNames[a], spec.algo, (algo) => set({ algo, ...(algo === "topo" ? { directed: true } : {}) }))}
          {row(t.algoEdges, "edges")}
          <div className="range-grid">
            {!["topo", "kruskal", "floyd", "unionfind"].includes(spec.algo) && text(t.algoStart, "start", 90)}
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

      {spec.topic === "recur" && (
        <>
          {segmented(RECUR_PROBLEMS, (p) => w.recur.names[p], spec.problem, (problem) => set({ problem }))}
          {spec.problem === "subsets" ? (
            <>
              {row(t.algoNumbers, "data")}
              <div className="range-grid">{text(t.algoGoal, "target", 90)}</div>
            </>
          ) : (
            <div className="range-grid">
              {text("n", "n")}
              {spec.problem === "fib" && (
                <label className="check">
                  <input type="checkbox" checked={spec.memo} onChange={(e) => set({ memo: e.target.checked })} />
                  <span>{t.algoMemo}</span>
                </label>
              )}
            </div>
          )}
        </>
      )}

      {spec.topic === "string" && (
        <>
          {segmented(STRING_ALGOS, (a) => w.str.names[a], spec.algo, (algo) => set({ algo }))}
          {row(t.algoText, "text")}
          {row(t.algoPattern, "pattern")}
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

      {steps > 0 && (
        <div className="field">
          <span>
            {t.stepByStep}: {shown} / {steps}
          </span>
          <input
            type="range"
            min={0}
            max={steps}
            step={1}
            value={shown}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSpecs({ ...specs, [topic]: { ...spec, step: v >= steps ? undefined : v } });
            }}
          />
        </div>
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
