// The thesis as one PDF: chapters 1 to 7 and the appendices in docs/thesis, with a title page, contents, and APA
// citations from references.bib. Tables and figures are numbered by chapter, as the text refers to them
// (docs/thesis/chapter-numbers.lua). Pandoc and LuaLaTeX run in a pinned container, so neither needs installing.
//
//   npm run thesis-pdf              writes docs/thesis/thesis.pdf
//
// Needs podman (or docker, with CONTAINER=docker) and the fonts named in docs/thesis/pdf.yaml in /usr/share/fonts.
// The first run pulls the image (about 1 GB).
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const DIR = "docs/thesis";
const OUT = `${DIR}/thesis.pdf`;
const IMAGE = "docker.io/pandoc/latex:3.6";
const CONTAINER = process.env.CONTAINER ?? "podman";

const chapters = readdirSync(DIR).filter((f) => /^(\d\d|appendix)-.*\.md$/.test(f)).sort().map((f) => `${DIR}/${f}`);
const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const run = spawnSync(CONTAINER, [
  "run", "--rm",
  "-v", `${process.cwd()}:/data:Z`,
  "-v", "/usr/share/fonts:/usr/share/fonts/host:ro",
  IMAGE,
  `${DIR}/pdf.yaml`, ...chapters,
  "--metadata", `date=Draft, ${date}`,
  `--resource-path=${DIR}`,
  `--lua-filter=${DIR}/chapter-numbers.lua`,
  "--citeproc", `--bibliography=${DIR}/references.bib`, `--csl=${DIR}/apa.csl`,
  "--pdf-engine=lualatex",
  "-o", OUT,
], { stdio: "inherit" });
if (run.error) throw run.error;
if (run.status !== 0) process.exit(run.status ?? 1);
console.log(`${OUT} (${chapters.length} chapters)`);
