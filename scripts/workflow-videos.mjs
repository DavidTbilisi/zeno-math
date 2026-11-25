// Records the teacher workflow demos: short MP4s with a caption for each step and a visible cursor, showing how a
// teacher makes a class, how students join, how a lesson runs, how homework is given and how progress is read. Scenes
// with a student in them are filmed side by side: the teacher's laptop on the left, the student's phone on the right.
//   npm run build && PORT=8797 DATA_DIR=$(mktemp -d) TEACHER_PASSWORD=demo ADMIN_EMAILS=teacher@demo.test APP_PASSWORD= node server/index.ts &
//   npm run workflow-videos -- [scene…]   (BASE=http://localhost:8797, TEACHER=demo by default)
// The scenes' setting up goes by the API with the teacher password; the teacher's windows are signed in to the account
// teacher@demo.test, an admin's by ADMIN_EMAILS (#687).
// Scenes: class join lesson homework progress paper. Output: docs/media/workflows/<scene>.mp4 and a <scene>.png still.
// Use an empty DATA_DIR: the scenes add their classes and students by the API, and names repeated from an older run
// would show in the class list.
import { chromium } from "@playwright/test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:8797";
const TEACHER = process.env.TEACHER ?? "demo";
const OUT = "docs/media/workflows";
const LAPTOP = { width: 1280, height: 800 };
/** The teacher's window beside a phone: together 1600 × 800. */
const LAPTOP_SIDE = { width: 1180, height: 800 };
const PHONE = { width: 420, height: 800 };
const w = en.pracWords;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = { "X-Teacher-Password": TEACHER, "Content-Type": "application/json" };
const ACCOUNT = { email: "teacher@demo.test", name: "Teacher", password: "demo password" };

// ---------------------------------------------------------------------------------------------------------------
// The API, for what a scene needs before it starts: classes, students, and their practice.

