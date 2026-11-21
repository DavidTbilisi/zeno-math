// Roadmaps by goal (#449): #/roadmaps picks a goal, #/roadmaps/<goal> shows its roadmap, a checklist in stages that
// ticks itself from free practice in this browser and the games' ladders, with Next, a bar per stage and in all, and
// what has been achieved, newest first. The goal last opened is remembered for this browser.
import { useState } from "react";
import { ApiError } from "../api";
import { loadAchieved, storedGoal, storeGoal } from "../achieved";
import { SiteBar } from "../components/SiteBar";
import { Track } from "../components/Track";
import { useI18n } from "../i18n";
import { fill } from "../math/text";
import {
  achievedAt, GOALS, isGoal, isRead, isSkill, itemId, itemsOf, itemState, progressOf, roadNext,
  type GameId, type GoalId, type Item, type ItemState, type Work,
} from "../model/roadmap";
import { ROADMAPS } from "../model/roadmaps";
import { openOnStageBoard } from "../stageBoards";
import { itemName, stageName } from "../roadWords";
import { readWork } from "../work";

export function RoadmapPage({ goal }: { goal?: string }) {
  const { t } = useI18n();
  const [work] = useState(readWork);
  if (isGoal(goal)) return <Roadmap goal={goal} work={work} />;
  const r = t.roadmap;
  const mine = storedGoal();
  return (
    <div className="z">
      <SiteBar here="roadmaps" />
      <div className="z-page road-page">
        <h1 className="z-page-title">{r.title}</h1>
        <p className="course-lede">{r.lede}</p>
        <h2 className="road-pick">{r.pick}</h2>
        <ul className="road-goals">
          {GOALS.map((g) => {
            const p = progressOf(itemsOf(ROADMAPS[g]), work);
            return (
              <li key={g}>
                <a className={`road-goal${g === mine ? " mine" : ""}`} href={`#/roadmaps/${g}`} onClick={() => storeGoal(g)}>
                  <strong>{r.goals[g].name}</strong>
                  {g === mine && <span className="road-mine">{r.yours}</span>}
                  <span className="road-about">{r.goals[g].about}</span>
                  <Track p={p} />
                  <span className="course-count">{fill(r.count, p)}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const MARK: Record<ItemState, string> = { done: "✓", behind: "✓", part: "", open: "" };

function Roadmap({ goal, work }: { goal: GoalId; work: Work }) {
  const { t, lang } = useI18n();
  const r = t.roadmap;
  const map = ROADMAPS[goal];
  const [dates] = useState(loadAchieved);
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState<false | true | "refused">(false);
  useState(() => storeGoal(goal));
  const next = roadNext(map, work);
  const all = progressOf(itemsOf(map), work);
  const day = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" });

  const play = async (g: GameId) => {
    setOpening(true);
    setFailed(false);
    try {
      await openOnStageBoard("zeno.roadmap.boards", goal, fill(r.board, { goal: r.goals[goal].name }), `live/${g}`);
    } catch (e) {
      setFailed(e instanceof ApiError && e.status === 403 ? "refused" : true);
      setOpening(false);
    }
  };
  const levelsNote = (i: Item) =>
    isSkill(i) ? (i.levels.length < 3 ? fill(r.levels, { levels: i.levels.join(", ") }) : "") : isRead(i) ? t.site.explain.readNote : r.game;
  const achieved = itemsOf(map)
    .filter((i) => itemState(i, work) === "done")
    .map((i) => ({ i, at: achievedAt(i, dates) }))
    .sort((a, b) => (b.at ?? -1) - (a.at ?? -1));

  return (
    <div className="z">
      <SiteBar here="roadmaps" />
      <div className="z-page road-page">
        <a className="site-back" href="#/roadmaps">← {r.change}</a>
        <h1 className="z-page-title">{r.goals[goal].name}</h1>
        <p className="course-lede">
          {r.goals[goal].about}
          {goal === "ml" && <> <a href="#/course">{r.courseMap}</a></>}
        </p>

        <section className="course-next" aria-label={r.next}>
          {next ? (
            <>
              <div className="course-next-text">
                <span>{r.next}</span>
                <strong>{next.level ? fill(r.nextLine, { skill: itemName(t, next.item), level: next.level }) : itemName(t, next.item)}</strong>
                {next.via && (next.via.skill !== (next.item as { skill: string }).skill || next.via.level !== next.level) && (
                  <span className="course-next-where">{fill(r.first, { skill: t.pracWords.skills[next.via.skill], level: next.via.level })}</span>
                )}
              </div>
              {next.via ? (
                <a className="z-btn z-btn-marker" href={`#/practice/${next.via.skill}.${next.via.level}`}>{r.practise}</a>
              ) : isRead(next.item) ? (
                <a className="z-btn z-btn-marker" href={`#/learn/${next.item.read}`}>{t.site.explain.read}</a>
              ) : (
                <button className="z-btn z-btn-marker" disabled={opening} onClick={() => play((next.item as { game: GameId }).game)}>{r.play}</button>
              )}
            </>
          ) : (
            <p className="course-next-text"><strong>{r.allDone}</strong></p>
          )}
        </section>
        {failed && <p className="error" role="alert">{failed === "refused" ? t.boardsNeedOwner : r.failed}</p>}

        <div className="road-all">
          <Track p={all} />
          <p className="course-count">{fill(r.count, all)}</p>
        </div>
        <p className="course-legend" aria-hidden="true">
          {(["done", "behind", "part", "open"] as const).map((k) => <span key={k}><i className={`road-tick ${k}`}>{MARK[k]}</i>{r.legend[k]}</span>)}
        </p>

        <ol className="course-stages">
          {map.stages.map((st, n) => {
            const p = progressOf(st.items, work);
            const here = !!next && st.items.includes(next.item);
            return (
              <li key={st.id} className={`course-stage${here ? " here" : ""}`}>
                <span className="course-stage-n" aria-hidden="true">{n + 1}</span>
                <div className="course-stage-body">
                  <div className="course-stage-head"><h2>{stageName(t, lang, goal, st)}</h2></div>
                  <Track p={p} />
                  <p className="course-count">{fill(r.count, p)}</p>
                  <ul className="road-list">
                    {st.items.map((i) => {
                      const state = itemState(i, work);
                      const label = `${itemName(t, i)}, ${r.legend[state]}`;
                      const body = (
                        <>
                          <i className={`road-tick ${state}`} aria-hidden="true">{MARK[state]}</i>
                          <span className="road-name">{itemName(t, i)}</span>
                          {levelsNote(i) && <span className="road-note">{levelsNote(i)}</span>}
                        </>
                      );
                      const cls = `road-item ${state}${next?.item === i ? " next" : ""}`;
                      return (
                        <li key={itemId(i)}>
                          {isSkill(i) ? (
                            <a className={cls} aria-label={label} href={`#/practice/${i.skill}.${i.levels.find((L) => work.s.level(i.skill, L) === "open") ?? i.levels[0]}`}>{body}</a>
                          ) : isRead(i) ? (
                            <a className={cls} aria-label={label} href={`#/learn/${i.read}`}>{body}</a>
                          ) : (
                            <button className={cls} aria-label={label} disabled={opening} onClick={() => play(i.game)}>{body}</button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>

        <section className="road-achieved" aria-labelledby="road-achieved">
          <h2 id="road-achieved">{r.achieved}</h2>
          {achieved.length ? (
            <ul>
              {achieved.map(({ i, at }) => (
                <li key={itemId(i)}>
                  <i className="road-tick done" aria-hidden="true">✓</i>
                  <span className="road-name">{itemName(t, i)}</span>
                  <time dateTime={at ? new Date(at).toISOString() : undefined}>{at ? day.format(at) : r.undated}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="course-count">{r.achievedNone}</p>
          )}
        </section>
      </div>
    </div>
  );
}
