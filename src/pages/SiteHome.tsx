// The site's home (#448): a learner starts from learning, not from a canvas. A hero with the two ways in (a goal, a
// topic), the roadmap they last opened with its next step, every goal with its bar, the featured topics with theirs,
// and plain practice. The boards are one section of the site now (#/boards).
import { useState } from "react";
import { starsHere, useClassGames } from "../classGames";
import { chooseGoal, useGoal } from "../classGoal";
import { gameIcon } from "../components/GamesCard";
import { gradeName } from "../components/GradeCard";
import { SiteBar, SiteFoot } from "../components/SiteBar";
import { Track } from "../components/Track";
import { useI18n } from "../i18n";
import { fill } from "../math/text";
import { ladderDone } from "../model/gameKeys";
import { currentGrade } from "../model/placement";
import { GOALS, isLab, isRead, itemsOf, progressOf, roadNext, type GameId, type Next } from "../model/roadmap";
import { ROADMAPS } from "../model/roadmaps";
import { FEATURED, topicOf, topicProgress } from "../model/topics";
import { loadProgress } from "../practiceProgress";
import { gameName, itemName, stageName } from "../roadWords";
import { readWork } from "../work";

/** Where a roadmap's or a topic's next step is done: a practice level, the topic's page for a "What is…?" read, or the game's or lab's own page. */
export const nextHref = (n: Next) =>
  n.via ? `#/practice/${n.via.skill}.${n.via.level}` : isRead(n.item) ? `#/learn/${n.item.read}` : `#/library/live/${isLab(n.item) ? n.item.lab : (n.item as { game: GameId }).game}`;

/** Zeno's picture: each step covers half of what is left, so the squares halve and never quite reach the end. */
function Halving() {
  const steps = [0, 1, 2, 3, 4, 5, 6];
  let x = 0;
  return (
    <svg className="site-halving" viewBox="0 0 200 64" role="img" aria-hidden="true">
      {steps.map((n) => {
        const w = 100 / 2 ** n;
        const r = <rect key={n} x={x + 1} y={64 - Math.max(w * 0.6, 3) - 1} width={Math.max(w - 2, 0.6)} height={Math.max(w * 0.6, 3)} rx={1.5} className={n % 2 ? "b" : "a"} />;
        x += w;
        return r;
      })}
      <line x1="200" y1="4" x2="200" y2="64" className="end" />
    </svg>
  );
}

