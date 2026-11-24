// The other fact games. Gate run: the fact on the sign, three gates, and the runner sent through one by its lane's
// number; the right gate every time earns three stars, a wrong one is said and the fact comes back. Join up: tiles
// slid by a swipe and by the arrow keys, pairs that make the target counted, and the round finished by the slides of
// the player the goals were set with.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { boardWith } from "./helpers";
import { runNow, runStart } from "../src/math/gateRun.ts";
import { botSlide, JOIN_LADDERS, play, type Dir } from "../src/math/joinUp.ts";

const SHOTS = process.env.SHOTS_DIR ?? "test-results";

/** The row on the road: its fact, and whether it is a missed fact come back. */
const row = (game: Locator) =>
  game.evaluate((g) => {
    const t = g.querySelector<SVGTextElement>("text[data-fact]");
    return t ? `${t.dataset.fact}${t.dataset.again !== undefined ? " again" : ""}` : null;
  });
/** Presses the lane's number once a row is on the road, and waits until that row has been passed. */
async function through(page: Page, game: Locator, lane: (fact: string) => number) {
  await expect.poll(() => row(game), { timeout: 15_000 }).not.toBeNull();
  const now = (await row(game))!;
  await page.keyboard.press(String(lane(now.replace(" again", "")) + 1));
  await expect.poll(() => row(game)).not.toBe(now);
  return now;
}

test("gate run, × and ÷: the right gate every time earns three stars; a wrong gate is said, and the fact comes back", async ({ page }) => {
  const game = await boardWith(page, "Gate run: × and ÷ facts, through the right gate", ".live-runTimes");
  const { gates } = runNow(runStart("times"));
  const right = new Map(gates.map((g) => [g.fact.text, g]));
  await expect(game.getByText("Press Start, then run through the gate with the answer")).toBeVisible();
  await game.getByRole("button", { name: /Start/ }).click();
  await expect(game.locator("svg.hand-pic").first()).toBeFocused();
  // The first row through a wrong gate.
  const first = gates[0];
  const wrongLane = (first.right + 1) % 3;
  await expect(game.getByRole("button", { name: `Lane ${wrongLane + 1}: ${first.options[wrongLane]}` })).toBeVisible();
  await through(page, game, () => wrongLane);
  await expect(game.getByText(`Not ${first.options[wrongLane]}: ${first.fact.text} = ${first.fact.answer}. It comes back once more.`)).toBeVisible();
  // The rest through the right gates, the first fact among them again at the end.
  let last = "";
  for (let i = 1; i <= gates.length; i++) {
    last = await through(page, game, (fact) => right.get(fact)!.right);
    if (i === 2) await game.locator("svg.hand-pic").first().screenshot({ path: `${SHOTS}/gate-run-play.png` });
  }
  expect(last).toBe(`${first.fact.text} again`);
  await expect(game.getByText(new RegExp(`Run over: ${gates.length - 1} right, \\d+ of them quick ⚡, 1 slips\\. ★★☆`))).toBeVisible();
  await expect(game.getByText("✗ To learn: 1")).toBeVisible();
  await expect(game.getByText(`${first.fact.text} = ${first.fact.answer} · then right ✓`)).toBeVisible();
  await game.locator("svg.hand-pic").first().screenshot({ path: `${SHOTS}/gate-run-done.png` });
  await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
  const book = await page.evaluate(() => JSON.parse(localStorage.getItem("zeno.facts.v1") ?? "{}") as Record<string, { n: number; run: number }>);
  expect(book[first.fact.key]).toMatchObject({ n: 2, run: 1 });
});

test("gate run, + and −: a lane tapped sends the runner through its gate, and a clean run earns three stars", async ({ page }) => {
  const game = await boardWith(page, "Gate run: + and − facts, through the right gate", ".live-runPlus");
  const { gates } = runNow(runStart("plus"));
  await game.getByRole("button", { name: /Start/ }).click();
  for (const g of gates) {
    const lane = game.getByRole("button", { name: `Lane ${g.right + 1}: ${g.fact.answer}`, exact: true });
    await expect(lane).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => row(game)).toBe(g.fact.text);
    await lane.dispatchEvent("pointerdown");
    await expect.poll(() => row(game)).not.toBe(g.fact.text);
  }
  await expect(game.getByText(new RegExp(`Run over: ${gates.length} right, \\d+ of them quick ⚡, 0 slips\\. ★★★`))).toBeVisible();
  await expect(game.getByText(`✓ Right: ${gates.length}`)).toBeVisible();
});

for (const deck of ["sum", "product"] as const)
  test(`join up, ${deck}s: a swipe and the arrow keys slide the tiles, and the player's slides finish the round with three stars`, async ({ page }) => {
    const name = deck === "sum" ? "Join up: slide tiles together to make the sum" : "Join up: slide tiles together to make the product";
    const game = await boardWith(page, name, deck === "sum" ? ".live-joinSum" : ".live-joinProduct");
    const { spec, seed } = JOIN_LADDERS[deck][0];
    let slides = "";
    for (;;) {
      const r = play(spec, seed, slides);
      const d = r.full || r.stuck ? null : botSlide(spec, r.grid);
      if (!d) break;
      slides += d;
    }
    const end = play(spec, seed, slides);
    expect(end.full).toBe(true);
    const pic = game.locator("svg.hand-pic").first();
    const tiles = () => pic.locator("g[data-tile]").evaluateAll((gs) => gs.map((g) => `${(g as SVGGElement).dataset.cell}:${(g as SVGGElement).dataset.tile}`).join(" "));
    const want = (s: string) => play(spec, seed, s).grid.flatMap((v, c) => (v === null ? [] : [`${c}:${v}`])).join(" ");
    expect(await tiles()).toBe(want(""));
    // The first slide by a swipe across the grid.
    const box = (await pic.boundingBox())!;
    const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2 - 20];
    const by: Record<Dir, [number, number]> = { L: [-90, 0], R: [90, 0], U: [0, -90], D: [0, 90] };
    const [dx, dy] = by[slides[0] as Dir];
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + dx, cy + dy, { steps: 6 });
    await page.mouse.up();
    await expect.poll(tiles).toBe(want(slides[0]));
    // The rest by the arrow keys.
    await pic.focus();
    const key: Record<Dir, string> = { L: "ArrowLeft", R: "ArrowRight", U: "ArrowUp", D: "ArrowDown" };
    for (let i = 1; i < slides.length; i++) {
      await page.keyboard.press(key[slides[i] as Dir]);
      if (i === 8) {
        await expect.poll(tiles).toBe(want(slides.slice(0, 9)));
        await game.screenshot({ path: `${SHOTS}/join-up-${deck}.png` });
      }
    }
    await expect(game.getByText(new RegExp(`${spec.target} made ${end.made} times in ${end.moves} slides! ★★★`))).toBeVisible();
    await expect(game.getByRole("img", { name: `${end.made} of ${spec.full} made; ${spec.pass} pass the round` })).toBeVisible();
    await expect(game.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
    // The round is over: another key moves nothing.
    const before = await tiles();
    await page.keyboard.press("ArrowLeft");
    expect(await tiles()).toBe(before);
  });
