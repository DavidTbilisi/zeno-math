// End-to-end tests (e2e/): the built app in a real browser against a real server with a fresh database.
// Build first (npm run build); npm run e2e starts the server itself. PLAYWRIGHT_CHROMIUM_EXECUTABLE runs them with
// a Chromium already on the machine instead of the one `npx playwright install chromium` downloads.
import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = 8798;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // One server and database for every test: run them one at a time.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1280, height: 860 },
    trace: "retain-on-failure",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: "node --disable-warning=ExperimentalWarning server/index.ts",
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { PORT: String(PORT), DATA_DIR: join(tmpdir(), `zeno-e2e-${Date.now()}`), APP_PASSWORD: "", TEACHER_PASSWORD: "e2e-teacher", BACKUP_KEEP: "0" },
  },
});
