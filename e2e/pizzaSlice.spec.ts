// Slice the pizza, played in real time: each order cut into the slices it wants and served before the guests arrive
// is right; one pizza cut a slice too many is wrong (each slice smaller than asked), for two stars.
import { expect, test, type Page } from "@playwright/test";
import { PIZZA_LADDER, pizzaNow } from "../src/math/pizzaSlice.ts";
import { boardWith } from "./helpers.ts";

const SHOTS = process.env.SHOTS_DIR ?? "test-results";
const { orders } = pizzaNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });

/** Starts the first wave and cuts each order to what it wants (order `extra` one slice more), then serves. */
async function play(page: Page, extra: number) {
  const game = await boardWith(page, "Slice the pizza: equal slices before the guests arrive", ".live-pizzaSlice");
  await game.getByRole("button", { name: /Start/ }).click();
  await page.waitForFunction(({ wants, extra }) => {
    const g = document.querySelector(".live-pizzaSlice")!;
    if (/Wave over/.test(g.textContent ?? "")) return true;
    const pizza = g.querySelector<SVGGElement>('[aria-label="Cut the pizza"]');
    if (!pizza) return false;
    const [n, at] = [Number(pizza.dataset.n), Number(pizza.dataset.at)];
    if (at >= wants.length) return false;
    const want = wants[at] + (at === extra ? 1 : 0);
    const press = (el: Element) => el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, button: 0 }));
    press(n < want ? pizza : g.querySelector('[aria-label="Serve the guests"]')!);
    return false;
  }, { wants: orders.map((o) => o.want), extra }, { polling: 80, timeout: 60_000 });
  return game;
}

test("slice the pizza: every order cut to its slices and served in time, three stars, the next puzzle open", async ({ page }) => {
  const game = await play(page, -1);
  await expect(game.getByText(`Wave over: ${orders.length} of ${orders.length} orders right. ★★★`)).toBeVisible();
  await game.locator("svg.hand-pic").first().screenshot({ path: `${SHOTS}/pizza-done.png` });
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
  expect(PIZZA_LADDER.length).toBe(9);
});

test("slice the pizza: a slice too many makes each slice smaller than asked", async ({ page }) => {
  const game = await play(page, 0);
  const want = orders[0].want;
  await expect(game.getByText(`Wave over: ${orders.length - 1} of ${orders.length} orders right. ★★☆`)).toBeVisible();
  await expect(game.getByText(`1/${want + 1}, wanted 1/${want}`)).toBeVisible();
});
