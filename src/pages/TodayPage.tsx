// Today (#585, src/model/today.ts): one short session from the learner's own state, in the order of the four learning
// stages: reviews due, one new idea, one drill, one problem. The session is built once a day and kept, with each
// skill's stage when it began, so coming back from a part ticks it and the end shows what moved, in the stages' colours.
import { useState } from "react";
import { StageBadge, StageSquares, useStageLabel } from "../components/LearningStages";
import { SiteBar, SiteFoot } from "../components/SiteBar";
import { useI18n } from "../i18n";
import { fill } from "../math/text";
import { standing } from "../model/course";
import { learningStageOf, type LearningStage } from "../model/learningStage";
import { buildToday, todaySkills, type TodayPart } from "../model/today";
import type { TopicId } from "../model/topics";
import { loadProgress } from "../practiceProgress";

type Session = { day: string; parts: TodayPart[]; before: Record<string, LearningStage>; done: number[] };
const KEY = "zeno.today.v1";
const dayOf = (ms: number) => new Date(ms - new Date(ms).getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

/** The topics whose page still asks its "predict, then reveal" (#578); none until that lands. */
const toPredict = (): TopicId[] => [];

function fresh(now: number): Session {
  const p = loadProgress();
  const parts = buildToday({ now, standing: standing(p.cells ?? {}, p.placed ?? null), spacing: p.spacing ?? {}, stages: p.stages ?? {}, toPredict: toPredict() });
  return { day: dayOf(now), parts, before: Object.fromEntries(todaySkills(parts).map((k) => [k, learningStageOf(p.stages, k)])), done: [] };
}
function load(now: number): Session {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Session | null;
    if (s && s.day === dayOf(now) && Array.isArray(s.parts)) return s;
  } catch {
    // a broken copy: a new session
  }
  return fresh(now);
}
function save(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // not kept: the session still runs on this page
  }
}

/** The learning stage each part works on, for its badge: a review keeps (2), an idea is understood (1), and so on. */
const STAGE_OF: Record<TodayPart["part"], 1 | 2 | 3 | 4> = { review: 2, idea: 1, drill: 3, problem: 4 };

export function hrefOf(p: TodayPart): string {
  if (p.part === "idea" && p.predict) return `#/learn/${p.predict}`;
  if (p.part === "problem") return p.setting.via === "game" ? `#/library/live/${p.setting.game}` : `#/practice/${p.setting.skill}.${p.setting.level}`;
  return `#/practice/${p.skill}.${p.level}`;
}

export function TodayPage() {
  const { t } = useI18n();
  const w = t.site.today;
  const skill = (k: string) => t.pracWords.skills[k as keyof typeof t.pracWords.skills] ?? k;
  const label = useStageLabel();
  const [session, setSession] = useState(() => {
    const s = load(Date.now());
    save(s);
    return s;
  });
  const [ended, setEnded] = useState(false);
  const now = loadProgress().stages;
  const tick = (i: number) => {
    if (session.done.includes(i)) return;
    const s = { ...session, done: [...session.done, i] };
    save(s);
    setSession(s);
  };
  const again = () => {
    const s = fresh(Date.now());
    save(s);
    setSession(s);
    setEnded(false);
  };
  const line = (p: TodayPart) => {
    const k = skill(p.skill);
    switch (p.part) {
      case "review": return fill(p.card ? w.reviewCard : w.review, { skill: k, level: p.level });
      case "idea": return fill(p.predict ? w.ideaPredict : w.idea, { skill: k, level: p.level, topic: p.predict ? t.site.topics[p.predict].name : "" });
      case "drill": return fill(w.drill, { skill: k, level: p.level });
      case "problem": return fill(p.setting.via === "words" ? w.problemWords : w.problemGame, { skill: k, words: skill(p.setting.via === "words" ? p.setting.skill : "") });
    }
  };
  const finished = ended || (session.parts.length > 0 && session.done.length >= session.parts.length);

  return (
    <div className="z site">
      <SiteBar />
      <main className="z-page today-page">
        <h1 className="z-page-title">{w.title}</h1>
        <p className="course-lede">{w.lede}</p>
        {session.parts.length === 0 ? (
          <p>{w.nothing}</p>
        ) : (
          <ol className="today-parts">
            {session.parts.map((p, i) => {
              const done = session.done.includes(i);
              return (
                <li key={i} className={`today-part${done ? " done" : ""}`}>
                  <StageBadge stage={STAGE_OF[p.part]} />
                  <div>
                    <strong>{w.parts[p.part]}</strong>
                    <span>{line(p)}</span>
                  </div>
                  <a className={`z-btn small ${done ? "z-btn-line" : "z-btn-marker"}`} href={hrefOf(p)} onClick={() => tick(i)}>
                    {done ? `✓ ${w.again}` : w.go}
                  </a>
                </li>
              );
            })}
          </ol>
        )}
        {!finished && session.parts.length > 0 && <button className="z-btn z-btn-line" onClick={() => setEnded(true)}>{w.finish}</button>}
        {finished && (
          <section className="site-section today-moved" aria-labelledby="today-moved">
            <h2 id="today-moved">{w.moved}</h2>
            <ul>
              {todaySkills(session.parts).map((k) => {
                const [a, b] = [session.before[k] ?? 0, learningStageOf(now, k)];
                return (
                  <li key={k} className={b > a ? "up" : ""}>
                    <span className="road-name">{skill(k)}</span>
                    <StageSquares stage={a} /> <span aria-hidden="true">→</span> <StageSquares stage={b} />
                    <span className="sr-only">{fill(w.movedLine, { from: label(a), to: label(b) })}</span>
                  </li>
                );
              })}
            </ul>
            <button className="z-btn z-btn-line" onClick={again}>{w.newSession}</button>
          </section>
        )}
      </main>
      <SiteFoot />
    </div>
  );
}
