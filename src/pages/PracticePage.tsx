// The practice page (#/practice, or #/practice/<area> to open on an area): the board's practice on a page of its own,
// for a student who came to practise rather than to draw; #/join/<class code> opens it ready to join that class. Class
// practice works here the same way; the worksheet stays on the board, where it is inserted. Published on its own
// (practice-site.tsx) it has no server: no class to join, and its links lead back to the front page rather than to
// the boards.
import { BrandBar } from "../components/BrandBar";
import { SiteBar } from "../components/SiteBar";
import { PracticeDialog } from "../components/PracticeDialog";
import { useI18n } from "../i18n";
import { pageLang } from "../langs";

export function PracticePage({ start, invite, standalone }: { start?: string; invite?: string; standalone?: boolean }) {
  const { t } = useI18n();
  // Reached in a language by its address (?lang=), the way back keeps it.
  const front = `../${pageLang() ? `?lang=${pageLang()}` : ""}`;
  return (
    <div className="z z-wide">
      {standalone ? (
        <BrandBar home={front}><a href={front}>{t.aboutLink}</a></BrandBar>
      ) : (
        <SiteBar here="practice" />
      )}
      <div className="z-page practice-page">
        <h1 className="z-page-title">{t.practice}</h1>
        <main>
          <PracticeDialog start={start} invite={invite} noClass={standalone} />
        </main>
      </div>
    </div>
  );
}
