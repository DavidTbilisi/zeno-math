// Transformations: moving the key point right 3 writes x − 3 inside the bracket, and pulling the stretch point down
// flips the graph; in practice a shift the wrong way is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.moveGraph;
const w = en.pracWords;

test("move the graph: right 3 and up 2 is (x − 3)² + 2, and the stretch point below flips it", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveMoveGraph, ".live-moveGraph");
  const point = g.getByRole("slider", { name: W.pointLabel });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await point.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowRight");
    await expect(g.getByRole("group", { name: /^y = \(x − 1\)²\./ })).toBeVisible({ timeout: 1000 });
  }).toPass();
  for (const k of ["ArrowRight", "ArrowRight", "ArrowUp", "ArrowUp"]) await page.keyboard.press(k);
  await expect(g.getByRole("group", { name: /^y = \(x − 3\)² \+ 2\. Right 3 shows as x − 3 inside/ })).toBeVisible();
  await g.getByRole("slider", { name: W.stretchLabel }).focus();
  // 1, then −1 (0 is skipped), then −2.
  for (let i = 0; i < 2; i++) await page.keyboard.press("ArrowDown");
  await expect(g.getByRole("group", { name: /^y = −2\(x − 3\)² \+ 2\. .*The minus flips it upside down/ })).toBeVisible();
});

test("transformations in practice: a shift the wrong way is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++) {
    const ex = exercise("fnTransform", 1, seedOf(k / 100), w);
    // A typed question: the root graphs (#726) name the same slip on a tile.
    if (ex.answer.k === "num" && ex.answer.traps?.some((t) => t.id === "shiftWrongWay")) {
      r = k / 100;
      break;
    }
  }
  const ex = exercise("fnTransform", 1, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "shiftWrongWay")!;
  await practise(page, request, { tab: en.practiceAlgebra, skill: w.skills.fnTransform, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/the sign is opposite to the move/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