async function api(method, path, body, auth = true) {
  const res = await fetch(BASE + path, { method, headers: auth ? headers : { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

/** The class of that name, made if there is none yet. */
async function ensureClass(name, skills, extra = {}) {
  const found = (await api("GET", "/api/classes")).find((c) => c.name === name);
  return found ?? (await api("POST", "/api/classes", { name, skills, ...extra }));
}

let clientIds = 0;
/** One practice question answered by a student: right at once, or a named mistake first (then right, or the solution). */
async function attempt(student, policy, skill, level, seed, kind) {
  const ex = exercise(skill, level, seed, w);
  const trap = trapInputs(ex)[0]?.input ?? "12345";
  const inputs = kind === "right" ? [ex.plain] : kind === "fixed" ? [trap, ex.plain] : [trap];
  const answers = inputs.map((input) => ({ input, verdict: check(ex, input, w).ok ? "correct" : "wrong", ms: 9000 }));
  const solved = answers.at(-1).verdict === "correct";
  await api("POST", "/api/attempts", {
    clientId: `demo-${Date.now().toString(36)}-${clientIds++}`, student: student.code, skill, level, seed, review: false,
    outcome: solved ? "solved" : "revealed", policy, solutionViewed: !solved, msTotal: 9000 * answers.length,
    shownAt: Date.now() - 60_000, answers,
  }, false);
}

/**
 * Students who have practised: each number with a share of right answers, so the mastery table has strong and weak
 * students, and `stuck` ones who keep making the same mistake on the first skill (they reach the stuck list).
 */
async function seedStudents(code, skills, numbers, { questions = 14, stuck = [] } = {}) {
  const made = [];
  let seed = 1000;
  for (const [i, number] of numbers.entries()) {
    const s = await api("POST", "/api/students", { class: code, number, again: true }, false);
    const policy = s.condition === "fixed" ? "fixed" : "adaptive";
    const good = 0.35 + 0.6 * ((i * 7) % numbers.length) / numbers.length; // spread from weak to strong
    for (let q = 0; q < questions; q++) {
      const skill = skills[q % skills.length];
      const level = 1 + (q % 3 === 2 ? 1 : 0);
      const isStuck = stuck.includes(number) && skill === skills[0];
      const kind = isStuck ? "wrong" : ((q * 37 + i * 11) % 100) / 100 < good ? "right" : q % 2 ? "fixed" : "wrong";
      await attempt(s, policy, skill, level, seed++, kind);
    }
    if (stuck.includes(number)) for (let q = 0; q < 10; q++) await attempt(s, policy, skills[0], 1, seed++, "wrong");
    made.push(s);
  }
  return made;
}

// ---------------------------------------------------------------------------------------------------------------
// The film: a visible cursor, captions, and moves slow enough to follow.

/** Runs in every page: a cursor, which Playwright's video has none of, and a ring where it clicks. */
function stageScript() {
  const add = () => {
    if (document.getElementById("demo-cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      #demo-cursor { position: fixed; left: 0; top: 0; width: 26px; height: 26px; z-index: 2147483647; pointer-events: none;
        transform: translate(-100px, -100px); transition: transform 0s; }
      #demo-cursor svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,.45)); }
      .demo-ring { position: fixed; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%; z-index: 2147483646;
        pointer-events: none; border: 3px solid #ff7a1a; animation: demo-ring .55s ease-out forwards; }
      @keyframes demo-ring { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
    `;
    document.head.append(style);
    const cursor = document.createElement("div");
    cursor.id = "demo-cursor";
    cursor.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M3 2 L3 21 L8.5 16 L12.5 24.5 L16 23 L12 14.8 L19.5 14.8 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.append(cursor);
    addEventListener("mousemove", (e) => (cursor.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 2}px)`), true);
    addEventListener("mousedown", (e) => {
      const ring = document.createElement("div");
      ring.className = "demo-ring";
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      document.body.append(ring);
      setTimeout(() => ring.remove(), 600);
    }, true);
  };
  if (document.body) add();
  else document.addEventListener("DOMContentLoaded", add);
}

/** A font file for the captions (drawtext takes a file, not a family). */
const font = (pattern) => execFileSync("fc-match", ["-f", "%{file}", pattern]).toString().trim();
const STRIP = 92; // the caption strip under the picture

class Film {
  constructor(browser) {
    this.browser = browser;
    this.takes = [];
    this.captions = []; // { role, text, from, to } in ms since the epoch
    this.dir = mkdtempSync(join(tmpdir(), "zeno-workflow-"));
  }
  /** A window of its own (a person's own browser), filmed from now. */
  async window(role, view, init) {
    const context = await this.browser.newContext({ viewport: view, recordVideo: { dir: this.dir, size: view }, colorScheme: "light", locale: "en-GB" });
    await context.addInitScript(stageScript);
    if (init === signedIn) {
      // The teacher's account: made the first time, then signed in to; the cookie stays with the window.
      const made = await context.request.post(BASE + "/api/account", { data: ACCOUNT });
      if (made.status() === 409) await context.request.post(BASE + "/api/account/session", { data: ACCOUNT });
    } else if (init) await context.addInitScript(init.fn, init.arg);
    const t0 = Date.now();
    const page = await context.newPage();
    page.demo = { x: view.width / 2, y: view.height / 2, role, film: this };
    this.takes.push({ context, page, t0, view });
    return page;
  }
  /** The film starts here (what came before was setting up). */
  roll() {
    this.start = Date.now();
  }
  caption(role, text) {
    const now = Date.now(), last = this.captions.at(-1);
    if (last && last.to === null) last.to = now;
    if (text) this.captions.push({ role, text, from: now, to: null });
  }
  async cut(name) {
    const end = Date.now();
    this.caption(null, "");
    const paths = [];
    for (const t of this.takes) {
      const video = t.page.video();
      await t.context.close();
      paths.push(await video.path());
    }
    const length = ((end - this.start) / 1000).toFixed(2);
    const inputs = this.takes.flatMap((t, i) => ["-ss", String(Math.max(0, (this.start - t.t0) / 1000)), "-t", length, "-i", paths[i]]);
    const height = Math.max(...this.takes.map((t) => t.view.height));
    const width = this.takes.reduce((n, t) => n + t.view.width, 0);
    const picture = this.takes.length === 1
      ? "[0:v]fps=30[p]"
      : this.takes.map((t, i) => `[${i}:v]fps=30,scale=-2:${height},tpad=stop_mode=clone:stop_duration=5[v${i}]`).join(";") +
        `;${this.takes.map((_, i) => `[v${i}]`).join("")}hstack=inputs=${this.takes.length}:shortest=1[p]`;
    // The captions in a strip under the picture, so they never hide what is being clicked: who acts, then what.
    const bold = font("sans:bold"), regular = font("sans:semibold");
    const size = 24, perLine = Math.floor((width - 200) / (size * 0.53));
    const texts = this.captions.map((c, i) => {
      const file = join(this.dir, `caption-${i}.txt`);
      writeFileSync(file, wrap(c.text, perLine).join("\n"));
      const on = `between(t,${((c.from - this.start) / 1000).toFixed(2)},${((c.to - this.start) / 1000).toFixed(2)})`;
      const two = c.text.length > perLine;
      return `drawtext=fontfile=${bold}:text=${c.role.toUpperCase()}:fontsize=18:fontcolor=0xffb36b:x=28:y=${height}+(${STRIP}-th)/2:enable='${on}',` +
        `drawtext=fontfile=${regular}:textfile=${file}:expansion=none:fontsize=${size}:line_spacing=6:fontcolor=white:x=170:y=${height}+(${STRIP}-${two ? 2 * size + 6 : size})/2-2:enable='${on}'`;
    });
    const filter = `${picture};[p]pad=iw:ih+${STRIP}:0:0:color=0x141821${texts.map((t) => "," + t).join("")},format=yuv420p[v]`;
    const mp4 = join(OUT, `${name}.mp4`);
    execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filter, "-map", "[v]", "-t", length, ...encoder(), "-movflags", "+faststart", mp4]);
    // A still for the docs page, two thirds in, where the scene has something on screen.
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(Number(length) * 0.66), "-i", mp4, "-frames:v", "1", "-vf", "scale=800:-2", join(OUT, `${name}.png`)]);
    rmSync(this.dir, { recursive: true, force: true });
    return { mp4, seconds: Number(length) };
  }
}

/** Words into lines of at most `n` characters. */
function wrap(text, n) {
  const lines = [""];
  for (const word of text.split(" ")) {
    if (lines.at(-1) && lines.at(-1).length + 1 + word.length > n) lines.push(word);
    else lines[lines.length - 1] = lines.at(-1) ? `${lines.at(-1)} ${word}` : word;
  }
  return lines;
}

/** H.264 so every browser and phone plays it: x264 where ffmpeg has it, else OpenH264 (Fedora's ffmpeg-free). */
let picked;
function encoder() {
  if (!picked) {
    const list = execFileSync("ffmpeg", ["-hide_banner", "-encoders"]).toString();
    picked = /libx264/.test(list) ? ["-c:v", "libx264", "-preset", "slow", "-crf", "24"] : ["-c:v", "libopenh264", "-b:v", "1800k", "-profile:v", "high"];
  }
  return picked;
}

/** The caption under the picture, held long enough to read; "" takes it away. */
async function say(page, text, hold = text ? 600 + text.length * 38 : 0) {
  page.demo.film.caption(page.demo.role, text);
  await wait(hold);
}

/** The cursor glides to the element and clicks it. */
async function click(page, target, { hold = 450 } = {}) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error("click: not on screen");
  await glideTo(page, box.x + box.width / 2, box.y + box.height / 2);
  await wait(120);
  await page.mouse.click(page.demo.x, page.demo.y);
  await wait(hold);
}

