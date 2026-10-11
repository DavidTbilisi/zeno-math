// The thesis as one PDF: the chapters and the appendices in docs/thesis, with a title page, contents, and APA
// citations from references.bib. Tables and figures are numbered by chapter, as the text refers to them
// (docs/thesis/chapter-numbers.lua). Pandoc and LuaLaTeX run in a pinned container, so neither needs installing.
// With --talk, the title-defense talk instead, laid out to read aloud from (docs/thesis/talk-pdf.yaml).
//
//   npm run thesis-pdf              writes docs/thesis/thesis.pdf
//   npm run talk-pdf                writes docs/thesis/title-defense.pdf
//
// Needs podman (or docker, with CONTAINER=docker) and the fonts named in docs/thesis/pdf.yaml in /usr/share/fonts.
// The first run pulls the image (about 1 GB).
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const DIR = "docs/thesis";
const IMAGE = "docker.io/pandoc/latex:3.6";
const CONTAINER = process.env.CONTAINER ?? "podman";
const talk = process.argv.includes("--talk");

const chapters = readdirSync(DIR).filter((f) => /^(\d\d|appendix)-.*\.md$/.test(f)).sort().map((f) => `${DIR}/${f}`);
const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const out = talk ? `${DIR}/title-defense.pdf` : `${DIR}/thesis.pdf`;
const pandoc = talk
  ? [`${DIR}/talk-pdf.yaml`, `${DIR}/title-defense.md`]
  : [
      `${DIR}/pdf.yaml`, ...chapters,
      "--metadata", `date=Draft, ${date}`,
      `--resource-path=${DIR}`,
      `--lua-filter=${DIR}/chapter-numbers.lua`,
      "--citeproc", `--bibliography=${DIR}/references.bib`, `--csl=${DIR}/apa.csl`,
    ];

const run = spawnSync(CONTAINER, [
  "run", "--rm",
  "-v", `${process.cwd()}:/data:Z`,
  "-v", "/usr/share/fonts:/usr/share/fonts/host:ro",
  IMAGE,
  ...pandoc,
  "--pdf-engine=lualatex",
  "-o", out,
], { stdio: "inherit" });
if (run.error) throw run.error;
if (run.status !== 0) process.exit(run.status ?? 1);
console.log(talk ? out : `${out} (${chapters.length} chapters)`);
