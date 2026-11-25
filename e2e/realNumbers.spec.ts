// Real numbers: the root zoom squeezes √2.25 to 1.5 and stops; in practice a recurring decimal cut off is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.rootZoom;
const w = en.pracWords;

test("squeeze the root: √2.25 stops at 1.5", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveRootZoom, ".live-rootZoom");
  const piece = (a: string, b: string) => g.getByRole("button", { name: W.pieceName.replace("{a}", a).replace("{b}", b) });
  await g.getByRole("button", { name: "√2.25" }).click();
  // The first tap may only bring the piece forward on the board.
  await expect(async () => {
    await piece("2", "3").click({ timeout: 1000 });
    await expect(g.getByText(/^Not there/)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await piece("1", "2").click();
  await piece("1.5", "1.6").click();
  await expect(g.getByText(/^A tick landed exactly on it/)).toBeVisible();
});

test("real numbers in practice: a recurring decimal cut off is named", async ({ page, request }) => {
  let r = 0.01;
  for (let k = 1; k < 100; k++)
    if (exercise("realNumbers", 2, seedOf(k / 100), w).answer.traps?.some((t) => t.id === "recurringAsTerminating")) {
      r = k / 100;
      break;
    }
  const ex = exercise("realNumbers", 2, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "recurringAsTerminating")!;
  await practise(page, request, { tab: "Number", skill: w.skills.realNumbers, level: "medium", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("The digits repeat for ever")).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