async function glideTo(page, x, y, steps = 18) {
  const { x: x0, y: y0 } = page.demo;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
    await wait(16);
  }
  Object.assign(page.demo, { x, y });
}

/** Clicks into a field, clears it and types, a key at a time. */
async function type(page, field, text, delay = 85) {
  await click(page, field, { hold: 150 });
  await page.keyboard.press("Control+a");
  await page.keyboard.type(String(text), { delay });
  await wait(300);
}

/** Points at something without clicking it. */
async function point(page, target, hold = 900) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  await glideTo(page, box.x + Math.min(box.width / 2, 60), box.y + box.height / 2);
  await wait(hold);
}

const mastery = (page) => page.locator("section.card", { has: page.getByRole("heading", { name: "Mastery by skill" }) });
/** A window signed in to the teacher's account (Film.window). */
const signedIn = { account: true };
const asStudent = (s) => ({ fn: (j) => localStorage.setItem("zeno.student.v1", j), arg: JSON.stringify(s) });

async function openClass(page, name) {
  await page.goto(BASE + "/#/teacher");
  await click(page, page.locator(".class-item", { hasText: name }));
  await page.locator(".class-head h2", { hasText: name }).waitFor();
}

/**
 * Answers the class-practice question on screen right. Math.random is fixed at `r` before the question is chosen, so
 * its seed is r × 2³¹; its skill and level are read from "Chosen for you: …".
 */
