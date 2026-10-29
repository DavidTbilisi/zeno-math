// The front page for schools published on its own (GitHub Pages, vite.landing.config.ts): the landing with only its
// own words in three languages, no server and no app. Its buttons lead to the practice published beside it
// (practice-site.tsx) and to installing Zeno.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Landing } from "./components/Landing";
import { ZenoMark } from "./components/ZenoMark";
import { detectLang, LANGS, type Lang } from "./langs";
import { about as en } from "./locales/about/en";
import { about as ka } from "./locales/about/ka";
import { about as ru } from "./locales/about/ru";
import "./styles.css";

const WORDS = { en, ka, ru };
const REPO = "https://github.com/DavidTbilisi/zeno-math";
const INSTALL = `${REPO}#run-with-docker`;

function Page() {
  const [lang, setLang] = useState<Lang>(() => {
    const l = detectLang();
    document.documentElement.lang = l;
    return l;
  });
  const choose = (l: Lang) => {
    setLang(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem("lang", l);
    } catch {
      /* storage unavailable: the choice lasts this visit */
    }
  };
  const a = WORDS[lang];
  const tryPractice = <a className="z-btn z-btn-ink" href="practice/">{a.tryPractice}</a>;
  return (
    <Landing
      a={a}
      bar={
        <header className="z-bar">
          <span className="z-brand"><ZenoMark size={18} /><span>Zeno</span></span>
          <nav className="z-nav">
            <a href={REPO}>GitHub</a>
            <select className="lang-select" aria-label="Language" value={lang} onChange={(e) => choose(e.target.value as Lang)}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </nav>
        </header>
      }
      ctas={
        <>
          {tryPractice}
          <a className="z-btn z-btn-line" href={INSTALL}>{a.getZeno}</a>
        </>
      }
      endCta={tryPractice}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);
