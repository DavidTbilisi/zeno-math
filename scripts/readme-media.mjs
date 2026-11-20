// Records the README's GIFs: each scene runs in its own browser context with video on, then ffmpeg crops the
// video to the part that matters and turns it into a GIF in docs/media.
//   npm run build && PORT=8797 DATA_DIR=$(mktemp -d) node server/index.ts &
//   npm run readme-media -- [scene…]   (BASE=http://localhost:8797 by default; scenes: geolab practice solids sort primes)
import { chromium } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { check, exercise, stepsOf, trapInputs } from "../src/math/practice.ts";
import { sortNow, sortRun } from "../src/math/beSort.ts";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:8797";
const OUT = "docs/media";
const VIEW = { width: 1280, height: 800 };
/** Scenes filmed in a window of their own size (the whole window is the picture). */
const VIEWS = { practice: { width: 700, height: 820 }, solids: { width: 1100, height: 1000 } };
let startAt = 0; // when the scene's first useful frame is on screen
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** A new board with one live piece from the Shapes panel, put in use by a click in its corner. */
async function boardWith(page, name, piece) {
  await page.goto(BASE + "/");
  await page.getByRole("button", { name: /New board/ }).first().click();
  await page.waitForURL(/#\/b\/[0-9a-f-]+$/);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: "Shapes" }).click();
  await page.getByRole("button", { name, exact: true }).click();
  const game = page.locator(piece);
  await game.waitFor();
  // Fit the piece to the window and hide the board's own menus, so only the piece is filmed.
  await page.keyboard.press("Shift+1");
  await page.addStyleTag({ content: ".excalidraw .layer-ui__wrapper, .excalidraw .App-bottom-bar, .excalidraw .App-menu { visibility: hidden !important; }" });
  await wait(700);
  const box = await game.boundingBox();
  await page.mouse.click(box.x + 6, box.y + 6);
  startAt = Date.now();
  return game;
}

/** Smooth mouse glide, so the drag shows in the video. */
async function glide(page, from, to, steps = 25) {
  await page.mouse.move(...from);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps);
    await wait(25);
  }
  await page.mouse.up();
}

