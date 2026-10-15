// Every language has exactly the keys English has, with the same kind of value, and Georgian captions fit the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ru } from "../src/locales/ru.ts";
import { ka } from "../src/locales/ka.ts";
import { textLen, W, wrap } from "../src/math/chart.ts";

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

// Captions wrap at 74 letters, counted in Latin letters' widths. A Georgian letter is wider (9.1 px against 6.8 px on
// average at caption size, measured in Chromium), so a line counted letter by letter ran off the 640 px picture.
test("Georgian captions wrap inside the picture", () => {
  const georgian = /[Ⴀ-ჿᲐ-Ჿⴀ-⴯]/;
  const px = (line: string) => [...line].reduce((s, ch) => s + (georgian.test(ch) ? 9.1 : 6.8), 0);
  const long: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string" && v.length > 74) long.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(ka);
  assert.ok(long.length > 100, `${long.length} long Georgian texts`);
  for (const text of long) for (const line of wrap(text)) assert.ok(px(line) <= W - 32, `${Math.round(px(line))} px: ${line}`);
  // Latin and Cyrillic text wraps exactly as before.
  const en = "Each value is the index of the next cell, so following them from index 0 must end in a loop, and here it does.";
  assert.deepEqual(wrap(en).map((l) => l.length <= 74), [true, true]);
  assert.equal(textLen(en), en.length);
  assert.equal(textLen("Каждое значение"), 15);
  assert.equal(textLen("ციკლი"), 5 * 1.35);
});
