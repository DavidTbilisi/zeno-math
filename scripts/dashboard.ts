// The data behind the results dashboard (a claude.ai artifact): chapter 3's tables as rows, the simulation, calibration,
// stuck-practice and benchmark CSVs in docs/results, each research question's verdict, and learning profiles drawn by the simulator itself. The tables are
// read from the thesis as printed, so the dashboard shows what the thesis says; remake a table with its own command
// (Appendix B) and the thesis first, then this.
//
//   npm run dashboard                       writes dashboard/*.json and *.csv, and dashboard/manifest.json
//   --out dir   --thesis docs/thesis/04-results-and-discussion.md
//
// manifest.json lists each data set's id, file, title and description, which is what the dashboard's sources hold.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { AREAS } from "../src/math/practiceSkills.ts";
import { makeWorld, rng, SIM_SKILLS } from "../src/model/simulate.ts";

// ---------- the thesis's tables ----------

/** A short title for each of chapter 3's tables, in order (Table 3.1 first). */
export const TABLE_TITLES = [
  "Who knew the skill, by world", "H1: predicting real answers", "H2: answers to a sure mastery", "H2 in the plain BKT world",
  "Methods at the streak's cost", "H2 with mastery at 0.8", "BKT with thresholds near 1", "Calibration of mastery scores",
  "H3: agreement on real answers", "G1: world of components", "G1: world of ideas", "G2: fractions, questions alone",
  "G3: over-splitting", "G3: components and length", "G4: ASSISTments at three grains", "G4 on a simulated class",
];

export type ThesisTable = { line: number; columns: string[]; rows: string[][]; caption: string };
export type TableRow = Record<string, string | number>;

/** TeX as plain text: the symbols the tables use, without the dollars and backslashes. */
export function plain(s: string) {
  return s.replace(/\\theta/g, "θ").replace(/\\alpha/g, "α").replace(/\\beta/g, "β").replace(/\\geq/g, "≥").replace(/\\leq/g, "≤")
    .replace(/10\^\{-15\}/g, "10⁻¹⁵").replace(/[$\\]/g, "").replace(/\u00a0/g, " ").trim();
}

/** Every pipe table in a Markdown chapter with the caption after it (a "Table:" paragraph). */
export function thesisTables(markdown: string): ThesisTable[] {
  const lines = markdown.split("\n");
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const tables: ThesisTable[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("|") || !/^\|[-:| ]+\|$/.test(lines[i + 1]?.trim() ?? "")) continue;
    const columns = cells(lines[i]);
    let j = i + 2;
    const rows: string[][] = [];
    for (; j < lines.length && lines[j].startsWith("|"); j++) rows.push(cells(lines[j]));
    let k = j;
    while (k < lines.length && lines[k].trim() === "") k++;
    const caption: string[] = [];
    if (lines[k]?.startsWith("Table:")) for (; k < lines.length && lines[k].trim(); k++) caption.push(lines[k]);
    tables.push({ line: i + 1, columns, rows, caption: caption.join(" ").replace(/^Table: /, "") });
    i = j - 1;
  }
  return tables;
}

const NUM = String.raw`[−+-]?\d+(?:\.\d+)?`;
const toNumber = (s: string) => Number(s.replace("−", "-").replace("+", ""));

/** A cell's number: "90.0 %" as 0.9, "10.08 [9.37, 10.79]" as the estimate and its interval; none for words. */
export function cellNumber(s: string): { n: number; lo?: number; hi?: number } | undefined {
  let m = new RegExp(`^(${NUM}) ?%$`).exec(s);
  if (m) return { n: Math.round(toNumber(m[1]) * 10000) / 1e6 };
  m = new RegExp(`^(${NUM}) \\[(${NUM}), (${NUM})\\]$`).exec(s);
  if (m) return { n: toNumber(m[1]), lo: toNumber(m[2]), hi: toNumber(m[3]) };
  if (new RegExp(`^${NUM}$`).test(s)) return { n: toNumber(s) };
  return undefined;
}

/**
 * A table as rows keyed by its plain column names, with an id per row. A blank cell before a row's first filled one
 * repeats the row above (the tables leave a group's world and rate blank after its first row); a cell with a number
 * also gets n:, lo: and hi: columns, so the charts need not parse the text.
 */
