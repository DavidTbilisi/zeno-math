// The thesis's figures, made again from the code: the five diagrams in docs/architecture.md, the learner model's
// calibration on simulated classes, a practice question with a mistake named, and the teacher dashboard after a dry
// run. Build first (npm run build); the screenshots are of the built app, served by the real server.
//
//   npm run figures                 writes docs/thesis/figures/*.png
//
// Mermaid is loaded from jsDelivr (a pinned version) to draw the diagrams, so this needs the network; everything else
// is local. Each run is the same except the dry run's class code, which is random (appendix D).
import { chromium, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs, type Exercise, type SkillId } from "../src/math/practice.ts";
import { parseCsv } from "../src/model/evaluate.ts";
import { dryRun } from "./dry-run-study.ts";

const OUT = "docs/thesis/figures";
const MERMAID = "https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.min.js";
/** Pixels per CSS pixel: sharp enough for print at the width of a page. */
const SCALE = 3;
const TEACHER = "figures";

// ---------- the diagrams ----------

const DIAGRAMS = ["context", "blocks", "data-model", "practice-sequence", "protocol"];

async function diagrams(page: Page) {
  const blocks = [...readFileSync("docs/architecture.md", "utf8").matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
  if (blocks.length !== DIAGRAMS.length) throw new Error(`docs/architecture.md has ${blocks.length} diagrams, expected ${DIAGRAMS.length}`);
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff"><div id="out" style="display:inline-block;padding:16px"></div></body></html>`);
  await page.addScriptTag({ url: MERMAID });
  await page.evaluate(() => (window as unknown as { mermaid: { initialize(o: object): void } }).mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    fontFamily: "Arial, sans-serif",
    // Group titles on one line (Mermaid sizes them narrower than they are and cuts them off), and notes that wrap.
    themeCSS: ".cluster-label foreignObject { overflow: visible; } .cluster-label div, .cluster-label span { white-space: nowrap !important; }",
    sequence: { wrap: true },
  }));
  for (const [i, code] of blocks.entries()) {
    await page.evaluate(async ({ code, id }) => {
      const { svg } = await (window as unknown as { mermaid: { render(id: string, code: string): Promise<{ svg: string }> } }).mermaid.render(id, code);
      document.getElementById("out")!.innerHTML = svg;
    }, { code, id: `d${i}` });
    await page.locator("#out").screenshot({ path: join(OUT, `${DIAGRAMS[i]}.png`) });
  }
}

// ---------- calibration on simulated classes ----------

type Bin = { model: string; n: number; predicted: number; observed: number };
/** Bins resting on fewer answers than this are left out: a share of 2 or 8 answers is noise, not calibration. */
const MIN_ANSWERS = 20;
/** The models shown: the learner model and the two standard ones, in the palette's first three slots. */
const SERIES = [
  { model: "elo", label: "Elo (Zeno)", color: "#2a78d6" },
  { model: "PFA", label: "PFA", color: "#eb6834" },
  { model: "BKT", label: "BKT", color: "#1baf7a" },
];

function calibrationSvg(bins: Bin[]): string {
  const [w, h, left, top, size] = [560, 520, 64, 24, 440];
  const x = (p: number) => left + p * size;
  const y = (p: number) => top + (1 - p) * size;
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const grid = ticks.map((t) => `<line x1="${x(0)}" x2="${x(1)}" y1="${y(t)}" y2="${y(t)}" stroke="#e4e3df"/><line y1="${y(0)}" y2="${y(1)}" x1="${x(t)}" x2="${x(t)}" stroke="#e4e3df"/>`).join("");
  const labels = ticks.map((t) => `<text x="${x(t)}" y="${y(0) + 18}" text-anchor="middle">${t.toFixed(1)}</text><text x="${x(0) - 8}" y="${y(t) + 4}" text-anchor="end">${t.toFixed(1)}</text>`).join("");
  const lines = SERIES.map((s) => {
    const pts = bins.filter((b) => b.model === s.model && b.n >= MIN_ANSWERS);
    const path = pts.map((b, i) => `${i ? "L" : "M"}${x(b.predicted).toFixed(1)},${y(b.observed).toFixed(1)}`).join("");
    const dots = pts.map((b) => `<circle cx="${x(b.predicted).toFixed(1)}" cy="${y(b.observed).toFixed(1)}" r="4.5" fill="${s.color}" stroke="#fff" stroke-width="2"/>`).join("");
    return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2"/>${dots}`;
  }).join("");
  const row = (i: number) => `translate(${x(0) + 16},${y(1) + 18 + i * 22})`;
  const legend = SERIES.map((s, i) => `<g transform="${row(i)}"><line x1="0" x2="22" y1="0" y2="0" stroke="${s.color}" stroke-width="2"/><circle cx="11" cy="0" r="4.5" fill="${s.color}" stroke="#fff" stroke-width="2"/><text x="30" y="4">${s.label}</text></g>`).join("")
    + `<g transform="${row(SERIES.length)}"><line x1="0" x2="22" y1="0" y2="0" stroke="#8a8984" stroke-width="1.5" stroke-dasharray="5 4"/><text x="30" y="4">perfect calibration</text></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Arial, sans-serif" font-size="13" fill="#52514e">
  <rect width="${w}" height="${h}" fill="#fcfcfb"/>
  ${grid}
  <line x1="${x(0)}" y1="${y(0)}" x2="${x(1)}" y2="${y(1)}" stroke="#8a8984" stroke-width="1.5" stroke-dasharray="5 4"/>
  ${labels}
  ${lines}
  ${legend}
  <text x="${x(0.5)}" y="${h - 8}" text-anchor="middle" fill="#0b0b0b">predicted chance of a right first answer</text>
  <text transform="translate(16,${y(0.5)}) rotate(-90)" text-anchor="middle" fill="#0b0b0b">share answered right</text>
</svg>`;
}

