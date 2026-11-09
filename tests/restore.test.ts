// The restore drill (scripts/restore-check.ts): a backup made as the server makes them (VACUUM INTO, while it runs)
// comes back whole, with every class, student, practice question, test answer and board; a damaged file and one from a
// newer Zeno are caught.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { startServer } from "../scripts/dry-run-study.ts";
import { restoreCheck } from "../scripts/restore-check.ts";

const dir = mkdtempSync(join(tmpdir(), "zeno-restore-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

test("a backup comes back whole; a damaged one, or one from a newer Zeno, is caught", async () => {
  const teacher = { "X-Teacher-Password": "chalk" };
  const server = await startServer(join(dir, "data"), 20000 + Math.floor(Math.random() * 20000), "chalk", { BACKUP_KEEP: "0" });
  const backup = join(dir, "backup.db");
  try {
    const call = async (method: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
      (await fetch(server.base + path, { method, headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) })).json();
    const { code } = await call("POST", "/api/classes", { name: "Backed up", skills: ["linear"], testLength: 4 }, teacher);
    const a = (await call("POST", "/api/students", { class: code, number: 1 })).code;
    await call("POST", "/api/students", { class: code, number: 2 });
    await call("POST", "/api/attempts", {
      clientId: `restore-${Date.now()}`, student: a, skill: "linear", level: 2, seed: 12345, review: false, outcome: "revealed", solutionViewed: true,
      msTotal: 9000, shownAt: Date.now() - 9000, answers: [{ input: "12345", verdict: "wrong", ms: 9000 }], policy: "free",
    });
    await call("POST", `/api/classes/${code}/phase`, { phase: "pretest" }, teacher);
    await call("POST", "/api/tests", { clientId: `restore-t-${Date.now()}`, student: a, phase: "pre", item: 0, input: "1", verdict: "wrong", retries: 0, ms: 9000 });
    await call("POST", "/api/boards", { title: "Kept" }, teacher);
    // As server/backup.ts makes one: a snapshot of the live database while the server runs.
    new DatabaseSync(join(dir, "data", "boards.db")).exec(`VACUUM INTO '${backup}'`);
  } finally {
    await server.stop();
  }

  const before = readFileSync(backup);
  const whole = await restoreCheck(backup);
  assert.ok(whole.checks.every((c) => c.ok), JSON.stringify(whole.checks));
  assert.deepEqual(whole.counts, { classes: 1, students: 2, attempts: 1, tests: 1, boards: 1 });
  assert.ok(readFileSync(backup).equals(before), "the backup itself is left as it was");

  // Pages overwritten in the middle of the file.
  const bytes = readFileSync(backup);
  bytes.fill(0x5a, Math.floor(bytes.length / 3), Math.floor(bytes.length / 3) + 8192);
  const damaged = join(dir, "damaged.db");
  writeFileSync(damaged, bytes);
  assert.ok((await restoreCheck(damaged)).checks.some((c) => !c.ok), "damage is caught");

  const newer = join(dir, "newer.db");
  writeFileSync(newer, readFileSync(backup));
  new DatabaseSync(newer).exec("PRAGMA user_version = 99");
  const refused = (await restoreCheck(newer)).checks;
  assert.deepEqual(refused.map((c) => [c.name, c.ok]), [["the file is a whole SQLite database", true], ["Zeno opens it", false]]);
});
