import { useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { CX_OPS, CX_PRESETS, CX_TOPICS, renderComplex, type CxSpec, type CxTopic } from "../math/complex";
import type { RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { Modal } from "./Modal";
import { Segmented, Tabs, startOr } from "./ui";

type Specs = Record<CxTopic, CxSpec>;
type Field = "z" | "w" | "n" | "a" | "b" | "c" | "t";

const SYMBOLS = ["i", "π", "√(", "∠", "°", "e^(i", ")"];
const OP_LABEL: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

export function ComplexDialog({ initial, start, onSubmit, onClose }: {
  initial?: CxSpec;
  start?: string;
  onSubmit: (spec: CxSpec, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const w = t.cxWords;
  const [topic, setTopic] = useState<CxTopic>(initial?.topic ?? startOr(start, CX_TOPICS, "form"));
  const [specs, setSpecs] = useState<Specs>(() => {
    const s = Object.fromEntries(CX_TOPICS.map((k) => [k, CX_PRESETS[k][0].spec])) as Specs;
    return initial ? { ...s, [initial.topic]: initial } : s;
  });
  const spec = specs[topic];
  const set = (patch: Partial<CxSpec>) => setSpecs({ ...specs, [topic]: { ...spec, ...patch } });
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});
  const [focused, setFocused] = useState<Field>("z");

  const result = useMemo((): { rendered?: RenderedSvg; error?: string } => {
    try {
      return { rendered: renderComplex(spec, w) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [spec, w]);

  // Insert a symbol at the caret of the field used last.
  const insert = (sym: string) => {
    const el = inputs.current[focused];
    const value = spec[focused];
    const a = el?.selectionStart ?? value.length;
    const b = el?.selectionEnd ?? value.length;
    set({ [focused]: value.slice(0, a) + sym + value.slice(b) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(a + sym.length, a + sym.length);
    });
  };

  const field = (key: Field, label: string, width?: number) => (
    <label key={key}>
      <span>{label}</span>
      <input
        ref={(el) => {
          inputs.current[key] = el;
        }}
        className="mono"
        style={width ? { width } : undefined}
        spellCheck={false}
        value={spec[key]}
        onFocus={() => setFocused(key)}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </label>
  );

  return (
    <Modal
      title={initial ? t.editComplex : t.complex}
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
        <Tabs items={CX_TOPICS} value={topic} onChange={setTopic} label={(k) => t.cxTopics[k]} />
      )}
      <small className="hint">{t.cxHints[topic]}</small>

      <div className="field">
        <span>{t.examples}</span>
        <div className="snippets">
          {CX_PRESETS[topic].map((p, i) => (
            <button key={i} className="chip text math-label" onClick={() => setSpecs({ ...specs, [topic]: p.spec })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="range-grid">
        {(topic === "form" || topic === "ops" || topic === "powers" || topic === "roots") && field("z", "z", 170)}
        {topic === "ops" && field("w", "w", 170)}
        {topic === "powers" && field("n", t.cxPower, 80)}
        {topic === "roots" && field("n", t.cxRootsN, 80)}
        {topic === "quadratic" && (
          <>
            {field("a", "a", 80)}
            {field("b", "b", 80)}
            {field("c", "c", 80)}
          </>
        )}
        {topic === "euler" && field("t", t.cxAngle, 140)}
      </div>
      {topic === "ops" && (
        <Segmented items={CX_OPS} value={spec.op} onChange={(op) => set({ op })} label={(op) => OP_LABEL[op]} />
      )}
      <div className="snippets">
        {SYMBOLS.map((sym) => (
          <button key={sym} className="chip" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(sym)}>
            {sym}
          </button>
        ))}
      </div>

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
