// Where the pages published on their own (GitHub Pages, vite.landing.config.ts) live, each relative to the site's root:
// the front page, the practice, and a page per topic (topic-prerender.tsx). English is at the root, Georgian and
// Russian under ka/ and ru/; the front page and the practice are one page each, told the language by ?lang= (langs.ts).
// No imports but the type, so the front page can link to the topics without carrying them.
import type { Lang } from "./langs";

/** The published site's address, for canonical links and the sitemap. */
export const SITE_URL = "https://davidtbilisi.github.io/zeno-math/";

const query = (l: Lang) => (l === "en" ? "" : `?lang=${l}`);
export const frontPath = (l: Lang) => query(l);
/** The practice, on a skill's first level when one is named. */
export const practicePath = (l: Lang, skill?: string) => `practice/${query(l)}${skill ? `#/practice/${skill}.1` : ""}`;
/** Every topic's page, or one topic's. */
export const learnPath = (l: Lang, topic?: string) => `${l === "en" ? "" : `${l}/`}learn/${topic ? `${topic}/` : ""}`;
