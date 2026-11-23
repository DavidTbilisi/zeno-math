// Which tool?: the first quadratics puzzle (factor or take square roots). A wrong tool is told what it is for, the
// problem is shown solved by its own tool in two lines and that tool's tile is lit; a tool's number picks it; the
// round done with one miss is two stars.
import { expect, test } from "@playwright/test";
import { plainOf, whichNow } from "../src/math/whichTool.ts";
import { boardWith } from "./helpers.ts";

test("which tool: a wrong pick shows the problem solved by its tool, a number key picks, one miss is two stars", async ({ page }) => {
  const game = await boardWith(page, "Which tool? Quadratics", ".live-whichQuad");
  const t = whichNow({ group: "quad", mode: "puzzle", stage: 0, level: 1, seed: 1 });
  expect(t.tools).toEqual(["factor", "roots"]);
  const names = { factor: "Factor", roots: "Take square roots" } as Record<string, string>;
  const tile = (tool: string) => game.getByRole("button", { name: `${t.tools.indexOf(tool as never) + 1}: ${names[tool]}`, exact: true });
  // Excalidraw's toolbar can cover the top of the piece: the tiles are pressed by focus and Enter.
  const press = async (tool: string) => {
    await tile(tool).focus();
    await tile(tool).press("Enter");
  };
  await expect(game.getByText("Which tool? Don't solve it: pick the method that fits.")).toBeVisible();
  await expect(game.getByRole("img", { name: `The problem: ${plainOf(t.items[0].show)}` })).toBeVisible();
  // The first problem, the wrong tool.
  const first = t.items[0].tool;
  const other = first === "factor" ? "roots" : "factor";
  await press(other);
  await expect(game.getByText(new RegExp(`^${names[other]} is for .* This one is ${names[first]}, worked out below: tap it to go on\\.`))).toBeVisible();
  await expect(game.getByText(`With ${names[first]}:`)).toBeVisible();
  await press(first);
  await expect(game.getByText(`✓ ${names[first]}`)).toBeVisible();
  await expect(game.getByText("Picked: 1 of 5")).toBeVisible();
  // The second by its number, the rest by Enter.
  await tile("factor").focus();
  await page.keyboard.press(String(t.tools.indexOf(t.items[1].tool) + 1));
  await expect(game.getByText("Picked: 2 of 5")).toBeVisible();
  for (const p of t.items.slice(2)) await press(p.tool);
  await expect(game.getByText(/^All 5 picked! ★★☆/)).toBeVisible();
});
