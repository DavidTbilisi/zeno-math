// After npm run build:landing's two builds: the pages at the addresses GitHub Pages serves. landing.html becomes the
// site's index.html and practice.html practice/index.html (so the address is .../practice/); topic.html is the shell
// that dist-prerender/topic-prerender.js fills once for the list of topics and once for each topic, in each language
// (learn/, learn/fractions/, ka/learn/fractions/, …); and sitemap.xml lists every page.
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sitemap, topicPages } from "../dist-prerender/topic-prerender.js";

const OUT = "dist-landing";
renameSync(join(OUT, "landing.html"), join(OUT, "index.html"));
mkdirSync(join(OUT, "practice"), { recursive: true });
renameSync(join(OUT, "practice.html"), join(OUT, "practice/index.html"));

const shell = readFileSync(join(OUT, "topic.html"), "utf8");
rmSync(join(OUT, "topic.html"));
const pages = topicPages(shell);
for (const { path, html } of pages) {
  // A page with no heading or no words would still build; it must not be published.
  if (!/<h1[ >]/.test(html) || /zeno-static|zeno-head/.test(html)) throw new Error(`${path}: the page was not filled in`);
  const file = join(OUT, path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}
writeFileSync(join(OUT, "sitemap.xml"), sitemap());
console.log(`${pages.length} topic pages and sitemap.xml written to ${OUT}/`);
