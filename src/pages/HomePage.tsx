import { useEffect, useState } from "react";
import { api, ApiError, boardOwner, type BoardSummary } from "../api";
import { storedGoal } from "../achieved";
import { BrandBar } from "../components/BrandBar";
import { gradeName } from "../components/GradeCard";
import { useI18n } from "../i18n";
import { fill } from "../math/text";
import { currentGrade } from "../model/placement";
import { loadProgress } from "../practiceProgress";
import { BOARD_SORTS, isBoardSort, sortBoards, type BoardAge, type BoardSort } from "../boardSort";

// AGPL-3.0 §13: whoever runs Zeno for others must offer them its source. A modified copy points this at its own code.
const SOURCE_URL = "https://github.com/DavidTbilisi/zeno-math";
// The board order this browser picked last; only a convenience, so a browser without storage just starts from "recent".
const SORT_KEY = "zeno.boardSort";
const savedSort = (): BoardSort => {
  try {
    const s = localStorage.getItem(SORT_KEY);
    return isBoardSort(s) ? s : "recent";
  } catch {
    return "recent";
  }
};
const SORT_WORD = { recent: "sortRecent", created: "sortCreated", name: "sortName" } as const;
const AGE_WORD: Record<BoardAge, "ageToday" | "ageWeek" | "ageMonth" | "ageOlder"> = { today: "ageToday", week: "ageWeek", month: "ageMonth", older: "ageOlder" };

