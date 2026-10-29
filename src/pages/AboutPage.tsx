// The front page for schools inside the app (#/about, and /about, which the server opens to anyone). Its links go to the
// app at /, so from the open /about they lead to the password rather than past it.
import { BrandBar } from "../components/BrandBar";
import { Landing } from "../components/Landing";
import { useI18n } from "../i18n";

export function AboutPage() {
  const { t } = useI18n();
  const a = t.about;
  return (
    <Landing
      a={a}
      bar={
        <BrandBar home="/#/">
          <a href="/#/">{t.myBoards}</a>
        </BrandBar>
      }
      ctas={
        <>
          <a className="z-btn z-btn-ink" href="/#/practice">{a.tryPractice}</a>
          <a className="z-btn z-btn-line" href="/#/teacher">{a.forTeachers}</a>
        </>
      }
      endCta={<a className="z-btn z-btn-ink" href="/#/practice">{a.tryPractice}</a>}
    />
  );
}
