// Learn (#448): #/learn lists every topic on its shelf, from first steps to university, each with the learner's bar;
// #/learn/<topic> is one topic's page: what the topic is and where it is used (#450), its ideas' cards (#579), how far
// the learner is and their next level, what they will learn (each skill with its three levels ticked), hands-on pieces
// to try right on the page, the topic's tools and games, and the symbols it uses (#451). #/learn links to #/explain,
// every topic's intro on one page, and to #/symbols.
import { useState } from "react";
import { Explainer } from "../components/Explainer";
import { IdeaCards } from "../components/IdeaCard";
import { OpenOnBoard } from "../components/OpenOnBoard";
import { SiteBar, SiteFoot } from "../components/SiteBar";
import { symWords } from "../components/SymbolCard";
import { ToolOnPage } from "../components/ToolOnPage";
import { Track } from "../components/Track";
import { useI18n } from "../i18n";
import { entriesOf, entryName, libEntry, type LibEntry } from "../library";
import { InlinePiece } from "../live/InlinePiece";
import { isLiveEntry } from "../menus";
import { SYMBOLS } from "../math/symbols";
import { fill } from "../math/text";
import { EXPLAINERS } from "../model/explainers";
import { cardsOf } from "../model/ideaCards";
import { isTopic, SHELVES, TOPICS, topicOf, topicProgress, type TopicId } from "../model/topics";
import { readWork } from "../work";
import { nextHref, TopicTile } from "./SiteHome";

export function LearnPage({ topic }: { topic?: string }) {
  const { t } = useI18n();
  const [work] = useState(readWork);
  if (isTopic(topic)) return <TopicPage id={topic} work={work} />;
  const s = t.site;
  return (
    <div className="z site">
      <SiteBar here="learn" />
      <main className="z-page site-learn">
        <h1 className="z-page-title">{s.learnTitle}</h1>
        <p className="course-lede">{s.learnLede}</p>
        <p className="site-explain-links">
          <a className="site-explain-link" href="#/explain">{s.explain.indexLink} →</a>
          <a className="site-explain-link" href="#/symbols">{t.symbols.title} →</a>
        </p>
        {SHELVES.map((shelf) => (
          <section key={shelf} className="site-section" aria-labelledby={`shelf-${shelf}`}>
            <h2 id={`shelf-${shelf}`} className="site-shelf">{s.shelves[shelf]}</h2>
            <ul className="site-topics">
              {TOPICS.filter((x) => x.shelf === shelf).map((x) => <TopicTile key={x.id} id={x.id} work={work} />)}
            </ul>
          </section>
        ))}
      </main>
      <SiteFoot />
    </div>
  );
}

const TICK = { secure: "✓", behind: "✓", open: "" } as const;
/** How many hands-on pieces the topic page draws right on the page; the rest are cards like the tools. */
const INLINE = 2;

