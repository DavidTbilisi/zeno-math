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

// ---------- classes (#606) ----------

const TEACHER = "e2e-teacher";
const pw = en.pracWords.ui;

test("a class is joined with an account: another browser finds the record, and the teacher sees the name", async ({ browser, request }) => {
  const stamp = Date.now();
  const email = `gio${stamp}@school.example`;
  const { code } = await (await request.post("/api/classes", { data: { name: `Accounts ${stamp}`, skills: ["times"] }, headers: { "X-Teacher-Password": TEACHER } })).json();

  // The join link, on a phone: nobody is signed in, so the panel asks for an account first.
  const phone = await fresh(browser, { width: 390, height: 780 });
  await phone.goto(`/#/join/${code}`);
  const panel = phone.locator(".practice-join");
  await expect(panel.getByText(pw.needAccount)).toBeVisible();
  await expect(panel.getByLabel(pw.classCode)).toHaveCount(0);
  await panel.getByRole("button", { name: w.create }).first().click();
  await panel.getByLabel(w.name).fill("Gio Abashidze");
  await panel.getByLabel(w.email).fill(email);
  await panel.getByLabel(w.password, { exact: true }).fill(PASSWORD);
  await panel.getByRole("button", { name: w.create }).last().click();
  // Signed in: the class code from the link is there, and joining waits for the student to agree.
  await expect(panel.getByLabel(pw.classCode)).toHaveValue(code);
  await expect(panel.getByRole("button", { name: pw.join, exact: true })).toBeDisabled();
  await panel.getByLabel(pw.consentAgree).check();
  await panel.getByRole("button", { name: pw.join, exact: true }).click();
  const joined = phone.locator(".practice-class strong.mono");
  await expect(joined).toHaveText(/^Student [2-9A-Z]{4}-[2-9A-Z]{4}$/);
  const student = (await joined.textContent())!;
  await expect(phone.getByText(pw.withAccount.replace("{name}", "Gio Abashidze"))).toBeVisible();
  expect(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // At home on a laptop: signing in is enough, the practice page is already the same student's.
  const laptop = await fresh(browser);
  await laptop.goto("/#/account");
  await laptop.getByLabel(w.email).fill(email);
  await laptop.getByLabel(w.password, { exact: true }).fill(PASSWORD);
  await laptop.getByRole("button", { name: w.signIn }).last().click();
  await expect(laptop.locator(".site-account")).toHaveText("Gio Abashidze");
  await laptop.goto("/#/practice");
  await expect(laptop.locator(".practice-class strong.mono")).toHaveText(student);

  // Signing out takes the record off the phone; the next person there starts with nobody's.
  await phone.getByRole("button", { name: pw.signOut }).click();
  await expect(phone.locator(".practice-join")).toBeVisible();
  expect(await phone.evaluate(() => localStorage.getItem("zeno.student.v1"))).toBeNull();
  await expect(laptop.locator(".practice-class strong.mono")).toHaveText(student);

  // The teacher's dashboard names the student (the page itself: e2e/study.spec.ts).
  const dash = await (await request.get(`/api/research/dashboard?class=${code}`, { headers: { "X-Teacher-Password": TEACHER } })).json();
  expect(dash.students.map((s: { name: string | null }) => s.name)).toEqual(["Gio Abashidze"]);
});

test("a student from before accounts keeps their code, and adds it when they make an account", async ({ browser, request }) => {
  const stamp = Date.now();
  const { code } = await (await request.post("/api/classes", { data: { name: `Codes ${stamp}`, skills: ["times"] }, headers: { "X-Teacher-Password": TEACHER } })).json();
  const old = await (await request.post("/api/students", { data: { class: code, number: 5 } })).json();

  // Their browser still holds the code, and practice still knows them by it.
  const page = await fresh(browser);
  await page.addInitScript((s) => localStorage.getItem("zeno.student.v1") ?? localStorage.setItem("zeno.student.v1", s), JSON.stringify(old));
  await page.goto("/#/practice");
  await expect(page.locator(".practice-class strong.mono")).toHaveText(`Student ${old.code}`);
  await page.locator(".practice-class").getByRole("link", { name: pw.makeAccount }).click();

  // Making an account there asks whose practice the browser holds, and won't guess.
  await page.getByRole("button", { name: w.create }).first().click();
  await page.getByLabel(w.name).fill("Keti Lomidze");
  await page.getByLabel(w.email).fill(`keti${stamp}@school.example`);
  await page.getByLabel(w.password, { exact: true }).fill(PASSWORD);
  await expect(page.getByText(w.hereStudent.replace("{code}", old.code))).toBeVisible();
  await page.getByRole("button", { name: w.create }).last().click();
  await expect(page.getByText(w.hereChoose)).toBeVisible();
  await page.getByLabel(w.hereMine).check();
  await page.getByRole("button", { name: w.create }).last().click();
  await expect(page.getByRole("heading", { name: w.signedInAs.replace("{name}", "Keti Lomidze") })).toBeVisible();
  await page.goto("/#/practice");
  await expect(page.locator(".practice-class strong.mono")).toHaveText(`Student ${old.code}`);
  const dash = await (await request.get(`/api/research/dashboard?class=${code}`, { headers: { "X-Teacher-Password": TEACHER } })).json();
  expect(dash.students).toHaveLength(1);
  expect(dash.students[0]).toMatchObject({ code: old.code, number: 5, name: "Keti Lomidze" });

  // On a shared tablet the next child says the practice there is someone else's, and gets none of it.
  await page.getByRole("button", { name: pw.signOut }).click();
  const shared = await fresh(browser);
  const other = await (await request.post("/api/students", { data: { class: code, number: 6 } })).json();
  await shared.addInitScript((s) => localStorage.getItem("zeno.student.v1") ?? localStorage.setItem("zeno.student.v1", s), JSON.stringify(other));
  await shared.goto("/#/account");
  await shared.getByRole("button", { name: w.create }).first().click();
  await shared.getByLabel(w.name).fill("Luka Other");
  await shared.getByLabel(w.email).fill(`luka${stamp}@school.example`);
  await shared.getByLabel(w.password, { exact: true }).fill(PASSWORD);
  await shared.getByLabel(w.hereOther).check();
  await shared.getByRole("button", { name: w.create }).last().click();
  await expect(shared.getByRole("heading", { name: w.signedInAs.replace("{name}", "Luka Other") })).toBeVisible();
  expect(await shared.evaluate(() => localStorage.getItem("zeno.student.v1"))).toBeNull();
  const after = await (await request.get(`/api/research/dashboard?class=${code}`, { headers: { "X-Teacher-Password": TEACHER } })).json();
  expect(after.students.find((s: { code: string }) => s.code === other.code).name).toBeNull();
});
