// The graph with sliders, worked by hand: a tap on the curve puts a point on it, a tap on the point its tangent, the point
// dragged along and off the graph; the knobs dragged, tapped to play, the track tapped; a range's end dragged; a function
// typed into the spare line and cleared away again; the lever zooms and a double-click puts the view back.
import { expect, test, type Page } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

async function drag(page: Page, a: { x: number; y: number }, b: { x: number; y: number }) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
}
const mid = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

test("graph with sliders by hand: point, tangent, knobs, play, range, functions, lever", async ({ page }) => {
  const piece = await boardWith(page, "Graph with sliders", ".live-graph");
  const plot = piece.locator("svg.live-plot");
  const box = (await plot.boundingBox())!;
  const k = box.width / 620;
  // The view starts at x −10…10, y −5.5…5.5 over 620 × 330.
  const at = (x: number, y: number) => ({ x: box.x + ((x + 10) / 20) * 620 * k, y: box.y + ((5.5 - y) / 11) * 330 * k });
  const point = plot.getByRole("button", { name: /^Point on the curve/ });
  const knob = (n: string) => piece.getByRole("slider", { name: `${n}: drag the knob along, tap it to play or pause` });

  // y = x²: a tap on the curve at x = 1 puts the point there, a tap on the point shows its tangent.
  await page.mouse.click(at(1, 1).x, at(1, 1).y);
  await expect(plot).toContainText("(1, 1)");
  await point.click();
  await expect(plot).toContainText("gradient = 2");
  // The point dragged along to x = 2.
  await drag(page, at(1, 1), at(2, 4));
  await expect(plot).toContainText("(2, 4)");
  await expect(plot).toContainText("gradient = 4");

  // b turned down to −2 from the keyboard: y = x² − 2x, the point (2, 0) with gradient 2.
  for (let i = 0; i < 20; i++) await knob("b").press("ArrowDown");
  await expect(knob("b")).toHaveAttribute("aria-valuenow", "-2");
  await expect(plot).toContainText("(2, 0)");
  await expect(plot).toContainText("gradient = 2");
  // The point dragged off the bottom of the graph is put away.
  const p = mid((await point.boundingBox())!);
  await drag(page, p, { x: p.x, y: box.y + box.height + 30 });
  await expect(point).toHaveCount(0);
  // c's knob dragged one unit right (the track is 132 wide for −5…5).
  const c0 = mid((await knob("c").locator("circle").boundingBox())!);
  await drag(page, c0, { x: c0.x + 13.2 * k, y: c0.y });
  await expect.poll(async () => Number(await knob("c").getAttribute("aria-valuenow"))).toBeGreaterThan(0.7);
  // A tap near the right end of a's track: a is nearly 5.
  const track = (await knob("a").boundingBox())!;
  await page.mouse.click(track.x + track.width - 14 * k, track.y + track.height / 2);
  await expect.poll(async () => Number(await knob("a").getAttribute("aria-valuenow"))).toBeGreaterThan(4.5);
  // a's knob tapped: it plays; tapped again it stops.
  const a0 = mid((await knob("a").locator("circle").boundingBox())!);
  await page.mouse.click(a0.x, a0.y);
  await expect(knob("a")).toHaveAttribute("aria-valuetext", /▶/);
  await page.waitForTimeout(300);
  const playing = mid((await knob("a").locator("circle").boundingBox())!);
  await page.mouse.click(playing.x, playing.y);
  await expect(knob("a")).not.toHaveAttribute("aria-valuetext", /▶/);

  // a's greatest value dragged three steps right: 5 becomes 8.
  const amax = piece.getByRole("slider", { name: "a max: drag left or right" });
  await drag(page, mid((await amax.boundingBox())!), { x: mid((await amax.boundingBox())!).x + 32 * k, y: mid((await amax.boundingBox())!).y });
  await expect(amax).toHaveAttribute("aria-valuenow", "8");

  // A second function typed into the spare line gets its own slider; cleared, it goes away again.
  await piece.getByRole("textbox", { name: "Type another function here" }).fill("k*x");
  await piece.getByRole("textbox", { name: "Type another function here" }).press("Enter");
  await expect(knob("k")).toBeVisible();
  await piece.getByRole("textbox", { name: "y = k*x" }).fill("");
  await piece.getByRole("textbox", { name: "y = ", exact: true }).press("Enter");
  await expect(knob("k")).toHaveCount(0);

  // The lever pulled down zooms out; a double-click on the graph puts the view back.
  const lever = plot.getByRole("slider", { name: /^Zoom/ });
  const l = mid((await lever.boundingBox())!);
  await drag(page, l, { x: l.x, y: l.y + 40 * k });
  await expect(lever).not.toHaveAttribute("aria-valuetext", "x from -10 to 10");
  await page.mouse.dblclick(at(-8, -4).x, at(-8, -4).y);
  await expect(lever).toHaveAttribute("aria-valuetext", "x from -10 to 10");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/liveGraph.png` });
});
