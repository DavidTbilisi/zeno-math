// The boards page (#448): the learner's or teacher's own whiteboards, which used to be the home page. The site's home
// now starts from learning; boards are one section of it.
import { useEffect, useState } from "react";
import { api, ApiError, boardOwner, type BoardSummary } from "../api";
import { SiteBar, SiteFoot } from "../components/SiteBar";
import { useI18n } from "../i18n";
import { UndoToast, useUndoDelete } from "../components/UndoDelete";
import { fill } from "../math/text";
import { BOARD_SORTS, isBoardSort, sortBoards, type BoardAge, type BoardSort } from "../boardSort";

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

export function BoardsPage() {
  const { t, lang } = useI18n();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  // 403: this browser is neither a teacher's nor a student's, and nobody is signed in, so it has no boards (server/research.ts boardUser).
  const [refused, setRefused] = useState(false);

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

  // Renaming and deleting happen on the board's card (#562): its title is a field you type in (Enter or leaving it
  // saves, Escape puts it back), and Delete takes the board off at once with a few seconds to undo it.
  const rename = (b: BoardSummary, typed: string) => {
    const title = typed.trim();
    if (!title || title === b.title) return;
    setBoards((list) => list && list.map((x) => (x.id === b.id ? { ...x, title } : x)));
    return attempt(async () => {
      await api.save(b.id, { title });
      await load();
    });
  };
  const deleting = useUndoDelete((b: BoardSummary) =>
    attempt(async () => {
      await api.remove(b.id);
      await load();
    }),
  );

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
  const shown = boards?.filter((b) => b.id !== deleting.pending?.id) ?? null;
  const runs = shown ? sortBoards(shown, sort, { now: Date.now(), locale: lang, untitled: t.untitled }) : [];
  const student = "X-Student-Code" in boardOwner();

  const date = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });

  const card = (b: BoardSummary) => (
    <li key={b.id} className="board-card">
      <input
        key={b.title}
        className="board-title"
        defaultValue={b.title}
        aria-label={fill(t.renameBoard, { title: b.title })}
        title={t.rename}
        onBlur={(e) => void rename(b, e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.currentTarget.value = b.title;
            e.currentTarget.blur();
          }
        }}
      />
      <a href={`#/b/${b.id}`} className="board-link">
        <span className="muted small">
          {sort === "created" ? `${t.created}: ${date.format(b.createdAt)}` : `${t.updated}: ${date.format(b.updatedAt)}`}
        </span>
        <span className="board-open">{t.open} →</span>
      </a>
      <div className="board-actions">
        <button className="btn small ghost danger" onClick={() => deleting.start(b)} aria-label={fill(t.deleteBoard, { title: b.title })}>{t.delete}</button>
      </div>
    </li>
  );

  return (
    <div className="z">
      <div className="home">
        <SiteBar here="boards" />

        <main className="home-main">
          <section className="home-section" aria-labelledby="home-boards">
            <div className="section-head">
              <h1 id="home-boards" className="z-page-title home-head">{t.myBoards}</h1>
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
                <a className="btn primary" href="#/account">{t.site.account.link}</a>
              </div>
            ) : boards === null ? (
              <p className="muted">{t.loading}</p>
            ) : shown!.length === 0 ? (
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
            {deleting.pending && <UndoToast text={fill(t.deleted, { title: deleting.pending.title })} undo={t.undo} onUndo={deleting.undo} />}
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
        <SiteFoot />
      </div>
    </div>
  );
}
