// Lessons: a host's board and each guest's own, each followed by the other and written by its owner alone.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = 20000 + Math.floor(Math.random() * 20000);
const BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "zeno-lessons-"));
let server: ChildProcess;

before(async () => {
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(join(dir, "dist", "index.html"), "<!doctype html><title>Zeno</title>");
  server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: join(dir, "data"), STATIC_DIR: join(dir, "dist"), APP_PASSWORD: "", TEACHER_PASSWORD: "t34cher" },
    stdio: "pipe",
  });
  await new Promise<void>((ok, fail) => {
    server.stdout!.on("data", (d) => String(d).includes("listening") && ok());
    server.on("exit", (code) => fail(new Error(`server exited with ${code}`)));
  });
});
after(async () => {
  if (server.exitCode === null) await new Promise((ok) => (server.once("exit", ok), server.kill()));
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const as = (headers: Record<string, string>) => async (method: string, path: string, body?: unknown, more: Record<string, string> = {}) => {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...headers, ...more }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = res.status !== 204 && res.status !== 304 && res.headers.get("content-type")?.includes("json");
  return { status: res.status, etag: res.headers.get("etag"), body: json ? await res.json() : undefined };
};
const teacher = as({ "X-Teacher-Password": "t34cher" });
const visitor = as({});
const student = async (klass: string) => as({ "X-Student-Code": (await visitor("POST", "/api/students", { class: klass })).body.code as string });

test("a lesson: the host starts it, a guest joins with a board of their own, and each follows the other", async () => {
  const klass = (await teacher("POST", "/api/classes", { name: "Lesson" })).body.code as string;
  const [a, b] = [await student(klass), await student(klass)];
  const hostBoard = (await teacher("POST", "/api/boards", { title: "Fractions" })).body.id as string;
  await teacher("PUT", `/api/boards/${hostBoard}`, { scene: { elements: [{ id: "t1" }] } });

  // Starting twice gives the same link; the board says it hosts a lesson.
  assert.equal((await teacher("GET", `/api/boards/${hostBoard}`)).body.lessonToken, null);
  const made = await teacher("POST", `/api/boards/${hostBoard}/lesson`, {});
  assert.equal(made.status, 201);
  const token = made.body.token as string;
  assert.match(token, /^[A-Za-z0-9_-]{22}$/);
  const again = await teacher("POST", `/api/boards/${hostBoard}/lesson`, {});
  assert.deepEqual([again.status, again.body.token], [200, token]);
  assert.equal((await teacher("GET", `/api/boards/${hostBoard}`)).body.lessonToken, token);
  // Only the board's owner starts or ends its lesson.
  assert.equal((await a("POST", `/api/boards/${hostBoard}/lesson`, {})).status, 404);
  assert.equal((await teacher("PUT", `/api/boards/${hostBoard}/lesson`, {})).status, 405);

  // The host's view: no guests yet.
  const host = await teacher("GET", `/api/lessons/${token}`);
  assert.deepEqual(host.body, { title: "Fractions", handoutAt: 0, role: "host", board: hostBoard, guests: [] });

  // Before joining, a learner (like a browser that owns no boards) only watches; anyone with the link sees the host's board.
  assert.equal((await a("GET", `/api/lessons/${token}`)).body.role, "viewer");
  assert.deepEqual((await visitor("GET", `/api/lessons/${token}`)).body, { title: "Fractions", handoutAt: 0, role: "viewer" });
  assert.equal((await visitor("POST", `/api/lessons/${token}`, {})).body.role, "viewer");
  const seen = await visitor("GET", `/api/lessons/${token}/board`);
  assert.deepEqual(seen.body.scene, { elements: [{ id: "t1" }] });
  assert.equal("id" in seen.body, false, "the host board's id is not given away");
  assert.equal((await visitor("GET", `/api/lessons/${token}/board`, undefined, { "If-None-Match": seen.etag! })).status, 304);

  // Joining makes the learner a board of their own, once.
  const joined = await a("POST", `/api/lessons/${token}`, {});
  assert.equal(joined.status, 201);
  assert.deepEqual([joined.body.role, joined.body.made, joined.body.title], ["guest", true, "Fractions"]);
  const mine = joined.body.board as string;
  const back = await a("POST", `/api/lessons/${token}`, {});
  assert.deepEqual([back.status, back.body.board, back.body.made], [200, mine, undefined]);
  assert.deepEqual((await a("GET", `/api/lessons/${token}`)).body, { title: "Fractions", handoutAt: 0, role: "guest", board: mine });
  assert.equal((await a("GET", `/api/boards/${mine}`)).body.title, "Fractions");
  const other = (await b("POST", `/api/lessons/${token}`, {})).body.board as string;
  assert.notEqual(other, mine);

  // The guest writes on their own board; the host follows it, and nobody else does.
  assert.equal((await a("PUT", `/api/boards/${mine}`, { scene: { elements: [{ id: "s1" }, { id: "s2" }] } })).status, 200);
  const list = (await teacher("GET", `/api/lessons/${token}`)).body.guests as { board: string; number: number | null; name: string | null }[];
  assert.deepEqual(list.map((g) => g.board), [mine, other]);
  assert.ok(list.every((g) => "number" in g && "name" in g), "a teacher is told whose each is, when the class has numbers or names");
  const followed = await teacher("GET", `/api/lessons/${token}/guest?board=${mine}`);
  assert.deepEqual(followed.body.scene, { elements: [{ id: "s1" }, { id: "s2" }] });
  assert.equal((await teacher("GET", `/api/lessons/${token}/guest?board=${mine}`, undefined, { "If-None-Match": followed.etag! })).status, 304);
  assert.equal((await b("GET", `/api/lessons/${token}/guest?board=${mine}`)).status, 403);
  assert.equal((await visitor("GET", `/api/lessons/${token}/guest?board=${mine}`)).status, 403);
  assert.equal((await teacher("GET", `/api/lessons/${token}/guest?board=${hostBoard}`)).status, 404, "not a guest's board");
  assert.equal((await teacher("GET", `/api/lessons/${token}/guest`)).status, 404);
  // A board keeps its one writer: the host can't change a guest's, nor a guest the host's or another guest's.
  assert.equal((await teacher("PUT", `/api/boards/${mine}`, { scene: { elements: [] } })).status, 403);
  assert.equal((await a("PUT", `/api/boards/${hostBoard}`, { scene: { elements: [] } })).status, 404);
  assert.equal((await b("PUT", `/api/boards/${mine}`, { scene: { elements: [] } })).status, 404);

  // Handing out is a mark the guests see, later each time; only the host makes it.
  const first = (await teacher("POST", `/api/lessons/${token}/handout`, {})).body.handoutAt as number;
  const second = (await teacher("POST", `/api/lessons/${token}/handout`, {})).body.handoutAt as number;
  assert.ok(first > 0 && second > first);
  assert.equal((await a("GET", `/api/lessons/${token}`)).body.handoutAt, second);
  assert.equal((await a("POST", `/api/lessons/${token}/handout`, {})).status, 403);

  // Routes that are not there.
  assert.equal((await teacher("DELETE", `/api/lessons/${token}`)).status, 405);
  assert.equal((await teacher("GET", `/api/lessons/${token}/handout`)).status, 405);
  assert.equal((await teacher("POST", `/api/lessons/${token}/board`, {})).status, 405);
  assert.equal((await teacher("GET", `/api/lessons/${token}/else`)).status, 404);
  assert.equal((await teacher("GET", "/api/lessons")).status, 404);
  assert.equal((await teacher("GET", "/api/lessons/nothing")).body.error, "no such lesson");
  assert.equal((await as({ "X-Student-Code": "ZZZZ-ZZZZ" })("GET", `/api/lessons/${token}`)).status, 403, "a wrong code is refused, not let in as a viewer");

  // A guest who deletes their board has left, and joins afresh with a new one.
  assert.equal((await b("DELETE", `/api/boards/${other}`)).status, 204);
  assert.deepEqual(((await teacher("GET", `/api/lessons/${token}`)).body.guests as { board: string }[]).map((g) => g.board), [mine]);
  assert.equal((await b("POST", `/api/lessons/${token}`, {})).status, 201);

  // Ending the lesson: the link stops working, and the guests keep their boards.
  assert.equal((await teacher("DELETE", `/api/boards/${hostBoard}/lesson`)).status, 204);
  assert.equal((await visitor("GET", `/api/lessons/${token}`)).status, 404);
  assert.equal((await visitor("GET", `/api/lessons/${token}/board`)).status, 404);
  assert.equal((await teacher("GET", `/api/boards/${hostBoard}`)).body.lessonToken, null);
  assert.deepEqual((await a("GET", `/api/boards/${mine}`)).body.scene, { elements: [{ id: "s1" }, { id: "s2" }] });
  // A new lesson on the same board has a new link, and deleting the board ends it.
  const next = (await teacher("POST", `/api/boards/${hostBoard}/lesson`, {})).body.token as string;
  assert.notEqual(next, token);
  await teacher("DELETE", `/api/boards/${hostBoard}`);
  assert.equal((await visitor("GET", `/api/lessons/${next}`)).status, 404);
});

test("a learner can host: their guests are not named to them", async () => {
  const klass = (await teacher("POST", "/api/classes", { name: "Peers" })).body.code as string;
  const [a, b] = [await student(klass), await student(klass)];
  const board = (await a("POST", "/api/boards", { title: "Mine" })).body.id as string;
  const token = (await a("POST", `/api/boards/${board}/lesson`, {})).body.token as string;
  const guest = (await b("POST", `/api/lessons/${token}`, {})).body.board as string;
  const state = (await a("GET", `/api/lessons/${token}`)).body;
  assert.equal(state.role, "host");
  assert.deepEqual(state.guests.map((g: { board: string; number: unknown; name: unknown }) => [g.board, g.number, g.name]), [[guest, null, null]]);
  // The teacher is not this lesson's host, and brings no board of their own.
  assert.equal((await teacher("POST", `/api/lessons/${token}`, {})).body.role, "viewer");
});
