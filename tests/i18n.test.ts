// Every language has exactly the keys English has, with the same kind of value.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ru } from "../src/locales/ru.ts";
import { ka } from "../src/locales/ka.ts";

function shape(v: unknown, path: string, out: Map<string, string>) {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v)) shape(x, `${path}.${k}`, out);
  } else {
    out.set(path, Array.isArray(v) ? `array:${v.length}` : typeof v === "function" ? `function:${v.length}` : typeof v);
  }
  return out;
}

const want = shape(en, "", new Map());
for (const [name, dict] of [["ru", ru], ["ka", ka]] as const) {
  test(`${name} has the same keys as en`, () => {
    const got = shape(dict, "", new Map());
    assert.deepEqual([...want.keys()].filter((k) => !got.has(k)), [], "missing");
    assert.deepEqual([...got.keys()].filter((k) => !want.has(k)), [], "extra");
    for (const [k, kind] of want) assert.equal(got.get(k), kind, k);
  });
}

// A text that English has must not be left blank in a translation (some hints are blank on purpose in all three).
test("no untranslated blanks", () => {
  const blanks = (dict: unknown) => {
    const out = new Set<string>();
    const walk = (v: unknown, path: string) => {
      if (typeof v === "string" && !v.trim()) out.add(path);
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk(dict, "");
    return out;
  };
  const inEn = blanks(en);
  for (const [name, dict] of [["ru", ru], ["ka", ka]] as const) {
    assert.deepEqual([...blanks(dict)].filter((k) => !inEn.has(k)), [], name);
  }
});
