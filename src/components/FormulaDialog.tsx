import { useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { latexToSvg, type RenderedSvg } from "../math/latex";
import { svgToDataUrl } from "../math/svg";
import { ColorSwatches, Modal } from "./Modal";

export type FormulaData = { tex: string; color: string };

// Snippets inserted at the cursor; "|" marks where the cursor lands afterwards.
const SNIPPETS: { label: string; tex: string }[] = [
  { label: "a/b", tex: "\\frac{|}{}" },
  { label: "√", tex: "\\sqrt{|}" },
  { label: "ⁿ√", tex: "\\sqrt[|]{}" },
  { label: "xⁿ", tex: "^{|}" },
  { label: "xₙ", tex: "_{|}" },
  { label: "∑", tex: "\\sum_{i=1}^{n} |" },
  { label: "∫", tex: "\\int_{a}^{b} | \\,dx" },
  { label: "lim", tex: "\\lim_{x \\to |}" },
  { label: "( )", tex: "\\left( | \\right)" },
  { label: "π", tex: "\\pi" },
  { label: "α", tex: "\\alpha" },
  { label: "θ", tex: "\\theta" },
  { label: "∞", tex: "\\infty" },
  { label: "≤", tex: "\\le " },
  { label: "≥", tex: "\\ge " },
  { label: "≠", tex: "\\ne " },
  { label: "±", tex: "\\pm " },
  { label: "·", tex: "\\cdot " },
  { label: "→", tex: "\\Rightarrow " },
  { label: "∈", tex: "\\in " },
  { label: "sin", tex: "\\sin " },
  { label: "log", tex: "\\log_{|}" },
  { label: "{ ,", tex: "\\begin{cases} | \\\\  \\end{cases}" },
  { label: "[ ]", tex: "\\begin{pmatrix} | & \\\\  & \\end{pmatrix}" },
];

export const EXAMPLE_TEX = "x_{1,2} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}";

export function FormulaDialog({ initial, onSubmit, onClose }: {
  initial?: FormulaData;
  onSubmit: (data: FormulaData, rendered: RenderedSvg) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [tex, setTex] = useState(initial?.tex ?? EXAMPLE_TEX);
  const [color, setColor] = useState(initial?.color ?? "#1e1e1e");
  const ref = useRef<HTMLTextAreaElement>(null);

  const result = useMemo(() => {
    if (!tex.trim()) return { error: "" };
    try {
      return { rendered: latexToSvg(tex, color) };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [tex, color]);

  const insertSnippet = (snippet: string) => {
    const el = ref.current!;
    const [before, after = ""] = snippet.split("|");
    const start = el.selectionStart;
    const next = tex.slice(0, start) + before + after + tex.slice(el.selectionEnd);
    setTex(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length);
    });
  };

  const submit = () => result.rendered && onSubmit({ tex, color }, result.rendered);

  return (
    <Modal
      title={initial ? t.editFormula : t.formula}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{t.cancel}</button>
          <button className="btn primary" disabled={!result.rendered} onClick={submit}>
            {initial ? t.update : t.insert}
          </button>
        </>
      }
    >
      <div className="snippets">
        {SNIPPETS.map((s) => (
          <button key={s.label} type="button" className="chip" title={s.tex.replace("|", "")} onClick={() => insertSnippet(s.tex)}>
            {s.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span>{t.latexSource}</span>
        <textarea
          ref={ref}
          className="mono"
          rows={4}
          value={tex}
          spellCheck={false}
          autoFocus
          onChange={(e) => setTex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
        />
      </label>
      <div className="field-row">
        <span className="field-label">{t.color}</span>
        <ColorSwatches value={color} onChange={setColor} />
      </div>
      <div className="field">
        <span>{t.preview}</span>
        <div className="preview">
          {result.rendered ? (
            <img src={svgToDataUrl(result.rendered.svg)} alt={tex} style={{ maxWidth: "100%" }} />
          ) : (
            <span className="error">{result.error}</span>
          )}
        </div>
      </div>
    </Modal>
  );
}
