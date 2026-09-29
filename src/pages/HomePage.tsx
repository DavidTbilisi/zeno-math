import { useEffect, useState } from "react";
import { api, type BoardSummary } from "../api";
import { LangSelect, useI18n } from "../i18n";

export function HomePage() {
  const { t, lang } = useI18n();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);

  const load = () => api.list().then(setBoards, () => setBoards([]));
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const b = await api.create(t.untitled);
    location.hash = `#/b/${b.id}`;
  };

  const rename = async (b: BoardSummary) => {
    const title = prompt(t.rename, b.title);
    if (title === null || !title.trim()) return;
    await api.save(b.id, { title });
    load();
  };

  const remove = async (b: BoardSummary) => {
    if (!confirm(`${t.confirmDelete}\n\n${b.title}`)) return;
    await api.remove(b.id);
    load();
  };

  const date = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="home">
      <header className="home-header">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={36} height={36} />
          <div>
            <h1>{t.appName}</h1>
            <p>{t.tagline}</p>
          </div>
        </div>
        <LangSelect />
      </header>

      <main className="home-main">
        <div className="section-head">
          <h2>{t.myBoards}</h2>
          <button className="btn primary" onClick={create}>+ {t.newBoard}</button>
        </div>

        {boards === null ? (
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
                <div className="board-actions">
                  <button className="btn small ghost" onClick={() => rename(b)}>{t.rename}</button>
                  <button className="btn small ghost danger" onClick={() => remove(b)}>{t.delete}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
