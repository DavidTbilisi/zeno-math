// The thesis as one PDF: the chapters and the appendices in docs/thesis, with a title page, contents, and APA
// citations from references.bib and references-csl.yaml. Tables and figures are numbered by chapter, as the text
// refers to them (docs/thesis/chapter-numbers.lua). Pandoc and LuaLaTeX run in a pinned container, so neither needs
// installing.
// With --talk, the title-defense talk instead, laid out to read aloud from (docs/thesis/talk-pdf.yaml); with --final,
// the final-defence talk, laid out the same way; with --concept,
// the concept paper, a short version of the plan for the concept stage (docs/thesis/concept-pdf.yaml).
// With --preliminary, build Word and render its matching PDF with verified contents.
//
//   npm run thesis-pdf              writes docs/thesis/thesis.pdf
//   npm run talk-pdf                writes docs/thesis/title-defense.pdf
//   npm run final-talk-pdf          writes docs/thesis/final-defense.pdf
//   npm run concept-pdf             writes docs/thesis/concept-paper.pdf
//   npm run preliminary-pdf         writes docs/thesis/preliminary-draft.pdf
//
// Needs podman (or docker, with CONTAINER=docker) and the fonts named in docs/thesis/pdf.yaml in /usr/share/fonts.
// The first run pulls the image (about 1 GB).
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const DIR = "docs/thesis";
const IMAGE = "docker.io/pandoc/latex:3.6";
const CONTAINER = process.env.CONTAINER ?? "podman";
const final = process.argv.includes("--final");
const talk = final || process.argv.includes("--talk");
const talkFile = final ? "final-defense" : "title-defense";
const concept = process.argv.includes("--concept");
const preliminary = process.argv.includes("--preliminary");

// The preliminary PDF is rendered from Word so both versions share pagination.
if (preliminary) {
  const build = spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", "scripts/preliminary-docx.ts"], { stdio: "inherit" });
  if (build.error) throw build.error;
  process.exit(build.status ?? 1);
}

const chapters = readdirSync(DIR).filter((f) => /^(\d\d|appendix)-.*\.md$/.test(f)).sort().map((f) => `${DIR}/${f}`);
const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const citations = [
  "--citeproc", `--bibliography=${DIR}/references.bib`, `--bibliography=${DIR}/references-csl.yaml`,
  `--csl=${DIR}/apa.csl`,
];
const out = talk ? `${DIR}/${talkFile}.pdf` : preliminary ? `${DIR}/preliminary-draft.pdf` : concept ? `${DIR}/concept-paper.pdf` : `${DIR}/thesis.pdf`;
const pandoc = talk
  ? [`${DIR}/talk-pdf.yaml`, `${DIR}/${talkFile}.md`]
  : preliminary
  ? [`${DIR}/preliminary-pdf.yaml`, `${DIR}/preliminary-draft.md`, `--resource-path=${DIR}`, ...citations]
  : concept
  ? [`${DIR}/concept-pdf.yaml`, `${DIR}/concept-paper.md`, `--lua-filter=${DIR}/format-only.lua`, ...citations]
  : [
      `${DIR}/pdf.yaml`, ...chapters,
      "--metadata", `date=${date}`,
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
console.log(talk || concept || preliminary ? out : `${out} (${chapters.length} chapters)`);
