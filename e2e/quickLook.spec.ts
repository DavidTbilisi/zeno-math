// Quick look by hand: the card tapped to look, tapped again (once hidden) to look again, and the number tile tapped.
import { expect, test } from "@playwright/test";
import { LOOK_LADDER, lookRound } from "../src/math/quickLook.ts";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("quick look by hand: the card tapped to look and look again, a tile to answer", async ({ page }) => {
  const game = await boardWith(page, "Quick look: how many dots?", ".live-quickLook");
  const pic = game.locator("svg").first();
  const [t] = lookRound(LOOK_LADDER[0].level, LOOK_LADDER[0].seed);
  const tile = pic.getByRole("button", { name: String(t.n), exact: true });
  await expect(tile).toHaveAttribute("aria-disabled", "true");
  await pic.getByRole("button", { name: "Look!" }).click();
  await expect(tile).not.toHaveAttribute("aria-disabled");
  await pic.getByRole("button", { name: /^Look again/ }).click();
  await expect(tile).toHaveAttribute("aria-disabled", "true");
  await expect(tile).not.toHaveAttribute("aria-disabled");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/quickLook.png` });
  await tile.click();
  // Right, or (answered within a second) the quick notice in its place.
  await expect(game.getByText(new RegExp(`^(Right — ${t.n}!|Quick!)`))).toBeVisible();
});