export function tableRows(t: ThesisTable): { columns: string[]; rows: TableRow[] } {
  const seen = new Map<string, number>();
  const columns = t.columns.map((c) => {
    const name = plain(c);
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    return n > 1 ? `${name} (${n})` : name;
  });
  let prev: string[] | undefined;
  const rows = t.rows.map((raw, r) => {
    const cells = columns.map((_, j) => plain(raw[j] ?? ""));
    if (prev) for (let j = 0; j < cells.length && cells[j] === "" && cells.slice(j + 1).some(Boolean); j++) cells[j] = prev[j];
    prev = cells;
    const row: TableRow = { id: String(r + 1) };
    columns.forEach((c, j) => {
      row[c] = cells[j];
      const v = cellNumber(cells[j]);
      if (v) row[`n:${c}`] = v.n;
      if (v?.lo !== undefined) (row[`lo:${c}`] = v.lo), (row[`hi:${c}`] = v.hi!);
    });
    return row;
  });
  return { columns, rows };
}

// ---------- learning profiles ----------

export type ProfileRow = {
  world: string; learning: string; learnRate: number; question: number;
  mean: number; p10: number; p25: number; median: number; p75: number; p90: number; atLeast09: number;
};

/**
 * How simulated learners improve under each world, way of learning and rate: the true chance of a right answer at
 * level 2 on one practised skill (picked at random) before each question and after the last, the questions at random
 * levels. Seed 1, as the one-grain results.
 */
export function learningProfiles({ students = 400, questions = 30, rates = [0.02, 0.1] } = {}): ProfileRow[] {
  const skills = AREAS.flatMap((a) => [...SIM_SKILLS[a]]);
  const quantile = (sorted: number[], p: number) => {
    const i = (sorted.length - 1) * p, lo = Math.floor(i);
    return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
  };
  const round = (x: number) => Number(x.toFixed(4));
  const rows: ProfileRow[] = [];
  for (const world of ["elo", "irt2pl", "bkt"] as const)
    for (const learning of ["flat", "zpd"] as const)
      for (const learnRate of rates) {
        const w = makeWorld({ world, learning, learnRate, students, seed: 1 });
        const r = rng(7);
        const at: number[][] = Array.from({ length: questions + 1 }, () => []);
        for (const l of w.learners) {
          const skill = r.pick(skills);
          for (let q = 0; q <= questions; q++) {
            at[q].push(w.chance(l, skill, 2));
            if (q < questions) w.answer(l, skill, r.pick([1, 2, 3] as const));
          }
        }
        at.forEach((xs, question) => {
          const s = [...xs].sort((a, b) => a - b);
          rows.push({
            world, learning, learnRate, question,
            mean: round(xs.reduce((a, b) => a + b, 0) / xs.length),
            p10: round(quantile(s, 0.1)), p25: round(quantile(s, 0.25)), median: round(quantile(s, 0.5)), p75: round(quantile(s, 0.75)), p90: round(quantile(s, 0.9)),
            atLeast09: round(xs.filter((x) => x >= 0.9).length / xs.length),
          });
        });
      }
  return rows;
}

// ---------- the verdicts ----------

/** Each research question's verdict, from section 3.3: the dashboard's first cards. Change them with the thesis. */
export const VERDICTS = [
  { id: "H1", order: 1, question: "Does BKT predict held-out real answers better than the moving average (EMA)?", verdict: "Holds", status: "holds", figure: "−0.0225", figureLabel: "log-loss per answer, BKT minus EMA", detail: "95 % interval [−0.0264, −0.0183] from 10,000 resamples of 853 held-out ASSISTments students; the four other splits agree (−0.021 to −0.025).", section: "3.1" },
  { id: "H2", order: 2, question: "In worlds that break BKT's assumptions, does BKT need fewer answers to be right 90 % of the time?", verdict: "Holds with forgetting, not with gradual learning", status: "mixed", figure: "1.20–1.99", figureLabel: "answers BKT saves against the EMA where students forget", detail: "Where learning is gradual no threshold up to 0.9999 met the standard; a later check up to 1 − 10⁻¹⁵ found BKT met it in three of the four gradual settings.", section: "3.1" },
  { id: "H3", order: 3, question: "How often do BKT, the EMA and the streak rule agree on real answers? (exploratory)", verdict: "Mostly agree", status: "info", figure: "69 %", figureLabel: "of practices where BKT declares, against 48 % for the simple rules", detail: "Both rules of a pair declare in 38 to 46 % of practices and neither in 29 to 41 %; BKT declares earliest, by 1.0 answer against the EMA.", section: "3.1" },
  { id: "G1", order: 4, question: "What does a model too coarse for its learners do?", verdict: "Precision falls with untested components", status: "mixed", figure: "98 % → under 8 %", figureLabel: "BKT right at 0.95, one component to eight or more", detail: "The moving average and the streak rule lose as much precision, but stay better calibrated and keep a threshold that works.", section: "3.2" },
  { id: "G2", order: 5, question: "Does the right grain restore what the coarse one lost?", verdict: "Holds, if questions tell components apart and practice is long enough", status: "holds", figure: "≈ 120", figureLabel: "questions on fractions before mastery can be declared", detail: "Within 30 questions the missing idea is named about half the time, seven to eight times chance.", section: "3.2" },
  { id: "G3", order: 6, question: "What does a model too fine for its learners do?", verdict: "Costs answers for no gain", status: "info", figure: "×2", figureLabel: "Brier score with each split", detail: "Fits degenerate as evidence per part thins; too many components for the practice leaves the right grain unable to declare.", section: "3.2" },
  { id: "G4", order: 7, question: "Are the same real answers predicted better at a finer grain?", verdict: "Holds for BKT", status: "holds", figure: "−0.0346", figureLabel: "log-loss per answer, BKT at 110 skills against one", detail: "95 % interval [−0.0392, −0.0302]; the EMA is indifferent to the grain.", section: "3.2" },
];

