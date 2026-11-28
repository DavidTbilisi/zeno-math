// Help (#876): what Zeno does for a teacher and for a learner, a step at a time, the teacher's steps with the short
// videos of docs/teacher-guide.md (their captions are in English), and the welcome cards shown again.
import { useState } from "react";
import { SiteBar, SiteFoot, SOURCE_URL } from "../components/SiteBar";
import { useI18n } from "../i18n";
import { forgetSeen } from "../seen";
import classMp4 from "../../docs/media/workflows/class.mp4?url";
import classPng from "../../docs/media/workflows/class.png?url";
import joinMp4 from "../../docs/media/workflows/join.mp4?url";
import joinPng from "../../docs/media/workflows/join.png?url";
import lessonMp4 from "../../docs/media/workflows/lesson.mp4?url";
import lessonPng from "../../docs/media/workflows/lesson.png?url";
import homeworkMp4 from "../../docs/media/workflows/homework.mp4?url";
import homeworkPng from "../../docs/media/workflows/homework.png?url";
import progressMp4 from "../../docs/media/workflows/progress.mp4?url";
import progressPng from "../../docs/media/workflows/progress.png?url";

/** The teacher's steps, in the order of help.page.teach. */
const VIDEOS = [
  { mp4: classMp4, png: classPng, href: "#/teacher" },
  { mp4: joinMp4, png: joinPng, href: "#/teacher" },
  { mp4: lessonMp4, png: lessonPng, href: "#/teacher" },
  { mp4: homeworkMp4, png: homeworkPng, href: "#/teacher" },
  { mp4: progressMp4, png: progressPng, href: "#/teacher" },
];
/** The learner's steps, in the order of help.page.learn. */
const LEARN = ["#/practice", "#/today", "#/roadmaps", "#/boards"];

export function HelpPage() {
  const { t } = useI18n();
  const w = t.help.page;
  const [again, setAgain] = useState(false);
  return (
    <div className="z site">
      <SiteBar here="help" />
      <main className="z-page help-page">
        <h1 className="z-page-title">{w.title}</h1>
        <p className="course-lede">{w.lede}</p>
        <div className="help-columns">
          <section aria-labelledby="help-teach">
            <h2 id="help-teach">{w.teachTitle}</h2>
            <ol className="help-steps">
              {w.teach.map((s, i) => (
                <li key={i}>
                  <h3><a href={VIDEOS[i].href}>{s.title}</a></h3>
                  <p>{s.text}</p>
                  <video controls preload="none" poster={VIDEOS[i].png} src={VIDEOS[i].mp4} aria-label={s.title} />
                </li>
              ))}
            </ol>
            <a href={`${SOURCE_URL}/blob/main/docs/teacher-guide.md`} target="_blank" rel="noopener noreferrer">{t.teacher.welcome.guide} →</a>
          </section>
          <section aria-labelledby="help-learn">
            <h2 id="help-learn">{w.learnTitle}</h2>
            <ol className="help-steps">
              {w.learn.map((s, i) => (
                <li key={i}>
                  <h3><a href={LEARN[i]}>{s.title}</a></h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <section className="help-again">
          <h2>{w.againTitle}</h2>
          <p>{w.againText}</p>
          <button className="z-btn z-btn-line" onClick={() => (forgetSeen(), setAgain(true))}>{w.again}</button>
          {again && <p role="status">{w.againDone}</p>}
        </section>
      </main>
      <SiteFoot />
    </div>
  );
}
