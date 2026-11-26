// Continuity: the hole's two sides head for 4, and dragging k to 1 joins the pieces; in practice f(a) taken for the
// limit is named.
import { expect, test } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { boardWith, practise, seedOf } from "./helpers.ts";

const W = en.live.closeIn;
const w = en.pracWords;

test("close in on the break: both sides of the hole head for 4, and k = 1 joins the pieces", async ({ page }) => {
  const g = await boardWith(page, en.shapes.names.liveCloseIn, ".live-closeIn");
  await expect(g.getByRole("group", { name: /^At 1 from 2, f\(1\) = 3 on the left and f\(3\) = 5 on the right\. Both sides head for 4/ })).toBeVisible();
  await g.getByRole("button", { name: W.join }).click();
  const k = g.getByRole("slider", { name: W.kLabel });
  // The first key may only bring the piece forward on the board.
  await expect(async () => {
    await k.focus({ timeout: 1000 });
    await page.keyboard.press("ArrowRight");
    await expect(k).toHaveAttribute("aria-valuenow", "0", { timeout: 1000 });
  }).toPass();
  await page.keyboard.press("ArrowRight");
  await expect(g.getByRole("group", { name: /With k = 1 both sides head for 3 and f\(2\) = 3: the pieces join/ })).toBeVisible();
});

test("continuity in practice: f(a) taken for the limit is named", async ({ page, request }) => {
  let r = 0.01;
  for (let n = 1; n < 100; n++) {
    const ex = exercise("continuity", 1, seedOf(n / 100), w);
    if (ex.format === "number" && ex.answer.traps?.some((t) => t.id === "limitAsValue")) {
      r = n / 100;
      break;
    }
  }
  const ex = exercise("continuity", 1, seedOf(r), w);
  const slip = ex.answer.traps!.find((t) => t.id === "limitAsValue")!;
  await practise(page, request, { tab: en.practiceCalculus, skill: w.skills.continuity, level: "easy", r, prompt: ex.prompt });
  await page.getByLabel("Your answer").fill(slip.a.k === "num" ? String(slip.a.v) : "");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/whatever happens at/)).toBeVisible();
  await page.getByLabel("Your answer").fill(ex.plain);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
});
