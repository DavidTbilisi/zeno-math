// Maths symbols (#451): #/symbols lists every symbol by group, each a tile with the sign and its name; a search box
// finds one by its name, its reading or its meaning, or by the symbol itself pasted in. #/symbols/<id> opens that
// symbol's card above the list (SymbolCard.tsx). Practice opens the same card from "Symbols in this question".
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteBar, SiteFoot } from "../components/SiteBar";
import { SymbolCard, symWords } from "../components/SymbolCard";
import { useI18n } from "../i18n";
import { fill } from "../math/text";
import { searchSymbols, SYM_GROUPS, symbolOf, type Sym, type SymGroup } from "../math/symbols";

export function SymbolsPage({ id }: { id?: string }) {
  const { t } = useI18n();
  const w = t.symbols;
  const open = id ? symbolOf(id) : undefined;
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<SymGroup | "all">("all");
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) card.current?.scrollIntoView({ block: "start" });
  }, [open]);
  const found = useMemo(() => {
    const words = (s: Sym) => {
      const x = symWords(t, s.id);
      return [x.name, x.say, x.means];
    };
    return searchSymbols(q, words);
  }, [q, t]);
  const groups = SYM_GROUPS.filter((g) => group === "all" || g === group);

  return (
    <div className="z site">
      <SiteBar here="learn" />
      <main className="z-page site-symbols">
        <a className="site-back" href="#/learn">← {t.site.learn}</a>
        <h1 className="z-page-title">{w.title}</h1>
        <p className="course-lede">{w.lede}</p>
        {open && (
          <div ref={card} className="sym-open">
            <SymbolCard sym={open} />
            <a className="site-back" href="#/symbols">{w.open}</a>
          </div>
        )}
        <div className="sym-search">
          <label>
            <span className="sr-only">{w.search}</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={w.searchHint} aria-label={w.search} />
          </label>
        </div>
        <div className="site-lesson-chips" role="group" aria-label={w.title}>
          {(["all", ...SYM_GROUPS] as const).map((g) => (
            <button key={g} type="button" className={`btn small${g === group ? " on" : " ghost"}`} aria-pressed={g === group} onClick={() => setGroup(g)}>
              {g === "all" ? w.all : w.groups[g]}
            </button>
          ))}
        </div>
        {found.length === 0 && <p className="course-count">{fill(w.noMatch, { q })}</p>}
        {groups.map((g) => {
          const list = found.filter((s) => s.group === g);
          if (!list.length) return null;
          return (
            <section key={g} className="site-section" aria-labelledby={`sym-g-${g}`}>
              <h2 id={`sym-g-${g}`} className="site-shelf">{w.groups[g]}</h2>
              <ul className="sym-tiles">
                {list.map((s) => (
                  <li key={s.id}>
                    <a className={`sym-tile${s === open ? " on" : ""}`} href={`#/symbols/${s.id}`} aria-current={s === open ? "true" : undefined}>
                      <span className="sym-tile-glyph" aria-hidden="true">{s.glyph}</span>
                      <span className="sym-tile-name">{symWords(t, s.id).name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
      <SiteFoot />
    </div>
  );
}
