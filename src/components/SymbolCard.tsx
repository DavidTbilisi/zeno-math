// One maths symbol's card (#451): the sign, its name, how to say it (with a Listen button when the browser has a voice
// for the language), what it means, an example with its reading, the symbols easily taken for it and the topics it
// turns up in. On #/symbols and in the popover practice opens from "Symbols in this question".
import { useEffect, useState } from "react";
import { useI18n, type Lang } from "../i18n";
import { symbolOf, type Sym } from "../math/symbols";

/** The browser's voice for a language, if it has one (the list loads late in some browsers). */
export function useVoice(lang: Lang): SpeechSynthesisVoice | null {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return;
    const pick = () => setVoice(synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null);
    pick();
    synth.addEventListener?.("voiceschanged", pick);
    return () => synth.removeEventListener?.("voiceschanged", pick);
  }, [lang]);
  return voice;
}

export function speak(text: string, voice: SpeechSynthesisVoice) {
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export const symWords = (t: ReturnType<typeof useI18n>["t"], id: string) => {
  const [name, say, means, example] = (t.symbols.items as Record<string, readonly string[]>)[id] ?? [id, "", "", ""];
  return { name, say, means, example };
};

export function SymbolCard({ sym, onPick, headingLevel = 2 }: { sym: Sym; onPick?: (id: string) => void; headingLevel?: 2 | 3 }) {
  const { t, lang } = useI18n();
  const w = t.symbols;
  const words = symWords(t, sym.id);
  const voice = useVoice(lang);
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="sym-card" aria-labelledby={`sym-${sym.id}`}>
      <div className="sym-glyph" aria-hidden="true">{sym.glyph}</div>
      <div className="sym-body">
        <H id={`sym-${sym.id}`} className="sym-name">{words.name}</H>
        <p className="sym-group">{w.groups[sym.group]}</p>
        <dl className="sym-facts">
          <dt>{w.say}</dt>
          <dd>
            “{words.say}”
            {voice && (
              <button type="button" className="btn small ghost sym-listen" onClick={() => speak(`${words.say}. ${words.example}`, voice)}>
                <span aria-hidden="true">🔊</span> {w.listen}
              </button>
            )}
          </dd>
          <dt>{w.means}</dt>
          <dd>{words.means}</dd>
          <dt>{w.example}</dt>
          <dd><span className="sym-example">{sym.example}</span> <span className="sym-reading">“{words.example}”</span></dd>
          {sym.confused && sym.confused.length > 0 && (
            <>
              <dt>{w.confused}</dt>
              <dd className="sym-chips">
                {sym.confused.map((id) => {
                  const o = symbolOf(id);
                  if (!o) return null;
                  const label = <><span aria-hidden="true">{o.glyph}</span> {symWords(t, id).name}</>;
                  return onPick ? (
                    <button key={id} type="button" className="sym-chip" onClick={() => onPick(id)}>{label}</button>
                  ) : (
                    <a key={id} className="sym-chip" href={`#/symbols/${id}`}>{label}</a>
                  );
                })}
              </dd>
            </>
          )}
          <dt>{w.where}</dt>
          <dd className="sym-chips">
            {sym.topics.map((id) => <a key={id} className="sym-chip" href={`#/learn/${id}`}>{t.site.topics[id].name}</a>)}
          </dd>
        </dl>
      </div>
    </article>
  );
}
