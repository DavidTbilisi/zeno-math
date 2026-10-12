// The practice page (#/practice, or #/practice/<area> to open on an area): the board's practice on a page of its own,
// for a student who came to practise rather than to draw. Class practice works here the same way; the worksheet stays
// on the board, where it is inserted.
import { PracticeDialog } from "../components/PracticeDialog";
import { LangSelect, useI18n } from "../i18n";

export function PracticePage({ start }: { start?: string }) {
  const { t } = useI18n();
  return (
    <div className="home practice-page">
      <header className="home-header">
        <div className="brand">
          <a href="#/" className="muted small">← {t.back}</a>
          <h1>{t.practice}</h1>
        </div>
        <LangSelect />
      </header>
      <main>
        <PracticeDialog start={start} />
      </main>
    </div>
  );
}