function TopicPage({ id, work }: { id: TopicId; work: ReturnType<typeof readWork> }) {
  const { t } = useI18n();
  const s = t.site;
  const topic = topicOf(id);
  const name = s.topics[id].name;
  const p = topicProgress(topic, work);
  const entries = entriesOf(topic);
  // The intro's piece comes first (it may be a game, or from another topic's shelf), then the topic's own pieces.
  const first = libEntry(`live/${EXPLAINERS[id].try}`);
  const pieces = [...(first ? [first] : []), ...entries.filter((e) => e.kind === "piece" && e !== first)];
  const shown = pieces.slice(0, INLINE);
  const lessons = entries.filter((e) => e.kind === "tool");
  const more = pieces.slice(INLINE);
  const games = entries.filter((e) => e.kind === "game" && e !== first);
  const boardName = fill(s.boardName, { topic: name });
  const symbols = SYMBOLS.filter((x) => x.topics.includes(id));
  const ideas = cardsOf(topic.skills);

  return (
    <div className="z site">
      <SiteBar here="learn" />
      <main className="z-page site-topic-page">
        <a className="site-back" href="#/learn">← {s.otherTopics}</a>
        <h1 className="z-page-title"><span className="site-topic-icon" aria-hidden="true">{topic.icon}</span> {name}</h1>
        <p className="course-lede">{s.topics[id].about}</p>
        <Explainer id={id} />
        {ideas.length > 0 && <IdeaCards key={id} ideas={ideas} />}

        {p.total > 0 ? (
          <section className="course-next" aria-label={t.roadmap.next}>
            <div className="course-next-text">
              <Track p={{ done: p.secure, behind: p.behind, total: p.total }} />
              <span className="course-count">{fill(p.behind ? s.levelsBehind : s.levels, { secure: p.secure, behind: p.behind, total: p.total })}</span>
              {p.next ? (
                <strong>{t.roadmap.next}: {fill(t.roadmap.nextLine, { skill: t.pracWords.skills[(p.next.item as { skill: keyof typeof t.pracWords.skills }).skill], level: p.next.level ?? 1 })}</strong>
              ) : (
                <strong>{s.topicDone}</strong>
              )}
            </div>
            {p.next && <a className="z-btn z-btn-marker" href={nextHref(p.next)}>{s.practiseTopic}</a>}
          </section>
        ) : (
          <p className="course-count">{s.noPractice}</p>
        )}

        {topic.skills.length > 0 && (
          <section className="site-section" aria-labelledby="topic-learn">
            <h2 id="topic-learn">{s.learnHead}</h2>
            <ul className="site-skills">
              {topic.skills.map((k) => (
                <li key={k} className="site-skill">
                  <span className="road-name">{t.pracWords.skills[k]}</span>
                  <span className="site-levels">
                    {([1, 2, 3] as const).map((L) => {
                      const st = work.s.level(k, L);
                      return (
                        <a key={L} className={`site-level ${st}`} href={`#/practice/${k}.${L}`}
                          aria-label={`${t.pracWords.skills[k]}, ${fill(s.levelShort, { level: L })}, ${t.roadmap.legend[st === "secure" ? "done" : st]}`}>
                          <i className={`road-tick ${st === "secure" ? "done" : st}`} aria-hidden="true">{TICK[st]}</i>
                          <span aria-hidden="true">{L}</span>
                        </a>
                      );
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {shown.length > 0 && (
          <section className="site-section" aria-labelledby="topic-try">
            <h2 id="topic-try">{s.tryHead}</h2>
            {shown.map((e) => {
              const kind = (e.entry as { live: Parameters<typeof InlinePiece>[0]["kind"] }).live;
              return (
                <figure key={e.path} className="site-try">
                  <InlinePiece kind={kind} label={entryName(t, e)} predict />
                  <figcaption>
                    <a href={`#/library/${e.path}`}>{entryName(t, e)}</a>
                    <OpenOnBoard slot={id} name={boardName} path={e.path} className="z-btn z-btn-line small" />
                  </figcaption>
                </figure>
              );
            })}
          </section>
        )}

        {lessons.length > 0 && <Lessons slot={id} lessons={lessons} boardName={boardName} />}
        {more.length > 0 && <EntryCards id="topic-more" head={s.moreHead} entries={more} />}
        {games.length > 0 && <EntryCards id="topic-games" head={s.gamesHead} entries={games} />}
        {symbols.length > 0 && (
          <section className="site-section" aria-labelledby="topic-symbols">
            <h2 id="topic-symbols">{t.symbols.title}</h2>
            <div className="sym-chips">
              {symbols.map((x) => (
                <a key={x.id} className="sym-chip" href={`#/symbols/${x.id}`}><span aria-hidden="true">{x.glyph}</span> {symWords(t, x.id).name}</a>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFoot />
    </div>
  );
}

/** The topic's tools, which are lessons as much as tools (#448): chips to choose one, and the chosen one's dialog drawn
 *  right into the page with the picture it makes, a way onto a board and to its own page. The first is open to start. */
function Lessons({ slot, lessons, boardName }: { slot: TopicId; lessons: readonly LibEntry[]; boardName: string }) {
  const { t } = useI18n();
  const s = t.site;
  const [open, setOpen] = useState<string | null>(lessons[0]?.path ?? null);
  const on = lessons.find((e) => e.path === open);
  return (
    <section className="site-section" aria-labelledby="topic-lessons">
      <h2 id="topic-lessons">{s.lessonsHead}</h2>
      <p className="course-count">{s.lessonsLede}</p>
      <div className="site-lesson-chips" role="group" aria-label={s.lessonsHead}>
        {lessons.map((e) => (
          <button key={e.path} className={`btn small${e.path === open ? " on" : " ghost"}`} aria-pressed={e.path === open} onClick={() => setOpen(e.path === open ? null : e.path)}>
            <span aria-hidden="true">{e.icon}</span> {entryName(t, e)}
          </button>
        ))}
      </div>
      {on && !isLiveEntry(on.entry) && (
        <div className="site-lesson">
          <ToolOnPage key={on.path} entry={on.entry} name={entryName(t, on)} onClose={() => setOpen(null)} />
          <div className="site-entry-go">
            <OpenOnBoard slot={slot} name={boardName} path={on.path} className="z-btn z-btn-line small" />
            <a href={`#/library/${on.path}`}>{s.ownPage} →</a>
          </div>
        </div>
      )}
    </section>
  );
}

/** Library entries as cards: icon, name and what kind of thing it is, each to its own page. */
export function EntryCards({ id, head, entries, sub }: { id: string; head: string; entries: readonly LibEntry[]; sub?: (e: LibEntry) => string }) {
  const { t } = useI18n();
  const kind = { tool: t.site.kindTool, piece: t.site.kindPiece, game: t.site.kindGame };
  return (
    <section className="site-section" aria-labelledby={id}>
      <h2 id={id}>{head}</h2>
      <ul className="site-cards">
        {entries.map((e) => (
          <li key={e.path}>
            <a className="site-card" href={`#/library/${e.path}`}>
              <span className="site-card-icon" aria-hidden="true">{e.icon}</span>
              <span className="site-card-text">
                <strong>{entryName(t, e)}</strong>
                <span className="site-kind">{sub ? sub(e) : kind[e.kind]}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