export function SiteHome() {
  const { t, lang } = useI18n();
  const s = t.site;
  const r = t.roadmap;
  const [work] = useState(readWork);
  const [progress] = useState(loadProgress);
  const grade = progress.placed || progress.cells ? currentGrade(progress.placed ?? null, progress.cells ?? {}) : null;
  const { goal, fromClass } = useGoal();
  const games = useClassGames();
  const map = goal ? ROADMAPS[goal] : null;
  const next = map ? roadNext(map, work) : null;
  const all = map ? progressOf(itemsOf(map), work) : null;
  const stage = map && next ? map.stages.find((st) => st.items.includes(next.item)) : undefined;

  return (
    <div className="z site">
      <SiteBar />
      <main className="z-page site-home">
        <section className="site-hero">
          <div className="site-hero-text">
            <h1>{s.heroTitle}</h1>
            <p className="course-lede">{s.heroLede}</p>
            <div className="site-ctas">
              <a className="z-btn z-btn-marker" href="#/today">{s.today.button}</a>
              <a className="z-btn z-btn-line" href="#/roadmaps">{s.chooseGoal}</a>
              <a className="z-btn z-btn-line" href="#/learn">{s.browseTopics}</a>
            </div>
          </div>
          <figure className="site-hero-art">
            <Halving />
            <figcaption>{s.halfwayNote}</figcaption>
          </figure>
        </section>

        {goal && map && all && (
          <section className="site-continue" aria-labelledby="site-continue">
            <div className="site-continue-text">
              <h2 id="site-continue">{s.continue}</h2>
              <strong>{fill(s.continueLine, { goal: r.goals[goal].name, stage: stage ? stageName(t, lang, goal, stage) : r.allDone })}</strong>
              <Track p={all} />
              <span className="course-count">{fill(s.ticked, all)}</span>
              {next && (
                <span className="site-continue-next">
                  {r.next}: {next.level ? fill(r.nextLine, { skill: itemName(t, next.item), level: next.level }) : itemName(t, next.item)}
                </span>
              )}
            </div>
            <div className="site-continue-go">
              {next && <a className="z-btn z-btn-marker" href={nextHref(next)}>{next.via ? s.practiseNow : s.playNow}</a>}
              <a className="z-btn z-btn-line" href={`#/roadmaps/${goal}`}>{r.open} →</a>
            </div>
          </section>
        )}

        {games.length > 0 && (
          <section className="site-section" aria-labelledby="site-class-games">
            <div className="site-section-head">
              <h2 id="site-class-games">{s.teacherGames}</h2>
              <p className="course-count">{s.teacherGamesHint}</p>
            </div>
            <ul className="site-cards">
              {games.map((g) => {
                const stars = starsHere(g);
                const won = stars.reduce((a, b) => a + b, 0);
                return (
                  <li key={g}>
                    <a className="site-card" href={`#/library/live/${g}`}>
                      <span className="site-card-icon" aria-hidden="true">{gameIcon(g)}</span>
                      <span className="site-card-text">
                        <strong>{gameName(t, g)}</strong>
                        <span className="site-kind">
                          {ladderDone(stars) ? `✓ ${s.gamePassedHere}` : won ? fill(s.gameStarsWon, { n: won, of: 3 * stars.length }) : s.gameNotPlayed}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="site-section" aria-labelledby="site-goals">
          <div className="site-section-head">
            <h2 id="site-goals">{s.goalsTitle}</h2>
            <p className="course-count">{s.goalsLede}</p>
          </div>
          <ul className="road-goals">
            {GOALS.map((g) => {
              const p = progressOf(itemsOf(ROADMAPS[g]), work);
              return (
                <li key={g}>
                  <a className={`road-goal${g === goal ? " mine" : ""}`} href={`#/roadmaps/${g}`} onClick={() => chooseGoal(g)}>
                    <strong>{r.goals[g].name}</strong>
                    {g === goal && <span className="road-mine">{fromClass ? r.classGoal : r.yours}</span>}
                    <span className="road-about">{r.goals[g].about}</span>
                    <Track p={p} />
                    <span className="course-count">{fill(r.count, p)}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="site-section" aria-labelledby="site-topics">
          <div className="site-section-head">
            <h2 id="site-topics">{s.topicsTitle}</h2>
            <a className="site-more" href="#/learn">{s.allTopics} →</a>
          </div>
          <ul className="site-topics">
            {FEATURED.map((id) => <TopicTile key={id} id={id} work={work} />)}
          </ul>
        </section>

        <section className="site-section" aria-labelledby="site-practice">
          <h2 id="site-practice" className="site-visually-hidden">{s.practiceTitle}</h2>
          <a className="z-practice" href="#/practice">
            <span className="z-practice-text">
              <strong>{t.practice}</strong>
              <span>{t.practiceIntro}</span>
              {grade && <span className="z-practice-grade">{fill(t.pracWords.grades.here, { grade: gradeName(grade, t.pracWords.grades) })}</span>}
            </span>
            <span className="z-btn z-btn-marker">{t.practiceStart}</span>
          </a>
        </section>
      </main>
      <SiteFoot />
    </div>
  );
}

/** A topic as a tile: its sign, name, one line of what it is, and the learner's bar. */
export function TopicTile({ id, work }: { id: Parameters<typeof topicOf>[0]; work: ReturnType<typeof readWork> }) {
  const { t } = useI18n();
  const topic = topicOf(id);
  const p = topicProgress(topic, work);
  const w = t.site.topics[id];
  return (
    <li>
      <a className="site-topic" href={`#/learn/${id}`}>
        <span className="site-topic-icon" aria-hidden="true">{topic.icon}</span>
        <strong>{w.name}</strong>
        <span className="road-about">{w.about}</span>
        {p.total > 0 && (
          <>
            <Track p={{ done: p.secure, behind: p.behind, total: p.total }} />
            <span className="course-count">{fill(t.site.levels, { secure: p.secure, total: p.total })}</span>
          </>
        )}
      </a>
    </li>
  );
}
