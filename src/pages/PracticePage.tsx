// The practice page (#/practice, or #/practice/<area> to open on an area): the board's practice on a page of its own,
// for a student who came to practise rather than to draw. Class practice works here the same way; the worksheet stays
// on the board, where it is inserted.
import { BrandBar } from "../components/BrandBar";
import { PracticeDialog } from "../components/PracticeDialog";
import { useI18n } from "../i18n";

export function PracticePage({ start }: { start?: string }) {
  const { t } = useI18n();
  return (
    <div className="z z-wide">
      <BrandBar>
        <a href="#/">{t.myBoards}</a>
      </BrandBar>
      <div className="z-page practice-page">
        <h1 className="z-page-title">{t.practice}</h1>
        <main>
          <PracticeDialog start={start} />
        </main>
      </div>
    </div>
  );
}
