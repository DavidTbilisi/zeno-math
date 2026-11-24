// Accounts (#605): making one on the account page, the name in the site's bar, signing out, and signing in on another
// browser; what a wrong password and a taken email say; and the page at phone width.
import { expect, test, type Browser } from "@playwright/test";
import { en } from "../src/locales/en.ts";

const w = en.site.account;
const PASSWORD = "e2e long enough";
// A browser of its own (no cookie from another test), and not a teacher's.
const fresh = async (browser: Browser, viewport = { width: 1280, height: 860 }) => (await browser.newContext({ extraHTTPHeaders: {}, viewport })).newPage();

test("an account is made, shown in the bar, signed out of, and signed in to on another browser", async ({ browser }) => {
  const email = `nino${Date.now()}@school.example`;
  const laptop = await fresh(browser);
  await laptop.goto("/#/");
  await laptop.getByRole("link", { name: w.link, exact: true }).click();
  await expect(laptop.getByRole("heading", { name: w.title })).toBeVisible();

  // Nothing is sent until every field is right, and each says what is wrong with it.
  await laptop.getByRole("button", { name: w.create }).first().click();
  await laptop.getByRole("button", { name: w.create }).last().click();
  await expect(laptop.getByText(w.badName)).toBeVisible();
  await expect(laptop.getByText(w.badEmail)).toBeVisible();
  await laptop.getByLabel(w.name).fill("Nino Kapanadze");
  await laptop.getByLabel(w.email).fill(email);
  await laptop.getByLabel(w.password, { exact: true }).fill("short");
  await laptop.getByLabel(w.password, { exact: true }).press("Enter");
  await expect(laptop.getByText(w.shortPassword.replace("{n}", "8"))).toBeVisible();
  await laptop.getByLabel(w.password, { exact: true }).fill(PASSWORD);
  await laptop.getByLabel(w.password, { exact: true }).press("Enter");

  await expect(laptop.getByRole("heading", { name: w.signedInAs.replace("{name}", "Nino Kapanadze") })).toBeVisible();
  await expect(laptop.getByText(email)).toBeVisible();
  // Every page's bar now ends with the name, and a reload keeps it.
  await laptop.goto("/#/progress");
  await expect(laptop.locator(".site-account")).toHaveText("Nino Kapanadze");
  await laptop.reload();
  await expect(laptop.locator(".site-account")).toHaveText("Nino Kapanadze");

  // A second account can't take the same address.
  const other = await fresh(browser);
  await other.goto("/#/account");
  await other.getByRole("button", { name: w.create }).first().click();
  await other.getByLabel(w.name).fill("Someone Else");
  await other.getByLabel(w.email).fill(email.toUpperCase());
  await other.getByLabel(w.password, { exact: true }).fill(PASSWORD);
  await other.getByRole("button", { name: w.create }).last().click();
  await expect(other.getByRole("alert")).toHaveText(w.emailTaken);

  // The phone signs in: a wrong password first, then the right one.
  const phone = await fresh(browser, { width: 390, height: 780 });
  await phone.goto("/#/account");
  await phone.getByLabel(w.email).fill(email);
  await phone.getByLabel(w.password, { exact: true }).fill("not the password");
  await phone.getByRole("button", { name: w.signIn }).last().click();
  await expect(phone.getByRole("alert")).toHaveText(w.wrongLogin);
  await phone.getByLabel(w.password, { exact: true }).fill(PASSWORD);
  await phone.getByRole("button", { name: w.signIn }).last().click();
  await expect(phone.getByRole("heading", { name: w.signedInAs.replace("{name}", "Nino Kapanadze") })).toBeVisible();
  // Nothing runs off the side of a phone.
  if (process.env.ACCOUNT_SHOT) await phone.screenshot({ path: process.env.ACCOUNT_SHOT, fullPage: true });
  expect(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // A new name on the phone is the laptop's too.
  await phone.getByLabel(w.name).fill("Nino K.");
  await phone.getByRole("button", { name: w.save }).first().click();
  await expect(phone.getByText(w.saved, { exact: true })).toBeVisible();
  await laptop.reload();
  await expect(laptop.locator(".site-account")).toHaveText("Nino K.");

  // Signing out on the laptop leaves the phone signed in.
  await laptop.goto("/#/account");
  await laptop.getByRole("button", { name: w.signOut }).click();
  await expect(laptop.getByRole("button", { name: w.forgot })).toBeVisible();
  await expect(laptop.locator(".site-account")).toHaveText(w.link);
  await phone.reload();
  await expect(phone.getByRole("heading", { name: w.signedInAs.replace("{name}", "Nino K.") })).toBeVisible();

  // This server sends no mail: a forgotten password says who to ask.
  await laptop.getByRole("button", { name: w.forgot }).click();
  await expect(laptop.getByText(w.noMail)).toBeVisible();

  // Deleting the account needs the password, and then the address signs nobody in.
  await phone.getByText(w.delete).click();
  await phone.getByLabel(w.password, { exact: true }).fill(PASSWORD);
  await phone.getByRole("button", { name: w.deleteGo }).click();
  await expect(phone.getByRole("button", { name: w.forgot })).toBeVisible();
  await phone.getByLabel(w.email).fill(email);
  await phone.getByLabel(w.password, { exact: true }).fill(PASSWORD);
  await phone.getByRole("button", { name: w.signIn }).last().click();
  await expect(phone.getByRole("alert")).toHaveText(w.wrongLogin);
});

test("a spent link says so", async ({ browser }) => {
  const page = await fresh(browser);
  await page.goto("/#/account/verify/made-up-token");
  await expect(page.getByRole("alert")).toHaveText(w.linkDead);
  await page.goto("/#/account/reset/made-up-token");
  await expect(page.getByRole("heading", { name: w.resetTitle })).toBeVisible();
  await page.getByLabel(w.newPassword).fill(PASSWORD);
  await page.getByRole("button", { name: w.save }).click();
  await expect(page.getByRole("alert")).toHaveText(w.linkDead);
});
