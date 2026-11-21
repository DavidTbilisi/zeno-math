// "Symbols in this question" (#451): under a practice question, a button for each symbol it uses (symbolsIn), and one
// tap opens that symbol's card right there: its name, how to say it and what it means. Nothing about the answer.
import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { symbolOf, symbolsIn } from "../math/symbols";
import { SymbolCard, symWords } from "./SymbolCard";

export function QuestionSymbols({ words, tex }: { words: string; tex: string }) {
  const { t } = useI18n();
  const w = t.symbols;
  const found = useMemo(() => symbolsIn(words, tex), [words, tex]);
  const [open, setOpen] = useState<string | null>(null);
  const sym = open ? symbolOf(open) : undefined;
  if (!found.length) return null;
  return (
    <div className="q-symbols">
      <div className="q-symbols-row" role="group" aria-label={w.inQuestion}>
        <span className="q-symbols-label">{w.inQuestion}:</span>
        {found.map((s) => (
          <button key={s.id} type="button" className={`sym-chip${s.id === open ? " on" : ""}`} aria-expanded={s.id === open}
            onClick={() => setOpen(s.id === open ? null : s.id)}>
            <span aria-hidden="true">{s.glyph}</span> {symWords(t, s.id).name}
          </button>
        ))}
      </div>
      {sym && (
        <div className="q-symbols-card">
          <SymbolCard sym={sym} onPick={setOpen} headingLevel={3} />
          <div className="q-symbols-foot">
            <a href={`#/symbols/${sym.id}`} target="_blank" rel="noopener">{w.open} ↗</a>
            <button type="button" className="btn small ghost" onClick={() => setOpen(null)}>{w.close}</button>
          </div>
        </div>
      )}
    </div>
  );
}
