// A fingerprint of every practice question: for each skill, the questions at every level and seeds 1–20 in English,
// Georgian and Russian, with their pictures drawn, their steps, the example like them and the verdict on their own
// answer, hashed. A change that moves code without changing what students see keeps every hash; the per-skill hashes
// say which skill a change touched. `npm run snapshot` prints them; `npm run snapshot -- --write` saves them to
// tests/fixtures/practice-snapshot.json, which tests/practiceSnapshot.test.ts compares against.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exampleLike, exercise, LEVELS, stepsOf, type Exercise } from "../src/math/practice.ts";
import { ALL_SKILLS, type SkillId } from "../src/math/practiceSkills.ts";

export const SNAPSHOT_SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const LANGS = { en: en.pracWords, ka: ka.pracWords, ru: ru.pracWords };
export const SNAPSHOT_FILE = new URL("../tests/fixtures/practice-snapshot.json", import.meta.url);

/** The exercise as plain data: the picture drawn at the origin, every other function left out. */
function plain(ex: Exercise | null): unknown {
  if (!ex) return null;
  const { pic, ...rest } = ex;
  return JSON.parse(JSON.stringify({ ...rest, pic: pic && { svg: pic.svg(0, 0), h: pic.h, w: pic.w } }));
}

/** The hash of one skill's questions. */
export function skillHash(skill: SkillId): string {
  const h = createHash("sha256");
  for (const [lang, w] of Object.entries(LANGS))
    for (const level of LEVELS)
      for (const seed of SNAPSHOT_SEEDS) {
        const ex = exercise(skill, level, seed, w);
        const steps = stepsOf(ex, w).map(plain);
        const like = plain(exampleLike(ex, w));
        h.update(JSON.stringify({ lang, level, seed, ex: plain(ex), steps, like, verdict: check(ex, ex.plain, w) }));
        h.update("\n");
      }
  return h.digest("hex").slice(0, 16);
}

export const snapshot = (): Record<string, string> => Object.fromEntries(ALL_SKILLS.map((s) => [s, skillHash(s)]));
export const savedSnapshot = (): Record<string, string> => JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8"));

if (import.meta.url === `file://${process.argv[1]}`) {
  const now = snapshot();
  if (process.argv.includes("--write")) {
    writeFileSync(SNAPSHOT_FILE, JSON.stringify(now, null, 2) + "\n");
    console.log(`saved ${Object.keys(now).length} skill hashes`);
  } else {
    const saved = savedSnapshot();
    const changed = Object.keys(now).filter((s) => saved[s] !== now[s]);
    console.log(changed.length ? `changed: ${changed.join(", ")}` : `all ${Object.keys(now).length} skills unchanged`);
  }
}
