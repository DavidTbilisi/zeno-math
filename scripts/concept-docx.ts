// The concept paper as a Word file, which the department asked for: docs/thesis/concept-paper.md with the title page of
// the university's template (the UG logo, author, committee, supervisor, date), the template's running head, headings in
// regular weight, and APA citations as in the PDF. The styles, header and footer come from
// docs/thesis/concept-reference.docx. The contents page is written with its page numbers: a first build is rendered by
// LibreOffice to find the page each chapter starts on, and the second build carries those numbers.
//
//   npm run concept-docx            writes docs/thesis/concept-paper.docx
//
// Needs podman (or docker, with CONTAINER=docker), LibreOffice (soffice) and pdftotext.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DIR = "docs/thesis";
const IMAGE = "docker.io/pandoc/latex:3.6";
const CONTAINER = process.env.CONTAINER ?? "podman";
const SOURCE = `${DIR}/concept-paper.md`;
const STAGED = `${DIR}/.concept-paper.docx.md`;
const OUT = `${DIR}/concept-paper.docx`;
const MARKER = "<!-- docx-contents -->";

const run = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${r.stderr}`);
  return r.stdout;
};

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const markdown = readFileSync(SOURCE, "utf8");
// The chapters the contents list: the top-level headings outside the abstracts (the unnumbered introduction, then the
// numbered chapters), then the references.
const chapters = [...markdown.matchAll(/^# ([^{\n]+)$/gm)].map((m) => m[1].trim()).concat("References");

// A TOC field whose shown result is the list with its page numbers, so Word can still update it.
const contents = (pages: Map<string, number>) => {
  const entry = (title: string, i: number) => {
    const begin = i === 0
      ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-1" \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>'
      : "";
    const end = i === chapters.length - 1 ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : "";
    return `<w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr>${begin}<w:r><w:t xml:space="preserve">${escape(title)}</w:t></w:r>`
      + `<w:r><w:tab/></w:r><w:r><w:t>${pages.get(title) ?? ""}</w:t></w:r>${end}</w:p>`;
  };
  return ["```{=openxml}", '<w:p><w:pPr><w:pStyle w:val="TOCHeading"/></w:pPr><w:r><w:t>Contents</w:t></w:r></w:p>',
    ...chapters.map(entry), "```"].join("\n");
};

const build = (pages: Map<string, number>) => {
  writeFileSync(STAGED, markdown.replace(MARKER, contents(pages)));
  run(CONTAINER, [
    "run", "--rm", "-v", `${process.cwd()}:/data:Z`, IMAGE,
    STAGED, "-f", "markdown", "-o", OUT,
    `--reference-doc=${DIR}/concept-reference.docx`,
    `--resource-path=${DIR}`,
    `--lua-filter=${DIR}/format-only.lua`,
    "--citeproc", `--bibliography=${DIR}/references.bib`, `--bibliography=${DIR}/references-csl.yaml`,
    `--csl=${DIR}/apa.csl`,
    "--metadata", "reference-section-title=References",
    "--metadata", "link-citations=true",
  ]);
};

// The page each chapter starts on in LibreOffice's rendering: the first page after the contents page with a line that
// is exactly the heading.
const findPages = () => {
  const tmp = mkdtempSync(join(tmpdir(), "concept-docx-"));
  try {
    run("soffice", ["--headless", "--convert-to", "pdf", "--outdir", tmp, OUT]);
    const text = run("pdftotext", ["-layout", join(tmp, "concept-paper.pdf"), "-"]);
    const sheets = text.split("\f").map((p) => p.split("\n").map((l) => l.trim()));
    const contentsPage = sheets.findIndex((lines) => lines.includes("Contents"));
    const pages = new Map<string, number>();
    for (const title of chapters) {
      const i = sheets.findIndex((lines, n) => n > contentsPage && lines.includes(title));
      if (i < 0) throw new Error(`heading not found in the rendering: ${title}`);
      pages.set(title, i + 1);
    }
    return { pages, total: sheets.filter((lines) => lines.some(Boolean)).length };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
};

try {
  build(new Map());
  const first = findPages();
  build(first.pages);
  const second = findPages();
  for (const [title, page] of first.pages) {
    if (second.pages.get(title) !== page) throw new Error(`page of "${title}" moved from ${page} to ${second.pages.get(title)}`);
  }
  console.log(`${OUT} (${second.total} pages; ${chapters.map((t) => `${t.split(" ")[0]} p.${second.pages.get(t)}`).join(", ")})`);
} finally {
  rmSync(STAGED, { force: true });
}
