// The site's top bar (#448): Zeno's mark and name, the sections of the site with the one being read marked, and the
// language. On a phone the sections fold under a Menu button, so the bar never runs off the side of the page.
import { useState } from "react";
import { LangSelect, useI18n } from "../i18n";
import type { Dict } from "../locales/en";
import { ZenoMark } from "./ZenoMark";

/** Where this copy's source is (AGPL-3.0 §13): a modified Zeno run for others points this at its own copy. */
export const SOURCE_URL = "https://github.com/DavidTbilisi/zeno-math";

export type Section = "learn" | "roadmaps" | "practice" | "library" | "boards" | "progress";
const LINKS: { id: Section; href: string; word: (t: Dict) => string }[] = [
  { id: "learn", href: "#/learn", word: (t) => t.site.learn },
  { id: "roadmaps", href: "#/roadmaps", word: (t) => t.roadmap.link },
  { id: "practice", href: "#/practice", word: (t) => t.practice },
  { id: "library", href: "#/library", word: (t) => t.site.library },
  { id: "boards", href: "#/boards", word: (t) => t.site.boards },
  { id: "progress", href: "#/progress", word: (t) => t.site.progress },
];

export function SiteBar({ here }: { here?: Section }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <header className={`z-bar site-bar${open ? " open" : ""}`}>
      <a className="z-brand" href="#/"><ZenoMark size={18} /><span>{t.appName}</span></a>
      <button className="site-menu z-btn z-btn-line" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
        {t.site.menu}
      </button>
      <nav id="site-nav" className="z-nav site-nav" aria-label={t.site.nav}>
        {LINKS.map((l) => (
          <a key={l.id} href={l.href} aria-current={l.id === here ? "page" : undefined} onClick={() => setOpen(false)}>{l.word(t)}</a>
        ))}
        <LangSelect />
      </nav>
    </header>
  );
}

/** The foot of every site page: about, teachers, and the source (AGPL-3.0 §13). */
export function SiteFoot() {
  const { t } = useI18n();
  return (
    <footer className="site-foot">
      <a href="#/about">{t.aboutLink}</a>
      <a href="#/teacher">{t.forTeachers}</a>
      <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">{t.sourceCode}</a>
    </footer>
  );
}
