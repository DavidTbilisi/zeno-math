// The thesis as one PDF: the chapters and the appendices in docs/thesis, with a title page, contents, and APA
// citations from references.bib and references-csl.yaml. Tables and figures are numbered by chapter, as the text
// refers to them (docs/thesis/chapter-numbers.lua). Pandoc and LuaLaTeX run in a pinned container, so neither needs
// installing.
// With --talk, the title-defense talk instead, laid out to read aloud from (docs/thesis/talk-pdf.yaml); with --concept,
// the concept paper, a short version of the plan for the concept stage (docs/thesis/concept-pdf.yaml).
//
//   npm run thesis-pdf              writes docs/thesis/thesis.pdf
//   npm run talk-pdf                writes docs/thesis/title-defense.pdf
//   npm run concept-pdf             writes docs/thesis/concept-paper.pdf
//
// Needs podman (or docker, with CONTAINER=docker) and the fonts named in docs/thesis/pdf.yaml in /usr/share/fonts.
// The first run pulls the image (about 1 GB).
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const DIR = "docs/thesis";
const IMAGE = "docker.io/pandoc/latex:3.6";
const CONTAINER = process.env.CONTAINER ?? "podman";
const talk = process.argv.includes("--talk");
const concept = process.argv.includes("--concept");

const chapters = readdirSync(DIR).filter((f) => /^(\d\d|appendix)-.*\.md$/.test(f)).sort().map((f) => `${DIR}/${f}`);
const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const citations = [
  "--citeproc", `--bibliography=${DIR}/references.bib`, `--bibliography=${DIR}/references-csl.yaml`,
  `--csl=${DIR}/apa.csl`,
];
const out = talk ? `${DIR}/title-defense.pdf` : concept ? `${DIR}/concept-paper.pdf` : `${DIR}/thesis.pdf`;
const pandoc = talk
  ? [`${DIR}/talk-pdf.yaml`, `${DIR}/title-defense.md`]
  : concept
  ? [`${DIR}/concept-pdf.yaml`, `${DIR}/concept-paper.md`, `--lua-filter=${DIR}/format-only.lua`, ...citations]
  : [
      `${DIR}/pdf.yaml`, ...chapters,
      "--metadata", `date=Draft, ${date}`,
      `--resource-path=${DIR}`,
      `--lua-filter=${DIR}/chapter-numbers.lua`,
      ...citations,
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
console.log(talk || concept ? out : `${out} (${chapters.length} chapters)`);
