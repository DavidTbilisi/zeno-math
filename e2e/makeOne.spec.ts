// Make one, played in real time: the pieces of each group caught as they fall and the decoys let go make every one
// without a spill; catching every piece in turn spills where the sum runs past one.
import { expect, test, type Page } from "@playwright/test";
import { MAKE_LADDER, makeNow, makeStars, slipsOf, sumOf } from "../src/math/makeOne.ts";
import { boardWith } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR ?? "test-results";
const stars = (k: number) => "★".repeat(k) + "☆".repeat(3 - k);

/** Starts the first wave and taps the pieces whose drop index is in `pick` once they are well inside the stage. */
async function play(page: Page, pick: number[]) {
  const game = await boardWith(page, "Make one: catch fraction pieces that add up to one whole", ".live-makeOne");
  await game.getByRole("button", { name: /Start/ }).click();
  await page.waitForFunction((pick) => {
    const g = document.querySelector(".live-makeOne")!;
    if (/Wave over/.test(g.textContent ?? "")) return true;
    const svg = g.querySelector("svg")!;
    const box = svg.getBoundingClientRect();
    for (const e of g.querySelectorAll<SVGGElement>("g[data-falling]")) {
      const r = e.querySelector("circle")!.getBoundingClientRect();
      const [x, y] = [r.x + r.width / 2, r.y + r.height / 2];
      if (!pick.includes(Number(e.dataset.i)) || y < box.top + box.height * 0.3) continue;
      const o = { bubbles: true, clientX: x, clientY: y, pointerId: 1, button: 0 };
      svg.dispatchEvent(new PointerEvent("pointerdown", o));
      svg.dispatchEvent(new PointerEvent("pointerup", o));
    }
    return false;
  }, pick, { polling: 30, timeout: 40_000 });
  return game;
}

const { spec, drops } = makeNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });

test("make one: each group caught, the decoys let fall, every one made clean and the next puzzle open", async ({ page }) => {
  const game = await play(page, drops.flatMap((d, i) => (d.group >= 0 ? [i] : [])));
  await expect(game.getByText(`Wave over: ${spec.goal} of ${spec.goal} ones, 0 spilled. ★★★`)).toBeVisible();
  await game.locator("svg.hand-pic").first().screenshot({ path: `${SHOTS}/make-one-done.png` });
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
  expect(MAKE_LADDER.length).toBe(9);
});

test("make one: every piece caught in turn, the basket spills past one", async ({ page }) => {
  // What catching everything comes to: the basket's rule run over the pieces in the order they fall.
  let [basket, made, overs] = [[] as typeof drops[number]["f"][], 0, 0];
  for (const d of drops) {
    basket = [...basket, d.f];
    const s = sumOf(basket);
    if (s.isOne()) [basket, made] = [[], made + 1];
    else if (s.toNumber() > 1) [basket, overs] = [[], overs + 1];
  }
  expect(overs).toBeGreaterThan(0);
  const game = await play(page, drops.map((_, i) => i));
  const k = makeStars(slipsOf(made, overs, spec.goal));
  await expect(game.getByText(`Wave over: ${made} of ${spec.goal} ones, ${overs} spilled. ${stars(k)}`, { exact: false })).toBeVisible();
  await expect(game.getByText("✗ spills:", { exact: false })).toBeVisible();
});
