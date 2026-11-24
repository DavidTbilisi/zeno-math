// The topic pages published on their own (GitHub Pages): #/learn and #/learn/<topic> are hash routes, which a search
// engine reads as one page, so each topic also gets a page of plain HTML in each language, written when the site is
// built (vite.prerender.config.ts, then scripts/landing-layout.mjs): what the topic is, where it turns up, and what
// there is to learn, each skill a link into the practice. No hooks and nothing from the browser here; the one live
// part, the hands-on piece under "Try it", is put in afterwards by topic-site.tsx.
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TopicPicture } from "./components/TopicPicture";
import { ZenoMark } from "./components/ZenoMark";
import { LANGS, type Lang } from "./langs";
import type { Dict } from "./locales/en";
import { en } from "./locales/en";
import { ka } from "./locales/ka";
import { ru } from "./locales/ru";
import { EXPLAINERS } from "./model/explainers";
import { SHELVES, TOPICS, topicOf, type TopicId } from "./model/topics";
import { frontPath, learnPath, practicePath, SITE_URL } from "./sitePaths";
import { SITE_LANGS, sitemap, TOPIC_IDS, type PageSet } from "./topicSite";

export { sitemap };

const DICTS: Record<Lang, Dict> = { en, ka, ru };
const REPO = "https://github.com/DavidTbilisi/zeno-math";
/** The site's root as a path ("/zeno-math/"): the pages sit at different depths, so their links start from it. */
const ROOT = new URL(SITE_URL).pathname;
const at = (path: string) => ROOT + path;

function Bar({ lang, pages }: { lang: Lang; pages: PageSet }) {
  const t = DICTS[lang];
  return (
    <header className="z-bar">
      <a className="z-brand" href={at(frontPath(lang))}><ZenoMark size={18} /><span>{t.appName}</span></a>
      <nav className="z-nav">
        <a href={at(learnPath(lang))}>{t.site.learnTitle}</a>
        <a href={at(practicePath(lang))}>{t.practice}</a>
        <span className="z-langs">
          {SITE_LANGS.map((l) => (
            <a key={l} href={at(pages[l])} lang={l} hrefLang={l} aria-current={l === lang ? "page" : undefined}>{LANGS.find((x) => x.code === l)!.label}</a>
          ))}
        </span>
      </nav>
    </header>
  );
}

function Foot({ lang }: { lang: Lang }) {
  const t = DICTS[lang];
  return (
    <footer className="site-foot">
      <a href={at(frontPath(lang))}>{t.aboutLink}</a>
      <a href={at(practicePath(lang))}>{t.about.tryPractice}</a>
      <a href={`${REPO}#run-with-docker`}>{t.about.getZeno}</a>
      <a href={REPO}>{t.about.source}</a>
    </footer>
  );
}

