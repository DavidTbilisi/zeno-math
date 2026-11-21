// Learn (#448): #/learn lists every topic on its shelf, from first steps to university, each with the learner's bar;
// #/learn/<topic> is one topic's page: how far the learner is and their next level, what they will learn (each skill
// with its three levels ticked), hands-on pieces to try right on the page, and the topic's tools and games.
import { useState } from "react";
import { OpenOnBoard } from "../components/OpenOnBoard";
import { SiteBar, SiteFoot } from "../components/SiteBar";
import { Track } from "../components/Track";
import { useI18n } from "../i18n";
import { entriesOf, entryName, type LibEntry } from "../library";
import { InlinePiece } from "../live/InlinePiece";
import { fill } from "../math/text";
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
  const pieces = entries.filter((e) => e.kind === "piece");
  const shown = pieces.slice(0, INLINE);
  const tools = [...entries.filter((e) => e.kind === "tool"), ...pieces.slice(INLINE)];
  const games = entries.filter((e) => e.kind === "game");
  const boardName = fill(s.boardName, { topic: name });

  return (
    <div className="z site">
      <SiteBar here="learn" />
      <main className="z-page site-topic-page">
        <a className="site-back" href="#/learn">← {s.otherTopics}</a>
        <h1 className="z-page-title"><span className="site-topic-icon" aria-hidden="true">{topic.icon}</span> {name}</h1>
        <p className="course-lede">{s.topics[id].about}</p>

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
                  <InlinePiece kind={kind} label={entryName(t, e)} />
                  <figcaption>
                    <a href={`#/library/${e.path}`}>{entryName(t, e)}</a>
                    <OpenOnBoard slot={id} name={boardName} path={e.path} className="z-btn z-btn-line small" />
                  </figcaption>
                </figure>
              );
            })}
          </section>
        )}

        {tools.length > 0 && <EntryCards id="topic-tools" head={s.toolsHead} entries={tools} />}
        {games.length > 0 && <EntryCards id="topic-games" head={s.gamesHead} entries={games} />}
      </main>
      <SiteFoot />
    </div>
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
