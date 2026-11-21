// The clock with hands, worked by hand: drag the minute hand, tap a number, keys on the hour hand, cover and uncover
// the time, single minutes, and the die.
import { expect, test } from "@playwright/test";
import { boardWith } from "./helpers";

const SHOTS = process.env.SHOTS_DIR;

test("clock with hands by hand", async ({ page }) => {
  const piece = await boardWith(page, "Clock with hands", ".live-clock");
  const pic = piece.locator("svg").first();
  const minute = pic.getByRole("slider", { name: "Minute hand" });
  const hour = pic.getByRole("slider", { name: "Hour hand" });

  // 10:10 to start. A tap on 6 takes the minute hand the short way: 10:30.
  await expect(minute).toHaveAttribute("aria-valuetext", "10:10");
  await pic.getByRole("button", { name: "Minute hand to 6" }).click();
  await expect(minute).toHaveAttribute("aria-valuetext", "10:30");
  // Drag the minute hand from 6 round to 9: 10:45.
  const face = (await pic.boundingBox())!;
  const scale = face.width / 300;
  const at = (x: number, y: number) => [face.x + x * scale, face.y + y * scale] as const;
  await page.mouse.move(...at(150, 186 + 90));
  await page.mouse.down();
  await page.mouse.move(...at(150 - 60, 186 + 60), { steps: 5 });
  await page.mouse.move(...at(150 - 100, 186), { steps: 5 });
  await page.mouse.up();
  await expect(minute).toHaveAttribute("aria-valuetext", "10:45");
  // The hour hand by keys: an hour on.
  await hour.press("ArrowUp");
  await expect(minute).toHaveAttribute("aria-valuetext", "11:45");

  // Cover the time: the box shows ?:??, and tapping it again shows the time.
  await pic.getByRole("button", { name: /^The time, 11:45/ }).click();
  await expect(pic.getByRole("button", { name: /covered/ })).toContainText("?:??");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/clock.png` });
  await pic.getByRole("button", { name: /covered/ }).click();
  await expect(pic.getByRole("button", { name: /^The time/ })).toContainText("11:45");

  // Single minutes: the minute hand goes on by one.
  await pic.getByRole("button", { name: /single minutes/ }).click();
  await minute.press("ArrowRight");
  await expect(minute).toHaveAttribute("aria-valuetext", "11:46");
  // The die sets some other time.
  await pic.getByRole("button", { name: "Random time" }).click();
  await expect(minute).toHaveAttribute("aria-valuetext", /^\d{1,2}:\d\d$/);
});
