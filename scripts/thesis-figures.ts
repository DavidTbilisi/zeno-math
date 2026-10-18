// The thesis's figures, made again from the code: the five diagrams in docs/architecture.md, the learner model's
// calibration on simulated classes, G1's precision against the number of components and G4's log-loss at three grains
// (G4 needs data/assistments.json, scripts/import-assistments.ts), a practice question with a mistake named, and the
// teacher dashboard after a dry run. Build first (npm run build); the screenshots are of the built app, served by the
// real server.
//
//   npm run figures                 writes docs/thesis/figures/*.png
//
// Mermaid is loaded from jsDelivr (a pinned version) to draw the diagrams, so this needs the network; everything else
// is local. Each run is the same except the dry run's class code, which is random (appendix D).
import { chromium, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { en } from "../src/locales/en.ts";
import { exercise, trapInputs, type Exercise, type SkillId } from "../src/math/practice.ts";
import { parseCsv } from "../src/model/evaluate.ts";
import { dryRun } from "./dry-run-study.ts";

const OUT = "docs/thesis/figures";
// The copy Excalidraw brings along, so the figures are made offline and from a version the lockfile pins.
const MERMAID = "node_modules/mermaid/dist/mermaid.min.js";
/** Pixels per CSS pixel: sharp enough for print at the width of a page. */
const SCALE = 3;
const TEACHER = "figures";

// ---------- the diagrams ----------

const DIAGRAMS = ["context", "blocks", "data-model", "practice-sequence", "protocol"];

async function diagrams(page: Page) {
  const blocks = [...readFileSync("docs/architecture.md", "utf8").matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
  if (blocks.length !== DIAGRAMS.length) throw new Error(`docs/architecture.md has ${blocks.length} diagrams, expected ${DIAGRAMS.length}`);
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff"><div id="out" style="display:inline-block;padding:16px"></div></body></html>`);
  await page.addScriptTag({ path: MERMAID });
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

// ---------- the granularity studies ----------

type Series = { label: string; color: string; dash?: string; values: (number | null)[] };
type Axis = { title: string; ticks: number[]; format: (y: number) => string };

/** One panel of lines over categories evenly spaced, as a group to place in a figure; a null value is a gap. */
function linePanel(x0: number, y0: number, width: number, height: number, title: string, categories: string[], xTitle: string, y: Axis, series: Series[], reference?: { value: number; label: string }, yTitle = true): string {
  const [lo, hi] = [y.ticks[0], y.ticks[y.ticks.length - 1]];
  const px = (i: number) => x0 + 24 + (i * (width - 48)) / (categories.length - 1);
  const py = (v: number) => y0 + height - ((v - lo) / (hi - lo)) * height;
  const grid = y.ticks.map((t) => `<line x1="${x0}" x2="${x0 + width}" y1="${py(t)}" y2="${py(t)}" stroke="#e4e3df"/><text x="${x0 - 8}" y="${py(t) + 4}" text-anchor="end">${y.format(t)}</text>`).join("");
  const xLabels = categories.map((c, i) => `<text x="${px(i)}" y="${y0 + height + 18}" text-anchor="middle">${c}</text>`).join("");
  const ref = reference ? `<line x1="${x0}" x2="${x0 + width}" y1="${py(reference.value)}" y2="${py(reference.value)}" stroke="#8a8984" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${x0 + width - 4}" y="${py(reference.value) - 6}" text-anchor="end">${reference.label}</text>` : "";
  const lines = series.map((s) => {
    const pts = s.values.flatMap((v, i) => (v === null ? [] : [[px(i), py(v)]]));
    const path = s.values.map((v, i) => (v === null ? "" : `${i && s.values[i - 1] !== null ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`)).join("");
    const dots = pts.map(([cx, cy]) => `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5" fill="${s.color}" stroke="#fff" stroke-width="2"/>`).join("");
    return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}/>${dots}`;
  }).join("");
  return `<g>
  <text x="${x0 + width / 2}" y="${y0 - 12}" text-anchor="middle" fill="#0b0b0b">${title}</text>
  ${grid}${ref}${xLabels}${lines}
  <text x="${x0 + width / 2}" y="${y0 + height + 40}" text-anchor="middle" fill="#0b0b0b">${xTitle}</text>
  ${yTitle ? `<text transform="translate(${x0 - 52},${y0 + height / 2}) rotate(-90)" text-anchor="middle" fill="#0b0b0b">${y.title}</text>` : ""}
</g>`;
}

function legend(x: number, y: number, series: Series[]): string {
  // Each entry as wide as its label, at about 7 pixels a letter, and a gap.
  const at = series.map((_, i) => x + series.slice(0, i).reduce((w, s) => w + 30 + s.label.length * 7 + 32, 0));
  return series.map((s, i) => `<g transform="translate(${at[i]},${y})"><line x1="0" x2="22" y1="0" y2="0" stroke="${s.color}" stroke-width="2"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}/><circle cx="11" cy="0" r="4.5" fill="${s.color}" stroke="#fff" stroke-width="2"/><text x="30" y="4">${s.label}</text></g>`).join("");
}

const svg = (w: number, h: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Arial, sans-serif" font-size="13" fill="#52514e">
  <rect width="${w}" height="${h}" fill="#fcfcfb"/>
  ${body}
</svg>`;

/** Below this many declarations a method's precision is left out: the share right of a handful is noise. */
const MIN_DECLARED = 20;
const COMPONENTS = [1, 2, 4, 8, 16];
type Judged = { practices: number; declared: number; precision: number };
type AtomsRun = { results: { atoms: number; perQuestion: number; learnRate: number; usual: Judged[] }[] };

/** G1 (Table 3.10, the top half): precision at the usual thresholds against the number of components, asked one at a time. */
async function components(page: Page, dir: string) {
  const file = join(dir, "atoms.json");
  await capture(process.execPath, ["--disable-warning=ExperimentalWarning", "scripts/atoms.ts", "--atoms", COMPONENTS.join(","), "--json"], file);
  const run = JSON.parse(readFileSync(file, "utf8")) as AtomsRun;
  const precision = (u: Judged) => (u.practices * u.declared >= MIN_DECLARED ? u.precision : null);
  // The run's order of the usual rules: BKT on the skill, the EMA, the streak rule, BKT on each component.
  const methods = [
    { label: "BKT on the skill", color: "#2a78d6", at: 0 },
    { label: "EMA", color: "#eb6834", at: 1 },
    { label: "streak of three", color: "#1baf7a", at: 2 },
    { label: "BKT per component", color: "#52514e", dash: "6 4", at: 3 },
  ];
  const percent: Axis = { title: "share of declarations right", ticks: [0, 0.2, 0.4, 0.6, 0.8, 1], format: (t) => `${(t * 100).toFixed(0)} %` };
  const panel = (rate: number, x0: number) => {
    const rows = COMPONENTS.map((k) => run.results.find((r) => r.atoms === k && r.perQuestion === 1 && r.learnRate === rate)!);
    const series = methods.map((m) => ({ ...m, values: rows.map((r) => precision(r.usual[m.at])) }));
    return linePanel(x0, 40, 300, 300, `learning rate ${rate}`, COMPONENTS.map(String), "components in the skill", percent, series, { value: 0.9, label: "90 %" }, x0 < 100);
  };
  const body = panel(0.02, 80) + panel(0.1, 440) + legend(80, 420, methods.map((m) => ({ ...m, values: [] })));
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg(770, 440, body)}</body></html>`);
  await page.locator("svg").screenshot({ path: join(OUT, "g1-components.png") });
}

type GrainRun = { grains: { grain: string; skills: number; bkt: { logLoss: number }; ema: { logLoss: number } }[] };

/** G4 (Table 3.15): log-loss on the held-out ASSISTments answers at the three grains, BKT against the EMA. */
async function grains(page: Page, dir: string) {
  const file = join(dir, "grain.json");
  await capture(process.execPath, ["--disable-warning=ExperimentalWarning", "scripts/grain.ts", "--observations", "data/assistments.json", "--json"], file);
  const run = JSON.parse(readFileSync(file, "utf8")) as GrainRun;
  const series: Series[] = [
    { label: "BKT", color: "#2a78d6", values: run.grains.map((g) => g.bkt.logLoss) },
    { label: "EMA", color: "#eb6834", values: run.grains.map((g) => g.ema.logLoss) },
  ];
  const all = series.flatMap((s) => s.values as number[]);
  const [lo, hi] = [Math.floor(Math.min(...all) * 100) / 100, Math.ceil(Math.max(...all) * 100) / 100];
  const ticks = Array.from({ length: Math.round((hi - lo) / 0.01) + 1 }, (_, i) => lo + i * 0.01);
  const logLoss: Axis = { title: "log-loss per held-out answer", ticks, format: (t) => t.toFixed(2) };
  const categories = run.grains.map((g) => `${g.grain} (${g.skills})`);
  const body = linePanel(90, 30, 460, 220, "", categories, "grain (skills)", logLoss, series) + legend(90, 330, series);
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg(580, 350, body)}</body></html>`);
  await page.locator("svg").screenshot({ path: join(OUT, "g4-grains.png") });
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
  // Tall enough that the panel beside the board holds the question and the verdict without scrolling.
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.width, height: 1200 });
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
  // Practice sits in a panel beside the board, as tall as the window: the figure is its top, down to the verdict.
  const panel = (await page.getByRole("complementary", { name: "Practice" }).boundingBox())!;
  const verdict = (await page.locator(".practice-verdict").boundingBox())!;
  const clip = { x: panel.x, y: panel.y, width: panel.width, height: verdict.y + verdict.height + 16 - panel.y };
  await page.screenshot({ path: join(OUT, "practice-mistake-hint.png"), clip });
  await page.setViewportSize(size);
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

/** Runs a command and writes what it prints to a file. */
function capture(cmd: string, args: string[], file: string) {
  return new Promise<void>((ok, fail) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "ignore"] });
    const out: Buffer[] = [];
    p.stdout!.on("data", (d: Buffer) => out.push(d));
    p.on("exit", (code) => (code === 0 ? (writeFileSync(file, Buffer.concat(out)), ok()) : fail(new Error(`${args.join(" ")} exited with ${code}`))));
  });
}

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
    await components(figures, dir);
    await grains(figures, dir);
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