async function answerRight(page, r) {
  const chosen = (await page.getByText(/Chosen for you:/).textContent()).replace(/.*Chosen for you:\s*/, "");
  const skill = Object.entries(w.skills).find(([, name]) => chosen.startsWith(name + ","))?.[0];
  const level = Object.entries(w.levels).find(([, name]) => chosen.endsWith(name))?.[0];
  if (!skill || !level) throw new Error(`answerRight: can't read "${chosen}"`);
  const ex = exercise(skill, Number(level), Math.floor(r * 2 ** 31), w);
  await type(page, page.getByLabel("Your answer"), ex.plain, 120);
  await click(page, page.getByRole("button", { name: "Check" }), { hold: 300 });
  await page.locator(".practice-verdict.ok").waitFor({ timeout: 4000 });
}

// ---------------------------------------------------------------------------------------------------------------

const SCENES = {
  /** Signing in and making a class: its name, what it practises, its code, join link and QR code. */
  async class(film) {
    const page = await film.window("Teacher", LAPTOP, signedIn);
    await page.goto(BASE + "/#/teacher");
    const form = page.locator(".new-class");
    await form.waitFor();
    film.roll();
    await say(page, "Signed in with your teacher's account, open the teacher page.", 1500);
    await say(page, "Name the new class.", 900);
    await type(page, form.getByLabel("Name"), "Class 7B");
    await say(page, "Choose what it practises: whole topics, or every skill of a grade.", 600);
    await click(page, form.getByRole("button", { name: "Grade 7", exact: true }), { hold: 1100 });
    await say(page, "The class tests one feature. Leave the default unless you run a study.", 1600);
    await say(page, "Create the class.", 300);
    await click(page, page.getByRole("button", { name: "Create class" }));
    await page.locator(".class-head h2", { hasText: "Class 7B" }).waitFor();
    await wait(600);
    await say(page, "The class has its own code. Students join with it…", 300);
    await point(page, page.locator(".class-code strong"), 1600);
    await say(page, "…or with the join link, which fills the code in for them.", 300);
    await point(page, page.getByRole("textbox", { name: "Join link" }), 1700);
    await say(page, "In the room, show the QR code: students scan it with their phones.", 200);
    await click(page, page.getByRole("button", { name: "Show to the class" }), { hold: 3200 });
    await click(page, page.getByRole("button", { name: "Done" }), { hold: 1000 });
  },

  /** A student joins by the link on a phone; the teacher sees them arrive. */
  async join(film) {
    const klass = await ensureClass("Class 7B", ["fractions"]);
    const r = 0.4242;
    const teacher = await film.window("Teacher", LAPTOP_SIDE, signedIn);
    const student = await film.window("Student", PHONE, { fn: (x) => (Math.random = () => x), arg: r });
    await openClass(teacher, "Class 7B");
    await student.goto(BASE + "/#/about");
    await wait(500);
    film.roll();
    await say(teacher, "The class is ready. A student opens the join link, or scans the QR code.", 2600);
    await say(teacher, "");
    await student.goto(BASE + `/#/join/${klass.code}`);
    const panel = student.locator(".practice-join");
    await panel.getByRole("button", { name: "Create an account" }).first().waitFor();
    await say(student, "Joining takes an account: a name, an email and a password.", 1500);
    await click(student, panel.getByRole("button", { name: "Create an account" }).first());
    await type(student, panel.getByLabel("Name"), "Nino Kapanadze", 70);
    await type(student, panel.getByLabel("Email"), `nino${Date.now() % 100000}@school.example`, 45);
    await type(student, panel.getByLabel("Password", { exact: true }), "nine green apples", 60);
    await click(student, panel.getByRole("button", { name: "Create an account" }).last(), { hold: 900 });
    await panel.getByLabel("Class code").waitFor();
    await say(student, "The class code is already filled in.", 1500);
    await say(student, "Read what is kept, and agree.", 900);
    await click(student, student.getByLabel("I understand and want to take part"));
    await click(student, panel.getByRole("button", { name: "Join" }), { hold: 1200 });
    await say(student, "Joined. Signing in on any device now brings this record back.", 2200);
    await say(student, "The first question is chosen for them.", 900);
    await answerRight(student, r);
    await say(student, "Right first time. They say how it felt, and go on.", 600);
    await click(student, student.getByRole("button", { name: /About right/ }), { hold: 500 });
    await click(student, student.getByRole("button", { name: /^Next/ }), { hold: 1200 });
    await say(student, "");
    await say(teacher, "Refresh, and the class has one student.", 300);
    await click(teacher, teacher.getByRole("button", { name: "Refresh" }), { hold: 1200 });
    await point(teacher, teacher.locator(".class-head-name .small"), 1800);
    await click(teacher, teacher.getByRole("tab", { name: "Progress" }), { hold: 700 });
    await say(teacher, "Their answer is already in the mastery table, under their name.", 300);
    await point(teacher, mastery(teacher), 2800);
  },

  /** A lesson: the pre-test reaches the student; then a timed session and the stuck list. */
  async lesson(film) {
    const skills = ["fractions", "percent"];
    const klass = await ensureClass("8A Fractions and percent", skills, { testLength: 4 });
    await seedStudents(klass.code, skills, [1, 2, 3, 4, 5, 6, 7, 8], { stuck: [3, 6] });
    const [me] = await seedStudents(klass.code, skills, [9], { questions: 4 });
    const teacher = await film.window("Teacher", LAPTOP_SIDE, signedIn);
    const student = await film.window("Student", PHONE, asStudent(me));
    await openClass(teacher, "8A Fractions and percent");
    await student.goto(BASE + "/#/practice");
    await student.locator(".practice-class").waitFor();
    film.roll();
    await say(teacher, "On the Today tab, the class moves through the lesson's steps.", 1800);
    await point(teacher, teacher.locator(".phase-steps"), 1200);
    await say(teacher, "Start the pre-test: practice waits, and every student gets the test.", 300);
    await click(teacher, teacher.getByRole("button", { name: "Pre-test" }), { hold: 1200 });
    await say(teacher, "");
    await student.reload();
    await student.getByText("No marks during the test", { exact: false }).waitFor();
    await say(student, "The test: the same questions for everyone, no marks until the end.", 2800);
    await say(student, "");
    await say(teacher, "Then a timed session: type the minutes and start.", 300);
    await click(teacher, teacher.getByRole("button", { name: "Timed session" }), { hold: 400 });
    await type(teacher, teacher.getByLabel("Minutes"), "20");
    await click(teacher, teacher.getByRole("button", { name: "Start", exact: true }), { hold: 1500 });
    await say(teacher, "Everyone practises for the same 20 minutes; the clock counts down here.", 300);
    await point(teacher, teacher.locator(".phase-card"), 1800);
    await say(teacher, "");
    await student.reload();
    await student.getByText(/Chosen for you:/).waitFor();
    await say(student, "Class practice: each student gets the question that helps them most.", 2600);
    await say(student, "");
    await say(teacher, "Below: who is stuck, grouped by the mistake they keep making.", 300);
    await point(teacher, teacher.locator(".stuck-list"), 2600);
    await say(teacher, "Help them, then mark them seen: they leave the list.", 300);
    const seen = teacher.getByRole("button", { name: /^Mark .* as seen$/ }).first();
    if (await seen.count()) await click(teacher, seen, { hold: 1500 });
    else await wait(1500);
  },

  /** Homework made for each student from their own answers; the student does it; the teacher sees it come in. */
  async homework(film) {
    const skills = ["percent", "decimals"];
    const klass = await ensureClass("7C Pilot group", skills);
    await seedStudents(klass.code, skills, [1, 2, 3, 4, 5, 6], { stuck: [4] });
    const [me] = await seedStudents(klass.code, skills, [7], { questions: 10 });
    const teacher = await film.window("Teacher", LAPTOP_SIDE, signedIn);
    const student = await film.window("Student", PHONE, asStudent(me));
    await openClass(teacher, "7C Pilot group");
    await student.goto(BASE + "/#/practice");
    await student.locator(".practice-class").waitFor();
    await wait(500);
    film.roll();
    await say(teacher, "Open the Homework tab.", 300);
    await click(teacher, teacher.getByRole("tab", { name: "Homework" }), { hold: 900 });
    await say(teacher, "In a class that isn't in the study, homework opens at any time. Take it out first.", 300);
    const out = teacher.getByRole("button", { name: "Take this class out of the study" });
    if (await out.count()) await click(teacher, out, { hold: 1200 });
    await say(teacher, "Each student gets their own questions, made from their own answers.", 1400);
    await type(teacher, teacher.getByLabel("Questions each"), "4");
    await click(teacher, teacher.getByRole("button", { name: /Make homework for every student|Make new homework/ }), { hold: 1200 });
    await say(teacher, "Easier repair questions for the stuck, reviews that are due, then a stretch.", 300);
    await point(teacher, teacher.locator(".homework-table"), 2600);
    await say(teacher, "");
    await student.reload();
    await student.getByText(/Homework: question 1 of 4/).waitFor();
    await say(student, "The student opens practice: the homework is waiting.", 2000);
    const plan = await api("GET", `/api/students/${me.code}/plan`, undefined, false);
    for (const [i, it] of plan.homework.items.slice(0, 2).entries()) {
      const ex = exercise(it.skill, it.level, it.seed, w);
      await say(student, `Question ${i + 1} of 4.`, 400);
      await type(student, student.getByLabel("Your answer"), ex.plain, 120);
      await click(student, student.getByRole("button", { name: "Check" }), { hold: 1100 });
      await click(student, student.getByRole("button", { name: "Next" }), { hold: 900 });
    }
    await say(student, "");
    await say(teacher, "Refresh: the answers come in, a tick for right first time, a cross if not.", 300);
    await click(teacher, teacher.getByRole("button", { name: "Refresh" }), { hold: 900 });
    await point(teacher, teacher.locator(".homework-table tr", { hasText: "№ 7" }), 2400);
    await say(teacher, "No device at home? Print each student's sheet, with the answers on a page of their own.", 300);
    await click(teacher, teacher.getByRole("link", { name: "Print the homework" }), { hold: 2400 });
    await teacher.mouse.wheel(0, 500);
    await wait(1600);
  },

  /** Reading the class's progress: a goal, the topics, the mastery table, a student's board. */
  async progress(film) {
    const skills = ["fractions", "percent", "decimals", "ratio"];
    const klass = await ensureClass("9A Number", skills);
    await seedStudents(klass.code, skills, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { questions: 24, stuck: [5] });
    const page = await film.window("Teacher", LAPTOP, signedIn);
    await openClass(page, "9A Number");
    film.roll();
    await say(page, "The Progress tab: how far each student has got.", 300);
    await click(page, page.getByRole("tab", { name: "Progress" }), { hold: 1200 });
    await say(page, "Give the class a goal: each student's site opens on that roadmap.", 300);
    const goal = page.getByRole("combobox", { name: "Class goal" });
    await click(page, goal, { hold: 300 });
    await goal.selectOption({ index: 1 });
    await page.keyboard.press("Escape");
    await wait(1800);
    await say(page, "Each topic's class average; a topic picked cuts the table to its skills.", 300);
    await point(page, page.locator(".class-topics"), 2200);
    await say(page, "The mastery table: a row per student, a column per skill.", 300);
    await point(page, mastery(page), 2400);
    await say(page, "Show the numbers to see each chance of a right first answer.", 300);
    await click(page, page.getByLabel("Show numbers"), { hold: 2600 });
    await say(page, "Lost the code a student joined with? Find it by their number.", 300);
    await click(page, page.locator(".find-code summary"), { hold: 400 });
    await point(page, page.locator(".find-code table"), 2200);
  },

  /** A test written on paper: print the forms, then type a student's answers in to be marked. */
  async paper(film) {
    const klass = await ensureClass("6A Paper test", ["fractions"], { testLength: 4 });
    const [s] = await seedStudents(klass.code, ["fractions"], [3], { questions: 2 });
    const page = await film.window("Teacher", LAPTOP, signedIn);
    await openClass(page, "6A Paper test");
    film.roll();
    await say(page, "No devices today? Print the tests: three forms, each with its answer key.", 300);
    await click(page, page.getByRole("link", { name: "Print the tests" }), { hold: 1600 });
    const sheet = page.getByRole("main", { name: "Print the tests" });
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 260); await wait(260); }
    await wait(600);
    await click(page, sheet.getByRole("link", { name: "← Back to the class" }), { hold: 600 });
    await say(page, "Afterwards, type each sheet in on the Study tab: it is marked as if answered online.", 300);
    await click(page, page.getByRole("tab", { name: "Study" }), { hold: 600 });
    const card = page.locator(".paper-card");
    await click(page, card.locator("summary"), { hold: 700 });
    const pick = card.getByRole("combobox", { name: "Student", exact: true });
    await click(page, pick, { hold: 200 });
    await pick.selectOption({ label: `№ 3 · ${s.code}` });
    await page.keyboard.press("Escape");
    await wait(700);
    const plan = await api("GET", `/api/students/${s.code}/plan`, undefined, false);
    const { testItems } = await import("../src/model/testForms.ts");
    const items = testItems(klass.code, ["fractions"], plan.tests.pre.form, 4).map((q) => exercise(q.skill, q.level, q.seed, w));
    await say(page, "Type what the student wrote; leave a blank empty.", 300);
    await type(page, card.getByRole("textbox", { name: "Answer 1", exact: true }), items[0].plain);
    await type(page, card.getByRole("textbox", { name: "Answer 2", exact: true }), "3/7");
    await type(page, card.getByRole("textbox", { name: "Answer 4", exact: true }), items[3].plain);
    await click(page, card.getByRole("button", { name: "Save the answers" }), { hold: 900 });
    await say(page, "Saved and marked as if answered online: right, wrong, or left blank.", 300);
    await point(page, card.locator(".paper-mark").first(), 2600);
  },
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const pick = process.argv.slice(2);
for (const [name, scene] of Object.entries(SCENES)) {
  if (pick.length && !pick.includes(name)) continue;
  const film = new Film(browser);
  const t = Date.now();
  await scene(film);
  const { mp4, seconds } = await film.cut(name);
  console.log(`${name}: ${seconds.toFixed(1)} s of film in ${((Date.now() - t) / 1000).toFixed(0)} s → ${mp4}`);
}
await browser.close();
