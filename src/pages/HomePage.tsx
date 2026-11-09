import { useEffect, useState } from "react";
import { api, ApiError, boardOwner, type BoardSummary } from "../api";
import { BrandBar } from "../components/BrandBar";
import { gradeName } from "../components/GradeCard";
import { useI18n } from "../i18n";
import { fill } from "../math/text";
import { currentGrade } from "../model/placement";
import { loadProgress } from "../practiceProgress";

// AGPL-3.0 §13: whoever runs Zeno for others must offer them its source. A modified copy points this at its own code.
const SOURCE_URL = "https://github.com/DavidTbilisi/zeno-math";

export function HomePage() {
  const { t, lang } = useI18n();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  // 403: this browser is neither a teacher's nor a joined student's, so it has no boards (server/research.ts boardUser).
  const [refused, setRefused] = useState(false);
  // Where the learner is in the course, once they have practised or found their grade in this browser.
  const [progress] = useState(loadProgress);
  const grade = progress.placed || progress.cells ? currentGrade(progress.placed ?? null, progress.cells ?? {}) : null;

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

  const date = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="z">
      <div className="home">
        <BrandBar home="#/about">
          <a href="#/course">{t.course.link}</a>
          <a href="#/about">{t.aboutLink}</a>
        </BrandBar>

        <main className="home-main">
          <a className="z-practice" href="#/practice">
            <span className="z-practice-text">
              <strong>{t.practice}</strong>
              <span>{t.practiceIntro}</span>
              {grade && <span className="z-practice-grade">{fill(t.pracWords.grades.here, { grade: gradeName(grade, t.pracWords.grades) })}</span>}
            </span>
            <span className="z-btn z-btn-marker">{t.practiceStart}</span>
          </a>

          <div className="section-head">
            <h1>{t.myBoards}</h1>
            {!refused && <button className="btn primary" onClick={create}>+ {t.newBoard}</button>}
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
            <ul className="board-grid">
              {boards.map((b) => (
                <li key={b.id} className="board-card">
                  <a href={`#/b/${b.id}`} className="board-link">
                    <span className="board-title">{b.title}</span>
                    <span className="muted small">
                      {t.updated}: {date.format(b.updatedAt)}
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
              ))}
            </ul>
          )}
          {!!boards?.length && !("X-Student-Code" in boardOwner()) && (
            <p className="muted small">
              <button className="btn small ghost" onClick={() => void backup()}>⤓ {t.backupAll}</button>
            </p>
          )}
          <p className="muted small">
            <a href="#/teacher">{t.teacher.link}</a>
          </p>
          <p className="muted small">
            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">{t.sourceCode}</a>
          </p>
        </main>
      </div>
    </div>
  );
}