async function calibration(page: Page, dir: string) {
  const file = join(dir, "bins.csv");
  await run(process.execPath, ["--disable-warning=ExperimentalWarning", "--import", "./scripts/ts-register.mjs", "scripts/evaluate-model.ts", "--simulate", "--fit", "--calibration", file]);
  const bins = parseCsv(readFileSync(file, "utf8")).map((r) => ({ model: r.model, n: Number(r.n), predicted: Number(r.predicted), observed: Number(r.observed) }));
  await page.setContent(`<!doctype html><html><body style="margin:0">${calibrationSvg(bins)}</body></html>`);
  await page.locator("svg").screenshot({ path: join(OUT, "calibration-simulated.png") });
}

// ---------- screenshots of the app ----------

/** A value for Math.random whose fractions question has a tops-and-bottoms trap (as in e2e/practice.spec.ts). */
function addAcrossQuestion(): { r: number; ex: Exercise } {
  for (let i = 1; i < 500; i++) {
    const r = i / 501;
    const ex = exercise("fractions" as SkillId, 1, Math.floor(r * 2 ** 31), en.pracWords);
    if (trapInputs(ex).some((t) => t.id === "addAcross")) return { r, ex };
  }
  throw new Error("no fractions question with an addAcross trap");
}

async function practiceHint(page: Page, base: string) {
  const board = await (await fetch(`${base}/api/boards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Practice" }) })).json();
  await page.goto(`${base}/#/b/${board.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Practice");
  await page.keyboard.press("Enter");
  await page.getByRole("tab", { name: "Number" }).click();
  const { r, ex } = addAcrossQuestion();
  await page.evaluate((x) => (Math.random = () => x), r);
  await page.getByRole("radio", { name: "easy" }).click();
  await page.getByRole("button", { name: "Fractions", exact: true }).click();
  await page.getByLabel("Your answer").fill(trapInputs(ex).find((t) => t.id === "addAcross")!.input);
  await page.getByRole("button", { name: "Check" }).click();
  await page.locator(".practice-hint").waitFor();
  await page.getByRole("dialog").screenshot({ path: join(OUT, "practice-mistake-hint.png") });
}

async function dashboard(page: Page, base: string) {
  await dryRun({ base, teacher: TEACHER, students: 24, questions: 30, testLength: 12, world: "elo", seed: 1 });
  await page.goto(`${base}/#/teacher`);
  await page.getByLabel("Teacher password").fill(TEACHER);
  await page.getByRole("button", { name: "Open" }).click();
  await page.locator(".class-item", { hasText: "Dry run" }).click();
  await page.locator(".class-head h2", { hasText: "Dry run" }).waitFor();
  await page.waitForLoadState("networkidle");
  // Two figures, each a page high at most: the groups and tests, then mastery and calibration.
  const parts = await page.evaluate(() =>
    [...document.querySelector(".teacher-main")!.children].map((c) => {
      const r = c.getBoundingClientRect();
      return { heading: c.querySelector("h2, h3")?.textContent ?? "", x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
    }));
  const span = (from: string, to: string) => {
    const [a, b] = [parts.findIndex((p) => p.heading.startsWith(from)), parts.findIndex((p) => p.heading.startsWith(to))];
    if (a < 0 || b < 0) throw new Error(`dashboard sections not found: ${from}, ${to}`);
    const top = parts[a].y, bottom = parts[b].y + parts[b].height;
    return { x: parts[a].x, y: top, width: parts[a].width, height: bottom - top };
  };
  await page.screenshot({ path: join(OUT, "dashboard-groups.png"), fullPage: true, clip: span("The two groups", "Pre- and post-test") });
  await page.screenshot({ path: join(OUT, "dashboard-mastery.png"), fullPage: true, clip: span("Mastery by skill", "Does the model predict well?") });
}

// ---------- running it ----------

function run(cmd: string, args: string[]) {
  return new Promise<void>((ok, fail) => {
    const p = spawn(cmd, args, { stdio: "ignore" });
    p.on("exit", (code) => (code === 0 ? ok() : fail(new Error(`${args.join(" ")} exited with ${code}`))));
  });
}

async function startServer(dataDir: string, port: number) {
  const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, STATIC_DIR: "dist", APP_PASSWORD: "", TEACHER_PASSWORD: TEACHER, BIND_ADDRESS: "127.0.0.1" },
    stdio: "pipe",
  });
  await new Promise<void>((ok, fail) => {
    server.stdout!.on("data", (d) => String(d).includes("listening") && ok());
    server.on("exit", (code) => fail(new Error(`server exited with ${code}`)));
  });
  return { base: `http://127.0.0.1:${port}`, stop: () => new Promise<void>((ok) => (server.exitCode !== null ? ok() : (server.once("exit", () => ok()), server.kill()))) };
}

if (import.meta.main) {
  mkdirSync(OUT, { recursive: true });
  const dir = mkdtempSync(join(tmpdir(), "zeno-figures-"));
  const server = await startServer(join(dir, "data"), 20000 + Math.floor(Math.random() * 20000));
  const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {});
  try {
    const figures = await browser.newPage({ deviceScaleFactor: SCALE });
    await diagrams(figures);
    await calibration(figures, dir);
    const app = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1280, height: 860 }, colorScheme: "light" });
    await practiceHint(app, server.base);
    await dashboard(app, server.base);
    console.log(`figures written to ${OUT}/`);
  } finally {
    await browser.close();
    await server.stop();
    rmSync(dir, { recursive: true, force: true });
  }
}
