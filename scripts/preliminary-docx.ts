// Build the Word preliminary draft with the bundled document runtime.
// npm run preliminary-docx -- [--toc-from /absolute/path/to/rendered.pdf]
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const python = process.env.DOCX_PYTHON ?? join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python");
if (!existsSync(python)) throw new Error("Set DOCX_PYTHON to the document runtime's Python interpreter.");
const run = spawnSync(python, ["scripts/preliminary-docx.py", ...process.argv.slice(2)], { stdio: "inherit" });
if (run.error) throw run.error;
if (run.status !== 0) process.exit(run.status ?? 1);

const finalize = spawnSync(python, ["scripts/preliminary-finalize.py"], { stdio: "inherit" });
if (finalize.error) throw finalize.error;
if (finalize.status !== 0) process.exit(finalize.status ?? 1);
