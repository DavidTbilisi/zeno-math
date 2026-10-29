// The practice page (#/practice, or #/practice/<area> to open on an area): the board's practice on a page of its own,
// for a student who came to practise rather than to draw. Class practice works here the same way; the worksheet stays
// on the board, where it is inserted. Published on its own (practice-site.tsx) it has no server: no class to join, and
// its links lead back to the front page rather than to the boards.
import { BrandBar } from "../components/BrandBar";
import { PracticeDialog } from "../components/PracticeDialog";
import { useI18n } from "../i18n";

export function PracticePage({ start, standalone }: { start?: string; standalone?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="z z-wide">
      <BrandBar home={standalone ? "../" : undefined}>
        {standalone ? <a href="../">{t.aboutLink}</a> : <><a href="#/course">{t.course.link}</a><a href="#/">{t.myBoards}</a></>}
      </BrandBar>
      <div className="z-page practice-page">
        <h1 className="z-page-title">{t.practice}</h1>
        <main>
          <PracticeDialog start={start} noClass={standalone} />
        </main>
      </div>
    </div>
  );
}