/** The simulation results the dashboard charts, as the dashboard names them. */
const RESULT_FILES = [
  { id: "sim_grid", file: "docs/results/simulation-grid.csv", title: "Class study effect grid", description: "Cohen's d of true gains with 95 % intervals for four comparisons over 36 assumption sets (npm run simulate -- --grid)." },
  { id: "power_main", file: "docs/results/power.csv", title: "Power, main design", description: "Share of 100 simulated studies significant at p < 0.05, 12 skills, 60 questions, 12-question tests (npm run simulate -- --power)." },
  { id: "power_focused", file: "docs/results/power-focused.csv", title: "Power, focused design", description: "4 skills, 120 questions, 24-question tests, adaptive aiming at 75 %." },
  { id: "power_focused60", file: "docs/results/power-focused-60.csv", title: "Power, focused at 60 %", description: "4 skills, 120 questions, 24-question tests, adaptive aiming at 60 %." },
  { id: "calib_real", file: "docs/results/calibration-assistments.csv", title: "Calibration on ASSISTments", description: "Each model's predicted chance of a right answer against the share right, in ten bins, on the 51,452 first answers of 853 held-out students (npm run model -- --observations data/assistments.json --fit --calibration)." },
  { id: "calib_sim", file: "docs/results/calibration-simulated.csv", title: "Calibration on a simulated class", description: "Each model's predicted chance against the share right, in ten bins, on a held-out share of 120 simulated students' 18,000 answers (npm run model -- --simulate --fit --calibration)." },
  { id: "calib_mastery", file: "docs/results/calibration-mastery.csv", title: "Mastery scores against the truth", description: "Each mastery score's mean against the share of learners who truly knew the skill, in ten bins, after every answer of the held-out practices, per world and learning rate (npm run mastery -- --calibration); the bins behind Table 3.8." },
  { id: "stuck_facts", file: "docs/results/stuck-facts.csv", title: "Stuck practice: single figures", description: "On the 70,019 ASSISTments visits (a student, a skill, an assignment): the answers an oracle could skip, a streak carried to the next assignment, stuck visits and students, hints and fast tries, as shares, against the problems' usual share right where one applies (npm run stuck)." },
  { id: "stuck_answers", file: "docs/results/stuck-answers.csv", title: "Where the answers go", description: "Every ASSISTments answer in one of three parts: each visit's final run of right answers, the answers before it, and the visits with no three in a row (npm run stuck)." },
  { id: "stuck_curves", file: "docs/results/stuck-curves.csv", title: "Long visits: right against usual", description: "The share right at each of the first 10 or 20 answers of fixed sets of long ASSISTments visits, against the same problems' usual share right among other students (npm run stuck)." },
  { id: "stuck_warning", file: "docs/results/stuck-warning.csv", title: "Early warning: the first three", description: "Visits with no three in a row in their first three answers, by how many of those were right: the share reaching three in a row by the 10th answer, stuck, or ended before then without (npm run stuck)." },
  { id: "stuck_next", file: "docs/results/stuck-next.csv", title: "The answer after a wrong one", description: "The next answer in the same visit, by what the answer before was (right, a wrong try with or without hints, a hint or the scaffolding first), in stuck visits and the rest, against the problems' usual share right (npm run stuck)." },
  { id: "stuck_skills", file: "docs/results/stuck-skills.csv", title: "Stuck visits by skill", description: "Each ASSISTments skill's visits, stuck visits and their answers, the share of its visits stuck and its share of all stuck answers (npm run stuck)." },
  { id: "bench_models", file: "docs/results/benchmark-models.csv", title: "Benchmark: predicting the next answer", description: "Each model's log-loss, RMSE, AUC and accuracy on ASSISTments' held-out students, split seed 1: Elo, the logistic model with and without a difficulty per question, PFA, BKT, EMA and three counting baselines (npm run benchmark)." },
  { id: "bench_paired", file: "docs/results/benchmark-paired.csv", title: "Benchmark: logistic against Elo by split", description: "The logistic model's mean log-loss per answer minus Elo's on the same held-out answers, with 95 % intervals from resampling students and whole classes, on five splits (npm run benchmark)." },
  { id: "bench_mastery", file: "docs/results/benchmark-mastery.csv", title: "Benchmark: mastery rules on real answers", description: "H3's rules and the logistic rule on ASSISTments' held-out practices, split seed 1: mean answers before mastery is declared, the share declared, and the share right of the next three answers (npm run benchmark)." },
  { id: "bench_versus", file: "docs/results/benchmark-versus.csv", title: "Benchmark: logistic rule against others", description: "The logistic rule minus each of H3's rules, on five splits: the share right of the next three answers after mastery and the answers before it, with 95 % intervals from resampling students (npm run benchmark)." },
  { id: "bench_app", file: "docs/results/benchmark-app.csv", title: "Benchmark: the app's model as it runs", description: "The logistic model as the app runs it (src/model/classModel.ts) against the Elo model it replaced, each from no answers through every answer in order: log-loss and AUC over all the answers and over the second half, on simulated classes in three worlds and on ASSISTments without its problems (npm run benchmark)." },
  { id: "bench_curve", file: "docs/results/benchmark-curve.csv", title: "Benchmark: mastery trade-off curves", description: "Every setting of each mastery rule on the held-out practices of split seed 1: answers before mastery against the share right of the next three (description: these settings are not set on training students; npm run benchmark)." },
];

