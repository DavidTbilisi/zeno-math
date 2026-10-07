// The whole study end to end on a small simulated class (scripts/dry-run-study.ts): through the real server, every
// guarantee of the protocol holds and the planned analysis runs on what the exports hold.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dryRun, startServer } from "../scripts/dry-run-study.ts";

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
    }
  } finally {
    await server.stop();
  }
});
