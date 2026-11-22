// Share the bag by hand: a set dealt in rounds into fair bags, several taken, one bag's worth counted (the slip) and
// then all of them; a bar worked back from what is left, the left-over put over the spent parts (the slip) and then right.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { SHARE_LADDER, shareNow, unitOf, wantOf, type ShareTask } from "../src/math/shareBags.ts";
import { boardWith } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR;
const open = async (page: Page, passed: number) => {
  const stars = SHARE_LADDER.map((_, k) => (k < passed ? 3 : 0));
  await page.addInitScript((s) => localStorage.setItem("zeno.sharebags.v1", JSON.stringify({ stars: s })), stars);
  const game = await boardWith(page, "Share the bag: a fraction of a set, bar models", ".live-shareBags");
  if (passed) await game.getByRole("button", { name: new RegExp(`^Puzzle ${passed + 1}`) }).click();
  return game;
};
const task = (stage: number) => shareNow({ mode: "puzzle", stage, level: 1, seed: 1 })!;
const stageOf = (test: (t: ShareTask) => boolean) => {
  for (let s = 0; s < SHARE_LADDER.length; s++) if (test(task(s))) return s;
  throw new Error("no such stage");
};
const setTo = async (box: Locator, v: number) => {
  await box.focus();
  const now = Number(await box.getAttribute("aria-valuenow"));
  for (let i = 0; i < Math.abs(v - now); i++) await box.press(v > now ? "ArrowUp" : "ArrowDown");
  await expect(box).toHaveAttribute("aria-valuenow", String(v));
};

test("share the bag: deal a set fair, take several bags, count them all", async ({ page }) => {
  const s = stageOf((t) => t.kind === "set" && t.a > 1);
  const t = task(s) as Extract<ShareTask, { kind: "set" }>;
  const game = await open(page, s);
  const pic = game.locator("svg").first();
  for (let r = 0; r < t.n / t.b; r++) await pic.getByRole("button", { name: "Deal a round" }).click();
  await expect(pic.getByText("0 in the pile")).toBeVisible();
  for (let j = 1; j <= t.a; j++) await pic.getByRole("checkbox", { name: `Take bag ${j}` }).click();
  await expect(game.getByText(`Bags taken: ${t.a}.`)).toBeVisible();
  await setTo(pic.getByRole("slider", { name: "Answer" }), unitOf(t));
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^That is one bag\./)).toBeVisible();
  await setTo(pic.getByRole("slider", { name: "Answer" }), wantOf(t));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/shareBags.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${t.a}/${t.b} of ${t.n} is ${wantOf(t)}\\. ★★`))).toBeVisible();
});

test("share the bag: a bar worked back from what is left", async ({ page }) => {
  const s = stageOf((t) => t.kind === "left");
  const t = task(s) as Exclude<ShareTask, { kind: "set" }>;
  const game = await open(page, s);
  const pic = game.locator("svg").first();
  await setTo(pic.getByRole("slider", { name: "Cut the bar into parts" }), t.b);
  // What is left put over the spent parts.
  await setTo(pic.getByRole("slider", { name: "One part" }), t.x / t.a);
  await setTo(pic.getByRole("slider", { name: "All of it" }), t.b * (t.x / t.a));
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`^${t.x} is what is left`))).toBeVisible();
  await setTo(pic.getByRole("slider", { name: "One part" }), unitOf(t));
  await setTo(pic.getByRole("slider", { name: "All of it" }), wantOf(t));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/shareBar.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! One part is ${unitOf(t)}, all of it is ${wantOf(t)}\\. ★★`))).toBeVisible();
});
