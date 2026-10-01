// Lets Node run the app's TypeScript directly (tests, scripts): resolves the extensionless
// imports Vite allows ("./chart") to their .ts files. Use: node --import ./scripts/ts-register.mjs
import { register } from "node:module";

register("./ts-resolve.mjs", import.meta.url);
