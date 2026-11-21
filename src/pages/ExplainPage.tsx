// "What is…?" (#450): every topic's intro on one page, by shelf as on Learn: its picture, its question and what it is,
// each to the topic's page, where the rest of the intro (the everyday uses) is read and counted. A ✓ marks those read.
import { useState } from "react";
import { loadAchieved } from "../achieved";
import { readKey } from "../components/Explainer";
import { SiteBar, SiteFoot } from "../components/SiteBar";
import { TopicPicture } from "../components/TopicPicture";
import { useI18n } from "../i18n";
import { SHELVES, TOPICS } from "../model/topics";

export function ExplainPage() {
  const { t } = useI18n();
  const e = t.site.explain;
  const [dates] = useState(loadAchieved);
  return (
    <div className="z site">
      <SiteBar here="learn" />
      <main className="z-page site-explain">
        <a className="site-back" href="#/learn">← {t.site.learn}</a>
        <h1 className="z-page-title">{e.index}</h1>
        <p className="course-lede">{e.indexLede}</p>
        {SHELVES.map((shelf) => (
          <section key={shelf} className="site-section" aria-labelledby={`ex-${shelf}`}>
            <h2 id={`ex-${shelf}`} className="site-shelf">{t.site.shelves[shelf]}</h2>
            <ul className="explain-cards">
              {TOPICS.filter((x) => x.shelf === shelf).map((x) => {
                const read = dates[readKey(x.id)] !== undefined;
                return (
                  <li key={x.id}>
                    <a className="explain-card" href={`#/learn/${x.id}`}>
                      <TopicPicture topic={x.id} />
                      <strong>{e.topics[x.id].q}{read && <span className="explain-done" aria-label={e.readDone}> ✓</span>}</strong>
                      <span>{e.topics[x.id].what}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>
      <SiteFoot />
    </div>
  );
}