/** Topics as tiles, by shelf: every topic on the list page, the others under one topic's page. */
function Shelves({ lang, but }: { lang: Lang; but?: TopicId }) {
  const s = DICTS[lang].site;
  return (
    <>
      {SHELVES.map((shelf) => {
        const topics = TOPICS.filter((x) => x.shelf === shelf && x.id !== but);
        if (!topics.length) return null;
        return (
          <section key={shelf} className="site-section" aria-labelledby={`shelf-${shelf}`}>
            <h2 id={`shelf-${shelf}`} className="site-shelf">{s.shelves[shelf]}</h2>
            <ul className="site-topics">
              {topics.map((x) => (
                <li key={x.id}>
                  <a className="site-topic" href={at(learnPath(lang, x.id))}>
                    <span className="site-topic-icon" aria-hidden="true">{x.icon}</span>
                    <strong>{s.topics[x.id].name}</strong>
                    <span className="road-about">{s.topics[x.id].about}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function TopicsPage({ lang, pages }: { lang: Lang; pages: PageSet }) {
  const t = DICTS[lang];
  return (
    <div className="z site">
      <Bar lang={lang} pages={pages} />
      <main className="z-page site-learn">
        <h1 className="z-page-title">{t.site.learnTitle}</h1>
        <p className="course-lede">{t.about.topicsLede}</p>
        <Shelves lang={lang} />
      </main>
      <Foot lang={lang} />
    </div>
  );
}

function TopicPage({ lang, id, pages }: { lang: Lang; id: TopicId; pages: PageSet }) {
  const t = DICTS[lang];
  const s = t.site;
  const topic = topicOf(id);
  const words = s.explain.topics[id];
  return (
    <div className="z site">
      <Bar lang={lang} pages={pages} />
      <main className="z-page site-topic-page">
        <a className="site-back" href={at(learnPath(lang))}>← {s.otherTopics}</a>
        <h1 className="z-page-title"><span className="site-topic-icon" aria-hidden="true">{topic.icon}</span> {s.topics[id].name}</h1>
        <p className="course-lede">{s.topics[id].about}</p>

        <section className="site-section explainer" aria-labelledby="topic-what">
          <div className="explainer-what">
            <TopicPicture topic={id} />
            <div>
              <h2 id="topic-what">{words.q}</h2>
              <p>{words.what}</p>
            </div>
          </div>
          <h3 className="explainer-use-head">{s.explain.useHead}</h3>
          <ul className="explainer-uses">
            {words.uses.map((u, n) => (
              <li key={n}><span className="explainer-icon" aria-hidden="true">{EXPLAINERS[id].uses[n]}</span><span>{u}</span></li>
            ))}
          </ul>
        </section>

        <section className="site-section" aria-labelledby="topic-try">
          <h2 id="topic-try">{s.tryHead}</h2>
          {/* topic-site.tsx draws the piece here */}
          <div id="topic-piece" className="site-try" data-kind={EXPLAINERS[id].try} />
        </section>

        {topic.skills.length > 0 && (
          <section className="site-section" aria-labelledby="topic-learn">
            <h2 id="topic-learn">{s.learnHead}</h2>
            <ul className="site-skills">
              {topic.skills.map((k) => (
                <li key={k}><a className="site-skill" href={at(practicePath(lang, k))}>{t.pracWords.skills[k]}</a></li>
              ))}
            </ul>
          </section>
        )}

        <footer className="z-end">
          <p>{t.about.endTitle}</p>
          <a className="z-btn z-btn-ink" href={at(practicePath(lang, topic.skills[0]))}>{t.about.tryPractice}</a>
        </footer>

        <Shelves lang={lang} but={id} />
      </main>
      <Foot lang={lang} />
    </div>
  );
}

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The built shell (topic.html: the styles and topic-site.tsx, under their built names) with one page's own head and
 *  body put in. Throws when the shell has lost one of the places they go. */
function inShell(shell: string, lang: Lang, pages: PageSet, title: string, description: string, body: ReactNode): string {
  const url = SITE_URL + pages[lang];
  const head = [
    `<meta name="description" content="${attr(description)}" />`,
    `<link rel="canonical" href="${attr(url)}" />`,
    ...SITE_LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${attr(SITE_URL + pages[l])}" />`),
    `<link rel="alternate" hreflang="x-default" href="${attr(SITE_URL + pages.en)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${attr(title)}" />`,
    `<meta property="og:description" content="${attr(description)}" />`,
    `<meta property="og:url" content="${attr(url)}" />`,
    `<meta property="og:image" content="${SITE_URL}og.png" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join("\n    ");
  const swaps: [RegExp, string][] = [
    [/<html lang="en">/, `<html lang="${lang}" data-lang="${lang}">`],
    [/<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`],
    [/<meta name="zeno-head"[^>]*>/, head],
    [/<div id="zeno-static"><\/div>/, renderToStaticMarkup(body)],
  ];
  return swaps.reduce((html, [place, text]) => {
    if (!place.test(html)) throw new Error(`topic.html has no ${place}`);
    return html.replace(place, () => text);
  }, shell);
}

/** Every topic page and the list of topics, in every language: where each goes under the site's root, and its HTML. */
export function topicPages(shell: string): { path: string; html: string }[] {
  const out: { path: string; html: string }[] = [];
  const all: PageSet = { en: learnPath("en"), ka: learnPath("ka"), ru: learnPath("ru") };
  for (const lang of SITE_LANGS) {
    const t = DICTS[lang];
    out.push({ path: all[lang], html: inShell(shell, lang, all, `${t.site.learnTitle} | Zeno`, t.about.topicsLede, <TopicsPage lang={lang} pages={all} />) });
    for (const id of TOPIC_IDS) {
      const pages: PageSet = { en: learnPath("en", id), ka: learnPath("ka", id), ru: learnPath("ru", id) };
      const w = t.site.explain.topics[id];
      out.push({ path: pages[lang], html: inShell(shell, lang, pages, `${w.q} ${t.site.topics[id].name} | Zeno`, w.what, <TopicPage lang={lang} id={id} pages={pages} />) });
    }
  }
  return out;
}
