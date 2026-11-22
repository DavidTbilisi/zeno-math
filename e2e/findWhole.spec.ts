// Find the whole by hand: a build puzzle laid with the piece uncut (its own slip) and then cut and laid to one whole;
// a name puzzle on a bar that is not one whole, the piece read against the bar shown (the slip) and then against one.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { WHOLE_LADDER, wholeNow, type WholeTask } from "../src/math/findWhole.ts";
import { boardWith } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR;
const open = async (page: Page, passed: number) => {
  const stars = WHOLE_LADDER.map((_, k) => (k < passed ? 3 : 0));
  await page.addInitScript((s) => localStorage.setItem("zeno.findwhole.v1", JSON.stringify({ stars: s })), stars);
  const game = await boardWith(page, "Find the whole: build it from a part", ".live-findWhole");
  if (passed) await game.getByRole("button", { name: new RegExp(`^Puzzle ${passed + 1}`) }).click();
  return game;
};
const task = (stage: number) => wholeNow({ mode: "puzzle", stage, level: 1, seed: 1 })!;
const stageOf = (kind: WholeTask["kind"], from: number, test: (t: WholeTask) => boolean = () => true) => {
  for (let s = from; s < WHOLE_LADDER.length; s++) if (task(s).kind === kind && test(task(s))) return s;
  throw new Error(`no ${kind} stage from ${from}`);
};
const setTo = async (box: Locator, v: number) => {
  await box.focus();
  const now = Number(await box.getAttribute("aria-valuenow"));
  for (let i = 0; i < Math.abs(v - now); i++) await box.press(v > now ? "ArrowUp" : "ArrowDown");
  await expect(box).toHaveAttribute("aria-valuenow", String(v));
};

test("find the whole: build one whole from a piece of several parts", async ({ page }) => {
  const s = stageOf("build", 3, (t) => t.kind === "build" && t.n > 1);
  const t = task(s) as Extract<WholeTask, { kind: "build" }>;
  const game = await open(page, s);
  const pic = game.locator("svg").first();
  const lay = pic.getByRole("button", { name: "Lay a part", exact: true });
  // The uncut piece laid d times: copies of the piece, not of its parts.
  for (let i = 1; i < t.d; i++) await lay.click();
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^Those are copies of the whole piece/)).toBeVisible();
  await setTo(pic.getByRole("slider", { name: "Cut the top bar into parts" }), t.n);
  await expect(game.getByText(`Row: ${t.n} parts.`)).toBeVisible();
  for (let i = t.n; i < t.d + 1; i++) await lay.click();
  await pic.getByRole("button", { name: `Take off part ${t.d + 1} and the ones after it` }).click();
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`Right! ${t.d} parts of 1/${t.d} make one whole\\. ★★`))).toBeVisible();
});

test("find the whole: name the piece when the bar shown is not one whole", async ({ page }) => {
  const s = stageOf("name", 6);
  const t = task(s) as Extract<WholeTask, { kind: "name" }>;
  const game = await open(page, s);
  const pic = game.locator("svg").first();
  await setTo(pic.getByRole("slider", { name: "Cut the top bar into parts" }), t.rn);
  await setTo(pic.getByRole("slider", { name: "Answer bottom" }), t.rn);
  await setTo(pic.getByRole("slider", { name: "Answer top" }), t.pn);
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(new RegExp(`^${t.pn}/${t.rn} is the piece against this bar`))).toBeVisible();
  await setTo(pic.getByRole("slider", { name: "Answer bottom" }), t.rd);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/findWhole.png` });
  await pic.getByRole("button", { name: "Check" }).click();
  await expect(game.getByText(/^The bar wasn't one whole, and you kept track! Right! .* ★★/)).toBeVisible();
});
