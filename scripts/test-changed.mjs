// Runs only the unit tests a change can affect: those whose imports reach a file changed since main (committed on
// this branch, staged, unstaged or new), or that read one by name (docs/api.md, a fixture). A change to how tests
// run (package.json, the TypeScript hooks, tsconfig.json) runs them all. npm test still runs everything, as CI does.
// Use: npm run test:changed [-- --list | extra node --test flags]
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).split("\n").filter(Boolean);
const base = git("merge-base", "HEAD", "main")[0];
const changed = new Set([...git("diff", "--name-only", base), ...git("ls-files", "--others", "--exclude-standard")].map(normalize));
const EVERYTHING = ["package.json", "package-lock.json", "tsconfig.json", "scripts/ts-register.mjs", "scripts/ts-resolve.mjs"];

const tests = readdirSync("tests").filter((f) => f.endsWith(".test.ts")).map((f) => join("tests", f));
let run;
if (EVERYTHING.some((f) => changed.has(f))) run = tests;
else {
  // What a file depends on, resolved the way Vite and ts-resolve.mjs do (no extension means .ts or .tsx).
  const imports = new Map();
  const resolve = (from, spec) => {
    const p = normalize(join(dirname(from), spec));
    for (const c of [p, `${p}.ts`, `${p}.tsx`, join(p, "index.ts")]) if (existsSync(c) && statSync(c).isFile()) return c;
    return null;
  };
  const importsOf = (file) => {
    if (!imports.has(file)) {
      const src = readFileSync(file, "utf8");
      // Every relative path in quotes: imports, and files opened by new URL("../tests/fixtures/…", import.meta.url).
      const specs = [...src.matchAll(/["'](\.{1,2}\/[^"'\s]+)["']/g)].map((m) => m[1]);
      // Files it names from the top of the repository count too: docs a test reads, the server a script starts.
      const named = [...src.matchAll(/["'`]((?:docs|tests|src|server|data|scripts)\/[^"'`$\s]+)["'`]/g)].map((m) => normalize(m[1]));
      imports.set(file, [...specs.map((s) => resolve(file, s)).filter(Boolean), ...named.filter((f) => existsSync(f) && statSync(f).isFile())]);
    }
    return imports.get(file);
  };
  const reaches = (test) => {
    const seen = new Set();
    const todo = [test];
    while (todo.length) {
      const f = todo.pop();
      if (seen.has(f)) continue;
      seen.add(f);
      if (changed.has(f)) return true;
      if (/\.(ts|tsx|mjs|js)$/.test(f)) todo.push(...importsOf(f));
    }
    return false;
  };
  run = tests.filter(reaches);
}

if (!run.length) {
  console.log(`No unit test reaches the ${changed.size} file(s) changed since main.`);
  process.exit(0);
}
console.log(`${run.length} of ${tests.length} test files reach the ${changed.size} file(s) changed since main.`);
const args = process.argv.slice(2);
if (args.includes("--list")) {
  console.log(run.join("\n"));
  process.exit(0);
}
const r = spawnSync(process.execPath, ["--import", "./scripts/ts-register.mjs", "--test", ...args, ...run], { stdio: "inherit" });
process.exit(r.status ?? 1);
