// Roadmaps by goal (#449): #/roadmaps picks a goal, #/roadmaps/<goal> shows its roadmap, a checklist in stages that
// ticks itself from free practice in this browser and the games' ladders, with Next, a bar per stage and in all, and
// what has been achieved, newest first. The goal last opened is remembered for this browser.
import { useState } from "react";
import { ApiError } from "../api";
import { ladderPassedHere, loadAchieved, storedGoal, storeGoal } from "../achieved";
import { BrandBar } from "../components/BrandBar";
import { gradeName } from "../components/GradeCard";
import { useI18n } from "../i18n";
import type { Dict } from "../locales/en";
import { fill } from "../math/text";
import { standing } from "../model/course";
import type { Grade } from "../model/curriculum";
import {
  achievedAt, GAME_KEYS, GOALS, isGoal, isSkill, itemId, itemsOf, itemState, progressOf, roadNext,
  type GameId, type GoalId, type Item, type ItemState, type RoadStage, type Work,
} from "../model/roadmap";
import { ROADMAPS } from "../model/roadmaps";
import { loadProgress } from "../practiceProgress";
import { openOnStageBoard } from "../stageBoards";

function readWork(): Work {
  const p = loadProgress();
  return { s: standing(p.cells ?? {}, p.placed ?? null), passed: (g) => ladderPassedHere(GAME_KEYS[g]) };
}

const gameName = (t: Dict, g: GameId) => (t.shapes.names as Record<string, string>)[`live${g[0].toUpperCase()}${g.slice(1)}`] ?? g;
const itemName = (t: Dict, i: Item) => (isSkill(i) ? t.pracWords.skills[i.skill] : gameName(t, i.game));
function stageName(t: Dict, lang: string, goal: GoalId, st: RoadStage) {
  if (goal === "ml") return t.course.stages[st.id as keyof Dict["course"]["stages"]];
  if (goal === "school") {
    const g = gradeName(Number(st.id) as Grade, t.pracWords.grades);
    // Georgian has no capitals in running text (upper-casing it gives Mtavruli).
    return lang === "ka" ? g : g[0].toLocaleUpperCase(lang) + g.slice(1);
  }
  return (t.roadmap.stages as Record<string, Record<string, string>>)[goal][st.id];
}

/** Done, and behind the learner, as two parts of one bar. */
function Track({ p }: { p: { done: number; behind: number; total: number } }) {
  return (
    <div className="course-track" aria-hidden="true">
      <span className="secure" style={{ width: `${(100 * p.done) / p.total}%` }} />
      <span className="behind" style={{ width: `${(100 * p.behind) / p.total}%` }} />
    </div>
  );
}

export function RoadmapPage({ goal }: { goal?: string }) {
  const { t } = useI18n();
  const [work] = useState(readWork);
  if (isGoal(goal)) return <Roadmap goal={goal} work={work} />;
  const r = t.roadmap;
  const mine = storedGoal();
  return (
    <div className="z">
      <BrandBar>
        <a href="#/practice">{t.practice}</a>
        <a href="#/">{t.myBoards}</a>
      </BrandBar>
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
  const levelsNote = (i: Item) => (isSkill(i) && i.levels.length < 3 ? fill(r.levels, { levels: i.levels.join(", ") }) : !isSkill(i) ? r.game : "");
  const achieved = itemsOf(map)
    .filter((i) => itemState(i, work) === "done")
    .map((i) => ({ i, at: achievedAt(i, dates) }))
    .sort((a, b) => (b.at ?? -1) - (a.at ?? -1));

  return (
    <div className="z">
      <BrandBar>
        <a href="#/roadmaps">{r.change}</a>
        <a href="#/practice">{t.practice}</a>
        <a href="#/">{t.myBoards}</a>
      </BrandBar>
      <div className="z-page road-page">
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
