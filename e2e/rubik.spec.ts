// The Rubik's cube by hand: the pills along the bottom of the picture turn the way, take a turn back and scramble; the
// ball's letters turn a face from the keyboard; and in "Your cube" a colour dragged onto a sticker of the net paints it.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers.ts";

// The picture is tall: room for all of it, pills too.
test.use({ viewport: { width: 1280, height: 1300 } });

test("rubik: turns, undo and painting by hand", async ({ page }) => {
  const piece = await boardWith(page, "Rubik's cube", ".live-rubik");
  const pic = piece.locator(".hand-pic");
  await pic.getByRole("button", { name: "Turn the right face clockwise" }).first().press("Enter");
  await expect(piece.getByText(/Your turns \(1\): R$/)).toBeVisible();
  await pic.getByRole("button", { name: /^Anticlockwise turns/ }).click();
  await pic.getByRole("button", { name: "Turn the top face anticlockwise" }).first().press("Enter");
  await expect(piece.getByText(/Your turns \(2\): R U′/)).toBeVisible();
  await pic.getByRole("button", { name: "Take back the last turn" }).click();
  await expect(piece.getByText(/^Your turns \(1\): R$/)).toBeVisible();

  // Paint: a yellow dragged onto the net's first sticker (the up face's corner).
  await pic.getByRole("button", { name: /^Paint in the colours/ }).click();
  const yellow = (await pic.getByRole("button", { name: "yellow", exact: true }).boundingBox())!;
  const net0 = (await pic.locator("[data-net='0']").boundingBox())!;
  await page.mouse.move(yellow.x + yellow.width / 2, yellow.y + yellow.height / 2);
  await page.mouse.down();
  await page.mouse.move(net0.x + net0.width / 2, net0.y + net0.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(pic.locator("[data-net='0']")).toHaveAttribute("fill", "#ffd43b");
  await page.screenshot({ path: test.info().outputPath("rubik-paint.png") });
});
