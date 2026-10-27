// The grain chosen from the answers (src/model/grouping.ts), a check made after every result: in the world of ideas on
// fractions, with its sixteen ideas learnt one by one or in six or three clusters, the whole skill as one unit, one unit
// per idea, the world's own clusters, and the grouping chosen on the training learners, without and with a quarter of
// them set aside to confirm it, each judged by the log-loss of 400 test learners' answers. The differences are paired on
// the test learners and averaged over the seeds, with intervals that resample the test learners within each seed. The
// settings run on worker threads, each seeded on its own, so the numbers do not depend on how many there are.
//
//   npm run grouping                                          every world, seeds 1 to 5, 25, 100 and 200 learners
//   --worlds sixteen,six,three  --seeds 1,2,3,4,5  --students 25,100,200  --length 30  --learn-rate 0.1
//   --jobs 4      worker threads (default: the processors less one)
//   --out docs/results    writes grouping-runs.csv and grouping-paired.csv
import { writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import { isMainThread, parentPort, Worker } from "node:worker_threads";
import { CLUSTER_WORLDS, DEFAULT_GROUPING, pairedOverSeeds, pairsRight, runGrouping, unitName, type ClusterWorld, type GroupingParams, type GroupingRun } from "../src/model/grouping.ts";

type Task = { id: number; params: GroupingParams };

if (!isMainThread) parentPort!.on("message", (t: Task) => parentPort!.postMessage({ id: t.id, run: runGrouping(t.params) }));
else await main();

async function main() {
  const args = process.argv.slice(2);
  const opt = (name: string, fallback: string) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
  };
  const fail = (message: string) => {
    console.error(message);
    process.exit(2);
  };
  const list = (name: string, fallback: string) => opt(name, fallback).split(",").map(Number);
  const worlds = opt("--worlds", "sixteen,six,three").split(",") as ClusterWorld[];
  if (worlds.some((w) => !(w in CLUSTER_WORLDS))) fail(`--worlds must be among ${Object.keys(CLUSTER_WORLDS).join(", ")}`);
  const seeds = list("--seeds", "1,2,3,4,5"), sizes = list("--students", "25,100,200");
  if ([...seeds, ...sizes].some((x) => !Number.isInteger(x) || x < 1)) fail("--seeds and --students must be whole numbers above 0");
  if (sizes.some((n) => n < 8)) fail("--students must be at least 8, two learners to each quarter");
  const length = Number(opt("--length", String(DEFAULT_GROUPING.length))), learnRate = Number(opt("--learn-rate", String(DEFAULT_GROUPING.learnRate)));
  if (!Number.isInteger(length) || length < 1 || !(learnRate > 0)) fail("--length must be a whole number above 0 and --learn-rate a number above 0");
  const out = opt("--out", "docs/results");

  const tasks: Task[] = [];
  for (const world of worlds) for (const seed of seeds) for (const students of sizes) tasks.push({ id: tasks.length, params: { ...DEFAULT_GROUPING, world, seed, students, length, learnRate } });
  const jobs = Math.max(1, Math.min(Number(opt("--jobs", String(availableParallelism() - 1))) || 1, tasks.length));
  console.log(`${tasks.length} settings on ${jobs} threads: worlds ${worlds.join(", ")}, seeds ${seeds.join(", ")}, ${sizes.join(", ")} training learners, ${DEFAULT_GROUPING.test} test learners, ${length} questions, learning rate ${learnRate}`);

  const runs: GroupingRun[] = new Array(tasks.length);
  const started = Date.now();
  await new Promise<void>((resolve, reject) => {
    let next = 0, done = 0;
    const workers = Array.from({ length: jobs }, () => new Worker(new URL(import.meta.url)));
    const give = (w: Worker) => (next < tasks.length ? w.postMessage(tasks[next++]) : w.terminate());
    for (const w of workers) {
      w.on("message", ({ id, run }: { id: number; run: GroupingRun }) => {
        runs[id] = run;
        console.log(`  ${++done}/${tasks.length} ${run.world} seed ${run.seed} ${run.students} learners: chose ${run.chosen.grouping.length} units, confirmed ${run.confirmed.grouping.length} (${Math.round((Date.now() - started) / 1000)} s)`);
        if (done === tasks.length) resolve();
        give(w);
      });
      w.on("error", reject);
      give(w);
    }
  });

  const cell = (v: unknown) => (typeof v === "number" ? (Number.isFinite(v) ? String(Number(v.toFixed(5))) : "") : v === null ? "" : JSON.stringify(String(v)));
  const write = (name: string, rows: readonly Record<string, unknown>[]) => {
    const columns = Object.keys(rows[0]);
    const snake = (c: string) => c.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    writeFileSync(join(out, name), [columns.map(snake).join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\n") + "\n");
    console.log(`wrote ${join(out, name)} (${rows.length} rows)`);
  };
  const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const LABELS = ["coarse", "fine", "true", "chosen", "confirmed"] as const;

  write("grouping-runs.csv", runs.flatMap((r) => LABELS.map((label) => {
    const j = r.judged[label], choice = label === "chosen" ? r.chosen : label === "confirmed" ? r.confirmed : null;
    return {
      world: r.world, seed: r.seed, students: r.students, grouping: label, units: j.units, logLoss: mean(j.losses), cost: j.cost, precision: j.precision, diagnosis: j.diagnosis,
      pairsRight: choice ? pairsRight(choice.grouping, CLUSTER_WORLDS[r.world]) : null,
      confirmedGain: choice?.confirmation?.estimate ?? null,
      confirmedLower: choice?.confirmation?.lower ?? null,
      groups: choice ? choice.grouping.map(unitName).join(" ") : "",
    };
  })));

  // Paired on the test learners: every other grouping's log-loss minus the chosen one's, above zero where the chosen one is better.
  const paired: Record<string, unknown>[] = [];
  console.log("\nLog-loss per answer on the test learners, mean over seeds, and each other grouping minus the chosen one (above 0: the chosen one predicts better), 95 % interval");
  for (const world of worlds)
    for (const students of sizes) {
      const rs = runs.filter((r) => r.world === world && r.students === students);
      const ll = Object.fromEntries(LABELS.map((l) => [l, mean(rs.map((r) => mean(r.judged[l].losses)))]));
      console.log(`  ${world} ${students} learners: ${LABELS.map((l) => `${l} ${ll[l].toFixed(4)}`).join(", ")}`);
      for (const chosen of ["chosen", "confirmed"] as const)
        for (const other of ["coarse", "fine", "true"] as const) {
          const d = rs.map((r) => r.judged[other].losses.map((x, i) => x - r.judged[chosen].losses[i]));
          const { estimate, interval } = pairedOverSeeds(d);
          const better = d.filter((x) => mean(x) > 0).length;
          paired.push({ world, students, chosen, versus: other, estimate, lo: interval[0], hi: interval[1], seedsBetter: better, seeds: rs.length });
          console.log(`    ${other} − ${chosen}: ${estimate >= 0 ? "+" : ""}${estimate.toFixed(4)} [${interval[0].toFixed(4)}, ${interval[1].toFixed(4)}], ${chosen} better on ${better} of ${rs.length} seeds`);
        }
    }
  write("grouping-paired.csv", paired);
}