export function HomePage() {
  const { t, lang } = useI18n();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  // 403: this browser is neither a teacher's nor a joined student's, so it has no boards (server/research.ts boardUser).
  const [refused, setRefused] = useState(false);
  // Where the learner is in the course, once they have practised or found their grade in this browser.
  const [progress] = useState(loadProgress);
  const grade = progress.placed || progress.cells ? currentGrade(progress.placed ?? null, progress.cells ?? {}) : null;
  const goal = storedGoal();

  const load = () => api.list().then(setBoards, (e) => {
    setRefused(e instanceof ApiError && e.status === 403);
    setBoards([]);
  });
  useEffect(() => {
    load();
  }, []);

  // Runs an action against the server; a failure shows a message instead of being lost.
  const attempt = async (action: () => Promise<unknown>) => {
    setFailed(false);
    try {
      await action();
    } catch {
      setFailed(true);
    }
  };

  const create = () => attempt(async () => {
    const b = await api.create(t.untitled);
    location.hash = `#/b/${b.id}`;
  });

  // Renaming and deleting happen on the board's card, not in prompt() and confirm(): some browsers and embedded views
  // block those dialogs, and then they answer "cancel" without showing anything. One card at a time.
  const [busy, setBusy] = useState<{ id: string; mode: "rename" | "delete"; title: string } | null>(null);

  const rename = (b: BoardSummary, title: string) => {
    setBusy(null);
    if (!title.trim() || title === b.title) return;
    return attempt(async () => {
      await api.save(b.id, { title });
      await load();
    });
  };

  const remove = (b: BoardSummary) => {
    setBusy(null);
    return attempt(async () => {
      await api.remove(b.id);
      await load();
    });
  };

  // The backup holds every board, students' too, so the server gives it to a teacher only.
  const backup = () => attempt(async () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(await api.backup());
    link.download = `zeno-boards-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });

  const [sort, setSortState] = useState<BoardSort>(savedSort);
  const setSort = (s: BoardSort) => {
    setSortState(s);
    try {
      localStorage.setItem(SORT_KEY, s);
    } catch {
      /* not remembered: the page still sorts */
    }
  };
  const runs = boards ? sortBoards(boards, sort, { now: Date.now(), locale: lang, untitled: t.untitled }) : [];
  const student = "X-Student-Code" in boardOwner();

  const date = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });

  const card = (b: BoardSummary) => (
    <li key={b.id} className="board-card">
      <a href={`#/b/${b.id}`} className="board-link">
        <span className="board-title">{b.title}</span>
        <span className="muted small">
          {sort === "created" ? `${t.created}: ${date.format(b.createdAt)}` : `${t.updated}: ${date.format(b.updatedAt)}`}
        </span>
      </a>
      {busy?.id === b.id && busy.mode === "rename" ? (
        <form
          className="board-actions board-ask"
          onSubmit={(e) => {
            e.preventDefault();
            void rename(b, busy.title);
          }}
          onKeyDown={(e) => e.key === "Escape" && setBusy(null)}
        >
          <input aria-label={t.rename} value={busy.title} autoFocus onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setBusy({ ...busy, title: e.target.value })} />
          <button className="btn small primary" type="submit" disabled={!busy.title.trim()}>{t.rename}</button>
          <button className="btn small ghost" type="button" onClick={() => setBusy(null)}>{t.cancel}</button>
        </form>
      ) : busy?.id === b.id && busy.mode === "delete" ? (
        <div className="board-actions board-ask" role="alert" onKeyDown={(e) => e.key === "Escape" && setBusy(null)}>
          <span className="error small">{t.confirmDelete}</span>
          <button className="btn small danger" autoFocus onClick={() => void remove(b)}>{t.delete}</button>
          <button className="btn small ghost" onClick={() => setBusy(null)}>{t.cancel}</button>
        </div>
      ) : (
        <div className="board-actions">
          <button className="btn small ghost" onClick={() => setBusy({ id: b.id, mode: "rename", title: b.title })}>{t.rename}</button>
          <button className="btn small ghost danger" onClick={() => setBusy({ id: b.id, mode: "delete", title: b.title })}>{t.delete}</button>
        </div>
      )}
    </li>
  );

  return (
    <div className="z">
      <div className="home">
        <BrandBar home="#/about">
          <a href="#/roadmaps">{t.roadmap.link}</a>
          <a href="#/course">{t.course.link}</a>
          <a href="#/about">{t.aboutLink}</a>
        </BrandBar>

        <main className="home-main">
          {/* Learn, then the learner's own boards, then what only teachers need; the page's small print last. */}
          <section className="home-section" aria-labelledby="home-learn">
            <h2 id="home-learn" className="home-head">{t.secLearn}</h2>
            <a className="z-practice" href="#/practice">
              <span className="z-practice-text">
                <strong>{t.practice}</strong>
                <span>{t.practiceIntro}</span>
                {grade && <span className="z-practice-grade">{fill(t.pracWords.grades.here, { grade: gradeName(grade, t.pracWords.grades) })}</span>}
              </span>
              <span className="z-btn z-btn-marker">{t.practiceStart}</span>
            </a>
            <a className="home-course" href={goal ? `#/roadmaps/${goal}` : "#/roadmaps"}>
              <span className="home-course-text">
                <strong>{goal ? t.roadmap.goals[goal].name : t.roadmap.link}</strong>
                <span>{goal ? t.roadmap.yours : t.roadmap.title}</span>
              </span>
              <span className="z-btn">{t.roadmap.open} →</span>
            </a>
            <a className="home-course" href="#/course">
              <span className="home-course-text">
                <strong>{t.course.link}</strong>
                <span>{t.course.title}</span>
              </span>
              <span className="z-btn">{t.courseOpen} →</span>
            </a>
          </section>

          <section className="home-section" aria-labelledby="home-boards">
            <div className="section-head">
              <h2 id="home-boards" className="home-head">{t.myBoards}</h2>
              <div className="home-tools">
                {!!boards?.length && (
                  <div className="home-sort" role="group" aria-label={t.boardsSort}>
                    {BOARD_SORTS.map((s) => (
                      <button key={s} className={`btn small${sort === s ? " on" : " ghost"}`} aria-pressed={sort === s} onClick={() => setSort(s)}>
                        {t[SORT_WORD[s]]}
                      </button>
                    ))}
                  </div>
                )}
                {!refused && <button className="btn primary" onClick={create}>+ {t.newBoard}</button>}
              </div>
            </div>
            {failed && <p className="error" role="alert">{t.actionFailed}</p>}

            {refused ? (
              <div className="empty">
                <p>{t.boardsNeedOwner}</p>
                <a className="btn primary" href="#/practice">{t.practice}</a>
              </div>
            ) : boards === null ? (
              <p className="muted">{t.loading}</p>
            ) : boards.length === 0 ? (
              <div className="empty">
                <p>{t.noBoards}</p>
                <button className="btn primary" onClick={create}>+ {t.newBoard}</button>
              </div>
            ) : (
              runs.map((r) => (
                <div key={r.age ?? "all"} className="board-run">
                  {r.age && <h3 className="board-age">{t[AGE_WORD[r.age]]}</h3>}
                  <ul className="board-grid">{r.boards.map(card)}</ul>
                </div>
              ))
            )}
          </section>

          {!student && (
            <section className="home-section" aria-labelledby="home-teachers">
              <h2 id="home-teachers" className="home-head">{t.forTeachers}</h2>
              <div className="home-links">
                <a className="btn" href="#/teacher">{t.teacher.title}</a>
                {!!boards?.length && <button className="btn ghost" onClick={() => void backup()}>⤓ {t.backupAll}</button>}
              </div>
            </section>
          )}
        </main>
        <footer className="home-foot muted small">
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">{t.sourceCode}</a>
        </footer>
      </div>
    </div>
  );
}
