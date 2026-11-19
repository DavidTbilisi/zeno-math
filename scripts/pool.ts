// Tasks on worker threads, for the scripts that run many settings: the calling script is its own worker file. Every
// task must be seeded on its own and depend on nothing but its own description, so that a result is the same
// whichever thread makes it and however many there are; the results come back in the tasks' order.
//
//   const run = (t: Task) => ...;                 defined in both threads
//   if (!isMainThread) serve(run);
//   else results = await pool(import.meta.url, tasks, jobsFrom(args, tasks.length), run);
import { availableParallelism } from "node:os";
import { parentPort, Worker } from "node:worker_threads";

/** --jobs N, by default the processors less one, and never more than there are tasks. */
export function jobsFrom(args: readonly string[], tasks: number): number {
  const i = args.indexOf("--jobs");
  const asked = i >= 0 ? Number(args[i + 1]) : availableParallelism() - 1;
  return Math.max(1, Math.min(Number.isInteger(asked) ? asked : 1, tasks));
}

/** In a worker thread: answer every task with its result. */
export function serve<T, R>(run: (task: T) => R): void {
  parentPort!.on("message", ({ id, task }: { id: number; task: T }) => parentPort!.postMessage({ id, result: run(task) }));
}

/** In the main thread: every task's result, in the tasks' order; with one job the tasks run here, one after another. */
export async function pool<T, R>(script: string, tasks: readonly T[], jobs: number, run: (task: T) => R): Promise<R[]> {
  if (jobs <= 1 || tasks.length <= 1) return tasks.map(run);
  const results: R[] = new Array(tasks.length);
  await new Promise<void>((resolve, reject) => {
    let given = 0, back = 0;
    const workers = Array.from({ length: Math.min(jobs, tasks.length) }, () => new Worker(new URL(script), { argv: process.argv.slice(2) }));
    const give = (w: Worker) => (given < tasks.length ? w.postMessage({ id: given, task: tasks[given++] }) : void w.terminate());
    for (const w of workers) {
      w.on("message", ({ id, result }: { id: number; result: R }) => {
        results[id] = result;
        if (++back === tasks.length) resolve();
        give(w);
      });
      w.on("error", reject);
      give(w);
    }
  });
  return results;
}
