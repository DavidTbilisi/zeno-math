// The server marks every typed answer again, with the same checker the browser uses, and stores its own verdict: a
// question is fixed by its skill, level and seed, so the browser's verdict is a claim the server can check. The two
// agree unless the browser's code differs from the server's (a page left open across an update, or a modified client);
// where they differ, the browser's verdict is kept beside the server's so the disagreement shows in the exports.
//
// ZENO_CHECKER names the bundled checker (the Docker image); without it, the checker is loaded from source, whose
// imports leave off ".ts" as Vite allows, so the same resolve hook as the tests' is registered first.
import { register } from "node:module";
import type * as Checker from "./checker.ts";

const bundled = process.env.ZENO_CHECKER;
if (!bundled) register("../scripts/ts-resolve.mjs", import.meta.url);
const checker = (await import(bundled ?? "./checker.ts")) as typeof Checker;

export type { Question } from "./checker.ts";
export const mark = checker.mark;
