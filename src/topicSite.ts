// The published site's pages (sitePaths.ts) as a list, and its sitemap: every page in every language, each naming its
// other languages, so a search engine finds all of them and shows a reader their own.
import type { Lang } from "./langs.ts";
import { TOPICS, type TopicId } from "./model/topics.ts";
import { frontPath, learnPath, practicePath, SITE_URL } from "./sitePaths.ts";

/** English first: it is the page a reader of any other language is sent to. */
export const SITE_LANGS: readonly Lang[] = ["en", "ka", "ru"];

/** One page in its three languages: the path of each under the site's root. */
export type PageSet = Record<Lang, string>;
const set = (path: (l: Lang) => string): PageSet => ({ en: path("en"), ka: path("ka"), ru: path("ru") });

export const TOPIC_IDS: readonly TopicId[] = TOPICS.map((t) => t.id);

/** Every page of the published site: the front page, the practice, the list of topics, and each topic. */
export function pageSets(): PageSet[] {
  return [set(frontPath), set((l) => practicePath(l)), set((l) => learnPath(l)), ...TOPIC_IDS.map((id) => set((l) => learnPath(l, id)))];
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function sitemap(): string {
  const urls = pageSets().flatMap((pages) =>
    SITE_LANGS.map((l) => {
      const alternates = [...SITE_LANGS.map((x) => [x, pages[x]] as const), ["x-default", pages.en] as const]
        .map(([code, path]) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${xml(SITE_URL + path)}"/>`);
      return [`  <url>`, `    <loc>${xml(SITE_URL + pages[l])}</loc>`, ...alternates, `  </url>`].join("\n");
    }),
  );
  return [`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`, ...urls, `</urlset>`, ""].join("\n");
}