export type ManifestEntry = { id: string; file: string; title: string; description: string };

/** Writes every data set into out and returns the manifest. */
export function writeDashboard(out: string, thesis: string): ManifestEntry[] {
  mkdirSync(out, { recursive: true });
  const json = (file: string, rows: unknown) => writeFileSync(join(out, file), JSON.stringify({ rows }));
  const manifest: ManifestEntry[] = [];
  const tables = thesisTables(readFileSync(thesis, "utf8"));
  if (tables.length !== TABLE_TITLES.length) throw new Error(`${thesis} has ${tables.length} tables, expected ${TABLE_TITLES.length}: add or remove a title in TABLE_TITLES`);
  const captions = tables.map((t, i) => {
    const id = `t3_${String(i + 1).padStart(2, "0")}`;
    const caption = plain(t.caption);
    json(`${id}.json`, tableRows(t).rows);
    manifest.push({ id, file: `${id}.json`, title: `Table 3.${i + 1}: ${TABLE_TITLES[i]}`.slice(0, 40), description: `Table 3.${i + 1} of the thesis, parsed from ${thesis} (line ${t.line}); text cells as printed, with n:, lo: and hi: number columns parsed from them. ${caption.slice(0, 300)}` });
    return { id, table: `Table 3.${i + 1}`, title: TABLE_TITLES[i], caption };
  });
  json("captions.json", captions);
  manifest.push({ id: "captions", file: "captions.json", title: "Thesis table captions", description: `Number, short title and caption of each table in chapter 3 of the thesis (${thesis}).` });
  json("verdicts.json", VERDICTS);
  manifest.push({ id: "verdicts", file: "verdicts.json", title: "Thesis verdicts H1–G4", description: `Each research question's verdict and key figure, written from section 3.3 of ${thesis}.` });
  json("learning-profiles.json", learningProfiles());
  manifest.push({ id: "profiles", file: "learning-profiles.json", title: "Simulated learning curves", description: "True chance of a right answer at level 2 on one practised skill before each of 30 questions, 400 learners, seed 1, for every world, learning profile and rate (npm run dashboard, makeWorld in src/model/simulate.ts; questions at random levels); mean, percentiles and share at 0.9 or more." });
  for (const r of RESULT_FILES) {
    copyFileSync(r.file, join(out, basename(r.file)));
    manifest.push({ id: r.id, file: basename(r.file), title: r.title, description: `${r.file}: ${r.description}` });
  }
  writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const opt = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const out = opt("--out") ?? "dashboard";
  const manifest = writeDashboard(out, opt("--thesis") ?? "docs/thesis/04-results-and-discussion.md");
  for (const m of manifest) console.log(`${m.id.padEnd(16)}${join(out, m.file)}`);
  console.log(`${manifest.length} data sets in ${out}/; their titles and descriptions in ${join(out, "manifest.json")}`);
}
