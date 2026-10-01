import { useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { LOGIC_PRESETS, LOGIC_TOPICS, renderLogic, type LogicSpec, type LogicTopic } from "../math/logic";
import { BOARD_MODES, BOARD_PRESETS, type BoardSpec } from "../math/logicPuzzles";
import { SW_ASKS, SW_PATTERNS, SW_PRESETS, type SwPattern, type SwSpec } from "../math/logicArgue";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";

type Specs = Record<LogicTopic, LogicSpec>;
type Field = "f" | "g" | "vals";

const LOGIC_SYMBOLS = ["¬", "∧", "∨", "→", "↔", "⊕", "↑", "↓", "(", ")", "⊤", "⊥"];
const SET_SYMBOLS = ["∪", "∩", "∖", "Δ", "′", "(", ")", "U", "∅"];
const NF_SYMBOLS = ["′", "+", "(", ")", "⊕", "m(", "d("];

/** Places, pool, constraints, an optional assumption and answer options for a constraint board. */
function BoardFields({ spec, set }: { spec: LogicSpec; set: (patch: Partial<LogicSpec>) => void }) {
  const { t } = useI18n();
  const b = spec.board ?? BOARD_PRESETS[0].spec.board!;
  const put = (patch: Partial<BoardSpec>) => set({ board: { ...b, ...patch } });
  const area = (key: "rules" | "options", label: string, rows: number) => (
    <label className="field">
      <span>{label}</span>
      <textarea className="mono" rows={rows} spellCheck={false} value={b[key]} onChange={(e) => put({ [key]: e.target.value })} />
    </label>
  );
  const line = (key: "places" | "pool" | "ask", label: string) => (
    <label className="field">
      <span>{label}</span>
      <input className="mono" spellCheck={false} value={b[key]} onChange={(e) => put({ [key]: e.target.value })} />
    </label>
  );
  return (
    <>
      <Segmented items={BOARD_MODES} value={b.mode} onChange={(m) => put({ mode: m })} label={(m) => t.boardModes[m]} />
      {line("places", b.mode === "bins" ? t.boardPlaces : t.boardSlots)}
      {line("pool", t.boardPool)}
      {area("rules", t.boardRules, 4)}
      {line("ask", t.boardAsk)}
      {area("options", t.boardOptions, 3)}
    </>
  );
}

/** Legend, premises, background links, conclusion and options for a strengthen / weaken question. */
function SwFields({ spec, set }: { spec: LogicSpec; set: (patch: Partial<LogicSpec>) => void }) {
  const { t } = useI18n();
  const s = spec.sw ?? SW_PRESETS[0].spec.sw!;
  const put = (patch: Partial<SwSpec>) => set({ sw: { ...s, ...patch } });
  const area = (key: "legend" | "options", label: string, rows: number) => (
    <label className="field">
      <span>{label}</span>
      <textarea className="mono" rows={rows} spellCheck={false} value={s[key]} onChange={(e) => put({ [key]: e.target.value })} />
    </label>
  );
  const line = (key: "premises" | "links" | "conclusion", label: string) => (
    <label className="field">
      <span>{label}</span>
      <input className="mono" spellCheck={false} value={s[key]} onChange={(e) => put({ [key]: e.target.value })} />
    </label>
  );
  return (
    <>
      <Segmented items={SW_ASKS} value={s.ask} onChange={(a) => put({ ask: a })} label={(a) => t.swAsks[a]} />
      <label className="field">
        <span>{t.swPattern}</span>
        <select value={s.pattern} onChange={(e) => put({ pattern: e.target.value as SwPattern })}>
          {SW_PATTERNS.map((p) => (
            <option key={p} value={p}>
              {t.logicWords.sw.patterns[p].name}
            </option>
          ))}
        </select>
      </label>
      {area("legend", t.swLegend, 4)}
      {line("premises", t.swPremises)}
      {line("links", t.swLinks)}
      {line("conclusion", t.swConclusion)}
      {area("options", t.swOptions, 4)}
    </>
  );
}

export function LogicDialog({ initial, start, onSubmit, onClose }: {
  initial?: LogicSpec;
  start?: string;
  onSubmit: (spec: LogicSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.logicWords;
  const [topic, setTopic] = useState<LogicTopic>(initial?.topic ?? startOr(start, LOGIC_TOPICS, "table"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(LOGIC_TOPICS.map((k) => [k, LOGIC_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<LogicSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});
  const [focused, setFocused] = useState<Field>("f");

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderLogic(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  // Insert a symbol at the caret of the field that was used last.
  const insert = (sym: string) => {
    const field = focused === "vals" ? "f" : focused;
    const el = inputs.current[field];
    const value = spec[field];
    const a = el?.selectionStart ?? value.length;
    const b = el?.selectionEnd ?? value.length;
    set({ [field]: value.slice(0, a) + sym + value.slice(b) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(a + sym.length, a + sym.length);
    });
  };

  const field = (key: Field, label: string) => (
    <label className="field" key={`${topic}-${key}`}>
      <span>{label}</span>
      <input
        ref={(el) => {
          inputs.current[key] = el;
        }}
        className="mono"
        spellCheck={false}
        value={spec[key]}
        onFocus={() => setFocused(key)}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </label>
  );

  const symbols = topic === "sets" ? SET_SYMBOLS : topic === "nf" ? NF_SYMBOLS : LOGIC_SYMBOLS;
  const showTf = topic === "table" || topic === "equiv" || topic === "argument";

  return (
    <Modal
      title={initial ? t.editLogic : t.logic}
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
        <Tabs items={LOGIC_TOPICS} value={topic} onChange={setTopic} label={(k) => t.logicTopics[k]} />
      )}
      <small className="hint">{t.logicHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {LOGIC_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {topic === "board" ? (
        <BoardFields spec={spec} set={set} />
      ) : topic === "strengthen" ? (
        <SwFields spec={spec} set={set} />
      ) : topic === "knights" ? (
        <label className="field">
          <span>{t.knightsStatements}</span>
          <textarea className="mono" rows={4} spellCheck={false} value={spec.f} onChange={(e) => set({ f: e.target.value })} />
        </label>
      ) : topic === "argument" ? (
        <>
          {field("f", t.logicPremises)}
          {field("g", t.logicConclusion)}
        </>
      ) : topic === "equiv" ? (
        <>
          {field("f", t.logicFormula)}
          {field("g", t.logicSecond)}
        </>
      ) : topic === "sets" ? (
        <>
          {field("f", t.logicFormula)}
          {field("g", t.logicCompare)}
        </>
      ) : topic === "nf" ? (
        field("f", t.logicFunction)
      ) : topic === "circuit" ? (
        <>
          {field("f", t.logicFormula)}
          {field("vals", t.logicInputs)}
        </>
      ) : (
        field("f", t.logicFormula)
      )}

      {topic !== "board" && topic !== "knights" && topic !== "strengthen" && <div className="snippets">
        {symbols.map((sym) => (
          <button key={sym} className="chip" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(sym)}>
            {sym}
          </button>
        ))}
      </div>}

      {showTf && (
        <Segmented items={([true, false] as const)} value={spec.tf} onChange={(tf) => set({ tf })} label={(tf) => tf ? t.logicStyle.tf : t.logicStyle.bits} />
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
