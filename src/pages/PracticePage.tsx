// The practice page (#/practice, or #/practice/<area> to open on an area): the board's practice on a page of its own,
// for a student who came to practise rather than to draw; #/join/<class code> opens it ready to join that class. Class
// practice works here the same way; the worksheet stays on the board, where it is inserted. Published on its own
// (practice-site.tsx) it has no server: no class to join, and its links lead back to the front page rather than to
// the boards.
import { BarIcon } from "../components/BarIcon";
import { BrandBar } from "../components/BrandBar";
import { HelpButton, Welcome } from "../components/Help";
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
        <div className="help-title"><h1 className="z-page-title">{t.practice}</h1><HelpButton id="practice" /></div>
        <main>
          <Welcome id="practice" title={t.help.practice.title} steps={[
            { pic: <BarIcon name="practice" />, text: t.help.practice.pick },
            { pic: <BarIcon name="edit" />, text: t.help.practice.answer },
            { pic: <BarIcon name="games" />, text: t.help.practice.back },
          ]} />
          <PracticeDialog start={start} invite={invite} noClass={standalone} />
        </main>
      </div>
    </div>
  );
}
