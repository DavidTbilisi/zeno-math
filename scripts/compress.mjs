// Writes .br and .gz copies of the built text assets next to the originals,
// so the server can send them compressed without compressing on every request.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const DIR = process.argv[2] ?? "dist";
const TEXT = /\.(js|css|html|svg|json|wasm|txt)$/;

let before = 0;
let after = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (TEXT.test(name)) {
      const data = readFileSync(file);
      if (data.length < 1024) continue;
      const br = brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
      writeFileSync(`${file}.br`, br);
      writeFileSync(`${file}.gz`, gzipSync(data, { level: 9 }));
      before += data.length;
      after += br.length;
    }
  }
}
walk(DIR);
console.log(`compressed ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB (brotli)`);
