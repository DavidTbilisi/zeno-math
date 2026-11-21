// The library (#448): #/library has every tool, hands-on piece and game of the board's menus, grouped as the menus
// are, with a search; #/library/live/<kind> is a piece or game used right on the page, and #/library/tool/<kind>[/<start>]
// a tool's dialog drawn into the page (as in the board's right-click panel), with the picture it makes. Any of them
// opens on a board to keep.
import { useState } from "react";
import { OpenOnBoard } from "../components/OpenOnBoard";
import { SiteBar, SiteFoot } from "../components/SiteBar";
import { ToolOnPage } from "../components/ToolOnPage";
import { useI18n } from "../i18n";
import { entryName, LIBRARY, libEntry, searchLibrary, sectionName, topicsOf, type LibEntry } from "../library";
import { InlinePiece } from "../live/InlinePiece";
import type { LiveKind } from "../math/live";
import { fill } from "../math/text";
import { isLiveEntry } from "../menus";
import { EntryCards } from "./LearnPage";

export function LibraryPage({ path }: { path?: string }) {
  const e = path ? libEntry(path) : undefined;
  return e ? <EntryPage e={e} /> : <LibraryIndex />;
}

function LibraryIndex() {
  const { t } = useI18n();
  const s = t.site;
  const [q, setQ] = useState("");
  const found = q.trim() ? searchLibrary(t, q) : null;
  // The menus' groups, each with its titled sections, in the board's order.
  const groups = [...new Set(LIBRARY.map((e) => e.group))];
  return (
    <div className="z site">
      <SiteBar here="library" />
      <main className="z-page site-library">
        <h1 className="z-page-title">{s.libraryTitle}</h1>
        <p className="course-lede">{s.libraryLede}</p>
        <input className="site-search" type="search" value={q} placeholder={s.search} aria-label={s.search} onChange={(ev) => setQ(ev.target.value)} />
        {found ? (
          found.length ? (
            <EntryCards id="lib-found" head={`${found.length}`} entries={found} sub={(e) => sectionName(t, e.section, e.group)} />
          ) : (
            <p className="course-count" role="status">{fill(s.searchNone, { q: q.trim() })}</p>
          )
        ) : (
          groups.map((g) => (
            <section key={g.label} className="site-group" aria-labelledby={`lib-${g.label}`}>
              <h2 id={`lib-${g.label}`} className="site-shelf">{t[g.title ?? g.label]}</h2>
              {g.sections.map((sec, n) => {
                const items = LIBRARY.filter((e) => e.section === sec);
                return items.length ? <EntryCards key={n} id={`lib-${g.label}-${n}`} head={sectionName(t, sec, g)} entries={items} /> : null;
              })}
            </section>
          ))
        )}
      </main>
      <SiteFoot />
    </div>
  );
}

function EntryPage({ e }: { e: LibEntry }) {
  const { t } = useI18n();
  const s = t.site;
  const name = entryName(t, e);
  const topics = topicsOf(e);
  const slot = topics[0]?.id ?? "library";
  const boardName = fill(s.boardName, { topic: topics[0] ? s.topics[topics[0].id].name : s.library });
  return (
    <div className="z site">
      <SiteBar here="library" />
      <main className="z-page site-entry">
        <a className="site-back" href="#/library">← {s.backLibrary}</a>
        <h1 className="z-page-title"><span className="site-card-icon" aria-hidden="true">{e.icon}</span> {name}</h1>
        <p className="site-entry-where">
          <span className="site-kind">{{ tool: s.kindTool, piece: s.kindPiece, game: s.kindGame }[e.kind]}</span>
          <span>{sectionName(t, e.section, e.group)}</span>
          {topics.length > 0 && (
            <span>
              {s.inTopics}: {topics.map((x, n) => <span key={x.id}>{n ? ", " : ""}<a href={`#/learn/${x.id}`}>{s.topics[x.id].name}</a></span>)}
            </span>
          )}
        </p>
        {isLiveEntry(e.entry) ? (
          <InlinePiece key={e.path} kind={e.entry.live as LiveKind} label={name} />
        ) : (
          <ToolOnPage key={e.path} entry={e.entry} name={name} onClose={() => (location.hash = "#/library")} />
        )}
        <div className="site-entry-go">
          <OpenOnBoard slot={slot} name={boardName} path={e.path} />
        </div>
      </main>
      <SiteFoot />
    </div>
  );
}