const SCENES = {
  async geolab(page) {
    const piece = await boardWith(page, "Geometry lab: any shape, measured", ".live-geoLab");
    const plane = piece.locator("svg.glab-plane");
    const box = await plane.boundingBox();
    const k = box.width / 600;
    const pt = (x, y) => [box.x + (300 + (x - 5) * 48) * k, box.y + (270 - (y - 1.5) * 48) * k];
    await wait(1200);
    await glide(page, pt(4, 0), pt(7, 0), 40);
    await wait(900);
    await glide(page, pt(7, 0), pt(5, 0), 30);
    await wait(900);
    await piece.getByRole("button", { name: "Circumcircle" }).click();
    await wait(1500);
    return piece;
  },

  async practice(page) {
    // A fractions question whose wrong answer is the classic "add across", so the mistake gets named.
    const w = en.pracWords;
    let r = 0, ex;
    for (let i = 1; i < 500 && !ex; i++) {
      const e = exercise("fractions", 1, Math.floor((i / 501) * 2 ** 31), w);
      if (trapInputs(e).some((t) => t.id === "addAcross")) [r, ex] = [i / 501, e];
    }
    const typed = trapInputs(ex).find((t) => t.id === "addAcross").input;
    await page.goto(BASE + "/#/practice");
    await page.getByRole("tab", { name: "Number" }).click();
    await page.evaluate((x) => (Math.random = () => x), r);
    await page.getByRole("radio", { name: "easy" }).click();
    await page.getByRole("button", { name: "Fractions", exact: true }).click();
    const card = page.locator(".practice-prompt");
    await card.waitFor();
    // The question at the top of the window, the tally just above it.
    await card.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 90));
    await wait(300);
    startAt = Date.now();
    await wait(1200);
    const box = page.getByLabel("Your answer");
    await box.click();
    await page.keyboard.type(typed, { delay: 160 });
    await wait(400);
    await page.getByRole("button", { name: "Check" }).click();
    await wait(2600);
    const steps = stepsOf(ex, w);
    for (const [i, step] of steps.entries()) {
      const field = page.getByLabel(`Step ${i + 1} of ${steps.length}`);
      await field.click();
      await page.keyboard.type(step.plain, { delay: 140 });
      await wait(300);
      await field.press("Enter");
      await wait(1100);
    }
    await page.getByLabel("Your answer").click();
    await page.keyboard.type(ex.plain, { delay: 140 });
    await page.getByRole("button", { name: "Check" }).click();
    await wait(2500);
    if (!check(ex, ex.plain, w).ok) throw new Error("practice: the answer was not right");
    return { box: { x: 0, y: 0, width: VIEWS.practice.width, height: VIEWS.practice.height }, width: 560 };
  },

  async solids(page) {
    await page.goto(BASE + "/");
    await page.getByRole("button", { name: /New board/ }).first().click();
    await page.locator(".excalidraw").waitFor();
    await page.getByRole("button", { name: /Geometry/ }).first().click();
    await page.getByRole("menuitem", { name: /3D$/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByRole("radio", { name: "Cylinder", exact: true }).click();
    await wait(600);
    startAt = Date.now();
    await wait(800);
    // Turn it a little with the mouse, unfold it into its net and back, then the same for a cone.
    const canvas = dialog.locator("canvas").first();
    const slider = dialog.locator("input[type=range]").first();
    const c = await canvas.boundingBox();
    await glide(page, [c.x + c.width * 0.4, c.y + c.height * 0.5], [c.x + c.width * 0.6, c.y + c.height * 0.5], 20);
    const [lo, hi] = await slider.evaluate((el) => [Number(el.min), Number(el.max)]);
    const sweep = async (from, to) => {
      for (let i = 0; i <= 20; i++) { await slider.fill(String(from + ((to - from) * i) / 20)); await wait(30); }
    };
    await sweep(lo, hi);
    await wait(1200);
    await dialog.getByRole("radio", { name: "Cone", exact: true }).click();
    await wait(700);
    await sweep(lo, hi);
    await wait(1500);
    const r = await slider.boundingBox();
    const box = { x: c.x, y: r.y - 34, width: c.width, height: c.y + c.height - (r.y - 34) };
    return { box, width: 480, fps: 10 };
  },

  async sort(page) {
    const run = sortRun(sortNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 }));
    const game = await boardWith(page, "Be the sort: you are the algorithm", ".live-beSort");
    await wait(1000);
    for (const m of run.moves) {
      await game.getByRole("button", { name: `Gap ${m + 1}`, exact: true }).dispatchEvent("click");
      await wait(650);
    }
    await wait(2500);
    return game;
  },

  async primes(page) {
    const game = await boardWith(page, "Prime slice: cut the numbers that aren't prime", ".live-primeSlice");
    await wait(600);
    await game.getByRole("button", { name: /Start/ }).click();
    await page.waitForFunction(() => {
      const g = document.querySelector(".live-primeSlice");
      if (/Wave over/.test(g.textContent ?? "")) return true;
      const svg = g.querySelector("svg");
      const box = svg.getBoundingClientRect();
      const prime = (n) => n > 1 && Array.from({ length: Math.max(0, Math.floor(Math.sqrt(n)) - 1) }, (_, i) => i + 2).every((d) => n % d !== 0);
      for (const e of g.querySelectorAll("g[data-live]")) {
        const r = e.querySelector("circle").getBoundingClientRect();
        const [x, y] = [r.x + r.width / 2, r.y + r.height / 2];
        // Cut a number near the top of its flight, as a player would.
        if (prime(Number(e.dataset.n)) || y > box.top + box.height * 0.45) continue;
        const o = { bubbles: true, clientX: x, clientY: y, pointerId: 1, button: 0 };
        svg.dispatchEvent(new PointerEvent("pointerdown", o));
        svg.dispatchEvent(new PointerEvent("pointerup", o));
      }
      return false;
    }, null, { polling: 60, timeout: 40_000 });
    await wait(2500);
    return { target: game, fps: 10, width: 440 };
  },
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const pick = process.argv.slice(2);
for (const [name, scene] of Object.entries(SCENES)) {
  if (pick.length && !pick.includes(name)) continue;
  const dir = mkdtempSync(join(tmpdir(), "zeno-media-"));
  const view = VIEWS[name] ?? VIEW;
  const context = await browser.newContext({ viewport: view, recordVideo: { dir, size: view }, colorScheme: "light" });
  const page = await context.newPage();
  const t0 = Date.now();
  startAt = t0;
  const got = await scene(page);
  const { target, box, fps = 12, width: maxWidth = 640 } = got.target || got.box ? got : { target: got };
  const b = box ?? (await target.boundingBox());
  const video = await page.video().path();
  await context.close();
  // Crop to the piece (with a margin), skip the set-up before it appeared, 12 fps, palette per GIF.
  const pad = 12;
  const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad);
  const crop = [Math.min(view.width - x, b.width + 2 * pad), Math.min(view.height - y, b.height + 2 * pad), x, y].map((v) => Math.round(v));
  const skip = String(Math.max(0, (startAt - t0) / 1000 - 0.3));
  const width = Math.min(maxWidth, crop[0]);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", skip, "-i", video, "-vf",
    `crop=${crop.join(":")},fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
    join(OUT, `${name}.gif`)]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`${name}: ${((Date.now() - t0) / 1000).toFixed(1)} s → ${OUT}/${name}.gif`);
}
await browser.close();
