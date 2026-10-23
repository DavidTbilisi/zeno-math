// The results dashboard's data (scripts/dashboard.ts): the thesis's tables read as printed, and the learning profiles.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cellNumber, learningProfiles, plain, TABLE_TITLES, tableRows, thesisTables, writeDashboard } from "../scripts/dashboard.ts";

const CHAPTER = "docs/thesis/04-results-and-discussion.md";
const dir = mkdtempSync(join(tmpdir(), "zeno-dashboard-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

test("every table of chapter 3 is found with its caption, one title each", () => {
  const tables = thesisTables(readFileSync(CHAPTER, "utf8"));
  assert.equal(tables.length, TABLE_TITLES.length);
  for (const t of tables) {
    assert.ok(t.caption.length > 20, `the table at line ${t.line} has no caption`);
    assert.ok(t.rows.every((r) => r.length === t.columns.length), `the table at line ${t.line} has a row of the wrong width`);
  }
});

test("a cell's number: shares, estimates with intervals, signed numbers, and none for words", () => {
  assert.deepEqual(cellNumber("90.0 %"), { n: 0.9 });
  assert.deepEqual(cellNumber("10.08 [9.37, 10.79]"), { n: 10.08, lo: 9.37, hi: 10.79 });
  assert.deepEqual(cellNumber("−0.0346 [−0.0392, −0.0302]"), { n: -0.0346, lo: -0.0392, hi: -0.0302 });
  assert.deepEqual(cellNumber("+0.0068"), { n: 0.0068 });
  for (const s of ["never", "–", "", "θ = 0.74", "63.6 % / 80.0 % of 110"]) assert.equal(cellNumber(s), undefined, s);
  assert.equal(plain("$\\theta$ at 90\u00a0%"), "θ at 90 %");
});

test("a group's blank cells repeat the row above, a row's blank results stay blank", () => {
  const md = [
    "| World | Rate | Method | Answers |", "|---|---:|---|---:|",
    "| elo | 0.02 | BKT | |", "| | | EMA | 29.97 [29.95, 29.98] |", "| bkt | 0.1 | BKT | 3.54 |",
    "", "Table: A caption", "on two lines.",
  ].join("\n");
  const [t] = thesisTables(md);
  assert.equal(t.caption, "A caption on two lines.");
  const { columns, rows } = tableRows(t);
  assert.deepEqual(columns, ["World", "Rate", "Method", "Answers"]);
  assert.deepEqual(rows.map((r) => [r.id, r.World, r.Rate, r.Method, r.Answers]), [["1", "elo", "0.02", "BKT", ""], ["2", "elo", "0.02", "EMA", "29.97 [29.95, 29.98]"], ["3", "bkt", "0.1", "BKT", "3.54"]]);
  assert.equal(rows[0]["n:Answers"], undefined);
  assert.equal(rows[1]["lo:Answers"], 29.95);
});

test("learning profiles: a row per world, way of learning, rate and question, and gradual learners never get worse", () => {
  const rows = learningProfiles({ students: 40, questions: 10 });
  assert.equal(rows.length, 3 * 2 * 2 * 11);
  for (const r of rows) assert.ok(r.p10 <= r.median && r.median <= r.p90 && r.atLeast09 >= 0 && r.atLeast09 <= 1, JSON.stringify(r));
  for (const world of ["elo", "irt2pl"])
    for (const learning of ["flat", "zpd"]) {
      const means = rows.filter((r) => r.world === world && r.learning === learning && r.learnRate === 0.1).map((r) => r.mean);
      assert.ok(means.every((m, i) => i === 0 || m >= means[i - 1]), `${world} ${learning}: ${means}`);
      assert.ok(means.at(-1)! > means[0], `${world} ${learning} learnt nothing`);
    }
});

test("the dashboard's data sets are written, each once, with a title and a description", () => {
  const manifest = writeDashboard(dir, CHAPTER);
  assert.equal(new Set(manifest.map((m) => m.id)).size, manifest.length);
  for (const m of manifest) {
    assert.ok(existsSync(join(dir, m.file)), m.file);
    assert.ok(m.title.length > 0 && m.title.length <= 40 && m.description.length > 0, m.id);
  }
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")), manifest);
});
