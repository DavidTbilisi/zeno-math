// My progress (#448): every topic with a bar, its share of levels secure, and the next level, from practice in this
// browser. Filters (in progress, not started, finished) and an order; both are remembered for this browser.
import { useState } from "react";
import { SiteBar, SiteFoot } from "../components/SiteBar";
import { Track } from "../components/Track";
import { useI18n } from "../i18n";
import { fill } from "../math/text";
import { TOPICS, topicProgress, topicStatus, type TopicStatus } from "../model/topics";
import { readWork } from "../work";
import { nextHref } from "./SiteHome";

const FILTERS = ["all", "started", "new", "finished"] as const;
const SORTS = ["order", "most", "least", "name"] as const;
type Filter = (typeof FILTERS)[number];
type Sort = (typeof SORTS)[number];
const KEY = "zeno.progressView";
function saved(): { filter: Filter; sort: Sort } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { filter: FILTERS.includes(v.filter) ? v.filter : "all", sort: SORTS.includes(v.sort) ? v.sort : "order" };
  } catch {
    return { filter: "all", sort: "order" };
  }
}

export function ProgressPage() {
  const { t, lang } = useI18n();
  const s = t.site;
  const [work] = useState(readWork);
  const [view, setViewState] = useState(saved);
  const setView = (v: Partial<typeof view>) => {
    const next = { ...view, ...v };
    setViewState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* not remembered: the page still filters */
    }
  };
  // Topics without practice of their own have no bar, so they are not listed here.
  const rows = TOPICS.filter((x) => x.skills.length).map((x) => {
    const p = topicProgress(x, work);
    return { x, p, done: (p.secure + p.behind) / p.total, status: topicStatus(p) as TopicStatus };
  });
  const shown = rows.filter((r) => view.filter === "all" || r.status === view.filter);
  if (view.sort === "most") shown.sort((a, b) => b.done - a.done);
  if (view.sort === "least") shown.sort((a, b) => a.done - b.done);
  if (view.sort === "name") shown.sort((a, b) => s.topics[a.x.id].name.localeCompare(s.topics[b.x.id].name, lang));

  return (
    <div className="z site">
      <SiteBar here="progress" />
      <main className="z-page site-progress">
        <h1 className="z-page-title">{s.progressTitle}</h1>
        <p className="course-lede">{s.progressLede}</p>
        <div className="site-filters">
          <div className="home-sort" role="group" aria-label={s.progressTitle}>
            {FILTERS.map((f) => (
              <button key={f} className={`btn small${view.filter === f ? " on" : " ghost"}`} aria-pressed={view.filter === f} onClick={() => setView({ filter: f })}>
                {s.filter[f]} <span className="site-n">{f === "all" ? rows.length : rows.filter((r) => r.status === f).length}</span>
              </button>
            ))}
          </div>
          <label className="site-sort">
            {s.sortBy}
            <select value={view.sort} onChange={(e) => setView({ sort: e.target.value as Sort })}>
              {SORTS.map((o) => <option key={o} value={o}>{s.sort[o]}</option>)}
            </select>
          </label>
        </div>
        {shown.length ? (
          <ul className="site-rows">
            {shown.map(({ x, p, done }) => (
              <li key={x.id} className="site-row">
                <a className="site-row-name" href={`#/learn/${x.id}`}>
                  <span className="site-topic-icon" aria-hidden="true">{x.icon}</span>
                  <strong>{s.topics[x.id].name}</strong>
                </a>
                <div className="site-row-bar">
                  <Track p={{ done: p.secure, behind: p.behind, total: p.total }} />
                  <span className="course-count">{fill(p.behind ? s.levelsBehind : s.levels, { secure: p.secure, behind: p.behind, total: p.total })}</span>
                </div>
                <span className="site-pct">{fill(s.pct, { pct: Math.round(100 * done) })}</span>
                {p.next ? (
                  <a className="site-row-next" href={nextHref(p.next)}>
                    {fill(s.nextShort, { skill: t.pracWords.skills[(p.next.item as { skill: keyof typeof t.pracWords.skills }).skill], level: p.next.level ?? 1 })}
                  </a>
                ) : (
                  <span className="site-row-next done">✓</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="course-count">{s.filterNone}</p>
        )}
      </main>
      <SiteFoot />
    </div>
  );
}
