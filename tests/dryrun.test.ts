// The whole study end to end on a small simulated class (scripts/dry-run-study.ts): through the real server, every
// guarantee of the protocol holds and the planned analysis runs on what the exports hold.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dryRun, startServer } from "../scripts/dry-run-study.ts";
import { tallyMistakes } from "../scripts/mistakes.ts";
import { parseCsv } from "../src/model/evaluate.ts";

const dir = mkdtempSync(join(tmpdir(), "zeno-dry-run-test-"));
after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

test("a dry run of the study through the server keeps every guarantee and can be analysed", async () => {
  const server = await startServer(join(dir, "data"), 20000 + Math.floor(Math.random() * 20000), "dry");
  try {
    for (const world of ["elo", "bkt"] as const) {
      const result = await dryRun({ base: server.base, teacher: "dry", students: 8, questions: 6, testLength: 4, world, seed: 2, refreshEvery: 3 });
      for (const c of result.checks) assert.ok(c.ok, `${world}: ${c.name} (${c.detail})`);
      assert.equal(result.analysis.testLength, 4);
      assert.ok(Number.isFinite(result.predictedLogLoss));
      // The mistakes behind the wrong answers can be found again from the exports alone.
      const total = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
      const practice = tallyMistakes(parseCsv(result.attemptsCsv));
      assert.ok(total(practice.wrong) > 0 && total(practice.named) > 0, `${world}: ${JSON.stringify(practice.named)} of ${JSON.stringify(practice.wrong)}`);
      assert.deepEqual(Object.keys(practice.wrong).sort(), ["adaptive", "fixed"]);
      const tests = tallyMistakes(parseCsv(result.testsCsv));
      assert.ok(Object.keys(tests.wrong).every((g) => /^(adaptive|fixed) (pre|post)$/.test(g)), Object.keys(tests.wrong).join());
      assert.ok(total(tests.named) > 0, `${world} tests: ${JSON.stringify(tests.named)} of ${JSON.stringify(tests.wrong)}`);
    }
  } finally {
    await server.stop();
  }
});
